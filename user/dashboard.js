/* ==========================================================
   Budget Planner: user/dashboard.js

   Everything the person enters is saved in this browser under
   their own account (key "bp:data:<email>"), so each user sees
   only their own transactions, budgets and goals.

   Sections in this file:
     1. Setup, constants, icons
     2. Data (load / save / calculations)
     3. Rendering (one function per screen)
     4. Dialogs (add income, expense, budget, goal ...)
     5. Navigation and page events
   ========================================================== */

(function () {
  "use strict";

  /* The <head> already sent anyone who isn't a logged-in user back to login. */
  var sess = window.session || BPAuth.getSession();
  if (!sess || sess.role !== "user") return;

  /* ==========================================================
     1. SETUP
     ========================================================== */

  function $(id) { return document.getElementById(id); }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  var CATS = {
    expense: ["Food", "Travel", "Shopping", "Bills", "Health", "Others"],
    income: ["Salary", "Freelance", "Investment", "Gift", "Other"]
  };

  var CAT_STYLE = {
    Food:       { color: "#1f8a70", icon: "food" },
    Travel:     { color: "#f0845c", icon: "car" },
    Shopping:   { color: "#4f86e8", icon: "bag" },
    Bills:      { color: "#8a66d6", icon: "bolt" },
    Health:     { color: "#e05a74", icon: "heart" },
    Others:     { color: "#8fae9b", icon: "dots" },
    Salary:     { color: "#2f7d55", icon: "cash" },
    Freelance:  { color: "#1f8a70", icon: "laptop" },
    Investment: { color: "#4f86e8", icon: "trend" },
    Gift:       { color: "#c76bb0", icon: "gift" },
    Other:      { color: "#8fae9b", icon: "dots" }
  };

  var ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.6"/><rect x="14" y="12" width="7" height="9" rx="1.6"/><rect x="3" y="16" width="7" height="5" rx="1.6"/>',
    transactions: '<path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>',
    budgets: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2"/><path d="M3 7.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5Z"/><circle cx="16.5" cy="13.5" r="1"/>',
    goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    analytics: '<path d="M5 20v-8M12 20V5M19 20v-5"/>',
    alerts: '<path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    reports: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    wallet: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2"/><path d="M3 7.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5Z"/><circle cx="16.5" cy="13.5" r="1"/>',
    down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 8h6M9 11.5h6M9 8c4 0 4 5 0 5l5 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v6a2 2 0 0 1-2 2M17 3c-2 1-3 3-3 6s1 4 3 4v8"/>',
    car: '<path d="M5 16l1.5-5a2 2 0 0 1 1.9-1.4h7.2A2 2 0 0 1 17.5 11L19 16"/><rect x="3" y="16" width="18" height="4" rx="1.5"/><path d="M7 18h.01M17 18h.01"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    heart: '<path d="M12 20.5s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 20 10c0 5.900-8 10.500-8 10.500Z"/>',
    dots: '<path d="M6 12h.01M12 12h.01M18 12h.01" stroke-width="3"/>',
    cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 19h18"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M12 9v11M3 9h18M12 9c-2-4-6-3-5 0M12 9c2-4 6-3 5 0"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.5"/>',
    warn: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
  };

  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }

  function hydrateIcons(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll("[data-icon]"), function (node) {
      node.innerHTML = svg(node.getAttribute("data-icon"));
    });
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* ---------- Formatting ---------- */

  var inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

  function money(n) { return (n < 0 ? "-" : "") + "₹" + inr.format(Math.abs(n)); }

  function compact(n) {
    if (n >= 100000) return "₹" + +(n / 100000).toFixed(1) + "L";
    if (n >= 1000) return "₹" + +(n / 1000).toFixed(1) + "k";
    return "₹" + n;
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function todayISO() { return isoDate(new Date()); }
  function parseISO(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function monthKey(s) { return s.slice(0, 7); }
  function curMonth() { return monthKey(todayISO()); }

  function fmtDate(s) {
    var d = parseISO(s);
    return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }

  function monthLabel(mk) { var p = mk.split("-"); return MONTHS_LONG[+p[1] - 1] + " " + p[0]; }
  function monthShort(mk) { return MONTHS[+mk.split("-")[1] - 1]; }

  function shiftMonth(mk, delta) {
    var p = mk.split("-");
    var d = new Date(+p[0], +p[1] - 1 + delta, 1);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1);
  }

  function lastMonths(n) {
    var cur = curMonth();
    var out = [];
    for (var i = n - 1; i >= 0; i--) out.push(shiftMonth(cur, -i));
    return out;
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function styleOf(cat) { return CAT_STYLE[cat] || CAT_STYLE.Others; }

  /* ==========================================================
     2. DATA
     ========================================================== */

  var KEY = "bp:data:" + sess.email;
  var state = load();

  var ui = { view: "dashboard", type: "all", cat: "all", query: "" };

  function emptyState() { return { tx: [], budgets: {}, goals: [], profile: {} }; }

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (v && Array.isArray(v.tx)) {
        v.budgets = v.budgets && typeof v.budgets === "object" ? v.budgets : {};
        v.goals = Array.isArray(v.goals) ? v.goals : [];
        v.profile = v.profile && typeof v.profile === "object" ? v.profile : {};
        return v;
      }
    } catch (err) { /* fall through to an empty account */ }
    return emptyState();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      toast("Couldn't save. Your browser is blocking storage for this site.", { type: "error" });
      return false;
    }
  }

  function sortedTx() {
    return state.tx.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.at || 0) - (a.at || 0);
    });
  }

  function totals() {
    var income = 0, expense = 0, saved = 0;
    state.tx.forEach(function (t) { if (t.type === "income") income += t.amount; else expense += t.amount; });
    state.goals.forEach(function (g) { saved += g.saved; });
    return { income: income, expense: expense, saved: saved, balance: income - expense - saved };
  }

  function monthSummary(mk) {
    var s = { income: 0, expense: 0, byCat: {} };
    state.tx.forEach(function (t) {
      if (monthKey(t.date) !== mk) return;
      if (t.type === "income") s.income += t.amount;
      else {
        s.expense += t.amount;
        s.byCat[t.category] = (s.byCat[t.category] || 0) + t.amount;
      }
    });
    return s;
  }

  function displayName() {
    return (state.profile.name || sess.name || sess.email.split("@")[0]).trim();
  }

  function parseAmount(text) {
    var s = String(text).replace(/[,\s₹]/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    var n = Number(s);
    return n > 0 && n <= 1e9 ? n : null;
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  /* ---------- Alerts (calculated from the data) ---------- */

  function buildAlerts() {
    var out = [];
    var ms = monthSummary(curMonth());

    Object.keys(state.budgets).forEach(function (cat) {
      var limit = state.budgets[cat];
      var spent = ms.byCat[cat] || 0;
      if (!limit) return;
      var ratio = spent / limit;
      if (ratio >= 1) {
        out.push({ level: "danger", icon: "warn", title: "Over budget: " + cat,
          text: "You've spent " + money(spent) + " of your " + money(limit) + " " + cat + " budget, which is " + money(round2(spent - limit)) + " over." });
      } else if (ratio >= 0.8) {
        out.push({ level: "warn", icon: "warn", title: "Nearing your limit: " + cat,
          text: "You've used " + Math.round(ratio * 100) + "% of your " + cat + " budget. " + money(round2(limit - spent)) + " left this month." });
      }
    });

    if (ms.income > 0 && ms.expense > ms.income) {
      out.push({ level: "danger", icon: "warn", title: "Spending is above income",
        text: "This month you've spent " + money(ms.expense) + " against " + money(ms.income) + " of income." });
    } else if (ms.income > 0 && ms.expense > ms.income * 0.8) {
      out.push({ level: "warn", icon: "warn", title: "High spending this month",
        text: "You've already spent " + Math.round(ms.expense / ms.income * 100) + "% of this month's income." });
    }

    state.goals.forEach(function (g) {
      if (g.saved >= g.target) {
        out.push({ level: "good", icon: "check", title: "Goal reached: " + g.name, text: "You've saved the full " + money(g.target) + ". Well done!" });
      }
    });

    if (state.tx.length && !Object.keys(state.budgets).length) {
      out.push({ level: "info", icon: "info", title: "Set your first budget", text: "Budgets let Budget Planner warn you before you overspend in a category." });
    }

    if (!state.tx.length) {
      out.push({ level: "info", icon: "info", title: "Nothing to report yet", text: "Add an income or an expense and your alerts will show up here." });
    }

    var order = { danger: 0, warn: 1, good: 2, info: 3 };
    out.sort(function (a, b) { return order[a.level] - order[b.level]; });
    return out;
  }

  /* ==========================================================
     3. RENDERING
     ========================================================== */

  var shown = {}; // last number shown on each stat card, for the count-up

  function animateNumber(el, key, to) {
    var from = shown[key] || 0;
    shown[key] = to;

    if (reduced || from === to) { el.textContent = money(to); return; }

    var start = performance.now();
    var dur = 650;

    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = money(p < 1 ? Math.round(from + (to - from) * eased) : to);
      if (p < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function deltaChip(cur, prev, goodWhenUp) {
    if (prev <= 0) return '<span class="delta flat">' + (cur > 0 ? "First month of data" : "Nothing yet") + "</span>";
    var pct = Math.round((cur - prev) / prev * 100);
    if (pct === 0) return '<span class="delta flat">Same as last month</span>';
    var up = pct > 0;
    var good = up === goodWhenUp;
    return '<span class="delta ' + (good ? "good" : "bad") + '">' + (up ? "▲" : "▼") + " " + Math.abs(pct) + "% vs last month</span>";
  }

  function growBars(root) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        Array.prototype.forEach.call(root.querySelectorAll("[data-w]"), function (bar) {
          bar.style.width = bar.getAttribute("data-w") + "%";
        });
      });
    });
  }

  /* ---------- Header ---------- */

  function renderHeader() {
    var name = displayName();
    $("avatar").textContent = name.charAt(0).toUpperCase();
    $("userName").textContent = name.split(/\s+/)[0];
    $("userEmail").textContent = sess.email;

    var hour = new Date().getHours();
    var part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    $("greeting").textContent = part + ", " + name.split(/\s+/)[0] + "!";
    $("overview").textContent = "Here's your financial overview for " + monthLabel(curMonth()) + ".";
  }

  /* ---------- Dashboard ---------- */

  function txItem(t, withDelete) {
    var s = styleOf(t.category);
    return '<li class="tx">' +
      '<span class="cat-ico" style="--c:' + s.color + '">' + svg(s.icon) + "</span>" +
      '<div class="tx-main"><p class="tx-title">' + esc(t.note || t.category) + '</p><p class="tx-sub">' + esc(t.category) + " · " + fmtDate(t.date) + "</p></div>" +
      '<p class="tx-amt ' + t.type + '">' + (t.type === "income" ? "+ " : "- ") + money(t.amount) + "</p>" +
      (withDelete ? '<button class="icon-btn danger" type="button" data-del="' + t.id + '" aria-label="Delete ' + esc(t.note || t.category) + '">' + svg("trash") + "</button>" : "") +
      "</li>";
  }

  var DONUT_R = 76;
  var DONUT_C = 2 * Math.PI * DONUT_R;
  var NS = "http://www.w3.org/2000/svg";

  function renderDonut(byCat, total) {
    var box = $("donut");
    box.innerHTML = "";

    function circle(cls) {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", 100); c.setAttribute("cy", 100); c.setAttribute("r", DONUT_R);
      c.setAttribute("class", cls);
      return c;
    }

    box.appendChild(circle("seg-track"));
    var group = document.createElementNS(NS, "g");
    group.setAttribute("transform", "rotate(-90 100 100)");
    box.appendChild(group);

    var entries = Object.keys(byCat)
      .map(function (k) { return { cat: k, amt: byCat[k] }; })
      .filter(function (e) { return e.amt > 0; })
      .sort(function (a, b) { return b.amt - a.amt; });

    var segs = [];
    var acc = 0;

    entries.forEach(function (e) {
      var share = e.amt / total;
      var c = circle("seg-ring");
      c.setAttribute("stroke", styleOf(e.cat).color);
      c.setAttribute("data-cat", e.cat);
      c.style.strokeDasharray = "0 " + DONUT_C;
      c.style.strokeDashoffset = String(-acc * DONUT_C);
      group.appendChild(c);
      segs.push({ el: c, len: Math.max(share * DONUT_C - (entries.length > 1 ? 3 : 0), 1) });
      acc += share;
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        segs.forEach(function (s) { s.el.style.strokeDasharray = s.len + " " + DONUT_C; });
      });
    });

    $("legend").innerHTML = entries.length
      ? entries.map(function (e) {
          return '<li data-cat="' + esc(e.cat) + '"><span class="dotc" style="--c:' + styleOf(e.cat).color + '"></span>' +
            "<span>" + esc(e.cat) + '</span><span class="pct">' + Math.round(e.amt / total * 100) + '%</span><span class="amt">' + money(e.amt) + "</span></li>";
        }).join("")
      : '<li class="legend-empty">No spending recorded this month yet. Add an expense and it will appear here.</li>';

    resetDonutCenter();
    donutAmounts = byCat;
    donutTotal = total;
  }

  var donutAmounts = {};
  var donutTotal = 0;

  function resetDonutCenter() {
    $("donutValue").textContent = money(donutTotal);
    $("donutLabel").textContent = "Total spent";
    var wrap = document.querySelector(".donut");
    wrap.classList.remove("hovering");
    Array.prototype.forEach.call(document.querySelectorAll(".seg-ring.on, .legend li.on"), function (n) { n.classList.remove("on"); });
  }

  function highlightCategory(cat) {
    if (!cat || !donutAmounts[cat]) return;
    var wrap = document.querySelector(".donut");
    wrap.classList.add("hovering");
    Array.prototype.forEach.call(document.querySelectorAll("[data-cat]"), function (n) {
      n.classList.toggle("on", n.getAttribute("data-cat") === cat);
    });
    $("donutValue").textContent = money(donutAmounts[cat]);
    $("donutLabel").textContent = cat;
  }

  function renderDashboard() {
    var cur = curMonth();
    var ms = monthSummary(cur);
    var prev = monthSummary(shiftMonth(cur, -1));
    var t = totals();

    var brandNew = !state.tx.length && !state.goals.length && !Object.keys(state.budgets).length;
    $("emptyBanner").hidden = !brandNew;

    animateNumber($("statBalance"), "balance", t.balance);
    animateNumber($("statIncome"), "income", ms.income);
    animateNumber($("statExpense"), "expense", ms.expense);
    animateNumber($("statSaving"), "saving", t.saved);

    $("noteBalance").textContent = t.balance < 0 ? "You've spent more than you've earned" : "Available after savings";
    $("noteIncome").innerHTML = deltaChip(ms.income, prev.income, true);
    $("noteExpense").innerHTML = deltaChip(ms.expense, prev.expense, false);
    $("noteSaving").textContent = state.goals.length
      ? state.goals.length + (state.goals.length === 1 ? " goal in progress" : " goals in progress")
      : "No goals yet";

    $("spendMonth").textContent = monthLabel(cur);
    renderDonut(ms.byCat, ms.expense);

    var recent = sortedTx().slice(0, 5);
    $("recentList").innerHTML = recent.length
      ? recent.map(function (x) { return txItem(x, false); }).join("")
      : '<li class="empty"><strong>No transactions yet</strong>Your latest income and expenses will be listed here.<button class="btn primary" type="button" data-open="expense">Add an expense</button></li>';
  }

  /* ---------- Transactions ---------- */

  function renderTransactions() {
    var catSel = $("catFilter");
    if (!catSel.options.length) {
      var all = ["all"].concat(CATS.expense, CATS.income);
      catSel.innerHTML = all.map(function (c) { return '<option value="' + c + '">' + (c === "all" ? "All categories" : c) + "</option>"; }).join("");
    }
    catSel.value = ui.cat;

    var q = ui.query.trim().toLowerCase();
    var list = sortedTx().filter(function (t) {
      if (ui.type !== "all" && t.type !== ui.type) return false;
      if (ui.cat !== "all" && t.category !== ui.cat) return false;
      if (q) {
        var hay = (t.note + " " + t.category + " " + t.amount + " " + fmtDate(t.date)).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    var inc = 0, exp = 0;
    list.forEach(function (t) { if (t.type === "income") inc += t.amount; else exp += t.amount; });

    $("txSummary").textContent = state.tx.length
      ? "Showing " + list.length + " of " + state.tx.length + " · Income " + money(inc) + " · Expenses " + money(exp)
      : "Every rupee in and out.";

    var chip = $("clearQuery");
    chip.hidden = !q;
    chip.textContent = "Search: “" + ui.query.trim() + "”  ×";

    var box = $("txList");
    if (list.length) {
      box.innerHTML = list.map(function (t) { return txItem(t, true); }).join("");
    } else if (state.tx.length) {
      box.innerHTML = '<li class="empty"><strong>No matches</strong>Try a different search or clear the filters.</li>';
    } else {
      box.innerHTML = '<li class="empty"><strong>No transactions yet</strong>Record your first income or expense to start tracking.<button class="btn primary" type="button" data-open="expense">Add an expense</button></li>';
    }
  }

  /* ---------- Budgets ---------- */

  function renderBudgets() {
    var ms = monthSummary(curMonth());
    var totalLimit = 0, totalSpent = 0;
    var budgeted = Object.keys(state.budgets);

    budgeted.forEach(function (c) { totalLimit += state.budgets[c]; totalSpent += ms.byCat[c] || 0; });

    $("budgetSummary").textContent = budgeted.length
      ? "Spent " + money(totalSpent) + " of " + money(totalLimit) + " budgeted in " + monthLabel(curMonth()) + "."
      : "Set a monthly limit for each category.";

    $("budgetGrid").innerHTML = CATS.expense.map(function (cat) {
      var s = styleOf(cat);
      var limit = state.budgets[cat];
      var spent = ms.byCat[cat] || 0;
      var head = '<div class="card-top"><span class="cat-ico" style="--c:' + s.color + '">' + svg(s.icon) + "</span><div><h3>" + cat + "</h3><p>" +
        (limit ? "Monthly limit " + money(limit) : "No budget set") + "</p></div></div>";

      if (!limit) {
        return '<article class="panel card-item">' + head +
          '<div class="progress"><i data-w="0"></i></div>' +
          '<div class="card-meta"><span><strong>' + money(spent) + "</strong> spent this month</span></div>" +
          '<div class="card-actions"><button class="btn ghost" type="button" data-budget-set="' + cat + '">Set budget</button></div></article>';
      }

      var ratio = spent / limit;
      var cls = ratio >= 1 ? "over" : ratio >= 0.8 ? "warn" : "";
      var status = ratio >= 1
        ? '<span class="status-over">' + money(round2(spent - limit)) + " over</span>"
        : ratio >= 0.8
          ? '<span class="status-warn">' + money(round2(limit - spent)) + " left</span>"
          : '<span class="status-good">' + money(round2(limit - spent)) + " left</span>";

      return '<article class="panel card-item">' + head +
        '<div class="progress ' + cls + '" role="img" aria-label="' + Math.round(ratio * 100) + '% of budget used"><i data-w="' + Math.min(100, ratio * 100) + '"></i></div>' +
        '<div class="card-meta"><span><strong>' + money(spent) + "</strong> spent (" + Math.round(ratio * 100) + "%)</span>" + status + "</div>" +
        '<div class="card-actions"><button class="btn ghost" type="button" data-budget-set="' + cat + '">Edit</button>' +
        '<button class="btn danger" type="button" data-budget-remove="' + cat + '">Remove</button></div></article>';
    }).join("");

    growBars($("budgetGrid"));
  }

  /* ---------- Goals ---------- */

  function renderGoals() {
    var saved = 0, target = 0;
    state.goals.forEach(function (g) { saved += g.saved; target += g.target; });

    $("goalSummary").textContent = state.goals.length
      ? state.goals.length + (state.goals.length === 1 ? " goal" : " goals") + " · " + money(saved) + " saved of " + money(target)
      : "Money you're putting aside for something that matters.";

    if (!state.goals.length) {
      $("goalGrid").innerHTML = '<div class="panel empty" style="grid-column:1/-1"><strong>No goals yet</strong>Pick something you want, like a laptop or a trip, and track your progress towards it.<button class="btn primary" type="button" data-open="goal">Add a goal</button></div>';
      return;
    }

    var R = 27, C = 2 * Math.PI * R;

    $("goalGrid").innerHTML = state.goals.map(function (g) {
      var ratio = Math.min(1, g.saved / g.target);
      var done = g.saved >= g.target;
      return '<article class="panel card-item">' +
        '<div class="card-top"><div class="goal-ring ' + (done ? "done" : "") + '">' +
        '<svg viewBox="0 0 62 62" aria-hidden="true"><circle class="bg" cx="31" cy="31" r="' + R + '"/><circle class="fg" cx="31" cy="31" r="' + R + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" data-offset="' + (C * (1 - ratio)) + '"/></svg>' +
        "<b>" + Math.round(ratio * 100) + "%</b></div>" +
        "<div><h3>" + esc(g.name) + "</h3><p>Target " + money(g.target) + "</p></div></div>" +
        '<div class="card-meta"><span><strong>' + money(g.saved) + "</strong> saved</span>" +
        (done ? '<span class="badge-done">Goal reached</span>' : "<span>" + money(round2(g.target - g.saved)) + " to go</span>") + "</div>" +
        '<div class="card-actions"><button class="btn ghost" type="button" data-fund="' + g.id + '">Add / withdraw</button>' +
        '<button class="btn danger" type="button" data-goal-del="' + g.id + '">Delete</button></div></article>';
    }).join("");

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        Array.prototype.forEach.call($("goalGrid").querySelectorAll(".fg"), function (c) {
          c.setAttribute("stroke-dashoffset", c.getAttribute("data-offset"));
        });
      });
    });
  }

  /* ---------- Analytics ---------- */

  function niceCeil(v) {
    if (v <= 0) return 1000;
    var pow = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / pow;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  }

  function renderAnalytics() {
    var cur = curMonth();
    var ms = monthSummary(cur);
    var prev = monthSummary(shiftMonth(cur, -1));
    var now = new Date();
    var day = now.getDate();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    var rate = ms.income > 0 ? Math.round((ms.income - ms.expense) / ms.income * 100) : null;
    var perDay = day ? ms.expense / day : 0;

    var top = null;
    Object.keys(ms.byCat).forEach(function (c) { if (!top || ms.byCat[c] > ms.byCat[top]) top = c; });

    var change = prev.expense > 0 ? Math.round((ms.expense - prev.expense) / prev.expense * 100) : null;

    var cards = [
      ["Savings rate", rate === null ? "—" : rate + "%", rate === null ? "Add income to see this" : "of this month's income kept"],
      ["Average daily spend", money(Math.round(perDay)), ms.expense ? "On pace for " + money(Math.round(perDay * daysInMonth)) + " this month" : "No spending yet this month"],
      ["Biggest category", top || "—", top ? money(ms.byCat[top]) + " (" + Math.round(ms.byCat[top] / ms.expense * 100) + "% of spending)" : "Nothing spent yet"],
      ["Spending vs last month", change === null ? "—" : (change > 0 ? "+" : "") + change + "%", change === null ? "No data for last month" : "Last month: " + money(prev.expense)]
    ];

    $("insights").innerHTML = cards.map(function (c) {
      return '<article class="panel insight"><p>' + c[0] + "</p><p>" + esc(c[1]) + "</p><p>" + c[2] + "</p></article>";
    }).join("");

    /* Bar chart: last six months */
    var months = lastMonths(6);
    var data = months.map(function (mk) { var s = monthSummary(mk); return { mk: mk, income: s.income, expense: s.expense }; });
    var max = niceCeil(Math.max.apply(null, data.map(function (d) { return Math.max(d.income, d.expense); }).concat([1])));

    var W = 640, H = 280, L = 54, R = 12, T = 14, B = 32;
    var plotW = W - L - R, plotH = H - T - B;
    var group = plotW / months.length;
    var barW = Math.min(30, group / 3);
    var parts = [];

    for (var i = 0; i <= 4; i++) {
      var y = T + plotH - (plotH * i / 4);
      parts.push('<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/>');
      parts.push('<text x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + (i === 0 ? "₹0" : compact(max * i / 4)) + "</text>");
    }

    data.forEach(function (d, idx) {
      var cx = L + group * idx + group / 2;
      [["income", d.income, -barW - 2], ["expense", d.expense, 2]].forEach(function (b) {
        var h = plotH * (b[1] / max);
        var x = cx + b[2];
        if (h > 0) {
          parts.push('<rect class="bar bar-' + b[0] + '" x="' + x + '" y="' + (T + plotH - h) + '" width="' + barW + '" height="' + h + '" rx="6" style="animation-delay:' + (idx * 70) + 'ms"><title>' +
            monthShort(d.mk) + " " + b[0] + ": " + money(b[1]) + "</title></rect>");
        }
      });
      parts.push('<text x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle">' + monthShort(d.mk) + "</text>");
    });

    var chart = $("barChart");
    chart.setAttribute("viewBox", "0 0 " + W + " " + H);
    chart.innerHTML = parts.join("");
  }

  /* ---------- Alerts ---------- */

  function renderAlerts() {
    var alerts = buildAlerts();
    var urgent = alerts.filter(function (a) { return a.level === "danger" || a.level === "warn"; }).length;

    $("alertList").innerHTML = alerts.length
      ? alerts.map(function (a) {
          return '<li class="alert ' + a.level + '"><span class="alert-ico">' + svg(a.icon) + "</span><div><h3>" + esc(a.title) + "</h3><p>" + esc(a.text) + "</p></div></li>";
        }).join("")
      : '<li class="alert good"><span class="alert-ico">' + svg("check") + "</span><div><h3>All clear</h3><p>You're within every budget and spending is under control.</p></div></li>";

    var navCount = $("navAlertCount");
    navCount.hidden = !urgent;
    navCount.textContent = urgent;
    $("bellDot").hidden = !urgent;

    var top = alerts.slice(0, 4);
    $("bellList").innerHTML = top.length
      ? top.map(function (a) { return '<li class="pop-item"><span><strong>' + esc(a.title) + "</strong><br>" + esc(a.text) + "</span></li>"; }).join("")
      : '<li class="pop-empty">You\'re all caught up.</li>';
  }

  /* ---------- Reports ---------- */

  function reportMonth() { return $("reportMonth").value || curMonth(); }

  function renderReports() {
    if (!$("reportMonth").value) $("reportMonth").value = curMonth();

    var mk = reportMonth();
    var ms = monthSummary(mk);
    var net = ms.income - ms.expense;
    var rate = ms.income > 0 ? Math.round(net / ms.income * 100) + "%" : "—";

    var cards = [["Income", money(ms.income)], ["Expenses", money(ms.expense)], ["Net", money(net)], ["Savings rate", rate]];
    var html = '<div class="report-cards">' + cards.map(function (c) {
      return '<article class="panel insight"><p>' + c[0] + "</p><p>" + c[1] + "</p><p>" + monthLabel(mk) + "</p></article>";
    }).join("") + "</div>";

    var cats = Object.keys(ms.byCat).sort(function (a, b) { return ms.byCat[b] - ms.byCat[a]; });
    html += '<article class="panel" style="margin-bottom:18px"><header class="panel-head"><h2>Spending by category</h2></header>';
    html += cats.length
      ? '<div class="table-scroll"><table><thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Share</th><th class="num">Budget</th><th>Status</th></tr></thead><tbody>' +
        cats.map(function (c) {
          var limit = state.budgets[c];
          var status = !limit ? "—" : ms.byCat[c] > limit ? '<span class="status-over">Over</span>' : ms.byCat[c] >= limit * 0.8 ? '<span class="status-warn">Close</span>' : '<span class="status-good">Within</span>';
          return "<tr><td>" + c + '</td><td class="num">' + money(ms.byCat[c]) + '</td><td class="num">' + Math.round(ms.byCat[c] / ms.expense * 100) + '%</td><td class="num">' + (limit ? money(limit) : "—") + "</td><td>" + status + "</td></tr>";
        }).join("") + "</tbody></table></div>"
      : '<p class="muted-block">No expenses recorded in ' + monthLabel(mk) + ".</p>";
    html += "</article>";

    var rows = sortedTx().filter(function (t) { return monthKey(t.date) === mk; });
    html += '<article class="panel"><header class="panel-head"><h2>Transactions</h2><span class="muted">' + rows.length + " in " + monthLabel(mk) + "</span></header>";
    html += rows.length
      ? '<div class="table-scroll"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead><tbody>' +
        rows.map(function (t) {
          return "<tr><td>" + fmtDate(t.date) + "</td><td>" + esc(t.note || "—") + "</td><td>" + t.category + '</td><td class="num tx-amt ' + t.type + '">' + (t.type === "income" ? "+ " : "- ") + money(t.amount) + "</td></tr>";
        }).join("") + "</tbody></table></div>"
      : '<p class="muted-block">Nothing recorded in this month.</p>';
    html += "</article>";

    $("reportBody").innerHTML = html;
  }

  function csvCell(value) {
    var s = String(value);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // stops spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function downloadCsv() {
    var mk = reportMonth();
    var rows = sortedTx().filter(function (t) { return monthKey(t.date) === mk; });

    if (!rows.length) { toast("There are no transactions in " + monthLabel(mk) + " to export."); return; }

    var lines = ["Date,Type,Category,Description,Amount"].concat(rows.map(function (t) {
      return [t.date, t.type, csvCell(t.category), csvCell(t.note || ""), t.amount].join(",");
    }));

    var blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "budget-report-" + mk + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    toast("Report downloaded.");
  }

  /* ---------- Settings ---------- */

  function renderSettings() {
    $("setName").value = displayName();
    $("setEmail").value = sess.email;
  }

  function renderAll() {
    renderHeader();
    renderDashboard();
    renderTransactions();
    renderBudgets();
    renderGoals();
    renderAnalytics();
    renderAlerts();
    renderReports();
  }

  /* ==========================================================
     4. DIALOGS
     ========================================================== */

  var toastTimer = null;

  function toast(message, opts) {
    opts = opts || {};
    var el = $("toast");
    el.textContent = message;
    el.classList.toggle("error", opts.type === "error");
    el.classList.toggle("has-action", !!opts.action);

    if (opts.action) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = opts.action.label;
      btn.addEventListener("click", function () {
        el.classList.remove("show");
        opts.action.run();
      });
      el.appendChild(btn);
    }

    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, opts.action ? 6000 : 3200);
  }

  function setErr(inputId, message) {
    var input = $(inputId);
    var err = $(inputId + "Err");
    if (message) {
      input.setAttribute("aria-invalid", "true");
      err.textContent = message;
      err.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      err.hidden = true;
    }
  }

  function openDialog(dlg, focusId) {
    if (!dlg.open) dlg.showModal();
    if (focusId) $(focusId).focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll("dialog"), function (dlg) {
    // Clicking the dimmed backdrop closes the dialog.
    dlg.addEventListener("click", function (event) {
      var r = dlg.getBoundingClientRect();
      var inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      if (!inside && dlg.id !== "confirmDialog") dlg.close();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (btn) {
    btn.addEventListener("click", function () { btn.closest("dialog").close(); });
  });

  function confirmAction(title, text, okLabel) {
    return new Promise(function (resolve) {
      var dlg = $("confirmDialog");
      $("confirmTitle").textContent = title;
      $("confirmText").textContent = text;
      $("confirmOk").textContent = okLabel || "Delete";
      dlg.addEventListener("close", function () { resolve(dlg.returnValue === "ok"); }, { once: true });
      dlg.returnValue = "cancel";
      dlg.showModal();
    });
  }

  /* ----- Add income / expense ----- */

  function fillCategories(type, selected) {
    $("txCategory").innerHTML = CATS[type].map(function (c) {
      return '<option value="' + c + '"' + (c === selected ? " selected" : "") + ">" + c + "</option>";
    }).join("");
  }

  function selectedRadio(name) {
    var r = document.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : null;
  }

  function syncTxDialog() {
    var type = selectedRadio("txType");
    var word = type === "income" ? "income" : "expense";
    $("txTitle").textContent = "Add " + word;
    $("txSubmit").textContent = "Add " + word;
    fillCategories(type);
  }

  function openTx(type) {
    document.querySelector('input[name="txType"][value="' + type + '"]').checked = true;
    syncTxDialog();
    $("txAmount").value = "";
    $("txNote").value = "";
    $("txDate").value = todayISO();
    $("txDate").max = todayISO();
    setErr("txAmount", "");
    setErr("txDate", "");
    openDialog($("txDialog"), "txAmount");
  }

  Array.prototype.forEach.call(document.querySelectorAll('input[name="txType"]'), function (r) {
    r.addEventListener("change", syncTxDialog);
  });

  $("txForm").addEventListener("submit", function (event) {
    event.preventDefault();

    var type = selectedRadio("txType");
    var amount = parseAmount($("txAmount").value);
    var date = $("txDate").value;
    var bad = null;

    setErr("txAmount", amount === null ? "Enter an amount greater than 0, like 1250 or 99.50." : "");
    if (amount === null) bad = "txAmount";

    var dateProblem = !date ? "Pick a date." : date > todayISO() ? "The date can't be in the future." : "";
    setErr("txDate", dateProblem);
    if (dateProblem && !bad) bad = "txDate";

    if (bad) { $(bad).focus(); return; }

    state.tx.push({ id: uid(), type: type, amount: amount, category: $("txCategory").value, note: $("txNote").value.trim(), date: date, at: Date.now() });
    if (!save()) { state.tx.pop(); return; }

    $("txDialog").close();
    renderAll();
    toast((type === "income" ? "Income" : "Expense") + " of " + money(amount) + " added.");
  });

  /* ----- Delete a transaction (with undo) ----- */

  function deleteTx(id) {
    var index = -1;
    state.tx.forEach(function (t, i) { if (t.id === id) index = i; });
    if (index < 0) return;

    var removed = state.tx.splice(index, 1)[0];
    save();
    renderAll();

    toast("Transaction deleted.", {
      action: {
        label: "Undo",
        run: function () { state.tx.push(removed); save(); renderAll(); }
      }
    });
  }

  /* ----- Budget ----- */

  function openBudget(cat) {
    var chosen = cat || CATS.expense[0];
    $("budgetCategory").innerHTML = CATS.expense.map(function (c) {
      return '<option value="' + c + '"' + (c === chosen ? " selected" : "") + ">" + c + "</option>";
    }).join("");
    $("budgetLimit").value = state.budgets[chosen] || "";
    setErr("budgetLimit", "");
    openDialog($("budgetDialog"), "budgetLimit");
  }

  $("budgetCategory").addEventListener("change", function () {
    $("budgetLimit").value = state.budgets[this.value] || "";
    setErr("budgetLimit", "");
  });

  $("budgetForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var limit = parseAmount($("budgetLimit").value);

    if (limit === null) {
      setErr("budgetLimit", "Enter a monthly limit greater than 0.");
      $("budgetLimit").focus();
      return;
    }

    var cat = $("budgetCategory").value;
    state.budgets[cat] = limit;
    if (!save()) return;

    $("budgetDialog").close();
    renderAll();
    toast(cat + " budget set to " + money(limit) + ".");
  });

  /* ----- Goals ----- */

  function openGoal() {
    $("goalName").value = "";
    $("goalTarget").value = "";
    $("goalSaved").value = "";
    ["goalName", "goalTarget", "goalSaved"].forEach(function (id) { setErr(id, ""); });
    openDialog($("goalDialog"), "goalName");
  }

  $("goalForm").addEventListener("submit", function (event) {
    event.preventDefault();

    var name = $("goalName").value.trim();
    var target = parseAmount($("goalTarget").value);
    var savedText = $("goalSaved").value.trim();
    var saved = savedText === "" || /^0+(\.0+)?$/.test(savedText) ? 0 : parseAmount(savedText);
    var bad = null;

    setErr("goalName", name.length < 2 ? "Give your goal a name." : "");
    if (name.length < 2) bad = "goalName";

    setErr("goalTarget", target === null ? "Enter a target amount greater than 0." : "");
    if (target === null && !bad) bad = "goalTarget";

    var savedProblem = saved === null ? "Enter a valid amount, or leave it empty."
      : target !== null && saved > target ? "That's more than the target."
      : saved > Math.max(0, totals().balance) ? "You only have " + money(Math.max(0, totals().balance)) + " available to put aside."
      : "";
    setErr("goalSaved", savedProblem);
    if (savedProblem && !bad) bad = "goalSaved";

    if (bad) { $(bad).focus(); return; }

    state.goals.push({ id: uid(), name: name, target: target, saved: saved });
    if (!save()) { state.goals.pop(); return; }

    $("goalDialog").close();
    renderAll();
    toast("Goal “" + name + "” created.");
  });

  var fundingId = null;

  function openFund(id) {
    var g = state.goals.filter(function (x) { return x.id === id; })[0];
    if (!g) return;
    fundingId = id;
    $("fundTitle").textContent = g.name;
    $("fundInfo").textContent = money(g.saved) + " saved of " + money(g.target) + ". Available to add: " + money(Math.max(0, totals().balance)) + ".";
    document.querySelector('input[name="fundType"][value="add"]').checked = true;
    $("fundAmount").value = "";
    setErr("fundAmount", "");
    openDialog($("fundDialog"), "fundAmount");
  }

  $("fundForm").addEventListener("submit", function (event) {
    event.preventDefault();

    var g = state.goals.filter(function (x) { return x.id === fundingId; })[0];
    if (!g) return;

    var amount = parseAmount($("fundAmount").value);
    var type = selectedRadio("fundType");
    var available = Math.max(0, totals().balance);
    var problem = amount === null ? "Enter an amount greater than 0."
      : type === "add" && amount > available ? "You only have " + money(available) + " available."
      : type === "withdraw" && amount > g.saved ? "This goal only has " + money(g.saved) + " saved."
      : "";

    setErr("fundAmount", problem);
    if (problem) { $("fundAmount").focus(); return; }

    var before = g.saved;
    g.saved = round2(type === "add" ? g.saved + amount : g.saved - amount);
    if (!save()) { g.saved = before; return; }

    $("fundDialog").close();
    renderAll();
    toast((type === "add" ? "Added " : "Withdrew ") + money(amount) + (type === "add" ? " to " : " from ") + g.name + ".");
  });

  /* ----- Sample data and reset ----- */

  function buildSample() {
    var now = new Date();
    var factors = [0.92, 1.06, 0.97, 1.1, 1.0, 1.0]; // oldest month first
    var counter = 0;
    var tx = [];

    function add(type, category, note, amount, base, day) {
      tx.push({
        id: uid() + (counter++), type: type, amount: amount, category: category, note: note,
        date: isoDate(new Date(base.getFullYear(), base.getMonth(), day)), at: Date.now() + counter
      });
    }

    var spending = [
      [3, "Food", "Grocery Shopping", 1250], [9, "Food", "Restaurant", 1420], [15, "Food", "Groceries", 1800], [22, "Food", "Swiggy order", 640],
      [5, "Travel", "Metro card recharge", 800], [12, "Travel", "Cab rides", 1200], [24, "Travel", "Bus tickets", 450],
      [7, "Shopping", "Shoes", 2400], [18, "Shopping", "Amazon order", 2100],
      [4, "Bills", "Electricity Bill", 2800], [10, "Bills", "Mobile recharge", 599], [14, "Bills", "Internet", 700],
      [16, "Health", "Pharmacy", 450], [19, "Others", "Movie night", 600]
    ];

    for (var i = 5; i >= 0; i--) {
      var base = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var factor = factors[5 - i];
      var lastDay = i === 0 ? now.getDate() : 28;

      add("income", "Salary", "Salary", 55000, base, 1);
      if (i % 2 === 1 && lastDay >= 12) add("income", "Freelance", "Freelance project", 3500, base, 12);

      spending.forEach(function (e) {
        if (e[0] <= lastDay) add("expense", e[1], e[2], Math.round(e[3] * factor / 10) * 10, base, e[0]);
      });
    }

    return {
      tx: tx,
      budgets: { Food: 6000, Travel: 4500, Shopping: 5000, Bills: 4000, Health: 2000, Others: 3000 },
      goals: [
        { id: uid() + "a", name: "New Laptop", target: 60000, saved: 18000 },
        { id: uid() + "b", name: "Goa Trip", target: 25000, saved: 5500 }
      ],
      profile: state.profile
    };
  }

  function loadSample() {
    var hasData = state.tx.length || state.goals.length || Object.keys(state.budgets).length;
    var go = hasData
      ? confirmAction("Replace your data?", "Loading the sample data will replace everything you've entered so far.", "Replace")
      : Promise.resolve(true);

    go.then(function (ok) {
      if (!ok) return;
      state = buildSample();
      if (save()) { renderAll(); toast("Sample data loaded. Have a look around."); }
    });
  }

  $("sampleBtn1").addEventListener("click", loadSample);
  $("sampleBtn2").addEventListener("click", loadSample);

  $("clearBtn").addEventListener("click", function () {
    confirmAction("Delete all your data?", "This removes every transaction, budget and goal from this browser. It can't be undone.", "Delete everything").then(function (ok) {
      if (!ok) return;
      state = { tx: [], budgets: {}, goals: [], profile: state.profile };
      if (save()) { renderAll(); toast("All data deleted."); }
    });
  });

  $("profileForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var name = $("setName").value.trim();
    var problem = name.length < 2 ? "Enter at least 2 characters." : "";
    setErr("setName", problem);
    if (problem) { $("setName").focus(); return; }
    state.profile.name = name;
    if (save()) { renderHeader(); toast("Name updated."); }
  });

  /* ==========================================================
     5. NAVIGATION AND PAGE EVENTS
     ========================================================== */

  var VIEWS = ["dashboard", "transactions", "budgets", "goals", "analytics", "alerts", "reports", "settings"];
  var TITLES = { dashboard: "Dashboard", transactions: "Transactions", budgets: "Budgets", goals: "Savings Goals", analytics: "Analytics", alerts: "Alerts", reports: "Reports", settings: "Settings" };

  function hashView() {
    var name = window.location.hash.replace("#", "");
    return VIEWS.indexOf(name) >= 0 ? name : "dashboard";
  }

  function showView(name, focus) {
    ui.view = name;

    VIEWS.forEach(function (v) { $("view-" + v).hidden = v !== name; });

    Array.prototype.forEach.call(document.querySelectorAll(".nav-item[data-view]"), function (btn) {
      if (btn.getAttribute("data-view") === name) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    document.title = TITLES[name] + " | Budget Planner";
    window.scrollTo(0, 0);
    closeSidebar();
    closePops();

    if (focus) {
      var heading = document.querySelector("#view-" + name + " h1");
      if (heading) heading.focus({ preventScroll: true });
    }
  }

  function go(name) {
    if (window.location.hash === "#" + name) showView(name, true);
    else window.location.hash = "#" + name;
  }

  window.addEventListener("hashchange", function () { showView(hashView(), true); });

  /* ----- Sidebar (mobile) ----- */

  function openSidebar() {
    $("sidebar").classList.add("open");
    $("scrim").hidden = false;
    $("menuBtn").setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    $("sidebar").classList.remove("open");
    $("scrim").hidden = true;
    $("menuBtn").setAttribute("aria-expanded", "false");
  }

  $("menuBtn").addEventListener("click", openSidebar);
  $("scrim").addEventListener("click", closeSidebar);

  /* ----- Pop-overs (bell, user menu) ----- */

  function closePops() {
    [["bellBtn", "bellPop"], ["userBtn", "userPop"]].forEach(function (pair) {
      $(pair[1]).hidden = true;
      $(pair[0]).setAttribute("aria-expanded", "false");
    });
  }

  function togglePop(btnId, popId) {
    var pop = $(popId);
    var wasHidden = pop.hidden;
    closePops();
    pop.hidden = !wasHidden;
    $(btnId).setAttribute("aria-expanded", String(wasHidden));
  }

  $("bellBtn").addEventListener("click", function (e) { e.stopPropagation(); togglePop("bellBtn", "bellPop"); });
  $("userBtn").addEventListener("click", function (e) { e.stopPropagation(); togglePop("userBtn", "userPop"); });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".popwrap")) closePops();
  });

  /* ----- Buttons that live inside re-rendered lists (event delegation) ----- */

  document.addEventListener("click", function (event) {
    var t = event.target;
    var node;

    if ((node = t.closest("[data-view]"))) { go(node.getAttribute("data-view")); return; }
    if ((node = t.closest("[data-goto]"))) { go(node.getAttribute("data-goto")); return; }

    if ((node = t.closest("[data-open]"))) {
      var what = node.getAttribute("data-open");
      if (what === "income" || what === "expense") openTx(what);
      else if (what === "budget") openBudget();
      else if (what === "goal") openGoal();
      return;
    }

    if ((node = t.closest("[data-del]"))) { deleteTx(node.getAttribute("data-del")); return; }
    if ((node = t.closest("[data-budget-set]"))) { openBudget(node.getAttribute("data-budget-set")); return; }
    if ((node = t.closest("[data-fund]"))) { openFund(node.getAttribute("data-fund")); return; }

    if ((node = t.closest("[data-budget-remove]"))) {
      var cat = node.getAttribute("data-budget-remove");
      confirmAction("Remove the " + cat + " budget?", "Your " + cat + " transactions stay as they are. Only the monthly limit is removed.", "Remove").then(function (ok) {
        if (!ok) return;
        delete state.budgets[cat];
        save();
        renderAll();
        toast(cat + " budget removed.");
      });
      return;
    }

    if ((node = t.closest("[data-goal-del]"))) {
      var id = node.getAttribute("data-goal-del");
      var goal = state.goals.filter(function (g) { return g.id === id; })[0];
      if (!goal) return;
      confirmAction("Delete “" + goal.name + "”?", goal.saved > 0
        ? "The " + money(goal.saved) + " saved in this goal goes back to your available balance."
        : "This goal has nothing saved in it yet.", "Delete goal").then(function (ok) {
        if (!ok) return;
        state.goals = state.goals.filter(function (g) { return g.id !== id; });
        save();
        renderAll();
        toast("Goal deleted.");
      });
    }
  });

  /* ----- Donut hover ----- */

  function catFromEvent(e) {
    var n = e.target.closest && e.target.closest("[data-cat]");
    return n ? n.getAttribute("data-cat") : null;
  }

  ["donut", "legend"].forEach(function (id) {
    var box = $(id);
    box.addEventListener("mouseover", function (e) { var c = catFromEvent(e); if (c) highlightCategory(c); });
    box.addEventListener("mouseleave", resetDonutCenter);
  });

  /* ----- Transactions filters and search ----- */

  Array.prototype.forEach.call(document.querySelectorAll('input[name="typeFilter"]'), function (r) {
    r.addEventListener("change", function () { ui.type = selectedRadio("typeFilter"); renderTransactions(); });
  });

  $("catFilter").addEventListener("change", function () { ui.cat = this.value; renderTransactions(); });

  $("search").addEventListener("input", function () {
    ui.query = this.value;
    if (ui.view !== "transactions" && ui.query.trim()) go("transactions");
    renderTransactions();
  });

  $("clearQuery").addEventListener("click", function () {
    ui.query = "";
    $("search").value = "";
    renderTransactions();
  });

  /* ----- Reports ----- */

  $("reportMonth").addEventListener("change", renderReports);
  $("csvBtn").addEventListener("click", downloadCsv);
  $("printBtn").addEventListener("click", function () { window.print(); });

  /* ----- Logout ----- */

  function logout() { BPAuth.logout("../role.html"); }
  $("logoutBtn").addEventListener("click", logout);
  $("logoutBtn2").addEventListener("click", logout);

  /* ----- Keyboard ----- */

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { closePops(); closeSidebar(); }

    var tag = (event.target.tagName || "").toLowerCase();
    var typing = tag === "input" || tag === "textarea" || tag === "select";

    if (event.key === "/" && !typing && !document.querySelector("dialog[open]")) {
      event.preventDefault();
      $("search").focus();
    }
  });

  /* ----- Start ----- */

  hydrateIcons();
  renderSettings();
  renderAll();
  showView(hashView(), false);

  // Refresh the greeting and month if the tab stays open past midnight or a new month starts.
  setInterval(function () { renderHeader(); }, 60 * 1000);
})();