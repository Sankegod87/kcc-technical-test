// The venue use & equipment agreement that outside groups sign on the request form.
// Shared by the browser (to show it) and the server (to record which version was signed).
// Change the wording only by raising VERSION: every signed request stores the version and a hash of this exact text.
//
// This is a plain-language template, not legal advice. Have the church's lawyer and insurer review it before relying on it.
(function (root) {
  'use strict';
  var VERSION = '2027-2';
  var TITLE = 'Venue Use & Equipment Agreement';
  var INTRO = 'This agreement is between the church (“KCC”) and the group named in the request (the “Renter”). It applies to the booking described in the request, including set-up and take-down, and to everyone the Renter brings into the building.';
  var CLAUSES = [
    ['Use of the venue', 'The Renter will use the venue only for the event, dates and times in the request. The Renter will not sublet the space or let another group use it, and will follow the church’s building rules and any directions from KCC staff or volunteers.'],
    ['Damage, loss and replacement fees', 'The Renter is responsible for any damage to, or loss of, the venue, its fixtures, furniture, instruments and equipment (including audio, video, lighting, streaming and network equipment) that happens during the booking and is caused by the Renter, its members, guests, performers, vendors or contractors. KCC will charge the reasonable cost to repair the damage or, if it cannot be repaired, the cost to replace the item with a comparable one, plus any related service, contractor or crew charges. KCC will send an itemised invoice and the Renter will pay it within 30 days.'],
    ['Report problems straight away', 'The Renter will tell a KCC representative immediately about any damage, malfunction, injury or hazard. The Renter and KCC will look over the space and equipment before and after the booking. Anything not noted before the booking is treated as caused during it.'],
    ['KCC equipment and crew', 'Only KCC Video crew, or people KCC approves in writing, may operate the church’s sound, video, lighting, streaming and network equipment. The Renter will not move, unplug, re-patch, re-rig or modify any of it. Time the crew works beyond the booked hours, and crew booked but not used because of a late change or cancellation, may be charged at the church’s posted rate.'],
    ['Outside equipment and content', 'Any equipment the Renter brings is brought at the Renter’s own risk and must be safe and approved by KCC beforehand. It may not be connected to the church’s network, power distribution or rigging without approval. The Renter is responsible for the content it plays, performs or shares, and for any copyright, music or performance licences that content needs. Recording or streaming of the event needs KCC’s permission.'],
    ['Cleaning and leaving the space', 'The Renter will leave the space clean and as it was found, remove its belongings and rubbish, and return furniture and equipment to where it was. KCC may charge for extra cleaning or for items left behind.'],
    ['Safety and capacity', 'The Renter will respect posted capacity limits and exits, and will not use open flames, pyrotechnics, or anything fixed to walls, ceilings or fittings (tape, nails, screws, hooks) without KCC’s approval. The Renter is responsible for the safety and conduct of its guests, including children, and will make sure enough responsible adults supervise them.'],
    ['Risk, liability and insurance', 'The Renter uses the venue and equipment at its own risk. To the extent the law allows, the Renter will protect and hold harmless KCC, its directors, staff and volunteers from claims, costs and losses that arise from the event or the Renter’s use of the venue, except where caused by KCC’s own gross negligence or wilful misconduct. If KCC asks, the Renter will show proof of general liability insurance that covers the event.'],
    ['Changes and cancellation', 'The Renter will tell KCC as early as possible, and at least 7 days before the booking, if it needs to change or cancel. KCC may change or cancel a booking if there is an emergency, a safety concern or a breach of this agreement, and will tell the Renter as soon as it can. Charges for work already done or crew already scheduled may still apply.'],
    ['Electronic signature and records', 'The person signing confirms that they are 18 or older and have authority to sign for the Renter. The Renter agrees that a typed name or a drawn signature on the request form is a valid signature, that this agreement is binding without a paper copy, and that KCC may keep an electronic record of it, including the date and time, the version of this text, and the signer’s details. A copy will be emailed to the address given in the request.'],
    ['Law and the rest of the agreement', 'This agreement is governed by the laws of Alberta and the courts of Alberta. It works together with the booking confirmation. If a separate written rental contract exists and conflicts with this agreement, that contract applies to the conflict. If any part of this agreement cannot be enforced, the rest still applies.']
  ];
  function text() {
    return TITLE + ' (version ' + VERSION + ')\n\n' + INTRO + '\n\n' + CLAUSES.map(function (c, i) { return (i + 1) + '. ' + c[0] + '\n' + c[1]; }).join('\n\n');
  }
  var api = { VERSION: VERSION, TITLE: TITLE, INTRO: INTRO, CLAUSES: CLAUSES, text: text };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KCC_AGREEMENT = api;
})(typeof window !== 'undefined' ? window : this);
