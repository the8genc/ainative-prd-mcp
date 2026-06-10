/* 8genC MCP — shared interactions */
(function () {
  "use strict";

  // ---- Mobile nav toggle ----
  document.addEventListener("click", function (e) {
    var burger = e.target.closest("[data-nav-toggle]");
    if (burger) {
      var nav = burger.closest(".nav");
      if (nav) nav.classList.toggle("is-open");
    }
  });

  // ---- Copy-to-clipboard ----
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    var sel = btn.getAttribute("data-copy");
    var src = sel ? document.querySelector(sel) : null;
    var text = src ? (src.innerText || src.textContent) : btn.getAttribute("data-copy-text");
    if (!text) return;
    var done = function () {
      var label = btn.querySelector("[data-copy-label]") || btn;
      var prev = label.textContent;
      btn.classList.add("is-copied");
      label.textContent = "Copied";
      setTimeout(function () {
        btn.classList.remove("is-copied");
        label.textContent = prev;
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text.trim()).then(done, done);
    } else {
      var ta = document.createElement("textarea");
      ta.value = text.trim();
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (err) {}
      document.body.removeChild(ta);
      done();
    }
  });

  // ---- Tabs ----
  document.addEventListener("click", function (e) {
    var tab = e.target.closest("[data-tab]");
    if (!tab) return;
    var group = tab.closest("[data-tabs]");
    if (!group) return;
    var name = tab.getAttribute("data-tab");
    group.querySelectorAll("[data-tab]").forEach(function (t) {
      t.classList.toggle("is-active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    group.querySelectorAll("[data-tab-panel]").forEach(function (p) {
      p.hidden = p.getAttribute("data-tab-panel") !== name;
    });
  });

  // ---- Accordion ----
  document.addEventListener("click", function (e) {
    var head = e.target.closest("[data-acc-head]");
    if (!head) return;
    var item = head.closest("[data-acc-item]");
    if (!item) return;
    var open = item.classList.toggle("is-open");
    var body = item.querySelector("[data-acc-body]");
    if (body) body.hidden = !open;
    head.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // ---- Reveal on scroll ----
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll("[data-reveal]").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("is-in"); });
  }
})();
