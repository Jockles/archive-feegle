"""Rebuilds the Megaskin chapter pages on jockles.com.

Run it from the top of the repository:  python3 tools/build-megaskin.py

What it does:
- Wraps each chapter's text (fic/megaskin/text/<slug>.html) in the site page,
  with the chapter number, title and Previous / Next links, and writes
  fic/megaskin/<slug>.html.
- Splits fic/megaskin/megaskin.css into one file per module in
  fic/megaskin/css/, using the ">>>>>>>>>> ... (start)" and
  "<<<<<<<<<< ... (end)" lines in the skin.
- Rewrites the chapter list on fic/megaskin/index.html, and the word and
  chapter counts there and on fic/index.html.

To add a chapter: write its text in fic/megaskin/text/, add it to CHAPTERS
below, and run this again.
"""
import hashlib, html, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fic", "megaskin")

# (file name, chapter title), in reading order
CHAPTERS = [
    ("getting-started", "Getting Started, Sources and Credits"),
    ("core", "The Core, Themes, and Extras"),
    ("core-css", "The Core CSS"),
    ("imessage", "iMessage"),
    ("imessage-css", "iMessage CSS"),
    ("whatsapp", "WhatsApp"),
    ("whatsapp-css", "WhatsApp CSS"),
    ("twitter-x", "Twitter/X"),
    ("twitter-x-css", "Twitter/X CSS"),
    ("instagram", "Instagram"),
    ("instagram-css", "Instagram CSS"),
    ("tumblr", "Tumblr"),
    ("tumblr-css", "Tumblr CSS"),
    ("email", "Email"),
    ("email-css", "Email CSS"),
    ("discord", "Discord"),
    ("discord-css", "Discord CSS"),
    ("full-megaskin", "The Full Megaskin"),
]

# module name in the skin's start/end lines -> file name in css/
CSS_FILES = {
    "CORE": "core.css",
    "MODULE: iMessage": "imessage.css",
    "MODULE: WhatsApp": "whatsapp.css",
    "MODULE: Twitter/X (posts, replies, DMs)": "twitter-x.css",
    "MODULE: Instagram (posts, comments, DMs)": "instagram.css",
    "MODULE: Tumblr": "tumblr.css",
    "MODULE: Email (Gmail and generic email window)": "email.css",
    "MODULE: Discord": "discord.css",
}

NAV = """<nav>
  <ul>
    <li><a href="../../index.html">Home</a></li>
    <li><a href="../index.html">Fic</a></li>
    <li><a href="../../videos/index.html">Videos</a></li>
    <li><a href="../../blog/index.html">Blog</a></li>
    <li><a href="../../links.html">Links</a></li>
    <li><a href="../../about.html">About</a></li>
  </ul>
</nav>"""

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} | jockles.com</title>
  <link rel="stylesheet" href="../../style.css">
  <script src="../../theme.js"></script>
  <link rel="stylesheet" href="megaskin.css?v={skinver}" id="creator-style">
</head>
<body>
<header>
  <h1><a href="../../index.html">jockles.com</a></h1>
  <p>All the Fannish things I do.</p>
</header>
{nav}
<main>
      <!-- This page is made by tools/build-megaskin.py. Edit the chapter text in text/{slug}.html instead. -->
      <p class="work-title"><a href="index.html">Megaskin</a> by Jockles</p>
      <p class="style-toggle"><button type="button" id="style-toggle">Hide Creator's Style</button></p>
{chapnav}

      <div class="fic">
        <h3 class="chapter-title">Chapter {n}: {ctitle}</h3>
        <div id="workskin">
{text}
        </div>
      </div>

{chapnav}
</main>
<footer>
  Made by hand in HTML &amp; CSS. No trackers, no cookies, no ads.
</footer>
<script>
  // Works like AO3's "Hide Creator's Style" button: switches the work skin off and on.
  (function () {{
    var skin = document.getElementById("creator-style");
    var button = document.getElementById("style-toggle");
    function show(off) {{
      skin.disabled = off;
      button.textContent = off ? "Show Creator's Style" : "Hide Creator's Style";
    }}
    try {{ show(localStorage.getItem("hide-creator-style") === "yes"); }} catch (e) {{ show(false); }}
    button.addEventListener("click", function () {{
      var off = !skin.disabled;
      show(off);
      try {{ localStorage.setItem("hide-creator-style", off ? "yes" : "no"); }} catch (e) {{}}
    }});
  }})();
</script>
</body>
</html>
"""


def chapnav(i):
    links = []
    if i > 0:
        links.append('<a href="%s.html">&larr; Previous Chapter</a>' % CHAPTERS[i - 1][0])
    links.append('<a href="index.html">Chapter Index</a>')
    if i < len(CHAPTERS) - 1:
        links.append('<a href="%s.html">Next Chapter &rarr;</a>' % CHAPTERS[i + 1][0])
    return '      <p class="chapter-nav">' + " &middot; ".join(links) + "</p>"


def build_chapters():
    # the ?v= changes whenever the skin does, so browsers fetch the new one straight away
    skin = open(os.path.join(ROOT, "megaskin.css"), "rb").read()
    skinver = hashlib.sha1(skin).hexdigest()[:8]
    for i, (slug, ctitle) in enumerate(CHAPTERS):
        text = open(os.path.join(ROOT, "text", slug + ".html"), encoding="utf-8").read().strip()
        page = PAGE.format(title="Megaskin, Chapter %d: %s" % (i + 1, html.escape(ctitle, quote=False)),
                           nav=NAV, slug=slug, chapnav=chapnav(i), n=i + 1,
                           ctitle=html.escape(ctitle, quote=False), text=text, skinver=skinver)
        open(os.path.join(ROOT, slug + ".html"), "w", encoding="utf-8").write(page)


def build_css():
    skin = open(os.path.join(ROOT, "megaskin.css"), encoding="utf-8").read()
    os.makedirs(os.path.join(ROOT, "css"), exist_ok=True)
    for name, fname in CSS_FILES.items():
        start = "/* >>>>>>>>>> %s (start) >>>>>>>>>> */" % name
        end = "/* <<<<<<<<<< %s (end) <<<<<<<<<< */" % name
        a, b = skin.index(start), skin.index(end) + len(end)
        open(os.path.join(ROOT, "css", fname), "w", encoding="utf-8").write(skin[a:b] + "\n")


def build_index():
    path = os.path.join(ROOT, "index.html")
    page = open(path, encoding="utf-8").read()
    items = "\n".join('          <li><a href="%s.html">%s</a></li>' % (slug, html.escape(t, quote=False))
                      for slug, t in CHAPTERS)
    page = re.sub(r'(<ol class="chapter-index">\n).*?(\n        </ol>)',
                  lambda m: m.group(1) + items + m.group(2), page, flags=re.S)
    page = re.sub(r'<a href="[^"]*">Start reading', '<a href="%s.html">Start reading' % CHAPTERS[0][0], page)
    open(path, "w", encoding="utf-8").write(page)


def word_count():
    """Words in the chapters, not counting code, rounded to the nearest thousand."""
    total = 0
    for slug, _ in CHAPTERS:
        text = open(os.path.join(ROOT, "text", slug + ".html"), encoding="utf-8").read()
        text = re.sub(r"<pre>.*?</pre>", " ", text, flags=re.S)
        total += len(html.unescape(re.sub(r"<[^>]+>", " ", text)).split())
    return "{:,}".format(round(total, -3))


def update_stats():
    """Keeps the word and chapter counts on the work page and the fic list up to date."""
    words = word_count()
    for path in (os.path.join(ROOT, "index.html"), os.path.join(ROOT, "..", "index.html")):
        page = open(path, encoding="utf-8").read()
        page = re.sub(r"Words: [\d,]+ &middot; Chapters: \d+/\?",
                      "Words: %s &middot; Chapters: %d/?" % (words, len(CHAPTERS)), page)
        open(path, "w", encoding="utf-8").write(page)


build_chapters()
build_css()
build_index()
update_stats()
print("Built %d chapters." % len(CHAPTERS))
