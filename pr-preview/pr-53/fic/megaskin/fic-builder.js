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
    twthread: "Twitter/X tweet and replies",
    twfeed: "Twitter/X timeline",
    twdm: "Twitter/X DM",
    text: "Story text"
  };
  function isChat(b) { return b.type === "imsg" || b.type === "wa" || b.type === "twdm"; }

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
    b.pov = pov; b.group = false; b.title = ""; b.sub = type === "imsg" ? "iMessage" : "online";
    b.theme = "theme-auto"; b.width = ""; b.scroll = ""; b.bar = "empty"; b.barText = "";
    b.bg = ""; b.pics = true; b.header = "simple"; b.gp = newGroupPic(); b.script = ""; b.msgs = []; b.open = true;
    b.acc = "";
    b.html = ""; // story text, written in the rich text box
    b.nav = false; b.badge = ""; // Twitter/X DMs: the row of app buttons at the bottom
    b.era = ""; b.app = ""; b.tabs = ""; // Twitter/X: the 2020 look, and the X app screen around a timeline
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
      ["colour", "initials", "showInitials", "pic", "alt", "num", "land", "handle"].forEach(function (k) { if (p[k] !== undefined) c[k] = p[k]; });
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
      Object.keys(x).forEach(function (k) { if (["reacts", "photos", "link", "reply", "time", "by", "contact"].indexOf(k) < 0) m[k] = x[k]; });
      if (x.by) m.by = ids[x.by];
      if (x.contact) m.contact = ids[x.contact];
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
    if (b.bar === "typed") L.push('  <p class="imsg-input"><span class="imsg-plus">+</span><span class="hide"> </span><span class="imsg-field typed">' + fmt(b.barText) + (b.cursor ? CURSOR : "") + '<span class="hide"> </span><span class="imsg-send ic ic-imsg-send">&#8593;</span></span></p>');
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
      L = L.concat(ind(['<table class="wa-bar">', "  <tbody>", "    <tr>",
        '      <td rowspan="2" class="wa-back"><span class="ic ic-back">&#8592;</span></td>',
        '      <td rowspan="2" class="wa-pfp-cell">' + pc + "</td>",
        '      <td class="wa-title">' + headTitle(b) + "</td>",
        '      <td rowspan="2" class="wa-actions"><span class="ic ic-video">&#127909;</span> <span class="ic ic-menu">&#8942;</span></td>',
        "    </tr>", "    <tr>", '      <td class="wa-sub">' + esc(sub) + "</td>", "    </tr>", "  </tbody>", "</table>"], 1));
    } else if (b.header !== "none") L.push("  " + mobHead(b));
    L.push('  <div class="mob-body">');
    var body = [];
    b.msgs.forEach(function (m) {
      if (m.from === "sys") { body.push('<p class="mob-sys">' + fmt(m.text) + "</p>"); last = ""; return; }
      if (m.from === "typing") {
        var tc = typer(b, m); if (!tc) return;
        var tOut = tc.id === b.pov, tWho = b.group && !tOut;
        var tb = ['<div class="msg ' + (tOut ? "out" : "in") + ' tail typing-indicator">'];
        if (tWho) tb.push('  <p class="who ' + (isProfile(tc) ? "pfp-" + slugOf(tc) : colourClass(tc)) + '">' + waName(tc) + "</p>");
        tb.push('  <p class="hide">' + typingHide(tc, !tWho) + "</p>", "  <p><span></span><span></span><span></span></p>", "</div>");
        if (!tWho) tb = [tb[0] + tb.slice(1, -1).map(function (x) { return x.trim(); }).join("") + "</div>"];
        if (tWho && b.pics) tb = ['<div class="wa-row">', "  " + waPfp(tc)].concat(ind(tb, 1)).concat(["</div>"]);
        body = body.concat(tb);
        last = ""; return;
      }
      var c = char(m.from); if (!c) return;
      var out = m.from === b.pov, side = out ? "out" : "in";
      var first = last !== m.from;
      last = m.from;
      var showWho = b.group && !out && first;
      var rows = b.group && b.pics && !out;
      var photos = (m.photos || []).filter(function (p) { return picUrl(p.url) || p.desc.trim(); });
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
      var tick = !out || card ? "" : m.tick === "read" ? ' <span class="wa-read ic ic-read">✓✓</span>' :
        m.tick === "delivered" ? ' <span class="ic ic-delivered">✓✓</span>' : m.tick === "sent" ? ' <span class="ic ic-sent">✓</span>' : "";
      // a blank time with no ticks leaves the line out
      if (m.time.trim() || tick || (m.edited && !card)) inner.push('<p class="wa-time">' + (m.edited && !card ? "Edited " : "") + esc(m.time.trim()) + tick + "</p>");
      if (card === "contact") inner.push('<p class="wa-cbtn">Message</p>');
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
        typed ? '    <span class="wa-ph typed">' + fmt(b.barText) + (b.cursor ? CURSOR : "") + "</span>" : '    <span class="wa-ph">Message</span>',
        '    <span class="wa-ic ic ic-paperclip">&#128206;</span>'].concat(typed ? [] : ['    <span class="wa-ic ic ic-camera">&#128247;</span>'])
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
      '  <p class="mob-head"><span class="twdm-back"><span class="ic ic-back">&#8592;</span></span>' + (head ? circle("tw-pfp", head) : '<span class="tw-pfp colour5">?</span>') +
      '<span class="twdm-name">' + name + '</span><span class="twdm-calls"><span class="ic ic-video">&#127909;</span><span class="ic ic-phone">&#128222;</span></span></p>',
      '  <div class="mob-body">'];
    // in a group, each run of messages from one person goes in a row, with their picture and name first
    var body = [], row = null;
    function close() { if (row) body = body.concat(['<div class="twdm-row">'], ind(row.lines, 1), ["</div>"]); row = null; }
    b.msgs.forEach(function (m) {
      if (m.from === "sys") { close(); body.push('<p class="mob-sys">' + fmt(m.text) + "</p>"); return; }
      var c = char(m.from); if (!c) return;
      var out = m.from === b.pov, side = out ? "out" : "in", grouped = b.group && !out;
      if (!grouped || (row && row.from !== m.from)) close();
      if (grouped && !row) row = { from: m.from, first: true, lines: [pfpLine(c), '<p class="who">' + dmName(c) + '<span class="hide">:</span></p>'] };
      var to = grouped ? row.lines : body;
      var q = m.replyTo && b.msgs.filter(function (x) { return x.id === m.replyTo; })[0];
      if (q && char(q.from)) {
        var qt = plain(q.text).trim() || (q.photos.length ? "Photo" : t(q.voice) ? "Voice message" : "");
        if (qt.length > 60) qt = qt.slice(0, 57).trim() + "...";
        to.push('<p class="twdm-replied' + (out ? " out" : "") + '">Replied to ' + (q.from === b.pov ? "you" : esc(nameOf(char(q.from)))) + "</p>",
          '<p class="msg ' + side + ' twdm-quote"><span class="hide">(</span>' + esc(qt) + '<span class="hide">)</span></p>');
      }
      var bubbles = [];
      (m.photos || []).forEach(function (ph) {
        var u = picUrl(ph.url);
        if (u) bubbles.push([side + " pic", '<img src="' + esc(u) + '" alt="' + esc(ph.alt) + '">']);
        else if (t(ph.desc)) bubbles.push([side + " pic text", "[" + esc(t(ph.desc)) + "]"]);
      });
      if (t(m.text)) bubbles.push([side, fmt(m.text)]);
      if (t(m.voice)) bubbles.push([side + " voice", '<span class="twdm-play ic ic-play">&#9654;</span><span class="twdm-wave"></span><span class="twdm-dur">' + esc(t(m.voice)) + "</span>"]);
      bubbles.forEach(function (bb) {
        // the first message under a name in a group needs no hidden name: the name is just above it
        to.push('<p class="msg ' + bb[0] + '">' + (grouped && row.first ? "" : hideLabel(nameOf(c))) + bb[1] + "</p>");
        if (grouped) row.first = false;
      });
      if (t(m.waReacts)) to.push('<p class="twdm-reacts' + (out ? " out" : "") + '"><span class="hide">[Reactions: </span>' + esc(t(m.waReacts)) + '<span class="hide">]</span></p>');
      if (t(m.status)) to.push('<p class="twdm-status">' + esc(t(m.status)) + "</p>");
    });
    close();
    L = L.concat(ind(body, 2));
    L.push("  </div>");
    if (b.bar === "empty") L.push('  <p class="twdm-input"><span class="twdm-plus">+</span><span class="hide"> </span><span class="twdm-field">Message<span class="hide"> </span><span class="ic ic-mic">&#127908;</span></span></p>');
    if (b.bar === "typed") L.push('  <p class="twdm-input"><span class="twdm-plus">+</span><span class="hide"> </span><span class="twdm-field typed">' + fmt(b.barText) + (b.cursor ? CURSOR : "") + '<span class="hide"> </span><span class="ic ic-mic">&#127908;</span></span></p>');
    if (b.nav) L.push('  <p class="tw-nav"><span class="ic ic-x-home">&#8962;</span> <span class="ic ic-x-search">&#128269;</span> <span class="ic ic-x-grok">&#8856;</span> ' +
      (t(b.badge) ? '<span class="tw-badged"><span class="ic ic-x-bell">&#128276;</span><span class="tw-badge"><span class="hide"> (</span>' + esc(t(b.badge)) + '<span class="hide">)</span></span></span>' : '<span class="ic ic-x-bell">&#128276;</span>') +
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
    if (u) return '<span class="' + cls + '"><span class="pfp"><img ' + (c.land ? 'class="land" ' : "") + 'src="' + esc(u) + '" alt="' + esc(t(c.alt) || ("Profile picture of " + nameOf(c))) + '"></span></span>';
    return '<span class="' + cls + " " + colourClass(c) + '">' + (c.showInitials !== false ? esc(initials(c)) : "") + "</span>";
  }
  function plural(n, one, many) { return t(n) === "1" ? one : many; }

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
      return '<p class="tw-opt res' + (win ? " win" : "") + " p" + size + '"><span class="tw-bar">' + esc(o.text) + voted + '</span><span class="hide"> </span><span class="tw-pct">' + pct + "%</span></p>";
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
    if (v) return ['<div class="tw-media video"><iframe src="' + esc(v) + '" frameborder="0" title="' + esc(t(m.vTitle) || "Video") + '"></iframe>' +
      (t(m.vDesc) ? '<p class="vid-desc">[' + esc(t(m.vDesc)) + "]</p>" : "") + "</div>"];
    var ph = pics ? (m.photos || []).filter(function (p) { return picUrl(p.url) || t(p.desc); }).slice(0, 4) : [];
    if (!ph.length) return [];
    function img(p) { return '<img ' + (p.land ? 'class="land" ' : "") + 'src="' + esc(picUrl(p.url)) + '" alt="' + esc(p.alt) + '">'; }
    if (ph.length === 1) return ['<p class="tw-media">' + (picUrl(ph[0].url) ? img(ph[0]) : "<span>[" + esc(t(ph[0].desc)) + "]</span>") + "</p>"];
    return ['<p class="tw-media ' + ["two", "three", "four"][ph.length - 2] + '">'].concat(ph.map(function (p) {
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
    if (m.locked || m.noRepost) L.push(stat(" tw-locked", "repost", 8644, ""));
    else L.push(stat(m.reposted ? " tw-rt" : "", "repost", 8644, m.reposts, old ? "retweet" : "repost", old ? "retweets" : "reposts"));
    // a like readers can click goes up by one, and turns red
    if (m.likeClick) L.push('  <details class="tw-stat tw-tog"' + (m.liked ? " open" : "") + '><summary><span class="ic ic-tw-like">&#9825;</span><span class="off">' +
      (t(m.likes) ? " " + esc(t(m.likes)) : "") + '</span><span class="hide"> likes (</span><span class="on"> ' + esc(bumpCount(m.likes)) + '</span><span class="hide"> once liked)</span></summary></details>');
    else L.push(stat(m.liked ? " tw-liked" : "", "like", 9825, m.likes, "like", "likes"));
    if (!old && t(m.views) !== "-") L.push(stat("", "views", 128202, m.views, "view", "views"));
    // a bookmark readers can click turns blue
    if (!old && m.saveClick) L.push('  <details class="tw-stat tw-end tw-tog"' + (m.saved ? " open" : "") + '><summary><span class="ic ic-tw-bookmark">&#128278;</span><span class="hide"> Bookmark</span></summary></details>');
    else if (!old) L.push(stat(" tw-end" + (m.saved ? " tw-saved" : ""), "bookmark", 128278, ""));
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
    if (!b.app) return tweets.join("\n\n");
    // the X app screen: the pov character's picture and the logo, then the tabs, then the tweets
    var me = char(b.pov) || S.cast[0], old = b.era === "tw2020";
    var L = ['<div class="tw-thread app' + (old ? " tw2020" : "") + " " + b.theme + (b.width ? " " + b.width : "") + '">', '  <div class="tw-scroll">',
      '  <p class="tw-apptop">' + (me ? circle("tw-me", me) + " " : "") + '<span class="tw-logo">' + (old ? "Twitter" : "X") + "</span></p>"];
    if (!old) L.push('  <p class="tw-tabs"><span class="tw-tab on">For you<span class="tw-drop"></span></span> <span class="tw-tab">Following</span>' +
      t(b.tabs).split(/\n/).map(t).filter(Boolean).map(function (x) { return ' <span class="tw-tab">' + esc(x) + "</span>"; }).join("") + ' <span class="tw-add">+</span></p>');
    return L.concat(ind(tweets.join("\n\n").split("\n"), 1)).concat(["  </div>", "</div>"]).join("\n").replace(/\n  \n/g, "\n\n");
  }
  function twThreadHTML(b) {
    var L = ['<div class="tw-thread' + (b.era === "tw2020" ? " tw2020" : "") + " " + b.theme + (b.width ? " " + b.width : "") + '">', '  <div class="tw-scroll">'];
    b.msgs.forEach(function (m, i) { L = L.concat(ind(tweetHTML(b, m, i ? "reply" : "main"), 2)); });
    L.push("  </div>");
    if (b.bar !== "none") L.push('  <p class="tw-foot"><span>Reply</span><span class="hide"> - </span>Tweet your reply</p>');
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
    return S.blocks.map(function (b) {
      var pov = char(b.pov);
      povOwner = (b.type === "imsg" || b.type === "wa") && isProfile(pov) ? slugOf(pov) : "";
      if (b.type === "imsg") return imsgHTML(b);
      if (b.type === "wa") return waHTML(b);
      if (b.type === "twthread") return twThreadHTML(b);
      if (b.type === "twfeed") return twFeedHTML(b);
      if (b.type === "twdm") return twdmHTML(b);
      if (b.type === "text") return storyHTML(b.html);
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
        "blocks.N.scroll:tw": "A very long tweet scrolls inside its box. 'Show it all' makes the box as long as the tweet.",
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
    "blocks.N.app:tw": "'On their own' shows just the tweets. 'Inside the app screen' adds the top of the app: a picture, the logo and the tabs, like scrolling the timeline on a phone.",
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
    "blocks.N.msgs.N.contact": "Shares someone's contact: a card with their picture and name, and a 'Message' button. Pick them from the cast. The message words aren't used.",
    "blocks.N.html": "Type your story here, or paste it in from Google Docs, Word or AO3. Select some words and press a button to format them. Only the formatting AO3 allows is kept, so pasted fonts and colours are taken out. The text goes in the HTML between the chats around it, in the same order as here.",
    "blocks.N.label:story": "A name for this bit of the story, just for you, like 'Opening scene'. It shows when the box is folded up, and it isn't in the HTML."
  };
  var helped = {}, helpKind = ""; // helpKind is "tw" while a Twitter/X block is drawn
  function help(path, kind) {
    kind = kind || helpKind;
    var base = path.replace(/\.\d+(?=\.|$)/g, ".N"), k = base + (kind ? ":" + kind : "");
    if (kind === "dm" && !HELP[k]) k = base; // a DM uses the chat help unless it has its own
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
      .concat([["sys", "Date or notice line"]]).concat(b.type === "twdm" ? [] : [["typing", "Typing dots"]]);
  }

  function msgRow(b, bi, m, mi) {
    var P = "blocks." + bi + ".msgs." + mi, wa = b.type === "wa", dm = b.type === "twdm", h = [];
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
      if (dm) {
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
      h.push('<p class="hint">Pictures' + (wa ? " (up to four; with pictures, the message text becomes the caption)" : "") + ":</p>");
      m.photos.forEach(function (p, k) {
        var K = P + ".photos." + k;
        h.push('<div class="fb-acct"><div class="fb-row">' + field(K + ".url", "", { type: "url", ph: "Picture link" }) + btn("photo-del:" + bi + ":" + mi + ":" + k, "&times;", "Remove") + "</div>" +
          field(K + ".alt", "", { ph: "Describe the picture (alt text)", wrap: true }) + field(K + ".desc", "", { ph: "Or, with no picture, describe it in words", wrap: true }) +
          (wa ? field(K + ".land", "Landscape picture", { type: "check" }) : "") + "</div>");
      });
      if (!wa || m.photos.length < 4) h.push(btn("photo-add:" + bi + ":" + mi, "+ Picture"));
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
    var plus = ty === "twthread" ? "Add a reply below this" : ty === "twfeed" ? "Add a tweet below this" : "Add a message below this";
    return '<span class="fb-tools">' + (extras ? btn("msg-more:" + bi + ":" + mi, m.open ? "Less" : "Extras", "Extras") : "") +
      btn("msg-up:" + bi + ":" + mi, "&uarr;", "Move up") + btn("msg-down:" + bi + ":" + mi, "&darr;", "Move down") +
      btn("msg-ins:" + bi + ":" + mi, "+", plus) + btn("msg-del:" + bi + ":" + mi, "&times;", "Delete") + "</span>";
  }
  function fmtButtons() {
    return '<p class="hint">Select some words in the text, then: ' + btn("fmt:tl", "Translation") + " " + btn("fmt:egg", "Easter egg") + " " + btn("fmt:link", "Fake link") + "</p>";
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
    var P = "blocks." + i, h = [], wa = b.type === "wa", dm = b.type === "twdm";
    h.push("<details" + (b.open ? " open" : "") + ' data-open="' + P + '.open"><summary>Chat settings</summary><div class="fb-grid">');
    // first row: whose phone, and whether it's a group
    h.push("<div>" + field(P + ".pov", "Whose phone is it?", { type: "select", re: true, options: castOptions() }) + "</div>");
    h.push("<div>" + field(P + ".group", "Group chat", { type: "check", re: true }) + (wa && b.group ? field(P + ".pics", "Show pictures by names", { type: "check" }) : "") + "</div>");
    // second row: the top, the background and the bottom
    h.push('</div><div class="fb-grid">');
    if (wa) {
      h.push("<div>" + field(P + ".header", "Header", { type: "select", re: true, options: [["simple", "Simple"], ["bar", "With picture and icons"], ["none", "None"]] }) + "</div>");
      h.push("<div>" + field(P + ".bg", "Background", { type: "select", re: true, options: BACKGROUNDS.map(function (x) { return [x, x ? x.charAt(0).toUpperCase() + x.slice(1) : "Default"]; }).concat([["custom", "Custom picture"]]) }) + "</div>");
    }
    h.push("<div>" + field(P + ".bar", "Message bar at the bottom", { type: "select", re: true, options: [["none", "None"], ["empty", "Empty"], ["typed", "Something half-typed"]] }) + "</div>");
    if (dm) h.push("<div>" + field(P + ".nav", "App buttons", { type: "check", re: true }) + (b.nav ? field(P + ".badge", "Notifications number", { ph: "3" }) : "") + "</div>");
    h.push("</div>");
    // then what each choice above opens up, each in its own row so it's clear where it came from
    if (!wa || b.header !== "none") {
      // folded up by default, as it's long
      h.push('<details class="fb-acct"' + (b.headOpen ? " open" : "") + ' data-open="' + P + '.headOpen"><summary class="hint">The header</summary><div class="fb-grid">');
      h.push("<div>" + field(P + ".title", "Name at the top", { ph: b.group ? "Group chat name" : "The other person's name" }) + "</div>");
      if (!dm) h.push("<div>" + field(P + ".sub", "Smaller line under it", { ph: wa ? "online" : "iMessage" }) + "</div>");
      h.push("</div>");
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
    twfeed: "One tweet per line, starting with who's posting and a colon. New names are added to the cast."
  };
  // ---------- story text: a rich text box like AO3's ----------

  // the formatting AO3 keeps; anything else is taken out and its words kept
  var STORY_TAGS = { P: "p", DIV: "p", BR: "br", EM: "em", I: "em", STRONG: "strong", B: "strong", U: "u", S: "s", STRIKE: "s", DEL: "s",
    A: "a", BLOCKQUOTE: "blockquote", H1: "h2", H2: "h2", H3: "h3", H4: "h4", H5: "h4", H6: "h4", UL: "ul", OL: "ol", LI: "li", HR: "hr" };
  var STORY_BLOCKS = /^(p|blockquote|h2|h3|h4|ul|ol|hr)$/;
  // tidy up the box's HTML (or pasted HTML from Google Docs, Word or AO3)
  function cleanStory(html) {
    var box = document.createElement("div");
    box.innerHTML = html || "";
    function walk(node) {
      var out = "";
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) { out += esc(n.nodeValue.replace(/[\s\u00a0]+/g, " ")); return; }
        if (n.nodeType !== 1 || /^(SCRIPT|STYLE|META|TITLE|LINK|XML)$/.test(n.tagName)) return;
        var tag = STORY_TAGS[n.tagName], inner = walk(n), st = n.getAttribute("style") || "";
        // Google Docs and Word mark bold, italic, underline and crossed-out words with styles
        if (!tag || tag === "strong" && /font-weight:\s*(normal|400)/.test(st)) {
          if (/font-weight:\s*(bold|[6-9]00)/.test(st)) inner = "<strong>" + inner + "</strong>";
          if (/font-style:\s*italic/.test(st)) inner = "<em>" + inner + "</em>";
          if (/text-decoration[^;]*underline/.test(st)) inner = "<u>" + inner + "</u>";
          if (/text-decoration[^;]*line-through/.test(st)) inner = "<s>" + inner + "</s>";
          out += inner; return;
        }
        if (tag === "br" || tag === "hr") { out += "<" + tag + ">"; return; }
        if (tag === "a") {
          var href = n.getAttribute("href") || "";
          out += /^(https?:|mailto:)/i.test(href) ? '<a href="' + esc(href) + '">' + inner + "</a>" : inner; return;
        }
        out += "<" + tag + ">" + inner + "</" + tag + ">";
      });
      return out;
    }
    return walk(box);
  }
  // the story text for the HTML: each paragraph on its own line, and loose words put in paragraphs
  function storyHTML(html) {
    var box = document.createElement("div"), lines = [], loose = "";
    box.innerHTML = cleanStory(html);
    function flush() { if (loose.replace(/<br>/g, "").trim()) lines.push("<p>" + loose.trim().replace(/^(<br>)+|(<br>)+$/g, "") + "</p>"); loose = ""; }
    box.childNodes.forEach(function (n) {
      var tag = n.nodeType === 1 ? n.tagName.toLowerCase() : "";
      if (STORY_BLOCKS.test(tag)) {
        flush();
        if (tag !== "hr" && !n.textContent.trim()) return; // an empty paragraph
        // lists and quotes get a line for each part inside them
        if (/^(ul|ol|blockquote)$/.test(tag) && n.querySelector("li, p")) {
          lines.push("<" + tag + ">");
          n.childNodes.forEach(function (k) { if (k.nodeType === 1 && k.textContent.trim()) lines.push("  " + k.outerHTML); });
          lines.push("</" + tag + ">");
        } else lines.push(n.outerHTML);
      } else loose += n.nodeType === 1 ? n.outerHTML : esc(n.nodeValue);
    });
    flush();
    return lines.join("\n");
  }
  var STORY_BUTTONS = [["bold", "<b>B</b>", "Bold"], ["italic", "<i>I</i>", "Italic"], ["underline", "<u>U</u>", "Underline"],
    ["strikeThrough", "<s>S</s>", "Strikethrough"], ["link", "Link", "Link"], ["h3", "Heading", "Heading"], ["blockquote", "Quote", "Quote block"],
    ["insertUnorderedList", "&bull; List", "List"], ["insertOrderedList", "1. List", "Numbered list"], ["p", "Normal", "Normal text"],
    ["removeFormat", "Clear", "Clear the formatting"]];
  function storyCard(b, i, words) {
    var h = ['<section class="fb-block" data-i="' + i + '">',
      '<div class="fb-bhead"><button type="button" class="fb-fold" data-act="blk-fold:' + i + '" aria-expanded="' + !b.fold + '">' +
      (b.fold ? "&#9656; " : "&#9662; ") + "<b>" + (i + 1) + ". " + KINDS.text + "</b>" + (b.fold && words ? ' <span class="hint">' + esc(words.slice(0, 80)) + "</span>" : "") + "</button>" +
      '<span class="fb-tools">' + btn("blk-up:" + i, "&uarr;", "Move up") + btn("blk-down:" + i, "&darr;", "Move down") + btn("blk-del:" + i, "&times;", "Delete this") + "</span></div>"];
    if (!b.fold) {
      h.push('<div class="fb-story-label">' + field("blocks." + i + ".label", "Label", { ph: "Opening scene" }) + "</div>");
      h.push('<div class="fb-rte-bar" role="toolbar" aria-label="Formatting">' + STORY_BUTTONS.map(function (x) {
        return '<button type="button" data-rte-cmd="' + x[0] + '" title="' + x[2] + '" aria-label="' + x[2] + '">' + x[1] + "</button>";
      }).join("") + '<span class="tut-help" tabindex="0"><span>' + HELP["blocks.N.html"] + "</span></span></div>");
      h.push('<div class="fb-rte" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Story text" data-rte="' + i + '">' + (cleanStory(b.html) || "<p><br></p>") + "</div>");
    }
    h.push("</section>");
    return h.join("");
  }
  // the box saves as you type; the buttons work on the selected words
  document.addEventListener("input", function (e) {
    var el = e.target.closest && e.target.closest("[data-rte]");
    if (!el) return;
    S.blocks[+el.getAttribute("data-rte")].html = el.innerHTML;
    refresh();
  });
  document.addEventListener("mousedown", function (e) { if (e.target.closest && e.target.closest("[data-rte-cmd]")) e.preventDefault(); });
  // new lines in the box start new paragraphs, like AO3's
  document.addEventListener("focusin", function (e) { if (e.target.closest && e.target.closest("[data-rte]")) document.execCommand("defaultParagraphSeparator", false, "p"); });
  document.addEventListener("click", function (e) {
    var bt = e.target.closest && e.target.closest("[data-rte-cmd]");
    if (!bt) return;
    var box = bt.closest(".fb-block").querySelector("[data-rte]"), cmd = bt.getAttribute("data-rte-cmd");
    if (!box.contains(document.getSelection().anchorNode)) box.focus();
    document.execCommand("defaultParagraphSeparator", false, "p");
    if (cmd === "link") {
      var url = prompt("The web address for the link:", "https://");
      if (url && /^(https?:|mailto:)/i.test(url.trim())) document.execCommand("createLink", false, url.trim());
    } else if (/^(h3|blockquote|p)$/.test(cmd)) document.execCommand("formatBlock", false, cmd);
    else document.execCommand(cmd, false, null);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
  // pasted writing is tidied first, so only AO3's formatting goes in
  document.addEventListener("paste", function (e) {
    var el = e.target.closest && e.target.closest("[data-rte]");
    if (!el) return;
    e.preventDefault();
    var d = e.clipboardData, html = d.getData("text/html");
    if (!html) html = d.getData("text/plain").split(/\r?\n\s*\r?\n/).map(function (para) { return "<p>" + esc(para).replace(/\r?\n/g, "<br>") + "</p>"; }).join("");
    document.execCommand("insertHTML", false, cleanStory(html));
  });

  function blockCard(b, i) {
    var P = "blocks." + i, h = [], chat = isChat(b);
    helpKind = b.type === "twdm" ? "dm" : chat ? "" : "tw";
    h.push('<section class="fb-block" data-i="' + i + '">');
    // the name folds the chat up, leaving just this line and its buttons
    // folded, it shows who sent the first message and what it said
    if (b.type === "text") {
      var words = cleanStory(b.html).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      words = words.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      b.msgs = [];
      helpKind = "story";
      var card = storyCard(b, i, t(b.label) || words);
      helpKind = "";
      return card;
    }
    var first = b.msgs.filter(function (x) { return char(x.from) && (t(x.text) || x.photos.length); })[0];
    var what = first ? "<em>" + esc(nameOf(char(first.from))) + ":</em> " + esc(plain(first.text).trim().slice(0, 80) || "(picture)") : esc(t(b.title));
    h.push('<div class="fb-bhead"><button type="button" class="fb-fold" data-act="blk-fold:' + i + '" aria-expanded="' + !b.fold + '">' +
      (b.fold ? "&#9656; " : "&#9662; ") + "<b>" + (i + 1) + ". " + KINDS[b.type] + "</b>" + (b.fold && what ? ' <span class="hint">' + what + "</span>" : "") + "</button>" +
      '<span class="fb-tools">' + btn("blk-up:" + i, "&uarr;", "Move up") + btn("blk-down:" + i, "&darr;", "Move down") + btn("blk-del:" + i, "&times;", "Delete this") + "</span></div>");
    if (b.fold) { helpKind = ""; return h.concat(["</section>"]).join(""); }
    if (chat) h.push(chatSettings(b, i));
    else {
      h.push('<div class="fb-grid"><div>' + field(P + ".theme", "Light, dark, or auto", { type: "select", options: [["theme-light", "Light"], ["theme-dark", "Dark"], ["theme-auto", "Auto"]] }) + "</div><div>" +
        field(P + ".width", "Width", { type: "select", options: [["", "Phone width"], ["wide", "Full width"]] }) + "</div>" +
        (b.type === "twthread" ? "<div>" + field(P + ".bar", "Tweet your reply bar", { type: "select", options: [["empty", "Yes"], ["none", "No"]] }) + "</div>" : "") +
        "<div>" + field(P + ".era", "Which look", { type: "select", re: true, options: [["", "X (from mid-2023)"], ["tw2020", "Twitter (2020 to mid-2023)"]] }) + "</div>" +
        (b.type === "twfeed" ? "<div>" + field(P + ".app", "Show the tweets", { type: "select", re: true, options: [["", "On their own"], ["app", "Inside the app screen"]] }) + "</div>" +
          (b.app ? "" : "<div>" + field(P + ".scroll", "Long tweets", { type: "select", options: [["", "Scroll inside the box"], ["no-scroll", "Show it all"]] }) + "</div>") +
          (b.app ? "<div>" + field(P + ".pov", "Whose phone is it? (their picture goes at the top)", { type: "select", options: castOptions() }) + "</div>" : "") : "") + "</div>");
      if (b.type === "twfeed" && b.app && b.era !== "tw2020") h.push(field(P + ".tabs", "Communities in the tabs, after For you and Following (one per line)", { type: "area", rows: 2, ph: "Metros Fans\nHockey Twitter" }));
    }
    var row = chat ? msgRow : tweetRow;
    h.push('<ol class="fb-msgs">' + b.msgs.map(function (m, mi) { return row(b, i, m, mi); }).join("") + "</ol>");
    var ph = chat ? "Ilya: are you awake\nShane: no\n-- Today 11:48 PM" : "Zim: Reminder to everyone...\nHolster: I played all through college...";
    // the add button goes straight under the list, apart from the box for typing lots at once
    var addOne = btn("msg-add:" + i, chat ? "+ Add a message" : b.type === "twthread" ? (b.msgs.length ? "+ Add a reply" : "+ Add the tweet") : "+ Add a tweet");
    h.push("<p>" + addOne + "</p>");
    h.push('<div class="fb-script">' + field(P + ".script", chat ? "Type or paste messages" : "Type or paste tweets", { type: "area", rows: 4, ph: ph }) +
      '<p class="hint">' + (SCRIPT_HINTS[chat ? "chat" : b.type]) + "</p>" +
      btn("script:" + i, chat ? "Add these messages" : "Add these tweets") + "</div>");
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
    $("fb-html").value = html;
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
      case "link-add": m.link = { url: "", showUrl: false, title: "", desc: "", img: "", alt: "", video: "", imgdesc: "" }; break;
      case "link-del": m.link = null; break;
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
