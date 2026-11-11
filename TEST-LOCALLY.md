# Test KCC Technical on your own computer

1. Install Node.js (LTS) from nodejs.org, once.
2. Unzip this folder.
3. Windows: double-click START-DEMO-WINDOWS.bat. Mac: double-click START-DEMO-MAC.command (or run `node tools/local-demo.js`).
4. Open http://localhost:8080 (don't open index.html directly).
5. Sign in as anyone. Password for everyone: demo. Jordan = master admin, Priya = admin, the rest = crew.

It uses a pretend cloud held in memory: nothing touches your real Firebase, EmailJS or YouTube, and no emails are sent.
Stop with Ctrl+C. Restart to reset to the sample crew. Public request form: http://localhost:8080/#request

Things worth trying: sign in as crew vs admin and compare menus; Crew page > add/reset passwords; Service Day call sheet > Send, then open the confirm link; Settings > YouTube; open two tabs as different people and edit.

## New in this version (all work in the demo)
- Service Day: **Go-live check** card (crew, stations, outages, YouTube, vMix, ProPresenter, X32), **Booth** tile (X32 status + light scene buttons), **Last service** summary with "Log 3h for everyone who served".
- Settings → **Connections**: addresses for vMix, ProPresenter, booth bridge and YouTube, each with a Test button.
- Asset Checkout: **Rapid scan** (camera, or type a code; try the gear IDs) and **Print QR labels**.
- The demo has a pretend ProPresenter and a pretend booth bridge. For the real bridge see tools/booth-bridge/README.md; for Fire tablets see android-wrapper/README.md.

## Training manuals and quizzes
Training → open "Camera framing basics" (links, gear, quiz). Crew pass the quiz to complete it; admins use "Manuals & quiz" to add links, link gear and write questions. Linked gear shows its manuals in the gear detail.

## Practical "driving test" + starter modules
Training → "Add starter modules" (admin) adds six modules built from the Crew, Admin and Master Admin guides, each with a quiz and a practical. Crew pass the quiz; an admin opens the module → "Evaluate someone" and ticks each skill (some are "must pass"). The module completes when both are passed. "Edit module" changes details, links, gear, skills and questions, or deletes the module.

## Training record per person
Crew → Profiles → open a person → "📄 Training record": quiz passes, practical results (skill by skill), trainer notes, certificates, hours and, for admins, the private performance notes. Download it as a file or print it to PDF. Training → "⬇ All records" downloads everyone in one file. Crew can open their own record (without the admin-only notes).
