/* ==========================================================
   Budget Planner: user/login.js
   Login and sign-up logic lives in ../auth.js. This file only
   sets the wording for the user page and where to go after login.

   People create their own account with "Sign up", then log in with
   the email and password they chose.
   ========================================================== */

BPAuth.initAuth({
  role: "user",
  redirect: "dashboard.html",
  requireCode: false,
  texts: {
    login:  { title: "User Login",     subtitle: "Sign in to continue to your budget." },
    signup: { title: "Create Account", subtitle: "Sign up to start planning your budget." }
  },
  forgotMessage: "Password reset needs an email service, which this version doesn't have yet."
});