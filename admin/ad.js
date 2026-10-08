/* ==========================================================
   Budget Planner: admin/ad.js
   Login and sign-up logic lives in ../auth.js. This file only
   sets the wording for the admin page and where to go after login.

   Anyone can sign up as a USER, but creating an ADMIN account also
   needs the admin access code, so not everyone can become an admin.

   Only a hash of the code is stored below, never the code itself.
   To choose a new code, open the browser console (F12) on any page
   served by Live Server and run this, replacing YourNewCode:

     crypto.subtle.digest("SHA-256", new TextEncoder().encode("bp|admin-code|YourNewCode"))
       .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("")))

   Then paste the printed value into codeHash below.
   ========================================================== */

BPAuth.initAuth({
  role: "admin",
  redirect: "manager-dashboard.html",
  requireCode: true,
  codeHash: "b2f36eb8dacd62c23abe15634ce0d5fe2eda7fcdfe06f4b4cd4a6e725efc02d8",
  texts: {
    login:  { title: "Admin Login",   subtitle: "Sign in to access the admin panel." },
    signup: { title: "Admin Sign Up", subtitle: "Create an admin account with your access code." }
  },
  forgotMessage: "Password reset needs an email service, which this version doesn't have yet."
});