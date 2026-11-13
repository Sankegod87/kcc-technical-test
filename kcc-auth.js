// Registers the server-side sign-in functions with Firebase. Logic lives in kcc-auth-core.js.
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { makeCore, Fail } = require("./kcc-auth-core.js");

const fsAdmin = admin.firestore();
const stampNow = () => admin.firestore.FieldValue.serverTimestamp();
const kccEmail = require("./kcc-email.js");

// Emails about tech requests (admin alert + confirmation to the requester). Needs the EmailJS keys set on the server.
async function sendRequestMail({ kind, to, name, req }) {
  const pub = process.env.EMAILJS_PUBLIC_KEY, priv = process.env.EMAILJS_PRIVATE_KEY;
  if (!pub || !priv) return;
  const html = kind === "admin" ? kccEmail.requestNew({ name, req, appUrl: process.env.APP_URL || "" }) : kccEmail.requestReceipt({ name, req });
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_id: "service_pjzebxk", template_id: "template_ebt36uu", user_id: pub, accessToken: priv,
      template_params: { to_email: to, to_name: name, subject: kccEmail.requestSubject(kind, req), message: "", html, fixture_name: "Tech request", fixture_id: req.id, bulb_type: req.category || "", reported_by: "KCC Technical" } }),
  });
  if (!res.ok) throw new Error("EmailJS " + res.status);
}

const core = makeCore({
  mail: sendRequestMail,
  fs: {
    doc: (p) => fsAdmin.doc(p),
    runTransaction: (fn) => fsAdmin.runTransaction(fn),
  },
  auth: admin.auth(),
  stamp: stampNow,
});

// Turn our errors into the error type Firebase sends back to the browser.
const wrap = (fn) => async (data, context) => {
  try {
    return await fn(data, context, context && context.rawRequest && context.rawRequest.ip);
  } catch (e) {
    if (e instanceof Fail) throw new functions.https.HttpsError(e.code, e.message, e.details);
    console.error(e);
    throw new functions.https.HttpsError("internal", "Something went wrong.");
  }
};

exports.kccLogin = functions.https.onCall(wrap((d, c) => core.login(d)));
exports.kccConfirm = functions.https.onCall(wrap((d, c) => core.confirmSelf(d, c)));
exports.kccConfirmLink = functions.https.onCall(wrap((d) => core.confirmLink(d)));
exports.kccLinks = functions.https.onCall(wrap((d, c) => core.makeLinks(d, c)));
exports.kccBootstrap = functions.https.onCall(wrap((d, c) => core.bootstrap(d)));
exports.kccTechOp = functions.https.onCall(wrap((d, c) => core.techOp(d, c)));
exports.kccSetSecret = functions.https.onCall(wrap((d, c) => core.setSecret(d, c)));
exports.kccNotesGet = functions.https.onCall(wrap((d, c) => core.notesGet(d, c)));
exports.kccNoteAdd = functions.https.onCall(wrap((d, c) => core.noteAdd(d, c)));
exports.kccNoteDel = functions.https.onCall(wrap((d, c) => core.noteDel(d, c)));
exports.kccFeedbackSend = functions.https.onCall(wrap((d, c) => core.feedbackSend(d, c)));
exports.kccFeedbackList = functions.https.onCall(wrap((d, c) => core.feedbackList(d, c)));
exports.kccFeedbackAct = functions.https.onCall(wrap((d, c) => core.feedbackAct(d, c)));
exports.kccHasSecret = functions.https.onCall(wrap((d, c) => core.hasSecret(d, c)));
exports.kccYtLive = functions.https.onCall(wrap((d, c) => core.ytLive(d, c)));
exports.kccSubmitRequest = functions.https.onCall(wrap((d, c, ip) => core.submitExternalRequest(d, c, ip)));
exports._core = core;
