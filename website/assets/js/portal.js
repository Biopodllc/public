/* BioPod Plant Care Portal - Phase 1.
   No backend. Plants are stored in this browser via localStorage.
   Reminders: per-plant .ics calendar files, plus optional browser notifications. */
(function () {
  "use strict";

  var KEY = "biopod.plants.v1";
  var NOTIFY_KEY = "biopod.notify.v1"; // map of id -> last notified ISO date

  /* ---------- storage ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
  function loadNotified() { try { return JSON.parse(localStorage.getItem(NOTIFY_KEY)) || {}; } catch (e) { return {}; } }
  function saveNotified(m) { localStorage.setItem(NOTIFY_KEY, JSON.stringify(m)); }

  /* ---------- dates ---------- */
  function todayISO() {
    var d = new Date();
    var local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  function parseISO(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(date, n) { var d = new Date(date); d.setDate(d.getDate() + n); return d; }
  function fmtDate(date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  function icsDate(date) {
    return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  /* ---------- status ---------- */
  function computed(p) {
    var cycleDays = p.cycleWeeks * 7;
    var fed = parseISO(p.lastFedISO);
    var refeed = addDays(fed, cycleDays);
    var now = parseISO(todayISO());
    var elapsedDays = Math.round((now - fed) / 86400000);
    var remainingDays = cycleDays - elapsedDays;
    var progress = Math.max(0, Math.min(1, elapsedDays / cycleDays));
    var state = remainingDays <= 0 ? "due" : (remainingDays <= 7 ? "soon" : "active");
    return { cycleDays: cycleDays, refeed: refeed, elapsedDays: elapsedDays,
      remainingDays: remainingDays, progress: progress, state: state };
  }

  /* ---------- icons ---------- */
  var IC = {
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>'
  };

  /* ---------- elements ---------- */
  var listEl = document.getElementById("plant-list");
  var emptyEl = document.getElementById("empty-state");
  var form = document.getElementById("plant-form");
  if (!form) return;
  var idEl = document.getElementById("plant-id");
  var nameEl = document.getElementById("f-name");
  var speciesEl = document.getElementById("f-species");
  var potEl = document.getElementById("f-pot");
  var dateEl = document.getElementById("f-date");
  var cycleEl = document.getElementById("f-cycle");
  var cycleOut = document.getElementById("f-cycle-out");
  var notesEl = document.getElementById("f-notes");
  var titleEl = document.getElementById("form-title");
  var submitEl = document.getElementById("form-submit");
  var cancelEl = document.getElementById("form-cancel");
  var notifyBtn = document.getElementById("notify-btn");

  dateEl.value = todayISO();
  dateEl.max = todayISO();
  cycleEl.addEventListener("input", function () { cycleOut.textContent = cycleEl.value + " weeks"; });

  /* ---------- render ---------- */
  function uid() { return "p" + Math.random().toString(36).slice(2, 9) + (load().length); }

  function render() {
    var list = load();
    listEl.innerHTML = "";
    emptyEl.style.display = list.length ? "none" : "block";

    // due first, then soon, then active
    var order = { due: 0, soon: 1, active: 2 };
    list.slice().sort(function (a, b) { return order[computed(a).state] - order[computed(b).state]; })
      .forEach(function (p) { listEl.appendChild(card(p)); });
  }

  function card(p) {
    var c = computed(p);
    var R = 40, CIRC = 2 * Math.PI * R;
    var offset = CIRC * (1 - c.progress);
    var ringColor = c.state === "due" ? "var(--clay-600)" : (c.state === "soon" ? "var(--soil-700)" : "var(--green-700)");
    var weeksLeft = Math.ceil(c.remainingDays / 7);
    var ringNum = c.remainingDays <= 0 ? "Due" : (weeksLeft + "w");
    var statusText = c.state === "due" ? "Time to refeed" : (c.state === "soon" ? "Feed soon" : "Active");
    var meta = [];
    if (p.species) meta.push(p.species);
    if (p.potSizeInches) meta.push(p.potSizeInches + " in pot");
    meta.push("fed " + fmtDate(parseISO(p.lastFedISO)));

    var el = document.createElement("article");
    el.className = "plant";
    el.innerHTML =
      '<div class="ring">' +
        '<svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">' +
          '<circle class="ring-bg" cx="46" cy="46" r="40" fill="none" stroke-width="8"/>' +
          '<circle class="ring-fg" cx="46" cy="46" r="40" fill="none" stroke-width="8" ' +
            'stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" style="stroke:' + ringColor + '"/>' +
        '</svg>' +
        '<span class="ring-num">' + ringNum + '</span>' +
      '</div>' +
      '<div>' +
        '<h3></h3>' +
        '<div class="meta"></div>' +
        '<span class="status ' + c.state + '"><span class="dot"></span>' + statusText + '</span>' +
      '</div>' +
      '<div class="plant-actions">' +
        '<button class="btn-sm solid" data-act="fed">' + IC.check + 'Mark fed today</button>' +
        '<button class="btn-sm" data-act="ics">' + IC.cal + 'Add to calendar</button>' +
        '<button class="btn-sm" data-act="edit">' + IC.edit + 'Edit</button>' +
        '<button class="btn-sm danger" data-act="del">' + IC.trash + 'Delete</button>' +
      '</div>';
    // safe text insertion (avoid HTML injection from user input)
    el.querySelector("h3").textContent = p.name;
    el.querySelector(".meta").textContent = meta.join(" · ");
    el.querySelector('[data-act="fed"]').addEventListener("click", function () { markFed(p.id); });
    el.querySelector('[data-act="ics"]').addEventListener("click", function () { downloadICS(p); });
    el.querySelector('[data-act="edit"]').addEventListener("click", function () { startEdit(p.id); });
    el.querySelector('[data-act="del"]').addEventListener("click", function () { del(p.id); });
    return el;
  }

  /* ---------- actions ---------- */
  function markFed(id) {
    var list = load();
    var p = find(list, id); if (!p) return;
    p.lastFedISO = todayISO();
    save(list);
    var notified = loadNotified(); delete notified[id]; saveNotified(notified);
    render();
  }
  function del(id) {
    var p = find(load(), id);
    if (!confirm("Remove " + (p ? p.name : "this plant") + " from the tracker?")) return;
    save(load().filter(function (x) { return x.id !== id; }));
    render();
  }
  function startEdit(id) {
    var p = find(load(), id); if (!p) return;
    idEl.value = p.id;
    nameEl.value = p.name;
    speciesEl.value = p.species || "";
    potEl.value = p.potSizeInches || "";
    dateEl.value = p.lastFedISO;
    cycleEl.value = p.cycleWeeks; cycleOut.textContent = p.cycleWeeks + " weeks";
    notesEl.value = p.notes || "";
    titleEl.textContent = "Edit plant";
    submitEl.textContent = "Save changes";
    cancelEl.style.display = "block";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    nameEl.focus();
  }
  function resetForm() {
    form.reset();
    idEl.value = "";
    dateEl.value = todayISO();
    cycleEl.value = 9; cycleOut.textContent = "9 weeks";
    titleEl.textContent = "Add a plant";
    submitEl.textContent = "Add plant";
    cancelEl.style.display = "none";
  }
  cancelEl.addEventListener("click", resetForm);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!nameEl.value.trim() || !dateEl.value) { form.reportValidity(); return; }
    var list = load();
    var editing = idEl.value;
    var data = {
      id: editing || uid(),
      name: nameEl.value.trim(),
      species: speciesEl.value.trim(),
      potSizeInches: potEl.value ? +potEl.value : null,
      lastFedISO: dateEl.value,
      cycleWeeks: +cycleEl.value,
      notes: notesEl.value.trim()
    };
    if (editing) {
      var p = find(list, editing); if (p) Object.assign(p, data);
    } else { list.push(data); }
    save(list);
    resetForm();
    render();
  });

  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  /* ---------- .ics calendar ---------- */
  function downloadICS(p) {
    var c = computed(p);
    var now = new Date();
    var stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + "T" +
      pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + "Z";
    var name = p.name.replace(/[\r\n,;\\]/g, " ");
    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BioPod//Plant Care Portal//EN",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + p.id + "-" + icsDate(c.refeed) + "@biopod",
      "DTSTAMP:" + stamp,
      "DTSTART;VALUE=DATE:" + icsDate(c.refeed),
      "SUMMARY:Refeed " + name + " with BioPod",
      "DESCRIPTION:Time to place a new BioPod for " + name + ". Drop one in and water as normal.",
      "BEGIN:VALARM", "TRIGGER:PT0S", "ACTION:DISPLAY",
      "DESCRIPTION:Refeed " + name + " with BioPod", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "refeed-" + p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".ics";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- notifications ---------- */
  function refreshNotifyBtn() {
    if (!("Notification" in window)) { notifyBtn.style.display = "none"; return; }
    if (Notification.permission === "granted") {
      notifyBtn.textContent = "Browser reminders on";
      notifyBtn.disabled = true; notifyBtn.classList.remove("solid");
    } else if (Notification.permission === "denied") {
      notifyBtn.textContent = "Reminders blocked in browser";
      notifyBtn.disabled = true; notifyBtn.classList.remove("solid");
    }
  }
  notifyBtn.addEventListener("click", function () {
    if (!("Notification" in window)) return;
    Notification.requestPermission().then(function () { refreshNotifyBtn(); checkDue(); });
  });

  function notify(title, body) {
    var opts = { body: body, icon: "assets/img/favicon.svg", tag: "biopod-refeed" };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (reg) {
        try { reg.showNotification(title, opts); } catch (e) { new Notification(title, opts); }
      }).catch(function () { try { new Notification(title, opts); } catch (e) {} });
    } else { try { new Notification(title, opts); } catch (e) {} }
  }

  function checkDue() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    var today = todayISO();
    var notified = loadNotified();
    var due = load().filter(function (p) { return computed(p).state === "due"; });
    var fresh = due.filter(function (p) { return notified[p.id] !== today; });
    if (!fresh.length) return;
    if (fresh.length === 1) {
      notify("Time to refeed " + fresh[0].name, "Place a new BioPod and water as normal.");
    } else {
      notify(fresh.length + " plants need refeeding", fresh.map(function (p) { return p.name; }).join(", "));
    }
    fresh.forEach(function (p) { notified[p.id] = today; });
    saveNotified(notified);
  }

  /* ---------- service worker ---------- */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* offline support optional */ });
  }

  /* ---------- init ---------- */
  refreshNotifyBtn();
  render();
  checkDue();
})();
