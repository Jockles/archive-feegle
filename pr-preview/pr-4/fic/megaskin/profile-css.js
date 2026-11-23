// Turns one character's profile details into megaskin profile CSS.
// Shared by the Profile Maker and the Fic Builder, so both always write the same CSS.
//
// MegaskinProfile.css(p) takes:
//   name, slug, pic, piccol, namecol, handle, email,
//   apps: { tw: {pic, name, handle}, ig: {...}, tb: {...}, gm: {pic, name}, dc: {...} },
//   dccol (a colour, or empty for none), tbsq (true/false),
//   saved: [{owner, as, pic}] (what they're saved as, and an optional picture, on someone's phone), accounts: [{acc, app, pic, name, handle, sq}],
//   wallcol (a colour, or empty for none), wallpic
// and returns { css, slug, p, name }.
(function () {
  var APPS = [
    { key: "tw", label: "Twitter/X", sel: ["tw", "tw-reply"], namesel: ["tw", "tw-reply", "twdm"] },
    { key: "ig", label: "Instagram", sel: ["ig", "igdm"] },
    { key: "tb", label: "Tumblr", sel: ["tb"] },
    { key: "gm", label: "Email", sel: ["gm"] },
    { key: "dc", label: "Discord", sel: ["dc"] }
  ];

  // keep values safe inside CSS
  function str(v) { return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ") + '"'; }
  function url(v) {
    v = (v || "").trim();
    if (!/^https?:\/\/[^\s"'()<>\\]+$/i.test(v)) return null;
    return "url(" + v + ")";
  }
  function slugify(v) { return (v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^[^a-z]+/, "").replace(/-+$/, ""); }
  function list(classes, tail) {
    return classes.map(function (c) { return "#workskin ." + c + " " + tail; }).join(", ");
  }
  function app(key) { return APPS.filter(function (a) { return a.key === key; })[0]; }
  function t(v) { return (v || "").trim(); }
  function h(v) { return t(v).replace(/^@/, ""); }

  function css(d) {
    var name = t(d.name);
    var slug = slugify(d.slug) || "character";
    var p = "pfp-" + slug;
    var apps = d.apps || {};
    var L = [];
    L.push("/* PROFILE: " + (name || slug).replace(/\*\//g, "") + " */");
    var pic = url(d.pic);
    L.push("#workskin .pfp." + p + " { background-color: " + d.piccol + ";" + (pic ? " background-image: " + pic + ";" : "") + " }");
    APPS.forEach(function (a) {
      var u = url((apps[a.key] || {}).pic);
      if (u) L.push(list(a.sel, ".pfp." + p) + " { background-image: " + u + "; }");
    });
    L.push("#workskin .wa .who." + p + ", #workskin .dc .dc-name." + p + " { color: " + d.namecol + "; }");
    if (d.tbsq) L.push("#workskin .tb .pfp." + p + " { border-radius: 15%; }");
    if (d.dccol) L.push("#workskin .dc .dc-name." + p + " { color: " + d.dccol + "; }");
    if (name) L.push("#workskin .name." + p + "::before { content: " + str(name) + "; }");
    APPS.forEach(function (a) {
      var n = t((apps[a.key] || {}).name);
      if (n) L.push(list(a.namesel || a.sel, ".name." + p + "::before") + " { content: " + str(n) + "; }");
    });
    (d.saved || []).forEach(function (s) {
      var o = slugify(s.owner), as = t(s.as), u = url(s.pic);
      if (o && as) L.push("#workskin .pov-" + o + " .name." + p + "::before { content: " + str(as) + "; }");
      if (o && u) L.push("#workskin .pov-" + o + " .pfp." + p + " { background-image: " + u + "; }");
    });
    var hd = h(d.handle);
    if (hd) L.push("#workskin .handle." + p + "::after { content: " + str(hd) + "; }");
    APPS.forEach(function (a) {
      var hh = a.key === "gm" ? "" : h((apps[a.key] || {}).handle);
      if (hh) L.push(list(a.namesel || a.sel, ".handle." + p + "::after") + " { content: " + str(hh) + "; }");
    });
    var e = t(d.email);
    if (e) L.push("#workskin .email." + p + "::after { content: " + str(e) + "; }");
    (d.accounts || []).forEach(function (x) {
      var acc = slugify(x.acc), a = app(x.app);
      if (!acc || !a) return;
      acc = "acc-" + acc;
      var k = "." + p + "." + acc, all = a.namesel || a.sel, u = url(x.pic), xn = t(x.name), xh = h(x.handle);
      var shape = a.key !== "tb" ? "" : x.sq ? "15%" : d.tbsq ? "50%" : "";
      if (u || xn || xh || shape) L.push("/* " + (name || slug).replace(/\*\//g, "") + "'s extra " + (a.key === "gm" ? "email address" : a.label + " account") + ": " + acc + " */");
      if (u) L.push(list(all, ".pfp" + k) + " { background-image: " + u + "; }");
      if (shape) L.push("#workskin .tb .pfp" + k + " { border-radius: " + shape + "; }");
      if (xn) L.push(list(all, ".name" + k + "::before") + " { content: " + str(xn) + "; }");
      if (xh) L.push(a.key === "gm" ? "#workskin .email" + k + "::after { content: " + str(xh) + "; }" : list(all, ".handle" + k + "::after") + " { content: " + str(xh) + "; }");
    });
    var wp = url(d.wallpic);
    if (wp) L.push("#workskin .mob.wa.pov-" + slug + " { background-color: " + (d.wallcol || d.wallcolDefault || "#dfeaf6") + "; background-image: " + wp + "; background-size: cover; background-position: center; }");
    else if (d.wallcol) L.push("#workskin .mob.wa.pov-" + slug + " { background: " + d.wallcol + "; }");
    return { css: L.join("\n"), slug: slug, p: p, name: name || slug };
  }

  // The other way round: read one profile back out of some CSS (the skin, or pasted profiles),
  // so it can be edited. Anything it doesn't recognise is left out.
  function parse(text, slug) {
    var d = { name: "", slug: slug, pic: "", piccol: "#888888", namecol: "#666666", handle: "", email: "",
      apps: { tw: {}, ig: {}, tb: {}, gm: {}, dc: {} }, dccol: "", tbsq: false, saved: [], accounts: [], wallcol: "", wallpic: "" };
    var me = new RegExp("\\.pfp-" + slug + "(?![a-z0-9-])");
    var wall = new RegExp("\\.mob\\.wa\\.pov-" + slug + "(?![a-z0-9-])");
    var appOf = { tw: "tw", "tw-reply": "tw", twdm: "tw", ig: "ig", igdm: "ig", tb: "tb", gm: "gm", dc: "dc" };
    function prop(body, name) { var m = body.match(new RegExp("(?:^|;)\\s*" + name + ":\\s*([^;]+)")); return m ? m[1].trim() : ""; }
    function content(body) { var m = body.match(/content:\s*"((?:[^"\\]|\\.)*)"/); return m ? m[1].replace(/\\(.)/g, "$1") : ""; }
    function link(body) { var m = body.match(/background-image:\s*url\(([^)]+)\)/); return m ? m[1].trim() : ""; }
    function account(acc, app) {
      var x = d.accounts.filter(function (a) { return a.acc === acc; })[0];
      if (!x) { x = { acc: acc, app: app || "ig", pic: "", name: "", handle: "", sq: false }; d.accounts.push(x); }
      if (app) x.app = app;
      return x;
    }
    var rules = text.replace(/\/\*[\s\S]*?\*\//g, "").split("}");
    rules.forEach(function (r) {
      var i = r.indexOf("{"); if (i < 0) return;
      var sel = r.slice(0, i).trim(), body = r.slice(i + 1).trim();
      if (wall.test(sel) && !me.test(sel)) {
        d.wallpic = link(body);
        d.wallcol = prop(body, "background-color") || prop(body, "background");
        return;
      }
      if (!me.test(sel)) return;
      var sels = sel.split(",").map(function (x) { return x.trim(); });
      var first = sels[0];
      var apps = [];
      sels.forEach(function (x) { var m = x.match(/^#workskin \.([a-z-]+) /); if (m && appOf[m[1]] && apps.indexOf(appOf[m[1]]) < 0) apps.push(appOf[m[1]]); });
      var acc = (first.match(/\.acc-([a-z0-9-]+)/) || [])[1];
      var pov = (first.match(/\.pov-([a-z0-9-]+) \.(name|pfp)\./) || []);
      if (pov[1]) {
        var sv = d.saved.filter(function (x) { return x.owner === pov[1]; })[0];
        if (!sv) { sv = { owner: pov[1], as: "", pic: "" }; d.saved.push(sv); }
        if (pov[2] === "name") sv.as = content(body); else sv.pic = link(body);
        return;
      }
      if (/\.who\.|\.dc-name\./.test(first) && prop(body, "color")) {
        if (/\.wa \.who\./.test(first)) d.namecol = prop(body, "color"); else d.dccol = prop(body, "color");
        return;
      }
      var kind = /\.name\.[^ ]*::before/.test(first) ? "name" : /\.handle\.[^ ]*::after/.test(first) ? "handle" :
        /\.email\.[^ ]*::after/.test(first) ? "email" : /\.pfp\.pfp-/.test(first) ? "pfp" : "";
      if (kind === "email" && acc) { account(acc, "gm").handle = content(body); return; }
      if (!kind) return;
      if (acc) {
        var x = account(acc, apps[0]);
        if (kind === "pfp") { if (link(body)) x.pic = link(body); if (prop(body, "border-radius") === "15%") x.sq = true; }
        else if (content(body)) x[kind] = content(body);
        return;
      }
      if (!apps.length) {
        if (kind === "pfp") { d.pic = link(body); d.piccol = prop(body, "background-color") || d.piccol; }
        else if (content(body)) d[kind] = content(body);
        return;
      }
      apps.forEach(function (k) {
        if (kind === "pfp") {
          if (k === "tb" && prop(body, "border-radius") === "15%") d.tbsq = true;
          else if (link(body)) d.apps[k].pic = link(body);
        } else if (kind !== "email" && content(body)) d.apps[k][kind] = content(body);
      });
    });
    return d;
  }

  window.MegaskinProfile = { APPS: APPS, css: css, parse: parse, slugify: slugify, url: url };
})();
