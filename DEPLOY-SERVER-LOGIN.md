# Server-side login: cut-over guide

**Status: built and tested locally, NOT deployed.** The live app (`main`) still uses the old single document and open rules.
Do none of this before the 2027 launch. Once the new rules go live, the old app stops working.

## What changed
- Password hashes, the YouTube key and every person's role now live where no browser can read them.
- People sign in through a Cloud Function (`kccLogin`). It checks the password and hands back a signed token with their role.
- The app data is split into one document per topic (`data/fixtures`, `data/schedules`, ...). The rules decide who can write which (`kcc-schema.js` is the single source; `firestore.rules` is generated from it).
- Crew accounts (add, edit, reset, remove, roles) only change through Cloud Functions, so a browser cannot promote anyone.
- The public request form goes through a function with rate limits. The YouTube status is fetched by a function.

## One-time setup (cut-over day)
1. **Firebase plan:** upgrade to Blaze (pay as you go) and set a budget alert (for example $1). Cloud Functions need it. Normal use stays inside the free allowance.
2. **Authentication:** Firebase console > Authentication > Get started. No sign-in method needs turning on.
3. **Token permission:** Google Cloud console > IAM > find the service account `light-tracker-d708f@appspot.gserviceaccount.com` and add the role **Service Account Token Creator** to itself. Without it, sign-in fails with "permission iam.serviceAccounts.signBlob denied".
4. **Deploy functions:** add a `firebase.json` next to `index.js`:
   ```json
   { "functions": { "source": ".", "ignore": ["node_modules", "tests", "tools", "js", "css", "*.png", "*.svg", "index.html", "service-worker.js", "manifest.json"] },
     "firestore": { "rules": "firestore.rules" } }
   ```
   then `firebase deploy --only functions`. (Text messaging has been removed; the weeklyScheduleSMS and manualSendScheduleSMS functions can be deleted with `firebase functions:delete weeklyScheduleSMS manualSendScheduleSMS`.)
5. **Migrate the data** (safe: the old document is untouched):
   ```
   gcloud auth application-default login
   GCLOUD_PROJECT=light-tracker-d708f node tools/migrate.js          # dry run
   GCLOUD_PROJECT=light-tracker-d708f node tools/migrate.js --go
   ```
   People who never had a password get a temporary one, printed once. Give it to them and ask them to change it.
6. **Go live together:** publish the new app (merge to `main`) and deploy the rules in the same few minutes:
   `firebase deploy --only firestore:rules`
7. **Check:** sign in as the master, an admin and a crew member. Add a test crew member. Open `#request` in a private window and send a test request.
8. **After a week:** delete the old document `stage-light-tracker/main` in the console (it still holds the old password hashes). Until then you can roll back by restoring the old rules and the old app.

## Confirmations (call sheets)
Confirm links in call-sheet emails are signed by the server (`?confirm=DATE&tech=ID&sig=...`) so one tap works with no sign-in and cannot be forged. The signing key is created automatically in `private/secrets` the first time it is needed. Emails sent by the server's `autoCallSheets` also include the link when `APP_URL` is set.

## Optional: App Check
Blocks requests that do not come from your site. Firebase console > App Check > register the web app with reCAPTCHA v3, paste the site key into `APP_CHECK_SITE_KEY` in `index.html`, add `https://www.google.com` and `https://www.recaptcha.net` to the `script-src` in the page's security policy, then turn on enforcement for Firestore and Functions.

## Tests
- `npm test` runs the server logic, migration and rules-sync checks (no Firebase needed).
- `npm run test:e2e` drives the real app in a browser against a fake cloud.
- `npm run test:rules` runs the **real rules** in the Firebase emulator. Needs Java and a one-time download, so run it on your own computer. It has not been run yet.

## Known limits
- A changed role or a deactivation takes effect for open sessions within about an hour (tokens refresh hourly), and immediately for new sign-ins. Password resets and removals also revoke the person's refresh token.
- The audit log is writable by every signed-in person (it has to be, because every action adds to it), so it is evidence, not proof.
- The per-address limit on the public form is best effort. The hourly cap (60) and queue cap (150) always apply.
- Sign-in needs the internet. A device that is already signed in keeps working offline.
- The welcome email still contains the new person's password (sent through EmailJS from the admin's browser).
