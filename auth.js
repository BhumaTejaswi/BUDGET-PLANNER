/* ==========================================================
   Budget Planner: auth.js  (shared by every page)

   People create their own account (Sign up) and then log in with
   the email and password they chose.

   - initAuth(config)   runs a login + sign-up page (user/login.js, admin/ad.js)
   - requireRole(role)  blocks a dashboard unless that role is logged in
   - getSession()       returns { role, email, name, at } or null
   - logout(url)        clears the session and leaves

   HOW ACCOUNTS ARE STORED
   There is no server yet, so accounts are saved in this browser's
   localStorage. Passwords are never saved as text: each one is
   salted and hashed with PBKDF2 (SHA-256, 150,000 rounds).

   ========================================================== */

(function (global) {
  "use strict";

  var SESSION_KEY = "bp:session";
  var ACCOUNTS_KEY = "bp:accounts";
  var LAST_ROLE_KEY = "bp:lastRole";
  var MAX_SESSION_AGE = 12 * 60 * 60 * 1000; // 12 hours
  var MAX_ATTEMPTS = 5;                      // wrong tries before a lock
  var LOCK_MS = 30 * 1000;                   // lock length
  var ITERATIONS = 150000;                   // PBKDF2 rounds
  var DUMMY_SALT = "00000000000000000000000000000000";
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- Storage helpers (wrapped: storage can be blocked) ---------- */

  function read(store, key) {
    try { return store.getItem(key); } catch (err) { return null; }
  }

  function write(store, key, value) {
    try { store.setItem(key, value); return true; } catch (err) { return false; }
  }

  function remove(store, key) {
    try { store.removeItem(key); } catch (err) { /* ignore */ }
  }

  /* ---------- Session ---------- */

  function clearSession() {
    remove(sessionStorage, SESSION_KEY);
    remove(localStorage, SESSION_KEY);
  }

  function getSession() {
    var raw = read(sessionStorage, SESSION_KEY) || read(localStorage, SESSION_KEY);
    if (!raw) return null;

    try {
      var s = JSON.parse(raw);
      if (!s || !s.role || !s.email || typeof s.at !== "number") return null;
      if (Date.now() - s.at > MAX_SESSION_AGE) {
        clearSession();
        return null;
      }
      return s;
    } catch (err) {
      return null;
    }
  }

  function saveSession(role, email, name, keep) {
    var data = JSON.stringify({ role: role, email: email, name: name || "", at: Date.now() });
    clearSession();
    write(keep ? localStorage : sessionStorage, SESSION_KEY, data);
    write(localStorage, LAST_ROLE_KEY, role);
  }

  /* Call this at the very top of a dashboard page. */
  function requireRole(role, loginUrl) {
    var root = document.documentElement;
    root.style.visibility = "hidden"; // no flash of protected content

    var session = getSession();
    if (session && session.role === role) {
      root.style.visibility = "";
    } else {
      window.location.replace(loginUrl);
      return null;
    }

    // Back button after logout must not reveal the page from cache.
    window.addEventListener("pageshow", function (event) {
      if (event.persisted) {
        var again = getSession();
        if (!again || again.role !== role) window.location.replace(loginUrl);
      }
    });

    return session;
  }

  function logout(redirectUrl) {
    clearSession();
    window.location.replace(redirectUrl);
  }

  /* ---------- Crypto helpers ---------- */

  function subtle() {
    if (!global.crypto || !global.crypto.subtle) throw new Error("no-crypto");
    return global.crypto.subtle;
  }

  function toHex(bytes) {
    return Array.prototype.map.call(bytes, function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  function fromHex(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  function randomHex(byteCount) {
    return toHex(global.crypto.getRandomValues(new Uint8Array(byteCount)));
  }

  function sha256Hex(text) {
    try {
      return subtle().digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
        return toHex(new Uint8Array(buf));
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Slow, salted hash for passwords.
  function deriveHash(password, saltHex, iterations) {
    try {
      var s = subtle();
      return s
        .importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"])
        .then(function (key) {
          return s.deriveBits(
            { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations: iterations },
            key,
            256
          );
        })
        .then(function (bits) { return toHex(new Uint8Array(bits)); });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function safeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  /* ---------- Accounts ---------- */

  function loadAccounts() {
    try {
      var list = JSON.parse(read(localStorage, ACCOUNTS_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function findAccount(role, email) {
    var wanted = String(email).trim().toLowerCase();
    var list = loadAccounts();
    for (var i = 0; i < list.length; i++) {
      if (list[i].role === role && list[i].email === wanted) return list[i];
    }
    return null;
  }

  // Resolves { ok: true } or { ok: false, reason: "exists" | "storage" }.
  function createAccount(info) {
    var email = String(info.email).trim().toLowerCase();
    if (findAccount(info.role, email)) return Promise.resolve({ ok: false, reason: "exists" });

    var salt = randomHex(16);
    return deriveHash(info.password, salt, ITERATIONS).then(function (hash) {
      if (findAccount(info.role, email)) return { ok: false, reason: "exists" };

      var list = loadAccounts();
      list.push({
        role: info.role,
        name: String(info.name).trim(),
        email: email,
        salt: salt,
        hash: hash,
        iterations: ITERATIONS,
        createdAt: Date.now()
      });
      return write(localStorage, ACCOUNTS_KEY, JSON.stringify(list))
        ? { ok: true }
        : { ok: false, reason: "storage" };
    });
  }

  // Resolves the account if email + password match for that role, otherwise null.
  function verifyAccount(role, email, password) {
    var account = findAccount(role, email);
    if (!account) {
      // Do the same amount of work so a missing account isn't obvious from timing.
      return deriveHash(password, DUMMY_SALT, ITERATIONS).then(function () { return null; });
    }
    return deriveHash(password, account.salt, account.iterations || ITERATIONS).then(function (hash) {
      return safeEqual(hash, account.hash) ? account : null;
    });
  }

  /* ---------- Attempt limiting ---------- */

  function failKey(role) { return "bp:fail:" + role; }

  function readFails(role) {
    try {
      var v = JSON.parse(read(sessionStorage, failKey(role)));
      if (v && typeof v.count === "number" && typeof v.until === "number") return v;
    } catch (err) { /* fall through */ }
    return { count: 0, until: 0 };
  }

  function writeFails(role, value) {
    write(sessionStorage, failKey(role), JSON.stringify(value));
  }

  /* ---------- Validation rules ---------- */

  function emailProblem(value) {
    if (!value.trim()) return "Enter your email address.";
    if (!EMAIL_PATTERN.test(value.trim())) return "Enter a valid email, like name@example.com.";
    return "";
  }

  function newPasswordProblem(value) {
    if (!value) return "Create a password.";
    if (value.length < 8) return "Use at least 8 characters.";
    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Include at least one letter and one number.";
    return "";
  }

  /* ---------- Page controller (login + sign up) ---------- */

  function initAuth(config) {
    var role = config.role;

    function $(id) { return document.getElementById(id); }

    var loginForm = $("loginForm");
    var signupForm = $("signupForm");
    var loginError = $("formError");
    var signupError = $("signupError");
    var loginSubmit = $("submit");
    var signupSubmit = $("sSubmit");
    var toastEl = $("toast");
    var sprout = document.querySelector(".sprout");

    var loginEmail = $("email");
    var loginPassword = $("password");
    var remember = $("remember");

    var sName = $("sName");
    var sEmail = $("sEmail");
    var sPassword = $("sPassword");
    var sConfirm = $("sConfirm");
    var sCode = $("sCode"); // only on the admin page

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var mode = "login";
    var busy = false;
    var locked = false;
    var toastTimer = null;
    var lockTimer = null;

    /* Already logged in for this role? Skip the form. */
    var existing = getSession();
    if (existing && existing.role === role) {
      window.location.replace(config.redirect);
      return;
    }

    /* ----- small helpers ----- */

    function showToast(message) {
      toastEl.textContent = message;
      toastEl.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3600);
    }

    function activeError() { return mode === "login" ? loginError : signupError; }

    function showFormError(message) {
      var el = activeError();
      el.textContent = message;
      el.hidden = false;
    }

    function hideFormErrors() {
      loginError.hidden = true;
      signupError.hidden = true;
    }

    function setFieldState(input, message) {
      var field = input.closest(".field");
      var errorEl = $(input.id + "Error");
      if (message) {
        field.classList.add("invalid");
        input.setAttribute("aria-invalid", "true");
        errorEl.textContent = message;
        errorEl.hidden = false;
      } else {
        field.classList.remove("invalid");
        input.removeAttribute("aria-invalid");
        errorEl.hidden = true;
      }
    }

    function refreshSubmits() {
      loginSubmit.disabled = busy || locked;
      signupSubmit.disabled = busy || locked;
    }

    function setBusy(state, which) {
      busy = state;
      refreshSubmits();
      var button = which === "signup" ? signupSubmit : loginSubmit;
      var label = button.querySelector(".submit-label");
      if (which === "signup") {
        label.textContent = state ? "Creating account…" : "Create account";
      } else {
        label.textContent = state ? "Logging in…" : "Login";
      }
    }

    /* ----- coin jar ----- */

    function setRow(row, on) {
      var coins = document.querySelectorAll('.coin[data-row="' + row + '"]');
      Array.prototype.forEach.call(coins, function (coin) {
        coin.classList.toggle("in", on);
      });
    }

    function updateJar() {
      if (mode === "login") {
        setRow(2, !emailProblem(loginEmail.value));
        setRow(3, loginPassword.value.length > 0);
      } else {
        setRow(2, !emailProblem(sEmail.value));
        setRow(3, !newPasswordProblem(sPassword.value));
      }
    }

    /* ----- field validation ----- */

    // Validates as you type (after the first blur) and returns a "check now" function.
    function bind(input, validate, extra) {
      function run() {
        var message = validate();
        setFieldState(input, message);
        return !message;
      }

      input.addEventListener("input", function () {
        if (!locked) hideFormErrors();
        if (input.dataset.touched) run();
        if (extra) extra();
        updateJar();
      });

      input.addEventListener("blur", function () {
        input.dataset.touched = "1";
        run();
      });

      return function () {
        input.dataset.touched = "1";
        return run();
      };
    }

    function confirmProblem() {
      if (!sConfirm.value) return "Confirm your password.";
      if (sConfirm.value !== sPassword.value) return "Passwords don't match.";
      return "";
    }

    var checkLoginEmail = bind(loginEmail, function () { return emailProblem(loginEmail.value); });
    var checkLoginPassword = bind(loginPassword, function () {
      return loginPassword.value ? "" : "Enter your password.";
    });

    var checkName = bind(sName, function () {
      return sName.value.trim().length < 2 ? "Enter your full name." : "";
    });
    var checkSEmail = bind(sEmail, function () { return emailProblem(sEmail.value); });
    var checkSPassword = bind(
      sPassword,
      function () { return newPasswordProblem(sPassword.value); },
      function () { if (sConfirm.dataset.touched) setFieldState(sConfirm, confirmProblem()); }
    );
    var checkConfirm = bind(sConfirm, confirmProblem);
    var checkCode = sCode
      ? bind(sCode, function () { return sCode.value.trim() ? "" : "Enter the admin access code."; })
      : null;

    /* ----- show / hide password ----- */

    function wireToggle(button, inputs) {
      button.addEventListener("click", function () {
        var showing = inputs[0].type === "text";
        inputs.forEach(function (input) { input.type = showing ? "password" : "text"; });
        button.textContent = showing ? "Show" : "Hide";
        button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
        button.setAttribute("aria-pressed", String(!showing));
        inputs[0].focus();
      });
    }

    wireToggle($("toggle"), [loginPassword]);
    wireToggle($("sToggle"), [sPassword, sConfirm]);

    /* ----- lock after too many wrong attempts ----- */

    function startLock(until) {
      locked = true;
      refreshSubmits();
      clearInterval(lockTimer);

      function tick() {
        var left = Math.ceil((until - Date.now()) / 1000);
        if (left <= 0) {
          clearInterval(lockTimer);
          locked = false;
          refreshSubmits();
          hideFormErrors();
          return;
        }
        showFormError("Too many attempts. Try again in " + left + " second" + (left === 1 ? "" : "s") + ".");
      }

      tick();
      lockTimer = setInterval(tick, 1000);
    }

    // Returns how many tries are left, or 0 if this failure triggered a lock.
    function registerFailure() {
      var fails = readFails(role);
      fails.count += 1;

      if (fails.count >= MAX_ATTEMPTS) {
        fails.count = 0;
        fails.until = Date.now() + LOCK_MS;
        writeFails(role, fails);
        startLock(fails.until);
        return 0;
      }

      writeFails(role, fails);
      return MAX_ATTEMPTS - fails.count;
    }

    function attemptsNote(left) {
      return left > 0 && left <= 2 ? " " + left + " attempt" + (left === 1 ? "" : "s") + " left." : "";
    }

    function cryptoProblem() {
      setBusy(false, mode);
      showFormError("This page needs a secure context. Open the site with Live Server instead of double-clicking the file.");
    }

    /* ----- switch between Login and Sign up ----- */

    function setMode(next, silent) {
      mode = next;
      var signup = next === "signup";

      loginForm.hidden = signup;
      signupForm.hidden = !signup;
      $("altLogin").hidden = signup;
      $("altSignup").hidden = !signup;

      $("title").textContent = config.texts[next].title;
      $("subtitle").textContent = config.texts[next].subtitle;
      document.title = config.texts[next].title + " | Budget Planner";

      hideFormErrors();
      if (locked) {
        // keep showing the lock countdown on whichever form is visible
        var fails = readFails(role);
        if (fails.until > Date.now()) startLock(fails.until);
      }
      updateJar();

      if (!silent) {
        try { history.replaceState(null, "", signup ? "#signup" : "#login"); } catch (err) { /* ignore */ }
        if (window.matchMedia("(pointer: fine)").matches) (signup ? sName : loginEmail).focus();
      }
    }

    $("toSignup").addEventListener("click", function (event) {
      event.preventDefault();
      setMode("signup");
    });

    $("toLogin").addEventListener("click", function (event) {
      event.preventDefault();
      setMode("login");
    });

    $("forgot").addEventListener("click", function (event) {
      event.preventDefault();
      showToast(config.forgotMessage);
    });

    /* ----- log in ----- */

    function onLoggedIn(account) {
      writeFails(role, { count: 0, until: 0 });
      saveSession(role, account.email, account.name, remember.checked);

      setRow(2, true);
      setRow(3, true);
      sprout.classList.add("grown");
      loginSubmit.querySelector(".submit-label").textContent = "Logged in";

      setTimeout(function () {
        window.location.replace(config.redirect);
      }, reducedMotion ? 250 : 1700);
    }

    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (busy || locked) return;

      var fails = readFails(role);
      if (fails.until > Date.now()) {
        startLock(fails.until);
        return;
      }

      var emailOk = checkLoginEmail();
      var passwordOk = checkLoginPassword();

      if (!emailOk || !passwordOk) {
        showFormError("Fix the highlighted fields to continue.");
        (emailOk ? loginPassword : loginEmail).focus();
        return;
      }

      hideFormErrors();
      setBusy(true, "login");

      verifyAccount(role, loginEmail.value, loginPassword.value)
        .then(function (account) {
          if (account) {
            onLoggedIn(account);
            return;
          }

          var left = registerFailure();
          setBusy(false, "login");
          if (left > 0) {
            showFormError("Email or password is incorrect. If you're new here, sign up first." + attemptsNote(left));
          }
          loginPassword.value = "";
          updateJar();
          loginPassword.focus();
        })
        .catch(cryptoProblem);
    });

    /* ----- sign up ----- */

    function resetSignupForm() {
      signupForm.reset();
      [sName, sEmail, sPassword, sConfirm, sCode].forEach(function (input) {
        if (!input) return;
        delete input.dataset.touched;
        setFieldState(input, "");
      });
    }

    signupForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (busy || locked) return;

      var fails = readFails(role);
      if (fails.until > Date.now()) {
        startLock(fails.until);
        return;
      }

      // Run every check so all problems show at once.
      var results = [
        [sName, checkName()],
        [sEmail, checkSEmail()],
        [sPassword, checkSPassword()],
        [sConfirm, checkConfirm()]
      ];
      if (checkCode) results.push([sCode, checkCode()]);

      var firstBad = null;
      results.forEach(function (pair) {
        if (!pair[1] && !firstBad) firstBad = pair[0];
      });

      if (firstBad) {
        showFormError("Fix the highlighted fields to continue.");
        firstBad.focus();
        return;
      }

      hideFormErrors();
      setBusy(true, "signup");

      var codeCheck = config.requireCode
        ? sha256Hex("bp|" + role + "-code|" + sCode.value.trim()).then(function (hash) {
            return safeEqual(hash, config.codeHash);
          })
        : Promise.resolve(true);

      codeCheck
        .then(function (codeOk) {
          if (!codeOk) {
            var left = registerFailure();
            setBusy(false, "signup");
            if (left > 0) {
              setFieldState(sCode, "That access code isn't valid." + attemptsNote(left));
              sCode.focus();
            }
            return null;
          }

          return createAccount({
            role: role,
            name: sName.value,
            email: sEmail.value,
            password: sPassword.value
          }).then(function (result) {
            setBusy(false, "signup");

            if (result.ok) {
              var email = sEmail.value.trim();
              resetSignupForm();
              setMode("login");
              loginEmail.value = email;
              updateJar();
              showToast("Account created. Log in to continue.");
              if (window.matchMedia("(pointer: fine)").matches) loginPassword.focus();
            } else if (result.reason === "exists") {
              setFieldState(sEmail, "An account with this email already exists. Log in instead.");
              sEmail.focus();
            } else {
              showFormError("Your browser blocked saving the account. Allow site storage for this page and try again.");
            }
          });
        })
        .catch(cryptoProblem);
    });

    /* ----- Back button restore ----- */

    window.addEventListener("pageshow", function (event) {
      if (event.persisted) {
        setBusy(false, "login");
        sprout.classList.remove("grown");
        updateJar();
      }
    });

    /* ----- start ----- */

    setMode(window.location.hash === "#signup" ? "signup" : "login", true);
    setTimeout(function () { setRow(1, true); }, 350); // first coins drop in on load

    var activeFails = readFails(role);
    if (activeFails.until > Date.now()) startLock(activeFails.until);

    if (window.matchMedia("(pointer: fine)").matches) {
      (mode === "signup" ? sName : loginEmail).focus();
    }
  }

  global.BPAuth = {
    initAuth: initAuth,
    requireRole: requireRole,
    getSession: getSession,
    logout: logout,
    // exposed so the account logic can be tested on its own
    createAccount: createAccount,
    verifyAccount: verifyAccount
  };
})(typeof window !== "undefined" ? window : globalThis);