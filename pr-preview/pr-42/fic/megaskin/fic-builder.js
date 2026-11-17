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
// Chats (iMessage, WhatsApp, Twitter/X and Instagram DMs) are a list of messages.
// A Twitter/X thread or timeline is a list of tweets, kept in the same msgs list,
// and an Instagram post keeps its settings on the block and its comments in msgs.
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
  var BACKGROUNDS = ["", "beige", "black", "blush", "dusk", "forest", "lilac", "navy", "night",
    "ocean", "plum", "sage", "sky", "slate", "sunset", "white"];
  var KINDS = {
    imsg: "iMessage chat",
    wa: "WhatsApp chat",
    twthread: "Twitter/X tweet and replies",
    twfeed: "Twitter/X timeline",
    twdm: "Twitter/X DM",
    igpost: "Instagram post",
    igdm: "Instagram DM"
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
      showInitials: true, initials: "", pic: "", alt: "", num: "", handle: "", ighandle: "", prof: newProfile() };
  }
  function newMsg(from, text, time) {
    return { id: nid("m"), from: from || "", text: text || "", time: time || "", open: false,
      reacts: [], waReacts: "", waCount: "", tick: "read", edited: false, status: "", sms: false, big: false,
      replyTo: "", photos: [], link: null,
      // Twitter/X and Instagram bits
      acc: "", verified: false, label: "", qName: "", qHandle: "", qText: "", note: "", date: "",
      reposts: "", likes: "", replies: "", liked: false, reposted: false, poll: "", pollinfo: "",
      vUrl: "", vTitle: "", vDesc: "", warn: false, voice: "", shared: false };
  }
  // the group's picture in the WhatsApp header: a one-off circle, set up the same way
  function newGroupPic() { return { colour: "5", showInitials: true, initials: "", pic: "", alt: "", land: false }; }
  function newBlock(type) {
    var b = { id: nid("b"), type: type };
    var pov = S.cast[0] ? S.cast[0].id : "";
    b.pov = pov; b.group = false; b.title = ""; b.sub = type === "imsg" ? "iMessage" : "online";
    b.theme = "theme-auto"; b.width = ""; b.scroll = ""; b.bar = "empty"; b.barText = "";
    b.bg = ""; b.pics = true; b.header = "simple"; b.gp = newGroupPic(); b.script = ""; b.msgs = []; b.open = true;
    b.acc = "";
    if (type === "twdm") b.sub = "";
    if (type === "igdm") b.sub = "Active now";
    if (type === "igpost") {
      // an Instagram post is one post: its settings are the post, and the messages are its comments
      b.from = pov; b.menu = true; b.story = false; b.verified = false; b.follow = false; b.underKind = "location"; b.under = "";
      b.photo = { url: "", alt: "", desc: "" }; b.likes = ""; b.likeClick = false; b.liked = false; b.cmCount = ""; b.reposts = "";
      b.shares = ""; b.saveClick = false; b.saved = false; b.likesLine = "count"; b.faces = []; b.caption = ""; b.viewAll = false; b.time = "";
    }
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
    var b = newBlock(ex.chat.type);
    Object.keys(ex.chat).forEach(function (k) { if (k !== "type") b[k] = ex.chat[k]; });
    b.pov = ids[ex.chat.pov] || (S.cast[0] && S.cast[0].id) || "";
    if (ex.chat.from) b.from = ids[ex.chat.from];
    if (ex.chat.faces) b.faces = ex.chat.faces.map(function (n) { return ids[n]; });
    b.msgs = ex.msgs.map(function (line) {
      var x = line[2] || {};
      var m = newMsg(ids[line[0]] || line[0], line[1], x.time);
      Object.keys(x).forEach(function (k) { if (["reacts", "photos", "link", "reply", "time"].indexOf(k) < 0) m[k] = x[k]; });
      m.reacts = (x.reacts || []).map(function (r) { return { by: ids[r[0]], emoji: r[1] }; });
      m.photos = (x.photos || []).map(function (p) { return { url: p.url || "", alt: p.alt || "", desc: p.desc || "", land: !!p.land }; });
      if (x.link) m.link = { url: x.link.url || "", showUrl: !!x.link.showUrl, title: x.link.title || "", desc: x.link.desc || "",
        img: x.link.img || "", alt: x.link.alt || "", video: x.link.video || "", imgdesc: x.link.imgdesc || "" };
      return m;
    });
    // a reply: WhatsApp quotes a message, a tweet replies to a person
    ex.msgs.forEach(function (line, i) { if (line[2] && line[2].reply !== undefined) b.msgs[i].replyTo = b.msgs[line[2].reply][b.type === "twthread" ? "from" : "id"]; });
    S.blocks.push(b);
  }
  function starter() { loadExample(0); }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() {
    try {
      var t = localStorage.getItem(KEY);
      if (t) { S = JSON.parse(t); if (S && S.cast && S.blocks) return; }
    } catch (e) {}
    starter();
  }

  // ---------- helpers ----------

  function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function char(id) { return S.cast.filter(function (c) { return c.id === id; })[0]; }
  // profiles pasted into the "Profiles you already have" box: [slug, name] for each
  function pastedProfiles() {
    var css = S.pasted || "", out = [];
    var re = /\.pfp\.pfp-([a-z0-9-]+)/g, m;
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
  function profileName(c) {
    // a profile's name span, with the typed name inside for readers with the style off
    return '<span class="name pfp-' + slugOf(c) + '"><span class="hide">' + esc(nameOf(c)) + "</span></span>";
  }
  function plainName(c, wa) {
    // the label for readers with the style off
    return (wa && c && !isProfile(c) && c.num.trim() ? "~ " : "") + nameOf(c);
  }
  function waName(c) {
    // a name as WhatsApp shows it in a group: profile, or typed with a phone number
    if (isProfile(c)) return profileName(c);
    var n = esc(nameOf(c));
    if (c.num.trim()) return "~ " + n + '<span class="hide"> </span><span class="wa-num">' + esc(c.num.trim()) + "</span>";
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
    s = s.replace(/~~(.+?)~~/g, '<span class="del">$1</span>');
    s = s.replace(/&lt;&lt;(.+?)&gt;&gt;/g, '<span class="fake-link">$1</span>');
    return s;
  }
  function plain(text) {
    return String(text || "").replace(/\[\[([^\]|]+)\|[^\]]+\]\]/g, "$1").replace(/\{\{([^}|]+)\|[^}]+\}\}/g, "$1")
      .replace(/~~(.+?)~~/g, "$1").replace(/<<(.+?)>>/g, "$1");
  }
  function hideLabel(name) { return '<span class="hide"><em>' + esc(name) + ":</em> </span>"; }
  function ind(lines, n) { var pad = new Array(n + 1).join("  "); return lines.map(function (l) { return pad + l; }); }

  // ---------- HTML output ----------

  function containerClass(b, app) {
    var c = ["mob", app, b.theme];
    if (app === "wa" && b.bg) c.push("bg-" + b.bg);
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
    return '<p class="mob-head">' + headTitle(b) + '<span class="hide"> - </span>' +
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
      if (m.from === "typing") { body.push('<p class="typing-indicator"><span></span><span></span><span></span></p>'); last = ""; return; }
      var c = char(m.from); if (!c) return;
      var out = m.from === b.pov, side = out ? "out" : "in";
      var showWho = b.group && !out && last !== m.from;
      if (showWho) body.push('<p class="who">' + (isProfile(c) ? profileName(c) : esc(nameOf(c))) + '<span class="hide">:</span></p>');
      last = out ? "" : m.from;
      var label = b.group && !out ? "" : hideLabel(nameOf(c));
      var bubbles = [];
      if (m.text.trim()) bubbles.push({ cls: "msg " + side + (m.sms ? " sms" : ""), inner: fmt(m.text) });
      (m.photos || []).forEach(function (ph) {
        var u = picUrl(ph.url);
        if (u) bubbles.push({ cls: "msg " + side + " pic", inner: '<img src="' + esc(u) + '" alt="' + esc(ph.alt) + '">' });
        else if (ph.desc.trim()) bubbles.push({ cls: "msg " + side + " pic text", inner: "[" + esc(ph.desc.trim()) + "]" });
      });
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
        body.push('<p class="' + bb.cls + '">' + label + bb.inner + extra + "</p>");
      });
      if (m.edited) body.push('<p class="' + (out ? "imsg-edited" : "imsg-edited-in") + '">Edited</p>');
      if (m.status.trim()) body.push('<p class="imsg-status">' + esc(m.status.trim()) + "</p>");
    });
    L = L.concat(ind(body, 2));
    L.push("  </div>");
    if (b.bar === "empty") L.push('  <p class="imsg-input"><span class="imsg-plus">+</span><span class="hide"> </span><span class="imsg-field">iMessage<span class="hide"> </span><span class="imsg-mic ic ic-mic">&#127908;</span></span></p>');
    if (b.bar === "typed") L.push('  <p class="imsg-input"><span class="imsg-plus">+</span><span class="hide"> </span><span class="imsg-field typed">' + fmt(b.barText) + '<span class="hide"> </span><span class="imsg-send ic ic-imsg-send">&#8593;</span></span></p>');
    L.push("</div>");
    return L.join("\n");
  }

  function waPfp(c) {
    if (isProfile(c)) return '<p class="wa-pfp"><span class="pfp pfp-' + slugOf(c) + '"></span></p>';
    var u = picUrl(c.pic);
    if (u) return '<p class="wa-pfp ' + colourClass(c) + '"><span class="pfp"><img ' + (c.land ? 'class="land" ' : "") + 'src="' + esc(u) + '" alt="' + esc(c.alt.trim() || ("Profile picture of " + nameOf(c))) + '"></span></p>';
    return '<p class="wa-pfp ' + colourClass(c) + '">' + (c.showInitials !== false ? esc(initials(c)) : "") + "</p>";
  }
  function groupPic(b) {
    var g = b.gp || newGroupPic();
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
    if (b.header === "bar") {
      var o = others(b), pc;
      if (b.group) pc = waPfp(groupPic(b));
      else pc = o[0] ? waPfp(o[0]) : '<p class="wa-pfp colour5">?</p>';
      var sub = b.sub.trim();
      if (b.group && !sub) sub = o.map(nameOf).concat(["You"]).join(", ");
      L = L.concat(ind(['<table class="wa-bar">', "  <tbody>", "    <tr>",
        '      <td rowspan="2" class="wa-back"><span class="ic ic-back">&#8592;</span></td>',
        '      <td rowspan="2" class="wa-pfp-cell">' + pc + "</td>",
        '      <td class="wa-title">' + headTitle(b) + "</td>",
        '      <td rowspan="2" class="wa-actions"><span class="ic ic-video">&#127909;</span> <span class="ic ic-menu">&#8942;</span></td>',
        "    </tr>", "    <tr>", '      <td class="wa-sub">' + esc(sub) + "</td>", "    </tr>", "  </tbody>", "</table>"], 1));
    } else L.push("  " + mobHead(b));
    L.push('  <div class="mob-body">');
    var body = [];
    b.msgs.forEach(function (m) {
      if (m.from === "sys") { body.push('<p class="mob-sys">' + fmt(m.text) + "</p>"); last = ""; return; }
      if (m.from === "typing") { body.push('<p class="typing">' + fmt(m.text || "typing...") + "</p>"); return; }
      var c = char(m.from); if (!c) return;
      var out = m.from === b.pov, side = out ? "out" : "in";
      var first = last !== m.from;
      last = m.from;
      var showWho = b.group && !out && first;
      var rows = b.group && b.pics && !out;
      var photos = (m.photos || []).filter(function (p) { return picUrl(p.url) || p.desc.trim(); });
      var link = m.link && (m.link.title.trim() || m.link.url.trim() || picUrl(m.link.img) || m.link.imgdesc.trim()) ? m.link : null;
      var cls = "msg " + side + (first ? " tail" : "") + (photos.length ? " gallery" : link ? " share" : "");
      var label = hideLabel(plainName(c, true));
      var inner = [];
      var open = '<div class="' + cls + '">';
      if (showWho) inner.push('<p class="who ' + (isProfile(c) ? "pfp-" + slugOf(c) : colourClass(c)) + '">' + waName(c) + '<span class="hide">:</span></p>');
      else if (photos.length || link) open += '<p class="hide"><em>' + esc(plainName(c, true)) + ":</em></p>";
      if (m.replyTo) { var q = waQuote(b, m); if (q) inner.push(q); }
      var lab = showWho ? "" : label;
      if (photos.length) {
        var n = ["one", "two", "three", "four"][Math.min(photos.length, 4) - 1];
        var ph = photos.slice(0, 4).map(function (p) {
          var u = picUrl(p.url);
          return '<span class="wa-photo">' + (u ? '<img ' + (p.land ? 'class="land" ' : "") + 'src="' + esc(u) + '" alt="' + esc(p.alt) + '">' :
            '<span class="wa-desc">[' + esc(p.desc.trim()) + "]</span>") + "</span>";
        });
        if (ph.length === 1) inner.push('<p class="wa-photos one">' + ph[0] + "</p>");
        else inner.push('<p class="wa-photos ' + n + '">', ind(ph, 1).join("\n"), "</p>");
        if (m.text.trim()) inner.push('<p class="wa-caption">' + fmt(m.text) + "</p>");
      } else if (link) {
        if (link.url.trim() && link.showUrl) inner.push('<p><span class="wa-ln">' + esc(link.url.trim()) + "</span></p>");
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
      var tick = !out ? "" : m.tick === "read" ? ' <span class="wa-read ic ic-read">✓✓</span>' :
        m.tick === "delivered" ? ' <span class="ic ic-delivered">✓✓</span>' : m.tick === "sent" ? ' <span class="ic ic-sent">✓</span>' : "";
      inner.push('<p class="wa-time">' + (m.edited ? "Edited " : "") + esc(m.time.trim()) + tick + "</p>");
      var block = [open].concat(ind(inner.join("\n").split("\n"), 1)).concat(["</div>"]);
      if (rows) {
        block = ['<div class="wa-row' + (first ? "" : " cont") + '">'].concat(first ? ["  " + waPfp(c)] : []).concat(ind(block, 1)).concat(["</div>"]);
      }
      body = body.concat(block);
      var r = (m.waReacts || "").trim();
      if (r) {
        body.push('<p class="wa-reacts' + (out ? " out" : rows ? " pad" : "") + '"><span class="hide">[Reactions: </span>' + esc(r) +
          (m.waCount.trim() ? ' <span class="wa-count">' + esc(m.waCount.trim()) + "</span>" : "") + '<span class="hide">]</span></p>');
      }
      lastSide = side;
    });
    L = L.concat(ind(body, 2));
    L.push("  </div>");
    if (b.bar === "empty" || b.bar === "typed") {
      var typed = b.bar === "typed";
      L = L.concat(ind(['<p class="wa-input">', '  <span class="wa-field">', '    <span class="ic ic-emoji">&#9786;</span>',
        typed ? '    <span class="wa-ph typed">' + fmt(b.barText) + "</span>" : '    <span class="wa-ph">Message</span>',
        '    <span class="wa-ic ic ic-paperclip">&#128206;</span>'].concat(typed ? [] : ['    <span class="wa-ic ic ic-camera">&#128247;</span>'])
        .concat(["  </span>", typed ? '  <span class="wa-mic ic ic-wa-send">&#10148;</span>' : '  <span class="wa-mic ic ic-wa-mic">&#127908;</span>', "</p>"]), 1));
    }
    L.push("</div>");
    return L.join("\n");
  }

  // ---------- Twitter/X and Instagram: names, handles and pictures ----------

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
  function igName(c, a) {
    if (isProfile(c)) return (a && noAt(a.handle)) || noAt(appBit(c, "ig", "handle")) || noAt(c.prof.handle) || slugOf(c);
    return noAt(c.ighandle) || noAt(c.handle) || nameOf(c).toLowerCase().replace(/\s+/g, ".");
  }
  // a profile's name or handle span, with a typed copy inside for readers with the style off
  function pSpan(kind, c, a, text) {
    return '<span class="' + kind + " pfp-" + slugOf(c) + accCls(a) + '"><span class="hide">' + esc(text) + "</span></span>";
  }
  function twNameHTML(c, a) { return isProfile(c) ? pSpan("name", c, a, twName(c, a)) : esc(nameOf(c)); }
  function twHandleHTML(c, a) { return isProfile(c) ? pSpan("handle", c, a, "@" + twHandle(c, a)) : "@" + esc(twHandle(c)); }
  function igNameHTML(c, a) { return isProfile(c) ? pSpan("handle", c, a, igName(c, a)) : esc(igName(c)); }
  // a round picture: from a profile, an uploaded picture, or initials in a colour
  function circle(cls, c, a) {
    if (isProfile(c)) return '<span class="' + cls + '"><span class="pfp pfp-' + slugOf(c) + accCls(a) + '"></span></span>';
    var u = picUrl(c.pic);
    if (u) return '<span class="' + cls + '"><span class="pfp"><img ' + (c.land ? 'class="land" ' : "") + 'src="' + esc(u) + '" alt="' + esc(t(c.alt) || ("Profile picture of " + nameOf(c))) + '"></span></span>';
    return '<span class="' + cls + " " + colourClass(c) + '">' + (c.showInitials !== false ? esc(initials(c)) : "") + "</span>";
  }
  function plural(n, one, many) { return t(n) === "1" ? one : many; }

  // ---------- Twitter/X posts ----------

  var POLL_SIZES = [0, 10, 20, 25, 30, 33, 40, 50, 60, 67, 70, 75, 80, 90, 100];
  function twText(text) {
    // hashtags and @mentions go blue
    return fmt(text).replace(/(^|[\s(])([#@][A-Za-z0-9_]+)/g, '$1<span class="tw-link">$2</span>');
  }
  function twPoll(m) {
    var opts = t(m.poll).split(/\n/).map(t).filter(Boolean).map(function (line) {
      var p = line.match(/^(.*?)\s+(\d{1,3})\s*%$/);
      return p ? { text: p[1], pct: +p[2] } : { text: line, pct: null };
    });
    if (!opts.length) return [];
    var done = opts.some(function (o) { return o.pct !== null; });
    var top = Math.max.apply(null, opts.map(function (o) { return o.pct || 0; })), won = false;
    var L = opts.map(function (o) {
      if (!done) return '<p class="tw-opt">' + esc(o.text) + "</p>";
      var pct = o.pct || 0, size = POLL_SIZES.reduce(function (a, b) { return Math.abs(b - pct) < Math.abs(a - pct) ? b : a; });
      var win = !won && pct === top; if (win) won = true;
      return '<p class="tw-opt res' + (win ? " win" : "") + " p" + size + '">' + esc(o.text) + '<span class="hide"> </span><span class="tw-pct">' + pct + "%</span></p>";
    });
    if (t(m.pollinfo)) L.push('<p class="tw-pollinfo">' + esc(t(m.pollinfo)) + "</p>");
    return L;
  }
  function twMedia(m) {
    var v = picUrl(m.vUrl);
    if (v) return ['<div class="tw-media video"><iframe src="' + esc(v) + '" frameborder="0" title="' + esc(t(m.vTitle) || "Video") + '"></iframe>' +
      (t(m.vDesc) ? '<p class="vid-desc">[' + esc(t(m.vDesc)) + "]</p>" : "") + "</div>"];
    var ph = (m.photos || []).filter(function (p) { return picUrl(p.url) || t(p.desc); }).slice(0, 4);
    if (!ph.length) return [];
    function img(p) { return '<img ' + (p.land ? 'class="land" ' : "") + 'src="' + esc(picUrl(p.url)) + '" alt="' + esc(p.alt) + '">'; }
    if (ph.length === 1) return ['<p class="tw-media">' + (picUrl(ph[0].url) ? img(ph[0]) : "<span>[" + esc(t(ph[0].desc)) + "]</span>") + "</p>"];
    return ['<p class="tw-media ' + ["two", "three", "four"][ph.length - 2] + '">'].concat(ph.map(function (p) {
      return '  <span class="tw-photo">' + (picUrl(p.url) ? img(p) : '<span class="tw-desc">[' + esc(t(p.desc)) + "]</span>") + "</span>";
    })).concat(["</p>"]);
  }
  function twStats(m) {
    var s = [];
    if (t(m.reposts)) { var r = "<b>" + esc(t(m.reposts)) + "</b> " + plural(m.reposts, "Repost", "Reposts"); s.push(m.reposted ? '<span class="tw-rt">' + r + "</span>" : r); }
    if (t(m.likes)) { var k = "<b>" + esc(t(m.likes)) + "</b> " + plural(m.likes, "Like", "Likes"); s.push(m.liked ? '<span class="tw-liked">' + k + "</span>" : k); }
    if (t(m.replies)) s.push("<b>" + esc(t(m.replies)) + "</b> " + plural(m.replies, "Reply", "Replies"));
    return s.length ? ['<p class="tw-stats">' + s.join(" &nbsp; ") + "</p>"] : [];
  }
  // one tweet: kind is "feed" (on its own), "main" (top of a thread) or "reply"
  function tweetHTML(b, m, kind) {
    var c = char(m.from); if (!c) return [];
    var a = accOf(c, m.acc, "tw"), L = [];
    if (kind === "reply") {
      // replying to someone further up the thread: by default, whoever posted the tweet just above
      var i = b.msgs.indexOf(m), above = b.msgs.slice(0, i).filter(function (x) { return char(x.from); });
      var to = above.filter(function (x) { return x.from === m.replyTo; }).pop() || above[above.length - 1], qc = to && char(to.from);
      if (qc) L.push('<p class="tw-replying">Replying to <span class="tw-link">@' + esc(twHandle(qc, accOf(qc, to.acc, "tw"))) + "</span></p>");
    }
    L.push('<p class="tw-top">' + circle("tw-pfp", c, a) + '<span class="hide"> </span><span class="tw-name">' + twNameHTML(c, a) +
      (m.verified ? ' <span class="tw-tick ic ic-verified">✔</span>' : "") + '</span> <span class="tw-handle">' + twHandleHTML(c, a) +
      (t(m.time) ? " · " + esc(t(m.time)) : "") + "</span></p>");
    if (t(m.label)) L.push('<p class="tw-label">' + esc(t(m.label)) + "</p>");
    if (t(m.text)) L.push((kind === "reply" ? "<p>" : '<p class="tw-text">') + twText(m.text) + "</p>");
    L = L.concat(twPoll(m), twMedia(m));
    if (m.warn) L.push('<p class="tw-warn"><b>Content warning: Sensitive content</b><br>The Tweet author flagged this Tweet as showing sensitive content.</p>');
    if (t(m.qText) || t(m.qName)) L.push('<p class="tw-quote"><b>' + esc(t(m.qName)) + "</b>" + (noAt(m.qHandle) ? ' <span class="tw-handle">@' + esc(noAt(m.qHandle)) + "</span>" : "") + "<br>" + fmt(m.qText) + "</p>");
    if (t(m.note)) L.push('<p class="tw-note">' + esc(t(m.note)) + "</p>");
    if (t(m.date)) L.push('<p class="tw-date">' + esc(t(m.date)) + "</p>");
    L = L.concat(twStats(m));
    var open = kind === "feed" ? '<div class="mob tw ' + b.theme + (b.width ? " " + b.width : "") + '">' : kind === "main" ? '<div class="mob tw">' : '<div class="mob tw-reply">';
    return [open].concat(ind(L, 1)).concat(["</div>"]);
  }
  function twFeedHTML(b) {
    return b.msgs.map(function (m) { return tweetHTML(b, m, "feed").join("\n"); }).filter(Boolean).join("\n\n");
  }
  function twThreadHTML(b) {
    var L = ['<div class="tw-thread ' + b.theme + (b.width ? " " + b.width : "") + '">', '  <div class="tw-scroll">'];
    b.msgs.forEach(function (m, i) { L = L.concat(ind(tweetHTML(b, m, i ? "reply" : "main"), 2)); });
    L.push("  </div>");
    if (b.bar !== "none") L.push('  <p class="tw-foot"><span>Reply</span><span class="hide"> - </span>Tweet your reply</p>');
    L.push("</div>");
    return L.join("\n");
  }

  // ---------- Instagram post ----------

  function bumpCount(v) {
    // one more like, keeping the commas: 2,431 becomes 2,432
    var n = t(v).replace(/,/g, "");
    if (!/^\d+$/.test(n)) return t(v);
    return String(+n + 1).replace(/\B(?=(\d{3})+(?!\d))/g, t(v).indexOf(",") >= 0 ? "," : "");
  }
  function igPostHTML(b) {
    var c = char(b.from) || S.cast[0], L = []; // until someone's picked, the first in the cast
    var a = c && accOf(c, b.acc, "ig");
    if (c) {
      var top = (b.menu ? '<span class="ig-menu ic ic-more">&#8943;</span>' : "") + circle("ig-pfp" + (b.story ? " story" : ""), c, a) + igNameHTML(c, a);
      if (b.verified) top += '<span class="hide"> </span><span class="ig-tick ic ic-verified">&#10003;</span>';
      if (b.follow) top += '<span class="hide"> - </span><span class="ig-follow">Follow</span>';
      if (t(b.under)) top += '<span class="hide"> - </span><span>' + (b.underKind === "song" ? "&#9835; " : "") + esc(t(b.under)) + "</span>";
      L.push('<p class="ig-top">' + top + "</p>");
    }
    var u = picUrl(b.photo.url);
    if (u) L.push('<p class="ig-photo real"><img src="' + esc(u) + '" alt="' + esc(b.photo.alt) + '"></p>');
    else if (t(b.photo.desc)) L.push('<p class="ig-photo">[' + esc(t(b.photo.desc)) + "]</p>");
    var btns = [];
    if (b.likeClick) btns.push('<details class="ig-tog like"' + (b.liked ? " open" : "") + '><summary><span class="ig-icon off ic ic-heart">&#9825;</span><span class="hide"> </span><span class="ig-count off">' + esc(t(b.likes)) +
      '</span><span class="hide"> likes (</span><span class="ig-icon on ic ic-heart-red">&#9829;</span><span class="hide"> </span><span class="ig-count on">' + esc(bumpCount(b.likes)) + '</span><span class="hide"> when liked)</span></summary></details>');
    else if (t(b.likes)) btns.push('<p class="ig-btn"><span class="ig-icon ic ic-heart">&#9825;</span><span class="hide"> </span><span class="ig-count">' + esc(t(b.likes)) + '</span><span class="hide"> ' + plural(b.likes, "like", "likes") + "</span></p>");
    if (t(b.cmCount)) btns.push('<p class="ig-btn"><span class="ig-icon cm"></span><span class="ig-count">' + esc(t(b.cmCount)) + '</span><span class="hide"> ' + plural(b.cmCount, "comment", "comments") + "</span></p>");
    if (t(b.reposts)) btns.push('<p class="ig-btn"><span class="ig-icon ic ic-repost">&#8635;</span><span class="hide"> </span><span class="ig-count">' + esc(t(b.reposts)) + '</span><span class="hide"> ' + plural(b.reposts, "repost", "reposts") + "</span></p>");
    if (t(b.shares)) btns.push('<p class="ig-btn"><span class="ig-icon ic ic-share">&#10148;</span><span class="hide"> </span><span class="ig-count">' + esc(t(b.shares)) + '</span><span class="hide"> ' + plural(b.shares, "share", "shares") + "</span></p>");
    if (b.saveClick) btns.push('<details class="ig-tog save"' + (b.saved ? " open" : "") + '><summary><span class="hide">Save</span><span class="ig-icon bm off"></span><span class="ig-icon bm on"></span></summary></details>');
    if (btns.length) L = L.concat(['<div class="ig-actions">'], btns, ["</div>"]);
    var faces = (b.faces || []).map(char).filter(Boolean);
    if (b.likesLine === "faces" && faces.length) {
      L.push('<p class="ig-likes liked-by"><span class="ig-like-pfps">' + faces.map(function (f) { return circle("ig-like-pfp", f, null); }).join("") +
        "</span>Liked by <b>" + igNameHTML(faces[0], null) + "</b> and <b>others</b></p>");
    } else if (b.likesLine !== "none" && t(b.likes)) L.push('<p class="ig-likes">' + esc(t(b.likes)) + " " + plural(b.likes, "like", "likes") + "</p>");
    if (c && t(b.caption)) L.push('<p class="ig-caption"><b>' + igNameHTML(c, a) + "</b> " + fmt(b.caption).replace(/(^|\s)(#[A-Za-z0-9_]+)/g, '$1<span class="ig-tag">$2</span>') + "</p>");
    if (b.viewAll && t(b.cmCount)) L.push('<p class="ig-viewall">View all ' + esc(t(b.cmCount)) + " comments</p>");
    b.msgs.forEach(function (m) {
      var mc = char(m.from);
      if (mc && t(m.text)) L.push('<p class="ig-comment"><b>' + igNameHTML(mc, accOf(mc, m.acc, "ig")) + "</b> " + fmt(m.text) + "</p>");
    });
    if (t(b.time)) L.push('<p class="ig-time">' + esc(t(b.time)) + "</p>");
    return ['<div class="mob ig ' + b.theme + (b.width ? " " + b.width : "") + (b.scroll ? " " + b.scroll : "") + '">'].concat(L, ["</div>"]).join("\n");
  }

  // ---------- Twitter/X and Instagram DMs ----------

  function dmHTML(b) {
    var app = b.type, tw = app === "twdm", L = [], last = "", body = [];
    var o = others(b)[0];
    // header: the chat's name and the line under it, from the other person if left empty
    var title = t(b.title) ? esc(t(b.title)) : b.group ? "Group chat" : !o ? "Someone" : tw ? twNameHTML(o, accOf(o, b.acc, "tw")) : igNameHTML(o, accOf(o, b.acc, "ig"));
    var sub = t(b.sub) ? esc(t(b.sub)) : tw && o && !b.group ? twHandleHTML(o, accOf(o, b.acc, "tw")) : "";
    L.push('<div class="' + containerClass(b, app) + '">');
    L.push('  <p class="mob-head">' + title + '<span class="hide"> - </span>' + (sub ? "<span>" + sub + "</span>" : "") + "</p>");
    L.push('  <div class="mob-body">');
    b.msgs.forEach(function (m) {
      var c = char(m.from); if (!c) return;
      var out = m.from === b.pov, side = out ? "out" : "in";
      if (b.group && !out && last !== m.from && !m.shared) body.push('<p class="who">' + (tw ? twNameHTML(c, null) : igNameHTML(c, null)) + '<span class="hide">:</span></p>');
      last = out ? "" : m.from;
      var label = b.group && !out && !m.shared ? "" : hideLabel(nameOf(c));
      if (m.shared) body.push('<p class="igdm-shared">' + hideLabel(nameOf(c)) + fmt(m.text) + "</p>");
      else if (tw && t(m.voice)) body.push('<p class="msg ' + side + ' voice">' + label + '<span class="twdm-play ic ic-play">&#9654;</span><span class="twdm-wave"></span><span class="twdm-dur">' + esc(t(m.voice)) + "</span></p>");
      else if (t(m.text)) body.push('<p class="msg ' + side + '">' + label + fmt(m.text) + "</p>");
      if (tw) (m.photos || []).forEach(function (ph) {
        var u = picUrl(ph.url);
        if (u) body.push('<p class="msg ' + side + ' pic">' + label + '<img src="' + esc(u) + '" alt="' + esc(ph.alt) + '"></p>');
        else if (t(ph.desc)) body.push('<p class="msg ' + side + ' pic text">' + label + "[" + esc(t(ph.desc)) + "]</p>");
      });
      if (tw && t(m.waReacts)) body.push('<p class="twdm-reacts' + (out ? " out" : "") + '"><span class="hide">[Reactions: </span>' + esc(t(m.waReacts)) + (t(m.waCount) ? " " + esc(t(m.waCount)) : "") + '<span class="hide">]</span></p>');
      if (tw && t(m.time)) body.push('<p class="twdm-time' + (out ? " time-out" : "") + '">' + esc(t(m.time)) + "</p>");
      if (!tw && t(m.status)) body.push('<p class="igdm-status">' + esc(t(m.status)) + "</p>");
    });
    L = L.concat(ind(body, 2));
    L.push("  </div>");
    if (tw && b.bar !== "none") L.push('  <p class="twdm-foot"><span>Start a message</span></p>');
    L.push("</div>");
    return L.join("\n");
  }

  function allHTML() {
    tlCount = 0;
    return S.blocks.map(function (b) {
      if (b.type === "imsg") return imsgHTML(b);
      if (b.type === "wa") return waHTML(b);
      if (b.type === "twthread") return twThreadHTML(b);
      if (b.type === "twfeed") return twFeedHTML(b);
      if (b.type === "igpost") return igPostHTML(b);
      if (b.type === "twdm" || b.type === "igdm") return dmHTML(b);
      return "";
    }).filter(Boolean).join("\n\n");
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
  function field(path, label, opts) {
    opts = opts || {};
    var v = get(path), id = "f-" + path.replace(/\./g, "-");
    var type = opts.type || "text";
    var lab = label ? '<label for="' + id + '">' + label + "</label>" : "";
    if (type === "check") return '<label class="ck"><input type="checkbox" id="' + id + '" data-bind="' + path + '"' + (v ? " checked" : "") + (opts.re ? " data-re" : "") + "> " + label + "</label>";
    if (type === "select") {
      return lab + '<select id="' + id + '" data-bind="' + path + '"' + (opts.re ? " data-re" : "") + ">" + opts.options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>";
      }).join("") + "</select>";
    }
    if (type === "area") return lab + '<textarea id="' + id + '" data-bind="' + path + '" rows="' + (opts.rows || 4) + '"' + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : "") + ">" + esc(v) + "</textarea>";
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
    h.push(field(P + ".kind", "", { type: "select", re: true, options: [["oneoff", "One-off: no profile"], ["new", "New profile"], ["example", "Edit an existing profile"]] }));
    if (c.kind === "oneoff") {
      // picture circle: a colour, initials yes or no, then an optional picture
      h.push('<div class="fb-row">' + field(P + ".colour", "", { type: "select", re: true, options: Object.keys(COLOURS).map(function (k) { return [k, "Colour " + k]; }) }) +
        '<span class="fb-swatch" style="background:' + COLOURS[c.colour] + '"></span>' + "</div>");
      h.push('<div class="fb-row">' + field(P + ".showInitials", "Initials in the circle", { type: "check", re: true }) +
        (c.showInitials !== false ? field(P + ".initials", "", { ph: initials(c) }) : "") + "</div>");
      h.push(field(P + ".pic", "Picture link (optional)", { type: "url", ph: "https://..." }));
      h.push(field(P + ".alt", "Picture description (optional)", { ph: "Profile picture of " + nameOf(c) }));
      h.push(field(P + ".land", "Landscape picture", { type: "check" }));
      h.push(field(P + ".num", "WhatsApp phone number (for someone not saved in the phone)", { ph: "+44 7700 900123" }));
      // their names on Twitter/X and Instagram, when there's a post or DM from those apps
      var has = function (re) { return S.blocks.some(function (b) { return re.test(b.type); }); };
      if (has(/^tw/)) h.push(field(P + ".handle", "Twitter/X handle", { ph: "@" + twHandle(c) }));
      if (has(/^ig/)) h.push(field(P + ".ighandle", "Instagram name", { ph: igName(c) }));
    } else {
      var Q = P + ".prof";
      if (c.kind === "example") {
        h.push(field(P + ".example", "Which one", { type: "select", re: true, options: existing() }));
        h.push('<p class="hint">' + (changed(c) ? "<b>Changed.</b> The new version is in the profile CSS to copy: swap it for the old one in your work skin." :
          "Change anything below and the updated profile goes in the profile CSS to copy. Leave it as it is to just use it.") + "</p>");
      } else h.push('<div class="fb-row"><span>pfp-</span>' + field(Q + ".slug", "", { ph: MP.slugify(c.name) || "name" }) + "</div>");
      h.push(field(Q + ".pic", "Picture link", { type: "url", ph: "https://..." }));
      h.push('<div class="fb-grid"><div>' + field(Q + ".piccol", "Circle colour", { type: "color" }) + "</div><div>" +
        field(Q + ".namecol", "Name colour", { type: "color" }) + "</div></div>");
      h.push('<div class="fb-grid"><div>' + field(Q + ".handle", "Handle", { ph: "no @" }) + "</div><div>" +
        field(Q + ".email", "Email address") + "</div></div>");
      h.push("<details" + (c.more ? " open" : "") + ' data-open="' + P + '.more"><summary>More profile options</summary>');
      h.push('<p class="hint">Saved as: what other characters have them saved as on their phones, and a different picture on that phone if you want one. This only works in iMessage and WhatsApp messages, and only the name works in Discord DMs. Everywhere else they show the account\'s default.</p>');
      c.prof.saved.forEach(function (s, k) {
        h.push('<div class="fb-acct"><div class="fb-row">' + field(Q + ".saved." + k + ".owner", "", { type: "select", options: [["", "On whose phone?"]].concat(S.cast.filter(isProfile).filter(function (x) { return x !== c; }).map(function (x) { return [slugOf(x), nameOf(x)]; })) }) +
          field(Q + ".saved." + k + ".as", "", { ph: "Saved as" }) + btn("saved-del:" + i + ":" + k, "&times;", "Remove") + "</div>" +
          field(Q + ".saved." + k + ".pic", "", { type: "url", ph: "Picture on their phone (optional): https://..." }) + "</div>");
      });
      h.push(btn("saved-add:" + i, "+ Saved as"));
      h.push('<p class="hint">Different on one app (only fill in what\'s different):</p>');
      MP.APPS.forEach(function (a) {
        h.push('<div class="fb-app"><b>' + a.label + "</b>" + field(Q + ".apps." + a.key + ".pic", "", { type: "url", ph: "Picture link" }) +
          field(Q + ".apps." + a.key + ".name", "", { ph: "Name" }) + (a.key === "gm" ? "" : field(Q + ".apps." + a.key + ".handle", "", { ph: "Handle" })) + "</div>");
      });
      h.push('<div class="fb-row">' + field(Q + ".dccolon", "Different name colour on Discord", { type: "check" }) + field(Q + ".dccol", "", { type: "color" }) + "</div>");
      h.push(field(Q + ".tbsq", "Rounded square picture on Tumblr", { type: "check" }));
      h.push('<p class="hint">Extra accounts: a private Instagram, a burner, a work email.</p>');
      c.prof.accounts.forEach(function (x, k) {
        var A = Q + ".accounts." + k;
        h.push('<div class="fb-acct"><div class="fb-row"><span>acc-</span>' + field(A + ".acc", "", { ph: "burner" }) +
          field(A + ".app", "", { type: "select", options: MP.APPS.map(function (a) { return [a.key, a.label]; }) }) + btn("acct-del:" + i + ":" + k, "&times;", "Remove") + "</div>" +
          field(A + ".pic", "", { type: "url", ph: "Picture link" }) + field(A + ".name", "", { ph: "Name" }) + field(A + ".handle", "", { ph: "Handle, or email address" }) +
          field(A + ".sq", "Rounded square picture (Tumblr only)", { type: "check" }) + "</div>");
      });
      h.push(btn("acct-add:" + i, "+ Extra account"));
      h.push('<p class="hint">WhatsApp wallpaper on their phone:</p>');
      h.push('<div class="fb-row">' + field(Q + ".wallcolon", "Colour", { type: "check" }) + field(Q + ".wallcol", "", { type: "color" }) + "</div>");
      h.push(field(Q + ".wallpic", "", { type: "url", ph: "Or a picture link" }));
      h.push("</details>");
    }
    h.push("</details>");
    return h.join("");
  }

  function speakerOptions(b, typingLabel) {
    return S.cast.map(function (c) { return [c.id, nameOf(c) + (c.id === b.pov ? " (phone owner)" : "")]; })
      .concat([["sys", "Date or notice line"], ["typing", typingLabel]]);
  }

  function msgRow(b, bi, m, mi) {
    var P = "blocks." + bi + ".msgs." + mi, wa = b.type === "wa", dm = b.type === "twdm" || b.type === "igdm", h = [];
    var side = m.from === b.pov ? " out" : m.from === "sys" || m.from === "typing" ? " sys" : "";
    h.push('<li class="fb-msg' + side + '">');
    h.push('<div class="fb-row">' + field(P + ".from", "", { type: "select", re: true, options: dm ? castOptions().map(function (o) { return o[0] === b.pov ? [o[0], o[1] + " (phone owner)"] : o; }) : speakerOptions(b, wa ? "Typing line" : "Typing dots") }));
    if (!(m.from === "typing" && !wa)) h.push(field(P + ".text", "", { ph: m.from === "sys" ? "Today 11:48 PM" : m.from === "typing" ? "Lily is typing..." : m.photos.length || m.link ? "(no text, open extras for more)" : "Message", cls: "fb-text" }));
    if ((wa || b.type === "twdm") && m.from !== "sys" && m.from !== "typing") h.push(field(P + ".time", "", { ph: wa ? "09:15" : "10:14 PM", cls: "fb-time" }));
    h.push('<span class="fb-tools">' + (m.from === "sys" || m.from === "typing" ? "" : btn("msg-more:" + bi + ":" + mi, m.open ? "Less" : "Extras", "Extras for this message")) +
      btn("msg-up:" + bi + ":" + mi, "&uarr;", "Move up") + btn("msg-down:" + bi + ":" + mi, "&darr;", "Move down") +
      btn("msg-ins:" + bi + ":" + mi, "+", "Add a message under this one") + btn("msg-del:" + bi + ":" + mi, "&times;", "Delete this message") + "</span></div>");
    if (m.open && dm) {
      // Twitter/X and Instagram DMs have fewer extras
      h.push('<div class="fb-extras">' + fmtButtons());
      if (b.type === "twdm") {
        h.push('<div class="fb-row">' + field(P + ".waReacts", "Reactions", { ph: "😏" }) + field(P + ".waCount", "Count", { ph: "1", cls: "fb-time" }) + "</div>");
        h.push(field(P + ".voice", "Voice message: its length (this replaces the text)", { ph: "0:02" }));
        h.push(pictureRows(P, bi, mi, m, 0, false));
      } else {
        h.push(field(P + ".shared", "A shared post, reel or story (the text goes in an outlined box)", { type: "check" }));
        h.push(field(P + ".status", "Line under it (e.g. Seen, or Seen by 3)", {}));
      }
      h.push("</div>");
    }
    if (m.open && !dm && m.from !== "sys" && m.from !== "typing") {
      h.push('<div class="fb-extras">');
      h.push('<p class="hint">Select some words in the message, then: ' + btn("fmt:tl", "Translation") + " " + btn("fmt:egg", "Easter egg") + " " +
        btn("fmt:del", "Cross out") + " " + btn("fmt:link", "Fake link") + "</p>");
      if (!wa) {
        h.push(field(P + ".sms", "Green text message (SMS)", { type: "check" }));
        h.push('<p class="hint">Tapbacks (one emoji per person):</p>');
        m.reacts.forEach(function (r, k) {
          h.push('<div class="fb-row">' + field(P + ".reacts." + k + ".by", "", { type: "select", options: S.cast.map(function (c) { return [c.id, nameOf(c)]; }) }) +
            field(P + ".reacts." + k + ".emoji", "", { ph: "❤️", cls: "fb-emoji" }) + btn("tap-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>");
        });
        h.push(btn("tap-add:" + bi + ":" + mi, "+ Tapback"));
        h.push(field(P + ".status", "Line under it (e.g. Delivered, or Read 11:52 PM)", {}));
      } else {
        if (m.from === b.pov) h.push(field(P + ".tick", "Ticks", { type: "select", options: [["read", "Read (blue)"], ["delivered", "Delivered (grey)"], ["sent", "Sent (one tick)"], ["", "None"]] }));
        h.push(field(P + ".big", "Large emoji (an emoji on its own)", { type: "check" }));
        var earlier = b.msgs.slice(0, mi).filter(function (x) { return char(x.from); });
        h.push(field(P + ".replyTo", "Replying to", { type: "select", options: [["", "Not a reply"]].concat(earlier.map(function (x) {
          var t = plain(x.text).trim() || "(photo)"; return [x.id, nameOf(char(x.from)) + ": " + (t.length > 40 ? t.slice(0, 40) + "..." : t)];
        })) }));
        h.push('<div class="fb-row">' + field(P + ".waReacts", "Reactions", { ph: "❤️ 😂" }) + field(P + ".waCount", "Count", { ph: "2", cls: "fb-time" }) + "</div>");
        if (!m.link) h.push(btn("link-add:" + bi + ":" + mi, "+ Link preview"));
        else {
          var K = P + ".link";
          h.push('<div class="fb-acct"><p class="hint">Link preview (the message text becomes the caption under it): ' + btn("link-del:" + bi + ":" + mi, "Remove") + "</p>" +
            field(K + ".url", "", { ph: "Web address" }) + field(K + ".showUrl", "Show the address above the preview too", { type: "check" }) +
            field(K + ".title", "", { ph: "Title" }) + field(K + ".desc", "", { ph: "Description" }) +
            field(K + ".img", "", { type: "url", ph: "Picture link" }) + field(K + ".alt", "", { ph: "Describe the picture" }) +
            field(K + ".video", "", { type: "url", ph: "Or a video embed link (Vimeo, YouTube or the Internet Archive)" }) +
            field(K + ".imgdesc", "", { ph: "Describe the video, or with no picture, describe the picture" }) + "</div>");
        }
      }
      h.push(field(P + ".edited", "Edited", { type: "check" }));
      h.push('<p class="hint">Pictures' + (wa ? " (up to four; with pictures, the message text becomes the caption)" : "") + ":</p>");
      m.photos.forEach(function (p, k) {
        var K = P + ".photos." + k;
        h.push('<div class="fb-acct"><div class="fb-row">' + field(K + ".url", "", { type: "url", ph: "Picture link" }) + btn("photo-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>" +
          field(K + ".alt", "", { ph: "Describe the picture (alt text)" }) + field(K + ".desc", "", { ph: "Or, with no picture, describe it in words" }) +
          (wa ? field(K + ".land", "Landscape picture", { type: "check" }) : "") + "</div>");
      });
      if (!wa || m.photos.length < 4) h.push(btn("photo-add:" + bi + ":" + mi, "+ Picture"));
      h.push("</div>");
    }
    h.push("</li>");
    return h.join("");
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
    var plus = ty === "twthread" ? "Add a reply below this" : ty === "twfeed" ? "Add a tweet below this" : ty === "igpost" ? "Add a comment below this" : "Add a message below this";
    return '<span class="fb-tools">' + (extras ? btn("msg-more:" + bi + ":" + mi, m.open ? "Less" : "Extras", "Extras") : "") +
      btn("msg-up:" + bi + ":" + mi, "&uarr;", "Move up") + btn("msg-down:" + bi + ":" + mi, "&darr;", "Move down") +
      btn("msg-ins:" + bi + ":" + mi, "+", plus) + btn("msg-del:" + bi + ":" + mi, "&times;", "Delete") + "</span>";
  }
  function fmtButtons() {
    return '<p class="hint">Select some words in the text, then: ' + btn("fmt:tl", "Translation") + " " + btn("fmt:egg", "Easter egg") + " " +
      btn("fmt:del", "Cross out") + " " + btn("fmt:link", "Fake link") + "</p>";
  }

  // one tweet in a timeline or thread
  function tweetRow(b, bi, m, mi) {
    var P = "blocks." + bi + ".msgs." + mi, h = [], thread = b.type === "twthread";
    h.push('<li class="fb-msg' + (thread && mi === 0 ? " out" : "") + '">');
    if (thread) h.push('<p class="hint"><b>' + (mi === 0 ? "The tweet" : "Reply") + "</b></p>");
    h.push('<div class="fb-row">' + field(P + ".from", "", { type: "select", re: true, options: castOptions() }) +
      field(P + ".time", "", { ph: "2h", cls: "fb-time" }) + rowTools(bi, mi, m, true) + "</div>");
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
      h.push(field(P + ".verified", "Blue verified tick", { type: "check" }));
      h.push(field(P + ".label", "Little grey label (Promoted, or a Twitter Circle notice)", {}));
      h.push('<div class="fb-grid"><div>' + field(P + ".reposts", "Reposts", { ph: "580" }) + field(P + ".reposted", "Reposted (green)", { type: "check" }) + "</div><div>" +
        field(P + ".likes", "Likes", { ph: "2.6k" }) + field(P + ".liked", "Liked (pink)", { type: "check" }) + "</div><div>" +
        field(P + ".replies", "Replies", { ph: "10" }) + "</div></div>");
      h.push(field(P + ".date", "Exact time and date (for a tweet opened on its own)", { ph: "8:23 AM · 11 May 23" }));
      h.push(field(P + ".poll", "Poll: one option per line. For a finished poll, put the percentage after each one, like Montreal 75%", { type: "area", rows: 2 }));
      if (t(m.poll)) h.push(field(P + ".pollinfo", "Under the poll", { ph: "179 votes · 13 minutes left" }));
      h.push('<p class="hint">Quote tweet:</p><div class="fb-grid"><div>' + field(P + ".qName", "", { ph: "Their name" }) + "</div><div>" + field(P + ".qHandle", "", { ph: "Their handle" }) + "</div></div>" +
        field(P + ".qText", "", { ph: "What they said" }));
      h.push(field(P + ".note", "Community note", { ph: "Readers added context: ..." }));
      h.push(pictureRows(P, bi, mi, m, 4, true));
      h.push(field(P + ".warn", "Cover the pictures with a sensitive content warning", { type: "check" }));
      h.push('<p class="hint">Or a video:</p>' + field(P + ".vUrl", "", { type: "url", ph: "Video embed link (Vimeo, YouTube or the Internet Archive)" }) +
        field(P + ".vTitle", "", { ph: "The video's title" }) + field(P + ".vDesc", "", { ph: "Describe the video" }));
      h.push("</div>");
    }
    h.push("</li>");
    return h.join("");
  }
  // one comment on an Instagram post
  function commentRow(b, bi, m, mi) {
    var P = "blocks." + bi + ".msgs." + mi;
    return '<li class="fb-msg"><div class="fb-row">' + field(P + ".from", "", { type: "select", re: true, options: castOptions() }) +
      field(P + ".text", "", { ph: "Comment", cls: "fb-text" }) + rowTools(bi, mi, m, false) + "</div>" + accField(P + ".acc", char(m.from), "ig") + "</li>";
  }
  // the Instagram post itself
  function igSettings(b, i) {
    var P = "blocks." + i, h = [];
    h.push("<details" + (b.open ? " open" : "") + ' data-open="' + P + '.open"><summary>The post</summary>');
    h.push('<div class="fb-grid"><div>' + field(P + ".from", "Who posted it", { type: "select", re: true, options: castOptions() }) + "</div><div>" +
      field(P + ".theme", "Light, dark, or auto", { type: "select", options: [["theme-light", "Light"], ["theme-dark", "Dark"], ["theme-auto", "Auto"]] }) + "</div><div>" +
      field(P + ".scroll", "Long posts", { type: "select", options: [["", "Scroll inside the phone"], ["no-scroll", "Show it all"]] }) + "</div></div>");
    h.push(accField(P + ".acc", char(b.from), "ig"));
    h.push(field(P + ".story", "Story ring", { type: "check" }) + " " + field(P + ".verified", "Verified tick", { type: "check" }) + " " +
      field(P + ".follow", "Follow link", { type: "check" }) + " " + field(P + ".menu", "Three dots menu", { type: "check" }));
    h.push('<div class="fb-row">' + field(P + ".underKind", "", { type: "select", options: [["location", "Location"], ["song", "Song"]] }) + field(P + ".under", "", { ph: "Under the name: Ottawa, Ontario, or Artist - Song" }) + "</div>");
    h.push('<p class="hint">The photo:</p>' + field(P + ".photo.url", "", { type: "url", ph: "Picture link" }) + field(P + ".photo.alt", "", { ph: "Describe the picture (alt text)" }) +
      field(P + ".photo.desc", "", { ph: "Or, with no picture, describe it in words" }));
    h.push('<p class="hint">Buttons (leave a count empty to leave that button out):</p><div class="fb-grid"><div>' +
      field(P + ".likes", "Likes", { ph: "2,431" }) + field(P + ".likeClick", "Readers can click it", { type: "check", re: true }) + (b.likeClick ? field(P + ".liked", "Already liked", { type: "check" }) : "") + "</div><div>" +
      field(P + ".cmCount", "Comments", { ph: "84" }) + "</div><div>" + field(P + ".reposts", "Reposts", { ph: "12" }) + "</div><div>" +
      field(P + ".shares", "Shares", { ph: "7" }) + "</div><div>" + field(P + ".saveClick", "Save button", { type: "check", re: true }) +
      (b.saveClick ? field(P + ".saved", "Already saved", { type: "check" }) : "") + "</div></div>");
    h.push(field(P + ".likesLine", "Likes line", { type: "select", re: true, options: [["count", "The number of likes"], ["faces", "Liked by, with faces"], ["none", "None"]] }));
    if (b.likesLine === "faces") {
      b.faces.forEach(function (f, k) {
        h.push('<div class="fb-row">' + field(P + ".faces." + k, "", { type: "select", options: castOptions() }) + btn("face-del:" + i + ":" + k, "&times;", "Remove") + "</div>");
      });
      if (b.faces.length < 3) h.push(btn("face-add:" + i, "+ Face"));
      h.push('<p class="hint">It says "Liked by" the first one, "and others".</p>');
    }
    h.push(field(P + ".caption", "Caption (#hashtags are coloured by themselves)", { type: "area", rows: 2 }));
    h.push(field(P + ".viewAll", "\"View all comments\" line", { type: "check" }));
    h.push(field(P + ".time", "Time posted", { ph: "3 hours ago" }));
    h.push("</details>");
    return h.join("");
  }
  // the settings for a chat: iMessage, WhatsApp, and the Twitter/X and Instagram DMs
  function chatSettings(b, i) {
    var P = "blocks." + i, h = [], wa = b.type === "wa", dm = b.type === "twdm" || b.type === "igdm";
    h.push("<details" + (b.open ? " open" : "") + ' data-open="' + P + '.open"><summary>Chat settings</summary><div class="fb-grid">');
    h.push("<div>" + field(P + ".pov", "Whose phone is it?", { type: "select", re: true, options: castOptions() }) + "</div>");
    h.push("<div>" + field(P + ".group", "Group chat", { type: "check", re: true }) + (wa && b.group ? field(P + ".pics", "Show pictures by names", { type: "check" }) : "") + "</div>");
    h.push("<div>" + field(P + ".title", "Name at the top", { ph: b.group ? "Group chat name" : "The other person's name" }) + "</div>");
    h.push("<div>" + field(P + ".sub", "Smaller line under it", { ph: wa ? "online" : b.type === "twdm" ? "Their @handle" : b.type === "igdm" ? "Active now" : "iMessage" }) + "</div>");
    h.push("<div>" + field(P + ".theme", "Light, dark, or auto", { type: "select", options: [["theme-light", "Light"], ["theme-dark", "Dark"], ["theme-auto", "Auto"]] }) + "</div>");
    h.push("<div>" + field(P + ".width", "Width", { type: "select", options: [["", "Phone width"], ["wide", "Full width"]] }) + "</div>");
    h.push("<div>" + field(P + ".scroll", "Long chats", { type: "select", options: [["", "Scroll inside the phone"], ["no-scroll", "Show it all"]] }) + "</div>");
    if (wa) {
      h.push("<div>" + field(P + ".header", "Header", { type: "select", re: true, options: [["simple", "Simple"], ["bar", "With picture and icons"]] }) + "</div>");
      h.push("<div>" + field(P + ".bg", "Background", { type: "select", options: BACKGROUNDS.map(function (x) { return [x, x ? x.charAt(0).toUpperCase() + x.slice(1) : "Normal"]; }) }) + "</div>");
    }
    if (b.type === "twdm") h.push("<div>" + field(P + ".bar", "Start a message bar", { type: "select", options: [["empty", "Yes"], ["none", "No"]] }) + "</div>");
    else if (!dm) {
      h.push("<div>" + field(P + ".bar", "Message bar at the bottom", { type: "select", re: true, options: [["none", "None"], ["empty", "Empty"], ["typed", "Something half-typed"]] }) + "</div>");
      if (b.bar === "typed") h.push("<div>" + field(P + ".barText", "Half-typed message", {}) + "</div>");
    }
    h.push("</div>");
    if (dm && !b.group) {
      var o = others(b)[0];
      h.push(accField(P + ".acc", o, b.type === "twdm" ? "tw" : "ig"));
    }
    if (wa && b.group && b.header === "bar") {
      // the group's picture in the header
      if (!b.gp) b.gp = newGroupPic();
      var G = P + ".gp";
      h.push('<div class="fb-acct"><p class="hint">The group\'s picture in the header</p>');
      h.push('<div class="fb-row">' + field(G + ".colour", "", { type: "select", re: true, options: Object.keys(COLOURS).map(function (k) { return [k, "Colour " + k]; }) }) +
        '<span class="fb-swatch" style="background:' + COLOURS[b.gp.colour] + '"></span>' + "</div>");
      h.push('<div class="fb-row">' + field(G + ".showInitials", "Initials in the circle", { type: "check", re: true }) +
        (b.gp.showInitials !== false ? field(G + ".initials", "", { ph: (b.title.trim() || "G").charAt(0).toUpperCase() }) : "") + "</div>");
      h.push(field(G + ".pic", "Picture link (optional)", { type: "url", ph: "https://..." }));
      h.push(field(G + ".alt", "Picture description (optional)", { ph: "Profile picture of " + (b.title.trim() || "the group") }));
      h.push(field(G + ".land", "Landscape picture", { type: "check" }) + "</div>");
    }
    h.push("</details>");
    return h.join("");
  }
  var SCRIPT_HINTS = {
    chat: "One message per line, starting with who's talking and a colon. A line on its own with no name carries on from the last person. Start a line with -- for a date or notice line, and put a time first if you like, like 09:15 Lily: hi. New names are added to the cast.",
    twthread: "One tweet per line, starting with who's posting and a colon. The first one is the tweet, and the rest are replies. Each reply answers the tweet just above it, and you can change who it's replying to in the list. New names are added to the cast.",
    twfeed: "One tweet per line, starting with who's posting and a colon. New names are added to the cast.",
    igpost: "One comment per line, starting with who's commenting and a colon. New names are added to the cast."
  };
  function blockCard(b, i) {
    var P = "blocks." + i, h = [], chat = isChat(b);
    h.push('<section class="fb-block" data-i="' + i + '">');
    h.push('<div class="fb-bhead"><b>' + (i + 1) + ". " + KINDS[b.type] + "</b><span class=\"fb-tools\">" +
      btn("blk-up:" + i, "&uarr;", "Move up") + btn("blk-down:" + i, "&darr;", "Move down") + btn("blk-del:" + i, "&times;", "Delete this") + "</span></div>");
    if (chat) h.push(chatSettings(b, i));
    else if (b.type === "igpost") h.push(igSettings(b, i));
    else {
      h.push('<div class="fb-grid"><div>' + field(P + ".theme", "Light, dark, or auto", { type: "select", options: [["theme-light", "Light"], ["theme-dark", "Dark"], ["theme-auto", "Auto"]] }) + "</div><div>" +
        field(P + ".width", "Width", { type: "select", options: [["", "Phone width"], ["wide", "Full width"]] }) + "</div>" +
        (b.type === "twthread" ? "<div>" + field(P + ".bar", "Tweet your reply bar", { type: "select", options: [["empty", "Yes"], ["none", "No"]] }) + "</div>" : "") + "</div>");
    }
    if (b.type === "igpost") h.push('<p class="hint"><b>Comments</b></p>');
    var row = chat ? msgRow : b.type === "igpost" ? commentRow : tweetRow;
    h.push('<ol class="fb-msgs">' + b.msgs.map(function (m, mi) { return row(b, i, m, mi); }).join("") + "</ol>");
    var ph = chat ? "Ilya: are you awake\nShane: no\n-- Today 11:48 PM" : b.type === "igpost" ? "shane.h: why are you awake" : "Zim: Reminder to everyone...\nHolster: I played all through college...";
    // tweets and comments get their add button straight under the list; chats keep theirs by the script box
    var addOne = btn("msg-add:" + i, b.type === "igpost" ? "+ Add a comment" : chat ? "+ One empty message" : b.type === "twthread" ? (b.msgs.length ? "+ Add a reply" : "+ Add the tweet") : "+ Add a tweet");
    if (!chat) h.push("<p>" + addOne + "</p>");
    h.push('<div class="fb-script">' + field(P + ".script", b.type === "igpost" ? "Type or paste comments" : chat ? "Type or paste messages" : "Type or paste tweets", { type: "area", rows: 4, ph: ph }) +
      '<p class="hint">' + (SCRIPT_HINTS[chat ? "chat" : b.type]) + "</p>" +
      btn("script:" + i, "Add these") + (chat ? " " + addOne : "") + "</div>");
    h.push("</section>");
    return h.join("");
  }

  function renderEditor() {
    S.cast.forEach(function (c) { if (c.kind === "example" && c.loadedFrom !== c.example) loadProfile(c); });
    $("fb-cast").innerHTML = S.cast.map(castCard).join("");
    $("fb-blocks").innerHTML = S.blocks.map(blockCard).join("") || '<p class="hint">Nothing here yet. Add a chat below.</p>';
  }

  // remake the preview and the copy boxes (after every change)
  function refresh() {
    save();
    var html = allHTML(), css = profilesCSS();
    $("fb-live").textContent = (S.pasted || "") + "\n\n" + css;
    $("workskin").innerHTML = html;
    $("fb-html").value = html;
    $("fb-css").value = css;
    $("fb-css-wrap").hidden = !css;
  }
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
      if (/^--/.test(line) && (b.type === "imsg" || b.type === "wa")) { b.msgs.push(newMsg("sys", line.replace(/^-+\s*/, ""))); return; }
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
    rerender();
  }

  // ---------- events ----------

  function onInput(e) {
    var el = e.target, path = el.getAttribute("data-bind");
    if (!path) return;
    var v = el.type === "checkbox" ? el.checked : el.value;
    set(path, v);
    if (/^cast\.\d+\.prof\.slug$/.test(path)) get(path.replace(/slug$/, "")).slugTouched = true;
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
      case "paste-add":
        S.pasted = ((S.pasted || "").trim() + "\n\n" + $("fb-paste").value.trim()).trim();
        $("fb-paste").value = "";
        $("fb-paste-box").hidden = true;
        addPasted();
        break;
      case "cast-del":
        if (!confirm("Remove " + nameOf(S.cast[n[0]]) + " from the cast? Their messages will disappear too.")) return;
        S.cast.splice(n[0], 1); break;
      case "face-add": b.faces.push(S.cast[0] ? S.cast[0].id : ""); break;
      case "face-del": b.faces.splice(n[1], 1); break;
      case "saved-add": S.cast[n[0]].prof.saved.push({ owner: "", as: "", pic: "" }); break;
      case "saved-del": S.cast[n[0]].prof.saved.splice(n[1], 1); break;
      case "acct-add": S.cast[n[0]].prof.accounts.push({ acc: "", app: "ig", pic: "", name: "", handle: "", sq: false }); break;
      case "acct-del": S.cast[n[0]].prof.accounts.splice(n[1], 1); break;
      case "add": S.blocks.push(newBlock(a[1])); break;
      case "blk-up": move(S.blocks, n[0], -1); break;
      case "blk-down": move(S.blocks, n[0], 1); break;
      case "blk-del": if (!confirm("Delete this chat?")) return; S.blocks.splice(n[0], 1); break;
      case "script": addScript(n[0]); return;
      case "msg-add":
        // a new message or tweet is from the last person, or else from the first person in the cast
        var lastM = b.msgs[b.msgs.length - 1], who = lastM && char(lastM.from) ? lastM.from : char(b.pov) ? b.pov : S.cast[0] && S.cast[0].id;
        if (!who) { var someone = newChar("Someone"); S.cast.push(someone); who = someone.id; }
        b.msgs.push(newMsg(who, "", lastM ? lastM.time : "")); break;
      case "msg-ins": b.msgs.splice(n[1] + 1, 0, newMsg(m.from, "", m.time)); break;
      case "msg-up": move(b.msgs, n[1], -1); break;
      case "msg-down": move(b.msgs, n[1], 1); break;
      case "msg-del": b.msgs.splice(n[1], 1); break;
      case "msg-more": m.open = !m.open; break;
      case "tap-add": m.reacts.push({ by: b.pov, emoji: "" }); break;
      case "tap-del": m.reacts.splice(n[2], 1); break;
      case "photo-add": m.photos.push({ url: "", alt: "", desc: "", land: false }); break;
      case "photo-del": m.photos.splice(n[2], 1); break;
      case "link-add": m.link = { url: "", showUrl: false, title: "", desc: "", img: "", alt: "", video: "", imgdesc: "" }; break;
      case "link-del": m.link = null; break;
      case "copy-html": copy("fb-html", t); return;
      case "copy-css": copy("fb-css", t); return;
      case "save-html": saveHTML(); return;
      case "save-css": download("megaskin-profiles.css", allProfilesCSS(), "text/css"); return;
      case "new": if (!confirm("Start again? Everything here will be cleared, so download your HTML and CSS first if you want to keep them.")) return; S = { v: 1, pasted: "", cast: [], blocks: [] }; break;
      case "example": if (!confirm("Load this example? Everything here will be replaced, so download your HTML and CSS first if you want to keep them.")) return; loadExample(+$("fb-example").value); break;
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
    } else if (kind === "del") out = "~~" + sel + "~~";
    else out = "<<" + sel + ">>";
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
  $("fb-open-html").addEventListener("change", function () {
    openFile(this, function (text) {
      var i = text.lastIndexOf("<!-- " + MARK);
      try { var d = JSON.parse(text.slice(i + 5 + MARK.length, text.lastIndexOf("-->")).trim()); if (i < 0 || !d.cast || !d.blocks) throw 0; S = d; rerender(); }
      catch (err) { alert("That file wasn't saved from the Fic Builder, so it can't be opened here."); }
    });
  });
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
