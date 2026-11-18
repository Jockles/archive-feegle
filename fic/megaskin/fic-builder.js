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
  var BACKGROUNDS = ["", "beige", "black", "blush", "dusk", "forest", "lilac", "navy", "night",
    "ocean", "plum", "sage", "sky", "slate", "sunset", "white"];
  var KINDS = {
    imsg: "iMessage chat",
    wa: "WhatsApp chat"
  };

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
      showInitials: true, initials: "", pic: "", alt: "", num: "", prof: newProfile() };
  }
  function newMsg(from, text, time) {
    return { id: nid("m"), from: from || "", text: text || "", time: time || "", open: false,
      reacts: [], waReacts: "", waCount: "", tick: "read", edited: false, status: "", sms: false, big: false,
      replyTo: "", photos: [], link: null };
  }
  // the group's picture in the WhatsApp header: a one-off circle, set up the same way
  function newGroupPic() { return { colour: "5", showInitials: true, initials: "", pic: "", alt: "", land: false }; }
  function newBlock(type) {
    var b = { id: nid("b"), type: type };
    var pov = S.cast[0] ? S.cast[0].id : "";
    b.pov = pov; b.group = false; b.title = ""; b.sub = type === "imsg" ? "iMessage" : "online";
    b.theme = "theme-auto"; b.width = ""; b.scroll = ""; b.bar = "empty"; b.barText = "";
    b.bg = ""; b.pics = true; b.header = "simple"; b.gp = newGroupPic(); b.script = ""; b.msgs = []; b.open = true;
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
      ["colour", "initials", "pic", "alt", "num", "land"].forEach(function (k) { if (p[k]) c[k] = p[k]; });
      S.cast.push(c);
      ids[p.name] = c.id;
    });
    var b = newBlock(ex.chat.type);
    Object.keys(ex.chat).forEach(function (k) { if (k !== "type") b[k] = ex.chat[k]; });
    b.pov = ids[ex.chat.pov];
    b.msgs = ex.msgs.map(function (line) {
      var x = line[2] || {};
      var m = newMsg(ids[line[0]] || line[0], line[1], x.time);
      ["tick", "waReacts", "waCount", "sms", "big", "edited", "status"].forEach(function (k) { if (x[k] !== undefined) m[k] = x[k]; });
      m.reacts = (x.reacts || []).map(function (r) { return { by: ids[r[0]], emoji: r[1] }; });
      m.photos = (x.photos || []).map(function (p) { return { url: p.url || "", alt: p.alt || "", desc: p.desc || "", land: !!p.land }; });
      if (x.link) m.link = { url: x.link.url || "", showUrl: !!x.link.showUrl, title: x.link.title || "", desc: x.link.desc || "",
        img: x.link.img || "", alt: x.link.alt || "", video: x.link.video || "", imgdesc: x.link.imgdesc || "" };
      return m;
    });
    ex.msgs.forEach(function (line, i) { if (line[2] && line[2].reply !== undefined) b.msgs[i].replyTo = b.msgs[line[2].reply].id; });
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
    if (isProfile(pov)) c.push("pov-" + slugOf(pov));
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

  function allHTML() {
    tlCount = 0;
    return S.blocks.map(function (b) {
      if (b.type === "imsg") return imsgHTML(b);
      if (b.type === "wa") return waHTML(b);
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
    "cast.N.kind": "One-off is the quickest: they just get a coloured circle. Pick New profile if they turn up in lots of chats or apps, so they look the same everywhere. Edit an existing profile uses one of the tutorial's example characters, or a profile you've added.",
    "cast.N.colour": "The colour of the circle by their messages, when there's no picture.",
    "cast.N.showInitials": "The letters in the circle. Leave the box empty to use the first letter of their name, or untick it for an empty circle.",
    "cast.N.pic": "Optional. A picture to show instead of the coloured circle. " + PIC,
    "cast.N.alt": ALT,
    "cast.N.land": "Tick this if the picture is wider than it is tall, so it isn't squashed.",
    "cast.N.num": "Only for WhatsApp. Someone who isn't saved in the phone shows as a phone number instead of a name. Leave it empty otherwise.",
    "cast.N.example": "Pick which profile to use.",
    "cast.N.prof.slug": "A short label for this profile that the skin uses to find it. Small letters, numbers and dashes only, no spaces. It's filled in from the name for you.",
    "cast.N.prof.pic": "A picture for their circle in every app. " + PIC,
    "cast.N.prof.piccol": "The circle's colour when there's no picture, or while the picture loads.",
    "cast.N.prof.namecol": "The colour of their name in WhatsApp groups and on Discord.",
    "cast.N.prof.handle": "Their username on apps like Instagram and Tumblr, without the @.",
    "cast.N.prof.email": "Their email address, for the email apps. It doesn't have to be real.",
    "cast.N.prof.saved.N.as": "What they're saved as on someone else's phone, like Mum or a nickname. Pick whose phone first.",
    "cast.N.prof.dccolon": "Tick this to give them a different name colour on Discord, then pick the colour.",
    "cast.N.prof.tbsq": "Tumblr pictures can be a circle or a square with rounded corners. Tick this for the square.",
    "cast.N.prof.accounts.N.acc": "A short label for the extra account, like burner or work. Small letters and dashes only. Then pick the app and fill in only what's different.",
    "cast.N.prof.wallcolon": "Tick this to colour the background of WhatsApp chats on their phone, then pick the colour.",
    "cast.N.prof.wallpic": "Or a picture for the background instead. " + PIC,
    "blocks.N.pov": "Whose phone we're looking at. Their messages go on the right, and everyone else's go on the left.",
    "blocks.N.group": "Tick this for a group chat. Everyone's name shows by their messages.",
    "blocks.N.pics": "Shows each person's picture by their messages.",
    "blocks.N.title": "The name at the very top. In a chat between two people, it's the other person's name. In a group, it's the group's name.",
    "blocks.N.sub": "The small line under the name. Delete it if you don't want one.",
    "blocks.N.theme": "A light or dark phone. Auto follows the reader's own light or dark setting.",
    "blocks.N.width": "Phone width looks like a phone. Full width fills the page.",
    "blocks.N.scroll": "For a long chat. Scroll inside the phone keeps it phone-sized and readers scroll the messages. Show it all makes the phone as long as the chat.",
    "blocks.N.header": "Simple shows the name. With picture and icons adds their picture and the call buttons, like the real app.",
    "blocks.N.bg": "The pattern behind the messages.",
    "blocks.N.bar": "The box at the bottom where you'd type. Empty shows it with nothing in it. Something half-typed shows a message the phone owner hasn't sent yet.",
    "blocks.N.barText": "What the phone owner is halfway through typing.",
    "blocks.N.gp.colour": "The group's picture works just like a character's: a coloured circle with letters in it, or a picture.",
    "blocks.N.script": "The quickest way to add messages. Put each message on its own line: the name, a colon, then the message, like Ilya: are you awake. Then press Add these messages, and they're added to the list above.",
    "blocks.N.msgs.N.from:sys": "Date or notice lines are the small lines in the middle of the chat. The second box is what the line says, like Today 11:48 PM or Lily left the group. The buttons: the arrows move the line, + adds a new message under it, and &times; deletes it. To turn it into a message, change the first box to a character.",
    "blocks.N.msgs.N.from:typing": "The typing line shows someone typing. In iMessage it's three dots in a grey bubble. In WhatsApp, the second box is what it says, like Lily is typing... The buttons: the arrows move the line, + adds a new message under it, and &times; deletes it. To turn it into a message, change the first box to a character.",
    "blocks.N.msgs.N.from": "The first box chooses who wrote the message, from the cast list above. You can also change it to a date or notice line, or a typing line. The second box is the message itself: type it just like you'd send it. In WhatsApp, the third box is the time on the message, like 09:15. The buttons: Extras has more options (pictures, reactions and more), the arrows move the message, + adds a new message under it, and &times; deletes it.",
    "blocks.N.msgs.N.sms": "Makes the bubble green, like a text to someone who hasn't got an iPhone.",
    "blocks.N.msgs.N.reacts.N.emoji": "The little emoji on the corner of a bubble. Pick who reacted, and type one emoji.",
    "blocks.N.msgs.N.status": "Small words under the message, like Delivered or Read 11:52 PM. Usually only on the phone owner's last message.",
    "blocks.N.msgs.N.tick": "The little ticks on messages the phone owner sends.",
    "blocks.N.msgs.N.big": "Tick this when the message is only an emoji, to show it big with no bubble.",
    "blocks.N.msgs.N.replyTo": "Pick an earlier message to show it quoted above this one, as a reply.",
    "blocks.N.msgs.N.waReacts": "Emoji reactions under the bubble, with a space between each one. Count is how many people reacted, if it's more than one.",
    "blocks.N.msgs.N.link.url": "A link preview is the little card that shows up when you send a link. Fill in what the card should say. The link doesn't have to work.",
    "blocks.N.msgs.N.edited": "Adds the small word Edited to the message.",
    "blocks.N.msgs.N.photos.N.url": "A picture in the message. " + PIC,
    "blocks.N.msgs.N.photos.N.alt": ALT,
    "blocks.N.msgs.N.photos.N.desc": "No picture? Describe it here instead, and the words show where the picture would be."
  };
  var helped = {};
  function help(path, kind) {
    var k = path.replace(/\.\d+(?=\.|$)/g, ".N") + (kind ? ":" + kind : "");
    if (!HELP[k] || helped[k]) return "";
    helped[k] = true;
    return '<span class="tut-help">' + HELP[k] + "</span>";
  }
  function field(path, label, opts) {
    return box(path, label, opts) + help(path, opts && opts.help);
  }
  function box(path, label, opts) {
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
    var P = "blocks." + bi + ".msgs." + mi, wa = b.type === "wa", h = [];
    var side = m.from === b.pov ? " out" : m.from === "sys" || m.from === "typing" ? " sys" : "";
    h.push('<li class="fb-msg' + side + '">');
    h.push('<div class="fb-row">' + field(P + ".from", "", { type: "select", re: true, help: m.from === "sys" || m.from === "typing" ? m.from : "", options: speakerOptions(b, wa ? "Typing line" : "Typing dots") }));
    if (!(m.from === "typing" && !wa)) h.push(field(P + ".text", "", { ph: m.from === "sys" ? "Today 11:48 PM" : m.from === "typing" ? "Lily is typing..." : m.photos.length || m.link ? "(no text, open extras for more)" : "Message", cls: "fb-text" }));
    if (wa && m.from !== "sys" && m.from !== "typing") h.push(field(P + ".time", "", { ph: "09:15", cls: "fb-time" }));
    h.push('<span class="fb-tools">' + (m.from === "sys" || m.from === "typing" ? "" : btn("msg-more:" + bi + ":" + mi, m.open ? "Less" : "Extras", "Extras for this message")) +
      btn("msg-up:" + bi + ":" + mi, "&uarr;", "Move up") + btn("msg-down:" + bi + ":" + mi, "&darr;", "Move down") +
      btn("msg-ins:" + bi + ":" + mi, "+", "Add a message under this one") + btn("msg-del:" + bi + ":" + mi, "&times;", "Delete this message") + "</span></div>");
    if (m.open && m.from !== "sys" && m.from !== "typing") {
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

  function blockCard(b, i) {
    var P = "blocks." + i, h = [];
    h.push('<section class="fb-block" data-i="' + i + '">');
    h.push('<div class="fb-bhead"><b>' + (i + 1) + ". " + KINDS[b.type] + "</b><span class=\"fb-tools\">" +
      btn("blk-up:" + i, "&uarr;", "Move up") + btn("blk-down:" + i, "&darr;", "Move down") + btn("blk-del:" + i, "&times;", "Delete this chat") + "</span></div>");
    {
      var wa = b.type === "wa";
      h.push("<details" + (b.open ? " open" : "") + ' data-open="' + P + '.open"><summary>Chat settings</summary><div class="fb-grid">');
      h.push("<div>" + field(P + ".pov", "Whose phone is it?", { type: "select", re: true, options: S.cast.map(function (c) { return [c.id, nameOf(c)]; }) }) + "</div>");
      h.push("<div>" + field(P + ".group", "Group chat", { type: "check", re: true }) + (wa && b.group ? field(P + ".pics", "Show pictures by names", { type: "check" }) : "") + "</div>");
      h.push("<div>" + field(P + ".title", "Name at the top", { ph: b.group ? "Group chat name" : "The other person's name" }) + "</div>");
      h.push("<div>" + field(P + ".sub", "Smaller line under it", { ph: wa ? "online" : "iMessage" }) + "</div>");
      h.push("<div>" + field(P + ".theme", "Light, dark, or auto", { type: "select", options: [["theme-light", "Light"], ["theme-dark", "Dark"], ["theme-auto", "Auto"]] }) + "</div>");
      h.push("<div>" + field(P + ".width", "Width", { type: "select", options: [["", "Phone width"], ["wide", "Full width"]] }) + "</div>");
      h.push("<div>" + field(P + ".scroll", "Long chats", { type: "select", options: [["", "Scroll inside the phone"], ["no-scroll", "Show it all"]] }) + "</div>");
      if (wa) {
        h.push("<div>" + field(P + ".header", "Header", { type: "select", re: true, options: [["simple", "Simple"], ["bar", "With picture and icons"]] }) + "</div>");
        h.push("<div>" + field(P + ".bg", "Background", { type: "select", options: BACKGROUNDS.map(function (x) { return [x, x ? x.charAt(0).toUpperCase() + x.slice(1) : "Normal"]; }) }) + "</div>");
      }
      h.push("<div>" + field(P + ".bar", "Message bar at the bottom", { type: "select", re: true, options: [["none", "None"], ["empty", "Empty"], ["typed", "Something half-typed"]] }) + "</div>");
      if (b.bar === "typed") h.push("<div>" + field(P + ".barText", "Half-typed message", {}) + "</div>");
      h.push("</div>");
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
      h.push('<ol class="fb-msgs">' + b.msgs.map(function (m, mi) { return msgRow(b, i, m, mi); }).join("") + "</ol>");
      h.push('<div class="fb-script">' + field(P + ".script", "Type or paste messages", { type: "area", rows: 4,
        ph: "Ilya: are you awake\nShane: no\n-- Today 11:48 PM" }) +
        '<p class="hint">One message per line, starting with who\'s talking and a colon. A line on its own with no name carries on from the last person. Start a line with -- for a date or notice line, and put a time first if you like, like 09:15 Lily: hi. New names are added to the cast.</p>' +
        btn("script:" + i, "Add these messages") + " " + btn("msg-add:" + i, "+ One empty message") + "</div>");
    }
    h.push("</section>");
    return h.join("");
  }

  function renderEditor() {
    helped = {};
    S.cast.forEach(function (c) { if (c.kind === "example" && c.loadedFrom !== c.example) loadProfile(c); });
    $("fb-cast").innerHTML = S.cast.map(castCard).join("");
    $("fb-blocks").innerHTML = S.blocks.map(blockCard).join("") || '<p class="hint">Nothing here yet. Add a chat below.</p>';
    if (window.Tutorial && Tutorial.mark) Tutorial.mark();
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
      if (/^--/.test(line)) { b.msgs.push(newMsg("sys", line.replace(/^-+\s*/, ""))); return; }
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
      case "saved-del": S.cast[n[0]].prof.saved.splice(n[1], 1); break;
      case "acct-add": S.cast[n[0]].prof.accounts.push({ acc: "", app: "ig", pic: "", name: "", handle: "", sq: false }); break;
      case "acct-del": S.cast[n[0]].prof.accounts.splice(n[1], 1); break;
      case "add": S.blocks.push(newBlock(a[1])); break;
      case "blk-up": move(S.blocks, n[0], -1); break;
      case "blk-down": move(S.blocks, n[0], 1); break;
      case "blk-del": if (!confirm("Delete this chat?")) return; S.blocks.splice(n[0], 1); break;
      case "script": addScript(n[0]); return;
      case "msg-add": b.msgs.push(newMsg(b.msgs.length ? b.msgs[b.msgs.length - 1].from : "", "", b.msgs.length ? b.msgs[b.msgs.length - 1].time : "")); break;
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
