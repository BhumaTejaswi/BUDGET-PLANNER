/* ==========================================================
   Budget Planner: role.js
   Role selection page behaviour
   ========================================================== */

(function () {
  "use strict";

  var LEAVE_DELAY = 380; // ms, matches the page fade-out in role.css

  var cards = Array.prototype.slice.call(document.querySelectorAll(".role-card"));
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var navigating = false;

  /* ---------- If someone is already logged in, send them straight to their dashboard ---------- */

  function applySession() {
    var session = window.BPAuth ? window.BPAuth.getSession() : null;
    if (!session) return;

    cards.forEach(function (card) {
      if (card.dataset.role !== session.role) return;

      var link = card.querySelector("[data-go]");
      var badge = card.querySelector(".status");
      if (link && link.dataset.dashboard) link.setAttribute("href", link.dataset.dashboard);
      if (badge) badge.hidden = false;
    });
  }

  /* ---------- Navigate with a short fade ---------- */

  function goTo(role, url) {
    if (navigating) return;
    navigating = true;

    var card = document.querySelector('.role-card[data-role="' + role + '"]');
    if (card) card.classList.add("is-active");

    if (prefersReducedMotion) {
      window.location.href = url;
      return;
    }

    document.body.classList.add("leaving");
    window.setTimeout(function () {
      window.location.href = url;
    }, LEAVE_DELAY);
  }

  cards.forEach(function (card) {
    var link = card.querySelector("[data-go]");
    if (!link) return;

    link.addEventListener("click", function (event) {
      // Ctrl/Cmd/Shift-click and middle-click keep their normal "open in new tab" behaviour.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;

      event.preventDefault();
      goTo(card.dataset.role, link.getAttribute("href"));
    });
  });

  /* ---------- Keyboard shortcuts: U = User, A = Admin ---------- */

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    var key = event.key.toLowerCase();
    var role = key === "u" ? "user" : key === "a" ? "admin" : null;
    if (!role) return;

    var link = document.querySelector('[data-go="' + role + '"]');
    if (link) goTo(role, link.getAttribute("href"));
  });

  /* ---------- Back button: reset the page state ---------- */

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      navigating = false;
      document.body.classList.remove("leaving");
      cards.forEach(function (card) {
        card.classList.remove("is-active");
      });
      applySession();
    }
  });

  applySession();
})();