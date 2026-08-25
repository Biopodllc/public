/* BioPod - global site interactions. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  // Mark JS active so reveal animations engage (content stays visible without JS).
  document.documentElement.classList.add("js");

  /* ----- Sticky header shadow ----- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 6); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----- Mobile nav ----- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.querySelector(".mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ----- FAQ accordion ----- */
  document.querySelectorAll(".acc-q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      var panel = btn.nextElementSibling;
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      panel.style.maxHeight = open ? null : panel.scrollHeight + "px";
    });
  });

  /* ----- Scroll reveal -----
     IntersectionObserver handles the normal case. It can, however, miss an
     element that enters and leaves the viewport between two of its callbacks
     during very fast scrolling, and a missed element would stay invisible for
     good. So a cheap sweep runs alongside it and reveals anything that has
     reached the viewport, whether or not the observer noticed. Content can
     never end up permanently hidden. */
  var pending = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  function show(el) {
    el.classList.add("in");
    var at = pending.indexOf(el);
    if (at > -1) pending.splice(at, 1);
  }

  function sweep() {
    for (var i = pending.length - 1; i >= 0; i--) {
      if (pending[i].getBoundingClientRect().top < window.innerHeight) show(pending[i]);
    }
  }

  if ("IntersectionObserver" in window && pending.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    pending.slice().forEach(function (el) { io.observe(el); });

    var sweepQueued = false;
    var onMove = function () {
      if (sweepQueued || !pending.length) return;
      sweepQueued = true;
      window.requestAnimationFrame(function () { sweepQueued = false; sweep(); });
    };
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove, { passive: true });
    window.addEventListener("load", sweep);
    sweep();
  } else {
    pending.slice().forEach(show);
  }

  /* ===================== Motion =====================
     Three small touches, all skipped entirely if the visitor has asked their
     device to reduce motion. Nothing here is required to read the page. */
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----- 1. Cascade: things that reveal side by side arrive one after another ----- */
  if (!REDUCED) {
    // (a) Siblings that each carry .reveal: give each a slightly later start.
    document.querySelectorAll(".reveal").forEach(function (el) {
      var parent = el.parentElement;
      if (!parent || parent.getAttribute("data-cascaded")) return;
      parent.setAttribute("data-cascaded", "1");
      var sibs = [];
      Array.prototype.forEach.call(parent.children, function (c) {
        if (c.classList.contains("reveal")) sibs.push(c);
      });
      if (sibs.length < 2) return;
      sibs.forEach(function (s, i) { s.style.transitionDelay = Math.min(i, 5) * 80 + "ms"; });
    });

    // (b) Containers that reveal as a single unit: cascade their children instead.
    document.querySelectorAll(".contexts.reveal, .stats.reveal, .steps.reveal, .promise.reveal")
      .forEach(function (box) {
        box.classList.add("stagger");
        Array.prototype.forEach.call(box.children, function (kid, i) {
          kid.style.setProperty("--i", i);
        });
      });
  }

  /* ----- 2. Reading-progress bar ----- */
  if (!REDUCED) {
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    var queued = false;
    var paint = function () {
      var span = document.documentElement.scrollHeight - window.innerHeight;
      var pct = span > 0 ? window.scrollY / span : 0;
      bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, pct)) + ")";
      queued = false;
    };
    window.addEventListener("scroll", function () {
      if (!queued) { queued = true; window.requestAnimationFrame(paint); }
    }, { passive: true });
    window.addEventListener("resize", paint, { passive: true });
    paint();
  }

  /* ----- 3. Statistics count up when they scroll into view -----
     The original text is restored exactly at the end, so nothing can be
     left showing a rounded or half-finished figure. */
  function countUp(el) {
    var original = el.textContent.trim();
    var parts = original.match(/^([^0-9]*)([0-9][0-9.,]*)(.*)$/);
    if (!parts) return;
    var prefix = parts[1], digits = parts[2], suffix = parts[3];
    var target = parseFloat(digits.replace(/,/g, ""));
    if (!isFinite(target)) return;
    // A bare four-digit year should not count up from zero.
    if (!prefix && !suffix && target > 1900 && target < 2200) return;
    var places = (digits.split(".")[1] || "").length;
    var began = null, span = 1100;
    var step = function (now) {
      if (began === null) began = now;
      var t = Math.min(1, (now - began) / span);
      var eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        el.textContent = prefix + (target * eased).toFixed(places) + suffix;
        window.requestAnimationFrame(step);
      } else {
        el.textContent = original;
      }
    };
    window.requestAnimationFrame(step);
  }

  var figures = document.querySelectorAll(".stat .num");
  if (!REDUCED && "IntersectionObserver" in window && figures.length) {
    var fio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); fio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    figures.forEach(function (el) { fio.observe(el); });
  }

  /* ----- Label each photo placeholder with its unique name (from the file name) -----
     So Natasha can point to a photo by its placeholder name. The label is covered
     automatically once a real photo is dropped into assets/photos/. */
  document.querySelectorAll(".photo").forEach(function (fig) {
    var img = fig.querySelector('img[src*="assets/photos/"]');
    var cap = fig.querySelector(".ph-cap");
    if (img && cap && !fig.querySelector(".ph-name")) {
      var name = (img.getAttribute("src").split("/").pop() || "").split("?")[0].replace(/\.[a-z0-9]+$/i, "");
      var span = document.createElement("span");
      span.className = "ph-name";
      span.textContent = name;
      cap.parentNode.insertBefore(span, cap);
    }
  });

  /* ===== Forms: open a ready-to-send email in the visitor's own mail app =====
     No backend, no data stored anywhere. When someone fills a form and clicks
     the button, their email app opens with all the details filled in, addressed
     to BioPod. They just press send. */
  var CONTACT_EMAIL = "hello@biopodllc.com"; // TODO(owner): set the real BioPod inbox address.

  function setStatus(form, type, msg) {
    var box = form.querySelector(".form-status");
    if (!box) { box = document.createElement("div"); box.className = "form-status"; form.appendChild(box); }
    box.className = "form-status show " + type;
    box.textContent = msg;
    box.setAttribute("role", "status");
  }

  function fieldLabel(el, form) {
    var t = "";
    if (el.labels && el.labels[0]) { t = el.labels[0].textContent; }
    else { var l = form.querySelector('label[for="' + el.id + '"]'); t = l ? l.textContent : (el.name || "Field"); }
    return t.replace(/\(optional\)/ig, "").replace(/\s+/g, " ").trim();
  }

  function subjectFor(form) {
    var a = (form.getAttribute("aria-label") || "").toLowerCase();
    if (a.indexOf("waitlist") > -1) return "BioPod waitlist signup";
    if (a.indexOf("investor") > -1) return "BioPod investor inquiry";
    return "BioPod website message";
  }

  document.querySelectorAll("form[data-form]").forEach(function (form) {
    // Helper note so visitors know what the button does.
    var note = document.createElement("p");
    note.className = "form-note";
    note.textContent = "When you click, your email app opens with everything filled in. Just press send.";
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.insertAdjacentElement("afterend", note); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var lines = [];
      form.querySelectorAll("input, select, textarea").forEach(function (el) {
        if (!el.name || el.type === "submit" || el.type === "hidden") return;
        if (el.type === "checkbox") { lines.push(fieldLabel(el, form) + ": " + (el.checked ? "Yes" : "No")); return; }
        if (!el.value) return;
        lines.push(fieldLabel(el, form) + ": " + el.value);
      });
      var body = lines.join("\n") + "\n\n(Sent from the BioPod website.)";
      var href = "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent(subjectFor(form)) +
        "&body=" + encodeURIComponent(body);
      window.location.href = href;

      setStatus(form, "ok", "Your email app should open with a ready message. Just press send. If nothing opens, email us at " + CONTACT_EMAIL + ".");
    });
  });

  /* ----- Footer year ----- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
