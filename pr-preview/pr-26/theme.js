// Light and dark mode for jockles.com.
// Until a reader picks one, the site follows their device setting.
// Their choice is remembered in this browser only.
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

  function current() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  // Draft previews live under /pr-preview/. Keep them out of search
  // engines and label them so a draft is never mistaken for the real site.
  var draft = location.pathname.indexOf("/pr-preview/") !== -1;
  if (draft) {
    var robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (draft) {
      var banner = document.createElement("p");
      banner.className = "draft-banner";
      banner.textContent = "Draft preview \u2013 not published yet";
      document.body.insertBefore(banner, document.body.firstChild);
    }
    var header = document.querySelector("header");
    if (!header) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    function label() {
      var dark = current() === "dark";
      button.textContent = dark ? "☀ Light mode" : "☾ Dark mode";
      button.setAttribute("aria-pressed", dark ? "true" : "false");
    }
    button.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      label();
    });
    label();
    header.appendChild(button);
  });
})();
