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

  /* ----- Scroll reveal ----- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
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
