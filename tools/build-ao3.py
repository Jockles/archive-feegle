"""Builds the fic pages on jockles.com from AO3 downloads.

Run it from the top of the repository:  python3 tools/build-ao3.py

How to add a work:
1. On AO3, open the work and choose Download > HTML.
2. Put the downloaded file in _ao3/ (any file name is fine).
3. Run this script, then commit the changes.

What it makes:
- fic/works/<title>/index.html for every work. A one-shot is one page. A
  multi-chapter work gets a front page (details, summary, notes and a chapter
  list) plus chapter-1.html, chapter-2.html and so on, like the Megaskin.
- fic/fandoms/<fandom>.html: one page per fandom, listing that fandom's works
  as blurbs, most recently updated first. Crossovers appear under every
  fandom they're tagged with.
- The fandom list on fic/index.html, between the "fandoms:start" and
  "fandoms:end" comments. Everything else on that page is left alone.

Word counts come straight from AO3, so they stay exact (no "ish").

Optional settings per work go in _ao3/works.json, keyed by the AO3 work id:
  {
    "12345678": {
      "skin": "fic/megaskin/megaskin.css",   (work skin CSS to apply, with a
                                              Hide Creator's Style button)
      "hide": true                            (leave this work off the site)
    },
    "fandoms": {                              (optional: show several AO3 fandom
      "Heated Rivalry (TV)": "Some Name"       tags under one name on the site)
    }
  }
AO3 downloads don't include the work skin, so "skin" is how a skinned work
gets its look back. The _ao3 folder itself is never published.
"""
import html, json, os, re, shutil, sys
from bs4 import BeautifulSoup, NavigableString, Tag

TOP = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SRC = os.path.join(TOP, "_ao3")
FIC = os.path.join(TOP, "fic")
WORKS = os.path.join(FIC, "works")
FANDOMS = os.path.join(FIC, "fandoms")
AO3_USER = "https://archiveofourown.org/users/Jockles/works"

e = html.escape

# AO3 writes "Fandoms:", "Characters:" etc. when there's more than one
PLURALS = {"Fandoms": "Fandom", "Relationships": "Relationship", "Characters": "Character",
           "Categories": "Category", "Archive Warnings": "Archive Warning"}


# ---------------------------------------------------------------- reading

def text(node):
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip() if node else ""


def tag_list(dd):
    """A dd of AO3 tags -> list of tag names."""
    links = dd.find_all("a")
    if links:
        return [text(a) for a in links if text(a)]
    return [t.strip() for t in text(dd).split(",") if t.strip()]


def labelled_blockquote(container, label):
    """AO3 downloads write <p>Summary</p><blockquote>...</blockquote>."""
    if not container:
        return None
    for p in container.find_all("p"):
        if text(p).rstrip(":").lower() == label.lower():
            bq = p.find_next_sibling()
            if bq is not None and bq.name == "blockquote":
                return bq
    return None


def inner(node):
    """The HTML inside a node, with AO3's own class/attribute noise kept."""
    if node is None:
        return ""
    for bad in node.find_all(["script", "style", "iframe"]):
        if bad.name == "iframe" and "archive.org" in (bad.get("src") or ""):
            continue  # Internet Archive embeds are fine
        bad.decompose()
    return "".join(str(c) for c in node.contents).strip()


def parse(path):
    with open(path, encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    work = {"file": os.path.basename(path)}
    pre = soup.find(id="preface")
    if pre is None:
        raise ValueError("no #preface - is this an AO3 HTML download?")

    # Work id and AO3 link
    link = pre.find("a", href=re.compile(r"/works/\d+"))
    if link is None:
        raise ValueError("can't find the AO3 work link")
    work["id"] = re.search(r"/works/(\d+)", link["href"]).group(1)
    work["ao3"] = "https://archiveofourown.org/works/" + work["id"]

    # Tags and stats
    meta = {}
    dl = pre.find("dl", class_="tags")
    if dl:
        for dt in dl.find_all("dt"):
            dd = dt.find_next_sibling("dd")
            if dd is not None:
                label = text(dt).rstrip(":")
                meta[PLURALS.get(label, label)] = dd
    work["rating"] = ", ".join(tag_list(meta["Rating"])) if "Rating" in meta else "Not Rated"
    for key, name in [("Archive Warning", "warnings"), ("Category", "categories"),
                      ("Fandom", "fandoms"), ("Relationship", "relationships"),
                      ("Character", "characters"), ("Additional Tags", "freeforms")]:
        work[name] = tag_list(meta[key]) if key in meta else []
    work["language"] = text(meta.get("Language"))
    work["series"] = text(meta.get("Series"))
    stats = text(meta.get("Stats"))
    for key in ["Published", "Updated", "Completed", "Words", "Chapters"]:
        m = re.search(key + r":\s*([\d,/?-]+)", stats)
        work[key.lower()] = m.group(1) if m else ""
    if not work["fandoms"]:
        work["fandoms"] = ["Uncategorized Fandom"]

    # Title, byline, summary, notes
    work["title"] = text(pre.find("h1")) or "Untitled"
    work["byline"] = re.sub(r"^by\s+", "", text(pre.find(class_="byline"))) or "Jockles"
    pmeta = pre.find("div", class_="meta") or pre
    work["summary"] = inner(labelled_blockquote(pmeta, "Summary"))
    work["notes"] = inner(labelled_blockquote(pmeta, "Notes"))
    after = soup.find(id="afterword")
    work["end_notes"] = inner(labelled_blockquote(after.find("div", class_="meta") if after else None, "End Notes"))

    # Chapters
    chapters = []
    body = soup.find(id="chapters")
    if body is None:
        raise ValueError("no #chapters")
    current = None
    for child in body.children:
        if not isinstance(child, Tag):
            continue
        classes = child.get("class") or []
        if "meta" in classes:
            heading = child.find(["h2", "h3"], class_="heading") or child.find(["h2", "h3"])
            if heading is not None:
                current = {"title": text(heading), "summary": inner(labelled_blockquote(child, "Chapter Summary")),
                           "notes": inner(labelled_blockquote(child, "Chapter Notes")), "body": "", "end_notes": ""}
                chapters.append(current)
            elif current is not None:
                current["end_notes"] = inner(labelled_blockquote(child, "Chapter End Notes"))
        elif "userstuff" in classes:
            if current is None:
                current = {"title": "", "summary": "", "notes": "", "body": "", "end_notes": ""}
                chapters.append(current)
            current["body"] += inner(child)
    if not chapters:  # a one-shot with the text straight inside #chapters
        chapters = [{"title": "", "summary": "", "notes": "", "body": inner(body), "end_notes": ""}]
    work["chapter_list"] = chapters
    work["sort"] = work["updated"] or work["completed"] or work["published"]
    return work


# ---------------------------------------------------------------- writing

def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("&", " and ")).strip("-")
    return s or "untitled"


def page(title, up, main, extra_head="", extra_end=""):
    """A whole site page. `up` is the path back to the top, e.g. '../../'."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-Clacks-Overhead" content="GNU Terry Pratchett">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{e(title)} | jockles.com</title>
  <link rel="stylesheet" href="{up}style.css">
  <script src="{up}theme.js"></script>{extra_head}
</head>
<body>
<header>
  <h1><a href="{up}index.html">jockles.com</a></h1>
  <p>All the Fannish things I do.</p>
</header>
<nav>
  <ul>
    <li><a href="{up}index.html">Home</a></li>
    <li><a href="{up}fic/index.html">Fic</a></li>
    <li><a href="{up}videos/index.html">Videos</a></li>
    <li><a href="{up}blog/index.html">Blog</a></li>
    <li><a href="{up}links.html">Links</a></li>
    <li><a href="{up}about.html">About</a></li>
  </ul>
</nav>
<main>
      <!-- This page is made by tools/build-ao3.py from the AO3 download in _ao3/. Don't edit it by hand. -->
{main}
</main>
<footer>
  Made by hand in HTML &amp; CSS. No trackers, no cookies, no ads. &middot; <a href="https://buymeacoffee.com/jockles">Support Me</a>
</footer>{extra_end}
</body>
</html>
"""


STYLE_TOGGLE_JS = """
<script>
  // Works like AO3's "Hide Creator's Style" button: switches the work skin off and on.
  (function () {
    var skin = document.getElementById("creator-style");
    var button = document.getElementById("style-toggle");
    function show(off) {
      skin.disabled = off;
      button.textContent = off ? "Show Creator's Style" : "Hide Creator's Style";
    }
    try { show(localStorage.getItem("hide-creator-style") === "yes"); } catch (e) { show(false); }
    button.addEventListener("click", function () {
      var off = !skin.disabled;
      show(off);
      try { localStorage.setItem("hide-creator-style", off ? "yes" : "no"); } catch (e) {}
    });
  })();
</script>"""


def ul(items, cls="tags"):
    return f'<ul class="{cls}">' + "".join(f"<li>{e(i)}</li>" for i in items) + "</ul>"


def fandom_links(work, up):
    return ", ".join(f'<a href="{up}fic/fandoms/{slugify(f)}.html">{e(f)}</a>' for f in work["fandoms"])


def stats_line(work):
    bits = []
    if work["published"]:
        bits.append("Published: " + work["published"])
    if work["updated"]:
        bits.append("Updated: " + work["updated"])
    if work["completed"]:
        bits.append("Completed: " + work["completed"])
    if work["words"]:
        bits.append("Words: " + work["words"])
    if work["chapters"]:
        bits.append("Chapters: " + work["chapters"])
    return " &middot; ".join(bits)


def work_meta(work, up):
    rows = [("Rating", e(work["rating"])),
            ("Archive Warning", e(", ".join(work["warnings"]))),
            ("Category", e(", ".join(work["categories"]))),
            ("Fandom", fandom_links(work, up)),
            ("Relationship", e(", ".join(work["relationships"]))),
            ("Character", e(", ".join(work["characters"]))),
            ("Additional Tags", e(", ".join(work["freeforms"]))),
            ("Language", e(work["language"])),
            ("Series", e(work["series"])),
            ("Stats", stats_line(work)),
            ("On AO3", f'<a href="{work["ao3"]}">read, comment and leave kudos on AO3</a>')]
    out = ['      <dl class="work-meta">']
    for k, v in rows:
        if v:
            out.append(f"        <dt>{k}:</dt><dd>{v}</dd>")
    out.append("      </dl>")
    return "\n".join(out)


def bq(label, content, tag="h3"):
    if not content:
        return ""
    return f"\n        <{tag}>{label}:</{tag}>\n        <blockquote>{content}</blockquote>"


def skinned(work, body):
    return f'<div id="workskin">\n{body}\n        </div>' if work.get("skin") else body


def comment_line(work):
    return (f'\n        <p class="chapter-nav">Enjoyed it? Please <a href="{work["ao3"]}">leave a comment or kudos on AO3</a>!</p>')


def build_work(work):
    out_dir = os.path.join(WORKS, work["slug"])
    os.makedirs(out_dir, exist_ok=True)
    up = "../../../"
    head, end, toggle = "", "", ""
    if work.get("skin"):
        css = os.path.relpath(os.path.join(TOP, work["skin"]), out_dir).replace(os.sep, "/")
        head = f'\n  <link rel="stylesheet" href="{css}" id="creator-style">'
        end = STYLE_TOGGLE_JS
        toggle = '\n      <p class="style-toggle"><button type="button" id="style-toggle">Hide Creator\'s Style</button></p>'
    chs = work["chapter_list"]
    top = f"""      <div class="fic">
        <h2 class="title">{e(work["title"])}</h2>
        <p class="byline">by {e(work["byline"])}</p>{bq("Summary", work["summary"])}{bq("Notes", work["notes"])}"""

    if len(chs) == 1:
        ch = chs[0]
        main = (work_meta(work, up) + toggle + "\n\n" + top
                + bq("Chapter Notes", ch["notes"]) + "\n        <hr>\n        "
                + skinned(work, ch["body"]) + bq("Chapter End Notes", ch["end_notes"])
                + bq("End Notes", work["end_notes"]) + comment_line(work) + "\n      </div>\n\n"
                + f'      <p><a href="{up}fic/fandoms/{slugify(work["fandoms"][0])}.html">&larr; Back to {e(work["fandoms"][0])}</a></p>')
        write(os.path.join(out_dir, "index.html"), page(work["title"], up, main, head, end))
        return

    # Multi-chapter: front page + one page per chapter
    items = "\n".join(f'          <li><a href="chapter-{i}.html">{e(chapter_name(ch, i))}</a></li>'
                      for i, ch in enumerate(chs, 1))
    main = (work_meta(work, up) + "\n\n" + top
            + f'\n\n        <h3>Chapters:</h3>\n        <ol class="chapter-index">\n{items}\n        </ol>\n\n'
            + '        <p class="chapter-nav"><a href="chapter-1.html">Start reading &rarr;</a></p>\n      </div>\n\n'
            + f'      <p><a href="{up}fic/fandoms/{slugify(work["fandoms"][0])}.html">&larr; Back to {e(work["fandoms"][0])}</a></p>')
    write(os.path.join(out_dir, "index.html"), page(work["title"], up, main, head, end))

    for i, ch in enumerate(chs, 1):
        nav = []
        if i > 1:
            nav.append(f'<a href="chapter-{i - 1}.html">&larr; Previous Chapter</a>')
        nav.append('<a href="index.html">Chapter Index</a>')
        if i < len(chs):
            nav.append(f'<a href="chapter-{i + 1}.html">Next Chapter &rarr;</a>')
        nav = '      <p class="chapter-nav">' + " &middot; ".join(nav) + "</p>"
        last = i == len(chs)
        main = (f'      <p class="work-title"><a href="index.html">{e(work["title"])}</a> by {e(work["byline"])}</p>'
                + toggle + "\n" + nav + "\n\n      <div class=\"fic\">\n"
                + f'        <h3 class="chapter-title">{e(chapter_name(ch, i))}</h3>'
                + bq("Chapter Summary", ch["summary"], "h4") + bq("Chapter Notes", ch["notes"], "h4")
                + "\n        <hr>\n        " + skinned(work, ch["body"])
                + bq("Chapter End Notes", ch["end_notes"], "h4")
                + (bq("End Notes", work["end_notes"], "h4") + comment_line(work) if last else "")
                + "\n      </div>\n\n" + nav)
        write(os.path.join(out_dir, f"chapter-{i}.html"),
              page(f'{work["title"]} - {chapter_name(ch, i)}', up, main, head, end))


def chapter_name(ch, i):
    return ch["title"] or f"Chapter {i}"


def blurb(work, up):
    tags = ([("warning", w) for w in work["warnings"]] + [("", t) for t in work["relationships"]]
            + [("", t) for t in work["characters"]] + [("", t) for t in work["freeforms"]])
    tag_html = "".join(f'<li class="{c}">{e(t)}</li>' if c else f"<li>{e(t)}</li>" for c, t in tags)
    summary = f'\n        <blockquote class="summary">{work["summary"]}</blockquote>' if work["summary"] else ""
    series = f'\n        <p class="stats">Series: {e(work["series"])}</p>' if work["series"] else ""
    return f"""      <div class="blurb">
        <h3><a href="{up}fic/works/{work["slug"]}/index.html">{e(work["title"])}</a> by {e(work["byline"])}</h3>
        <p class="fandom">{fandom_links(work, up)} &middot; {e(work["rating"])}</p>
        <ul class="tags">{tag_html}</ul>{summary}{series}
        <p class="stats">{stats_line(work)}</p>
      </div>"""


def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    settings = {}
    sp = os.path.join(SRC, "works.json")
    if os.path.exists(sp):
        with open(sp, encoding="utf-8") as f:
            settings = json.load(f)
    fandom_names = settings.pop("fandoms", {})

    works, problems = [], []
    for name in sorted(os.listdir(SRC)) if os.path.isdir(SRC) else []:
        if not name.lower().endswith((".html", ".htm")):
            continue
        try:
            w = parse(os.path.join(SRC, name))
        except Exception as ex:  # keep going, report at the end
            problems.append(f"{name}: {ex}")
            continue
        w.update(settings.get(w["id"], {}))
        # Fandom names as they appear on the site (see "fandoms" in works.json)
        names = []
        for f in w["fandoms"]:
            f = fandom_names.get(f, f)
            if f not in names:
                names.append(f)
        w["fandoms"] = names
        if w.get("hide"):
            continue
        if "imgur.com" in json.dumps(w["chapter_list"]):
            problems.append(f"{name}: has Imgur pictures (blocked in the UK) - move them to squidge.org")
        works.append(w)

    # Unique folder names from titles
    seen = {}
    for w in works:
        s = slugify(w["title"])
        if s in seen or s in ("index",):
            s = f"{s}-{w['id']}"
        seen[s] = w
        w["slug"] = s

    # Fresh output each time, so removed works disappear
    for d in (WORKS, FANDOMS):
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d)
    for w in works:
        build_work(w)

    by_fandom = {}
    for w in works:
        for f in w["fandoms"]:
            by_fandom.setdefault(f, []).append(w)
    for f, ws in by_fandom.items():
        ws.sort(key=lambda w: w["sort"], reverse=True)
        n = len(ws)
        main = (f"      <h2>{e(f)}</h2>\n"
                f'      <p>{n} work{"s" if n != 1 else ""} in this fandom, most recently updated first. '
                f'<a href="{AO3_USER}">AO3</a> is still the main home for comments and kudos.</p>\n\n'
                + "\n".join(blurb(w, "../../") for w in ws)
                + '\n\n      <p><a href="../index.html">&larr; All fandoms</a></p>')
        write(os.path.join(FANDOMS, slugify(f) + ".html"), page(f, "../../", main))

    # Fandom list on fic/index.html
    idx = os.path.join(FIC, "index.html")
    with open(idx, encoding="utf-8") as fh:
        index = fh.read()
    items = "\n".join(
        f'        <li><a href="fandoms/{slugify(f)}.html">{e(f)}</a> ({len(ws)})</li>'
        for f, ws in sorted(by_fandom.items(), key=lambda kv: kv[0].lower()))
    block = ('<!-- fandoms:start (made by tools/build-ao3.py) -->\n'
             + (f'      <ul class="fandom-list">\n{items}\n      </ul>\n' if items else
                "      <p>Coming soon!</p>\n")
             + "      <!-- fandoms:end -->")
    new, count = re.subn(r"<!-- fandoms:start.*?<!-- fandoms:end -->", lambda m: block, index, flags=re.S)
    if count != 1:
        sys.exit("fic/index.html needs one <!-- fandoms:start --> ... <!-- fandoms:end --> block")
    write(idx, new)

    print(f"Built {len(works)} works in {len(by_fandom)} fandoms.")
    for p in problems:
        print("WARNING:", p)


if __name__ == "__main__":
    main()
