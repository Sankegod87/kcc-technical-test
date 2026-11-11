# Side-by-side beta (old app + new version, nothing touches the live data)

The live site keeps showing the OLD app. A small **β** link (bottom-right) asks for the beta password; the right password
switches **that device only** to the new version at `/v2/`. The new version uses its own **test Firebase project**, so the
live project, its rules and its data are never touched.

## One-time setup (you)
1. Firebase console → **Add project** (e.g. `kcc-technical-beta`). Turn on **Firestore** (production mode) and the **Blaze** plan.
2. Add a **Web app**; the beta config is already saved in `firebase-config.beta.js`; (for another project copy `firebase-config.example.js` and paste the config block, keep `KCC_REQUIRE_BETA = true`.
3. On your computer, in this repo, switch the CLI to the TEST project and deploy the server side (see DEPLOY-SERVER-LOGIN.md):
   `firebase use <test-project-id>` then `firebase deploy --only functions,firestore:rules`
   (check `firebase use` prints the TEST project before every deploy).
4. Open the beta, create the master account with the first-run screen. To try real data, import a backup from the live app
   (`tools/migrate.js` does a dry run first).

## Build the site (writes a folder, uploads nothing)
```
git archive main | tar -x -C /tmp/oldapp          # the old app, from main
node tools/beta/build-site.js --old /tmp/oldapp --config firebase-config.beta.js --password "<beta password>" --out site
```
The builder refuses to run if the config still has PASTE placeholders or points at the live project (`light-tracker-d708f`).

## Publishing `site/`
Put the contents of `site/` where the old app is hosted (same folder). Old app at `/`, new version at `/v2/`.
Devices that already cached the old page get the β link after their next refresh.

## Notes
- The password only hides the beta (it is in the page code). Real security is the new version's crew accounts and server rules.
- "β Leave beta" (bottom-left in the new version) switches that device back.
- When you launch for everyone, deploy the revamp to the live project (migration plan in TEST-LOCALLY.md) and replace the old app.

## Exact steps for the project `cc-technical-beta` (already configured in `.firebaserc` and `firebase-config.beta.js`)
1. Firebase console → **Authentication → Get started** (no sign-in method needed).
2. Google Cloud console → IAM → service account `cc-technical-beta@appspot.gserviceaccount.com` → give it the role **Service Account Token Creator**.
3. On your computer, in this folder: `npm install`, `npx firebase login`, then
   `npx firebase deploy --only functions,firestore:rules --project cc-technical-beta`
4. Build the site (command above) and publish it. Open `/v2/` after unlocking the beta; the first-run screen creates the master account.
