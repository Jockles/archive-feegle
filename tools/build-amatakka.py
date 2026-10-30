"""Builds the Amatakka section of jockles.com (amatakka/).

Run it from the top of the repository:  python3 tools/build-amatakka.py

The section is made from three files in amatakka/source/:
- vocabulary.csv  - the dictionary, exported from Airtable (one row per word)
- booklet.md      - Amatakka: A Provisional Grammar (the teaching booklet)
- specification.md - the Amatakka Grammar Specification

To refresh them from new exports, pass the folder the exports are in:
    python3 tools/build-amatakka.py --import ~/Downloads
That copies the three files into amatakka/source/ (applying the small
clean-ups listed in REWRITES below) and then rebuilds every page.

What it makes:
- amatakka/dictionary/index.html  every word, A to Z, with a search box
- amatakka/dictionary/english.html  the English index, linking back
- amatakka/grammar/<lesson>.html  one page per booklet section
- amatakka/grammar/specification.html  the technical specification
- amatakka/grammar/index.html and the word and lesson counts on amatakka/index.html

Never edit the made pages by hand: change the source files and run this again.
"""
import csv, html, os, re, shutil, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
SECTION = os.path.join(HERE, "..", "amatakka")
SOURCE = os.path.join(SECTION, "source")

# export file name (as it comes out of the Amatakka project) -> file in source/
EXPORTS = {
    "Amatakka Vocabulary.csv": "vocabulary.csv",
    "Amatakka Provisional Grammar (Teaching Booklet).md": "booklet.md",
    "Amatakka Provisional Grammar Teaching Booklet.md": "booklet.md",
    "Amatakka Grammar Specification.md": "specification.md",
}

# Clean-ups applied when importing. Working notes in the exports sometimes
# mention the assistant used to draft them; the site never names it.
REWRITES = [
    ("a word proposed by Claude without manual verification",
     "a word proposed during the language build without manual verification"),
    ("sorxe, which is Claude's proposal and still provisional",
     "sorxe, which is still provisional"),
    ("CHECK: dorra is not a dictionary word yet; the build was Claude's guess.",
     "CHECK: dorra is not a dictionary word yet, so the build is a guess."),
    ("(Claude's forms, confirmed by Jockles)", "(confirmed by Jockles)"),
    ("The form sorxe (sor 'three' + xe 'part') is CLAUDE'S PROPOSAL, provisional until you confirm or change it.",
     "The form sorxe (sor 'three' + xe 'part') is a proposal, provisional until confirmed."),
    # a stray pair of bold marks in the export
    ("greeti**ng, tamettu from a K**abyle", "greeting, tamettu from a Kabyle"),
]

# Booklet sections that are notes for Jockles rather than for readers
SKIP_SECTIONS = {"Decisions for you"}

NAV = """<nav>
  <ul>
    <li><a href="{r}index.html">Home</a></li>
    <li><a href="{r}fic/index.html">Fic</a></li>
    <li><a href="{r}videos/index.html">Videos</a></li>
    <li><a href="{r}blog/index.html">Blog</a></li>
    <li><a href="{r}links.html">Links</a></li>
    <li><a href="{r}about.html">About</a></li>
  </ul>
</nav>"""

SUBNAV = """<ul class="subnav">
        <li><a href="{a}index.html">Amatakka</a></li>
        <li><a href="{a}dictionary/index.html">Dictionary</a></li>
        <li><a href="{a}dictionary/english.html">English index</a></li>
        <li><a href="{a}grammar/index.html">Grammar</a></li>
      </ul>"""

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} | jockles.com</title>
  <link rel="stylesheet" href="{r}style.css">
  <link rel="stylesheet" href="{a}amatakka.css">
</head>
<body>
<header>
  <h1><a href="{r}index.html">jockles.com</a></h1>
  <p>fic, videos and fannish things</p>
</header>
{nav}
<main class="amatakka">
      <!-- This page is made by tools/build-amatakka.py. Edit amatakka/source/ instead. -->
      {subnav}
{body}
</main>
<footer>
  Made by hand in HTML &amp; CSS. No trackers, no cookies, no ads.
</footer>
{script}</body>
</html>
"""


def page(title, body, depth, script=""):
    r = "../" * (depth + 1)
    a = "../" * depth
    return PAGE.format(title=html.escape(title), r=r, a=a, nav=NAV.format(r=r),
                       subnav=SUBNAV.format(a=a), body=body, script=script)


def write(path, text):
    path = os.path.join(SECTION, path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def slug(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "x"


# ---------------------------------------------------------------- importing

def import_exports(folder):
    found = set()
    for name in os.listdir(folder):
        if name in EXPORTS:
            with open(os.path.join(folder, name), encoding="utf-8-sig") as f:
                text = f.read()
            for old, new in REWRITES:
                text = text.replace(old, new)
            with open(os.path.join(SOURCE, EXPORTS[name]), "w", encoding="utf-8", newline="\n") as f:
                f.write(text)
            found.add(EXPORTS[name])
            print("imported", name)
    missing = set(EXPORTS.values()) - found
    if missing:
        print("not found in", folder, "(kept the old copy):", ", ".join(sorted(missing)))


def check_sources():
    bad = []
    for name in sorted(set(EXPORTS.values())):
        with open(os.path.join(SOURCE, name), encoding="utf-8") as f:
            for n, line in enumerate(f, 1):
                if re.search(r"claude", line, re.I):
                    bad.append(f"  {name} line {n}: {line.strip()[:100]}")
    if bad:
        print("These lines name Claude. Add a clean-up to REWRITES and import again:")
        print("\n".join(bad))
        sys.exit(1)


# ---------------------------------------------------------------- dictionary

# Working notes in the Notes column that are about how a word was chosen or
# changed (decision dates, the word picker, reviews, replaced forms) rather
# than where it comes from. They are left out of the site.
NOTE_PREFIXES = [
    r"SRD (?:decision |revision )?\d+ \w+ 20\d\d"
    r"(?:, (?:chosen in the [\w ]+ word picker|accepted from the Candidates review))?"
    r"(?: \([^)]*\))?\s*[.:;]?\s*",
    r"Swadesh completion\s*[;:,]?\s*",
]
NOTE_REWORD = [
    (r"\s*\([^()]*\b20\d\d\b[^()]*\)", ""),  # dated asides, e.g. "(SRD decision 30 Sep 2026)"
    (r",? confirmed \d+ \w+ 20\d\d", ""),
    (r"the review-tab candidate ", ""),
    (r"the earlier (Tuareg-informed \S+), which it replaces", r"the \1"),
    (r"Tuareg Swadesh source", "Tuareg source"),
    (r"^Legacy BLW (\S+) regularised to \S+ in PGD reconciliation per conflict-review decision", r"From BLW \1"),
]
NOTE_DROP = re.compile(
    r"\b(?:picker|review|PGD|CHECK|replac\w*|earlier|retired|candidate|reconciliation"
    r"|regularised to -uu on|regularised to rutuu|confirm\w*|decision|not recorded yet"
    r"|Keep the row|Gloss revised|Earlier gloss|master)\b|^So ", re.I)
NOTE_KEEP = re.compile(r"provisional", re.I)
# English words that start a note sentence once a dated prefix is taken off
NOTE_CAPS = {"also", "see", "from", "now", "literally", "by", "old", "native", "internally",
             "interrogative", "derived", "pluralised", "back-formed", "wider", "pan-berber", "thirds"}


def clean_note(note):
    pieces = []
    for piece in note.split(" | "):
        out = []
        for sentence in re.split(r"(?<=\.)\s+", piece.strip()):
            before = sentence
            for prefix in NOTE_PREFIXES:
                sentence = re.sub("^" + prefix, "", sentence, flags=re.I)
            for pattern, repl in NOTE_REWORD:
                sentence = re.sub(pattern, repl, sentence)
            clauses = [c.strip() for c in re.split(r";\s*", sentence)
                       if c.strip(" .") and (not NOTE_DROP.search(c) or NOTE_KEEP.search(c))]
            if not clauses:
                continue
            text = "; ".join(clauses)
            if sentence.rstrip().endswith(".") and not text.endswith("."):
                text += "."
            if sentence != before and text.split()[0].lower() in NOTE_CAPS:
                text = text[0].upper() + text[1:]
            out.append(text)
        if out:
            pieces.append(" ".join(out))
    if len(pieces) > 1:
        pieces = [p if p[-1] in ".!?" else p + "." for p in pieces]
    return " ".join(pieces)


def tier(source):
    s = source.lower()
    if "fialleril" in s:
        return "CANON"
    if "srd" in s:
        return "SRD"
    return "ESTABLISHED"


def load_words():
    with open(os.path.join(SOURCE, "vocabulary.csv"), encoding="utf-8") as f:
        rows = list(csv.reader(f))
    words, used = [], set()
    for row in rows[1:]:
        row = (row + [""] * 8)[:8]
        w = dict(zip(["word", "pos", "gender", "meaning", "gesture", "dialect", "source", "notes"],
                     [c.strip() for c in row]))
        if not w["word"]:
            continue
        base = "w-" + slug(w["word"])
        wid, n = base, 2
        while wid in used:
            wid, n = f"{base}-{n}", n + 1
        used.add(wid)
        # a note made only of working notes gets this instead (Jockles's choice)
        w["notes"] = clean_note(w["notes"]) or ("Jockles vibes addition" if w["notes"] else "")
        w["id"] = wid
        w["letter"] = next((c.upper() for c in w["word"] if c.isalpha()), "#")
        words.append(w)
    words.sort(key=lambda w: (w["letter"], w["word"].lstrip("-").lower()))
    return words


def entry(w):
    e = html.escape
    tags = [f'<span class="pos">{e(w["pos"])}</span>'] if w["pos"] else []
    if w["gender"]:
        tags.append(f'<span class="pos">{e(w["gender"])}</span>')
    t = tier(w["source"])
    tags.append(f'<span class="tier tier-{t.lower()}" title="Source tier">{t}</span>')
    out = [f'<div class="entry" id="{w["id"]}" data-pos="{e(w["pos"])}">',
           f'  <h4><a href="#{w["id"]}">{e(w["word"])}</a> {" ".join(tags)}</h4>',
           f'  <p class="meaning">{e(w["meaning"])}</p>']
    if w["gesture"]:
        out.append(f'  <p class="gesture"><b>Gesture:</b> {e(w["gesture"])}</p>')
    if w["dialect"]:
        out.append(f'  <p class="gesture"><b>Gesture variants:</b> {e(w["dialect"])}</p>')
    meta = []
    if w["source"]:
        meta.append(f'<b>Source:</b> {e(w["source"])}')
    if w["notes"]:
        meta.append(f'<b>Notes:</b> {e(w["notes"])}')
    if meta:
        out.append(f'  <p class="entry-notes">{"<br>".join(meta)}</p>')
    out.append("</div>")
    return "\n".join("      " + line for line in out)


SEARCH_SCRIPT = """<script>
// Filters the word list as you type. Without JavaScript the full list still shows.
(function () {
  var form = document.getElementById("dict-search");
  var box = document.getElementById("dict-q");
  var pos = document.getElementById("dict-pos");
  var count = document.getElementById("dict-count");
  var entries = document.querySelectorAll(".entry");
  var sections = document.querySelectorAll(".letter");
  form.hidden = false;
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  function run() {
    var q = box.value.trim().toLowerCase(), p = pos.value, shown = 0;
    entries.forEach(function (el) {
      var ok = (!q || el.textContent.toLowerCase().indexOf(q) !== -1) &&
               (!p || el.getAttribute("data-pos") === p);
      el.hidden = !ok;
      if (ok) shown++;
    });
    sections.forEach(function (s) { s.hidden = !s.querySelector(".entry:not([hidden])"); });
    count.textContent = (q || p) ? shown + " matching" : "";
  }
  box.addEventListener("input", run);
  pos.addEventListener("change", run);
})();
</script>
"""


def build_dictionary(words):
    letters = []
    for w in words:
        if not letters or letters[-1][0] != w["letter"]:
            letters.append((w["letter"], []))
        letters[-1][1].append(w)
    bar = " ".join(f'<a href="#letter-{l}">{l}</a>' for l, _ in letters)
    pos_list = sorted({w["pos"] for w in words if w["pos"]})
    options = "".join(f'<option value="{html.escape(p)}">{html.escape(p)}</option>' for p in pos_list)
    parts = [f"""      <h2>Dictionary</h2>
      <p>{len(words)} words, Amatakka to English. Each word is marked with its source tier
      (see <a href="../grammar/read-this-first.html">Read this first</a>). Looking for an English word?
      Try the <a href="english.html">English index</a>.</p>
      <form id="dict-search" class="box dict-search" hidden>
        <label for="dict-q">Search</label>
        <input type="search" id="dict-q" placeholder="Amatakka or English">
        <label for="dict-pos">Part of speech</label>
        <select id="dict-pos"><option value="">all</option>{options}</select>
        <span id="dict-count"></span>
      </form>
      <p class="alphabet">{bar}</p>"""]
    for l, ws in letters:
        parts.append(f'      <section class="letter" id="letter-{l}">\n      <h3>{l}</h3>')
        parts.extend(entry(w) for w in ws)
        parts.append("      </section>")
    write("dictionary/index.html", page("Amatakka Dictionary", "\n".join(parts), 1, SEARCH_SCRIPT))


def build_english(words):
    # one line per English sense: split the meaning at commas and semicolons,
    # ignoring commas inside brackets and quotes
    index = {}
    for w in words:
        meaning = re.sub(r"\([^)]*\)|\"[^\"]*\"", "", w["meaning"])
        for sense in re.split(r"[;,]", meaning):
            sense = re.sub(r"^\d+\s+", "", sense.strip().strip(".").strip())
            # keep short glosses; skip the tails of longer descriptions
            if (not sense or len(sense.split()) > 4 or not sense[0].isalpha()
                    or re.match(r"(and|or|but|which|also|used|especially|e\.g|i\.e|including|often|usually|as|like|such)\b", sense, re.I)):
                continue
            key = re.sub(r"^(to|a|an|the)\s+", "", sense.lower())
            index.setdefault((key, sense), []).append(w)
    rows = sorted(index.items(), key=lambda kv: kv[0][0])
    letters = {}
    for (key, sense), ws in rows:
        letters.setdefault(key[0].upper(), []).append((sense, ws))
    bar = " ".join(f'<a href="#letter-{l}">{l}</a>' for l in letters)
    parts = [f"""      <h2>English index</h2>
      <p>English words and phrases from the dictionary meanings, each linking to its Amatakka word.
      Verbs are listed without "to", so "to sit" is under S.</p>
      <p class="alphabet">{bar}</p>"""]
    for l, items in letters.items():
        parts.append(f'      <h3 id="letter-{l}">{l}</h3>\n      <ul class="english-index">')
        for sense, ws in items:
            links = ", ".join(f'<a href="index.html#{w["id"]}">{html.escape(w["word"])}</a>' for w in ws)
            parts.append(f"        <li>{html.escape(sense)}: {links}</li>")
        parts.append("      </ul>")
    write("dictionary/english.html", page("Amatakka English index", "\n".join(parts), 1))


# ---------------------------------------------------------------- markdown

ESC = ""  # stands in for backslash-escaped characters while formatting


def inline(text, wordlinks):
    text = re.sub(r"\\(.)", lambda m: ESC + format(ord(m.group(1)), "x") + ESC, text)
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)

    def em(m):
        inner = m.group(1)
        plain = re.sub(ESC + r"([0-9a-f]+)" + ESC, lambda x: chr(int(x.group(1), 16)), inner)
        target = wordlinks.get(plain.strip().lower())
        if target:
            return f'<em><a class="word" href="../dictionary/index.html#{target}">{inner}</a></em>'
        return f"<em>{inner}</em>"
    text = re.sub(r"(?<![\w*])\*(?![\s*])(.+?)(?<![\s*])\*(?![\w*])", em, text)
    return re.sub(ESC + r"([0-9a-f]+)" + ESC, lambda m: html.escape(chr(int(m.group(1), 16))), text)


def md_to_html(md, wordlinks, shift=0):
    """A small Markdown reader, enough for the booklet and the spec:
    headings, paragraphs, bold, italics, pipe tables, lists and quotes."""
    out, para, listing = [], [], None
    lines = md.split("\n")

    def flush():
        nonlocal para
        if para:
            out.append("<p>" + " ".join(inline(p, wordlinks) for p in para) + "</p>")
            para = []

    def close_list():
        nonlocal listing
        if listing:
            out.append(f"</{listing}>")
            listing = None

    i = 0
    while i < len(lines):
        raw = lines[i]
        line = re.sub(r"^>\s?", "", raw).rstrip()
        hard = raw.endswith("  ")
        i += 1
        if not line.strip():
            flush(); close_list(); continue
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            flush(); close_list()
            level = min(len(m.group(1)) + shift, 6)
            title = m.group(2).replace("**", "")
            hid = slug(title.replace("\\", ""))
            out.append(f'<h{level} id="{hid}">{inline(title, {})}</h{level}>')
            continue
        if line.lstrip().startswith("|"):
            flush(); close_list()
            rows = [line]
            while i < len(lines) and lines[i].lstrip().startswith("|"):
                rows.append(lines[i].rstrip()); i += 1
            cells = [[c.strip() for c in re.split(r"(?<!\\)\|", r.strip())[1:-1]] for r in rows]
            cells = [c for c in cells if not all(re.fullmatch(r":?-+:?", x) for x in c if x)]
            t = ['<table class="gloss">', "<thead><tr>" + "".join(f"<th>{inline(c, {})}</th>" for c in cells[0]) + "</tr></thead>", "<tbody>"]
            for r in cells[1:]:
                t.append("<tr>" + "".join(f"<td>{inline(c, wordlinks)}</td>" for c in r) + "</tr>")
            out.append("\n".join(t + ["</tbody></table>"]))
            continue
        m = re.match(r"^\s*(?:([*-])|(\d+)\.)\s+(.*)", line)
        if m:
            flush()
            kind = "ul" if m.group(1) else "ol"
            if listing != kind:
                close_list(); out.append(f"<{kind}>"); listing = kind
            out.append(f"<li>{inline(m.group(3).strip(), wordlinks)}</li>")
            continue
        close_list()
        para.append(line.strip())
        if hard:
            flush()
    flush(); close_list()
    return "\n".join("      " + l for l in "\n".join(out).split("\n"))


def wordlinks_for(words):
    links = {}
    for w in words:
        for form in re.split(r",\s*", w["word"]):
            links.setdefault(form.strip().lower(), w["id"])
    return links


# ---------------------------------------------------------------- grammar

def booklet_sections():
    with open(os.path.join(SOURCE, "booklet.md"), encoding="utf-8") as f:
        text = f.read()
    head, *rest = re.split(r"^## ", text, flags=re.M)
    sections = []
    for chunk in rest:
        title, _, body = chunk.partition("\n")
        title = title.replace("**", "").replace("\\", "").strip()
        if title in SKIP_SECTIONS:
            continue
        m = re.match(r"Lesson (\d+)\. (.*)", title)
        s = f"lesson-{m.group(1)}" if m else slug(title)
        sections.append((s, title, body))
    intro = "\n".join(l for l in head.split("\n") if not l.startswith("# "))
    return intro, sections


def build_grammar(words):
    links = wordlinks_for(words)
    intro, sections = booklet_sections()
    for i, (s, title, body) in enumerate(sections):
        prev = f'<a href="{sections[i - 1][0]}.html">&larr; {html.escape(sections[i - 1][1])}</a>' if i else ""
        nxt = f'<a href="{sections[i + 1][0]}.html">{html.escape(sections[i + 1][1])} &rarr;</a>' if i + 1 < len(sections) else ""
        pager = f'      <p class="pager"><span>{prev}</span> <a href="index.html">Contents</a> <span>{nxt}</span></p>'
        content = "\n".join([
            '      <p class="work-title"><a href="index.html">Amatakka: A Provisional Grammar</a></p>',
            pager,
            f"      <h2>{html.escape(title)}</h2>",
            '      <div class="grammar">',
            md_to_html(body, links, shift=1),
            "      </div>",
            pager])
        write(f"grammar/{s}.html", page(f"{title} | Amatakka grammar", content, 1))

    lessons = [x for x in sections if x[0].startswith("lesson-")]
    others = [x for x in sections if not x[0].startswith("lesson-")]
    li = lambda x: f'        <li><a href="{x[0]}.html">{html.escape(x[1])}</a></li>'
    first = [x for x in others if x[0] == "read-this-first"]
    after = [x for x in others if x[0] != "read-this-first"]
    body = "\n".join([
        "      <h2>Amatakka: A Provisional Grammar</h2>",
        '      <div class="grammar">',
        md_to_html(intro, links),
        "      </div>",
        "      <h3>Start here</h3>", '      <ul class="chapter-index">', *map(li, first), "      </ul>",
        "      <h3>Lessons</h3>", '      <ol class="chapter-index">',
        *[f'        <li><a href="{x[0]}.html">{html.escape(re.sub(r"^Lesson \d+\. ", "", x[1]))}</a></li>' for x in lessons],
        "      </ol>",
        "      <h3>Practice and reference</h3>", '      <ul class="chapter-index">', *map(li, after),
        '        <li><a href="specification.html">Grammar Specification</a> (the technical rules the booklet is built on)</li>',
        "      </ul>"])
    write("grammar/index.html", page("Amatakka grammar", body, 1))

    with open(os.path.join(SOURCE, "specification.md"), encoding="utf-8") as f:
        spec = f.read()
    spec = "\n".join(l for l in spec.split("\n") if not l.startswith("# "))
    body = "\n".join([
        '      <p class="work-title"><a href="index.html">Amatakka grammar</a></p>',
        "      <h2>Amatakka Grammar Specification</h2>",
        '      <div class="grammar">', md_to_html(spec, links), "      </div>"])
    write("grammar/specification.html", page("Amatakka Grammar Specification", body, 1))
    return len(lessons)


def update_counts(nwords, nlessons):
    path = os.path.join(SECTION, "index.html")
    with open(path, encoding="utf-8") as f:
        text = f.read()
    text = re.sub(r'(<span class="count-words">)[^<]*', rf"\g<1>{nwords:,}", text)
    text = re.sub(r'(<span class="count-lessons">)[^<]*', rf"\g<1>{nlessons}", text)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--import":
        import_exports(os.path.expanduser(sys.argv[2]))
    elif len(sys.argv) > 1:
        sys.exit(__doc__)
    check_sources()
    words = load_words()
    build_dictionary(words)
    build_english(words)
    nlessons = build_grammar(words)
    update_counts(len(words), nlessons)
    print(f"built {len(words)} words and {nlessons} lessons")
