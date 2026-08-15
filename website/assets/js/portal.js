/* BioPod Plant Care Portal.
   Everything runs in this browser. Plants are stored in localStorage, nothing is sent anywhere.
   Reminders: per-plant .ics calendar files, plus optional browser notifications.

   The guidance engine below (species appetite, seasonal adjustment, symptom check) is a
   rule set built from published university extension guidance. It runs offline, instantly,
   with no account, no API key and no data leaving the device. */
(function () {
  "use strict";

  var KEY = "biopod.plants.v1";
  var NOTIFY_KEY = "biopod.notify.v1"; // map of id -> last notified ISO date

  /* =========================================================
     PLANT KNOWLEDGE BASE
     appetite: how hungry the plant is, which sets the base cycle
       light    = 10 weeks   moderate = 9 weeks   heavy = 8 weeks
     Kept deliberately qualitative. General horticultural guidance,
     not invented precision.
     ========================================================= */
  var PLANTS = [
    // Houseplants
    { n: "Pothos",           g: "Houseplant", a: "moderate", t: "Forgiving and steady. Responds well to gentle, regular feeding." },
    { n: "Monstera",         g: "Houseplant", a: "heavy",    t: "A hungry grower in the warm months. Slows noticeably in winter." },
    { n: "Snake plant",      g: "Houseplant", a: "light",    t: "Very low needs. One pod goes a long way, even in a bigger pot." },
    { n: "ZZ plant",         g: "Houseplant", a: "light",    t: "Tolerates neglect. Easy to overfeed with concentrates, hard to with a pod." },
    { n: "Fiddle leaf fig",  g: "Houseplant", a: "heavy",    t: "Hungry but sensitive. Steady release suits it far better than a spike." },
    { n: "Peace lily",       g: "Houseplant", a: "moderate", t: "Moderate feeder. Benefits from the soil biology building over cycles." },
    { n: "Philodendron",     g: "Houseplant", a: "moderate", t: "Steady grower that likes consistency more than strength." },
    { n: "Spider plant",     g: "Houseplant", a: "moderate", t: "Easygoing. Brown tips usually mean water quality, not feeding." },
    { n: "Rubber plant",     g: "Houseplant", a: "moderate", t: "Steady feeder through the growing season." },
    { n: "Calathea",         g: "Houseplant", a: "moderate", t: "Fussy about humidity and water quality, not especially about food." },
    { n: "Succulent",        g: "Houseplant", a: "light",    t: "Very light feeder. Stretch the cycle and never crowd the pot." },
    { n: "Cactus",           g: "Houseplant", a: "light",    t: "Minimal needs. Feed only in the active season." },
    { n: "Orchid",           g: "Houseplant", a: "light",    t: "Grown in bark, not soil, so pods are not the right format here." },
    // Herbs and edibles
    { n: "Basil",            g: "Herb",       a: "heavy",    t: "Constant harvesting means constant regrowth. Wants steady nitrogen." },
    { n: "Mint",             g: "Herb",       a: "moderate", t: "Vigorous and forgiving. Give it its own pot, it will take over." },
    { n: "Parsley",          g: "Herb",       a: "moderate", t: "Steady leafy growth through the season." },
    { n: "Rosemary",         g: "Herb",       a: "light",    t: "Mediterranean. Prefers lean soil, so do not overdo it." },
    { n: "Tomato",           g: "Vegetable",  a: "heavy",    t: "One of the hungriest things you can grow in a pot." },
    { n: "Pepper",           g: "Vegetable",  a: "heavy",    t: "Long season, heavy feeder. Potassium supports fruit set." },
    { n: "Lettuce",          g: "Vegetable",  a: "moderate", t: "Fast and leafy. A short crop, so one pod usually covers it." },
    // Ornamentals
    { n: "Rose",             g: "Ornamental", a: "heavy",    t: "Hungry through the blooming season. Feed at the root zone." },
    { n: "Hydrangea",        g: "Ornamental", a: "heavy",    t: "Big leaves, big thirst, big appetite in summer." },
    { n: "Geranium",         g: "Ornamental", a: "moderate", t: "Reliable container bloomer. Steady feeding keeps flowers coming." },
    { n: "Fern",             g: "Houseplant", a: "light",    t: "Gentle feeder. Cares far more about humidity than fertilizer." }
  ];

  var APPETITE_WEEKS = { light: 10, moderate: 9, heavy: 8 };

  function findSpecies(str) {
    if (!str) return null;
    var s = str.toLowerCase().trim();
    for (var i = 0; i < PLANTS.length; i++) {
      var n = PLANTS[i].n.toLowerCase();
      if (s === n || s.indexOf(n) > -1 || n.indexOf(s) > -1) return PLANTS[i];
    }
    return null;
  }

  /* =========================================================
     SEASON ENGINE
     University extension guidance is consistent: through the short days of
     winter most plants rest and draw very little from the soil, so feeding
     intervals should stretch. Roughly Mar-Sep active, Oct taper, Nov-Feb rest.
     Northern Hemisphere calendar.
     ========================================================= */
  function season(date) {
    var m = (date || new Date()).getMonth(); // 0 = Jan
    if (m >= 2 && m <= 8) return { key: "growing", label: "Growing season", add: 0,
      note: "Longer days, active growth. Plants are feeding at their normal pace." };
    if (m === 9) return { key: "taper", label: "Season tapering", add: 2,
      note: "Days are shortening and growth is slowing, so feedings can space out a little." };
    return { key: "resting", label: "Resting season", add: 4,
      note: "Through the short days most plants rest and take up far less from the soil, so stretch the gap between pods." };
  }

  /* Pods needed, from BioPod's pot-size rule: about one pod per six inches. */
  function podsFor(inches) {
    if (!inches) return null;
    if (inches <= 6) return 1;
    if (inches <= 11) return 2;
    if (inches <= 17) return 3;
    return Math.max(4, Math.round(inches / 6));
  }

  /* Suggested cycle for a plant: appetite base, adjusted for season and pot size. */
  function suggestCycle(speciesStr, inches, date) {
    var sp = findSpecies(speciesStr);
    var base = sp ? APPETITE_WEEKS[sp.a] : 9;
    var s = season(date);
    var weeks = base + s.add;
    // Small pots dry out and flush faster, so they run slightly shorter.
    if (inches && inches <= 5) weeks -= 1;
    return { weeks: Math.max(6, Math.min(16, weeks)), species: sp, season: s, base: base };
  }

  /* =========================================================
     SYMPTOM CHECK
     Each answer reflects published extension guidance. Honest by design:
     several of these are NOT feeding problems, and the tool says so.
     ========================================================= */
  var SYMPTOMS = [
    {
      id: "yellow-lower-wet",
      q: "Lower leaves turning yellow, soil damp and the pot feels heavy",
      cause: "Almost always overwatering, not hunger.",
      why: "Roots sitting in airless, soggy soil cannot take up nitrogen, and the oldest leaves yellow first. Extension services list this as the most common houseplant problem of all.",
      todo: "Let the top two inches dry before watering again, and make sure the pot actually drains. Do not add food to fix this, a struggling root system cannot use it.",
      feeding: false
    },
    {
      id: "yellow-slow-growth",
      q: "Pale or yellowing older leaves, new growth small, soil drains fine",
      cause: "This one does look like underfeeding.",
      why: "When nitrogen runs short a plant moves it from old leaves to new ones, so the oldest leaves fade first while the plant keeps trying to grow.",
      todo: "Check the plant's last feeding date. If it is past its cycle, place a fresh pod. In the growing season a hungry plant responds within a couple of weeks.",
      feeding: true
    },
    {
      id: "brown-crispy-tips",
      q: "Brown, dry, papery leaf tips",
      cause: "Usually humidity or water quality, sometimes fertilizer salts.",
      why: "Extension guidance points at low humidity and at fluoride or chlorine in tap water first. Salt buildup from over-applied synthetic fertilizer causes the same look.",
      todo: "Raise humidity, and try filtered or left-out tap water. If you have been using concentrated synthetic feed, flush the pot with plain water. Trim the brown edge, it will not turn green again.",
      feeding: false
    },
    {
      id: "white-crust",
      q: "White or crusty deposit on the soil surface or pot rim",
      cause: "Salt buildup, the classic sign of concentrated synthetic fertilizer.",
      why: "Salts that the plant never took up stay behind and concentrate as water evaporates. This is exactly the failure mode a pre-measured organic pod is designed to avoid.",
      todo: "Flush the pot slowly with plain water several times, and scrape off the crust. Going forward, a pod releases gradually instead of dumping soluble salts.",
      feeding: false
    },
    {
      id: "wilting-wet",
      q: "Wilting even though the soil is moist",
      cause: "A root problem, usually from staying too wet.",
      why: "Damaged roots cannot move water upward, so the plant wilts while sitting in wet soil. It looks like thirst and is the opposite.",
      todo: "Stop watering and let it dry out. Check for soft, dark, or smelly roots. Feeding will not help until the roots recover.",
      feeding: false
    },
    {
      id: "no-growth-season",
      q: "Barely any new growth during spring or summer",
      cause: "Could be light, could be hunger.",
      why: "Light comes first, a plant in too little light will not grow no matter how well fed. If light is decent and it has not been fed in months, food is the next thing to look at.",
      todo: "Move it somewhere brighter first and give it two weeks. If light is already good and its cycle has run out, place a fresh pod.",
      feeding: true
    },
    {
      id: "no-growth-winter",
      q: "Growth stopped, and it is late autumn or winter",
      cause: "Normal. Most plants rest in the short days.",
      why: "Shorter days slow photosynthesis and plants enter a resting period, drawing very little from the soil. Extension services are consistent that this is expected, not a problem.",
      todo: "Do nothing. Water less, hold off on extra feeding, and let it rest. Your portal already stretches feeding cycles during the resting season.",
      feeding: false
    },
    {
      id: "leggy-stretching",
      q: "Long bare stems reaching, with widely spaced leaves",
      cause: "Not enough light. This is not a feeding issue.",
      why: "Plants stretch toward a light source when there is not enough of it. More fertilizer produces more weak, stretched growth, not stronger growth.",
      todo: "Move it closer to a window or add a grow light. Prune the leggy stems to encourage bushier growth once light improves.",
      feeding: false
    }
  ];

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
  function icsDate(date) { return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()); }
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
  var tipEl = document.getElementById("smart-tip");
  var speciesList = document.getElementById("species-options");
  var seasonEl = document.getElementById("season-banner");

  dateEl.value = todayISO();
  dateEl.max = todayISO();

  /* Fill the species datalist from the knowledge base */
  if (speciesList) {
    PLANTS.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.n; o.label = p.g;
      speciesList.appendChild(o);
    });
  }

  /* ---------- season banner ---------- */
  function renderSeason() {
    if (!seasonEl) return;
    var s = season();
    seasonEl.className = "season-banner " + s.key;
    seasonEl.querySelector(".s-label").textContent = s.label;
    seasonEl.querySelector(".s-note").textContent = s.note;
  }

  /* ---------- smart suggestion panel ---------- */
  var userTouchedCycle = false;
  cycleEl.addEventListener("input", function () {
    userTouchedCycle = true;
    cycleOut.textContent = cycleEl.value + " weeks";
    updateTip();
  });

  function updateTip(applyCycle) {
    if (!tipEl) return;
    var inches = potEl.value ? +potEl.value : null;
    var sug = suggestCycle(speciesEl.value, inches);
    var pods = podsFor(inches);

    if (applyCycle && !userTouchedCycle) {
      cycleEl.value = Math.max(6, Math.min(16, sug.weeks));
      cycleOut.textContent = cycleEl.value + " weeks";
    }

    var bits = [];
    if (sug.species) {
      var appetite = sug.species.a === "heavy" ? "a hungry plant"
        : (sug.species.a === "light" ? "a light feeder" : "a moderate feeder");
      bits.push('<p><strong>' + esc(sug.species.n) + '</strong> is ' + appetite + '. ' + esc(sug.species.t) + '</p>');
    }
    if (pods) {
      bits.push('<p><strong>' + pods + (pods === 1 ? ' pod' : ' pods') + '</strong> for a ' + inches +
        ' inch pot, about one per six inches of width.</p>');
    }
    bits.push('<p><strong>' + sug.weeks + ' weeks</strong> suggested right now. ' + esc(sug.season.note) + '</p>');

    if (!sug.species && speciesEl.value.trim()) {
      bits.push('<p class="unknown">That one is not in our guide yet, so this uses the standard cycle. It will still track perfectly.</p>');
    }
    tipEl.innerHTML = bits.join("");
    tipEl.hidden = false;
  }

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  speciesEl.addEventListener("input", function () { updateTip(true); });
  speciesEl.addEventListener("change", function () { updateTip(true); });
  potEl.addEventListener("input", function () { updateTip(true); });

  /* ---------- render ---------- */
  function uid() { return "p" + Math.random().toString(36).slice(2, 9) + (load().length); }

  function render() {
    var list = load();
    listEl.innerHTML = "";
    emptyEl.style.display = list.length ? "none" : "block";
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

    var pods = podsFor(p.potSizeInches);
    var sp = findSpecies(p.species);
    var s = season();

    // A short, situational line per plant.
    var advice = "";
    if (c.state === "due") {
      advice = "Place " + (pods ? (pods === 1 ? "one pod" : pods + " pods") : "a fresh pod") +
        " and water as normal." + (s.key === "resting" ? " Growth is slow right now, so it will work quietly." : "");
    } else if (c.state === "soon") {
      advice = "Due in about " + weeksLeft + (weeksLeft === 1 ? " week" : " weeks") + ". " +
        (pods ? "You will need " + (pods === 1 ? "one pod" : pods + " pods") + "." : "");
    } else if (sp && s.key === "resting" && sp.a === "heavy") {
      advice = sp.n + " grows hard in summer and rests now, so this longer gap is normal.";
    } else if (sp) {
      advice = sp.t;
    }

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
        (advice ? '<p class="plant-advice"></p>' : '') +
      '</div>' +
      '<div class="plant-actions">' +
        '<button class="btn-sm solid" data-act="fed">' + IC.check + 'Mark fed today</button>' +
        '<button class="btn-sm" data-act="ics">' + IC.cal + 'Add to calendar</button>' +
        '<button class="btn-sm" data-act="edit">' + IC.edit + 'Edit</button>' +
        '<button class="btn-sm danger" data-act="del">' + IC.trash + 'Delete</button>' +
      '</div>';
    el.querySelector("h3").textContent = p.name;
    el.querySelector(".meta").textContent = meta.join(" · ");
    if (advice) el.querySelector(".plant-advice").textContent = advice;
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
    // Re-tune the next cycle for the season we are actually in now.
    var sug = suggestCycle(p.species, p.potSizeInches);
    if (!p.cycleLocked) p.cycleWeeks = sug.weeks;
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
    userTouchedCycle = true;
    updateTip(false);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    nameEl.focus();
  }
  function resetForm() {
    form.reset();
    idEl.value = "";
    dateEl.value = todayISO();
    userTouchedCycle = false;
    var sug = suggestCycle("", null);
    cycleEl.value = sug.weeks; cycleOut.textContent = sug.weeks + " weeks";
    titleEl.textContent = "Add a plant";
    submitEl.textContent = "Add plant";
    cancelEl.style.display = "none";
    if (tipEl) { tipEl.hidden = true; tipEl.innerHTML = ""; }
    updateTip(false);
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
      cycleLocked: userTouchedCycle,
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

  /* ---------- symptom check ---------- */
  var checkList = document.getElementById("symptom-list");
  var checkOut = document.getElementById("symptom-answer");
  if (checkList) {
    SYMPTOMS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "symptom";
      b.textContent = s.q;
      b.setAttribute("aria-controls", "symptom-answer");
      b.addEventListener("click", function () {
        [].forEach.call(checkList.querySelectorAll(".symptom"), function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        checkOut.innerHTML =
          '<p class="cause"></p>' +
          '<p class="why"></p>' +
          '<div class="todo"><strong>What to do</strong><p></p></div>' +
          '<p class="verdict ' + (s.feeding ? "yes" : "no") + '"></p>';
        checkOut.querySelector(".cause").textContent = s.cause;
        checkOut.querySelector(".why").textContent = s.why;
        checkOut.querySelector(".todo p").textContent = s.todo;
        checkOut.querySelector(".verdict").textContent = s.feeding
          ? "This one is worth checking your feeding schedule for."
          : "Feeding will not fix this one, and more plant food would not help.";
        checkOut.hidden = false;
      });
      checkList.appendChild(b);
    });
  }

  /* ---------- .ics calendar ---------- */
  function downloadICS(p) {
    var c = computed(p);
    var now = new Date();
    var stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + "T" +
      pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + "Z";
    var name = p.name.replace(/[\r\n,;\\]/g, " ");
    var pods = podsFor(p.potSizeInches);
    var desc = "Time to place " + (pods ? (pods === 1 ? "one BioPod" : pods + " BioPods") : "a new BioPod") +
      " for " + name + ". Drop in and water as normal.";
    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BioPod//Plant Care Portal//EN",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + p.id + "-" + icsDate(c.refeed) + "@biopod",
      "DTSTAMP:" + stamp,
      "DTSTART;VALUE=DATE:" + icsDate(c.refeed),
      "SUMMARY:Refeed " + name + " with BioPod",
      "DESCRIPTION:" + desc,
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
    var opts = { body: body, icon: "assets/brand/favicon.png", tag: "biopod-refeed" };
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
      var pods = podsFor(fresh[0].potSizeInches);
      notify("Time to refeed " + fresh[0].name,
        "Place " + (pods ? (pods === 1 ? "one pod" : pods + " pods") : "a new pod") + " and water as normal.");
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
  renderSeason();
  refreshNotifyBtn();
  resetForm();
  render();
  checkDue();
})();
