// The Megaskin Fic Builder. Everything happens in the reader's browser:
// nothing typed here is sent anywhere. Work is kept in this browser's storage
// and can be saved to a file and opened again.
//
// How it fits together:
//   S            everything typed in: the cast and the chats (blocks)
//   ...HTML()    turn S into the HTML, one function per app
//   castCard(), blockCard(), msgRow()   draw the boxes on the left
//   data-bind    each box says which bit of S it fills in, e.g. "blocks.2.msgs.0.text"
//   data-act     each button says what it does, e.g. "msg-del:2:0" (block 2, message 0)
// Chats (iMessage, WhatsApp) are a list of messages.
// A Twitter/X thread or timeline is a list of tweets, kept in the same msgs list,
//   HELP         the help under each box, shown when Help text is pressed
// To add a new app: a newBlock() default, an ...HTML() function, a line in
// allHTML(), and a button on the page.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "megaskin-fic-builder";
  var MP = window.MegaskinProfile;

  var EXAMPLES = [
    ["shane", "Shane"], ["ilya", "Ilya"], ["luca", "Luca"], ["rose", "Rose"],
    ["yuna", "Yuna"], ["zim", "Jack Zimmerman"], ["holster", "Holster"], ["stan", "Stan"]
  ];
  var COLOURS = { 1: "#b8651f", 2: "#5f6368", 3: "#b03a6f", 4: "#1f8a72", 5: "#2f68c8",
    6: "#7b52c4", 7: "#c0392b", 8: "#4a8a25", 9: "#9a7412", 10: "#1f7fa3" };
  var COLOUR_NAMES = { 1: "orange", 2: "grey", 3: "pink", 4: "teal", 5: "blue", 6: "purple", 7: "red", 8: "green", 9: "mustard", 10: "sea blue" };
  var BACKGROUNDS = ["", "beige", "black", "blush", "dusk", "forest", "lilac", "navy", "night",
    "ocean", "plum", "sage", "sky", "slate", "sunset", "white"];
  var KINDS = {
    imsg: "iMessage chat",
    wa: "WhatsApp chat",
    twfeed: "Twitter/X timeline",
    twthread: "Twitter/X tweet and replies",
    twone: "Twitter/X single tweets",
    twdm: "Twitter/X DM",
    igfeed: "Instagram feed",
    igone: "Instagram single posts",
    igdm: "Instagram DM",
    raw: "HTML, as it was"
  };
  function isChat(b) { return b.type === "imsg" || b.type === "wa" || b.type === "twdm" || b.type === "igdm"; }

  // ---------- state ----------

  var S;
  var uid = 0;
  function nid(p) { uid += 1; return p + Date.now().toString(36) + uid; }

  function newProfile(name) {
    return { slug: "", slugTouched: false, pic: "", piccol: "#c06a1f", namecol: "#d2782a", handle: "", email: "",
      apps: { tw: {}, ig: {}, tb: {}, gm: {}, dc: {} }, dccolon: false, dccol: "#e8734a", tbsq: false,
      saved: [], accounts: [], wallcolon: false, wallcol: "#dfeaf6", wallpic: "" };
  }
  function newChar(name, kind) {
    // pick the first colour no other one-off is using
    var used = S ? S.cast.filter(function (c) { return c.kind === "oneoff"; }).map(function (c) { return +c.colour; }) : [];
    var col = 1;
    for (var i = 1; i <= 10; i++) if (used.indexOf(i) < 0) { col = i; break; }
    return { id: nid("c"), name: name || "", kind: kind || "oneoff", example: "shane", colour: String(col),
      showInitials: true, initials: "", pic: "", alt: "", num: "", handle: "", prof: newProfile() };
  }
  function newMsg(from, text, time) {
    return { id: nid("m"), from: from || "", text: text || "", time: time || "", open: false,
      reacts: [], waReacts: "", waCount: "", tick: "read", edited: false, status: "", sms: false, big: false,
      replyTo: "", photos: [], link: null,
      // Twitter/X bits
      acc: "", verified: false, label: "", qName: "", qHandle: "", qText: "", note: "", date: "",
      reposts: "", likes: "", replies: "", liked: false, reposted: false, poll: "", pollinfo: "",
      vUrl: "", vTitle: "", vDesc: "", warn: false,
      views: "", saved: false, saveClick: false, likeClick: true, locked: false, noRepost: false, fan: "", fanMask: false, voice: "", call: "", missed: false, callLen: "", contact: "", fwd: false, pollTap: false, pollVote: "0", pollShowVote: false, pollVoted: "0" };
  }
  // the group's picture in the WhatsApp header: a one-off circle, set up the same way
  function newGroupPic() { return { colour: "5", showInitials: true, initials: "", pic: "", alt: "", land: false }; }
  function newBlock(type) {
    var b = { id: nid("b"), type: type };
    var pov = S.cast[0] ? S.cast[0].id : "";
    b.pov = pov; b.group = false; b.title = ""; b.sub = type === "imsg" ? "iMessage" : type === "igdm" ? "Active now" : "online";
    b.theme = "theme-auto"; b.width = ""; b.scroll = ""; b.bar = "empty"; b.barText = "";
    b.bg = ""; b.pics = true; b.header = "simple"; b.gp = newGroupPic(); b.script = ""; b.msgs = []; b.open = true;
    b.acc = "";
    b.nav = false; b.badge = ""; // Twitter/X DMs: the row of app buttons at the bottom
    b.era = ""; b.app = type === "twfeed" ? "app" : ""; b.tabs = ""; // Twitter/X: the 2020 look, and the X app screen around a timeline
    b.top = "new"; b.myStory = true; b.stories = ""; // Instagram feed: the top bar and the Stories row
    // Instagram DMs: pictures in the header (and who's in them), the blue tick, and the app screen around it
    if (type === "igdm") { b.headPic = true; b.faces = []; b.tick = false; b.bar = "none"; }
    return b;
  }
  // load one of the tutorial's example chats (from fic-builder-examples.js)
  function loadExample(n) {
    var ex = window.FB_EXAMPLES[n], ids = {};
    S = { v: 1, pasted: "", cast: [], blocks: [] };
    ex.cast.forEach(function (p) {
      var c = newChar(p.name, p.profile ? "example" : "oneoff");
      if (p.profile) c.example = p.profile;
      c.open = false; // examples load with the cast folded up
      ["colour", "initials", "showInitials", "pic", "alt", "num", "land", "handle", "ighandle"].forEach(function (k) { if (p[k] !== undefined) c[k] = p[k]; });
      S.cast.push(c);
      ids[p.name] = c.id;
    });
    // an example can have its own profiles (pasted in, like a fic's own profile CSS) and more than one chat
    if (ex.pasted) S.pasted = ex.pasted;
    (ex.chats || [{ chat: ex.chat, msgs: ex.msgs }]).forEach(function (one, n) {
      var b = exampleBlock(one.chat, one.msgs, ids);
      if (n) b.fold = true; // only the first chat starts open
      S.blocks.push(b);
    });
  }
  function exampleBlock(chat, msgs, ids) {
    var b = newBlock(chat.type);
    Object.keys(chat).forEach(function (k) { if (k !== "type" && k !== "gpFrom") b[k] = chat[k]; });
    b.pov = ids[chat.pov] || (S.cast[0] && S.cast[0].id) || "";
    if (chat.from) b.from = ids[chat.from];
    if (chat.faces) b.faces = chat.faces.map(function (n) { return ids[n]; });
    if (chat.gpFrom) b.gp.from = ids[chat.gpFrom];
    b.msgs = msgs.map(function (line) {
      var x = line[2] || {};
      var m = newMsg(ids[line[0]] || line[0], line[1], x.time);
      Object.keys(x).forEach(function (k) { if (["reacts", "photos", "link", "reply", "time", "by", "contact", "collabs", "faces", "tags"].indexOf(k) < 0) m[k] = x[k]; });
      if (x.by) m.by = ids[x.by];
      if (x.contact) m.contact = ids[x.contact];
      if (x.collabs) m.collabs = x.collabs.map(function (g) { return { who: ids[g[0]], tick: !!g[1] }; });
      if (x.faces) m.faces = x.faces.map(function (n) { return ids[n]; });
      if (x.tags) m.tags = x.tags.map(function (g) { return { who: ids[g[0]], fol: g[1] || "following", tick: !!g[2] }; });
      m.reacts = (x.reacts || []).map(function (r) { return { by: ids[r[0]], emoji: r[1] }; });
      m.photos = (x.photos || []).map(function (p) { return { url: p.url || "", alt: p.alt || "", desc: p.desc || "", land: !!p.land }; });
      if (x.link) m.link = { url: x.link.url || "", showUrl: !!x.link.showUrl, title: x.link.title || "", desc: x.link.desc || "",
        img: x.link.img || "", alt: x.link.alt || "", video: x.link.video || "", imgdesc: x.link.imgdesc || "" };
      return m;
    });
    // a reply: WhatsApp quotes a message, a tweet replies to a person
    msgs.forEach(function (line, i) { if (line[2] && line[2].reply !== undefined) b.msgs[i].replyTo = b.msgs[line[2].reply][b.type === "twthread" ? "from" : "id"]; });
    return b;
  }
  function starter() { loadExample(0); }
  // a timeline saved before timelines always had the app screen becomes single tweets
  function oldFeed(b) { if (b.type === "twfeed" && !b.app) b.type = "twone"; }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() {
    try {
      var t = localStorage.getItem(KEY);
      if (t) { S = JSON.parse(t); if (S && S.cast && S.blocks) { S.blocks.forEach(oldFeed); return; } }
    } catch (e) {}
    starter();
  }

  // ---------- helpers ----------

  function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function char(id) { return S.cast.filter(function (c) { return c.id === id; })[0]; }
  // profiles pasted into the "Profiles you already have" box: [slug, name] for each
  function pastedProfiles(css) {
    css = css || S.pasted || "";
    var out = [];
    // a profile's own picture rule (not a rule that only changes it in one app or on one phone)
    var re = /#workskin \.pfp\.pfp-([a-z0-9-]+)\s*[{,]/g, m;
    while ((m = re.exec(css))) {
      var slug = m[1];
      if (out.some(function (p) { return p[0] === slug; })) continue;
      var n = css.match(new RegExp("#workskin \\.name\\.pfp-" + slug + "::before \\{ content: \"((?:[^\"\\\\]|\\\\.)*)\"")); // their main name
      out.push([slug, n ? n[1].replace(/\\(.)/g, "$1") : slug]);
    }
    return out;
  }
  // every existing profile: the skin's examples, then pasted ones
  function existing() {
    var mine = pastedProfiles();
    return mine.concat(EXAMPLES.filter(function (e) { return !mine.some(function (p) { return p[0] === e[0]; }); }));
  }
  // the "Which one" list: profiles from the profile CSS box, then the skin's examples marked "(example)",
  // unless "Only use my own profiles" is ticked (a character already using an example keeps it in their list)
  function profileChoices(c) {
    var mine = pastedProfiles();
    var ex = EXAMPLES.filter(function (e) { return !mine.some(function (p) { return p[0] === e[0]; }) && (!S.ownOnly || e[0] === c.example); });
    return mine.concat(ex.map(function (e) { return [e[0], e[1] + " (example)"]; }));
  }
  // add any pasted profile that isn't in the cast yet
  function addPasted() {
    pastedProfiles().forEach(function (p) {
      if (S.cast.some(function (c) { return c.kind === "example" && c.example === p[0]; })) return;
      var c = newChar("", "example"); c.example = p[0]; c.open = false;
      S.cast.push(c);
    });
  }
  // fill in the profile boxes from an existing profile, pasted or from the skin
  var SKIN = "";
  function loadProfile(c) {
    var pasted = pastedProfiles().some(function (p) { return p[0] === c.example; });
    var source = pasted ? S.pasted : SKIN;
    if (!source) return; // the skin hasn't loaded yet
    var d = MP.parse(source, c.example), hex = /^#[0-9a-f]{6}$/i;
    c.name = d.name || c.name;
    c.prof = { slug: c.example, pic: d.pic, piccol: hex.test(d.piccol) ? d.piccol : "#888888", namecol: hex.test(d.namecol) ? d.namecol : "#666666",
      handle: d.handle, email: d.email, apps: d.apps, dccolon: !!d.dccol, dccol: d.dccol || "#e8734a", tbsq: d.tbsq,
      saved: d.saved, accounts: d.accounts, wallcolon: !!d.wallcol, wallcol: d.wallcol || "#dfeaf6", wallpic: d.wallpic };
    c.loadedFrom = c.example;
    c.orig = JSON.stringify(profileData(c));
  }
  function isProfile(c) { return c && (c.kind === "new" || c.kind === "example"); }
  function slugOf(c) {
    if (!c) return "";
    if (c.kind === "example") return c.example;
    if (c.kind === "new") return MP.slugify(c.prof.slug || c.name) || "character";
    return "";
  }
  function nameOf(c) {
    if (!c) return "Someone";
    if (c.name.trim()) return c.name.trim();
    if (c.kind === "example") {
      var e = existing().filter(function (e) { return e[0] === c.example; })[0];
      return e ? e[1] : c.example;
    }
    return "Someone";
  }
  function initials(c) {
    if (c.initials.trim()) return c.initials.trim();
    return nameOf(c).split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
  }
  // whose phone the chat being made is on, so the hidden names match what they have someone saved as
  var povOwner = "";
  function shownName(c) {
    var sv = isProfile(c) && povOwner && c.prof && (c.prof.saved || []).filter(function (x) { return MP.slugify(x.owner) === povOwner && t(x.as); })[0];
    return sv ? t(sv.as) : nameOf(c);
  }
  function profileName(c) {
    // a profile's name span, with the typed name inside for readers with the style off
    return '<span class="name pfp-' + slugOf(c) + '"><span class="hide">' + esc(shownName(c)) + "</span></span>";
  }
  function plainName(c, wa) {
    // the label for readers with the style off
    return (wa && c && !isProfile(c) && c.num.trim() ? "~ " : "") + shownName(c);
  }
  function waName(c) {
    // a name as WhatsApp shows it in a group: profile, or typed with a phone number
    if (isProfile(c)) return profileName(c);
    var n = esc(nameOf(c));
    if (c.num.trim()) return "~ " + n + '<span class="hide"> </span><span class="wa-no">' + esc(c.num.trim()) + "</span>";
    return n;
  }
  // a one-off's colour class: colour1 to colour10 from the skin
  function colourClass(c) { return "colour" + c.colour; }
  function picUrl(v) { return MP.url(v) ? v.trim() : ""; }

  // inline extras inside any text: [[shown|translation]], {{shown|hidden}}, ~~crossed out~~, <<fake link>>
  var tlCount = 0;
  function fmt(text) {
    var s = esc(text);
    s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, function (m, a, b) {
      tlCount += 1;
      return '<a class="tl" href="#t' + tlCount + '"><span class="orig">' + a + '</span><span class="tltn"><span class="hide"> (</span>' + b + '<span class="hide">)</span></span></a>';
    });
    s = s.replace(/\{\{([^}|]+)\|([^}]+)\}\}/g, function (m, a, b) {
      tlCount += 1;
      return '<a class="tl egg" href="#t' + tlCount + '"><span class="orig">' + a + '</span><span class="tltn"><span class="hide"> (</span>' + b + '<span class="hide">)</span></span></a>';
    });
    s = s.replace(/~~(.+?)~~/g, "$1"); // crossed-out text left over from older saved work
    s = s.replace(/&lt;&lt;(.+?)&gt;&gt;/g, '<span class="fake-link">$1</span>');
    return s;
  }
  function plain(text) {
    return String(text || "").replace(/\[\[([^\]|]+)\|[^\]]+\]\]/g, "$1").replace(/\{\{([^}|]+)\|[^}]+\}\}/g, "$1")
      .replace(/~~(.+?)~~/g, "$1").replace(/<<(.+?)>>/g, "$1");
  }
  // a typing row's person (picked in its second box): whoever was picked, or else the first person who isn't the phone owner
  function typer(b, m) {
    if (!char(m.by)) { var o = others(b)[0] || S.cast.filter(function (c) { return c.id !== b.pov; })[0] || char(b.pov); m.by = o ? o.id : ""; }
    return char(m.by);
  }
  function typingHide(c, named) { return (named ? "<em>" + esc(nameOf(c)) + "</em> " : "") + "is typing..."; }
  // the flashing cursor at the end of a half-typed message (the skin draws it, black or white to suit the chat)
  var CURSOR = '<span class="cursor">|</span>';
  function hideLabel(name) { return '<span class="hide"><em>' + esc(name) + ":</em> </span>"; }
  // pictures sent in a chat, built the same way in every chat app with the app's own first word (imsg, wa, igdm, twdm).
  // The word after photos says how many: one, two, three, and none for four (WhatsApp has always written "four").
  function photoLines(pre, photos) {
    var n = photos.length, word = ["one", "two", "three", pre === "wa" ? "four" : ""][n - 1];
    var ph = photos.map(function (p) {
      var u = picUrl(p.url);
      return '<span class="' + pre + '-photo">' + (u ? "<img " + (p.land ? 'class="landscape" ' : "") + 'src="' + esc(u) + '" alt="' + esc(t(p.alt)) + '">' :
        '<span class="img-desc">[' + esc(t(p.desc)) + "]</span>") + "</span>";
    });
    if (n === 1) return ['<p class="' + pre + '-photos one">' + ph[0] + "</p>"];
    return ['<p class="' + pre + "-photos" + (word ? " " + word : "") + '">'].concat(ind(ph, 1), ["</p>"]);
  }
  // a bubble of pictures: the hidden name (from a hideLabel, or none), the pictures, then anything after them
  function chatGallery(pre, cls, lbl, photos, after) {
    var L = ['<div class="' + cls + '">'];
    if (lbl) L.push("  " + lbl.replace('<span class="hide">', '<p class="hide">').replace(":</em> </span>", ":</em></p>"));
    return L.concat(ind(photoLines(pre, photos), 1), after ? ["  " + after] : [], ["</div>"]);
  }
  function shownPhotos(m) { return (m.photos || []).filter(function (p) { return picUrl(p.url) || t(p.desc); }).slice(0, 4); }
  function ind(lines, n) { var pad = new Array(n + 1).join("  "); return lines.map(function (l) { return pad + l; }); }

  // ---------- HTML output ----------

  function containerClass(b, app) {
    var c = ["mob", app, b.theme];
    if (app === "wa" && b.bg && b.bg !== "custom") c.push("bg-" + b.bg);
    if (b.width) c.push(b.width);
    if (b.scroll) c.push(b.scroll);
    var pov = char(b.pov);
    if (isProfile(pov) && (app === "imsg" || app === "wa")) c.push("pov-" + slugOf(pov)); // per-phone names and pictures: iMessage and WhatsApp only
    return c.join(" ");
  }
  function others(b) {
    var seen = [];
    b.msgs.forEach(function (m) { if (m.from !== b.pov && char(m.from) && seen.indexOf(m.from) < 0) seen.push(m.from); });
    return seen.map(char);
  }
  function headTitle(b) {
    if (b.title.trim()) return esc(b.title.trim());
    var o = others(b);
    if (b.group) return "Group chat";
    if (!o.length) return "Someone";
    return isProfile(o[0]) ? profileName(o[0]) : esc(nameOf(o[0]));
  }
  function mobHead(b) {
    return '<p class="mob-header">' + headTitle(b) + '<span class="hide"> - </span>' +
      (b.sub.trim() ? "<span>" + esc(b.sub.trim()) + "</span>" : "") + "</p>";
  }

  function imsgHTML(b) {
    var L = [], last = "";
    L.push('<div class="' + containerClass(b, "imsg") + '">');
    L.push("  " + mobHead(b));
    L.push('  <div class="mob-body">');
    var body = [];
    b.msgs.forEach(function (m) {
      if (m.from === "sys") { body.push('<p class="mob-sys">' + fmt(m.text) + "</p>"); last = ""; return; }
      if (m.from === "typing") {
        var tc = typer(b, m); if (!tc) return;
        var tOut = tc.id === b.pov, tWho = b.group && !tOut;
        if (tWho && last !== tc.id) body.push('<p class="who">' + (isProfile(tc) ? profileName(tc) : esc(nameOf(tc))) + "</p>");
        body.push('<p class="msg ' + (tOut ? "out" : "in") + ' typing-indicator"><span class="hide">' + typingHide(tc, !tWho) + "</span><span></span><span></span><span></span></p>");
        last = ""; return;
      }
      var c = char(m.from); if (!c) return;
      var out = m.from === b.pov, side = out ? "out" : "in";
      var showWho = b.group && !out && last !== m.from;
      if (showWho) body.push('<p class="who">' + (isProfile(c) ? profileName(c) : esc(nameOf(c))) + '<span class="hide">:</span></p>');
      last = out ? "" : m.from;
      var label = b.group && !out ? "" : hideLabel(nameOf(c));
      var bubbles = [];
      if (m.text.trim()) bubbles.push({ cls: "msg " + side + (m.sms ? " sms" : ""), inner: fmt(m.text) });
      var pics = shownPhotos(m);
      if (pics.length) bubbles.push({ cls: "msg " + side + " gallery", pics: pics });
      var taps = (m.reacts || []).filter(function (r) { return r.emoji.trim(); });
      bubbles.forEach(function (bb, i) {
        var extra = "";
        if (i === bubbles.length - 1 && taps.length) {
          bb.cls += " tapped";
          extra = taps.map(function (r) {
            var by = char(r.by);
            return '<span class="imsg-tap' + (r.by === b.pov ? " me" : "") + '"><span class="hide"> [' + esc(nameOf(by)) +
              " reacted </span>" + esc(r.emoji.trim()) + '<span class="hide">]</span></span>';
          }).join("");
        }
        if (bb.pics) body = body.concat(chatGallery("imsg", bb.cls, label, bb.pics, extra));
        else body.push('<p class="' + bb.cls + '">' + label + bb.inner + extra + "</p>");
      });
      if (m.edited) body.push('<p class="' + (out ? "imsg-edited" : "imsg-edited-in") + '">Edited</p>');
      if (m.status.trim()) body.push('<p class="imsg-status">' + esc(m.status.trim()) + "</p>");
    });
    L = L.concat(ind(body, 2));
    L.push("  </div>");
    if (b.bar === "empty") L.push('  <p class="imsg-footer"><span class="imsg-plus">+</span><span class="hide"> </span><span class="imsg-field">iMessage<span class="hide"> </span><span class="imsg-mic ic ic-mic">&#127908;</span></span></p>');
    if (b.bar === "typed") L.push('  <p class="imsg-footer"><span class="imsg-plus">+</span><span class="hide"> </span><span class="imsg-field typed">' + fmt(b.barText) + (b.cursor ? CURSOR : "") + '<span class="hide"> </span><span class="imsg-send ic ic-imsg-send">&#8593;</span></span></p>');
    L.push("</div>");
    return L.join("\n");
  }

  function waPfp(c) {
    if (isProfile(c)) return '<p class="wa-pfp"><span class="pfp pfp-' + slugOf(c) + '"></span></p>';
    var u = picUrl(c.pic);
    if (u) return '<p class="wa-pfp ' + colourClass(c) + '"><span class="pfp"><img ' + (c.land ? 'class="landscape" ' : "") + 'src="' + esc(u) + '" alt="' + esc(c.alt.trim() || ("Profile picture of " + nameOf(c))) + '"></span></p>';
    return '<p class="wa-pfp ' + colourClass(c) + '">' + (c.showInitials !== false ? esc(initials(c)) : "") + "</p>";
  }
  function groupPic(b) {
    var g = b.gp || newGroupPic(), pc = char(g.from);
    if (isProfile(pc)) return pc; // a group picture made as a profile, so it can be used in more than one chat or fic
    return { kind: "oneoff", name: b.title.trim() || "Group", colour: g.colour, showInitials: g.showInitials,
      initials: g.initials || (b.title.trim() || "G").charAt(0).toUpperCase(), pic: g.pic, alt: g.alt, land: g.land };
  }
  function waQuote(b, m) {
    var q = b.msgs.filter(function (x) { return x.id === m.replyTo; })[0];
    if (!q) return "";
    var qc = char(q.from); if (!qc) return "";
    var you = q.from === b.pov;
    var cls = you ? " colour8" : (!isProfile(qc) && b.group ? " " + colourClass(qc) : "");
    var who = you ? "You" : waName(qc);
    var txt = plain(q.text).trim();
    if (!txt && q.photos && q.photos.length) txt = "Photo";
    return '<p class="wa-quote' + cls + '"><span class="hide">[Replying to </span><b>' + who + '</b><span class="hide">:</span><br>' + esc(txt) + '<span class="hide">]</span></p>';
  }
  function waHTML(b) {
    var L = [], last = "", lastSide = "";
    L.push('<div class="' + containerClass(b, "wa") + '">');
    // a one-off wallpaper picture, just for this chat: it goes first, behind everything else
    var wall = b.bg === "custom" && picUrl(b.wall || "");
    if (wall) L.push('  <p class="wa-wall"><img src="' + esc(wall) + '" alt=""></p>');
    if (b.header === "bar") {
      var o = others(b), pc;
      if (b.group) pc = waPfp(groupPic(b));
      else pc = o[0] ? waPfp(o[0]) : '<p class="wa-pfp colour5">?</p>';
      var sub = b.sub.trim();
      if (b.group && !sub) sub = o.map(nameOf).concat(["You"]).join(", ");
      L = L.concat(ind(['<table class="wa-header">', "  <tbody>", "    <tr>",
        '      <td rowspan="2" class="wa-back"><span class="ic ic-back">&#8592;</span></td>',
        '      <td rowspan="2" class="wa-pfp-cell">' + pc + "</td>",
        '      <td class="wa-title">' + headTitle(b) + "</td>",
        '      <td rowspan="2" class="wa-actions"><span class="ic ic-video">&#127909;</span> <span class="ic ic-menu">&#8942;</span></td>',
        "    </tr>", "    <tr>", '      <td class="wa-status">' + esc(sub) + "</td>", "    </tr>", "  </tbody>", "</table>"], 1));
    } else if (b.header !== "none") L.push("  " + mobHead(b));
    L.push('  <div class="mob-body">');
    var body = [];
    b.msgs.forEach(function (m) {
      if (m.from === "sys") { body.push('<p class="mob-sys">' + fmt(m.text) + "</p>"); last = ""; return; }
      if (m.from === "typing") {
        var tc = typer(b, m); if (!tc) return;
        // the same dots as every app, with the name hidden; in a group with pictures, in a row after their picture
        var tOut = tc.id === b.pov;
        var tb = ['<p class="msg ' + (tOut ? "out" : "in") + ' tail typing-indicator"><span class="hide">' + typingHide(tc, true) + "</span><span></span><span></span><span></span></p>"];
        if (b.group && !tOut && b.pics) tb = ['<div class="wa-row">', "  " + waPfp(tc)].concat(ind(tb, 1)).concat(["</div>"]);
        body = body.concat(tb);
        last = ""; return;
      }
      var c = char(m.from); if (!c) return;
      var out = m.from === b.pov, side = out ? "out" : "in";
      var first = last !== m.from;
      last = m.from;
      var showWho = b.group && !out && first;
      var rows = b.group && b.pics && !out;
      var photos = shownPhotos(m);
      var link = m.link && (m.link.title.trim() || m.link.url.trim() || picUrl(m.link.img) || m.link.imgdesc.trim()) ? m.link : null;
      // a call or a shared contact is a bubble of its own, instead of the words and pictures
      var card = m.call ? "call" : char(m.contact) ? "contact" : "";
      if (card) { photos = []; link = null; }
      var cls = "msg " + side + (first ? " tail" : "") + (card ? " " + card : photos.length ? " gallery" : link ? " share" : "");
      var label = hideLabel(plainName(c, true));
      var inner = [];
      var open = '<div class="' + cls + '">';
      if (showWho && m.call) showWho = false; // a call has no words from anyone, so no name
      if (showWho) inner.push('<p class="who ' + (isProfile(c) ? "pfp-" + slugOf(c) : colourClass(c)) + '">' + waName(c) + '<span class="hide">:</span></p>');
      else if (photos.length || link || card === "contact") open += '<p class="hide"><em>' + esc(plainName(c, true)) + ":</em></p>";
      if (m.fwd && !m.call) inner.push('<p class="wa-fwd"><span class="ic ic-forward">&#8618;</span> Forwarded</p>');
      if (m.replyTo && !card) { var q = waQuote(b, m); if (q) inner.push(q); }
      var lab = showWho ? "" : label;
      if (card === "call") {
        var video = m.call === "video", miss = m.missed, icon = video ? "&#127909;" : "&#128222;";
        var what = (miss ? "Missed " : "") + (video ? "video call" : "voice call");
        inner.push('<p class="wa-call"><span class="wa-call-ic ic ic-wa-' + (video ? "video" : "call") + "-" + (miss ? "missed" : out ? "out" : "in") + '">' + icon +
          '</span><span class="hide"> </span><b>' + what.charAt(0).toUpperCase() + what.slice(1) + '</b><span class="hide"> - </span><span class="wa-call-len">' +
          esc(miss ? "Tap to call back" : t(m.callLen)) + "</span></p>");
      } else if (card === "contact") {
        var cc = char(m.contact), pf = waPfp(cc);
        inner.push('<p class="wa-contact"><span' + pf.slice(2, -4) + "</span>" + esc(nameOf(cc)) + "</p>");
      } else if (photos.length) {
        inner = inner.concat(photoLines("wa", photos));
        if (m.text.trim()) inner.push('<p class="wa-caption">' + fmt(m.text) + "</p>");
      } else if (link) {
        if (link.url.trim() && link.showUrl) inner.push('<p><span class="wa-link-text">' + esc(link.url.trim()) + "</span></p>");
        var lk = ['<div class="wa-link">'];
        var li = picUrl(link.img), vid = picUrl(link.video || "");
        if (vid) lk.push('  <div class="wa-link-img video"><iframe src="' + esc(vid) + '" frameborder="0" title="' + esc(link.title.trim()) + '"></iframe>' +
          (link.imgdesc.trim() ? '<p class="vid-desc">[' + esc(link.imgdesc.trim()) + "]</p>" : "") + "</div>");
        else if (li) lk.push('  <p class="wa-link-img"><img src="' + esc(li) + '" alt="' + esc(link.alt) + '"></p>');
        else if (link.imgdesc.trim()) lk.push('  <p class="wa-link-img text">[' + esc(link.imgdesc.trim()) + "]</p>");
        if (link.title.trim()) lk.push('  <p class="wa-link-title">' + esc(link.title.trim()) + "</p>");
        if (link.desc.trim()) lk.push('  <p class="wa-link-desc">' + esc(link.desc.trim()) + "</p>");
        if (link.url.trim()) lk.push('  <p class="wa-link-url">' + esc(link.url.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")) + "</p>");
        lk.push("</div>");
        inner.push(lk.join("\n"));
        if (m.text.trim()) inner.push('<p class="wa-caption">' + fmt(m.text) + "</p>");
      } else {
        inner.push("<p" + (m.big ? ' class="wa-big"' : "") + ">" + lab + fmt(m.text) + "</p>");
      }
      var tick = !out || card ? "" : m.tick === "read" ? ' <span class="wa-read ic ic-read">✓✓</span>' :
        m.tick === "delivered" ? ' <span class="ic ic-delivered">✓✓</span>' : m.tick === "sent" ? ' <span class="ic ic-sent">✓</span>' : "";
      // a blank time with no ticks leaves the line out
      if (m.time.trim() || tick || (m.edited && !card)) inner.push('<p class="wa-time">' + (m.edited && !card ? "Edited " : "") + esc(m.time.trim()) + tick + "</p>");
      if (card === "contact") inner.push('<p class="wa-contact-btn">Message</p>');
      var block = [open].concat(ind(inner.join("\n").split("\n"), 1)).concat(["</div>"]);
      if (rows) {
        block = ['<div class="wa-row' + (first ? "" : " same") + '">'].concat(first ? ["  " + waPfp(c)] : []).concat(ind(block, 1)).concat(["</div>"]);
      }
      body = body.concat(block);
      var r = (m.waReacts || "").trim();
      if (r) {
        body.push('<p class="wa-reacts' + (out ? " out" : rows ? " indent" : "") + '"><span class="hide">[Reactions: </span>' + esc(r) +
          (m.waCount.trim() ? ' <span class="wa-count">' + esc(m.waCount.trim()) + "</span>" : "") + '<span class="hide">]</span></p>');
      }
      lastSide = side;
    });
    L = L.concat(ind(body, 2));
    L.push("  </div>");
    if (b.bar === "empty" || b.bar === "typed") {
      var typed = b.bar === "typed";
      L = L.concat(ind(['<p class="wa-footer">', '  <span class="wa-field">', '    <span class="ic ic-emoji">&#9786;</span>',
        typed ? '    <span class="wa-placeholder typed">' + fmt(b.barText) + (b.cursor ? CURSOR : "") + "</span>" : '    <span class="wa-placeholder">Message</span>',
        '    <span class="ic ic-paperclip">&#128206;</span>'].concat(typed ? [] : ['    <span class="ic ic-camera">&#128247;</span>'])
        .concat(["  </span>", typed ? '  <span class="wa-mic ic ic-wa-send">&#10148;</span>' : '  <span class="wa-mic ic ic-wa-mic">&#127908;</span>', "</p>"]), 1));
    }
    L.push("</div>");
    return L.join("\n");
  }

  // ---------- Twitter/X DMs ----------

  // a round picture as its own line (the picture beside a run of messages in a group)
  function pfpLine(c) { var h = circle("tw-pfp", c); return "<p" + h.slice(5, -7) + "</p>"; }
  function dmName(c) { return isProfile(c) ? pSpan("name", c, null, twName(c)) : esc(nameOf(c)); }
  function twdmHTML(b) {
    var o = others(b), head = b.group ? groupPic(b) : o[0];
    var name = t(b.title) ? esc(t(b.title)) : b.group ? "Group chat" : head ? dmName(head) : "Someone";
    var L = ['<div class="' + containerClass(b, "twdm") + '">',
      '  <p class="mob-header"><span class="twdm-back"><span class="ic ic-back">&#8592;</span></span>' + (head ? circle("tw-pfp", head) : '<span class="tw-pfp colour5">?</span>') +
      '<span class="twdm-name">' + name + '</span><span class="twdm-calls"><span class="ic ic-video">&#127909;</span><span class="ic ic-phone">&#128222;</span></span></p>',
      '  <div class="mob-body">'];
    // in a group, each run of messages from one person goes in a row, with their picture and name first
    var body = [], row = null;
    function close() { if (row) body = body.concat(['<div class="twdm-row">'], ind(row.lines, 1), ["</div>"]); row = null; }
    b.msgs.forEach(function (m) {
      if (m.from === "sys") { close(); body.push('<p class="mob-sys">' + fmt(m.text) + "</p>"); return; }
      if (m.from === "typing") {
        // typing dots: a message from whoever is typing, so in a group they go in that person's row
        var tc = typer(b, m); if (!tc) return;
        var tOut = tc.id === b.pov, tg = b.group && !tOut;
        if (!tg || (row && row.from !== tc.id)) close();
        if (tg && !row) row = { from: tc.id, first: true, lines: [pfpLine(tc), '<p class="who">' + dmName(tc) + '<span class="hide">:</span></p>'] };
        if (tg) row.first = false;
        (tg ? row.lines : body).push('<p class="msg ' + (tOut ? "out" : "in") + ' typing-indicator"><span class="hide">' + typingHide(tc, true) + "</span><span></span><span></span><span></span></p>");
        return;
      }
      var c = char(m.from); if (!c) return;
      var out = m.from === b.pov, side = out ? "out" : "in", grouped = b.group && !out;
      if (!grouped || (row && row.from !== m.from)) close();
      if (grouped && !row) row = { from: m.from, first: true, lines: [pfpLine(c), '<p class="who">' + dmName(c) + '<span class="hide">:</span></p>'] };
      var to = grouped ? row.lines : body;
      var q = m.replyTo && b.msgs.filter(function (x) { return x.id === m.replyTo; })[0];
      if (q && char(q.from)) {
        var qt = plain(q.text).trim() || (q.photos.length ? "Photo" : t(q.voice) ? "Voice message" : "");
        if (qt.length > 60) qt = qt.slice(0, 57).trim() + "...";
        to.push('<p class="twdm-replied ' + side + '">Replied to ' + (q.from === b.pov ? "you" : esc(nameOf(char(q.from)))) + "</p>",
          '<p class="twdm-quote ' + side + '"><span class="hide">(</span>' + esc(qt) + '<span class="hide">)</span></p>');
      }
      var bubbles = [], pics = shownPhotos(m);
      if (pics.length) bubbles.push([side + " gallery", pics]);
      if (t(m.text)) bubbles.push([side, fmt(m.text)]);
      if (t(m.voice)) bubbles.push([side + " voice", '<span class="twdm-play ic ic-play">&#9654;</span><span class="twdm-wave"></span><span class="twdm-dur">' + esc(t(m.voice)) + "</span>"]);
      bubbles.forEach(function (bb) {
        // the first message under a name in a group needs no hidden name: the name is just above it
        var lbl = grouped && row.first ? "" : hideLabel(nameOf(c));
        if (typeof bb[1] !== "string") chatGallery("twdm", "msg " + bb[0], lbl, bb[1]).forEach(function (l) { to.push(l); });
        else to.push('<p class="msg ' + bb[0] + '">' + lbl + bb[1] + "</p>");
        if (grouped) row.first = false;
      });
      if (t(m.waReacts)) to.push('<p class="twdm-reacts' + (out ? " out" : "") + '"><span class="hide">[Reactions: </span>' + esc(t(m.waReacts)) + '<span class="hide">]</span></p>');
      if (t(m.status)) to.push('<p class="twdm-status">' + esc(t(m.status)) + "</p>");
    });
    close();
    L = L.concat(ind(body, 2));
    L.push("  </div>");
    if (b.bar === "empty") L.push('  <p class="twdm-footer"><span class="twdm-plus">+</span><span class="hide"> </span><span class="twdm-field">Message<span class="hide"> </span><span class="ic ic-mic">&#127908;</span></span></p>');
    if (b.bar === "typed") L.push('  <p class="twdm-footer"><span class="twdm-plus">+</span><span class="hide"> </span><span class="twdm-field typed">' + fmt(b.barText) + (b.cursor ? CURSOR : "") + '<span class="hide"> </span><span class="ic ic-mic">&#127908;</span></span></p>');
    if (b.nav) L.push('  <p class="tw-nav"><span class="ic ic-x-home">&#8962;</span> <span class="ic ic-x-search">&#128269;</span> <span class="ic ic-x-grok">&#8856;</span> ' +
      (t(b.badge) ? '<span class="badged"><span class="ic ic-x-bell">&#128276;</span><span class="tw-badge"><span class="hide"> (</span>' + esc(t(b.badge)) + '<span class="hide">)</span></span></span>' : '<span class="ic ic-x-bell">&#128276;</span>') +
      ' <span class="on ic ic-x-chat">&#128172;</span></p>');
    L.push("</div>");
    return L.join("\n");
  }

  // ---------- Twitter/X: names, handles and pictures ----------

  function t(v) { return String(v == null ? "" : v).trim(); }
  function noAt(v) { return t(v).replace(/^@/, ""); }
  // one of a profile's extra accounts on this app, picked on the post or chat
  function accOf(c, acc, app) {
    if (!isProfile(c) || !acc) return null;
    return c.prof.accounts.filter(function (a) { return MP.slugify(a.acc) === acc && a.app === app; })[0] || null;
  }
  function accCls(a) { return a ? " acc-" + MP.slugify(a.acc) : ""; }
  function appBit(c, app, k) { return t(((c.prof.apps || {})[app] || {})[k]); }
  function twName(c, a) { return isProfile(c) ? (a && t(a.name)) || appBit(c, "tw", "name") || nameOf(c) : nameOf(c); }
  function twHandle(c, a) {
    if (isProfile(c)) return (a && noAt(a.handle)) || noAt(appBit(c, "tw", "handle")) || noAt(c.prof.handle) || slugOf(c);
    return noAt(c.handle) || nameOf(c).replace(/\s+/g, "");
  }
  // a profile's name or handle span, with a typed copy inside for readers with the style off
  function pSpan(kind, c, a, text) {
    return '<span class="' + kind + " pfp-" + slugOf(c) + accCls(a) + '"><span class="hide">' + esc(text) + "</span></span>";
  }
  function twNameHTML(c, a) { return isProfile(c) ? pSpan("name", c, a, twName(c, a)) : esc(nameOf(c)); }
  function twHandleHTML(c, a) { return isProfile(c) ? pSpan("handle", c, a, "@" + twHandle(c, a)) : "@" + esc(twHandle(c)); }
  // a round picture: from a profile, an uploaded picture, or initials in a colour
  function circle(cls, c, a) {
    if (isProfile(c)) return '<span class="' + cls + '"><span class="pfp pfp-' + slugOf(c) + accCls(a) + '"></span></span>';
    var u = picUrl(c.pic);
    if (u) return '<span class="' + cls + '"><span class="pfp"><img ' + (c.land ? 'class="landscape" ' : "") + 'src="' + esc(u) + '" alt="' + esc(t(c.alt) || ("Profile picture of " + nameOf(c))) + '"></span></span>';
    return '<span class="' + cls + " " + colourClass(c) + '">' + (c.showInitials !== false ? esc(initials(c)) : "") + "</span>";
  }
  function plural(n, one, many) { return t(n) === "1" ? one : many; }


  // ---------- Instagram posts ----------

  function igName(c, a) {
    if (isProfile(c)) return (a && noAt(a.handle)) || noAt(appBit(c, "ig", "handle")) || noAt(c.prof.handle) || slugOf(c);
    return noAt(c.ighandle) || nameOf(c).toLowerCase().replace(/\s+/g, ".");
  }
  // the username, from the profile (with a typed copy for readers with the style off) or typed
  // a name cut short with "…" (which counts as one) when it's longer than n, as the app does; AO3 won't let the skin do it
  function cutTo(s, n) { var ch = Array.from(s); return ch.length > n ? ch.slice(0, n - 1).join("") + "…" : s; }
  function igNameHTML(c, a) { return isProfile(c) ? pSpan("handle", c, a, igName(c, a)) : esc(igName(c)); }
  var TICK = '<span class="hide"> </span><span class="ig-tick ic ic-verified">&#10003;</span>';
  var LOCK = '<span class="hide"> </span><span class="ig-lock ic ic-lock">&#128274;</span>';
  function igCaption(text) {
    // #hashtags go blue, and a new line in the box is a new line in the caption
    return fmt(t(text)).replace(/(^|[\s(])(#[A-Za-z0-9_]+)/g, '$1<span class="ig-link">$2</span>').replace(/\n/g, "<br>");
  }
  // a comment line: "name: what they said", with the name from the cast if it's someone in it
  function igComment(line) {
    var sp = line.match(/^([^:]{1,40}):\s*(.*)$/);
    if (!sp) return '<p class="ig-comment">' + igCaption(line) + "</p>";
    var c = findChar(sp[1]);
    return '<p class="ig-comment"><b>' + (c ? igNameHTML(c, null) : esc(sp[1].trim())) + "</b> " + igCaption(sp[2]) + "</p>";
  }
  function igPhoto(ph, cls, tag) {
    var u = picUrl(ph.url);
    if (u) return "<" + tag + ' class="ig-photo real' + cls + '"><img ' + (ph.land ? 'class="landscape" ' : "") + 'src="' + esc(u) + '" alt="' + esc(t(ph.alt)) + '"></' + tag + ">";
    return "<" + tag + ' class="ig-photo' + cls + '">[' + esc(t(ph.desc) || "A photo") + "]</" + tag + ">";
  }
  // one photo, or a carousel: each photo after the first goes inside the one before it
  function igPhotos(m) {
    var ps = m.photos || [], cls = m.shape ? " " + ({ sq: "square", portrait: "portrait" }[m.shape] || "") : "";
    if (!ps.length) return [];
    if (ps.length === 1) return [igPhoto(ps[0], cls, "p")];
    var real = ps.every(function (ph) { return picUrl(ph.url); }), n = ps.length;
    var info = function (i) {
      var dots = ps.map(function (x, j) { return j === i ? "<b>&#8226;</b>" : "&#8226;"; }).join("");
      return '<p class="ig-carousel-info"><span class="hide">(</span><span class="ig-carousel-count">' + (i + 1) + "/" + n + '</span><span class="hide">) </span><span class="ig-carousel-dots">' + dots + "</span></p>";
    };
    var L = ['<div class="ig-carousel' + (real ? " real" : "") + '">', igPhoto(ps[0], cls, "p"), info(0)];
    ps.slice(1).forEach(function (ph, i) { L.push('<details class="ig-next"><summary>' + igPhoto(ph, cls, "span") + "</summary>", info(i + 1)); });
    L.push(new Array(n).join("</details>"), "</div>");
    return L;
  }
  // the "In this photo" list
  function igTagged(m, b) {
    var tags = (m.tags || []).filter(function (g) { return char(g.who); });
    if (!tags.length) return [];
    var L = ['<details class="ig-tagged"><summary><span>In this photo</span></summary><div class="ig-sheet">'];
    tags.forEach(function (g) {
      var c = char(g.who), fol = g.who === b.pov ? "none" : g.fol;
      var bt = fol === "follow" ? '<span class="ig-following blue">Follow</span>' : fol === "none" ? "" : '<span class="ig-following">Following</span>';
      var nm = isProfile(c) ? appBit(c, "ig", "name") || nameOf(c) : nameOf(c);
      L.push('<p class="ig-person">' + bt + circle("ig-pfp", c, null) + (isProfile(c) ? igNameHTML(c, null) : '<span class="handle">' + esc(igName(c)) + "</span>") +
        (g.tick ? TICK : "") + (g.lock ? LOCK : "") + '<span class="ig-person-name">' + esc(nm) + "</span></p>");
    });
    L.push("</div></details>");
    return L;
  }
  function igCount(icon, n, one, many) {
    return '<p class="ig-stat">' + icon + '<span class="hide"> </span><span class="ig-count">' + esc(t(n)) + '</span><span class="hide"> ' + plural(n, one, many) + "</span></p>";
  }
  // the other accounts on a collab post (posts saved before this had just one, in m.collab)
  function collabsOf(m) {
    if (!m.collabs) m.collabs = m.collab ? [{ who: m.collab, tick: !!m.collabTick }] : [];
    return m.collabs;
  }
  function igPostHTML(b, m) {
    var c = char(m.from); if (!c) return [];
    var a = accOf(c, m.acc, "ig"), cos = collabsOf(m).filter(function (g) { return char(g.who); }), L = [];
    // the account line: the menu goes first (it sits at the far right), then a Follow button for a suggested post
    var top = '<span class="ig-menu ic ic-ig-lines">&#8801;</span>' + (m.follow === "button" ? '<span class="ig-follow-btn ic ic-ig-follow">Follow</span>' : "");
    // the name: the username, or the name typed in, cut short with "…" if it won't fit on one line at phone width
    var fullA = t(m.nameAs) || igName(c, a), lenA = Array.from(fullA).length;
    function shown(full, typed, n, html) { var x = cutTo(full, n); return typed || x !== full ? esc(x) : html; }
    if (cos.length) {
      // a collab: only the first two pictures show, and with three or more it says "and 2 others"
      var co = char(cos[0].who), and = '<span class="hide"> </span><span class="ig-and">and</span><span class="hide"> </span>';
      var nA = lenA, nB = 0, fullB = "";
      if (cos.length === 1) {
        // both names share the line: the longer one is cut first, but neither goes below 6
        fullB = t(cos[0].as) || igName(co); nB = Array.from(fullB).length;
        var room = 19 - (m.verified ? 2 : 0) - (cos[0].tick ? 2 : 0);
        while (nA + nB > room && (nA > 6 || nB > 6)) { if (nA >= nB && nA > 6 || nB <= 6) nA--; else nB--; }
      }
      top += '<span class="ig-collab">' + circle("ig-pfp", c, a) + circle("ig-pfp", co, null) + "</span>" + shown(fullA, t(m.nameAs), Math.max(nA, 6), igNameHTML(c, a)) + (m.verified ? TICK : "") + (m.locked ? LOCK : "") + and;
      if (cos.length === 1) top += shown(fullB, t(cos[0].as), Math.max(nB, 6), igNameHTML(co, null)) + (cos[0].tick ? TICK : "");
      else top += cos.length + " others" + '<span class="hide"> (' + cos.map(function (g) { return esc(igName(char(g.who))); }).join(", ") + ")</span>";
    } else top += circle("ig-pfp" + (m.story ? " story" : ""), c, a) + shown(fullA, t(m.nameAs), m.follow === "link" ? 20 : m.verified ? 24 : 27, igNameHTML(c, a)) + (m.verified ? TICK : "") + (m.locked ? LOCK : "");
    if (m.follow === "link") top += '<span class="hide"> - </span><span class="ig-follow">Follow</span>';
    if (t(m.under)) top += '<span class="hide"> - </span><span>' + (m.song ? "&#9835; " : "") + esc(t(m.under)) + "</span>";
    L.push('<p class="ig-top">' + top + "</p>");
    L = L.concat(igPhotos(m), igTagged(m, b));
    // the buttons: the heart, comments, reposts if there are any, share, and save
    var btns = [];
    if (m.likeClick !== false && !t(m.likes)) btns.push('<details class="ig-tog like"' + (m.liked ? " open" : "") + '><summary><span class="ig-icon off ic ic-heart">&#9825;</span><span class="ig-icon on ic ic-heart-red">&#9829;</span><span class="hide"> Like</span></summary></details>');
    else if (m.likeClick !== false) btns.push('<details class="ig-tog like"' + (m.liked ? " open" : "") + '><summary><span class="ig-icon off ic ic-heart">&#9825;</span><span class="hide"> </span><span class="ig-count off">' + esc(t(m.likes)) +
      '</span><span class="hide"> likes (</span><span class="ig-icon on ic ic-heart-red">&#9829;</span><span class="hide"> </span><span class="ig-count on">' + esc(bumpCount(m.likes)) + '</span><span class="hide"> when liked)</span></summary></details>');
    else btns.push(t(m.likes) ? igCount('<span class="ig-icon ic ic-heart">&#9825;</span>', m.likes, "like", "likes") : '<p class="ig-stat"><span class="ig-icon ic ic-heart">&#9825;</span><span class="hide"> Like</span></p>');
    btns.push(t(m.cmCount) ? igCount('<span class="ig-icon comment"></span>', m.cmCount, "comment", "comments").replace('<span class="hide"> </span>', "") : '<p class="ig-stat"><span class="ig-icon comment"></span><span class="hide"> Comment</span></p>');
    // a private post can't be reposted, so its repost button is faded out
    if (m.locked) btns.push(t(m.reposts) ? igCount('<span class="ig-icon ic ic-repost">&#8635;</span>', m.reposts, "repost", "reposts").replace('"ig-stat"', '"ig-stat locked"') :
      '<p class="ig-stat locked"><span class="ig-icon ic ic-repost">&#8635;</span><span class="hide"> (can\'t be reposted)</span></p>');
    else if (t(m.reposts)) btns.push(igCount('<span class="ig-icon ic ic-repost">&#8635;</span>', m.reposts, "repost", "reposts"));
    btns.push('<p class="ig-stat"><span class="ig-icon ic ic-share">&#10148;</span><span class="hide"> Share</span></p>');
    btns.push('<details class="ig-tog save"' + (m.saved ? " open" : "") + '><summary><span class="hide">Save</span><span class="ig-icon bookmark off"></span><span class="ig-icon bookmark on"></span></summary></details>');
    L = L.concat(['<div class="ig-stats">'], btns, ["</div>"]);
    var faces = (m.faces || []).map(char).filter(Boolean);
    if (m.likesLine === "faces" && faces.length) L.push('<p class="ig-likes liked-by"><span class="ig-like-pfps">' + faces.map(function (f) { return circle("ig-like-pfp", f, null); }).join("") +
      "</span>Liked by <b>" + igNameHTML(faces[0], null) + "</b> and <b>others</b></p>");
    else if ((m.likesLine || "count") === "count" && t(m.likes)) L.push('<p class="ig-likes">' + esc(t(m.likes)) + " " + plural(m.likes, "like", "likes") + "</p>");
    if (t(m.text)) L.push('<p class="ig-caption"><b>' + igNameHTML(c, a) + "</b> " + igCaption(m.text) + (m.more ? '... <span class="ig-more">more</span>' : "") + "</p>");
    if (m.viewAll && t(m.cmCount)) L.push('<p class="ig-viewall">View all ' + esc(t(m.cmCount)) + " comments</p>");
    t(m.comments).split(/\n/).map(t).filter(Boolean).forEach(function (line) { L.push(igComment(line)); });
    if (t(m.time)) L.push('<p class="ig-time">' + esc(t(m.time)) + "</p>");
    var open = b.type === "igone" ? '<div class="mob ig ' + b.theme + (b.width ? " " + b.width : "") + (b.scroll ? " " + b.scroll : "") + '">' : '<div class="mob ig">';
    return [open].concat(L, ["</div>"]);
  }
  // the Stories row: "Your story" first if ticked, then one circle per line ("close" for a green ring, "seen" for none)
  function igStories(b) {
    var me = char(b.pov), L = [];
    if (b.myStory && me) L.push('<p class="ig-story me">' + circle("ig-pfp", me, null) + '<span class="ig-story-name">Your story</span></p>');
    t(b.stories).split(/\n/).map(t).filter(Boolean).forEach(function (line) {
      var ring = "", k = line.match(/^(.*?)\s*\((close|seen)\)$/i);
      if (k) { line = k[1]; ring = k[2].toLowerCase() === "close" ? " close" : " plain"; }
      var c = findChar(line);
      L.push('<p class="ig-story' + ring + '">' + (c ? circle("ig-pfp", c, null) + '<span class="ig-story-name">' + esc(igName(c)) + "</span>" :
        '<span class="ig-pfp">' + esc(line.charAt(0).toUpperCase()) + '</span><span class="ig-story-name">' + esc(line) + "</span>") + "</p>");
    });
    return L.length ? ['<div class="ig-stories">'].concat(L, ["</div>"]) : [];
  }
  function igFeedHTML(b) {
    var posts = b.msgs.map(function (m) { return igPostHTML(b, m).join("\n"); }).filter(Boolean);
    if (b.type === "igone") return posts.join("\n\n");
    var L = ['<div class="mob ig ig-feed ' + b.theme + (b.width ? " " + b.width : "") + (b.scroll ? " " + b.scroll : "") + '">'];
    if (b.top !== "none") L.push('<p class="ig-header"><span class="ig-add">+</span><span class="ig-logo">Instagram</span><span class="ig-notif ic ic-heart">&#9825;</span>' +
      (b.top === "new" ? '<span class="ig-badge"><span class="hide"> (new)</span></span>' : "") + "</p>");
    return L.concat(igStories(b), posts, ["</div>"]).join("\n");
  }

  // ---------- Instagram DMs ----------

  // the pictures at the top: the other person's, or two overlapping ones for a group (Instagram only shows two).
  // Each one is whoever was picked, or else the next person in the chat.
  function igdmFaces(b) {
    var n = b.group ? 2 : 1, picked = b.faces || [], auto = others(b), f = [];
    for (var i = 0; i < n; i++) {
      var c = char(picked[i]) || auto.filter(function (x) { return f.indexOf(x) < 0 && picked.indexOf(x.id) < 0; })[0];
      if (c && f.indexOf(c) < 0) f.push(c);
    }
    return f;
  }
  // the emojis typed in the Reactions box, one per emoji (an emoji can be more than one character, like ❤️)
  function emojis(v) {
    v = t(v).replace(/\s+/g, "");
    if (window.Intl && Intl.Segmenter) return Array.from(new Intl.Segmenter().segment(v), function (x) { return x.segment; });
    return Array.from(v);
  }
  // reactions on a DM: while everyone used the same emoji, it shows the emoji and up to three faces (then +N);
  // once there's more than one kind, it shows the emojis and how many reacted, with no faces
  function igdmReacts(m, side) {
    var em = emojis(m.waReacts); if (!em.length) return "";
    var kinds = em.filter(function (e, i) { return em.indexOf(e) === i; });
    var who = (m.faces || []).map(char).filter(Boolean), total = t(m.waCount) || (who.length ? String(who.length) : "");
    var inner;
    if (kinds.length === 1 && who.length) {
      var names = who.map(nameOf), list = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
      var more = (+total || who.length) - 3;
      inner = kinds[0] + '<span class="hide"> from ' + esc(list) + " </span>" + who.slice(0, 3).map(function (f) { return circle("ig-pfp", f, null); }).join("") + (more > 0 ? "+" + more : "");
    } else inner = esc(kinds.length === 1 ? kinds[0] : em.join("")) + (total ? " " + esc(total) : "");
    return '<p class="igdm-reacts' + (side === "out" ? " out" : "") + '"><span class="hide">[Reactions: </span>' + inner + '<span class="hide">]</span></p>';
  }
  // what a reply shows of the message it answers
  function igdmQuote(q) {
    var s = plain(q.text).trim() || ((q.photos || []).some(function (p) { return picUrl(p.url) || t(p.desc); }) ? "Photo" : q.hasPost ? "Post" : q.link ? t(q.link.title) || "Link" : "");
    return s.length > 60 ? s.slice(0, 57).trim() + "..." : s;
  }
  // a post shared into the chat, as a card: its picture, then who posted it and the caption
  // a post or reel shared into the chat, as a card: the share and save buttons, the account with its picture,
  // the picture, then the caption. As the faded quote above a reply, it has no buttons and says what's being replied to.
  function igdmPost(m, side, sender, quoted) {
    // a reel is one picture (a still from the video): the skin adds the play button and the reel sign
    var acc = char(m.postBy), u = picUrl(m.postImg || ""), reel = m.postReel;
    var who = acc ? igNameHTML(acc, null) : esc(t(m.postAcc) || "someone");
    var pic = acc ? circle("ig-pfp", acc, null) : '<span class="ig-pfp' + (m.postCol ? " colour" + m.postCol : "") + '">' + esc(t(m.postIni) || (t(m.postAcc) || "s").charAt(0).toUpperCase()) + "</span>";
    var L = [], btns = quoted ? "" : (m.postShare !== false ? '<span class="ic ic-share"></span>' : "") + (m.postSave !== false ? '<span class="ic ic-save"></span>' : "");
    if (btns) L.push('<p class="igdm-post-btns">' + btns + "</p>");
    L.push('<p class="igdm-post-by">' + pic + (quoted ? '<span class="hide">[Replying to a ' + (reel ? "reel" : "post") + " from </span><b>" + who + '</b><span class="hide">]</span>' :
      '<span class="hide"><em>' + esc(sender) + "</em> shared a " + (reel ? "reel" : "post") + " from </span><b>" + who + '</b><span class="hide">:</span>') + "</p>");
    var more = reel ? [] : (m.postMore || []).filter(function (x) { return picUrl(x.url) || t(x.desc); });
    // more than one picture: a carousel, the same as a feed post's
    if (more.length) L = L.concat(igPhotos({ photos: [{ url: u, alt: m.postAlt || "", desc: m.postDesc || "", land: !!m.postLand }].concat(more), shape: "" }));
    else if (u) L.push('<p class="igdm-post-img"><img ' + (m.postLand && !reel ? 'class="landscape" ' : "") + 'src="' + esc(u) + '" alt="' + esc(t(m.postAlt)) + '"></p>');
    else if (t(m.postDesc)) L.push('<p class="igdm-post-img text">[' + esc(t(m.postDesc)) + "]</p>");
    if (t(m.postCap)) L.push('<p class="igdm-post-caption"><b>' + who + "</b> " + fmt(m.postCap) + "</p>");
    return ['<div class="igdm-post ' + (reel ? "reel " : "") + side + (quoted ? " quoted" : "") + '">'].concat(ind(L, 1), ["</div>"]);
  }
  // a link sent in the chat, as a card: the info and share buttons, the page's picture, its title and the website
  // which one thing a DM message shares, if any
  function igdmKind(m) { return m.link ? "link" : m.hasPost ? (m.postReel ? "reel" : "post") : m.shared ? "story" : ""; }
  function igdmLink(m, side, label) {
    var k = m.link, u = picUrl(k.img || ""), L = [];
    var btns = (m.linkInfo !== false ? '<span class="ic ic-info"></span>' : "") + (m.linkShare !== false ? '<span class="ic ic-share"></span>' : "");
    if (btns) L.push('<p class="igdm-post-btns">' + btns + "</p>");
    if (u) L.push('<p class="igdm-link-img"><img src="' + esc(u) + '" alt="' + esc(t(k.alt)) + '"></p>');
    else if (t(k.imgdesc)) L.push('<p class="igdm-link-img text">[' + esc(t(k.imgdesc)) + "]</p>");
    L.push('<p class="igdm-link-title">' + label + esc(t(k.title)) + "</p>");
    L.push('<p class="igdm-link-url">' + esc(t(k.url).replace(/^https?:\/\//, "").replace(/\/.*$/, "")) + "</p>");
    return ['<div class="igdm-link ' + side + '">'].concat(ind(L, 1), ["</div>"]);
  }
  function igdmHTML(b) {
    var o = others(b), head = "";
    if (b.app) head += '<span class="igdm-back"><span class="ic ic-back">&#8592;</span></span><span class="hide"> </span><span class="igdm-calls"><span class="ic ic-phone">&#128222;</span>' +
      '<span class="hide"> </span><span class="ic ic-video">&#127909;</span></span><span class="hide"> </span>';
    var pic = false;
    if (b.headPic !== false) {
      var f = igdmFaces(b); pic = f.length > 0;
      if (f.length === 2) head += '<span class="ig-collab">' + circle("ig-pfp", f[0], null) + circle("ig-pfp", f[1], null) + "</span>";
      else if (f.length) head += circle("ig-pfp", f[0], null);
    }
    // a long name in a chat between two is cut short with "…" to fit on one line at phone width (AO3 won't let the skin do it)
    var full = Array.from(t(b.title) || (b.group ? "Group chat" : o[0] ? igName(o[0]) : "Someone"));
    var room = (b.app ? (pic ? 18 : 25) : pic ? 28 : 34) + (b.tick ? 0 : 2);
    if (!b.group && full.length > room) head += esc(full.slice(0, room - 1).join("") + "…");
    else head += t(b.title) ? esc(t(b.title)) : b.group ? "Group chat" : o[0] ? igNameHTML(o[0], null) : "Someone";
    if (b.tick && !b.group) head += TICK;
    if (b.group && b.chev !== false) head += '<span class="igdm-chev"></span>'; // the little > after a group's name, drawn by the skin
    var L = ['<div class="' + containerClass(b, "igdm") + '">',
      '  <p class="mob-header">' + head + '<span class="hide"> - </span>' + (t(b.sub) ? "<span>" + esc(t(b.sub)) + "</span>" : "") + "</p>",
      '  <div class="mob-body">'];
    // in a group, each run of messages from one person goes in a row: their picture, their name, then the messages.
    // The name is just above the first one, so only the ones after it need the hidden name.
    var body = [], row = null;
    function close() { if (row) body = body.concat(['<div class="igdm-row">'], ind(row.lines, 1), ["</div>"]); row = null; }
    // names in a group are usernames, and in a chat between two they're the names typed in the cast
    function nm(x) { return b.group ? igName(x) : nameOf(x); }
    b.msgs.forEach(function (m) {
      if (m.from === "sys") { close(); body.push('<p class="mob-sys">' + fmt(m.text) + "</p>"); return; }
      if (m.from === "typing") {
        // typing dots: a message from whoever is typing, so in a group they go in that person's row
        var tc = typer(b, m); if (!tc) return;
        var tOut = tc.id === b.pov, tg = b.group && !tOut;
        if (!tg || (row && row.from !== tc.id)) close();
        if (tg && !row) row = { from: tc.id, first: true, lines: (b.pics !== false ? [circle("ig-pfp", tc, null)] : []).concat(['<p class="who">' + igNameHTML(tc, null) + '<span class="hide">:</span></p>']) };
        if (tg) row.first = false;
        (tg ? row.lines : body).push('<p class="msg ' + (tOut ? "out" : "in") + ' typing-indicator"><span class="hide">' + typingHide(tc, true) + "</span><span></span><span></span><span></span></p>");
        return;
      }
      var c = char(m.from); if (!c) return;
      var out = m.from === b.pov, grouped = b.group && !out, side = out ? "out" : "in";
      var q = m.replyTo && b.msgs.filter(function (x) { return x.id === m.replyTo && char(x.from); })[0];
      if (!grouped || (row && row.from !== m.from)) close();
      if (grouped && !row) {
        row = { from: m.from, first: true, lines: b.pics !== false ? [circle("ig-pfp", c, null)] : [] };
        // a reply's "replied to" line takes the place of the name line
        if (!q) row.lines.push('<p class="who">' + igNameHTML(c, null) + '<span class="hide">:</span></p>');
      }
      var to = grouped ? row.lines : body;
      if (q && q.hasPost) {
        // a reply to a shared post: "You replied" or "Shane replied", then the card itself, faded
        to.push('<p class="igdm-replied ' + side + '">' + (out ? "You" : esc(nm(c))) + " replied" + (grouped && row.first ? '<span class="hide">:</span>' : "") + "</p>");
        igdmPost(q, side, "", true).forEach(function (l) { to.push(l); });
      } else if (q) {
        var mine = q.from === b.pov;
        var said = out ? (mine ? "You replied to yourself" : "You replied to " + nm(char(q.from))) :
          mine ? nm(c) + " replied to you" : q.from === m.from ? nm(c) + " replied to themself" : nm(c) + " replied to " + nm(char(q.from));
        to.push('<p class="igdm-replied ' + side + '">' + esc(said) + (grouped && row.first ? '<span class="hide">:</span>' : "") + "</p>",
          '<p class="igdm-quote ' + side + (mine ? " mine" : "") + '"><span class="hide">[Replying to: </span>' + esc(igdmQuote(q)) + '<span class="hide">]</span></p>');
      }
      // the hidden name: not on the first message under a name in a group, as the name is just above it
      function label() { var l = grouped ? (row.first ? "" : hideLabel(igName(c))) : hideLabel(nameOf(c)); if (grouped) row.first = false; return l; }
      // the bubbles: photos, then a shared post card, then the words. Reactions go on the last one.
      var parts = [];
      var pics = shownPhotos(m);
      if (pics.length) parts.push(["gallery"]);
      if (m.hasPost) parts.push(["post"]);
      if (m.link) parts.push(["link"]);
      // a shared story: the story in an outlined box, then the words sent with it (work saved before had only the box, in the text)
      var story = m.shared ? (m.storyText === undefined ? m.text : m.storyText) : "", said = m.shared && m.storyText === undefined ? "" : m.text;
      if (t(story)) parts.push(["igdm-shared" + (out ? " mine" : ""), fmt(story)]); // the phone owner's story box goes on the right
      if (t(said)) parts.push(["msg " + side, fmt(said)]);
      // the reactions pill is a line of its own, straight after the last bubble (or card)
      var rx = igdmReacts(m, side), last = -1;
      parts.forEach(function (x, i) { if (x[0].indexOf("igdm-shared") < 0) last = i; });
      parts.forEach(function (x, i) {
        if (x[0] === "link") igdmLink(m, side, label()).forEach(function (l) { to.push(l); });
        else if (x[0] === "gallery") chatGallery("igdm", "msg " + side + " gallery", label(), pics).forEach(function (l) { to.push(l); });
        else if (x[0] === "post") { label(); igdmPost(m, side, grouped ? igName(c) : nameOf(c)).forEach(function (l) { to.push(l); }); }
        else to.push('<p class="' + x[0] + '">' + label() + x[1] + "</p>");
        if (i === last && rx) to.push(rx);
      });
      if (t(m.status)) to.push('<p class="igdm-status">' + esc(t(m.status)) + "</p>");
    });
    close();
    L = L.concat(ind(body, 2));
    L.push("  </div>");
    if (b.bar === "empty" || b.bar === "typed") L.push('  <p class="igdm-footer"><span class="igdm-cam ic ic-camera">&#128247;</span><span class="hide"> </span><span class="igdm-field' + (b.bar === "typed" ? " typed\">" + fmt(b.barText) + (b.cursor ? CURSOR : "") : '">Message...') +
      '<span class="hide"> </span><span class="ic ic-mic">&#127908;</span></span></p>');
    L.push("</div>");
    return L.join("\n");
  }

  // ---------- Twitter/X posts ----------

  var POLL_SIZES = [0, 10, 20, 25, 30, 33, 40, 50, 60, 67, 70, 75, 80, 90, 100];
  function twText(text) {
    // hashtags and @mentions go blue, and a new line in the box is a new line in the tweet
    return fmt(t(text)).replace(/(^|[\s(])([#@][A-Za-z0-9_]+)/g, '$1<span class="tw-link">$2</span>').replace(/\n/g, "<br>");
  }
  // the fan account mask: ticked by hand, or (for work saved before the tick box) when the line says Fan account
  function fanMask(m) { return m.fanMask === undefined ? /^fan account$/i.test(t(m.fan)) : !!m.fanMask; }
  // the poll's options, one per line, with a percentage at the end once there are results
  function pollOpts(m) {
    return t(m.poll).split(/\n/).map(t).filter(Boolean).map(function (line) {
      var p = line.match(/^(.*?)\s+(\d{1,3}(?:\.\d+)?)\s*%$/);
      return p ? { text: p[1], pct: +p[2] } : { text: line, pct: null };
    });
  }
  // the reader-picks poll: for each option they might pick, the percentages they then see
  // (m.pollPick[i][j] is option j's percentage once option i is picked; empty uses the poll's own)
  function pickPcts(m, opts, i) {
    var row = (m.pollPick || [])[i] || [];
    return opts.map(function (o, j) { var v = t(row[j]).replace(/%$/, ""); return /^\d{1,3}(\.\d+)?$/.test(v) ? +v : o.pct || 0; });
  }
  function pollResults(opts, pcts, tap, vote, tick) {
    var top = Math.max.apply(null, pcts), won = false;
    return opts.map(function (o, i) {
      var pct = pcts[i], size = POLL_SIZES.reduce(function (a, b) { return Math.abs(b - pct) < Math.abs(a - pct) ? b : a; });
      var win = !tap && !won && pct === top; if (win) won = true;
      var voted = (tap || tick) && i === vote ? '<span class="hide"> - voted </span><span class="tw-voted">&#10003;</span>' : "";
      return '<p class="tw-opt results' + (win ? " win" : "") + " p" + size + '"><span class="tw-bar">' + esc(o.text) + voted + '</span><span class="hide"> </span><span class="tw-pct">' + pct + "%</span></p>";
    });
  }
  function pollKind(m) {
    if (!m.pollKind) m.pollKind = m.pollTap ? "tap" : pollOpts(m).some(function (o) { return o.pct !== null; }) ? "results" : "open";
    return m.pollKind;
  }
  function twPoll(m) {
    var opts = pollOpts(m);
    if (!opts.length) return [];
    var kind = pollKind(m), done = kind !== "open", tap = kind === "tap";
    var res = pollResults(opts, opts.map(function (o) { return o.pct || 0; }), tap, +(m.pollVote || 0));
    if (kind === "results" && m.pollShowVote) res = pollResults(opts, opts.map(function (o) { return o.pct || 0; }), false, +(m.pollVoted || 0), true);
    var info = t(m.pollinfo);
    if (!done) return opts.map(function (o) { return '<p class="tw-opt">' + esc(o.text) + "</p>"; }).concat(info ? ['<p class="tw-pollinfo">' + esc(info) + "</p>"] : []);
    if (!tap) return res.concat(info ? ['<p class="tw-pollinfo">' + esc(info) + "</p>"] : []);
    var after = info ? ['<p class="tw-pollinfo">' + esc(info.replace(/\d[\d,]*/, bumpCount)) + "</p>"] : [];
    if (m.pollVote === "pick") {
      // the reader picks: each option opens its own copy of the results, with the tick on it
      var L = ['<div class="tw-poll">'];
      opts.forEach(function (o, i) {
        L.push('<details class="tw-pick">', '  <summary class="tw-opt">' + esc(o.text) + "</summary>", '  <div class="tw-results">');
        var own = t((m.pollPickInfo || [])[i]);
        L = L.concat(ind(pollResults(opts, pickPcts(m, opts, i), true, i).concat(own ? ['<p class="tw-pollinfo">' + esc(own) + "</p>"] : after), 2));
        L.push("  </div>", "</details>");
      });
      return L.concat(info ? ['<p class="tw-pollinfo">' + esc(info) + "</p>"] : []).concat(["</div>"]);
    }
    // tappable: the open poll first, and tapping it shows the results with one more vote
    return ['<details class="tw-vote">', "<summary>"].concat(opts.map(function (o) { return '  <span class="tw-opt">' + esc(o.text) + "</span>"; }))
      .concat(info ? ['  <span class="tw-pollinfo">' + esc(info) + "</span>"] : []).concat(["</summary>"]).concat(ind(res, 1))
      .concat(ind(after, 1)).concat(["</details>"]);
  }
  function twMedia(m, video, pics) {
    var v = video ? picUrl(m.vUrl) : "";
    if (v) return ['<div class="tw-photos video"><iframe src="' + esc(v) + '" frameborder="0" title="' + esc(t(m.vTitle) || "Video") + '"></iframe>' +
      (t(m.vDesc) ? '<p class="vid-desc">[' + esc(t(m.vDesc)) + "]</p>" : "") + "</div>"];
    var ph = pics ? (m.photos || []).filter(function (p) { return picUrl(p.url) || t(p.desc); }).slice(0, 4) : [];
    if (!ph.length) return [];
    function img(p) { return '<img ' + (p.land ? 'class="landscape" ' : "") + 'src="' + esc(picUrl(p.url)) + '" alt="' + esc(p.alt) + '">'; }
    if (ph.length === 1) return ['<p class="tw-photos">' + (picUrl(ph[0].url) ? img(ph[0]) : "<span>[" + esc(t(ph[0].desc)) + "]</span>") + "</p>"];
    return ['<p class="tw-photos ' + ["two", "three", "four"][ph.length - 2] + '">'].concat(ph.map(function (p) {
      return '  <span class="tw-photo">' + (picUrl(p.url) ? img(p) : '<span class="tw-desc">[' + esc(t(p.desc)) + "]</span>") + "</span>";
    })).concat(["</p>"]);
  }
  // the row of buttons: replies, reposts, likes, views, bookmark and share
  function twStats(b, m) {
    var old = b.era === "tw2020";
    function stat(cls, icon, code, n, one, many) {
      return '  <p class="tw-stat' + cls + '"><span class="ic ic-tw-' + icon + '">&#' + code + ";</span>" +
        (t(n) ? " " + esc(t(n)) + '<span class="hide"> ' + plural(n, one, many) + "</span>" : "") + "</p>";
    }
    var L = ['<div class="tw-stats">', stat("", "reply", 9993, m.replies, "reply", "replies")];
    if (m.locked || m.noRepost) L.push(stat(" locked", "repost", 8644, ""));
    else L.push(stat(m.reposted ? " reposted" : "", "repost", 8644, m.reposts, old ? "retweet" : "repost", old ? "retweets" : "reposts"));
    // a like readers can click goes up by one, and turns red
    if (m.likeClick) L.push('  <details class="tw-stat tw-tog"' + (m.liked ? " open" : "") + '><summary><span class="ic ic-tw-like">&#9825;</span><span class="off">' +
      (t(m.likes) ? " " + esc(t(m.likes)) : "") + '</span><span class="hide"> likes (</span><span class="on"> ' + esc(bumpCount(m.likes)) + '</span><span class="hide"> once liked)</span></summary></details>');
    else L.push(stat(m.liked ? " liked" : "", "like", 9825, m.likes, "like", "likes"));
    if (!old && t(m.views) !== "-") L.push(stat("", "views", 128202, m.views, "view", "views"));
    // a bookmark readers can click turns blue
    if (!old && m.saveClick) L.push('  <details class="tw-stat tw-end tw-tog"' + (m.saved ? " open" : "") + '><summary><span class="ic ic-tw-bookmark">&#128278;</span><span class="hide"> Bookmark</span></summary></details>');
    else if (!old) L.push(stat(" tw-end" + (m.saved ? " saved" : ""), "bookmark", 128278, ""));
    L.push(stat(" tw-end", "share", 8679, ""));
    return L.concat(["</div>"]);
  }
  // one tweet: kind is "feed" (on its own), "main" (top of a thread) or "reply"
  // the extras ticked on a tweet: [tick box, label]. Older tweets with no tick saved go by what's filled in
  var TW_ADDS = [["hasPoll", "Poll"], ["hasQuote", "Quote tweet"], ["hasNote", "Community note"], ["hasPics", "Pictures"], ["hasVideo", "Video"]];
  function has(m, k) {
    if (m[k] !== undefined) return !!m[k];
    if (k === "hasPoll") return !!t(m.poll);
    if (k === "hasQuote") return !!(t(m.qText) || t(m.qName));
    if (k === "hasNote") return !!t(m.note);
    if (k === "hasPics") return (m.photos || []).length > 0;
    return !!t(m.vUrl);
  }
  function tweetHTML(b, m, kind) {
    var c = char(m.from); if (!c) return [];
    var a = accOf(c, m.acc, "tw"), L = [];
    if (kind === "reply") {
      // replying to someone further up the thread: by default, whoever posted the tweet just above
      var i = b.msgs.indexOf(m), above = b.msgs.slice(0, i).filter(function (x) { return char(x.from); });
      var to = above.filter(function (x) { return x.from === m.replyTo; }).pop() || above[above.length - 1], qc = to && char(to.from);
      if (qc) L.push('<p class="tw-replying">Replying to <span class="tw-link">@' + esc(twHandle(qc, accOf(qc, to.acc, "tw"))) + "</span></p>");
    }
    // a typed name sits in its own span, so a long one ends in "..."
    L.push('<p class="tw-top">' + circle("tw-pfp", c, a) + '<span class="hide"> </span><span class="tw-name">' + (isProfile(c) ? twNameHTML(c, a) : "<span>" + esc(nameOf(c)) + "</span>") +
      (m.verified ? ' <span class="tw-tick ic ic-verified">&#10004;</span>' : "") + '</span> <span class="tw-handle">' + twHandleHTML(c, a) + "</span>" +
      (m.locked ? ' <span class="tw-lock ic ic-tw-lock">&#128274;</span>' : "") + (t(m.time) ? ' <span class="tw-time">· ' + esc(t(m.time)) + "</span>" : "") +
      (t(m.fan) ? ' <span class="tw-fan">' + (fanMask(m) ? '<span class="ic ic-tw-fan">&#127917;</span> ' : "") + esc(t(m.fan)) + "</span>" : "") + "</p>");
    if (t(m.label)) L.push('<p class="tw-label">' + esc(t(m.label)) + "</p>");
    if (t(m.text)) L.push((kind === "reply" ? "<p>" : '<p class="tw-text">') + twText(m.text) + "</p>");
    if (has(m, "hasPoll")) L = L.concat(twPoll(m));
    if (has(m, "hasVideo") || has(m, "hasPics")) L = L.concat(twMedia(m, has(m, "hasVideo"), has(m, "hasPics")));
    if (m.warn && has(m, "hasPics")) L.push('<p class="tw-warn"><b>Content warning: Sensitive content</b><br>The Tweet author flagged this Tweet as showing sensitive content.</p>');
    if (has(m, "hasQuote") && (t(m.qText) || t(m.qName))) L.push('<p class="tw-quote"><b>' + esc(t(m.qName)) + "</b>" + (noAt(m.qHandle) ? ' <span class="tw-handle">@' + esc(noAt(m.qHandle)) + "</span>" : "") + "<br>" + fmt(m.qText) + "</p>");
    if (has(m, "hasNote") && t(m.note)) L.push('<p class="tw-note">' + esc(t(m.note)) + "</p>");
    if (t(m.date)) L.push('<p class="tw-date">' + esc(t(m.date)) + "</p>");
    L = L.concat(twStats(b, m));
    var open = kind === "feed" && !b.app ? '<div class="mob tw ' + b.theme + (b.width ? " " + b.width : "") + (b.scroll ? " " + b.scroll : "") + '">' : kind === "reply" ? '<div class="mob tw-reply">' : '<div class="mob tw">';
    return [open].concat(ind(L, 1)).concat(["</div>"]);
  }
  function twFeedHTML(b) {
    var tweets = b.msgs.map(function (m) { return tweetHTML(b, m, "feed").join("\n"); }).filter(Boolean);
    if (b.type === "twone") return tweets.join("\n\n"); // each tweet in its own box, not in a feed
    // the X app screen: the pov character's picture and the logo, then the tabs, then the tweets
    var me = char(b.pov) || S.cast[0], old = b.era === "tw2020";
    var L = ['<div class="tw-feed app' + (old ? " tw2020" : "") + " " + b.theme + (b.width ? " " + b.width : "") + (b.scroll ? " " + b.scroll : "") + '">', '  <div class="tw-scroll">',
      '  <p class="tw-header">' + (me ? circle("tw-me", me) + " " : "") + '<span class="tw-logo">' + (old ? "Twitter" : "X") + "</span></p>"];
    if (!old) L.push('  <p class="tw-tabs"><span class="tw-tab on">For you<span class="tw-drop"></span></span> <span class="tw-tab">Following</span>' +
      t(b.tabs).split(/\n/).map(t).filter(Boolean).map(function (x) { return ' <span class="tw-tab">' + esc(x) + "</span>"; }).join("") + ' <span class="tw-add">+</span></p>');
    return L.concat(ind(tweets.join("\n\n").split("\n"), 1)).concat(["  </div>", "</div>"]).join("\n").replace(/\n  \n/g, "\n\n");
  }
  function twThreadHTML(b) {
    var L = ['<div class="tw-feed' + (b.era === "tw2020" ? " tw2020" : "") + " " + b.theme + (b.width ? " " + b.width : "") + (b.scroll ? " " + b.scroll : "") + '">', '  <div class="tw-scroll">'];
    b.msgs.forEach(function (m, i) { L = L.concat(ind(tweetHTML(b, m, i ? "reply" : "main"), 2)); });
    L.push("  </div>");
    if (b.bar !== "none") L.push('  <p class="tw-reply-bar"><span>Reply</span><span class="hide"> - </span>Tweet your reply</p>');
    L.push("</div>");
    return L.join("\n");
  }

  function bumpCount(v) {
    // one more like, keeping the commas: 2,431 becomes 2,432
    var n = t(v).replace(/,/g, "") || "0";
    if (!/^\d+$/.test(n)) return t(v); // 2.6k and so on stay as they are
    return String(+n + 1).replace(/\B(?=(\d{3})+(?!\d))/g, t(v).indexOf(",") >= 0 ? "," : "");
  }
  function allHTML() {
    tlCount = 0;
    return S.blocks.map(blockHTML).filter(Boolean).join("\n\n");
  }
  function profileData(c) {
    var p = c.prof;
    return { name: c.name, slug: p.slug || c.name, pic: p.pic, piccol: p.piccol, namecol: p.namecol, handle: p.handle,
      email: p.email, apps: p.apps, dccol: p.dccolon ? p.dccol : "", tbsq: p.tbsq, saved: p.saved, accounts: p.accounts,
      wallcol: p.wallcolon ? p.wallcol : "", wallcolDefault: p.wallcol, wallpic: p.wallpic };
  }
  // an existing profile is only copied out if it's been changed
  function changed(c) { return c.kind === "example" && !!c.orig && c.orig !== JSON.stringify(profileData(c)); }
  function profilesCSS() {
    return S.cast.filter(function (c) { return c.kind === "new" || changed(c); }).map(function (c) { return MP.css(profileData(c)).css; }).join("\n\n");
  }

  // ---------- editor ----------

  function get(path) { return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, S); }
  function set(path, v) {
    var ks = path.split("."), last = ks.pop();
    var o = ks.reduce(function (o, k) { return o[k]; }, S);
    o[last] = v;
  }
  // help under each box, shown when Help text is pressed (tutorial.js and tutorial.css).
  // Paths are written with N for any number. Each one shows once, by the first box it fits.
  // A message row's first box has its own help for date or notice lines (:sys) and typing lines (:typing).
  var PIC = "Upload the picture somewhere like squidge.org first, then copy the link to the picture itself (it usually ends in .jpg or .png) and paste it here.";
  var ALT = "A few words saying what's in the picture. Screen readers read this out for anyone who can't see it.";
  var HELP = {
    "cast.N.name": "The character's name, the way you want it to show in the chats.",
    "cast.N.kind": "'One-off' is the quickest: they just get a coloured circle. Pick 'New profile' if they turn up in lots of chats or apps, so they look the same everywhere. 'Edit an existing profile' uses one of the tutorial's example characters, or a profile you've added through the CSS upload.",
    "cast.N.colour": "The colour of their circle, which shows their initials. If you add a picture link below, the picture is used instead.",
    "cast.N.showInitials": "The letters in the coloured circle. Leave the box empty to use the first letter of their name, or untick it for an empty circle. A picture link replaces the circle and its letters.",
    "cast.N.pic": "Optional. A picture replaces the coloured circle and initials as their profile picture, so the colour and initials above won't show. " + PIC,
    "cast.N.alt": ALT,
    "cast.N.land": "Tick this if the picture is wider than it is tall, so it isn't squashed.",
    "cast.N.num": "Only for WhatsApp. Someone who isn't saved in the phone shows as a phone number instead of a name. Leave it empty otherwise.",
    "cast.N.example": "Pick which profile to use. Your own profiles (from the profile CSS box) come first, then the skin's examples, marked '(example)'.",
    "ownOnly": "Takes the skin's example profiles, like 'Ilya (example)', out of the 'Which one' lists, so you only pick from the profiles in your profile CSS box.",
    "cast.N.prof.slug": "A short label for this profile that the skin uses to find it. Small letters, numbers and dashes only, no spaces. It's filled in from the name for you.",
    "cast.N.prof.pic": "A picture for their circle in every app. " + PIC,
    "cast.N.prof.piccol": "The circle's colour when there's no picture, or while the picture loads.",
    "cast.N.prof.namecol": "The colour of their name in WhatsApp groups and on Discord.",
    "cast.N.prof.handle": "Their username on apps like Instagram and Tumblr, without the @.",
    "cast.N.prof.email": "Their email address, for the email apps. It doesn't have to be real.",
    "cast.N.prof.saved.N.as": "What they're saved as on someone else's phone, like 'Mum' or a nickname. Pick whose phone first. For someone who isn't in the cast yet, pick 'New person', type their name and press 'Add them': they get a new profile, which goes in the profile CSS.",
    "cast.N.prof.accounts.N.acc": "A short label for the extra account, like 'burner' or 'work'. Small letters and dashes only. Then pick the app and fill in only what's different.",
    "cast.N.prof.wallcolon": "Tick this to colour the background of WhatsApp chats on their phone, then pick the colour.",
    "cast.N.prof.wallpic": "Or a picture for the background instead. " + PIC,
    "blocks.N.pov": "Whose phone we're looking at. Their messages go on the right, and everyone else's go on the left.",
    "blocks.N.group": "Tick this for a group chat. Everyone's name shows by their messages.",
    "blocks.N.title": "The name at the very top. In a chat between two people, it's the other person's name. In a group, it's the group's name.",
    "blocks.N.sub": "The small line under the name. Delete it if you don't want one.",
    "blocks.N.theme": "A light or dark phone. 'Auto' follows the reader's own light or dark setting.",
    "blocks.N.width": "'Phone width' looks like a phone. 'Full width' fills the page.",
    "blocks.N.scroll": "For a long chat. 'Scroll inside the phone' keeps it phone-sized and readers scroll the messages. 'Show it all' makes the phone as long as the chat.",
        "blocks.N.scroll:tw": "Once it's taller than a phone screen, it scrolls inside its box. 'Show it all' makes the box as long as it needs to be.",
    "blocks.N.header": "'Simple' shows the name. 'With picture and icons' adds their picture and the call buttons, like the real app. 'None' leaves the top off, for when a chat carries on after a bit of story.",
    "blocks.N.bg": "What's behind the messages. 'Default' is WhatsApp's own wallpaper, or the wallpaper the phone owner has in their profile if they have one. The colours and gradients come with the skin. 'Custom picture' lets you link your own picture for just this chat.",
    "blocks.N.wall": PIC,
    "blocks.N.bar": "The box at the bottom where you'd type. 'Empty' shows it with nothing in it. 'Something half-typed' shows a message the phone owner hasn't sent yet.",
    "blocks.N.barText": "What the phone owner is halfway through typing.",
    "blocks.N.cursor": "Adds a flashing line at the end of the half-typed message, as if the phone owner is still typing it.",
    "blocks.N.gp.from": "Use a profile's picture for the group, so the same group can have the same picture in every chat and every fic. Make it in the Profile Maker like a person, or paste one in. Pick 'No, set one up here' to make a one-off picture just for this chat.",
    "blocks.N.gp.colour": "The group's picture works just like a character's: a coloured circle with letters in it, or a picture link, which replaces the circle and letters.",
    "blocks.N.script": "The quickest way to add messages. Put each message on its own line: the name, a colon, then the message, like 'Ilya: are you awake'. Then press 'Add these messages', and they're added to the list above.",
    "blocks.N.msgs.N.from:sys": "Date or notice lines are the small lines in the middle of the chat. The second box is what the line says, like 'Today 11:48 PM' or 'Lily left the group'. The buttons: the arrows move the line, + adds a new message under it, and &times; deletes it. To turn it into a message, change the first box to a character.",
    "blocks.N.msgs.N.from:typing": "Typing dots show someone is typing: three dots in a bubble, the same as their messages. The second box chooses who is typing. Pick the phone owner to put the dots on their side, halfway through writing something. The buttons: the arrows move the dots, + adds a new message under them, and &times; deletes them. To turn it into a message, change the first box to a character.",
    "blocks.N.msgs.N.from": "The first box chooses who wrote the message, from the cast list above. You can also change it to a date or notice line, or 'Typing dots'. The second box is the message itself: type it just like you'd send it. In WhatsApp, the third box is the time on the message, like '09:15'. The buttons: 'Extras' has more options (pictures, reactions and more), the arrows move the message, + adds a new message under it, and &times; deletes it.",
    "blocks.N.msgs.N.reacts.N.emoji": "The little emoji on the corner of a bubble. Pick who reacted, and type one emoji.",
    "blocks.N.msgs.N.status": "Small words under the message, like 'Delivered' or 'Read 11:52 PM'. Usually only on the phone owner's last message.",
    "blocks.N.msgs.N.tick": "The little ticks on messages the phone owner sends. Pick 'None' and leave the time empty to have nothing under the message.",
    "blocks.N.msgs.N.replyTo": "Pick an earlier message to show it quoted above this one, as a reply.",
    "blocks.N.msgs.N.waReacts": "Emoji reactions under the bubble, with a space between each one. 'Count' is how many people reacted, if it's more than one.",
    "blocks.N.msgs.N.link.url": "A link preview is the little card that shows up when you send a link. Fill in what the card should say. The link doesn't have to work.",
    "blocks.N.msgs.N.edited": "Adds the small word 'Edited' to the message.",
    "blocks.N.msgs.N.photos.N.url": "A picture in the message. " + PIC,
    "blocks.N.msgs.N.photos.N.alt": ALT,
    "blocks.N.msgs.N.photos.N.desc": "No picture? Describe it here instead, and the words show where the picture would be.",
    // Twitter/X blocks have their own help (helpKind "tw")
    "blocks.N.theme:tw": "A light or dark look. 'Auto' follows the reader's own light or dark setting.",
    "blocks.N.width:tw": "'Phone width' looks like a phone. 'Full width' fills the page.",
    "blocks.N.bar:tw": "The 'Tweet your reply' box under the last reply.",
    "blocks.N.era:tw": "'X' is how it looks now. 'Twitter' is the 2020 look, with the blue bird, 'Retweets' instead of 'Reposts', and no views.",
    "blocks.N.pov:tw": "Whose phone it is. Their picture goes in the top corner.",
    "blocks.N.tabs:tw": "The tabs along the top are 'For you' and 'Following'. Add any communities after them, one per line.",
    "blocks.N.script:tw": "The quickest way to add tweets. Put each tweet on its own line: the name, a colon, then the tweet, like 'Zim: Reminder to everyone...'. Then press 'Add these tweets', and they're added to the list above.",
    "blocks.N.msgs.N.from:tw": "The first box chooses who posted it, from the cast list above. The second box is how long ago, like '2h', '5m' or 'Jan 3', and the big box underneath is the tweet itself (#hashtags and @mentions turn blue by themselves). 'Extras' has more options. The buttons let you reorder, insert a new post underneath, and delete each post.",
    "blocks.N.msgs.N.replyTo:tw": "Who this reply answers. It shows as 'Replying to @them' above the reply.",
    "blocks.N.msgs.N.acc:tw": "If this character has more than one Twitter/X account in their profile, pick which one posted this.",
    "blocks.N.msgs.N.replies:tw": "The numbers on the buttons under the tweet. Leave a number empty and the button shows with no number.",
    "blocks.N.msgs.N.hasPoll:tw": "Tick any of these to add it to the tweet, and its boxes open up underneath.",
    "blocks.N.msgs.N.pollKind:tw": "'Still open' shows just the options in blue outlines. 'Finished' shows the results, with the winner in blue. 'Tappable' starts open, and readers tap it to vote and see the results, with one more vote. 'Finished' and 'Tappable' need the percentages.",
    "blocks.N.msgs.N.pollVote:tw": "Which option gets the vote and the tick. Pick 'Whichever one the reader picks' to let the reader choose, then set what the results say after each choice.",
    "blocks.N.msgs.N.qName:tw": "Another tweet shown inside this one, in a box. Fill in who posted it and what it said.",
    "blocks.N.msgs.N.note:tw": "A community note: the box under a tweet that adds context, starting 'Readers added context'.",
    "blocks.N.msgs.N.photos.N.url:tw": "A picture in the tweet. " + PIC,
    "blocks.N.msgs.N.photos.N.alt:tw": ALT,
    "blocks.N.msgs.N.photos.N.desc:tw": "No picture? Describe it here instead, and the words show where the picture would be.",
    "blocks.N.msgs.N.vUrl:tw": "A video in the tweet. Paste an embed link from Vimeo, YouTube or the Internet Archive, then give it a title and describe it for readers who can't play it.",
    "cast.N.prof.tbsq": "Tumblr pictures are round by default. Tick this for a square with rounded corners instead, like some Tumblr blogs.",
    "cast.N.prof.accounts.N.sq": "Tumblr pictures are round by default. Tick this for a square with rounded corners on this account instead.",
    "cast.N.prof.dccolon": "On Discord, names are coloured by the server's roles. Tick this to give them a different name colour there, then pick the colour.",
    "blocks.N.pics": "In a group chat, puts each person's round picture beside the first of their messages, like the real app.",
    "blocks.N.gp.land": "Tick this if the picture is wider than it is tall, so it isn't squashed in the circle.",
    "blocks.N.msgs.N.sms": "Turns the bubble green, like a text sent to someone without an iPhone. Only for the phone owner's messages.",
    "blocks.N.msgs.N.big": "For a message that's just an emoji or two: shows them big, with no bubble behind them.",
    "blocks.N.msgs.N.link.showUrl": "Shows the web address as its own line above the preview card, like when you paste a link and send it.",
    "blocks.N.msgs.N.photos.N.land": "Tick this if the picture is wider than it is tall, so it isn't squashed.",
    "blocks.N.msgs.N.link.land": "Tick this if the picture is wider than it is tall, so it isn't squashed.",
    "blocks.N.msgs.N.nameAs": "Leave it empty to show their username. A name too long to fit on one line at phone width is cut short with \"…\" for you, the way the app does.",
    "blocks.N.msgs.N.verified:tw": "The blue tick after the name, for a verified account.",
    "blocks.N.msgs.N.locked:tw": "A padlock after the name, for an account only its followers can see. Private tweets can't be reposted, so the repost button fades out.",
    "blocks.N.msgs.N.fan:tw": "A small grey line under the name, like a label the account gives itself. Tick 'Fan account mask' to put the theatre mask before it, the way X marks fan accounts.",
    "blocks.N.msgs.N.fanMask:tw": "The little theatre mask X puts before 'Fan account'. Only tick it when the grey line says 'Fan account'.",
    "blocks.N.msgs.N.label:tw": "A small grey line above the tweet, like 'Promoted', or 'Only people in @name's Twitter Circle can see this Tweet'.",
    "blocks.N.msgs.N.reposted:tw": "Turns the repost button green, as if the phone owner has reposted it.",
    "blocks.N.msgs.N.noRepost:tw": "Fades out the repost button, like on a Twitter Circle tweet, which can't be reposted.",
    "blocks.N.msgs.N.likeClick:tw": "Readers can click the heart to like the tweet: it turns red and the number goes up by one.",
    "blocks.N.msgs.N.liked:tw": "Shows the heart already red, as if the phone owner has liked it. If readers can click it, a click un-likes it.",
    "blocks.N.msgs.N.views:tw": "The number of views at the end of the row of buttons, like '71K' or '0'. Leave it empty for the views button with no number, or type a dash '-' to leave the views button out.",
    "blocks.N.msgs.N.saveClick:tw": "Readers can click the bookmark button to save the tweet, and it turns blue.",
    "blocks.N.msgs.N.saved:tw": "Turns the bookmark button blue, as if the phone owner has saved the tweet.",
    "blocks.N.msgs.N.date:tw": "The small grey line at the bottom of the tweet. A tweet opened on its own usually shows the exact time and date here, like '8:23 AM · 11 May 23', but you can put any words you like. Leave it empty for a reply or a tweet on a feed, so it looks real.",
    "blocks.N.msgs.N.poll:tw": "One option per line. For a finished or tappable poll, put the percentage after each one, like 'Montreal 58%' or 'Boston 3.2%'. The bar is drawn at the nearest size the skin has.",
    "blocks.N.msgs.N.pollShowVote:tw": "Puts a tick on the option this account voted for. Pick the option underneath.",
    "blocks.N.msgs.N.warn:tw": "Hides the pictures behind a grey 'Sensitive content' warning, which readers click to see them.",
    "blocks.N.msgs.N.pollPick.N.N:tw": "Each option the reader might pick gets its own copy of the results, so they don't have to match. Make their pick always win, always lose, end in a draw, or anything else. Decimals like '3.2' work too.",
    "blocks.N.msgs.N.pollPickInfo.N:tw": "The votes line under this pick's results. Leave it empty to use the line under the poll, with one more vote.",
    // Twitter/X DMs (helpKind "dm"; anything not here uses the chat help)
    "blocks.N.title:dm": "The name at the top, under the picture. In a chat between two people, it's the other person's name. In a group, it's the group's name.",
    "blocks.N.nav:dm": "The row of X buttons along the very bottom of the app, with the chat button picked.",
    "blocks.N.badge:dm": "The number in the blue circle on the bell, for new notifications. Leave it empty for none.",
    "blocks.N.msgs.N.from:dm": "The first box chooses who wrote the message, from the cast list above. You can also change it to a date or notice line. The big box is the message. 'Extras' has replies, reactions, Seen or Sent, voice messages and pictures.",
    "blocks.N.msgs.N.replyTo:dm": "Pick an earlier message to reply to it. It shows 'Replied to' and the name, then that message in an outlined bubble, above this one.",
    "blocks.N.msgs.N.waReacts:dm": "Emoji reactions under the bubble, then how many, like '😂 1' or '👍 😂 3'.",
    "blocks.N.msgs.N.status:dm": "The small word under the phone owner's last message: 'Sent', or 'Seen' once the other person has read it.",
    "blocks.N.msgs.N.voice:dm": "Adds a voice message bubble, with a play button and sound bars. Type how long it is, like '0:02'.",
    "blocks.N.msgs.N.fwd": "Puts a small grey 'Forwarded' label with an arrow at the top of the bubble, as if this message was passed on from another chat.",
    "blocks.N.msgs.N.call": "Turns the message into a call bubble, with a round phone or video icon. Its arrow shows who rang: out for the phone owner's calls, in for someone else's. The message words aren't used.",
    "blocks.N.msgs.N.missed": "A red icon and 'Missed voice call' or 'Missed video call', with 'Tap to call back' instead of how long it lasted.",
    "blocks.N.msgs.N.callLen": "How long the call lasted, like '44 secs', '1 min' or '1 hr'.",
    // Instagram DMs (helpKind "igdm"; anything not here uses the chat help)
    "blocks.N.group:igdm": "Tick this for a group chat. Each run of messages from one person gets their name above it and their picture beside it.",
    "blocks.N.pics:igdm": "In a group, puts each person's round picture beside the last of their messages in a row, like the real app.",
    "blocks.N.app:igdm": "Adds the back arrow and the call buttons at the top, like the real app. Pick a message bar too, to finish it off.",
    "blocks.N.headPic:igdm": "Puts a round picture before the name at the top. A group gets two, overlapping, like Instagram does.",
    "blocks.N.title:igdm": "The name at the top. In a chat between two people, leave it empty to use the other person's username. In a group, it's the group's name.",
    "blocks.N.sub:igdm": "The small line under the name, like 'Active now' or 'Active 2h ago'. In a group it's like '2 active 2h ago' or 'rose.landry was active 2h ago'. Delete it if you don't want one.",
    "blocks.N.chev:igdm": "The little > after a group's name, which opens the group's details in the real app.",
    "blocks.N.tick:igdm": "The blue tick after the name, for a verified account.",
    "blocks.N.faces.N:igdm": "Whose pictures go at the top. Leave it on 'The next person in the chat' and it picks for you, in the order they first send a message.",
    "blocks.N.bar:igdm": "The 'Message...' box at the bottom. 'Something half-typed' shows a message the phone owner hasn't sent yet.",
    "blocks.N.msgs.N.from:igdm": "The first box chooses who wrote the message, from the cast list above. You can also change it to a date or notice line. The big box is the message. 'Extras' has shared posts and the Seen line.",
    "blocks.N.msgs.N.replyTo:igdm": "Pick an earlier message to reply to it. It shows who replied to who, like 'Shane replied to you', then that message faded, above this one.",
    "blocks.N.msgs.N.link.url:igdm": "A link sent in the chat, as a card: the page's picture, its title in bold, and the website under it. Only the website's name shows, so the rest of the address can be anything. The picture is optional.",
    "blocks.N.msgs.N.postMore.N.url:igdm": "Another picture in the post makes it a carousel, with dots and arrows to slide through them, like in the feed. " + PIC,
    "blocks.N.msgs.N.attach:igdm": "A message can share one thing: a picture post or a reel (a card with the account, the picture and the caption; a reel is tall like a phone screen, with a play button), a link (a card with the page's picture, title and web address), or a story (the message's words in an outlined box). Pick one and its boxes appear.",
    "blocks.N.msgs.N.postLand:igdm": "Tick this if the picture is wider than it is tall, so it fills a reel's height instead of being squashed.",
    "blocks.N.msgs.N.photos.N.url:igdm": "A photo sent in the chat. Up to four go together in one bubble, before the words. " + PIC,
    "blocks.N.msgs.N.waReacts:igdm": "The emoji reactions on the bubble. With one kind of emoji, like '😂', it shows that emoji and the faces of who reacted. Type more than one kind, like '💀❤️', and it shows them all with how many people reacted instead, like Instagram does.",
    "blocks.N.msgs.N.waCount:igdm": "How many people reacted. Leave it empty to count the people picked below. With one kind of emoji, only three faces fit, so anyone past three shows as '+2' (or however many).",
    "blocks.N.msgs.N.faces:igdm": "Pick everyone who reacted, from the cast. Their faces go by the emoji, and their names are hidden there for readers with the workskin off.",
    "blocks.N.msgs.N.status:igdm": "The small grey line under the message: 'Seen', 'Sent', or 'Seen by 3' in a group. Usually only on the phone owner's last message.",
    "blocks.N.pov:ig": "Whose phone it is. Their picture goes first in the Stories row, as 'Your story'.",
    "blocks.N.top:ig": "The top bar: the +, the Instagram logo and the heart. 'With the red dot' adds the little dot that means there's something new.",
    "blocks.N.myStory:ig": "Puts the phone owner's own circle first in the Stories row, with a grey ring and a little +.",
    "blocks.N.stories:ig": "One circle per line, in order. Type a name from the cast to use their picture and username, or any username for a grey circle. Add '(close)' after a name for the green Close Friends ring, or '(seen)' for no ring.",
    "blocks.N.scroll:ig": "Once it's taller than a phone screen it scrolls. 'Show it all' makes it as long as it needs to be.",
    "blocks.N.msgs.N.from:ig": "The first box chooses who posted it, from the cast list above. The second box is the little grey time at the bottom, like '2 hours ago'. 'Verified' adds the blue tick, 'Story ring' the colourful ring round their picture, and 'Private' a padlock. 'Extras' has more options. The buttons let you reorder, insert a new post underneath, and delete each post.",
    "blocks.N.msgs.N.text:ig": "The caption, under the buttons. It starts with their username by itself. #hashtags go blue, and a new line here is a new line in the caption.",
    "blocks.N.msgs.N.photos.N.url:ig": "The photo. Add more than one and the post becomes a carousel, with arrows to slide through them. " + PIC,
    "blocks.N.msgs.N.photos.N.alt:ig": ALT,
    "blocks.N.msgs.N.photos.N.desc:ig": "No picture? Describe it here instead, and the words show in a grey box where the photo would be.",
    "blocks.N.msgs.N.photos.N.land:ig": "Tick this if the picture is wider than it is tall, so it fills the shape without squashing.",
    "blocks.N.msgs.N.shape:ig": "'Square' is Instagram's old square photos, and 'Tall' fills more of the phone (3 wide by 4 high). The picture is cut to fit, so you don't need to crop it. In a carousel every photo gets the same shape.",
    "blocks.N.msgs.N.acc:ig": "If this character has more than one Instagram account in their profile, pick which one posted this.",
    "blocks.N.msgs.N.locked:ig": "A padlock after the name, for a private account only its followers can see. Private posts can't be reposted, so the repost button fades out.",
    "blocks.N.msgs.N.under:ig": "The small grey line under the name: a place, like 'Ottawa, Ontario', or a song. Tick 'It's a song' to put a music note in front, and type it like 'Boney M. - Rasputin'.",
    "blocks.N.msgs.N.follow:ig": "'Follow link' puts a blue 'Follow' after the name. 'Suggested post' is for an account the phone owner doesn't follow, with a Follow button by the menu.",
    "blocks.N.msgs.N.collabs:ig": "A post made by more than one account. The first two pictures go in the circle. With one collaborator both names go at the top with 'and' between them, and with more it says 'and 2 others' (or however many).",
    "blocks.N.msgs.N.likes:ig": "The numbers by the buttons. The share and save buttons are always there. Leave a number empty to show the button with no number, or for reposts, no button at all.",
    "blocks.N.msgs.N.likeClick:ig": "Readers can click the heart to like the post: it turns red and the number goes up by one.",
    "blocks.N.msgs.N.saved:ig": "Readers can always click the bookmark to save the post. Tick this to start it already saved.",
    "blocks.N.msgs.N.likesLine:ig": "'The number of likes' writes it out, like '312 likes'. 'Liked by, with faces' shows up to three little pictures and 'Liked by' the first one 'and others'.",
    "blocks.N.msgs.N.more:ig": "Ends the caption with '... more' in grey, like a long caption cut short in the feed. Type only the part that shows.",
    "blocks.N.msgs.N.viewAll:ig": "A grey 'View all 84 comments' line above the comments, using the number of comments from the buttons.",
    "blocks.N.msgs.N.comments:ig": "One comment per line, starting with who's commenting and a colon. A name from the cast uses their username, and any other name is typed as it is.",
    "blocks.N.msgs.N.tags.N.who:ig": "People tagged in the photo. A little person icon goes on the photo, and clicking it opens the 'In this photo' list. Pick each person and their button: 'Following', a blue 'Follow' for someone the phone owner doesn't follow, or none. The phone owner never gets a button. 'Private' adds a padlock after their name.",
    "cast.N.ighandle": "Their username on Instagram. Leave it empty to use their name in small letters.",
    "blocks.N.msgs.N.contact": "Shares someone's contact: a card with their picture and name, and a 'Message' button. Pick them from the cast. The message words aren't used."
  };
  var helped = {}, helpKind = ""; // helpKind is "tw" while a Twitter/X block is drawn
  function help(path, kind) {
    kind = kind || helpKind;
    var base = path.replace(/\.\d+(?=\.|$)/g, ".N"), k = base + (kind ? ":" + kind : "");
    if ((kind === "dm" || kind === "igdm") && !HELP[k]) k = base; // a DM uses the chat help unless it has its own
    if (!HELP[k] || helped[k]) return "";
    helped[k] = true;
    return '<span class="tut-help" tabindex="0"><span>' + HELP[k] + "</span></span>";
  }
  // the help's ? goes on the same line as the box's label, or at the end of its row
  // (wrap: true puts a box with no label in a row of its own, so the ? can sit beside it)
  function field(path, label, opts) {
    opts = opts || {};
    var h = help(path, opts.help);
    if (!h) return box(path, label, opts);
    if (opts.type === "check") return '<span class="tut-row">' + box(path, label, opts) + h + "</span>";
    if (label) { opts.labHelp = h; return box(path, label, opts); }
    return opts.wrap ? '<div class="fb-row">' + box(path, label, opts) + h + "</div>" : box(path, label, opts) + h;
  }
  function box(path, label, opts) {
    opts = opts || {};
    var v = get(path), id = "f-" + path.replace(/\./g, "-");
    var type = opts.type || "text";
    var lab = label ? '<label for="' + id + '">' + label + "</label>" : "";
    if (lab && opts.labHelp) lab = '<div class="tut-lab">' + lab + opts.labHelp + "</div>";
    if (type === "check") return '<label class="ck"><input type="checkbox" id="' + id + '" data-bind="' + path + '"' + (v ? " checked" : "") + (opts.re ? " data-re" : "") + "> " + label + "</label>";
    if (type === "select") {
      return lab + '<select id="' + id + '" data-bind="' + path + '"' + (opts.re ? " data-re" : "") + ">" + opts.options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>";
      }).join("") + "</select>";
    }
    if (type === "area") return lab + '<textarea id="' + id + '" data-bind="' + path + '" rows="' + (opts.rows || 4) + '"' + (opts.re ? " data-re" : "") + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : "") + ">" + esc(v) + "</textarea>";
    return lab + '<input type="' + type + '" id="' + id + '" data-bind="' + path + '" value="' + esc(v) + '"' + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : "") + (opts.re ? " data-re" : "") + (opts.cls ? ' class="' + opts.cls + '"' : "") + ">";
  }
  function btn(act, text, title, extra) {
    return '<button type="button" data-act="' + act + '"' + (extra || "") + (title ? ' title="' + esc(title) + '" aria-label="' + esc(title) + '"' : "") + ">" + text + "</button>";
  }

  function castCard(c, i) {
    var P = "cast." + i, h = [];
    // each character folds up to just their name
    var kinds = { oneoff: "one-off", "new": "new profile", example: changed(c) ? "changed profile" : "profile" };
    h.push('<details class="fb-card" data-open="' + P + '.open"' + (c.open !== false ? " open" : "") + "><summary><b>" + esc(nameOf(c)) + "</b> <span class=\"hint\">(" + kinds[c.kind] + ")</span></summary>");
    h.push('<div class="fb-row">' + field(P + ".name", "", { ph: "Name", re: true }) +
      btn("cast-del:" + i, "&times;", "Remove " + nameOf(c)) + "</div>");
    h.push(field(P + ".kind", "", { type: "select", re: true, wrap: true, options: [["oneoff", "One-off: no profile"], ["new", "New profile"], ["example", "Edit an existing profile"]] }));
    if (c.kind === "oneoff") {
      // picture circle: a colour, initials yes or no, then an optional picture
      h.push('<div class="fb-row">' + field(P + ".colour", "", { type: "select", re: true, options: Object.keys(COLOURS).map(function (k) { return [k, "Colour " + k + ": " + COLOUR_NAMES[k]]; }) }) +
        '<span class="fb-swatch" style="background:' + COLOURS[c.colour] + '"></span>' + "</div>");
      h.push('<div class="fb-row">' + field(P + ".showInitials", "Initials in the circle", { type: "check", re: true }) +
        (c.showInitials !== false ? field(P + ".initials", "", { ph: initials(c) }) : "") + "</div>");
      h.push(field(P + ".pic", "Picture link (optional, replaces the colour and initials)", { type: "url", ph: "https://..." }));
      h.push(field(P + ".alt", "Picture description (optional)", { ph: "Profile picture of " + nameOf(c) }));
      h.push(field(P + ".land", "Landscape picture", { type: "check" }));
      h.push(field(P + ".num", "WhatsApp phone number (for someone not saved in the phone)", { ph: "+44 7700 900123" }));
      // their Twitter/X handle, when there are tweets
      var has = function (re) { return S.blocks.some(function (b) { return re.test(b.type); }); };
      if (has(/^tw/)) h.push(field(P + ".handle", "Twitter/X handle", { ph: "@" + twHandle(c) }));
      if (has(/^ig/)) h.push(field(P + ".ighandle", "Instagram username", { ph: igName(c) }));
    } else {
      var Q = P + ".prof";
      if (c.kind === "example") {
        h.push(field(P + ".example", "Which one", { type: "select", re: true, options: profileChoices(c) }));
        h.push('<p class="hint">' + (changed(c) ? "<b>Changed.</b> The new version is in the profile CSS to copy: swap it for the old one in your work skin." :
          "Change anything below and the updated profile goes in the profile CSS to copy. Leave it as it is to just use it.") + "</p>");
      } else h.push('<div class="fb-row"><span>pfp-</span>' + field(Q + ".slug", "", { ph: MP.slugify(c.name) || "name" }) + "</div>");
      h.push(field(Q + ".pic", "Picture link", { type: "url", ph: "https://..." }));
      h.push('<div class="fb-grid"><div>' + field(Q + ".piccol", "Circle colour", { type: "color" }) + "</div><div>" +
        field(Q + ".namecol", "Name colour", { type: "color" }) + "</div></div>");
      h.push('<div class="fb-grid"><div>' + field(Q + ".handle", "Handle", { ph: "no @" }) + "</div><div>" +
        field(Q + ".email", "Email address") + "</div></div>");
      h.push("<details" + (c.more ? " open" : "") + ' data-open="' + P + '.more"><summary>More profile options</summary>');
      h.push('<p class="hint">For explainers on all these options, refer to the <a href="profile-maker.html">Profile Maker</a>.</p>');
      h.push('<h4 class="fb-h">Differences on specific apps</h4><p class="hint">Only fill in what\'s different.</p>');
      MP.APPS.forEach(function (a) {
        h.push('<div class="fb-app"><b>' + a.label + "</b>" + field(Q + ".apps." + a.key + ".pic", "", { type: "url", ph: "Picture link" }) +
          field(Q + ".apps." + a.key + ".name", "", { ph: "Name" }) + (a.key === "gm" ? "" : field(Q + ".apps." + a.key + ".handle", "", { ph: "Handle" })) + "</div>");
      });
      h.push('<div class="fb-row">' + field(Q + ".dccolon", "Different name colour on Discord", { type: "check" }) + field(Q + ".dccol", "", { type: "color" }) + "</div>");
      h.push(field(Q + ".tbsq", "Square Tumblr picture", { type: "check" }));
      h.push('<p class="hint">WhatsApp wallpaper on their phone:</p>');
      h.push('<div class="fb-row">' + field(Q + ".wallcolon", "Colour", { type: "check" }) + field(Q + ".wallcol", "", { type: "color" }) + "</div>");
      h.push(field(Q + ".wallpic", "", { type: "url", ph: "Or a picture link", wrap: true }));
      h.push('<h4 class="fb-h">Appearance on other phones</h4>');
      c.prof.saved.forEach(function (s, k) {
        var S2 = Q + ".saved." + k;
        h.push('<div class="fb-acct"><div class="fb-row">' + field(S2 + ".owner", "", { type: "select", re: true, options: [["", "On whose phone?"]].concat(S.cast.filter(isProfile).filter(function (x) { return x !== c; }).map(function (x) { return [slugOf(x), nameOf(x)]; })).concat([["+new", "New person"]]) }) +
          field(S2 + ".as", "", { ph: "Saved as" }) + btn("saved-del:" + i + ":" + k, "&times;", "Remove") + "</div>" +
          // someone not in the cast yet: type their name and they're added as a new profile
          (s.owner === "+new" ? '<div class="fb-row">' + field(S2 + ".newName", "", { ph: "Their name" }) + btn("saved-new:" + i + ":" + k, "Add them") + "</div>" : "") +
          field(S2 + ".pic", "", { type: "url", ph: "Picture on their phone (optional): https://..." }) + "</div>");
      });
      h.push(btn("saved-add:" + i, "+ Saved as"));
      h.push('<h4 class="fb-h">Extra accounts</h4><p class="hint">A private Instagram, a burner, a work email.</p>');
      c.prof.accounts.forEach(function (x, k) {
        var A = Q + ".accounts." + k;
        h.push('<div class="fb-acct"><div class="fb-row"><span>acc-</span>' + field(A + ".acc", "", { ph: "burner" }) +
          field(A + ".app", "", { type: "select", options: MP.APPS.map(function (a) { return [a.key, a.label]; }) }) + btn("acct-del:" + i + ":" + k, "&times;", "Remove") + "</div>" +
          field(A + ".pic", "", { type: "url", ph: "Picture link" }) + field(A + ".name", "", { ph: "Name" }) + field(A + ".handle", "", { ph: "Handle, or email address" }) +
          field(A + ".sq", "Square Tumblr picture", { type: "check" }) + "</div>");
      });
      h.push(btn("acct-add:" + i, "+ Extra account"));
      h.push("</details>");
    }
    h.push("</details>");
    return h.join("");
  }

  function speakerOptions(b) {
    return S.cast.map(function (c) { return [c.id, nameOf(c) + (c.id === b.pov ? " (phone owner)" : "")]; })
      .concat([["sys", "Date or notice line"]]).concat([["typing", "Typing dots"]]);
  }

  function msgRow(b, bi, m, mi) {
    var P = "blocks." + bi + ".msgs." + mi, wa = b.type === "wa", dm = b.type === "twdm", ig = b.type === "igdm", h = [];
    var side = m.from === b.pov ? " out" : m.from === "sys" || m.from === "typing" ? " sys" : "";
    h.push('<li class="fb-msg' + side + '">');
    h.push('<div class="fb-row">' + field(P + ".from", "", { type: "select", re: true, help: m.from === "sys" || m.from === "typing" ? m.from : "", options: speakerOptions(b) }));
    if (m.from === "typing") { typer(b, m); h.push(field(P + ".by", "", { type: "select", re: true, options: S.cast.map(function (c) { return [c.id, nameOf(c) + (c.id === b.pov ? " (phone owner)" : "")]; }) })); }
    else h.push(field(P + ".text", "", { ph: m.from === "sys" ? "Today 11:48 PM" : m.photos.length || m.link ? "(no text, open extras for more)" : "Message", cls: "fb-text" }));
    if (wa && m.from !== "sys" && m.from !== "typing") h.push(field(P + ".time", "", { ph: "09:15", cls: "fb-time" }));
    h.push('<span class="fb-tools">' + (m.from === "sys" || m.from === "typing" ? "" : btn("msg-more:" + bi + ":" + mi, m.open ? "Less" : "Extras", "Extras for this message")) +
      btn("msg-up:" + bi + ":" + mi, "&uarr;", "Move up") + btn("msg-down:" + bi + ":" + mi, "&darr;", "Move down") +
      btn("msg-ins:" + bi + ":" + mi, "+", "Add a message under this one") + btn("msg-del:" + bi + ":" + mi, "&times;", "Delete this message") + "</span></div>");
    if (m.open && m.from !== "sys" && m.from !== "typing") {
      h.push('<div class="fb-extras">');
      h.push('<p class="hint">Select some words in the message, then: ' + btn("fmt:tl", "Translation") + " " + btn("fmt:egg", "Easter egg") + " " + btn("fmt:link", "Fake link") + "</p>");
      if (ig) {
        h.push(replyField(b, P, mi));
        h.push(field(P + ".status", "Line under it", { ph: b.group ? "Seen by 3" : "Seen" }));
        h.push('<div class="fb-row">' + field(P + ".waReacts", "Reactions", { ph: "😂" }) + field(P + ".waCount", "How many", { ph: "2", cls: "fb-time" }) + "</div>");
        h.push('<p class="hint">Who reacted:' + help(P + ".faces") + "</p>");
        (m.faces || []).forEach(function (f, k) {
          h.push('<div class="fb-row">' + field(P + ".faces." + k, "", { type: "select", options: castOptions() }) + btn("face-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>");
        });
        h.push(btn("face-add:" + bi + ":" + mi, "+ Someone who reacted"));
        // what's shared in the message: only one of these, and picking one brings up its boxes
        var kind = igdmKind(m);
        h.push('<p class="hint fb-attach">Shared in this message:' + help(P + ".attach") + " " + [["", "Nothing"], ["post", "Picture post"], ["reel", "Reel"], ["link", "Link"], ["story", "Story"]].map(function (o) {
          return '<label class="ck"><input type="radio" name="att-' + bi + "-" + mi + '" data-act="attach:' + bi + ":" + mi + ":" + o[0] + '"' + (kind === o[0] ? " checked" : "") + "> " + o[1] + "</label>";
        }).join(" ") + "</p>");
        if (kind === "story") {
          if (m.storyText === undefined) { m.storyText = m.text; m.text = ""; }
          h.push('<div class="fb-acct">' + field(P + ".storyText", "The story", { ph: 'Shared a story from @shane.h: "6am skate. Again."', wrap: true }) +
            '<p class="hint">It goes in an outlined box. Anything typed in the message box goes under it, as the words sent with the story.</p></div>');
        }
        if (m.hasPost) {
          if (m.postShare === undefined) m.postShare = true;
          if (m.postSave === undefined) m.postSave = true;
          var reelOnly = m.postReel;
          h.push('<div class="fb-acct"><div class="fb-row">' + field(P + ".postShare", "Share button", { type: "check" }) +
            field(P + ".postSave", "Save button", { type: "check" }) + "</div>" +
            field(P + ".postBy", "Posted by", { type: "select", re: true, options: [["", "Someone not in the cast"]].concat(castOptions()) }) +
            (char(m.postBy) ? "" : '<div class="fb-row">' + field(P + ".postAcc", "", { ph: "Their username" }) + field(P + ".postIni", "", { ph: (t(m.postAcc) || "s").charAt(0).toUpperCase(), cls: "fb-time" }) +
              field(P + ".postCol", "", { type: "select", options: [["", "Grey"]].concat(Object.keys(COLOURS).map(function (k) { return [k, "Colour " + k + ": " + COLOUR_NAMES[k]]; })) }) + "</div>") +
            (reelOnly ? '<p class="hint">A reel is one picture, a still from the video. The play button and the reel sign go on it for you.</p>' : "") +
            field(P + ".postImg", "", { type: "url", ph: reelOnly ? "Video still link" : "Picture link", wrap: true }) + field(P + ".postAlt", "", { ph: reelOnly ? "Describe the video still (alt text)" : "Describe the picture (alt text)", wrap: true }) +
            (reelOnly ? "" : field(P + ".postLand", "Landscape picture", { type: "check" })) +
            field(P + ".postDesc", "", { ph: reelOnly ? "Or, with no picture, describe the video in words" : "Or, with no picture, describe it in words", wrap: true }) +
            (reelOnly ? "" : (m.postMore || []).map(function (x, k) {
              var K = P + ".postMore." + k;
              return '<div class="fb-acct"><div class="fb-row">' + field(K + ".url", "", { type: "url", ph: "Next picture link" }) + btn("ppic-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>" +
                field(K + ".alt", "", { ph: "Describe the picture (alt text)", wrap: true }) + field(K + ".desc", "", { ph: "Or, with no picture, describe it in words", wrap: true }) +
                field(K + ".land", "Landscape picture", { type: "check" }) + "</div>";
            }).join("") + btn("ppic-add:" + bi + ":" + mi, "+ Another picture (a carousel)")) +
            field(P + ".postCap", "", { ph: "The caption (reels usually have none)", wrap: true }) + "</div>");
        }
        if (m.link) {
          if (m.linkInfo === undefined) m.linkInfo = true;
          if (m.linkShare === undefined) m.linkShare = true;
          var K = P + ".link";
          h.push('<div class="fb-acct"><p class="hint">Link card:' + help(P + ".link.url") + "</p>" +
            '<div class="fb-row">' + field(P + ".linkInfo", "Info button", { type: "check" }) + field(P + ".linkShare", "Share button", { type: "check" }) + "</div>" +
            field(K + ".url", "", { ph: "Web address", wrap: true }) + field(K + ".title", "", { ph: "The page's title", wrap: true }) +
            field(K + ".img", "", { type: "url", ph: "Picture link", wrap: true }) + field(K + ".alt", "", { ph: "Describe the picture (alt text)", wrap: true }) +
            field(K + ".imgdesc", "", { ph: "Or, with no picture, describe it in words", wrap: true }) + "</div>");
        }
        h.push(pictureRows(P, bi, mi, m, 4, true));
        h.push("</div></li>"); return h.join("");
      } else if (dm) {
        h.push(replyField(b, P, mi));
        h.push(field(P + ".waReacts", "Reactions", { ph: "😂 1" }));
        if (m.from === b.pov) h.push(field(P + ".status", "Seen or Sent", { ph: "Seen" }));
        h.push(field(P + ".voice", "Voice message length", { ph: "0:02" }));
      } else if (!wa) {
        h.push(field(P + ".sms", "Green SMS bubble", { type: "check" }));
        h.push('<p class="hint">Tapbacks (one emoji per person):</p>');
        m.reacts.forEach(function (r, k) {
          h.push('<div class="fb-row">' + field(P + ".reacts." + k + ".by", "", { type: "select", options: S.cast.map(function (c) { return [c.id, nameOf(c)]; }) }) +
            field(P + ".reacts." + k + ".emoji", "", { ph: "❤️", cls: "fb-emoji" }) + btn("tap-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>");
        });
        h.push(btn("tap-add:" + bi + ":" + mi, "+ Tapback"));
        h.push(field(P + ".status", "Line under it (e.g. Delivered, or Read 11:52 PM)", {}));
      } else {
        if (m.from === b.pov) h.push(field(P + ".tick", "Ticks", { type: "select", options: [["read", "Read (blue)"], ["delivered", "Delivered (grey)"], ["sent", "Sent (one tick)"], ["", "None"]] }));
        h.push(field(P + ".big", "Large emoji", { type: "check" }) + field(P + ".fwd", "Forwarded", { type: "check" }));
        h.push(field(P + ".call", "Call", { type: "select", re: true, options: [["", "Not a call"], ["voice", "Voice call"], ["video", "Video call"]] }));
        if (m.call) h.push(field(P + ".missed", "Missed call", { type: "check", re: true }) + (m.missed ? "" : field(P + ".callLen", "How long", { ph: "44 secs" })));
        h.push(field(P + ".contact", "Shared contact", { type: "select", re: true, options: [["", "None"]].concat(castOptions()) }));
        h.push(replyField(b, P, mi));
        h.push('<div class="fb-row">' + field(P + ".waReacts", "Reactions", { ph: "❤️ 😂" }) + field(P + ".waCount", "Count", { ph: "2", cls: "fb-time" }) + "</div>");
        if (!m.link) h.push(btn("link-add:" + bi + ":" + mi, "+ Link preview"));
        else {
          var K = P + ".link";
          h.push('<div class="fb-acct"><p class="hint">Link preview (the message text becomes the caption under it): ' + btn("link-del:" + bi + ":" + mi, "Remove") + "</p>" +
            field(K + ".url", "", { ph: "Web address", wrap: true }) + field(K + ".showUrl", "Show the web address", { type: "check" }) +
            field(K + ".title", "", { ph: "Title" }) + field(K + ".desc", "", { ph: "Description" }) +
            field(K + ".img", "", { type: "url", ph: "Picture link" }) + field(K + ".alt", "", { ph: "Describe the picture" }) +
            field(K + ".video", "", { type: "url", ph: "Or a video embed link (Vimeo, YouTube or the Internet Archive)" }) +
            field(K + ".imgdesc", "", { ph: "Describe the video, or with no picture, describe the picture" }) + "</div>");
        }
      }
      if (!dm) h.push(field(P + ".edited", "Edited", { type: "check" }));
      h.push('<p class="hint">Pictures (up to four' + (wa ? "; with pictures, the message text becomes the caption" : "") + "):</p>");
      m.photos.forEach(function (p, k) {
        var K = P + ".photos." + k;
        h.push('<div class="fb-acct"><div class="fb-row">' + field(K + ".url", "", { type: "url", ph: "Picture link" }) + btn("photo-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>" +
          field(K + ".alt", "", { ph: "Describe the picture (alt text)", wrap: true }) + field(K + ".desc", "", { ph: "Or, with no picture, describe it in words", wrap: true }) +
          field(K + ".land", "Landscape picture", { type: "check" }) + "</div>");
      });
      if (m.photos.length < 4) h.push(btn("photo-add:" + bi + ":" + mi, "+ Picture"));
      h.push("</div>");
    }
    h.push("</li>");
    return h.join("");
  }

  // pick an earlier message to reply to (WhatsApp and Twitter/X DMs)
  function replyField(b, P, mi) {
    var earlier = b.msgs.slice(0, mi).filter(function (x) { return char(x.from); });
    return field(P + ".replyTo", "Replying to", { type: "select", options: [["", "Not a reply"]].concat(earlier.map(function (x) {
      var t = plain(x.text).trim() || "(photo)"; return [x.id, nameOf(char(x.from)) + ": " + (t.length > 40 ? t.slice(0, 40) + "..." : t)];
    })) });
  }
  // pick one of a profile's extra accounts on this app (only shown when they have one)
  function accField(path, c, app) {
    var accs = isProfile(c) ? c.prof.accounts.filter(function (a) { return a.app === app && MP.slugify(a.acc); }) : [];
    if (!accs.length) return "";
    return field(path, "Which account", { type: "select", options: [["", "Their main account"]].concat(accs.map(function (a) {
      return [MP.slugify(a.acc), "acc-" + MP.slugify(a.acc) + (t(a.handle) ? " (" + t(a.handle) + ")" : "")]; })) });
  }
  function castOptions() { return S.cast.map(function (c) { return [c.id, nameOf(c)]; }); }
  function pictureRows(P, bi, mi, m, max, land) {
    var h = ['<p class="hint">Pictures' + (max ? " (up to " + max + ")" : "") + ":</p>"];
    m.photos.forEach(function (p, k) {
      var K = P + ".photos." + k;
      h.push('<div class="fb-acct"><div class="fb-row">' + field(K + ".url", "", { type: "url", ph: "Picture link" }) + btn("photo-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>" +
        field(K + ".alt", "", { ph: "Describe the picture (alt text)" }) + field(K + ".desc", "", { ph: "Or, with no picture, describe it in words" }) +
        (land ? field(K + ".land", "Landscape picture", { type: "check" }) : "") + "</div>");
    });
    if (!max || m.photos.length < max) h.push(btn("photo-add:" + bi + ":" + mi, "+ Picture"));
    return h.join("");
  }
  function rowTools(bi, mi, m, extras) {
    var ty = S.blocks[bi].type;
    var plus = ty === "twthread" ? "Add a reply below this" : ty === "twfeed" || ty === "twone" ? "Add a tweet below this" : /^ig/.test(ty) ? "Add a post below this" : "Add a message below this";
    return '<span class="fb-tools">' + (extras ? btn("msg-more:" + bi + ":" + mi, m.open ? "Less" : "Extras", "Extras") : "") +
      btn("msg-up:" + bi + ":" + mi, "&uarr;", "Move up") + btn("msg-down:" + bi + ":" + mi, "&darr;", "Move down") +
      btn("msg-ins:" + bi + ":" + mi, "+", plus) + btn("msg-del:" + bi + ":" + mi, "&times;", "Delete") + "</span>";
  }
  function fmtButtons() {
    return '<p class="hint">Select some words in the text, then: ' + btn("fmt:tl", "Translation") + " " + btn("fmt:egg", "Easter egg") + " " + btn("fmt:link", "Fake link") + "</p>";
  }


  // one Instagram post: who, when, the caption and the photos up top, everything else in the extras
  function igRow(b, bi, m, mi) {
    var P = "blocks." + bi + ".msgs." + mi, h = [], c = char(m.from);
    h.push('<li class="fb-msg"><div class="fb-row">' + field(P + ".from", "", { type: "select", re: true, options: castOptions() }) +
      field(P + ".time", "", { ph: "2 hours ago", cls: "fb-time" }) + field(P + ".verified", "Verified", { type: "check" }) +
      field(P + ".story", "Story ring", { type: "check" }) + field(P + ".locked", "Private", { type: "check" }) + rowTools(bi, mi, m, true) + "</div>");
    h.push(field(P + ".text", "", { type: "area", rows: 2, ph: "The caption. #hashtags go blue by themselves" }));
    if (!m.shape) m.shape = "";
    h.push(pictureRows(P, bi, mi, m, 10, true));
    if (m.photos.length) h.push(field(P + ".shape", "Photo shape", { type: "select", options: [["", "Normal"], ["sq", "Square"], ["portrait", "Tall"]] }));
    if (m.open) {
      h.push('<div class="fb-extras">' + fmtButtons());
      h.push(accField(P + ".acc", c, "ig"));
      h.push('<h4 class="fb-h">The account line</h4><div class="fb-grid"><div>' +
        field(P + ".nameAs", "Name shown", { ph: igName(c, accOf(c, m.acc, "ig")) }) +
        field(P + ".under", "Under the name", { ph: "Ottawa, Ontario" }) + field(P + ".song", "It's a song", { type: "check" }) + "</div><div>" +
        field(P + ".follow", "Follow button", { type: "select", options: [["", "None"], ["link", "Follow link after the name"], ["button", "Suggested post: Follow button"]] }) + "</div></div>");
      h.push('<p class="hint">Collab with:' + help(P + ".collabs") + "</p>");
      collabsOf(m).forEach(function (g, k) {
        var G = P + ".collabs." + k;
        h.push('<div class="fb-row">' + field(G + ".who", "", { type: "select", options: castOptions() }) + field(G + ".as", "", { ph: "Name shown" }) + field(G + ".tick", "Verified", { type: "check" }) +
          btn("collab-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>");
      });
      h.push(btn("collab-add:" + bi + ":" + mi, "+ Collaborator"));
      h.push('<h4 class="fb-h">Buttons and likes</h4><div class="fb-grid"><div>' +
        field(P + ".likes", "Likes", { ph: "2,431" }) + field(P + ".likeClick", "Clickable like", { type: "check", re: true }) +
        (m.likeClick !== false ? field(P + ".liked", "Already liked", { type: "check" }) : "") + "</div><div>" +
        field(P + ".cmCount", "Comments", { ph: "84" }) + "</div><div>" + field(P + ".reposts", "Reposts", { ph: "12" }) + "</div><div>" +
        field(P + ".saved", "Already saved", { type: "check" }) + "</div></div>");
      if (!m.likesLine) m.likesLine = "count";
      h.push(field(P + ".likesLine", "Line under the buttons", { type: "select", re: true, options: [["count", "The number of likes"], ["faces", "Liked by, with faces"], ["none", "Nothing"]] }));
      if (m.likesLine === "faces") {
        if (!m.faces) m.faces = [];
        m.faces.forEach(function (f, k) {
          h.push('<div class="fb-row">' + field(P + ".faces." + k, "", { type: "select", options: castOptions() }) + btn("face-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>");
        });
        if (m.faces.length < 3) h.push(btn("face-add:" + bi + ":" + mi, "+ Face"));
      }
      h.push('<h4 class="fb-h">Caption and comments</h4>' + field(P + ".more", "Cut short with 'more'", { type: "check" }) + " " +
        field(P + ".viewAll", "'View all comments' line", { type: "check" }));
      h.push(field(P + ".comments", "Comments, one per line", { type: "area", rows: 2, ph: "Shane: why are you awake\nscott.h: I see you" }));
      if (!m.tags) m.tags = [];
      h.push('<h4 class="fb-h">People tagged in the photo</h4>');
      m.tags.forEach(function (g, k) {
        var G = P + ".tags." + k;
        h.push('<div class="fb-row">' + field(G + ".who", "", { type: "select", options: castOptions() }) +
          field(G + ".fol", "", { type: "select", options: [["following", "Following"], ["follow", "Follow (blue)"], ["none", "No button"]] }) +
          field(G + ".tick", "Verified", { type: "check" }) + field(G + ".lock", "Private", { type: "check" }) + btn("tag-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>");
      });
      h.push(btn("tag-add:" + bi + ":" + mi, "+ Tag someone"));
      h.push("</div>");
    }
    h.push("</li>");
    return h.join("");
  }

  // one tweet in a timeline or thread
  function tweetRow(b, bi, m, mi) {
    var P = "blocks." + bi + ".msgs." + mi, h = [], thread = b.type === "twthread";
    h.push('<li class="fb-msg' + (thread && mi === 0 ? " out" : "") + '">');
    if (thread) h.push('<p class="hint"><b>' + (mi === 0 ? "The tweet" : "Reply") + "</b></p>");
    h.push('<div class="fb-row">' + field(P + ".from", "", { type: "select", re: true, options: castOptions() }) +
      field(P + ".time", "", { ph: "2h", cls: "fb-time" }) +
      // picked a lot, so they sit on the top row rather than in the extras
      field(P + ".verified", "Verified", { type: "check" }) + field(P + ".locked", "Private", { type: "check", re: true }) +
      rowTools(bi, mi, m, true) + "</div>");
    if (thread && mi > 0) {
      // who it's replying to: anyone who posted further up the thread
      var users = [];
      b.msgs.slice(0, mi).forEach(function (x) { if (char(x.from) && users.indexOf(x.from) < 0) users.push(x.from); });
      var prev = b.msgs[mi - 1];
      h.push('<div class="fb-row"><label for="f-' + P.replace(/\./g, "-") + '-replyTo">Replying to</label>' + field(P + ".replyTo", "", { type: "select", re: true, options: [["", nameOf(char(prev.from)) + " (the tweet above)"]].concat(users.map(function (u) { return [u, nameOf(char(u))]; })) }) + "</div>");
    }
    h.push(field(P + ".text", "", { type: "area", rows: 2, ph: "What's happening? #hashtags and @mentions go blue by themselves" }));
    if (m.open) {
      var c = char(m.from);
      h.push('<div class="fb-extras">' + fmtButtons());
      h.push(accField(P + ".acc", c, "tw"));
      var old = b.era === "tw2020";
      if (m.fanMask === undefined) m.fanMask = fanMask(m);
      h.push(field(P + ".fan", "Grey line under the name", { ph: "Fan account" }) + field(P + ".fanMask", "Fan account mask", { type: "check" }));
      h.push(field(P + ".label", "Grey label", {}));
      // the buttons along the bottom
      h.push('<p class="hint">Buttons along the bottom (leave a number empty for a button with no count):</p><div class="fb-grid"><div>' +
        field(P + ".replies", "Replies", { ph: "10" }) + "</div><div>" +
        (m.locked ? '<p class="hint">Reposts: faded out, because private tweets can\'t be reposted</p>' :
          field(P + ".reposts", old ? "Retweets" : "Reposts", { ph: "580" }) + field(P + ".reposted", old ? "Retweeted" : "Reposted", { type: "check" }) +
          field(P + ".noRepost", "Faded repost button", { type: "check", re: true })) + "</div><div>" +
        field(P + ".likes", "Likes", { ph: "2,614" }) + field(P + ".likeClick", "Clickable like", { type: "check", re: true }) +
        field(P + ".liked", m.likeClick ? "Already liked" : "Liked", { type: "check" }) + "</div>" +
        (old ? "" : "<div>" + field(P + ".views", "Views", { ph: "71K" }) + "</div><div>" +
          field(P + ".saveClick", "Clickable bookmark", { type: "check", re: true }) + field(P + ".saved", m.saveClick ? "Already bookmarked" : "Bookmarked", { type: "check" }) + "</div>") + "</div>");
      h.push(field(P + ".date", "Small grey bottom text", { ph: "8:23 AM · 11 May 23" }));
      // the bigger extras only open up when they're ticked
      TW_ADDS.forEach(function (a) { if (m[a[0]] === undefined) m[a[0]] = has(m, a[0]); });
      h.push('<p class="hint">Add to this tweet:</p><div>' + TW_ADDS.map(function (a) { return field(P + "." + a[0], a[1], { type: "check", re: true }); }).join(" ") + "</div>");
      if (m.hasPoll) {
        // open, finished (the results), or tapped to vote: the tick goes on the vote
        var kind = pollKind(m), names = pollOpts(m).slice(0, 4).map(function (o, k) { return [String(k), o.text]; });
        if (!names.length) names = [["0", "The first option"]];
        h.push('<div class="fb-acct">' + field(P + ".poll", "Poll options", { type: "area", rows: 2 }) +
          field(P + ".pollinfo", "Under the poll", { ph: kind === "results" ? "97 votes · Final results" : "179 votes · 13 minutes left" }) +
          field(P + ".pollKind", "This poll is", { type: "select", re: true, options: [["open", "Still open: just the options"], ["results", "Finished: showing the results"], ["tap", "Tappable: readers tap it to vote and see the results"]] }) +
          (kind === "results" ? field(P + ".pollShowVote", "Show their vote", { type: "check", re: true }) +
            (m.pollShowVote ? field(P + ".pollVoted", "They voted for", { type: "select", options: names }) : "") : "") +
          (kind === "tap" ? field(P + ".pollVote", "The vote goes to", { type: "select", re: true, options: names.concat([["pick", "Whichever one the reader picks"]]) }) : "") +
          (kind === "tap" && m.pollVote === "pick" ? pickRows(P, m) : "") + "</div>");
      }
      if (m.hasQuote) h.push('<div class="fb-acct"><p class="hint">Quote tweet:' + help(P + ".qName") + '</p><div class="fb-grid"><div>' + field(P + ".qName", "", { ph: "Their name" }) + "</div><div>" + field(P + ".qHandle", "", { ph: "Their handle" }) + "</div></div>" +
        field(P + ".qText", "", { ph: "What they said" }) + "</div>");
      if (m.hasNote) h.push('<div class="fb-acct">' + field(P + ".note", "Community note", { ph: "Readers added context: ..." }) + "</div>");
      if (m.hasPics) h.push('<div class="fb-acct">' + pictureRows(P, bi, mi, m, 4, true) + field(P + ".warn", "Sensitive content cover", { type: "check" }) + "</div>");
      if (m.hasVideo) h.push('<div class="fb-acct"><p class="hint">Video:' + help(P + ".vUrl") + "</p>" + field(P + ".vUrl", "", { type: "url", ph: "Video embed link (Vimeo, YouTube or the Internet Archive)" }) +
        field(P + ".vTitle", "", { ph: "The video's title" }) + field(P + ".vDesc", "", { ph: "Describe the video" }) + "</div>");
      h.push("</div>");
    }
    h.push("</li>");
    return h.join("");
  }
  // the reader-picks poll: what the results say after each pick (an empty box uses the poll's own percentage)
  function pickRows(P, m) {
    var opts = pollOpts(m), h = ['<p class="hint">The results the reader sees after each pick. An empty box uses the poll\'s own percentage:</p>'];
    if (!Array.isArray(m.pollPick)) m.pollPick = [];
    if (!Array.isArray(m.pollPickInfo)) m.pollPickInfo = [];
    var info = t(m.pollinfo).replace(/\d[\d,]*/, bumpCount);
    opts.forEach(function (o, i) {
      if (!Array.isArray(m.pollPick[i])) m.pollPick[i] = [];
      if (m.pollPickInfo[i] == null) m.pollPickInfo[i] = "";
      opts.forEach(function (x, j) { if (m.pollPick[i][j] == null) m.pollPick[i][j] = ""; });
      h.push('<div class="fb-acct"><p class="hint">If they pick <b>' + esc(o.text) + "</b>:</p><div class=\"fb-grid\">" + opts.map(function (x, j) {
        return "<div>" + field(P + ".pollPick." + i + "." + j, esc(x.text) + " %", { ph: x.pct === null ? "" : String(x.pct) }) + "</div>";
      }).join("") + "</div>" + field(P + ".pollPickInfo." + i, "Votes line", { ph: info }) + "</div>");
    });
    return h.join("");
  }
  // the settings for a chat: iMessage and WhatsApp
  function chatSettings(b, i) {
    var P = "blocks." + i, h = [], wa = b.type === "wa", dm = b.type === "twdm", ig = b.type === "igdm";
    h.push("<details" + (b.open ? " open" : "") + ' data-open="' + P + '.open"><summary>Chat settings</summary><div class="fb-grid">');
    // first row: whose phone, and whether it's a group
    h.push("<div>" + field(P + ".pov", "Whose phone is it?", { type: "select", re: true, options: castOptions() }) + "</div>");
    h.push("<div>" + field(P + ".group", "Group chat", { type: "check", re: true }) + ((wa || ig) && b.group ? field(P + ".pics", "Show pictures by names", { type: "check" }) : "") + "</div>");
    // second row: the top, the background and the bottom
    h.push('</div><div class="fb-grid">');
    if (wa) {
      h.push("<div>" + field(P + ".header", "Header", { type: "select", re: true, options: [["simple", "Simple"], ["bar", "With picture and icons"], ["none", "None"]] }) + "</div>");
      h.push("<div>" + field(P + ".bg", "Background", { type: "select", re: true, options: BACKGROUNDS.map(function (x) { return [x, x ? x.charAt(0).toUpperCase() + x.slice(1) : "Default"]; }).concat([["custom", "Custom picture"]]) }) + "</div>");
    }
    h.push("<div>" + field(P + ".bar", "Message bar at the bottom", { type: "select", re: true, options: [["none", "None"], ["empty", "Empty"], ["typed", "Something half-typed"]] }) + "</div>");
    if (ig) h.push("<div>" + field(P + ".app", "App screen", { type: "check" }) + field(P + ".headPic", "Pictures in the header", { type: "check", re: true }) + "</div>");
    if (dm) h.push("<div>" + field(P + ".nav", "App buttons", { type: "check", re: true }) + (b.nav ? field(P + ".badge", "Notifications number", { ph: "3" }) : "") + "</div>");
    h.push("</div>");
    // then what each choice above opens up, each in its own row so it's clear where it came from
    if (!wa || b.header !== "none") {
      // folded up by default, as it's long
      h.push('<details class="fb-acct"' + (b.headOpen ? " open" : "") + ' data-open="' + P + '.headOpen"><summary class="hint">The header</summary><div class="fb-grid">');
      h.push("<div>" + field(P + ".title", "Name at the top", { ph: b.group ? "Group chat name" : ig ? "Their username" : "The other person's name" }) + "</div>");
      if (!dm) h.push("<div>" + field(P + ".sub", "Smaller line under it", { ph: wa ? "online" : ig ? (b.group ? "2 active 2h ago" : "Active now") : "iMessage" }) + "</div>");
      h.push("</div>");
      if (ig) h.push(igdmHeadSettings(b, P));
      h.push(groupPicSettings(b, P, wa, dm));
      h.push("</details>");
    }
    // these two are short, so they start open, to show what picking the option added
    if (wa && b.bg === "custom") h.push('<details class="fb-acct"' + (b.bgOpen !== false ? " open" : "") + ' data-open="' + P + '.bgOpen"><summary class="hint">The background</summary>' +
      field(P + ".wall", "Picture link", { type: "url", ph: "https://..." }) + "</details>");
    if (b.bar === "typed") h.push('<details class="fb-acct"' + (b.barOpen !== false ? " open" : "") + ' data-open="' + P + '.barOpen"><summary class="hint">The message bar</summary>' +
      field(P + ".barText", "Half-typed message", {}) + field(P + ".cursor", "Flashing cursor", { type: "check" }) + "</details>");
    // last row: always these three, side by side
    h.push('<div class="fb-grid fb-grid3">');
    h.push("<div>" + field(P + ".theme", "Light, dark, or auto", { type: "select", options: [["theme-light", "Light"], ["theme-dark", "Dark"], ["theme-auto", "Auto"]] }) + "</div>");
    h.push("<div>" + field(P + ".width", "Width", { type: "select", options: [["", "Phone width"], ["wide", "Full width"]] }) + "</div>");
    h.push("<div>" + field(P + ".scroll", "Long chats", { type: "select", options: [["", "Scroll inside the phone"], ["no-scroll", "Show it all"]] }) + "</div>");
    h.push("</div>");
    h.push("</details>");
    return h.join("");
  }
  // Instagram DMs: who's in the header pictures (one, or two for a group), and the blue tick
  function igdmHeadSettings(b, P) {
    var h = [];
    if (!b.group) h.push(field(P + ".tick", "Blue tick after the name", { type: "check" }));
    else { if (b.chev === undefined) b.chev = true; h.push(field(P + ".chev", "Little arrow after the name", { type: "check" })); }
    if (b.headPic === false) return h.join("");
    if (!b.faces) b.faces = [];
    var auto = [["", "The next person in the chat"]].concat(S.cast.filter(function (c) { return c.id !== b.pov; }).map(function (c) { return [c.id, nameOf(c)]; }));
    h.push('<div class="fb-grid"><div>' + field(P + ".faces.0", b.group ? "First picture" : "Picture", { type: "select", options: auto }) + "</div>" +
      (b.group ? "<div>" + field(P + ".faces.1", "Second picture", { type: "select", options: auto }) + "</div>" : "") + "</div>");
    return h.join("");
  }
  // the group's picture in the header (WhatsApp with the picture header, and Twitter/X DMs)
  function groupPicSettings(b, P, wa, dm) {
    var h = [];
    if (b.group && (dm || (wa && b.header === "bar"))) {
      // the group's picture in the header
      if (!b.gp) b.gp = newGroupPic();
      var G = P + ".gp";
      h.push('<details class="fb-acct"' + (b.gpOpen ? " open" : "") + ' data-open="' + P + '.gpOpen"><summary class="hint">The group\'s picture</summary>');
      // a group picture can come from a profile, like one pasted in, so it can be used in more than one chat or fic
      var profs = S.cast.filter(isProfile);
      if (profs.length) h.push(field(G + ".from", "Picture from a profile", { type: "select", re: true, options: [["", "No, set one up here"]].concat(profs.map(function (c) { return [c.id, nameOf(c)]; })) }));
      if (isProfile(char(b.gp.from))) h.push("</details>");
      else {
        h.push('<div class="fb-row">' + field(G + ".colour", "", { type: "select", re: true, options: Object.keys(COLOURS).map(function (k) { return [k, "Colour " + k + ": " + COLOUR_NAMES[k]]; }) }) +
          '<span class="fb-swatch" style="background:' + COLOURS[b.gp.colour] + '"></span>' + "</div>");
        h.push('<div class="fb-row">' + field(G + ".showInitials", "Initials in the circle", { type: "check", re: true }) +
          (b.gp.showInitials !== false ? field(G + ".initials", "", { ph: (b.title.trim() || "G").charAt(0).toUpperCase() }) : "") + "</div>");
        h.push(field(G + ".pic", "Picture link (optional, replaces the colour and initials)", { type: "url", ph: "https://..." }));
        h.push(field(G + ".alt", "Picture description (optional)", { ph: "Profile picture of " + (b.title.trim() || "the group") }));
        h.push(field(G + ".land", "Landscape picture", { type: "check" }) + "</details>");
      }
    }
    return h.join("");
  }
  var SCRIPT_HINTS = {
    chat: "One message per line, starting with who's talking and a colon. A line on its own with no name carries on from the last person. Start a line with -- for a date or notice line, and put a time first if you like, like 09:15 Lily: hi. New names are added to the cast.",
    twthread: "One tweet per line, starting with who's posting and a colon. The first one is the tweet, and the rest are replies. Each reply answers the tweet just above it, and you can change who it's replying to in the list. New names are added to the cast.",
    twfeed: "One tweet per line, starting with who's posting and a colon. New names are added to the cast.",
    twone: "One tweet per line, starting with who's posting and a colon. Each tweet gets its own box. New names are added to the cast.",
    igfeed: "One post per line, starting with who's posting and a colon, then the caption. New names are added to the cast.",
    igone: "One post per line, starting with who's posting and a colon, then the caption. Each post gets its own box. New names are added to the cast."
  };
  function blockCard(b, i) {
    var P = "blocks." + i, h = [], chat = isChat(b);
    helpKind = b.type === "twdm" ? "dm" : b.type === "igdm" ? "igdm" : chat ? "" : /^ig/.test(b.type) ? "ig" : "tw";
    h.push('<section class="fb-block" data-i="' + i + '">');
    if (b.type === "raw") {
      // HTML that couldn't be read into boxes, kept just as it was
      helpKind = "";
      b.msgs = [];
      var gist = b.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
      h.push('<div class="fb-bhead"><button type="button" class="fb-fold" data-act="blk-fold:' + i + '" aria-expanded="' + !b.fold + '">' +
        (b.fold ? "&#9656; " : "&#9662; ") + "<b>" + (i + 1) + ". " + KINDS.raw + "</b>" + (b.fold && gist ? ' <span class="hint">' + esc(gist) + "</span>" : "") + "</button>" +
        '<span class="fb-tools">' + btn("blk-up:" + i, "&uarr;", "Move up") + btn("blk-down:" + i, "&darr;", "Move down") + btn("blk-del:" + i, "&times;", "Delete this") + "</span></div>");
      if (!b.fold) h.push(field(P + ".html", "The HTML", { type: "area", rows: 8 }) +
        '<p class="hint">This HTML goes out just as it is. It\'s story text, or something the builder can\'t make in boxes, like a chat from another skin or a chat changed by hand. You can change it here, and if it becomes a chat the builder makes, it turns into boxes.</p>');
      h.push("</section>");
      return h.join("");
    }
    // the name folds the chat up, leaving just this line and its buttons
    // folded, it shows who sent the first message and what it said
    var first = b.msgs.filter(function (x) { return char(x.from) && (t(x.text) || x.photos.length); })[0];
    var what = first ? "<em>" + esc(nameOf(char(first.from))) + ":</em> " + esc(plain(first.text).trim().slice(0, 80) || "(picture)") : esc(t(b.title));
    h.push('<div class="fb-bhead"><button type="button" class="fb-fold" data-act="blk-fold:' + i + '" aria-expanded="' + !b.fold + '">' +
      (b.fold ? "&#9656; " : "&#9662; ") + "<b>" + (i + 1) + ". " + KINDS[b.type] + "</b>" + (b.fold && what ? ' <span class="hint">' + what + "</span>" : "") + "</button>" +
      '<span class="fb-tools">' + btn("blk-up:" + i, "&uarr;", "Move up") + btn("blk-down:" + i, "&darr;", "Move down") + btn("blk-del:" + i, "&times;", "Delete this") + "</span></div>");
    if (b.fold) { helpKind = ""; return h.concat(["</section>"]).join(""); }
    if (chat) h.push(chatSettings(b, i));
    else if (/^ig/.test(b.type)) {
      var feed = b.type === "igfeed";
      h.push('<div class="fb-grid fb-grid3"><div>' + field(P + ".theme", "Light, dark, or auto", { type: "select", options: [["theme-light", "Light"], ["theme-dark", "Dark"], ["theme-auto", "Auto"]] }) + "</div><div>" +
        field(P + ".width", "Width", { type: "select", options: [["", "Phone width"], ["wide", "Full width"]] }) + "</div><div>" +
        field(P + ".scroll", feed ? "Long feeds" : "Long posts", { type: "select", options: [["", "Scroll inside the phone"], ["no-scroll", "Show it all"]] }) + "</div></div>");
      if (feed) {
        h.push('<div class="fb-grid"><div>' + field(P + ".pov", "Whose phone is it?", { type: "select", options: castOptions() }) + "</div><div>" +
          field(P + ".top", "Top bar", { type: "select", options: [["new", "With the red dot"], ["plain", "No red dot"], ["none", "None"]] }) + "</div></div>");
        h.push(field(P + ".myStory", "Their own story first", { type: "check" }));
        h.push(field(P + ".stories", "Stories, one name per line", { type: "area", rows: 2, ph: "Rose (close)\nShane\nscott.h (seen)" }));
      }
    } else {
      h.push('<div class="fb-grid"><div>' + field(P + ".theme", "Light, dark, or auto", { type: "select", options: [["theme-light", "Light"], ["theme-dark", "Dark"], ["theme-auto", "Auto"]] }) + "</div><div>" +
        field(P + ".width", "Width", { type: "select", options: [["", "Phone width"], ["wide", "Full width"]] }) + "</div>" +
        (b.type === "twthread" ? "<div>" + field(P + ".bar", "Tweet your reply bar", { type: "select", options: [["empty", "Yes"], ["none", "No"]] }) + "</div>" : "") +
        "<div>" + field(P + ".era", "Which look", { type: "select", re: true, options: [["", "X (from mid-2023)"], ["tw2020", "Twitter (2020 to mid-2023)"]] }) + "</div>" +
        (b.type !== "twone" ? "<div>" + field(P + ".scroll", b.type === "twfeed" ? "Long timelines" : "Long threads", { type: "select", options: [["", "Scroll inside the phone"], ["no-scroll", "Show it all"]] }) + "</div>" : "") +
        (b.type === "twone" ? "<div>" + field(P + ".scroll", "Long tweets", { type: "select", options: [["", "Scroll inside the box"], ["no-scroll", "Show it all"]] }) + "</div>" : "") +
        (b.type === "twfeed" ? "<div>" + field(P + ".pov", "Whose phone is it? (their picture goes at the top)", { type: "select", options: castOptions() }) + "</div>" : "") + "</div>");
      if (b.type === "twfeed" && b.era !== "tw2020") h.push(field(P + ".tabs", "Communities in the tabs, after For you and Following (one per line)", { type: "area", rows: 2, ph: "Metros Fans\nHockey Twitter" }));
    }
    var row = chat ? msgRow : /^ig/.test(b.type) ? igRow : tweetRow;
    h.push('<ol class="fb-msgs">' + b.msgs.map(function (m, mi) { return row(b, i, m, mi); }).join("") + "</ol>");
    var ph = chat ? "Ilya: are you awake\nShane: no\n-- Today 11:48 PM" : /^ig/.test(b.type) ? "Rose: made enough for the whole committee. nobody came. #galaprep\nScott: opening day" : "Zim: Reminder to everyone...\nHolster: I played all through college...";
    // the add button goes straight under the list, apart from the box for typing lots at once
    var addOne = btn("msg-add:" + i, chat ? "+ Add a message" : b.type === "twthread" ? (b.msgs.length ? "+ Add a reply" : "+ Add the tweet") : /^ig/.test(b.type) ? "+ Add a post" : "+ Add a tweet");
    h.push("<p>" + addOne + "</p>");
    h.push('<div class="fb-script">' + field(P + ".script", chat ? "Type or paste messages" : /^ig/.test(b.type) ? "Type or paste posts" : "Type or paste tweets", { type: "area", rows: 4, ph: ph }) +
      '<p class="hint">' + (SCRIPT_HINTS[chat ? "chat" : b.type]) + "</p>" +
      btn("script:" + i, chat ? "Add these messages" : /^ig/.test(b.type) ? "Add these posts" : "Add these tweets") + "</div>");
    h.push("</section>");
    helpKind = "";
    return h.join("");
  }

  function renderEditor() {
    helped = {};
    S.cast.forEach(function (c) { if (c.kind === "example" && c.loadedFrom !== c.example) loadProfile(c); });
    $("fb-cast").innerHTML = field("ownOnly", "Only use my own profiles", { type: "check", re: true }) + S.cast.map(castCard).join("");
    $("fb-blocks").innerHTML = S.blocks.map(blockCard).join("") || '<p class="hint">Nothing here yet. Add a chat below.</p>';
    if (window.Tutorial && Tutorial.mark) Tutorial.mark();
  }

  // remake the preview and the copy boxes (after every change)
  function refresh() {
    save();
    var html = allHTML(), css = profilesCSS(), all = allProfilesCSS().trim();
    $("fb-live").textContent = (S.pasted || "") + "\n\n" + css;
    $("workskin").innerHTML = html;
    if (document.activeElement !== $("fb-html")) $("fb-html").value = html; // not while it's being typed in
    // the profile CSS box has every profile in use: pasted or opened, and new or changed
    $("fb-css").value = all;
    $("fb-css-wrap").hidden = !all && !pasteOpen;
  }
  // "Manually add profile" makes the profile CSS box take pasted profiles too, with no files
  var pasteOpen = false;
  function pasteProfiles(text) {
    var found = pastedProfiles(text);
    if (!found.length) { $("fb-css-status").textContent = "No profiles found in that. Check you copied the whole profile."; return; }
    S.pasted = ((S.pasted || "").trim() + "\n\n" + text.trim()).trim();
    addPasted();
    rerender();
    $("fb-css-status").textContent = "Added to the cast: " + found.map(function (p) { return p[1]; }).join(", ") + ".";
  }
  $("fb-css").addEventListener("paste", function (e) {
    if (this.readOnly) return;
    e.preventDefault();
    pasteProfiles((e.clipboardData || window.clipboardData).getData("text"));
  });
  $("fb-css").addEventListener("change", function () {
    if (!this.readOnly && this.value.trim() !== allProfilesCSS().trim()) pasteProfiles(this.value);
  });
  // redraw the boxes on the left too (after adding, removing or moving something)
  function rerender() { renderEditor(); refresh(); }

  // ---------- script box ----------

  function findChar(name) {
    var n = name.trim().toLowerCase();
    var hit = S.cast.filter(function (c) { return nameOf(c).toLowerCase() === n; })[0];
    if (!hit) hit = S.cast.filter(function (c) { return nameOf(c).toLowerCase().split(/\s+/)[0] === n; })[0];
    return hit;
  }
  function addScript(bi) {
    var b = S.blocks[bi], last = b.msgs.length ? b.msgs[b.msgs.length - 1] : null;
    var from = last && char(last.from) ? last.from : "", time = last ? last.time : "";
    b.script.split(/\n/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      if (/^--/.test(line) && isChat(b)) { b.msgs.push(newMsg("sys", line.replace(/^-+\s*/, ""))); return; }
      var tm = line.match(/^(\d{1,2}[:.]\d{2})\s+(.*)$/); // a time first, like "09:15 Lily: hi"
      if (tm) { time = tm[1]; line = tm[2]; }
      var sp = line.match(/^([^:]{1,40}):\s*(.*)$/);
      if (sp && !/^https?$/i.test(sp[1].trim())) { // "https:" isn't a name
        var c = findChar(sp[1]);
        if (!c) { c = newChar(sp[1].trim()); S.cast.push(c); }
        from = c.id; line = sp[2];
      }
      if (!from) { var o = S.cast.filter(function (c) { return c.id !== b.pov; })[0] || S.cast[0]; if (!o) { o = newChar("Someone"); S.cast.push(o); } from = o.id; }
      b.msgs.push(newMsg(from, line, time));
    });
    b.script = "";
    if (!char(b.pov) && S.cast[0]) b.pov = S.cast[0].id; // a chat made before anyone was in the cast
    rerender();
  }

  // ---------- reading HTML back in ----------
  // HTML opened from a file, or typed or pasted in the HTML box, is read back into the boxes on the left.
  // Only the Megaskin's own HTML is read, and a chat only becomes boxes if building it again here
  // gives the same HTML. Anything else stays just as it was, in an "HTML, as it was" box.
  var DOWNLOADED = "Paste in the html you can find in the 'edit work' page. - This tool doesn't support anything that could be easily downloaded by someone who isn't the original author.";
  // HTML boiled down to what matters: tags, attributes and words, without the spacing between them
  function canon(html) {
    var box = document.createElement("div");
    box.innerHTML = html;
    function walk(n) {
      if (n.nodeType === 3) return n.nodeValue.replace(/\s+/g, " ").trim();
      if (n.nodeType !== 1) return "";
      var at = Array.prototype.map.call(n.attributes, function (a) {
        var v = a.value.trim();
        if (a.name === "class") v = v.split(/\s+/).sort().join(" ");
        if (a.name === "href") v = v.replace(/^#t\d+$/, "#t"); // translations are numbered down the whole page
        return a.name === "rel" ? "" : a.name + '="' + v + '"';
      }).filter(Boolean).sort().join(" ");
      var tag = n.tagName.toLowerCase();
      return "<" + tag + (at ? " " + at : "") + ">" + Array.prototype.map.call(n.childNodes, walk).join("") + "</" + tag + ">";
    }
    return walk(box);
  }
  function no() { throw new Error("can't read this"); }
  function kids(el) { return Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 1 || n.nodeType === 3 && n.nodeValue.trim(); }); }
  // everything inside a line, spaces included, minus the spacing at either end
  function inl(el) {
    var ns = Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 1 || n.nodeType === 3; });
    while (ns.length && ns[0].nodeType === 3 && !ns[0].nodeValue.trim()) ns.shift();
    while (ns.length && ns[ns.length - 1].nodeType === 3 && !ns[ns.length - 1].nodeValue.trim()) ns.pop();
    return ns;
  }
  function is(n, sel) { return !!n && n.nodeType === 1 && n.matches(sel); }
  function words(n) { return n.textContent.replace(/\s+/g, " ").trim(); }
  // the words of a message, with translations, easter eggs and fake links put back as [[ ]], {{ }} and << >>
  function textBack(nodes) {
    return nodes.map(function (n) {
      if (n.nodeType === 3) return n.nodeValue;
      if (is(n, "a.tl")) {
        var o = n.querySelector(".orig"), tl = n.querySelector(".tltn"); if (!o || !tl) no();
        var c = tl.cloneNode(true); c.querySelectorAll(".hide").forEach(function (x) { x.remove(); });
        return n.classList.contains("egg") ? "{{" + o.textContent + "|" + c.textContent + "}}" : "[[" + o.textContent + "|" + c.textContent + "]]";
      }
      if (is(n, "span.fake-link")) return "<<" + n.textContent + ">>";
      if (is(n, "span.tw-link, span.ig-link")) return n.textContent; // a hashtag or @mention goes blue by itself
      if (is(n, "br")) return "\n";
      return no();
    }).join("").replace(/^\s+|\s+$/g, "");
  }
  // people: a profile by its class (kept even if there's no profile for it yet), or a one-off by name
  function personBySlug(slug) {
    var c = S.cast.filter(function (c) { return isProfile(c) && slugOf(c) === slug; })[0];
    if (c) return c;
    c = newChar("", "example"); c.example = slug; c.open = false;
    loadProfile(c);
    c.unknown = !existing().some(function (e) { return e[0] === slug; });
    S.cast.push(c);
    return c;
  }
  // a profile with no CSS here yet picks up its names from the hidden text the HTML has for them,
  // without counting as a changed profile (so no CSS is made for it)
  function learn(c, app, key, v) {
    if (!c.unknown || !v) return;
    var p = c.prof.apps[app] = c.prof.apps[app] || {};
    if (!p[key]) p[key] = v;
    c.orig = JSON.stringify(profileData(c));
  }
  function personByName(name, profileOk) {
    name = String(name || "").trim(); if (!name) no();
    var c = S.cast.filter(function (c) { return c.kind === "oneoff" && nameOf(c) === name; })[0];
    if (!c && profileOk) c = S.cast.filter(function (c) { return isProfile(c) && (nameOf(c) === name || shownName(c) === name); })[0];
    return c || freshChar(name);
  }
  function slugIn(el) { var p = el.querySelector("[class*=pfp-]"); var m = p && p.className.match(/(?:^|\s)pfp-([a-z0-9-]+)/); return m ? m[1] : ""; }
  // a name as a chat shows it: a profile's name span, or typed words
  function personIn(el) {
    var p = el.querySelector("span.name[class*=pfp-]");
    if (p) return personBySlug(p.className.match(/pfp-([a-z0-9-]+)/)[1]);
    var c = el.cloneNode(true); c.querySelectorAll(".hide").forEach(function (x) { x.remove(); });
    return personByName(words(c), false);
  }
  // the hidden "Name:" at the start of a message
  // a chat's pictures: each one a picture tag or the words in an img-desc
  function photosBack(ph, pre) {
    var ps = kids(ph).map(function (x) {
      var k = is(x, "span." + pre + "-photo") ? kids(x) : no();
      if (k.length !== 1) no();
      if (is(k[0], "img")) return { url: k[0].getAttribute("src"), alt: k[0].getAttribute("alt") || "", desc: "", land: k[0].classList.contains("landscape") };
      if (is(k[0], "span.img-desc")) return { url: "", alt: "", desc: words(k[0]).replace(/^\[|\]$/g, ""), land: false };
      return no();
    });
    if (!ps.length || ps.length > 4) no();
    return ps;
  }
  // a bubble of pictures: the hidden name, the pictures, and whatever comes after them
  function galleryBack(d, pre) {
    var ks = kids(d), name = "";
    if (is(ks[0], "p.hide")) { var em = ks.shift().querySelector("em"); if (!em) no(); name = em.textContent.replace(/:$/, ""); }
    if (!is(ks[0], "p." + pre + "-photos")) no();
    return { name: name, photos: photosBack(ks.shift(), pre), rest: ks };
  }
  function labelOf(nodes) {
    var n = nodes[0];
    if (!is(n, "span.hide") || !n.querySelector("em")) return "";
    nodes.shift();
    return n.querySelector("em").textContent.replace(/:$/, "");
  }
  // the phone's owner: from the pov- class, or the first message they send
  function owner(b, name) {
    if (!char(b.pov)) b.pov = personByName(name, true).id;
    return char(b.pov);
  }
  function settings(b, el, app, more) {
    b.pov = ""; b.theme = ""; povOwner = "";
    el.classList.forEach(function (c) {
      if (c === "mob" || c === app) return;
      if (/^theme-(light|dark|auto)$/.test(c)) b.theme = c;
      else if (c === "wide") b.width = c;
      else if (c === "no-scroll") b.scroll = c;
      else if (/^pov-/.test(c) && (app === "imsg" || app === "wa")) { b.pov = personBySlug(c.slice(4)).id; povOwner = c.slice(4); }
      else if (!(more && more(c))) no();
    });
    if (!b.theme) no();
  }
  // the name and the line under it at the top of a chat
  function headBack(b, p) {
    var ks = kids(p), i = ks.findIndex(function (n) { return is(n, "span.hide") && n.textContent === " - "; });
    if (i < 0) no();
    var title = ks.slice(0, i), sub = ks.slice(i + 1);
    b.title = title.length === 1 && is(title[0], "span.name") ? "" : title.map(function (n) { return n.textContent; }).join("");
    b.sub = sub.length ? sub[0].textContent : "";
  }
  // the half-typed message in a message bar
  function barBack(b, field, ends) {
    var ns = inl(field).slice(0, -ends);
    b.bar = field.classList.contains("typed") ? "typed" : "empty";
    if (b.bar === "typed") {
      if (is(ns[ns.length - 1], "span.cursor")) { b.cursor = true; ns.pop(); }
      b.barText = textBack(ns);
    }
  }

  var READERS = {};
  READERS.imsg = function (els) {
    var el = els[0]; if (els.length !== 1) no();
    var b = newBlock("imsg"); settings(b, el, "imsg");
    var ks = kids(el), k = 0;
    if (!is(ks[k], "p.mob-header")) no();
    headBack(b, ks[k++]);
    var body = ks[k++]; if (!is(body, "div.mob-body")) no();
    b.bar = "none";
    if (is(ks[k], "p.imsg-footer")) { var f = ks[k++].querySelector(".imsg-field"); if (!f) no(); barBack(b, f, 2); }
    if (ks[k]) no();
    var who = null, m = null;
    kids(body).forEach(function (p) {
      var gal = is(p, "div.msg.gallery") ? galleryBack(p, "imsg") : null;
      if (!gal && !is(p, "p")) no();
      var cl = p.classList, ns = gal ? gal.rest : inl(p);
      if (cl.contains("mob-sys")) { b.msgs.push(m = newMsg("sys", textBack(ns))); who = null; return; }
      if (cl.contains("who")) { who = personIn(p); b.group = true; return; }
      if (cl.contains("imsg-edited") || cl.contains("imsg-edited-in")) { if (!m) no(); m.edited = true; return; }
      if (cl.contains("imsg-status")) { if (!m) no(); m.status = p.textContent; return; }
      if (!cl.contains("msg")) no();
      var out = cl.contains("out"); if (!out && !cl.contains("in")) no();
      if (cl.contains("typing-indicator")) {
        var em = p.querySelector(".hide em");
        var by = out ? owner(b, em ? em.textContent : "") : em ? personByName(em.textContent, true) : who;
        if (!by) no();
        m = newMsg("typing", ""); m.by = by.id; b.msgs.push(m); who = null; return;
      }
      var name = gal ? gal.name : labelOf(ns), from = out ? owner(b, name) : name ? personByName(name, true) : who;
      if (!from) no();
      m = newMsg(from.id, "");
      var taps = [];
      while (is(ns[ns.length - 1], "span.imsg-tap")) {
        var tap = ns.pop(), h = tap.querySelector(".hide"), r = h && h.textContent.match(/^ \[(.+) reacted $/); if (!r) no();
        taps.unshift({ by: (tap.classList.contains("me") ? char(b.pov) || no() : personByName(r[1], true)).id, emoji: tap.textContent.replace(h.textContent, "").replace(/\]$/, "") });
      }
      m.reacts = taps;
      if (gal) { if (ns.length) no(); m.photos = gal.photos; }
      else { m.text = textBack(ns); m.sms = cl.contains("sms"); }
      b.msgs.push(m);
    });
    return b;
  };

  // a one-off's colour and picture, from a round picture or a coloured name (only for someone new to the cast)
  var fresh = [];
  function looks(c, el) {
    if (!c || isProfile(c) || fresh.indexOf(c.id) < 0 || !el) return;
    var col = el.className.match(/(?:^|\s)colour(\d+)/); if (col) c.colour = col[1];
    if (!is(el, ".wa-pfp, .tw-pfp, .ig-pfp, [class*=-pfp]")) return;
    var img = el.querySelector("img");
    if (img) { c.pic = img.getAttribute("src"); c.alt = img.getAttribute("alt") || ""; c.land = img.classList.contains("landscape"); if (c.alt === "Profile picture of " + nameOf(c)) c.alt = ""; return; }
    var txt = words(el);
    c.showInitials = !!txt;
    if (txt) c.initials = txt === initials(Object.assign({}, c, { initials: "" })) ? "" : txt;
  }
  function freshChar(name) { var c = newChar(name); c.open = false; S.cast.push(c); fresh.push(c.id); return c; }
  // a WhatsApp group name: a profile, or typed (with "~ " and a phone number for someone not saved)
  function waWho(p) {
    if (p.querySelector("span.name[class*=pfp-]")) return personIn(p);
    var c = p.cloneNode(true), num = c.querySelector(".wa-no");
    c.querySelectorAll(".hide, .wa-no").forEach(function (x) { x.remove(); });
    var name = words(c).replace(/^~ /, ""), who = S.cast.filter(function (x) { return x.kind === "oneoff" && nameOf(x) === name; })[0] || freshChar(name);
    if (num && fresh.indexOf(who.id) >= 0) who.num = words(num);
    looks(who, p);
    return who;
  }
  READERS.wa = function (els) {
    var el = els[0]; if (els.length !== 1) no();
    var b = newBlock("wa");
    b.bg = "";
    settings(b, el, "wa", function (c) { if (/^bg-/.test(c) && BACKGROUNDS.indexOf(c.slice(3)) > 0) { b.bg = c.slice(3); return true; } });
    var ks = kids(el), k = 0;
    if (is(ks[k], "p.wa-wall")) { var w = ks[k++].querySelector("img"); if (!w) no(); b.bg = "custom"; b.wall = w.getAttribute("src"); }
    var bar = null;
    if (is(ks[k], "table.wa-header")) {
      bar = ks[k++]; b.header = "bar";
      var tt = bar.querySelector("td.wa-title"), st = bar.querySelector("td.wa-status"); if (!tt || !st) no();
      b.title = tt.querySelector("span.name") ? "" : tt.textContent; b.sub = st.textContent;
    } else if (is(ks[k], "p.mob-header")) { b.header = "simple"; headBack(b, ks[k++]); }
    else b.header = "none";
    var body = ks[k++]; if (!is(body, "div.mob-body")) no();
    b.bar = "none";
    if (is(ks[k], "p.wa-footer")) { var ph = ks[k++].querySelector(".wa-placeholder"); if (!ph) no(); b.bar = ph.classList.contains("typed") ? "typed" : "empty";
      if (b.bar === "typed") { var pn = inl(ph); if (is(pn[pn.length - 1], "span.cursor")) { b.cursor = true; pn.pop(); } b.barText = textBack(pn); } }
    if (ks[k]) no();
    var m = null, lastIn = null, rowless = false;
    kids(body).forEach(function (n) {
      if (is(n, "p.mob-sys")) { b.msgs.push(m = newMsg("sys", textBack(inl(n)))); return; }
      if (is(n, "p.wa-reacts")) {
        if (!m) no();
        var r = n.cloneNode(true), cnt = r.querySelector(".wa-count");
        r.querySelectorAll(".hide, .wa-count").forEach(function (x) { x.remove(); });
        m.waReacts = r.textContent.trim(); m.waCount = cnt ? cnt.textContent : ""; return;
      }
      var rowPfp = null;
      if (is(n, "div.wa-row")) {
        var rk = kids(n); b.group = true;
        if (is(rk[0], "p.wa-pfp")) rowPfp = rk.shift();
        if (rk.length !== 1) no();
        n = rk[0];
        if (is(n, "p.msg.typing-indicator")) {
          var rem = n.querySelector("span.hide em"); if (!rem || n.classList.contains("out")) no();
          var rby = personByName(rem.textContent, true); if (!rby) no(); looks(rby, rowPfp);
          b.msgs.push(m = newMsg("typing", "")); m.by = rby.id; return;
        }
      } else if (is(n, "div.msg.in") && (n.querySelector("p.who") || b.group)) rowless = true;
      else if (is(n, "p.msg.typing-indicator")) {
        var tem = n.querySelector("span.hide em"), tout = n.classList.contains("out"); if (!tem) no();
        var tby = tout ? owner(b, tem.textContent) : personByName(tem.textContent, true); if (!tby) no();
        b.msgs.push(m = newMsg("typing", "")); m.by = tby.id; return;
      }
      if (!is(n, "div.msg")) no();
      var out = n.classList.contains("out"); if (!out && !n.classList.contains("in")) no();
      var ns = kids(n), who = null, name = "";
      if (is(ns[0], "p.who")) { who = waWho(ns.shift()); b.group = true; looks(who, rowPfp); }
      if (n.classList.contains("typing-indicator")) {
        var em = n.querySelector(".hide em");
        var by = out ? owner(b, em ? em.textContent : "") : who || (em && personByName(em.textContent, true));
        if (!by) no();
        b.msgs.push(m = newMsg("typing", "")); m.by = by.id; return;
      }
      if (is(ns[0], "p.hide")) name = ns.shift().textContent.replace(/:$/, "");
      m = newMsg("", "");
      if (is(ns[0], "p.wa-fwd")) { m.fwd = true; ns.shift(); }
      var quote = is(ns[0], "p.wa-quote") ? ns.shift() : null;
      var main = ns.shift();
      if (!main) no();
      if (is(main, "p.wa-call")) {
        var ic = main.querySelector(".wa-call-ic"), cm = ic && ic.className.match(/ic-wa-(video|call)-(missed|out|in)/); if (!cm) no();
        m.call = cm[1] === "video" ? "video" : "voice"; m.missed = cm[2] === "missed";
        var len = main.querySelector(".wa-call-len"); m.callLen = m.missed || !len ? "" : len.textContent;
      } else if (is(main, "p.wa-contact")) {
        var cp = main.querySelector("span.wa-pfp, span"); if (!cp) no();
        var cslug = cp.className.match(/(?:^|\s)pfp-([a-z0-9-]+)/) || (cp.querySelector("[class*=pfp-]") || {}).className && cp.querySelector("[class*=pfp-]").className.match(/(?:^|\s)pfp-([a-z0-9-]+)/);
        var cc = cslug ? personBySlug(cslug[1]) : (function () { var x = main.cloneNode(true); x.querySelector("span").remove(); var nm = words(x); return S.cast.filter(function (c) { return c.kind === "oneoff" && nameOf(c) === nm; })[0] || freshChar(nm); })();
        looks(cc, cp); m.contact = cc.id;
        if (!is(ns[ns.length - 1], "p.wa-contact-btn")) no();
        ns.pop();
      } else if (is(main, "p.wa-photos")) {
        m.photos = photosBack(main, "wa");
        if (is(ns[0], "p.wa-caption")) m.text = textBack(inl(ns.shift()));
      } else if (is(main, "div.wa-link") || is(main, "p") && main.querySelector(".wa-link-text")) {
        var lk = { url: "", title: "", desc: "", img: "", alt: "", imgdesc: "", video: "", showUrl: false };
        if (!is(main, "div.wa-link")) { lk.url = words(main); lk.showUrl = true; main = ns.shift(); if (!is(main, "div.wa-link")) no(); }
        kids(main).forEach(function (x) {
          if (is(x, ".wa-link-img.video")) { var f = x.querySelector("iframe"); if (!f) no(); lk.video = f.getAttribute("src"); var vd = x.querySelector(".vid-desc"); if (vd) lk.imgdesc = words(vd).replace(/^\[|\]$/g, ""); }
          else if (is(x, "p.wa-link-img.text")) lk.imgdesc = words(x).replace(/^\[|\]$/g, "");
          else if (is(x, "p.wa-link-img")) { var im = x.querySelector("img"); if (!im) no(); lk.img = im.getAttribute("src"); lk.alt = im.getAttribute("alt") || ""; }
          else if (is(x, "p.wa-link-title")) lk.title = x.textContent;
          else if (is(x, "p.wa-link-desc")) lk.desc = x.textContent;
          else if (is(x, "p.wa-link-url")) { if (!lk.url) lk.url = x.textContent; }
          else no();
        });
        m.link = lk;
        if (is(ns[0], "p.wa-caption")) m.text = textBack(inl(ns.shift()));
      } else if (is(main, "p")) {
        if (main.className && main.className !== "wa-big") no();
        m.big = main.className === "wa-big";
        var tn = inl(main);
        if (!who) name = labelOf(tn) || no();
        m.text = textBack(tn);
      } else no();
      if (is(ns[0], "p.wa-time")) {
        var tm = ns.shift(), tick = tm.querySelector(".ic");
        m.tick = !tick ? "" : tick.classList.contains("ic-read") ? "read" : tick.classList.contains("ic-delivered") ? "delivered" : tick.classList.contains("ic-sent") ? "sent" : no();
        var tx = (tick ? tm.textContent.replace(tick.textContent, "") : tm.textContent).trim();
        if (/^Edited\b/.test(tx)) { m.edited = true; tx = tx.replace(/^Edited\s*/, ""); }
        m.time = tx;
      } else m.tick = "";
      if (ns.length) no();
      // who sent it
      var from = out ? owner(b, name) : who || (name ? personByName(name.replace(/^~ /, ""), true) : lastIn || (!b.group && b.title ? personByName(b.title, true) : null));
      if (!from) no();
      if (!out) { looks(from, rowPfp); lastIn = from; }
      m.from = from.id;
      if (quote) {
        var qb = quote.querySelector("b"), qw = quote.cloneNode(true); qw.querySelectorAll(".hide, b").forEach(function (x) { x.remove(); });
        var qtext = words(qw), qyou = qb && qb.textContent === "You";
        var q = b.msgs.slice().reverse().filter(function (x) {
          return char(x.from) && (qyou ? x.from === b.pov : x.from !== b.pov) && ((plain(x.text).trim() || (x.photos.length ? "Photo" : "")) === qtext);
        })[0];
        if (!q) no();
        m.replyTo = q.id;
      }
      b.msgs.push(m);
    });
    if (rowless) b.pics = false;
    // the picture at the top: the group's, or the other person's
    if (bar) {
      var gp = bar.querySelector("td.wa-pfp-cell p.wa-pfp"); if (!gp) no();
      if (b.group) {
        var gs = slugIn(gp);
        if (gs) b.gp.from = personBySlug(gs).id;
        else {
          var col = gp.className.match(/colour(\d+)/), gi = gp.querySelector("img");
          if (col) b.gp.colour = col[1];
          if (gi) { b.gp.pic = gi.getAttribute("src"); b.gp.alt = gi.getAttribute("alt") || ""; b.gp.land = gi.classList.contains("landscape"); }
          else { b.gp.showInitials = !!words(gp); b.gp.initials = words(gp); }
        }
      } else looks(others(b)[0], gp);
    }
    return b;
  };

  // a round picture into a group picture: a profile, or a one-off's colour, initials or picture
  function gpBack(b, el) {
    var gs = slugIn(el);
    if (gs) { b.gp.from = personBySlug(gs).id; return; }
    var col = el.className.match(/colour(\d+)/), gi = el.querySelector("img");
    if (col) b.gp.colour = col[1];
    if (gi) { b.gp.pic = gi.getAttribute("src"); b.gp.alt = gi.getAttribute("alt") || ""; b.gp.land = gi.classList.contains("landscape"); }
    else { b.gp.showInitials = !!words(el); b.gp.initials = words(el); }
  }
  READERS.twdm = function (els) {
    var el = els[0]; if (els.length !== 1) no();
    var b = newBlock("twdm"); settings(b, el, "twdm");
    var ks = kids(el), k = 0, head = ks[k++];
    if (!is(head, "p.mob-header")) no();
    var hp = head.querySelector(".tw-pfp"), hn = head.querySelector(".twdm-name"); if (!hp || !hn) no();
    b.title = hn.querySelector("span.name") ? "" : hn.textContent;
    var body = ks[k++]; if (!is(body, "div.mob-body")) no();
    b.bar = "none";
    if (is(ks[k], "p.twdm-footer")) { var f = ks[k++].querySelector(".twdm-field"); if (!f) no(); barBack(b, f, 2); }
    if (is(ks[k], "p.tw-nav")) {
      b.nav = true; var bd = ks[k++].querySelector(".tw-badge");
      if (bd) { var bc = bd.cloneNode(true); bc.querySelectorAll(".hide").forEach(function (x) { x.remove(); }); b.badge = bc.textContent; }
    }
    if (ks[k]) no();
    var m = null, quote = null;
    function bubbles(list, who) {
      list.forEach(function (p) {
        if (is(p, "p.mob-sys")) { b.msgs.push(m = newMsg("sys", textBack(inl(p)))); return; }
        if (is(p, "p.twdm-replied")) { quote = { to: p.textContent.replace(/^Replied to /, "") }; return; }
        if (is(p, "p.twdm-quote")) { if (!quote) no(); var qc = p.cloneNode(true); qc.querySelectorAll(".hide").forEach(function (x) { x.remove(); }); quote.text = qc.textContent; return; }
        if (is(p, "p.twdm-reacts")) { if (!m) no(); var rc = p.cloneNode(true); rc.querySelectorAll(".hide").forEach(function (x) { x.remove(); }); m.waReacts = rc.textContent; return; }
        if (is(p, "p.twdm-status")) { if (!m) no(); m.status = p.textContent; return; }
        if (is(p, "p.msg.typing-indicator")) {
          var tem = p.querySelector("span.hide em"), tout = p.classList.contains("out"); if (!tem || quote) no();
          var tby = who || (tout ? owner(b, tem.textContent) : personByName(tem.textContent, true)); if (!tby) no();
          b.msgs.push(m = newMsg("typing", "")); m.by = tby.id; return;
        }
        var gal = is(p, "div.msg.gallery") ? galleryBack(p, "twdm") : null;
        if (!gal && !is(p, "p.msg")) no();
        var cl = p.classList, out = cl.contains("out"); if (!out && !cl.contains("in")) no();
        var ns = gal ? gal.rest : inl(p), name = gal ? gal.name : labelOf(ns);
        var from = out ? owner(b, name) : name ? personByName(name, true) : who;
        if (!from) no();
        m = newMsg(from.id, "");
        if (gal) { if (ns.length) no(); m.photos = gal.photos; }
        else if (cl.contains("voice")) {
          var d = p.querySelector(".twdm-dur"); if (!d) no(); m.voice = d.textContent;
        } else m.text = textBack(ns);
        if (quote) {
          var q = b.msgs.slice().reverse().filter(function (x) {
            if (!char(x.from) || (quote.to === "you") !== (x.from === b.pov) || quote.to !== "you" && nameOf(char(x.from)) !== quote.to) return false;
            var qt = plain(x.text).trim() || (x.photos.length ? "Photo" : t(x.voice) ? "Voice message" : "");
            if (qt.length > 60) qt = qt.slice(0, 57).trim() + "...";
            return qt === quote.text;
          })[0];
          if (!q) no();
          m.replyTo = q.id; quote = null;
        }
        b.msgs.push(m);
      });
    }
    kids(body).forEach(function (n) {
      if (is(n, "div.twdm-row")) {
        var rk = kids(n); b.group = true;
        var pf = rk.shift(), wp = rk.shift(); if (!is(pf, "p.tw-pfp") || !is(wp, "p.who")) no();
        var who = personIn(wp); looks(who, pf);
        bubbles(rk, who);
      } else bubbles([n], null);
    });
    if (b.group) gpBack(b, hp); else looks(others(b)[0], hp);
    return b;
  };

  // DM reactions: the emoji, who reacted (hidden names and faces) and +N, or the emojis and a number
  function reactsBack(m, rx) {
    var rk = kids(rx), first = rk.shift(), last = rk.pop();
    if (!is(first, "span.hide") || first.textContent !== "[Reactions: " || !is(last, "span.hide") || last.textContent !== "]") no();
    if (rk.length === 1 && rk[0].nodeType === 3) {
      var nm = rk[0].nodeValue.match(/^(\S+?)(?: (\d+))?$/); if (!nm) no();
      m.waReacts = nm[1]; m.waCount = nm[2] || ""; return;
    }
    var em = rk.shift(), from = rk.shift();
    if (!em || em.nodeType !== 3 || !is(from, "span.hide")) no();
    var fm = from.textContent.match(/^ from (.+) $/); if (!fm) no();
    var plus = rk.length && rk[rk.length - 1].nodeType === 3 ? rk.pop().nodeValue.match(/^\+(\d+)$/) : null;
    rk.forEach(function (f) { if (!is(f, "span.ig-pfp")) no(); });
    var names = fm[1].split(/, | and /);
    if (rk.length > Math.min(names.length, 3)) no();
    m.waReacts = em.nodeValue;
    m.faces = names.map(function (n, i) {
      var f = rk[i], sl = f && slugIn(f), c = sl ? personBySlug(sl) : personByName(n, true);
      looks(c, f); return c.id;
    });
    var total = 3 + (plus ? +plus[1] : 0);
    m.waCount = plus && total !== names.length ? String(total) : "";
  }
  // a post or reel card in a DM: the buttons, the account line (with who shared it hidden), the picture and the caption.
  // quoted: the faded card above a reply, which says what's being replied to instead.
  function cardBack(d, m, quoted) {
    var ks = kids(d), reel = d.classList.contains("reel");
    if (d.classList.contains("quoted") !== !!quoted) no();
    m.hasPost = true; m.postReel = reel; m.postShare = m.postSave = false;
    if (is(ks[0], "p.igdm-post-btns")) {
      if (quoted) no();
      kids(ks.shift()).forEach(function (x) { if (is(x, "span.ic-share")) m.postShare = true; else if (is(x, "span.ic-save")) m.postSave = true; else no(); });
    }
    var by = ks.shift(); if (!is(by, "p.igdm-post-by")) no();
    var bk = kids(by), pf = bk.shift(), h = bk.shift(), acc = bk.shift(), end = bk.shift();
    if (!is(pf, "span.ig-pfp") || !is(h, "span.hide") || !is(acc, "b") || !is(end, "span.hide") || bk.length) no();
    var kind = reel ? "reel" : "post", em = h.querySelector("em"), name = "";
    if (quoted) { if (h.textContent !== "[Replying to a " + kind + " from " || end.textContent !== "]") no(); }
    else { if (!em || h.textContent !== em.textContent + " shared a " + kind + " from " || end.textContent !== ":") no(); name = em.textContent; }
    if (acc.querySelector("[class*=pfp-]")) m.postBy = igPerson(acc).id;
    else {
      m.postAcc = words(acc);
      var col = pf.className.match(/(?:^|\s)colour(\d+)/); m.postCol = col ? col[1] : "";
      m.postIni = words(pf) === m.postAcc.charAt(0).toUpperCase() ? "" : words(pf);
    }
    if (is(ks[0], "div.ig-carousel")) {
      var phs = Array.prototype.map.call(ks.shift().querySelectorAll(".ig-photo"), function (x) {
        var img = x.querySelector("img");
        return img ? { url: img.getAttribute("src"), alt: img.getAttribute("alt") || "", desc: "", land: img.classList.contains("landscape") } : { url: "", alt: "", desc: words(x).replace(/^\[|\]$/g, ""), land: false };
      });
      if (phs.length < 2) no();
      var f = phs.shift(); m.postImg = f.url; m.postAlt = f.alt; m.postDesc = f.desc; m.postLand = f.land; m.postMore = phs;
    } else if (is(ks[0], "p.igdm-post-img")) {
      var im = ks.shift(), img = im.querySelector("img");
      if (img) { m.postImg = img.getAttribute("src"); m.postAlt = img.getAttribute("alt") || ""; m.postLand = img.classList.contains("landscape"); }
      else if (im.classList.contains("text")) m.postDesc = words(im).replace(/^\[|\]$/g, "");
      else no();
    }
    if (is(ks[0], "p.igdm-post-caption")) { var cn = inl(ks.shift()); if (!is(cn[0], "b")) no(); cn.shift(); m.postCap = textBack(cn); }
    if (ks.length) no();
    return name;
  }
  // a link card in a DM: the buttons, the page's picture, the title (with the hidden name) and the website
  function linkBack(d, m) {
    var ks = kids(d);
    m.link = { url: "", showUrl: false, title: "", desc: "", img: "", alt: "", video: "", imgdesc: "" }; m.linkInfo = m.linkShare = false;
    if (is(ks[0], "p.igdm-post-btns")) kids(ks.shift()).forEach(function (x) { if (is(x, "span.ic-info")) m.linkInfo = true; else if (is(x, "span.ic-share")) m.linkShare = true; else no(); });
    if (is(ks[0], "p.igdm-link-img")) {
      var im = ks.shift(), img = im.querySelector("img");
      if (img) { m.link.img = img.getAttribute("src"); m.link.alt = img.getAttribute("alt") || ""; }
      else if (im.classList.contains("text")) m.link.imgdesc = words(im).replace(/^\[|\]$/g, "");
      else no();
    }
    var ti = ks.shift(), ur = ks.shift(); if (!is(ti, "p.igdm-link-title") || !is(ur, "p.igdm-link-url") || ks.length) no();
    var ns = inl(ti), name = labelOf(ns);
    m.link.title = ns.map(function (n) { return n.nodeType === 3 ? n.nodeValue : no(); }).join("").trim();
    m.link.url = words(ur);
    return name;
  }
  READERS.igdm = function (els) {
    var el = els[0]; if (els.length !== 1) no();
    var b = newBlock("igdm"); settings(b, el, "igdm");
    var ks = kids(el), head = ks[0], body = ks[1], k = 2;
    if (!is(head, "p.mob-header") || !is(body, "div.mob-body")) no();
    if (is(ks[k], "p.igdm-footer")) { var f = ks[k++].querySelector(".igdm-field"); if (!f) no(); barBack(b, f, 2); }
    if (ks[k]) no();
    // two pictures at the top, or rows with names: a group, even with no one else talking yet
    b.group = !!(head.querySelector("span.ig-collab") || body.querySelector("div.igdm-row"));
    // the messages first, so the people in the header pictures are already in the cast
    var m = null, shared = [], replies = [], quote = null, lastBubble = null;
    function line(p, who) {
      // a reactions pill belongs to the bubble (or card) just before it, on the same side
      if (is(p, "p.igdm-reacts")) {
        if (!lastBubble || quote || p.classList.contains("out") !== lastBubble.out) no();
        reactsBack(lastBubble.m, p); lastBubble = null; return;
      }
      lastBubble = null;
      if (is(p, "p.mob-sys")) { if (who || quote) no(); b.msgs.push(m = newMsg("sys", textBack(inl(p)))); return; }
      if (is(p, "p.igdm-status")) { if (!m || quote) no(); m.status = p.textContent; return; }
      // a reply: "Shane replied to you", then the message it answers, faded
      if (is(p, "p.igdm-replied")) { if (quote) no(); quote = { side: p.classList.contains("out") ? "out" : "in" }; return; }
      if (is(p, "div.igdm-post.quoted")) {
        if (!quote || quote.text != null || !p.classList.contains(quote.side)) no();
        var qp = newMsg("", ""); cardBack(p, qp, true); quote.post = qp; quote.text = ""; return;
      }
      if (is(p, "p.igdm-quote")) {
        if (!quote || quote.text != null || !p.classList.contains(quote.side)) no();
        quote.mine = p.classList.contains("mine"); quote.text = noHide(p).textContent; return;
      }
      if (is(p, "p.msg.typing-indicator")) {
        var tem = p.querySelector("span.hide em"), tout = p.classList.contains("out"); if (quote || !tem) no();
        var tby = who || (tout ? owner(b, tem.textContent) : personByName(tem.textContent, true)); if (!tby) no();
        b.msgs.push(m = newMsg("typing", "")); m.by = tby.id; return;
      }
      var card = is(p, "div.igdm-post"), lnk = is(p, "div.igdm-link"), sh = is(p, "p.igdm-shared"), out = p.classList.contains(sh ? "mine" : "out");
      var gal = is(p, "div.msg.gallery") ? galleryBack(p, "igdm") : null;
      if (!card && !lnk && !sh && !gal && !is(p, "p.msg")) no();
      if (!sh && !out && !p.classList.contains("in")) no();
      if (quote && (quote.text == null || !sh && quote.side !== (out ? "out" : "in"))) no();
      m = newMsg("", ""); m.faces = [];
      var name = "";
      if (card) name = cardBack(p, m);
      else if (lnk) name = linkBack(p, m);
      else if (gal) { if (gal.rest.length) no(); name = gal.name; m.photos = gal.photos; }
      else {
        var ns = inl(p); name = labelOf(ns);
        if (sh) { m.shared = true; m.storyText = textBack(ns); }
        else m.text = textBack(ns);
      }
      if (!sh) lastBubble = { m: m, out: out };
      if (who) m.from = who.id;
      else if (out) m.from = owner(b, name).id;
      else if (!name) no();
      else if (sh) shared.push([m, name]); // whose it is waits until the phone's owner is known
      else m.from = personByName(name, true).id;
      if (quote) { replies.push([m, quote]); quote = null; }
      b.msgs.push(m);
    }
    kids(body).forEach(function (n) {
      if (!is(n, "div.igdm-row")) { line(n, null); return; }
      var rk = kids(n), pf = is(rk[0], "span.ig-pfp") ? rk.shift() : null, wp = rk[0], who;
      if (!pf) b.pics = false;
      if (is(wp, "p.who")) { rk.shift(); who = igPerson(wp); }
      else if (is(wp, "p.igdm-replied")) {
        // a row starting with a reply has no name line: the name is in "RoseLandry replied to ..."
        var rn = noHide(wp).textContent.match(/^(.+?) replied(?: to |$)/), sl = pf && slugIn(pf); if (!rn) no();
        who = sl ? personBySlug(sl) : S.cast.filter(function (x) { return igName(x) === rn[1]; })[0];
        if (!who) { who = freshChar(rn[1]); if (igName(who) !== rn[1]) who.ighandle = rn[1]; }
      } else no();
      looks(who, pf);
      rk.forEach(function (p) { line(p, who); });
    });
    if (quote) no();
    // a shared post outside a row: in a group it's always the phone owner's, and in a chat between two it goes by the hidden name
    shared.forEach(function (x) {
      var me = char(b.pov);
      x[0].from = (me && (b.group || nameOf(me) === x[1]) ? me : b.group ? owner(b, x[1]) : personByName(x[1], true)).id;
    });
    // each reply answers the latest message before it that says what the quote says (the wording is checked when it's built again)
    replies.forEach(function (x) {
      var before = b.msgs.slice(0, b.msgs.indexOf(x[0])).reverse(), q = x[1];
      var same = function (y) { return ["postBy", "postAcc", "postImg", "postDesc", "postCap"].every(function (k) { return t(y[k]) === t(q.post[k]); }) && !y.postReel === !q.post.postReel; };
      var hit = before.filter(function (y) { return char(y.from) && (q.post ? y.hasPost && same(y) : (y.from === b.pov) === q.mine && igdmQuote(y) === q.text); })[0];
      if (!hit) no();
      x[0].replyTo = hit.id;
    });
    // the header: the app screen's buttons, the pictures, the name and tick, then the line under it
    var hk = kids(head), pics = [];
    if (is(hk[0], "span.igdm-back")) {
      if (!is(hk[1], "span.hide") || !is(hk[2], "span.igdm-calls") || !is(hk[3], "span.hide")) no();
      b.app = true; hk = hk.slice(4);
    }
    if (is(hk[0], "span.ig-collab")) { pics = kids(hk.shift()); if (pics.length !== 2) no(); b.group = true; }
    else if (is(hk[0], "span.ig-pfp")) pics = [hk.shift()];
    b.headPic = pics.length > 0;
    var dash = hk.findIndex(function (n) { return is(n, "span.hide") && n.textContent === " - "; });
    if (dash < 0) no();
    var name = hk.slice(0, dash), sub = hk.slice(dash + 1);
    if (sub.length > 1 || sub.length && !is(sub[0], "span")) no();
    b.sub = sub.length ? sub[0].textContent : "";
    if (is(name[name.length - 1], "span.igdm-chev")) { if (!b.group || kids(name.pop()).length) no(); }
    else if (b.group) b.chev = false;
    if (name.length > 2 && is(name[name.length - 1], "span.ig-tick") && is(name[name.length - 2], "span.hide")) { b.tick = true; name = name.slice(0, -2); }
    var o = others(b);
    if (name.length === 1 && is(name[0], "span.handle") && !b.group) { if (igPerson(name[0]) !== o[0]) no(); }
    else {
      b.title = name.map(function (n) { return n.textContent; }).join("");
      // the other person's username: someone new to the cast gets it as their Instagram username
      if (!b.group && o[0] && !isProfile(o[0]) && !/…$/.test(b.title) && (igName(o[0]) === b.title || fresh.indexOf(o[0].id) >= 0)) { if (igName(o[0]) !== b.title) o[0].ighandle = b.title; b.title = ""; }
      if (b.group && b.title === "Group chat") b.title = "";
    }
    if (!b.group && o[0]) looks(o[0], pics[0]);
    b.faces = pics.map(function (p) { return byCircle(p).id; });
    // whoever's picked automatically doesn't need picking
    var auto = igdmFaces(Object.assign({}, b, { faces: [] })).map(function (c) { return c.id; });
    if (auto.join() === b.faces.join()) b.faces = [];
    return b;
  };

  // a number on a tweet's button, without its icon and hidden words
  function countOf(el) { var c = el.cloneNode(true); c.querySelectorAll(".hide, .ic, .on").forEach(function (x) { x.remove(); }); return words(c); }
  function noHide(el) { var c = el.cloneNode(true); c.querySelectorAll(".hide").forEach(function (x) { x.remove(); }); return c; }
  // who posted a tweet, from its top line
  function tweeter(top, m) {
    var nm = top.querySelector(".tw-name"), hd = top.querySelector(".tw-handle"), pf = top.querySelector(".tw-pfp"); if (!nm || !hd || !pf) no();
    var ps = nm.querySelector("span.name[class*=pfp-]"), c;
    if (ps) {
      c = personBySlug(ps.className.match(/pfp-([a-z0-9-]+)/)[1]);
      var acc = ps.className.match(/(?:^|\s)acc-([a-z0-9-]+)/); m.acc = acc ? acc[1] : "";
      if (!acc) {
        var hn = nm.querySelector(".hide"), hh = hd.querySelector(".hide");
        if (hn && hn.textContent !== twName(c)) learn(c, "tw", "name", hn.textContent);
        if (hh && hh.textContent.replace(/^@/, "") !== twHandle(c)) learn(c, "tw", "handle", hh.textContent.replace(/^@/, ""));
      }
    } else {
      var sp = nm.querySelector("span"); if (!sp) no();
      c = personByName(sp.textContent, false);
      var h = hd.textContent.replace(/^@/, "");
      if (fresh.indexOf(c.id) >= 0 && h !== nameOf(c).replace(/\s+/g, "")) c.handle = h;
      looks(c, pf);
    }
    m.verified = !!nm.querySelector(".tw-tick");
    m.locked = !!top.querySelector(".tw-lock");
    var tm = top.querySelector(".tw-time"); m.time = tm ? tm.textContent.replace(/^·\s*/, "") : "";
    var fan = top.querySelector(".tw-fan");
    if (fan) { m.fanMask = !!fan.querySelector(".ic-tw-fan"); var fc = fan.cloneNode(true); fc.querySelectorAll(".ic").forEach(function (x) { x.remove(); }); m.fan = words(fc); }
    return c;
  }
  function tweetBack(b, div, kind) {
    var ks = kids(div), m = newMsg("", "");
    ["hasPoll", "hasQuote", "hasNote", "hasPics", "hasVideo"].forEach(function (k) { m[k] = false; });
    m.likeClick = false; m.views = "-";
    var replying = kind === "reply" && is(ks[0], "p.tw-replying") ? ks.shift().textContent.replace(/^Replying to @/, "") : null;
    if (!is(ks[0], "p.tw-top")) no();
    var c = tweeter(ks.shift(), m); m.from = c.id;
    if (replying !== null) {
      var to = b.msgs.slice().reverse().filter(function (x) { var xc = char(x.from); return xc && twHandle(xc, accOf(xc, x.acc, "tw")) === replying; })[0];
      if (!to) no();
      m.replyTo = to.from;
    }
    if (is(ks[0], "p.tw-label")) m.label = ks.shift().textContent;
    if (kind === "reply" ? is(ks[0], "p") && !ks[0].className : is(ks[0], "p.tw-text")) m.text = textBack(inl(ks.shift()));
    // a poll: still open, or with its results
    if (is(ks[0], "p.tw-opt")) {
      m.hasPoll = true;
      var lines = [], res = ks[0].classList.contains("results");
      while (is(ks[0], "p.tw-opt")) {
        var o = ks.shift();
        if (!res) { lines.push(o.textContent); continue; }
        var bar = o.querySelector(".tw-bar"), pct = o.querySelector(".tw-pct"); if (!bar || !pct) no();
        if (bar.querySelector(".tw-voted")) { m.pollShowVote = true; m.pollVoted = String(lines.length); }
        lines.push(noHide(bar).textContent.replace(/\s*✓$/, "") + " " + pct.textContent);
      }
      m.poll = lines.join("\n"); m.pollKind = res ? "results" : "open";
      if (is(ks[0], "p.tw-pollinfo")) m.pollinfo = ks.shift().textContent;
    }
    // a poll readers can tap: the open poll, and the results with their vote once tapped
    if (is(ks[0], "details.tw-vote")) {
      m.hasPoll = true; m.pollKind = "tap"; m.pollTap = true;
      var dv = ks.shift(), sum = dv.querySelector("summary"); if (!sum) no();
      var si = sum.querySelector(".tw-pollinfo"); if (si) m.pollinfo = si.textContent;
      m.poll = Array.prototype.map.call(dv.querySelectorAll(":scope > p.tw-opt"), function (o, i) {
        var bar = o.querySelector(".tw-bar"), pct = o.querySelector(".tw-pct"); if (!bar || !pct) no();
        if (bar.querySelector(".tw-voted")) m.pollVote = String(i);
        return noHide(bar).textContent.replace(/\s*✓$/, "") + " " + pct.textContent;
      }).join("\n");
    }
    if (is(ks[0], "div.tw-photos.video")) {
      m.hasVideo = true; var f = ks[0].querySelector("iframe"); if (!f) no();
      m.vUrl = f.getAttribute("src"); m.vTitle = f.getAttribute("title") || "";
      var vd = ks.shift().querySelector(".vid-desc"); if (vd) m.vDesc = words(vd).replace(/^\[|\]$/g, "");
    } else if (is(ks[0], "p.tw-photos")) {
      m.hasPics = true;
      var med = ks.shift(), cells = med.querySelectorAll(".tw-photo");
      m.photos = (cells.length ? Array.prototype.slice.call(cells) : [med]).map(function (cell) {
        var img = cell.querySelector("img");
        return img ? { url: img.getAttribute("src"), alt: img.getAttribute("alt") || "", desc: "", land: img.classList.contains("landscape") } : { url: "", alt: "", desc: words(cell).replace(/^\[|\]$/g, ""), land: false };
      });
    }
    if (is(ks[0], "p.tw-warn")) { m.warn = true; ks.shift(); }
    if (is(ks[0], "p.tw-quote")) {
      m.hasQuote = true;
      var qn = inl(ks.shift()), qb = qn.shift(); if (!is(qb, "b")) no();
      m.qName = qb.textContent;
      if (qn[0] && qn[0].nodeType === 3 && !qn[0].nodeValue.trim()) qn.shift();
      if (is(qn[0], "span.tw-handle")) m.qHandle = qn.shift().textContent.replace(/^@/, "");
      if (!is(qn[0], "br")) no(); qn.shift();
      m.qText = textBack(qn);
    }
    if (is(ks[0], "p.tw-note")) { m.hasNote = true; m.note = ks.shift().textContent; }
    if (is(ks[0], "p.tw-date")) m.date = ks.shift().textContent;
    var st = ks.shift(); if (!is(st, "div.tw-stats") || ks.length) no();
    kids(st).forEach(function (x) {
      var ic = x.querySelector(".ic"), what = ic ? (ic.className.match(/ic-tw-(\w+)/) || [])[1] : ""; if (!what) no();
      if (what === "reply") m.replies = countOf(x);
      else if (what === "repost") { if (x.classList.contains("locked")) { if (!m.locked) m.noRepost = true; } else { m.reposted = x.classList.contains("reposted"); m.reposts = countOf(x); } }
      else if (what === "like") {
        if (is(x, "details")) { m.likeClick = true; m.liked = x.open; var off = x.querySelector(".off"); m.likes = off ? words(off) : ""; }
        else { m.liked = x.classList.contains("liked"); m.likes = countOf(x); }
      } else if (what === "views") m.views = countOf(x);
      else if (what === "bookmark") { if (is(x, "details")) { m.saveClick = true; m.saved = x.open; } else m.saved = x.classList.contains("saved"); }
      else if (what !== "share") no();
    });
    return m;
  }
  function twLook(b, c) { if (c === "tw2020") { b.era = c; return true; } }
  READERS.twone = function (els) {
    var b = newBlock("twone"); settings(b, els[0], "tw");
    els.forEach(function (el) { b.msgs.push(tweetBack(b, el, "feed")); });
    return b;
  };
  READERS.tw = function (els) {
    var el = els[0]; if (els.length !== 1) no();
    var app = el.classList.contains("app"), b = newBlock(app ? "twfeed" : "twthread");
    settings(b, el, "tw-feed", function (c) { return twLook(b, c) || app && c === "app"; });
    var ks = kids(el), sc = ks.shift(); if (!is(sc, "div.tw-scroll")) no();
    var inner = kids(sc), me = null;
    if (app) {
      var top = inner.shift(); if (!is(top, "p.tw-header")) no();
      me = top.querySelector(".tw-me");
      if (is(inner[0], "p.tw-tabs")) b.tabs = Array.prototype.slice.call(inner.shift().querySelectorAll(".tw-tab")).slice(2).map(function (x) { return x.textContent; }).join("\n");
      inner.forEach(function (d) { if (!is(d, "div.mob.tw")) no(); b.msgs.push(tweetBack(b, d, "feed")); });
      // whose phone: a profile from its class, or whoever has that picture
      var ms = me && slugIn(me);
      if (ms) b.pov = personBySlug(ms).id;
      else if (me) { var hit = S.cast.filter(function (c) { return canon(circle("tw-me", c)) === canon(me.outerHTML); })[0]; if (hit) b.pov = hit.id; }
    } else {
      inner.forEach(function (d, i) { if (!is(d, i ? "div.mob.tw-reply" : "div.mob.tw")) no(); b.msgs.push(tweetBack(b, d, i ? "reply" : "main")); });
      b.bar = is(ks[0], "p.tw-reply-bar") ? (ks.shift(), "empty") : "none";
      if (b.msgs[0]) b.pov = b.msgs[0].from;
    }
    if (ks.length) no();
    return b;
  };

  // Instagram: someone by their username, a profile's class, or the picture they have
  function igPerson(el) {
    var ps = is(el, "[class*=pfp-]") ? el : el.querySelector("[class*=pfp-]");
    if (ps) {
      var pc = personBySlug(ps.className.match(/(?:^|\s)pfp-([a-z0-9-]+)/)[1]), ph = ps.querySelector(".hide");
      if (ph && !/(?:^|\s)acc-/.test(ps.className) && is(ps, ".handle") && ph.textContent !== igName(pc)) learn(pc, "ig", "handle", ph.textContent);
      return pc;
    }
    var nm = words(noHide(el)), c = S.cast.filter(function (x) { return x.kind === "oneoff" && igName(x) === nm; })[0];
    if (!c) { c = freshChar(nm); if (igName(c) !== nm) c.ighandle = nm; }
    return c;
  }
  function byCircle(el) {
    var s = slugIn(el); if (s || el.querySelector("[class*=pfp-]")) return personBySlug(s);
    var c = S.cast.filter(function (x) { return canon(circle(el.className.replace(/\s*colour\d+/, ""), x, null)) === canon(el.outerHTML); })[0];
    if (c) return c;
    // someone only seen as a picture: they're added to the cast with their initials as their name
    c = freshChar(words(el) || "Someone"); looks(c, el);
    return c;
  }
  function igPostBack(b, div) {
    var ks = kids(div), m = newMsg("", "");
    m.likesLine = "count"; m.faces = []; m.tags = []; m.collabs = []; m.follow = ""; m.shape = "";
    var top = ks.shift(); if (!is(top, "p.ig-top")) no();
    var ns = kids(top), k = 0;
    function take(sel) { if (is(ns[k], sel)) return ns[k++]; return null; }
    function marks() { // a tick and a padlock after a name
      var tick = false, lock = false;
      while (is(ns[k], "span.hide") && is(ns[k + 1], "span.ig-tick, span.ig-lock")) { if (ns[k + 1].classList.contains("ig-tick")) tick = true; else lock = true; k += 2; }
      return { tick: tick, lock: lock };
    }
    if (!take("span.ig-menu")) no();
    if (take("span.ig-follow-btn")) m.follow = "button";
    var col = take("span.ig-collab"), pic = col ? col.querySelector(".ig-pfp") : take("span.ig-pfp"); if (!pic) no();
    m.story = pic.classList.contains("story");
    var nm = ns[k++]; if (!nm) no();
    // a name typed over a profile's picture (often cut short with "…") belongs to that profile
    var c = nm.nodeType === 3 && slugIn(pic) ? (m.nameAs = nm.nodeValue.trim(), personBySlug(slugIn(pic))) : nm.nodeType === 3 ? (function () { var x = S.cast.filter(function (x) { return x.kind === "oneoff" && igName(x) === nm.nodeValue.trim(); })[0]; if (!x) { x = freshChar(nm.nodeValue.trim()); if (igName(x) !== nm.nodeValue.trim()) x.ighandle = nm.nodeValue.trim(); } return x; })() : igPerson(nm);
    var acc = nm.nodeType === 1 && nm.className.match(/(?:^|\s)acc-([a-z0-9-]+)/); m.acc = acc ? acc[1] : "";
    looks(c, pic); m.from = c.id;
    var mk = marks(); m.verified = mk.tick; m.locked = mk.lock;
    if (col) {
      // "and" someone, or "and 2 others" with their names hidden
      if (!take("span.hide") || !take("span.ig-and") || !take("span.hide")) no();
      var pics = col.querySelectorAll(".ig-pfp");
      if (is(ns[k], "span.hide")) no();
      var rest = ns[k++];
      if (rest && rest.nodeType === 3 && /^\d+ others$/.test(rest.nodeValue.trim())) {
        var hid = take("span.hide"); if (!hid) no();
        m.collabs = hid.textContent.replace(/^ \(|\)$/g, "").split(", ").map(function (n) {
          var x = S.cast.filter(function (y) { return igName(y) === n; })[0] || (function () { var f = freshChar(n); if (igName(f) !== n) f.ighandle = n; return f; })();
          return { who: x.id, tick: false };
        });
        looks(char(m.collabs[0].who), pics[1]);
      } else {
        var cas = rest.nodeType === 3 && slugIn(pics[1]) ? rest.nodeValue.trim() : "";
        var co = cas ? personBySlug(slugIn(pics[1])) : rest.nodeType === 3 ? (function () { var n = rest.nodeValue.trim(), x = S.cast.filter(function (y) { return y.kind === "oneoff" && igName(y) === n; })[0]; if (!x) { x = freshChar(n); if (igName(x) !== n) x.ighandle = n; } return x; })() : igPerson(rest);
        looks(co, pics[1]);
        m.collabs = [{ who: co.id, tick: marks().tick, as: cas }];
      }
    }
    if (is(ns[k], "span.hide") && is(ns[k + 1], "span.ig-follow")) { m.follow = "link"; k += 2; }
    if (is(ns[k], "span.hide") && is(ns[k + 1], "span")) { var u = ns[k + 1].textContent; m.song = /^♫ /.test(u); m.under = u.replace(/^♫ /, ""); k += 2; }
    if (k !== ns.length) no();
    // the photo, or a carousel of them
    if (is(ks[0], "p.ig-photo, div.ig-carousel")) {
      var pe = ks.shift(), phs = is(pe, "p") ? [pe] : Array.prototype.slice.call(pe.querySelectorAll(".ig-photo"));
      var shape = (phs[0].className.match(/(?:^|\s)(square|portrait)(?:\s|$)/) || [])[1]; m.shape = shape === "square" ? "sq" : shape || "";
      m.photos = phs.map(function (x) {
        var img = x.querySelector("img");
        return img ? { url: img.getAttribute("src"), alt: img.getAttribute("alt") || "", desc: "", land: img.classList.contains("landscape") } : { url: "", alt: "", desc: words(x).replace(/^\[|\]$/g, ""), land: false };
      });
    }
    if (is(ks[0], "details.ig-tagged")) {
      m.tags = Array.prototype.map.call(ks.shift().querySelectorAll("p.ig-person"), function (p) {
        var fb = p.querySelector(".ig-following"), pc = p.querySelector(".ig-pfp"), hn = p.querySelector(".handle"); if (!pc || !hn) no();
        var pn = p.querySelector(".ig-person-name"), who;
        if (hn.querySelector("[class*=pfp-]") || is(hn, "[class*=pfp-]") || !pn) who = igPerson(hn);
        else { // a one-off: their name, and their username if it isn't the usual one made from it
          var h = words(hn), n = words(pn);
          who = S.cast.filter(function (x) { return x.kind === "oneoff" && nameOf(x) === n && igName(x) === h; })[0];
          if (!who) { who = freshChar(n); if (igName(who) !== h) who.ighandle = h; }
        }
        looks(who, pc);
        return { who: who.id, fol: !fb ? "none" : fb.classList.contains("blue") ? "follow" : "following", tick: !!p.querySelector(".ig-tick"), lock: !!p.querySelector(".ig-lock") };
      });
    }
    var act = ks.shift(); if (!is(act, "div.ig-stats")) no();
    kids(act).forEach(function (x) {
      var cnt = x.querySelector(".ig-count:not(.on)");
      if (is(x, "details.like")) { m.likeClick = true; m.liked = x.open; m.likes = cnt ? cnt.textContent : ""; }
      else if (is(x, "details.save")) m.saved = x.open;
      else if (x.querySelector(".ic-heart")) { m.likeClick = false; m.likes = cnt ? cnt.textContent : ""; }
      else if (x.querySelector(".comment")) m.cmCount = cnt ? cnt.textContent : "";
      else if (x.querySelector(".ic-repost")) m.reposts = cnt ? cnt.textContent : "";
      else if (!x.querySelector(".ic-share")) no();
    });
    if (is(ks[0], "p.ig-likes")) {
      var ll = ks.shift();
      if (ll.classList.contains("liked-by")) { m.likesLine = "faces"; m.faces = Array.prototype.map.call(ll.querySelectorAll(".ig-like-pfp"), function (f) { return byCircle(f).id; }); }
    } else if (t(m.likes)) m.likesLine = "none";
    if (is(ks[0], "p.ig-caption")) {
      var cn = inl(ks.shift()); if (!is(cn[0], "b")) no(); cn.shift();
      if (is(cn[cn.length - 1], "span.ig-more")) { m.more = true; cn.pop(); var lt = cn[cn.length - 1]; if (!lt || lt.nodeType !== 3) no(); lt.nodeValue = lt.nodeValue.replace(/\.\.\. $/, ""); }
      m.text = textBack(cn);
    }
    if (is(ks[0], "p.ig-viewall")) { m.viewAll = true; ks.shift(); }
    var lines = [];
    while (is(ks[0], "p.ig-comment")) {
      var cm = inl(ks.shift()), who = is(cm[0], "b") ? cm.shift() : null;
      if (who) { var wc = who.querySelector("[class*=pfp-]") ? igPerson(who) : null; lines.push((wc ? nameOf(wc) : words(who)) + ": " + textBack(cm)); }
      else lines.push(textBack(cm));
    }
    m.comments = lines.join("\n");
    if (is(ks[0], "p.ig-time")) m.time = ks.shift().textContent;
    if (ks.length) no();
    return m;
  }
  READERS.ig = function (els) {
    var feed = els[0].classList.contains("ig-feed"), b = newBlock(feed ? "igfeed" : "igone");
    if (!feed) {
      settings(b, els[0], "ig");
      els.forEach(function (el) { b.msgs.push(igPostBack(b, el)); });
      return b;
    }
    if (els.length !== 1) no();
    settings(b, els[0], "ig", function (c) { return c === "ig-feed"; });
    var ks = kids(els[0]);
    b.top = "none"; b.myStory = false;
    if (is(ks[0], "p.ig-header")) b.top = ks.shift().querySelector(".ig-badge") ? "new" : "plain";
    if (is(ks[0], "div.ig-stories")) {
      b.stories = Array.prototype.map.call(ks.shift().querySelectorAll("p.ig-story"), function (p) {
        var pc = p.querySelector(".ig-pfp"), sn = p.querySelector(".ig-story-name"); if (!pc || !sn) no();
        if (p.classList.contains("me")) { b.myStory = true; b.pov = byCircle(pc).id; return ""; }
        var ring = p.classList.contains("close") ? " (close)" : p.classList.contains("plain") ? " (seen)" : "";
        var c = S.cast.filter(function (x) { return igName(x) === sn.textContent; })[0];
        return (c ? nameOf(c) : sn.textContent) + ring;
      }).filter(Boolean).join("\n");
    }
    ks.forEach(function (d) { if (!is(d, "div.mob.ig")) no(); b.msgs.push(igPostBack(b, d)); });
    return b;
  };

  // ---------- one part per line ----------
  // Each chat is laid out the same way as the tutorial's examples (the Megaskin's fmt.py): an element with words in it
  // stays on one line; one with a block inside puts every child on its own line, two spaces in; one with only inline
  // children splits only if its kind is on the list below (tested to look the same split or not, on the site and on AO3)
  // and one of them has a class. A hidden span that isn't first stays on the end of the line before it.
  var SPLIT_SAFE = ["p.dc-photos", "p.dc-photos.one", "p.dc-photos.three", "p.dc-photos.two", "p.hide", "p.ig-header", "p.ig-photo.real", "p.ig-story", "p.ig-story.close", "p.ig-story.me", "p.igdm-link-img", "p.igdm-photos", "p.igdm-photos.one", "p.igdm-photos.three", "p.igdm-photos.two", "p.igdm-post-img", "p.imsg-photos", "p.imsg-photos.one", "p.imsg-photos.three", "p.imsg-photos.two", "p.tb-blog", "p.tb-header", "p.tb-nav", "p.tb-row", "p.tb-stats", "p.tb-tabs", "p.tb-top", "p.tw-header", "p.tw-nav", "p.tw-opt.results.p10", "p.tw-opt.results.p25", "p.tw-opt.results.p30", "p.tw-opt.results.p60", "p.tw-opt.results.win.p75", "p.tw-pfp", "p.tw-photos", "p.tw-photos.four", "p.tw-photos.three", "p.tw-photos.two", "p.tw-stat", "p.tw-stat.locked", "p.tw-stat.tw-end", "p.tw-stat.tw-end.saved", "p.tw-tabs", "p.twc-reply-bar", "p.twdm-photos", "p.twdm-photos.one", "p.twdm-photos.three", "p.twdm-photos.two", "p.wa-footer", "p.wa-link-img", "p.wa-pfp", "p.wa-photos.four", "p.wa-photos.one", "p.wa-photos.three", "p.wa-photos.two", "p.wa-wall", "span.badged", "span.dc-embed-text", "span.dc-quote", "span.gm-pfp", "span.handle.acc-rpf", "span.hide", "span.ig-badge", "span.ig-like-pfp", "span.ig-pfp.story", "span.pfp", "span.tb-ask-pfp", "span.tb-follow", "span.tb-name", "span.tb-pfp", "span.tb-pfp.reblog", "span.tb-stat", "span.tw-me", "span.tw-pfp", "span.tw-photo", "span.wa-pfp", "span.wa-photo", "td.gm-star"];
  var FMT_BOXES = "mob dc tw-feed ig-feed tb-feed twc12-feed twc16-feed tw tw-reply ig igdm tb gm mail twdm wa imsg twc12 twc16".split(" ");
  var FMT_BLOCK = "div p table thead tbody tr td th ul ol li details summary blockquote h1 h2 h3 h4 h5 h6 pre hr".split(" ");
  var FMT_VOID = ["img", "br", "hr", "input"];
  function fmtParse(text) {
    var root = { kind: "root", kids: [] }, stack = [root], i = 0, re = /<!--[\s\S]*?-->|<[^>]+>/g, m;
    function addText(a, b) { if (b > a) stack[stack.length - 1].kids.push({ kind: "text", raw: text.slice(a, b), start: a, end: b }); }
    while ((m = re.exec(text))) {
      addText(i, m.index); i = re.lastIndex; var tk = m[0];
      if (/^<!/.test(tk)) { stack[stack.length - 1].kids.push({ kind: "text", raw: tk, start: m.index, end: i }); continue; }
      if (/^<\//.test(tk)) {
        var name = tk.slice(2, -1).trim().toLowerCase(), top = stack[stack.length - 1];
        if (top.kind !== "el" || top.tag !== name) return null;
        stack.pop(); top.close = tk; top.end = i; continue;
      }
      var tg = (tk.match(/^<\s*([a-zA-Z0-9]+)/) || [])[1], cm = tk.match(/class="([^"]*)"/);
      var n = { kind: "el", raw: tk, start: m.index, end: i, kids: [], close: "", tag: (tg || "").toLowerCase(), classes: cm ? cm[1].split(/\s+/).filter(Boolean) : [] };
      stack[stack.length - 1].kids.push(n);
      if (FMT_VOID.indexOf(n.tag) < 0 && !/\/>$/.test(tk)) stack.push(n);
    }
    addText(i, text.length);
    return stack.length === 1 ? root : null;
  }
  function fmtSig(n) { return n.tag + "." + n.classes.filter(function (c) { return !/^(colour\d+|pfp-.*|pov-.*|theme-.*)$/.test(c); }).join("."); }
  function fmtWs(n) { return n.kind === "text" && !n.raw.trim(); }
  function fmtOne(n) {
    if (n.kind === "text") return n.raw.replace(/\s*\n\s*/g, " ");
    var inner = n.kids.map(fmtOne).join("");
    if (FMT_BLOCK.indexOf(n.tag) >= 0) inner = inner.trim();
    return n.raw + inner + n.close;
  }
  function fmtLines(n, ind) {
    var pad = new Array(ind + 1).join(" ");
    if (n.kind === "text") return [pad + fmtOne(n).trim()];
    var kids = n.kids.filter(function (k) { return !fmtWs(k); });
    var words = kids.some(function (k) { return k.kind === "text"; });
    var blocky = kids.some(function (k) { return k.kind === "el" && FMT_BLOCK.indexOf(k.tag) >= 0; });
    if (n.tag === "pre") return null;
    var named = kids.some(function (k) { return k.kind === "el" && k.classes.length; });
    if (!kids.length || words && !blocky || !words && !blocky && (SPLIT_SAFE.indexOf(fmtSig(n)) < 0 || !named)) return [pad + fmtOne(n).trim()];
    if (words) return null;
    var out = [pad + n.raw], gap = [];
    for (var j = 0; j + 1 < n.kids.length; j++) { var a = n.kids[j]; if (fmtWs(a) && (a.raw.match(/\n/g) || []).length > 1 && j > 0) gap.push(n.kids[j + 1]); }
    for (var k = 0; k < kids.length; k++) {
      var c = kids[k];
      if (gap.indexOf(c) >= 0 && out.length > 1) out.push("");
      if (k && c.tag === "span" && c.classes.indexOf("hide") >= 0 && out.length > 1) { out[out.length - 1] += fmtOne(c); continue; }
      var sub = fmtLines(c, ind + 2);
      if (!sub) return null;
      out = out.concat(sub);
    }
    return out.concat([pad + n.close]);
  }
  // the chat boxes in some HTML, each laid out one part per line (anything it can't lay out stays as it is)
  function onePerLine(text) {
    var tree = fmtParse(text); if (!tree) return text;
    var reps = [];
    (function walk(n) {
      n.kids.forEach(function (k) {
        if (k.kind !== "el" || k.tag === "pre") return;
        if (k.classes.some(function (c) { return FMT_BOXES.indexOf(c) >= 0; })) { var sub = fmtLines(k, 0); if (sub) reps.push([k.start, k.end, sub.join("\n")]); }
        else walk(k);
      });
    })(tree);
    reps.sort(function (x, y) { return y[0] - x[0]; }).forEach(function (r) { text = text.slice(0, r[0]) + r[2] + text.slice(r[1]); });
    return text;
  }
  function blockHTML(b) { return b.type === "raw" ? t(b.html) : onePerLine(appHTML(b)); }
  function appHTML(b) {
    var pov = char(b.pov);
    povOwner = (b.type === "imsg" || b.type === "wa") && isProfile(pov) ? slugOf(pov) : "";
    if (b.type === "imsg") return imsgHTML(b);
    if (b.type === "wa") return waHTML(b);
    if (b.type === "twthread") return twThreadHTML(b);
    if (b.type === "twfeed" || b.type === "twone") return twFeedHTML(b);
    if (b.type === "twdm") return twdmHTML(b);
    if (b.type === "igfeed" || b.type === "igone") return igFeedHTML(b);
    if (b.type === "igdm") return igdmHTML(b);
    return "";
  }
  // which app a piece of HTML is from, by the Megaskin's classes
  function appOf(el) {
    if (is(el, ".mob.imsg")) return "imsg";
    if (is(el, ".mob.wa")) return "wa";
    if (is(el, ".mob.twdm")) return "twdm";
    if (is(el, ".mob.igdm")) return "igdm";
    if (is(el, ".tw-feed")) return "tw";
    if (is(el, ".mob.tw")) return "twone";
    if (is(el, ".mob.ig")) return "ig";
    return "";
  }
  function rawBlock(html) { var b = newBlock("raw"); b.html = html.trim(); return b; }
  // one chat's HTML into a block, or null if it isn't one this builder makes in just that way
  function readChat(els) {
    var keep = JSON.stringify(S.cast), html = els.map(function (e) { return e.outerHTML; }).join("\n");
    fresh = [];
    try {
      // everyone with a profile class comes first, so a name typed in a hidden label can be matched to them
      els.forEach(function (e) {
        [e].concat(Array.prototype.slice.call(e.querySelectorAll("[class*=pfp-]"))).forEach(function (x) {
          (x.className.match(/(?:^|\s)pfp-[a-z0-9-]+/g) || []).forEach(function (c) {
            var p = personBySlug(c.trim().slice(4)), h = x.querySelector(":scope > .hide");
            // a profile with no CSS here yet goes by the name in its hidden text
            if (is(x, "span.name") && h && !p.name.trim() && p.unknown) { p.name = h.textContent; p.orig = JSON.stringify(profileData(p)); }
          });
        });
      });
      var b = READERS[appOf(els[0])](els);
      tlCount = 0;
      if (canon(blockHTML(b)) === canon(html)) return b;
    } catch (e) { /* not one we can read */ }
    S.cast = JSON.parse(keep);
    return null;
  }
  // a chat made before the skin's class names changed: the same chat with each old name swapped for its new one
  // (from class-names.js), or null if it has none of the old names
  function renamedEls(els) {
    var renames = typeof MEGASKIN_RENAMES !== "undefined" ? MEGASKIN_RENAMES : [], gone = typeof MEGASKIN_REMOVED !== "undefined" ? MEGASKIN_REMOVED : [], hit = false;
    var out = els.map(function (e) {
      var c = e.cloneNode(true);
      [c].concat(Array.prototype.slice.call(c.querySelectorAll("[class]"))).forEach(function (x) {
        if (!x.getAttribute("class")) return;
        // classes that were taken out go, and each of the rest goes through the renames in order, oldest first,
        // so a name renamed twice ends up with its newest name, and a name given back out isn't swapped again
        var cls = x.getAttribute("class").trim().split(/\s+/).filter(function (k) { if (gone.indexOf(k) >= 0) { hit = true; return false; } return true; })
          .map(function (k) { renames.forEach(function (r) { if (k === r[0]) { hit = true; k = r[1]; } }); return k; });
        if (cls.length) x.setAttribute("class", cls.join(" ")); else x.removeAttribute("class");
      });
      // old WhatsApp typing dots were a div with p's (and a name line in a group); now they're one p like every other app
      [c].concat(Array.prototype.slice.call(c.querySelectorAll("div.msg.typing-indicator"))).forEach(function (d) {
        if (!d.matches("div.msg.typing-indicator") || !d.parentNode) return;
        var who = d.querySelector(":scope > p.who"), hide = d.querySelector(":scope > p.hide"), p = document.createElement("p");
        p.className = d.className;
        p.innerHTML = '<span class="hide">' + (who ? "<em>" + esc(who.textContent) + "</em> " : "") + (hide ? hide.innerHTML : "") + "</span><span></span><span></span><span></span>";
        d.parentNode.replaceChild(p, d); hit = true;
      });
      // old chat photos were a "msg photo" bubble each, with the picture (or the words) straight inside; now they're a gallery
      var pre = ["imsg", "igdm", "twdm"].filter(function (k) { return c.classList.contains(k); })[0];
      if (pre) Array.prototype.slice.call(c.querySelectorAll("p.msg.photo")).forEach(function (o) {
        var d = document.createElement("div"), ns = inl(o), lbl = labelOf(ns), taps = [], cell = document.createElement("span"), ph = document.createElement("p");
        d.className = "msg " + (o.classList.contains("out") ? "out" : "in") + " gallery" + (o.classList.contains("tapped") ? " tapped" : "");
        while (is(ns[ns.length - 1], "span.imsg-tap")) taps.unshift(ns.pop());
        cell.className = pre + "-photo";
        if (ns.length === 1 && is(ns[0], "img, span.img-desc")) cell.appendChild(ns[0]);
        else { var sd = document.createElement("span"); sd.className = "img-desc"; sd.textContent = ns.map(function (n) { return n.textContent; }).join(""); cell.appendChild(sd); }
        if (lbl) { var hp = document.createElement("p"), em = document.createElement("em"); hp.className = "hide"; em.textContent = lbl + ":"; hp.appendChild(em); d.appendChild(hp); }
        ph.className = pre + "-photos one"; ph.appendChild(cell); d.appendChild(ph);
        taps.forEach(function (x) { d.appendChild(x); });
        o.parentNode.replaceChild(d, o); hit = true;
      });
      // old Twitter DM replies: the quote was a "msg" bubble, and someone else's "Replied to" line had no side
      Array.prototype.slice.call(c.querySelectorAll("p.twdm-quote.msg, p.twdm-replied:not(.out):not(.in)")).forEach(function (q) {
        if (q.classList.contains("twdm-quote")) q.classList.remove("msg"); else q.classList.add("in");
        hit = true;
      });
      // old Instagram DM reactions were a span at the end of a "reacted" bubble or card; now they're a line of their own after it
      Array.prototype.slice.call(c.querySelectorAll("span.igdm-reacts")).forEach(function (r) {
        var host = r.parentNode, p = document.createElement("p"), h = r.querySelector(":scope > span.hide");
        if (!host || !host.parentNode) return;
        host.classList.remove("reacted"); if (!host.getAttribute("class")) host.removeAttribute("class");
        p.className = "igdm-reacts" + (host.classList.contains("out") ? " out" : "");
        if (h) h.textContent = h.textContent.replace(/^ /, "");
        while (r.firstChild) p.appendChild(r.firstChild);
        host.removeChild(r); host.parentNode.insertBefore(p, host.nextSibling); hit = true;
      });
      return c;
    });
    return hit ? out : null;
  }
  // a whole chapter's HTML into blocks; chats that haven't changed keep their boxes just as they were
  function readPieces(text, skip) {
    var box = document.createElement("div");
    box.innerHTML = text;
    tlCount = 0;
    var known = S.blocks.filter(function (b) { return b !== skip; }).map(function (b) { return { b: b, c: canon(blockHTML(b)) }; });
    function old(html) {
      var c = canon(html), hit = known.filter(function (k) { return k.c === c; })[0];
      if (!hit) return null;
      known.splice(known.indexOf(hit), 1);
      return hit.b;
    }
    var pieces = [], rest = "";
    function flush() { if (rest.trim()) pieces.push({ html: rest }); rest = ""; }
    box.childNodes.forEach(function (n) {
      // a chat from before a container's class was renamed is found by its new name
      var app = n.nodeType === 1 && (appOf(n) || appOf((renamedEls([n]) || [n])[0])), last = pieces[pieces.length - 1];
      if (app && READERS[app]) {
        // single tweets and single posts are a run of boxes, one after another
        if ((app === "twone" || app === "ig" && !n.classList.contains("ig-feed")) && !rest.trim() && last && last.els && appOf(last.els[0]) === app && !last.els[0].classList.contains("ig-feed")) last.els.push(n);
        else { flush(); pieces.push({ els: [n] }); }
      } else if (n.nodeType === 1) rest += n.outerHTML;
      else if (n.nodeType === 3) rest += esc(n.nodeValue);
    });
    flush();
    return pieces.map(function (p) {
      var html = p.html || p.els.map(function (e) { return e.outerHTML; }).join("\n");
      var older = p.els && renamedEls(p.els);
      return old(html) || p.els && (readChat(p.els) || older && readChat(older)) || rawBlock(html);
    });
  }
  // fromBox: typed or pasted in the HTML box, so it's the same work, just changed
  function readHTML(text, fromBox) {
    var i = text.lastIndexOf("<!-- " + MARK);
    if (i >= 0) {
      try { var d = JSON.parse(text.slice(i + 5 + MARK.length, text.lastIndexOf("-->")).trim()); if (!d.cast || !d.blocks) throw 0; S = d; rerender(); return true; }
      catch (err) { alert("That file looks like it was saved from here, but it's been changed, so it can't be opened."); return false; }
    }
    // a whole web page (like a work downloaded from AO3) has a head, a title and so on: the 'edit work' box never does
    if (/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]|<title[\s>]|id="preface"|id="chapters"|id="afterword"|class="userstuff"|class="toc-heading"|Archive of Our Own|archiveofourown\.org\/works\//i.test(text)) {
      if (fromBox) { $("fb-html-status").textContent = DOWNLOADED; return false; }
      alert(DOWNLOADED); return false;
    }
    if (!fromBox && S.blocks.length && !confirm("Open this HTML? It replaces the chats here, so save your HTML first if you want to keep them. Your cast stays.")) return false;
    var blocks = readPieces(text);
    if (!fromBox) blocks.forEach(function (b, k) { b.fold = k > 0; });
    S.blocks = blocks;
    if (fromBox) {
      var raw = blocks.filter(function (b) { return b.type === "raw"; }).length;
      $("fb-html-status").textContent = raw ? raw + (raw === 1 ? " bit" : " bits") + " of this HTML couldn't be read into boxes, so " + (raw === 1 ? "it's" : "they're") + " kept just as " + (raw === 1 ? "it is" : "they are") + ", in 'HTML, as it was'." : "";
    }
    rerender();
    return true;
  }

  // ---------- events ----------

  function onInput(e) {
    var el = e.target, path = el.getAttribute("data-bind");
    if (!path) return;
    var v = el.type === "checkbox" ? el.checked : el.value;
    set(path, v);
    if (/^cast\.\d+\.prof\.slug$/.test(path)) get(path.replace(/slug$/, "")).slugTouched = true;
    var raw = path.match(/^blocks\.(\d+)\.html$/);
    if (raw && e.type === "change" && S.blocks[+raw[1]].type === "raw") {
      var again = readPieces(v, S.blocks[+raw[1]]);
      if (again.length !== 1 || again[0].type !== "raw") { S.blocks.splice.apply(S.blocks, [+raw[1], 1].concat(again)); rerender(); return; }
    }
    if (el.hasAttribute("data-re") && e.type === "change") rerender();
    else refresh();
  }
  document.addEventListener("input", onInput);
  document.addEventListener("change", function (e) { if (e.target.getAttribute("data-bind")) onInput(e); });
  document.addEventListener("toggle", function (e) {
    var p = e.target.getAttribute && e.target.getAttribute("data-open");
    if (p) { set(p, e.target.open); save(); }
  }, true);

  function move(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!t) return;
    var a = t.getAttribute("data-act").split(":"), act = a[0], n = a.slice(1).map(Number);
    var b = S.blocks[n[0]], m = b && b.msgs ? b.msgs[n[1]] : null;
    switch (act) {
      case "cast-add": S.cast.push(newChar("")); break;
      case "paste-show": $("fb-paste-box").hidden = false; $("fb-paste").focus(); return;
      case "paste-hide": $("fb-paste-box").hidden = true; return;
      case "css-paste":
        pasteOpen = true;
        $("fb-css").readOnly = false;
        $("fb-css-note").hidden = false;
        $("fb-css-wrap").hidden = false;
        $("fb-css").focus();
        return;
      case "paste-add":
        S.pasted = ((S.pasted || "").trim() + "\n\n" + $("fb-paste").value.trim()).trim();
        $("fb-paste").value = "";
        $("fb-paste-box").hidden = true;
        addPasted();
        break;
      case "cast-del":
        if (!confirm("Remove " + nameOf(S.cast[n[0]]) + " from the cast? Their messages will disappear too.")) return;
        S.cast.splice(n[0], 1); break;
      case "saved-add": S.cast[n[0]].prof.saved.push({ owner: "", as: "", pic: "" }); break;
      case "saved-new": {
        // a new profile for the phone's owner, named as typed, so it goes in the profile CSS
        var sv = S.cast[n[0]].prof.saved[n[1]], nm = (sv.newName || "").trim();
        if (!nm) { alert("Type their name first."); return; }
        var nc = newChar(nm, "new"); nc.open = false;
        S.cast.push(nc);
        sv.owner = slugOf(nc); delete sv.newName;
        break;
      }
      case "saved-del": S.cast[n[0]].prof.saved.splice(n[1], 1); break;
      case "acct-add": S.cast[n[0]].prof.accounts.push({ acc: "", app: "ig", pic: "", name: "", handle: "", sq: false }); break;
      case "acct-del": S.cast[n[0]].prof.accounts.splice(n[1], 1); break;
      case "add": S.blocks.push(newBlock(a[1])); break;
      case "blk-fold": S.blocks[n[0]].fold = !S.blocks[n[0]].fold; break;
      case "blk-up": move(S.blocks, n[0], -1); break;
      case "blk-down": move(S.blocks, n[0], 1); break;
      case "blk-del": if (!confirm("Delete this chat?")) return; S.blocks.splice(n[0], 1); break;
      case "script": addScript(n[0]); return;
      case "msg-add":
        // a new message or tweet is from the last person, or else from the first person in the cast
        var lastM = b.msgs[b.msgs.length - 1], who = lastM && char(lastM.from) ? lastM.from : char(b.pov) ? b.pov : S.cast[0] && S.cast[0].id;
        if (!who) { var someone = newChar("Someone"); S.cast.push(someone); who = someone.id; }
        b.msgs.push(newMsg(who, "", lastM ? lastM.time : ""));
        // in a thread, the button at the bottom starts a new reply to the original tweet
        // and the tweet it answers gets one more reply
        if (b.type === "twthread" && b.msgs.length > 1) { b.msgs[b.msgs.length - 1].replyTo = b.msgs[0].from; b.msgs[0].replies = bumpCount(b.msgs[0].replies); }
        break;
      case "msg-ins":
        b.msgs.splice(n[1] + 1, 0, newMsg(m.from, "", m.time));
        if (b.type === "twthread") m.replies = bumpCount(m.replies); // a reply to this tweet
        break;
      case "msg-up": move(b.msgs, n[1], -1); break;
      case "msg-down": move(b.msgs, n[1], 1); break;
      case "msg-del": b.msgs.splice(n[1], 1); break;
      case "msg-more": m.open = !m.open; break;
      case "tap-add": m.reacts.push({ by: b.pov, emoji: "" }); break;
      case "tap-del": m.reacts.splice(n[2], 1); break;
      case "photo-add": m.photos.push({ url: "", alt: "", desc: "", land: false }); break;
      case "photo-del": m.photos.splice(n[2], 1); break;
      case "face-add": (m.faces = m.faces || []).push(S.cast[0] ? S.cast[0].id : ""); break;
      case "face-del": m.faces.splice(n[2], 1); break;
      case "collab-add": collabsOf(m).push({ who: S.cast[0] ? S.cast[0].id : "", tick: false }); break;
      case "collab-del": m.collabs.splice(n[2], 1); break;
      case "tag-add": (m.tags = m.tags || []).push({ who: S.cast[0] ? S.cast[0].id : "", fol: "following", tick: false }); break;
      case "tag-del": m.tags.splice(n[2], 1); break;
      case "link-add": m.link = { url: "", showUrl: false, title: "", desc: "", img: "", alt: "", video: "", imgdesc: "" }; break;
      case "link-del": m.link = null; break;
      case "attach": {
        // one shared thing per message: a picture post, a reel, a link or a story
        var k = a[3] || "";
        m.hasPost = k === "post" || k === "reel"; if (m.hasPost) m.postReel = k === "reel";
        m.shared = k === "story";
        if (k === "link") { if (!m.link) m.link = { url: "", showUrl: false, title: "", desc: "", img: "", alt: "", video: "", imgdesc: "" }; }
        else m.link = null;
        break;
      }
      case "ppic-add": (m.postMore = m.postMore || []).push({ url: "", alt: "", desc: "", land: false }); break;
      case "ppic-del": m.postMore.splice(n[2], 1); break;
      case "copy-html": copy("fb-html", t); return;
      case "copy-css": copy("fb-css", t); return;
      case "save-html": saveHTML(); return;
      case "save-css": download("megaskin-profiles.css", allProfilesCSS(), "text/css"); return;
      case "new": if (!confirm("Start again? Everything here will be cleared, so save your HTML and CSS first if you want to keep them.")) return; S = { v: 1, pasted: "", cast: [], blocks: [] }; break;
      case "example": if (!confirm("Load this example? Everything here will be replaced, so save your HTML and CSS first if you want to keep them.")) return; loadExample(+$("fb-example").value); break;
      case "fmt": wrap(a[1]); return;
      default: return;
    }
    rerender();
  });

  // inline extras: wrap the selected words in the last text box used
  var lastText = null;
  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (el.getAttribute && el.getAttribute("data-bind") && (el.tagName === "TEXTAREA" || el.type === "text")) {
      lastText = el;
    }
  });
  function wrap(kind) {
    var el = lastText;
    if (!el || !document.body.contains(el)) { alert("Click in the message first, and select the words you want."); return; }
    var s = el.selectionStart, e = el.selectionEnd, v = el.value, sel = v.slice(s, e);
    if (!sel) { alert("Select the words first, then press the button."); return; }
    var out;
    if (kind === "tl" || kind === "egg") {
      var t = prompt(kind === "tl" ? "What does \"" + sel + "\" mean?" : "What's the hidden text behind \"" + sel + "\"?");
      if (!t) return;
      out = kind === "tl" ? "[[" + sel + "|" + t + "]]" : "{{" + sel + "|" + t + "}}";
    } else out = "<<" + sel + ">>";
    el.value = v.slice(0, s) + out + v.slice(e);
    el.focus();
    el.selectionStart = el.selectionEnd = s + out.length;
    set(el.getAttribute("data-bind"), el.value);
    refresh();
  }

  function copy(id, button) {
    var ta = $(id);
    ta.select();
    var done = function () { var o = button.textContent; button.textContent = "Copied!"; setTimeout(function () { button.textContent = o; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(done, function () { document.execCommand("copy"); done(); });
    else { document.execCommand("copy"); done(); }
  }
  // ---------- files ----------

  function download(name, text, type) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  // the HTML file has everything typed in hidden in a comment at the end, so it can be opened again here
  var MARK = "megaskin-fic-builder ";
  function saveHTML() {
    var data = JSON.stringify(S).replace(/--/g, "-\\u002d"); // "--" can't go inside a comment
    download("megaskin-chats.html", allHTML() + "\n\n<!-- " + MARK + data + " -->\n", "text/html");
  }
  // the CSS file has every profile: the ones pasted in (minus any that were changed) and the new or changed ones
  function allProfilesCSS() {
    var redone = S.cast.filter(function (c) { return c.kind === "new" || changed(c); }).map(slugOf);
    var kept = (S.pasted || "").split(/(?=\/\* PROFILE:)/).filter(function (chunk) {
      var m = chunk.match(/\.pfp\.pfp-([a-z0-9-]+)/);
      return chunk.trim() && !(m && redone.indexOf(m[1]) >= 0);
    }).map(function (x) { return x.trim(); });
    return kept.concat([profilesCSS()]).filter(Boolean).join("\n\n") + "\n";
  }
  function openFile(input, read) {
    var f = input.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () { read(r.result); };
    r.readAsText(f);
    input.value = "";
  }
  $("fb-open-html").addEventListener("change", function () { openFile(this, function (text) { readHTML(text, false); }); });
  // the HTML box takes typing and pasting too: it's read again a moment after the last change
  var htmlWait = 0;
  $("fb-html").addEventListener("input", function () {
    clearTimeout(htmlWait);
    var box = this;
    htmlWait = setTimeout(function () { readHTML(box.value, true); }, 600);
  });
  $("fb-html").addEventListener("blur", function () { clearTimeout(htmlWait); readHTML(this.value, true); });
  // there are two "open a CSS file" buttons: one at the top, one in the existing profiles box
  Array.prototype.forEach.call(document.querySelectorAll(".fb-open-css"), function (input) {
    input.addEventListener("change", function () {
      openFile(this, function (text) {
        S.pasted = ((S.pasted || "").trim() + "\n\n" + text.trim()).trim();
        addPasted();
        $("fb-paste-box").hidden = true;
        rerender();
      });
    });
  });

  $("fb-example").innerHTML = window.FB_EXAMPLES.map(function (e, i) { return '<option value="' + i + '">' + esc(e.label) + "</option>"; }).join("");
  load();
  rerender();
  // the skin's example profiles are read from megaskin.css
  fetch("megaskin.css").then(function (r) { return r.text(); }).then(function (t) { SKIN = t; rerender(); }, function () {});
})();
