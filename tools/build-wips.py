"""Builds the work-in-progress pages for jockles.com.

The back-end at jockles.com/admin/ saves each WIP as a file in _wips/.
This script turns each one into a page at wip/<file name>/index.html, in the
same style as the fic pages. The publish and preview workflows run it, so the
pages are made fresh every time and are not kept in the repository.

The pages are not linked from anywhere on the site, and they tell search
engines not to list them.

To try it on your own computer:
    pip install markdown
    python3 tools/build-wips.py
"""
import html, json, os, re, shutil, sys

import markdown

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SOURCE = os.path.join(ROOT, "_wips")
OUTPUT = os.path.join(ROOT, "wip")

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>{title} | jockles.com</title>
  <link rel="stylesheet" href="../../style.css">
  <script src="../../theme.js"></script>
</head>
<body>
<header>
  <h1><a href="../../index.html">jockles.com</a></h1>
  <p>All the Fannish things I do.</p>
</header>
<nav>
  <ul>
    <li><a href="../../index.html">Home</a></li>
    <li><a href="../../fic/index.html">Fic</a></li>
    <li><a href="../../videos/index.html">Videos</a></li>
    <li><a href="../../blog/index.html">Blog</a></li>
    <li><a href="../../links.html">Links</a></li>
    <li><a href="../../about.html">About</a></li>
  </ul>
</nav>
<main>
      <p class="wip-note">Work in progress &middot; this page is not listed on the site.</p>
      <dl class="work-meta">
{meta}
      </dl>

      <div class="fic">
        <h2 class="title">{title}</h2>
        <p class="byline">by Jockles</p>
{front}
{chapters}
{back}
      </div>
</main>
<footer>
  Made by hand in HTML &amp; CSS. No trackers, no cookies, no ads.
</footer>
</body>
</html>
"""


def md(text):
    """Markdown from the editor to HTML. Image links point at ../media/."""
    out = markdown.markdown(text or "", extensions=["extra", "sane_lists"])
    return out.replace('src="/wip/media/', 'src="../media/')


def words(text):
    plain = re.sub(r"<[^>]+>", " ", md(text))
    return len(re.findall(r"[\w'’-]+", html.unescape(plain)))


def as_list(value):
    if not value:
        return []
    if isinstance(value, str):
        value = value.split(",")
    return [str(v).strip() for v in value if str(v).strip()]


def section(heading, text, cls=""):
    if not (text or "").strip():
        return ""
    attr = f' class="{cls}"' if cls else ""
    return f"        <div{attr}>\n        <h3>{heading}</h3>\n        <blockquote>{md(text)}</blockquote>\n        </div>"


def build(path):
    with open(path, encoding="utf-8") as f:
        wip = json.load(f)
    chapters = wip.get("chapters") or []
    total = wip.get("total_chapters")
    word_count = sum(words(c.get("body")) for c in chapters)

    rows = [
        ("Rating", [wip.get("rating") or "Not Rated"]),
        ("Archive Warnings", as_list(wip.get("warnings"))),
        ("Categories", as_list(wip.get("categories"))),
        ("Fandoms", as_list(wip.get("fandoms"))),
        ("Relationships", as_list(wip.get("relationships"))),
        ("Characters", as_list(wip.get("characters"))),
        ("Additional Tags", as_list(wip.get("tags"))),
    ]
    meta = [
        f"        <dt>{label}:</dt><dd>{', '.join(html.escape(v) for v in values)}</dd>"
        for label, values in rows if values
    ]
    # Our own count, not AO3's, so it gets "ish".
    stats = (f"Words: {word_count:,}ish &middot; "
             f"Chapters: {len(chapters)}/{total if total else '?'}")
    if wip.get("updated"):
        stats += f" &middot; Updated: {html.escape(str(wip['updated'])[:10])}"
    meta.append(f"        <dt>Stats:</dt><dd>{stats}</dd>")

    parts = []
    for n, ch in enumerate(chapters, 1):
        heading = f"Chapter {n}"
        if (ch.get("title") or "").strip():
            heading += f": {html.escape(ch['title'].strip())}"
        parts.append(f'        <hr>\n        <h3 class="chapter-title" id="chapter-{n}">{heading}</h3>')
        parts.append(section("Notes:", ch.get("notes")))
        parts.append(f"        {md(ch.get('body'))}")
        parts.append(section("Chapter End Notes:", ch.get("end_notes")))

    title = html.escape(wip.get("title") or "Untitled")
    return PAGE.format(
        title=title,
        meta="\n".join(meta),
        front="\n".join(p for p in (section("Summary:", wip.get("summary")),
                                    section("Notes:", wip.get("notes"))) if p),
        chapters="\n".join(p for p in parts if p),
        back=section("End Notes:", wip.get("end_notes")),
    )


def main():
    if os.path.isdir(OUTPUT):
        shutil.rmtree(OUTPUT)
    os.makedirs(OUTPUT)
    media = os.path.join(SOURCE, "media")
    if os.path.isdir(media):
        shutil.copytree(media, os.path.join(OUTPUT, "media"),
                        ignore=shutil.ignore_patterns(".gitkeep"))
    made = 0
    for name in sorted(os.listdir(SOURCE)) if os.path.isdir(SOURCE) else []:
        if not name.endswith(".json"):
            continue
        slug = name[:-5]
        try:
            with open(os.path.join(SOURCE, name), encoding="utf-8") as f:
                if json.load(f).get("show") is False:
                    print(f"skipped {slug} (not shown on the site)")
                    continue
            page = build(os.path.join(SOURCE, name))
        except Exception as e:  # one broken file shouldn't stop the site publishing
            print(f"could not build {name}: {e}", file=sys.stderr)
            continue
        os.makedirs(os.path.join(OUTPUT, slug))
        with open(os.path.join(OUTPUT, slug, "index.html"), "w", encoding="utf-8") as f:
            f.write(page)
        made += 1
        print(f"built wip/{slug}/")
    print(f"{made} WIP page(s) built")


if __name__ == "__main__":
    main()
