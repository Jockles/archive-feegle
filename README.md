# jockles.com

Hand-made HTML and CSS. No frameworks. The only build step is for WIP pages (see below), and the publish workflow does it.

- `style.css` holds every colour and font. Change it once and every page follows.
- Light and dark mode: the dark colours are in the second block at the top of `style.css`. `theme.js` adds the toggle button to the header and remembers the reader's choice. Every page loads it with `<script src=".../theme.js"></script>` under the stylesheet link, so new pages need that line too.
- Each page has the menu written into it. If you add a new section, add its link to the `<nav>` in every page.
- `fic/sample-fic.html` has instructions in a comment for copying a fic over from an AO3 HTML download.
- `fic/megaskin/` is a multi-chapter work. Each chapter's text lives in `fic/megaskin/text/`, exactly as pasted into AO3, and `megaskin.css` is the work skin. After changing either, run `python3 tools/build-megaskin.py` to rebuild the chapter pages, the per-module CSS files in `fic/megaskin/css/` and the chapter list. The chapter order is at the top of that script.
- Drafts: every pull request gets a preview copy of the site at `jockles.com/pr-preview/pr-<number>/`, with a yellow "Draft preview" banner, linked from a comment on the pull request (`.github/workflows/preview.yml`). It's removed when the pull request is merged or closed. Previews aren't linked anywhere and `robots.txt` keeps search engines out, but they aren't password protected.
- Publishing: merging into `main` copies the site to the `gh-pages` branch, which GitHub Pages serves (`.github/workflows/publish.yml`).
- Works in progress: the back-end at `jockles.com/admin/` (Sveltia CMS, set up in `admin/config.yml`) has an AO3-style posting form. Each WIP is saved as a file in `_wips/`, and on publishing `tools/build-wips.py` turns it into a page at `jockles.com/wip/<file name>/`. Those pages and the back-end aren't linked from the site and ask search engines not to list them, but anyone with the address can read them, and the files in `_wips/` are public in this repository. Untick "Show on the site" to keep a WIP saved without a page.
- Signing in to the back-end: on GitHub go to Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token. Pick "Only select repositories" › archive-feegle, and under Repository permissions set Contents to "Read and write". Then open `jockles.com/admin/`, choose "Sign In Using Access Token" and paste it. The token is remembered in that browser only. Don't share it or paste it anywhere else.
- `CNAME` tells GitHub Pages to serve the site at jockles.com. `.nojekyll` tells it to publish the files exactly as they are.

To preview, open `index.html` in your browser.
