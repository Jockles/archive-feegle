/* The step-by-step tutorial, used by the Fic Builder and the Profile Maker.
   Each page gives it a list of steps. Each step has:
     title  - the heading in the panel
     text   - what to do (HTML)
     target - which part of the page to point at (a CSS selector; the last match is used)
     open   - optional: a folded-up section to open first (a CSS selector)
   Pressing the Tutorial button turns it on or off. While it's on, the page gets the
   tut-on class, which also shows the help under every box (see tutorial.css). */
window.Tutorial = function (steps) {
  var root = document.documentElement, step = 0;
  var panel = document.createElement("aside");
  panel.className = "tut";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Tutorial");
  panel.innerHTML = '<div class="tut-top"><b></b><button type="button" data-tut="small" title="Make this box smaller" aria-label="Make this box smaller">&minus;</button>' +
    '<button type="button" data-tut="close" title="Close the tutorial" aria-label="Close the tutorial">&times;</button></div>' +
    '<div class="tut-body" aria-live="polite"></div>' +
    '<div class="tut-nav"><button type="button" data-tut="back">Back</button><button type="button" data-tut="next">Next</button></div>';
  document.body.appendChild(panel);
  var q = function (s) { return panel.querySelector(s); };

  function find(sel) { var all = sel ? document.querySelectorAll(sel) : []; return all[all.length - 1]; }
  // point at this step's box (again after the page redraws it)
  function mark() {
    Array.prototype.forEach.call(document.querySelectorAll(".tut-here"), function (el) { el.classList.remove("tut-here"); });
    var el = root.classList.contains("tut-on") && find(steps[step].target);
    if (el) el.classList.add("tut-here");
    return el;
  }
  function go(n) {
    step = Math.max(0, Math.min(steps.length - 1, n));
    var s = steps[step];
    var fold = find(s.open);
    if (fold) fold.open = true;
    q("b").textContent = "Step " + (step + 1) + " of " + steps.length;
    q(".tut-body").innerHTML = "<h4>" + s.title + "</h4>" + s.text;
    q(".tut-body").scrollTop = 0;
    q('[data-tut="back"]').disabled = step === 0;
    q('[data-tut="next"]').textContent = step === steps.length - 1 ? "Finish" : "Next";
    var el = mark();
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function toggle(on) {
    root.classList.toggle("tut-on", on);
    panel.hidden = !on;
    if (on) { panel.classList.remove("small"); q('[data-tut="small"]').innerHTML = "&minus;"; go(step); }
    else mark();
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-tutorial], [data-tut]") : null;
    if (!t) return;
    if (t.hasAttribute("data-tutorial")) return toggle(!root.classList.contains("tut-on"));
    var a = t.getAttribute("data-tut");
    if (a === "close") toggle(false);
    if (a === "small") t.innerHTML = panel.classList.toggle("small") ? "+" : "&minus;";
    if (a === "back") go(step - 1);
    if (a === "next") { if (step === steps.length - 1) { step = 0; toggle(false); } else go(step + 1); }
  });
  Tutorial.mark = mark;
};
