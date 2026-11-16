// Turns one character's profile details into megaskin profile CSS.
// Shared by the Profile Maker and the Fic Builder, so both always write the same CSS.
//
// MegaskinProfile.css(p) takes:
//   name, slug, pic, piccol, namecol, handle, email,
//   apps: { tw: {pic, name, handle}, ig: {...}, tb: {...}, gm: {pic, name}, dc: {...} },
//   dccol (a colour, or empty for none), tbsq (true/false),
//   saved: [{owner, as}], accounts: [{acc, app, pic, name, handle, sq}],
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
      var o = slugify(s.owner), as = t(s.as);
      if (o && as) L.push("#workskin .mob.pov-" + o + " .name." + p + "::before { content: " + str(as) + "; }");
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

  window.MegaskinProfile = { APPS: APPS, css: css, slugify: slugify, url: url };
})();
