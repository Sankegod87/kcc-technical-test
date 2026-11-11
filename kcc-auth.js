// Registers the server-side sign-in functions with Firebase. Logic lives in kcc-auth-core.js.
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { makeCore, Fail } = require("./kcc-auth-core.js");

const fsAdmin = admin.firestore();
const stampNow = () => admin.firestore.FieldValue.serverTimestamp();
const core = makeCore({
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
exports.kccHasSecret = functions.https.onCall(wrap((d, c) => core.hasSecret(d, c)));
exports.kccYtLive = functions.https.onCall(wrap((d, c) => core.ytLive(d, c)));
exports.kccSubmitRequest = functions.https.onCall(wrap((d, c, ip) => core.submitExternalRequest(d, c, ip)));
exports._core = core;
