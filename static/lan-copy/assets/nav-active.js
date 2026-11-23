(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  if (!links.length) return;
  var groups = {
    why: "why",
    how: "how",
    files: "features",
    fragments: "features",
    local: "features",
    print: "features",
    devices: "features",
    plugins: "features",
    compare: "features",
    faq: "faq"
  };
  var sections = Array.prototype.slice.call(document.querySelectorAll("main > section[id]"));
  var ticking = false;

  function update() {
    ticking = false;
    var line = window.innerHeight * 0.38;
    var active = "";
    sections.forEach(function (section) {
      var group = groups[section.id];
      if (group && section.getBoundingClientRect().top <= line) active = group;
    });
    if (window.scrollY < 80) active = "";
    links.forEach(function (link) {
      var on = link.getAttribute("data-nav") === active;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
})();
