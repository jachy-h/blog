(function () {
  var root = document.querySelector("[data-install]");
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (tab) {
    return document.getElementById(tab.getAttribute("aria-controls"));
  });
  if (!tabs.length) return;

  function select(index, focus) {
    tabs.forEach(function (tab, i) {
      var on = i === index;
      tab.classList.toggle("is-on", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (panels[i]) panels[i].hidden = !on;
    });
    if (focus && tabs[index]) tabs[index].focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      select(i, false);
    });
  });

  root.addEventListener("keydown", function (e) {
    var current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    var next = -1;
    if (e.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    select(next, true);
  });

  // Open on the visitor's own system; Windows stays the fallback.
  var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  var ua = navigator.userAgent || "";
  var initial = 0;
  if (/mac|iphone|ipad/i.test(platform)) initial = 1;
  else if (/linux/i.test(platform) && !/android/i.test(ua)) initial = 2;
  select(initial, false);
})();
