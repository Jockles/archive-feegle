"""Adds the site icon and link-preview tags to every page of jockles.com.

The publish and preview workflows run this on the copy of the site they are
about to publish, so the pages in the repository stay short and new pages
pick the tags up without anyone having to remember them.

For each page it adds, just after the <title>:
- the site icon (favicon.ico, images/favicon.svg and the Apple touch icon)
- a description, for search results and link previews
- Open Graph and Twitter card tags, so links shared on Tumblr, Discord,
  Bluesky, Mastodon, iMessage and so on show a title, a description and
  images/social-card.png

The description comes from, in order:
1. a <meta name="description"> already written in the page (left as it is)
2. the DESCRIPTIONS list below
3. the first paragraph of the page

The pages in ICON_ONLY, and any other page that tells search engines
to stay away, only get the icon. Redirect pages are skipped.

To try it on your own computer, copy the site somewhere and run:
    python3 tools/site-meta.py <that folder>
"""
import html, os, re, sys

SITE = "https://jockles.com/"
CARD = SITE + "images/social-card.png"
CARD_ALT = "jockles.com: All the Fannish things I do."

# Pages with their own social card: (path or folder, image, extra line on
# the card). The first match wins; everything else uses social-card.png.
CARDS = [
    ("fic/megaskin/fic-builder.html", "social-card-fic-builder.png", "Megaskin Fic-Builder"),
    ("fic/megaskin/profile-maker.html", "social-card-profile-builder.png", "Megaskin Profile-Builder"),
    ("fic/megaskin/", "social-card-megaskin.png", "Social Media AO3 Skin"),
]


def card(rel):
    for start, image, line in CARDS:
        if rel.startswith(start):
            return SITE + "images/" + image, CARD_ALT + " " + line
    return CARD, CARD_ALT


MEGASKIN = ("One AO3 work skin for every kind of social media in your fic: iMessage, "
            "WhatsApp, Twitter/X, Instagram, Tumblr, email and Discord, with a "
            "chapter for each app.")

# Page (relative to the top of the site) -> description. Anything under
# fic/megaskin/ that isn't listed here uses MEGASKIN.
DESCRIPTIONS = {
    "index.html": "All the Fannish things I do. Fic, videos, work skins and other fannish projects by Jockles.",
    "fic/index.html": "Copies of my fic and fannish projects. AO3 is still their main home.",
    "videos/index.html": "My fannish videos, hosted on the Internet Archive.",
    "blog/index.html": "My fannish blog.",
    "links.html": "Where to find me elsewhere: AO3 and Tumblr.",
    "about.html": "About me, and how you can use my stuff in your own fannish works.",
    "fic/megaskin/fic-builder.html": "Build the HTML for social media chats in your fic, for the Megaskin AO3 work skin, without writing code.",
    "fic/megaskin/profile-maker.html": "Make a character's social media profile for the Megaskin AO3 work skin.",
}

# Works still in progress that live on the public site. Every page under
# these folders gets "Work In Progress!!" at the start of its description.
# Take a folder out of this list when that work is finished.
WIP_WORKS = ("fic/megaskin/",)

# Pages that get the icon but no description or link-preview tags.
ICON_ONLY = {"404.html", "fic/sample-fic.html"}

START = "<!-- site meta -->"
END = "<!-- /site meta -->"


def first_paragraph(page):
    main = re.search(r"<main>(.*?)</main>", page, re.S)
    body = re.sub(r"<!--.*?-->", "", main.group(1) if main else page, flags=re.S)
    for p in re.findall(r"<p[^>]*>(.*?)</p>", body, re.S):
        text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", p)).split())
        if len(text) > 40:
            return text if len(text) <= 200 else text[:197].rsplit(" ", 1)[0] + "..."
    return DESCRIPTIONS["index.html"]


def page_url(rel):
    if rel == "index.html":
        return SITE
    if rel.endswith("/index.html"):
        return SITE + rel[: -len("index.html")]
    return SITE + rel


def tags(rel, page):
    # Paths from the top of the site, so they also work on the 404 page,
    # which GitHub shows at whatever address was mistyped.
    lines = [
        '<link rel="icon" href="/favicon.ico" sizes="32x32">',
        '<link rel="icon" href="/images/favicon.svg" type="image/svg+xml">',
        '<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">',
        '<meta name="theme-color" content="#6c392a">',
    ]
    if rel in ICON_ONLY or re.search(r'<meta name="robots" content="[^"]*noindex', page):
        return lines

    title = re.search(r"<title>(.*?)</title>", page, re.S)
    title = html.unescape(title.group(1)) if title else "jockles.com"
    title = re.sub(r"\s*\|\s*jockles\.com$", "", title).strip()
    if title == "Home":
        title = "jockles.com"

    own = re.search(r'<meta name="description" content="([^"]*)"', page)
    if own:
        desc = html.unescape(own.group(1))
    elif rel in DESCRIPTIONS:
        desc = DESCRIPTIONS[rel]
    elif rel.startswith("fic/megaskin/"):
        desc = MEGASKIN
    else:
        desc = first_paragraph(page)

    if rel.startswith(WIP_WORKS) and not desc.startswith("Work In Progress!!"):
        desc = "Work In Progress!! " + desc

    image, alt = card(rel)
    e = lambda s: html.escape(s, quote=True)
    if not own:
        lines.append('<meta name="description" content="%s">' % e(desc))
    lines += [
        '<link rel="canonical" href="%s">' % page_url(rel),
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="jockles.com">',
        '<meta property="og:title" content="%s">' % e(title),
        '<meta property="og:description" content="%s">' % e(desc),
        '<meta property="og:url" content="%s">' % page_url(rel),
        '<meta property="og:image" content="%s">' % image,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="%s">' % e(alt),
        '<meta name="twitter:card" content="summary_large_image">',
    ]
    return lines


def add_meta(root):
    done = 0
    for folder, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in (".git", ".github", "pr-preview", "text")]
        for name in files:
            if not name.endswith(".html"):
                continue
            path = os.path.join(folder, name)
            rel = os.path.relpath(path, root).replace(os.sep, "/")
            page = open(path, encoding="utf-8").read()
            if 'http-equiv="refresh"' in page or "<title>" not in page:
                continue
            page = re.sub(r"\n[ \t]*" + re.escape(START) + r".*?" + re.escape(END), "", page, flags=re.S)
            m = re.search(r"([ \t]*)<title>.*?</title>\n", page, re.S)
            indent = m.group(1)
            block = "".join(indent + line + "\n" for line in [START] + tags(rel, page) + [END])
            page = page[: m.end()] + block + page[m.end():]
            open(path, "w", encoding="utf-8").write(page)
            done += 1
    print("Added site meta to %d pages." % done)


if __name__ == "__main__":
    add_meta(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
