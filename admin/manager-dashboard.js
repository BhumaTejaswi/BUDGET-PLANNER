/* ==========================================================
   Budget Planner: admin/manager-dashboard.js

   Admin dashboard controller.

   Reads real accounts created through auth.js:
       localStorage -> "bp:accounts"

   No fake users are required.

   ========================================================== */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     1. PROTECT ADMIN DASHBOARD
     ---------------------------------------------------------- */

  var session = window.BPAuth
    ? window.BPAuth.requireRole("admin", "ad.html")
    : null;

  if (!session) return;


  /* ----------------------------------------------------------
     2. STORAGE
     ---------------------------------------------------------- */

  var ACCOUNTS_KEY = "bp:accounts";
  var CATEGORIES_KEY = "bp:categories";
  var AUDIT_KEY = "bp:adminAudit";
  var SETTINGS_KEY = "bp:adminSettings";


  function readJSON(key, fallback) {
    try {
      var value = localStorage.getItem(key);

      if (!value) return fallback;

      var parsed = JSON.parse(value);

      return parsed;
    } catch (error) {
      return fallback;
    }
  }


  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }


  function getAccounts() {
    var accounts = readJSON(ACCOUNTS_KEY, []);

    if (!Array.isArray(accounts)) {
      return [];
    }

    return accounts;
  }


  /* ----------------------------------------------------------
     3. HELPERS
     ---------------------------------------------------------- */

  function $(id) {
    return document.getElementById(id);
  }


  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function formatDate(timestamp) {
    if (!timestamp) return "—";

    var date = new Date(timestamp);

    if (isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }


  function formatDateTime(timestamp) {
    if (!timestamp) return "—";

    var date = new Date(timestamp);

    if (isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }


  function timeAgo(timestamp) {
    if (!timestamp) return "—";

    var diff = Date.now() - timestamp;

    if (diff < 0) return "Just now";

    var seconds = Math.floor(diff / 1000);

    if (seconds < 60) return "Just now";

    var minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return minutes + " min" + (minutes === 1 ? "" : "s") + " ago";
    }

    var hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
    }

    var days = Math.floor(hours / 24);

    if (days < 30) {
      return days + " day" + (days === 1 ? "" : "s") + " ago";
    }

    return formatDate(timestamp);
  }


  function initials(name, email) {
    var text = String(name || "").trim();

    if (!text) {
      text = String(email || "").split("@")[0];
    }

    var parts = text.split(/\s+/);

    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    }

    return text.substring(0, 2).toUpperCase();
  }


  function showToast(message) {
    var toast = $("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2800);
  }


  /* ----------------------------------------------------------
     4. SORT USERS
     ---------------------------------------------------------- */

  function newestFirst(accounts) {
    return accounts.slice().sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }


  /* ----------------------------------------------------------
     5. GREETING
     ---------------------------------------------------------- */

  function renderGreeting() {
    var greet = $("greet");
    var greetSub = $("greetSub");

    if (!greet) return;

    var hour = new Date().getHours();

    var greeting;

    if (hour < 12) {
      greeting = "Good morning";
    } else if (hour < 17) {
      greeting = "Good afternoon";
    } else {
      greeting = "Good evening";
    }

    greet.textContent = greeting + ", Admin";

    if (greetSub) {
      greetSub.textContent =
        "Here's what's happening across your Budget Planner.";
    }
  }


  /* ----------------------------------------------------------
     6. KPI CARDS
     ---------------------------------------------------------- */

  function renderKPIs(accounts) {
    var container = $("kpis");

    if (!container) return;

    var users = accounts.filter(function (account) {
      return account.role === "user";
    });

    var admins = accounts.filter(function (account) {
      return account.role === "admin";
    });

    var today = new Date();

    var todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();

    var todayUsers = users.filter(function (account) {
      return (account.createdAt || 0) >= todayStart;
    }).length;

    var thisMonth = users.filter(function (account) {
      var date = new Date(account.createdAt || 0);

      return (
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }).length;

    container.innerHTML = `
      <div class="kpi">
        <span class="kpi-label">Total users</span>
        <strong>${users.length}</strong>
        <small>${todayUsers} joined today</small>
      </div>

      <div class="kpi">
        <span class="kpi-label">New this month</span>
        <strong>${thisMonth}</strong>
        <small>User accounts created this month</small>
      </div>

      <div class="kpi">
        <span class="kpi-label">Admin accounts</span>
        <strong>${admins.length}</strong>
        <small>Accounts with admin access</small>
      </div>

      <div class="kpi">
        <span class="kpi-label">Total accounts</span>
        <strong>${accounts.length}</strong>
        <small>Users + admins</small>
      </div>
    `;
  }


  /* ----------------------------------------------------------
     7. RECENT USERS
     ---------------------------------------------------------- */

  function renderRecentUsers(accounts) {
    var tbody = $("recent");

    if (!tbody) return;

    var users = newestFirst(
      accounts.filter(function (account) {
        return account.role === "user";
      })
    ).slice(0, 6);

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty">
            No users have registered yet.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML = users.map(function (user) {
      return `
        <tr class="user-row" data-email="${escapeHTML(user.email)}">
          <td>
            <div class="user-cell">
              <div class="mini-av">
                ${escapeHTML(initials(user.name, user.email))}
              </div>
              <div>
                <strong>${escapeHTML(user.name || "Unnamed user")}</strong>
                <small>${escapeHTML(user.email)}</small>
              </div>
            </div>
          </td>

          <td>
            <span class="status-pill ok">Active</span>
          </td>

          <td>
            <span class="health">
              New
            </span>
          </td>

          <td class="hide-m">
            ${escapeHTML(formatDate(user.createdAt))}
          </td>
        </tr>
      `;
    }).join("");

    bindUserRows();
  }


  /* ----------------------------------------------------------
     8. ALL USERS
     ---------------------------------------------------------- */

  var currentUserSort = "new";
  var currentUserFilter = "all";


  function getFilteredUsers(accounts) {
    var users = accounts.filter(function (account) {
      return account.role === "user";
    });

    if (currentUserFilter === "recent") {
      var day = Date.now() - 7 * 24 * 60 * 60 * 1000;

      users = users.filter(function (user) {
        return (user.createdAt || 0) >= day;
      });
    }

    if (currentUserFilter === "admin") {
      return accounts.filter(function (account) {
        return account.role === "admin";
      });
    }

    if (currentUserSort === "name") {
      users.sort(function (a, b) {
        return String(a.name || "").localeCompare(
          String(b.name || "")
        );
      });
    } else {
      users.sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    }

    return users;
  }


  function renderUsers(accounts) {
    var tbody = $("allUsers");

    if (!tbody) return;

    var users = getFilteredUsers(accounts);

    var note = $("filterNote");

    if (note) {
      note.textContent =
        users.length +
        " account" +
        (users.length === 1 ? "" : "s") +
        " found";
    }

    var sub = $("usersSub");

    if (sub) {
      sub.textContent =
        "Accounts currently stored in this Budget Planner browser.";
    }

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty">
            No accounts match the current filter.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML = users.map(function (user) {
      var roleLabel =
        user.role === "admin" ? "Admin" : "User";

      return `
        <tr class="user-row" data-email="${escapeHTML(user.email)}">

          <td>
            <div class="user-cell">
              <div class="mini-av">
                ${escapeHTML(initials(user.name, user.email))}
              </div>

              <div>
                <strong>
                  ${escapeHTML(user.name || "Unnamed")}
                </strong>

                <small>
                  ${escapeHTML(user.email)}
                </small>
              </div>
            </div>
          </td>

          <td>
            <span class="status-pill ok">
              ${roleLabel}
            </span>
          </td>

          <td class="hide-m">
            —
          </td>

          <td>
            <span class="health">
              New account
            </span>
          </td>

          <td class="hide-m">
            ${escapeHTML(formatDate(user.createdAt))}
          </td>

          <td class="hide-m">
            ${escapeHTML(timeAgo(user.createdAt))}
          </td>

        </tr>
      `;
    }).join("");

    bindUserRows();
  }


  /* ----------------------------------------------------------
     9. USER FILTER CHIPS
     ---------------------------------------------------------- */

  function renderUserChips(accounts) {
    var container = $("userChips");

    if (!container) return;

    var users = accounts.filter(function (a) {
      return a.role === "user";
    }).length;

    var admins = accounts.filter(function (a) {
      return a.role === "admin";
    }).length;

    container.innerHTML = `
      <button class="chip ${currentUserFilter === "all" ? "active" : ""}" data-user-filter="all">
        All (${accounts.length})
      </button>

      <button class="chip ${currentUserFilter === "recent" ? "active" : ""}" data-user-filter="recent">
        Recent
      </button>

      <button class="chip ${currentUserFilter === "admin" ? "active" : ""}" data-user-filter="admin">
        Admins (${admins})
      </button>

      <button class="chip ${currentUserFilter === "users" ? "active" : ""}" data-user-filter="users">
        Users (${users})
      </button>
    `;

    container.querySelectorAll("[data-user-filter]").forEach(function (button) {
      button.addEventListener("click", function () {
        var filter = button.dataset.userFilter;

        if (filter === "users") {
          currentUserFilter = "all";
        } else {
          currentUserFilter = filter;
        }

        renderUserChips(getAccounts());
        renderUsers(getAccounts());
      });
    });
  }


  /* ----------------------------------------------------------
     10. USER SEARCH
     ---------------------------------------------------------- */

  function searchUsers(accounts, query) {
    var tbody = $("allUsers");

    if (!tbody) return;

    query = String(query || "").trim().toLowerCase();

    var users = accounts.filter(function (account) {
      return account.role === "user";
    });

    if (!query) {
      renderUsers(accounts);
      return;
    }

    users = users.filter(function (user) {
      return (
        String(user.name || "").toLowerCase().includes(query) ||
        String(user.email || "").toLowerCase().includes(query)
      );
    });

    tbody.innerHTML = users.length
      ? users.map(function (user) {
          return `
            <tr class="user-row" data-email="${escapeHTML(user.email)}">
              <td>
                <div class="user-cell">
                  <div class="mini-av">
                    ${escapeHTML(initials(user.name, user.email))}
                  </div>

                  <div>
                    <strong>${escapeHTML(user.name || "Unnamed")}</strong>
                    <small>${escapeHTML(user.email)}</small>
                  </div>
                </div>
              </td>

              <td>
                <span class="status-pill ok">User</span>
              </td>

              <td class="hide-m">—</td>

              <td>
                <span class="health">New account</span>
              </td>

              <td class="hide-m">
                ${escapeHTML(formatDate(user.createdAt))}
              </td>

              <td class="hide-m">
                ${escapeHTML(timeAgo(user.createdAt))}
              </td>
            </tr>
          `;
        }).join("")
      : `
          <tr>
            <td colspan="6" class="empty">
              No user found for "${escapeHTML(query)}".
            </td>
          </tr>
        `;

    bindUserRows();
  }


  /* ----------------------------------------------------------
     11. USER DRAWER
     ---------------------------------------------------------- */

  function bindUserRows() {
    document.querySelectorAll(".user-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var email = row.dataset.email;

        var account = getAccounts().find(function (item) {
          return item.email === email;
        });

        if (account) {
          openUserDrawer(account);
        }
      });
    });
  }


  function openUserDrawer(account) {
    var drawer = $("drawer");
    var scrim = $("scrim");

    if (!drawer) return;

    drawer.innerHTML = `
      <div class="drawer-head">
        <div>
          <span class="cap">Account details</span>
          <h2 id="dTitle">
            ${escapeHTML(account.name || "Unnamed user")}
          </h2>
        </div>

        <button class="round" id="closeDrawer" aria-label="Close">
          ×
        </button>
      </div>

      <div class="drawer-body">

        <div class="drawer-avatar">
          ${escapeHTML(initials(account.name, account.email))}
        </div>

        <div class="drawer-field">
          <span>Name</span>
          <strong>${escapeHTML(account.name || "—")}</strong>
        </div>

        <div class="drawer-field">
          <span>Email</span>
          <strong>${escapeHTML(account.email)}</strong>
        </div>

        <div class="drawer-field">
          <span>Account type</span>
          <strong>${escapeHTML(account.role)}</strong>
        </div>

        <div class="drawer-field">
          <span>Joined</span>
          <strong>${escapeHTML(formatDateTime(account.createdAt))}</strong>
        </div>

        <div class="drawer-note">
          Password information is not displayed here.
          This dashboard only reads the account metadata stored by
          the authentication system.
        </div>

      </div>
    `;

    drawer.classList.add("open");

    if (scrim) {
      scrim.classList.add("show");
    }

    var close = $("closeDrawer");

    if (close) {
      close.addEventListener("click", closeDrawer);
    }

    drawer.focus();
  }


  function closeDrawer() {
    var drawer = $("drawer");
    var scrim = $("scrim");

    if (drawer) drawer.classList.remove("open");
    if (scrim) scrim.classList.remove("show");
  }


  /* ----------------------------------------------------------
     12. NAVIGATION
     ---------------------------------------------------------- */

  function showView(viewName) {
    document.querySelectorAll(".view").forEach(function (view) {
      view.hidden = true;
    });

    var target = $("v-" + viewName);

    if (target) {
      target.hidden = false;
    }

    document.querySelectorAll(".nav[data-view]").forEach(function (button) {
      var active = button.dataset.view === viewName;

      button.classList.toggle("active", active);

      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }


  function setupNavigation() {
    document.querySelectorAll("[data-view]").forEach(function (element) {
      element.addEventListener("click", function () {
        var view = element.dataset.view;

        if (view) {
          showView(view);
        }
      });
    });
  }


  /* ----------------------------------------------------------
     13. SPENDING CALENDAR
     ---------------------------------------------------------- */

  function renderHeatmap(accounts) {
    var heat = $("heat");

    if (!heat) return;

    heat.innerHTML = "";

    /*
      There is no spending database yet because your current
      auth system only stores account information.

      So we show an empty calendar rather than fake spending.
    */

    for (var i = 0; i < 98; i++) {
      var cell = document.createElement("span");

      cell.className = "heat-cell";

      cell.style.opacity = "0.22";

      heat.appendChild(cell);
    }

    var facts = $("heatFacts");

    if (facts) {
      facts.innerHTML = `
        <span>
          <strong>${accounts.length}</strong>
          accounts
        </span>
        <span>
          Spending data will appear when the expense module is connected.
        </span>
      `;
    }
  }


  /* ----------------------------------------------------------
     14. SIGN-UP BARS
     ---------------------------------------------------------- */

  function renderSignups(accounts) {
    var container = $("signups");
    var caption = $("signCap");

    if (!container) return;

    var now = new Date();

    var months = [];

    for (var i = 5; i >= 0; i--) {
      var date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      months.push(date);
    }

    var counts = months.map(function (month) {
      return accounts.filter(function (account) {
        var created = new Date(account.createdAt || 0);

        return (
          created.getMonth() === month.getMonth() &&
          created.getFullYear() === month.getFullYear() &&
          account.role === "user"
        );
      }).length;
    });

    var max = Math.max.apply(null, counts.concat([1]));

    container.innerHTML = months.map(function (month, index) {
      var height = Math.max(
        8,
        (counts[index] / max) * 100
      );

      return `
        <div class="bar-col">
          <div class="bar-value">${counts[index]}</div>
          <div class="bar" style="height:${height}%"></div>
          <span>
            ${month.toLocaleDateString("en-IN", { month: "short" })}
          </span>
        </div>
      `;
    }).join("");

    if (caption) {
      caption.textContent =
        "User registrations over the last six months.";
    }
  }


  /* ----------------------------------------------------------
     15. SAVINGS GOAL DONUT
     ---------------------------------------------------------- */

  function renderGoals() {
    var ring = $("ring");
    var legend = $("ringLeg");

    if (!ring) return;

    /*
      Goals are not stored by the current authentication system.
      Therefore we don't invent financial data.
    */

    ring.innerHTML = `
      <circle
        cx="75"
        cy="75"
        r="52"
        fill="none"
        stroke="var(--line)"
        stroke-width="16"
      />

      <circle
        cx="75"
        cy="75"
        r="52"
        fill="none"
        stroke="var(--violet)"
        stroke-width="16"
        stroke-dasharray="0 327"
        stroke-linecap="round"
        transform="rotate(-90 75 75)"
      />

      <text
        x="75"
        y="72"
        text-anchor="middle"
        font-size="20"
        font-weight="700"
        fill="currentColor"
      >
        0%
      </text>

      <text
        x="75"
        y="91"
        text-anchor="middle"
        font-size="11"
        fill="var(--muted)"
      >
        goals
      </text>
    `;

    if (legend) {
      legend.innerHTML = `
        <span>No savings goal data yet.</span>
        <span>Connect the Savings Goals module to populate this chart.</span>
      `;
    }
  }


  /* ----------------------------------------------------------
     16. BUDGET BREACH
     ---------------------------------------------------------- */

  function renderBreaches() {
    var container = $("breach");

    if (!container) return;

    container.innerHTML = `
      <div class="empty-block">
        <strong>No budget data yet</strong>
        <span>
          Overspending information will appear after the
          Expenses module is connected.
        </span>
      </div>
    `;
  }


  /* ----------------------------------------------------------
     17. LIVE ACTIVITY
     ---------------------------------------------------------- */

  function renderFeed(accounts) {
    var feed = $("feed");

    if (!feed) return;

    var recent = newestFirst(accounts).slice(0, 6);

    if (recent.length === 0) {
      feed.innerHTML = `
        <li>
          <strong>No activity yet</strong>
          <span>New account activity will appear here.</span>
        </li>
      `;

      return;
    }

    feed.innerHTML = recent.map(function (account) {
      return `
        <li>
          <div class="feed-dot"></div>

          <div>
            <strong>
              ${escapeHTML(account.name || account.email)}
            </strong>

            <span>
              Created a ${escapeHTML(account.role)} account
              · ${escapeHTML(timeAgo(account.createdAt))}
            </span>
          </div>
        </li>
      `;
    }).join("");
  }


  /* ----------------------------------------------------------
     18. ALERTS
     ---------------------------------------------------------- */

  function renderAlerts(accounts) {
    var list = $("alertList");
    var badge = $("navBadge");

    if (!list) return;

    /*
      We only create a real alert when something meaningful
      exists in the current account data.
    */

    var users = accounts.filter(function (account) {
      return account.role === "user";
    });

    if (badge) {
      badge.textContent = users.length;
      badge.hidden = users.length === 0;
    }

    if (users.length === 0) {
      list.innerHTML = `
        <div class="panel">
          <h3>No alerts</h3>
          <p class="cap">
            There are no user-related alerts right now.
          </p>
        </div>
      `;

      return;
    }

    var newest = newestFirst(users)[0];

    list.innerHTML = `
      <div class="panel alert-card">
        <div>
          <span class="cap">New account</span>
          <h3>
            ${escapeHTML(newest.name || newest.email)}
            created a user account.
          </h3>
          <p class="cap">
            Registered ${escapeHTML(timeAgo(newest.createdAt))}.
          </p>
        </div>
      </div>
    `;
  }


  /* ----------------------------------------------------------
     19. CATEGORIES
     ---------------------------------------------------------- */

  function getCategories() {
    return readJSON(CATEGORIES_KEY, [
      { name: "Food", cap: 5000 },
      { name: "Transport", cap: 3000 },
      { name: "Shopping", cap: 4000 },
      { name: "Bills", cap: 6000 }
    ]);
  }


  function renderCategories() {
    var container = $("catList");

    if (!container) return;

    var categories = getCategories();

    container.innerHTML = `
      <h3>Current categories</h3>
      <p class="cap">
        Default categories available to users.
      </p>

      <div class="category-list">
        ${categories.map(function (category) {
          return `
            <div class="category-row">
              <strong>${escapeHTML(category.name)}</strong>
              <span>₹${Number(category.cap || 0).toLocaleString("en-IN")}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }


  function addCategory() {
    var nameInput = $("newName");
    var capInput = $("newCap");
    var error = $("catErr");

    if (!nameInput || !capInput) return;

    var name = nameInput.value.trim();
    var cap = Number(capInput.value);

    if (!name) {
      if (error) error.textContent = "Enter a category name.";
      return;
    }

    if (isNaN(cap) || cap < 0) {
      if (error) error.textContent = "Enter a valid monthly cap.";
      return;
    }

    var categories = getCategories();

    var exists = categories.some(function (category) {
      return category.name.toLowerCase() === name.toLowerCase();
    });

    if (exists) {
      if (error) error.textContent = "That category already exists.";
      return;
    }

    categories.push({
      name: name,
      cap: cap
    });

    if (writeJSON(CATEGORIES_KEY, categories)) {
      nameInput.value = "";
      capInput.value = "";

      if (error) error.textContent = "";

      renderCategories();

      showToast("Category added.");
    }
  }


  /* ----------------------------------------------------------
     20. SYSTEM
     ---------------------------------------------------------- */

  function renderSystem() {
    var tiles = $("tiles");

    if (tiles) {
      tiles.innerHTML = `
        <div class="tile">
          <span>Authentication</span>
          <strong>Online</strong>
        </div>

        <div class="tile">
          <span>Storage</span>
          <strong>Local</strong>
        </div>

        <div class="tile">
          <span>Accounts</span>
          <strong>Connected</strong>
        </div>

        <div class="tile">
          <span>Dashboard</span>
          <strong>Running</strong>
        </div>
      `;
    }

    var flags = $("flags");

    if (flags) {
      flags.innerHTML = `
        <label class="switch-row">
          <span>Account registration</span>
          <input type="checkbox" checked id="flagRegistration">
        </label>

        <label class="switch-row">
          <span>Admin dashboard</span>
          <input type="checkbox" checked id="flagDashboard">
        </label>
      `;
    }

    renderAudit();
  }


  /* ----------------------------------------------------------
     21. AUDIT LOG
     ---------------------------------------------------------- */

  function getAudit() {
    var data = readJSON(AUDIT_KEY, []);

    return Array.isArray(data) ? data : [];
  }


  function saveAudit(action) {
    var logs = getAudit();

    logs.unshift({
      action: action,
      at: Date.now()
    });

    writeJSON(
      AUDIT_KEY,
      logs.slice(0, 50)
    );
  }


  function renderAudit() {
    var container = $("audit");

    if (!container) return;

    var logs = getAudit();

    if (logs.length === 0) {
      container.innerHTML = `
        <li>
          <strong>Dashboard opened</strong>
          <span>${formatDateTime(Date.now())}</span>
        </li>
      `;

      return;
    }

    container.innerHTML = logs.map(function (log) {
      return `
        <li>
          <strong>${escapeHTML(log.action)}</strong>
          <span>${escapeHTML(formatDateTime(log.at))}</span>
        </li>
      `;
    }).join("");
  }


  /* ----------------------------------------------------------
     22. THEME
     ---------------------------------------------------------- */

  function setupTheme() {
    var button = $("themeBtn");

    if (!button) return;

    button.addEventListener("click", function () {
      document.documentElement.classList.toggle("dark");

      var dark = document.documentElement.classList.contains("dark");

      localStorage.setItem(
        "bp:adminTheme",
        dark ? "dark" : "light"
      );

      showToast(
        dark
          ? "Dark mode enabled."
          : "Light mode enabled."
      );
    });

    if (localStorage.getItem("bp:adminTheme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  }


  /* ----------------------------------------------------------
     23. SEARCH
     ---------------------------------------------------------- */

  function setupSearch() {
    var input = $("q");

    if (!input) return;

    input.addEventListener("input", function () {
      searchUsers(getAccounts(), input.value);
    });

    document.addEventListener("keydown", function (event) {
      if (
        event.key === "/" &&
        document.activeElement !== input &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement.tagName
        )
      ) {
        event.preventDefault();
        input.focus();
      }
    });
  }


  /* ----------------------------------------------------------
     24. COPY SUMMARY
     ---------------------------------------------------------- */

  function copySummary() {
    var accounts = getAccounts();

    var users = accounts.filter(function (account) {
      return account.role === "user";
    }).length;

    var admins = accounts.filter(function (account) {
      return account.role === "admin";
    }).length;

    var text =
      "Budget Planner Admin Summary\n" +
      "----------------------------\n" +
      "Total accounts: " + accounts.length + "\n" +
      "Users: " + users + "\n" +
      "Admins: " + admins + "\n" +
      "Generated: " + formatDateTime(Date.now());

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(function () {
          showToast("Summary copied.");
        })
        .catch(function () {
          showToast("Could not copy summary.");
        });
    } else {
      showToast("Clipboard is not available.");
    }
  }


  /* ----------------------------------------------------------
     25. LOGOUT
     ---------------------------------------------------------- */

  function setupLogout() {
    document.querySelectorAll('[data-act="logout"]').forEach(function (button) {
      button.addEventListener("click", function () {

        saveAudit("Admin logged out");

        if (window.BPAuth) {
          window.BPAuth.logout("ad.html");
        } else {
          window.location.href = "ad.html";
        }
      });
    });
  }


  /* ----------------------------------------------------------
     26. ACTION BUTTONS
     ---------------------------------------------------------- */

  function setupActions() {

    document.querySelectorAll('[data-act="copySummary"]').forEach(function (button) {
      button.addEventListener("click", copySummary);
    });


    document.querySelectorAll('[data-act="addCat"]').forEach(function (button) {
      button.addEventListener("click", addCategory);
    });


    var scrim = $("scrim");

    if (scrim) {
      scrim.addEventListener("click", closeDrawer);
    }


    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeDrawer();
      }
    });


    var sort = $("sort");

    if (sort) {
      sort.addEventListener("change", function () {
        currentUserSort = sort.value;
        renderUsers(getAccounts());
      });
    }


    document.querySelectorAll("[data-period]").forEach(function (button) {
      button.addEventListener("click", function () {

        document.querySelectorAll("[data-period]").forEach(function (item) {
          item.setAttribute(
            "aria-pressed",
            item === button ? "true" : "false"
          );
        });

        showToast(
          "Showing " +
          button.textContent.trim() +
          " view."
        );
      });
    });
  }


  /* ----------------------------------------------------------
     27. REFRESH ALL DATA
     ---------------------------------------------------------- */

  function renderDashboard() {

    var accounts = getAccounts();

    renderGreeting();

    renderKPIs(accounts);

    renderRecentUsers(accounts);

    renderUsers(accounts);

    renderUserChips(accounts);

    renderHeatmap(accounts);

    renderSignups(accounts);

    renderGoals();

    renderBreaches();

    renderFeed(accounts);

    renderAlerts(accounts);

    renderCategories();

    renderSystem();
  }


  /* ----------------------------------------------------------
     28. DETECT NEW USERS
     ---------------------------------------------------------- */

  var lastAccountCount = getAccounts().length;

  window.addEventListener("storage", function (event) {

    if (event.key !== ACCOUNTS_KEY) return;

    var accounts = getAccounts();

    renderDashboard();

    if (accounts.length > lastAccountCount) {
      showToast("A new account was created.");
    }

    lastAccountCount = accounts.length;
  });


  /* ----------------------------------------------------------
     29. INITIALIZE
     ---------------------------------------------------------- */

  setupNavigation();

  setupTheme();

  setupSearch();

  setupActions();

  setupLogout();

  renderDashboard();

  saveAudit("Admin dashboard opened");

  console.log(
    "Budget Planner Admin Dashboard loaded.",
    getAccounts()
  );

})();