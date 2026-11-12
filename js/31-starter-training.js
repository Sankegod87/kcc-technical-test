// Starter training modules written from the Crew, Admin and Master Admin guides. Admins add them with one button
// (Training → "Add starter modules"), then edit, add or delete anything with "Edit module". Adding is safe to repeat.
window.KCC_STARTER_MODULES=[
 {id:'st_crew1',title:'Crew Guide 1: Signing in, Service Day and scanning',dept:'',level:'Beginner',duration:'20 min',required:true,
  desc:'Read the Crew Guide sections 1 to 5: signing in, finding your way, your Sunday on Service Day, and scanning labels.',
  quiz:{pass:80,qs:[
   {q:'You type the wrong password five times in a row. What happens?',opts:['Nothing, you can keep trying','The account is locked for a minute, and for longer if it keeps happening','The account is deleted','You must wait until the next day'],a:1},
   {q:'What does Sign Out do on a shared phone?',opts:['Only hides the menu','It also clears the saved copy of the data from that device','Deletes your account','Nothing until you close the browser'],a:1},
   {q:'Who can mark a station "ready"?',opts:['Anyone signed in','Only the master admin','People on that station, or an admin','Only the person who wrote the checklist'],a:2},
   {q:'What does the Confirm link in your call-sheet email do?',opts:['Confirms you for that Sunday with one tap, no sign-in','Resets your password','Opens the schedule editor','Sends you a text message'],a:0},
   {q:'Your phone camera will not scan a label. What can you do?',opts:['Nothing, wait for an admin','Type the fixture or gear ID into the scan box','Take a photo and email it','Skip the label'],a:1},
   {q:'The sync line says "Offline". What should you do?',opts:['Stop working until you are online','Keep working: changes are kept on the device and sent when you reconnect','Sign out and back in','Ask an admin to restart the app'],a:1}]},
  practical:{pass:80,items:[
   {text:'Signs in on their own device, then signs out',critical:true},
   {text:'Finds Service Day and says which station they are on and when call time is'},
   {text:'Ticks off a checklist item and reads the counter'},
   {text:'Confirms for the Sunday (or asks for a swap)'},
   {text:'Scans a label, or types an ID, and opens the item card'},
   {text:'Marks their station ready after finishing its checklist',critical:true}]}},
 {id:'st_crew2',title:'Crew Guide 2: Reporting problems and borrowing gear',dept:'',level:'Beginner',duration:'20 min',required:true,
  desc:'Read the Crew Guide sections 6 to 10: outage reports, checking gear out and back, availability, and what to do when something goes wrong.',
  quiz:{pass:80,qs:[
   {q:'What is the quickest way to report a broken fixture from any page?',opts:['Email an admin','Tap Report Outage in the top bar (or scan its label)','Write it in your notes','Wait until Monday'],a:1},
   {q:'After you report a fixture out, what happens?',opts:['Nothing is shown','The fixture shows as Out and admins are told','The fixture is deleted','Stock goes up'],a:1},
   {q:'A borrowed item comes back damaged. What condition do you choose when returning it?',opts:['Good','Damaged or Needs service, which flags it for an admin','Leave it blank','Lost'],a:1},
   {q:'Where do you check gear out?',opts:['Gear → Asset Checkout, open the item, tap Check out','Rig → Fixtures','Settings','Crew → Training'],a:0},
   {q:'Where do you tell the team which Sundays you can work?',opts:['Schedule page','Crew → Sunday Availability, in your own row','Announcements','Tech Requests'],a:1},
   {q:'You should be on the roster but are not. What do you do?',opts:['Edit the roster yourself','Tell an admin: only they can change it','Ignore it','Reset the app'],a:1}]},
  practical:{pass:80,items:[
   {text:'Reports an outage on a fixture with a description and a photo',critical:true},
   {text:'Checks an item out with a return date and a purpose',critical:true},
   {text:'Returns it and picks the right condition',critical:true},
   {text:'Sets their availability for the next Sunday'},
   {text:'Opens a gear item page and finds who has it and when it is due'}]}},
 {id:'st_admin1',title:'Admin Guide 1: Roster, call sheets and readiness',dept:'',level:'Intermediate',duration:'30 min',required:false,
  desc:'Admin Guide sections 2 to 4: reading the Control Room, building the Sunday roster, call sheets and the readiness gate.',
  quiz:{pass:80,qs:[
   {q:'Which setting must be on for you to edit the roster?',opts:['Admin PIN','Can edit schedule on your profile','Show unavailable crew','Auto-send'],a:1},
   {q:'"Email call sheets now" sends to:',opts:['Everyone, every time','Everyone who has not received one yet','Only admins','Only people who confirmed'],a:1},
   {q:'What does "Remind N unconfirmed" do?',opts:['Texts the whole crew','Emails a fresh call sheet only to the people who have not confirmed','Removes them from the roster','Marks them confirmed'],a:1},
   {q:'Automatic call sheets (48 hours before call) are sent by:',opts:['Whoever opens the app first','The server, even when nobody has the app open','Each crew member\'s phone','Only the master, by hand'],a:1},
   {q:'Someone on the roster has no email on their profile. What happens to their call sheet?',opts:['It is sent to the admin','They are skipped','It is texted','It is held until Monday'],a:1},
   {q:'Before service, each rostered station must:',opts:['Be deleted','Sign off as ready','Send an email','Log hours'],a:1}]},
  practical:{pass:80,items:[
   {text:'Builds next Sunday\'s roster and fills in the briefing notes',critical:true},
   {text:'Sends call sheets and says who will be skipped and why'},
   {text:'Uses Remind to chase unconfirmed crew'},
   {text:'Checks Ready for service before doors open and names any station still outstanding',critical:true}]}},
 {id:'st_admin2',title:'Admin Guide 2: Fixtures, stock and gear',dept:'',level:'Intermediate',duration:'30 min',required:false,
  desc:'Admin Guide sections 5 and 7: fixtures, bulbs and stock, gear and maintenance.',
  quiz:{pass:80,qs:[
   {q:'When you mark a fixture as fixed with a new bulb, what happens?',opts:['Nothing changes','The bulb comes out of stock and the fixture goes back to OK','The fixture is deleted','A request is created'],a:1},
   {q:'How do you record a bulb delivery?',opts:['Stock tab → + Receive Batch','Fixtures → Add','Settings → Vendors','Asset Checkout'],a:0},
   {q:'Which two details are required when adding a fixture?',opts:['Vendor and cost','ID and bulb type','Location and photo','Name and email'],a:1},
   {q:'Which tab is the full record of outages and replacements?',opts:['Stock','Fixtures','History','Maintenance'],a:2},
   {q:'Overdue gear is flagged in:',opts:['Green','Red','Blue','It is not flagged'],a:1},
   {q:'Where do you log a service on a gear item?',opts:['On the item page: Log service (or Gear → Maintenance → + Log Service)','Crew page','Control Room','Announcements'],a:0}]},
  practical:{pass:80,items:[
   {text:'Adds a fixture with all required details',critical:true},
   {text:'Receives a stock batch and explains the low-stock threshold'},
   {text:'Logs a gear service with notes and cost',critical:true},
   {text:'Imports from the spreadsheet template and reviews the preview before confirming'}]}},
 {id:'st_admin3',title:'Admin Guide 3: Crew accounts, alerts and stream',dept:'',level:'Intermediate',duration:'30 min',required:false,
  desc:'Admin Guide sections 6, 9 and 10: managing crew, resetting passwords, automatic alerts, the YouTube and vMix tiles, and after-service follow-up.',
  quiz:{pass:80,qs:[
   {q:'A crew member forgot their password. What do you do?',opts:['Delete their account','Tap the key button on their card on the Crew page and set a new one','Email them the old password','Nothing, they wait 30 minutes'],a:1},
   {q:'How many characters must a password have, at least?',opts:['4','6','8','12'],a:2},
   {q:'Someone leaves the team. What should you do?',opts:['Deactivate them so their history stays','Remove them and their history','Change their name','Make them master'],a:0},
   {q:'Where is the YouTube API key kept?',opts:['On every crew phone','On the server, never sent to anyone\'s device','In the call sheet email','In the URL'],a:1},
   {q:'The vMix tile only works when:',opts:['You are on the same network as the vMix computer','You are an admin at home','The stream is live','It is Sunday'],a:0},
   {q:'After the service, what should you do with the After service notes?',opts:['Ignore them','Read them, fix what broke, update status and close the requests','Delete them','Email them to everyone'],a:1}]},
  practical:{pass:80,items:[
   {text:'Adds a technician with a starting password of at least 8 characters',critical:true},
   {text:'Resets someone\'s password and explains they are signed out everywhere',critical:true},
   {text:'Deactivates and reactivates a crew member'},
   {text:'Checks the stream and vMix tiles before doors open'}]}},
 {id:'st_master1',title:'Master Admin: roles, backups and launch',dept:'',level:'Advanced',duration:'40 min',required:false,
  desc:'Master Admin Guide: roles, backups and restore, the admin PIN, security, updating the app and the launch checklist.',
  quiz:{pass:80,qs:[
   {q:'What should you do before pressing Reset All Data?',opts:['Nothing','Download a backup','Sign out everyone','Update the app'],a:1},
   {q:'What does a backup file NOT contain?',opts:['Crew names and emails','Passwords and the YouTube key','Fixtures','Schedules'],a:1},
   {q:'What does restoring a backup change?',opts:['Only your device','App data on every device; accounts, roles and passwords are not changed','Only the schedule','Everything including passwords'],a:1},
   {q:'Where is the admin PIN stored?',opts:['On the server for everyone','On each device separately','In the backup file','In the call sheet'],a:1},
   {q:'What must you type to confirm Reset All Data?',opts:['YES','DELETE','RESET','Your password'],a:2},
   {q:'After you change someone\'s role while they are signed in, it can take up to:',opts:['One minute','One hour to apply','One week','It never applies'],a:1},
   {q:'Why change CACHE_VERSION in service-worker.js when you update the app?',opts:['It tells every phone to drop its old copy','It restarts the server','It resets passwords','It sends an email'],a:0}]},
  practical:{pass:80,items:[
   {text:'Downloads a backup and says where it is stored privately',critical:true},
   {text:'Sets the admin PIN on a device'},
   {text:'Changes someone\'s level in Role Management and explains the delay for signed-in people',critical:true},
   {text:'Walks through the launch checklist and names three items'}]}},
 {id:'st_station3',title:'Station 3 (Presentation) manual',dept:'',stations:['Presentation Station'],links:[{label:'Station 3 manual (PDF)',url:'manuals/station-3-presentation.pdf'}],level:'Beginner',duration:'30 min',required:false,
  desc:'From the Station 3 manual: the XPS computer, Chrome tabs, announcements and sermon files, going live on YouTube, fixing no sound, and fixing a black or wrong screen with the Crestron. The manual PDF is attached. Crestron and ProPresenter get their own modules later.',
  quiz:{pass:80,qs:[
   {q:'How do you shut down the XPS computer?',opts:['Hold the power button every time','Shut down through Windows; use the power button only to force a reset when it is frozen','Unplug it','Close the lid'],a:1},
   {q:'Which two programs do you open once the computer has loaded?',opts:['Word and Excel','Google Chrome and ProPresenter','Zoom and Teams','Photoshop and vMix'],a:1},
   {q:'Which three tabs do you open in Chrome?',opts:['Gmail, Google Drive and YouTube','Facebook, Gmail and Maps','Drive, Docs and Calendar','YouTube, Spotify and Gmail'],a:0},
   {q:'Where do you find the updated announcements and the list of songs?',opts:['In Gmail','On the desktop','In ProPresenter only','On the TV'],a:0},
   {q:'What do you do with the Sermon Template in Google Drive?',opts:['Edit it directly','Download it and edit your copy; never tamper with the original','Delete it each week','Share it with the choir'],a:1},
   {q:'There is no sound, and nothing is muted on the PC or the mixer. What is the first fix in the manual?',opts:['Buy a new speaker','Device Manager → Sound, video and game controllers → Realtek Audio → Driver: update, or roll back, then restart','Reinstall Windows','Turn the TVs off'],a:1},
   {q:'A screen is black or frozen after you routed the Crestron. What is the fastest keyboard fix?',opts:['Win + Ctrl + Shift + B (restarts the graphics driver)','Ctrl + Alt + Delete','Alt + F4','Hold the power button'],a:0},
   {q:'Win + P should always be set to:',opts:['Duplicate','PC screen only','Extend','Second screen only'],a:2},
   {q:'What resolution and refresh rate should each display use so the Crestron matrix keeps its signal?',opts:['4K at 30 Hz','1920 x 1080 at 60 Hz','1280 x 720 at 59 Hz','Whatever Windows picks'],a:1},
   {q:'Who do you contact when every audio fix has failed, or you do not know the sign-in PIN?',opts:['Nobody, wait until Monday','Peace or TL Dami','The YouTube help line','Any visitor'],a:1}]},
  practical:{pass:80,items:[
   {text:'Starts the computer, signs in, and explains the right way to shut it down',critical:true},
   {text:'Opens Chrome with the Gmail, Drive and YouTube tabs, and ProPresenter'},
   {text:'Finds the latest announcements and song list in Gmail'},
   {text:'Finds the Starred documents in Drive and downloads the Sermon Template without editing the original',critical:true},
   {text:'Sets up the YouTube live stream: title, description and thumbnail'},
   {text:'Tests audio from YouTube and checks the PC and mixer are not muted'},
   {text:'Shows the Device Manager steps to fix no sound (update or roll back the Realtek driver, restart)'},
   {text:'Fixes a black screen with Win + Ctrl + Shift + B and sets Win + P to Extend',critical:true},
   {text:'Re-detects displays and sets 1920 x 1080 at 60 Hz'},
   {text:'Checks ProPresenter screens are on and Configure Screens targets the right outputs'}]}}
];
(function(){
  // a starter you deleted stays deleted: we remember which ones were already offered
  const missing=()=>window.KCC_STARTER_MODULES.filter(s=>!(db.trainingModules||[]).some(m=>m.id===s.id)&&!((db.settings||{}).starterAdded||[]).includes(s.id));
  window.addStarterModules=function(){
    if(!isAdmin()){ toast('Admin required','error'); return; }
    const add=missing(); if(!add.length){ toast('All starter modules are already added','info'); return; }
    if(!confirm('Add '+add.length+' starter module'+(add.length>1?'s':'')+' built from the Crew, Admin and Master Admin guides? You can edit or delete any of them afterwards.')) return;
    if(!db.trainingModules) db.trainingModules=[];
    add.slice().reverse().forEach(s=>db.trainingModules.unshift(Object.assign(JSON.parse(JSON.stringify(s)),{createdAt:Date.now()})));
    db.settings.starterAdded=((db.settings||{}).starterAdded||[]).concat(add.map(s=>s.id));
    save(); renderTraining(); toast(add.length+' starter module'+(add.length>1?'s':'')+' added','success'); paintBtn();
  };
  function paintBtn(){
    const bar=document.querySelector('#pg-training > .row'); if(!bar) return;
    let b=document.getElementById('st-add'); const n=missing().length;
    if(!b){ b=document.createElement('button'); b.id='st-add'; b.className='btn bgh'; b.style.marginRight='8px'; b.onclick=window.addStarterModules; const add=bar.querySelector('button.ba'); if(add&&add.parentNode===bar){ const w=document.createElement('div'); w.className='row gap8'; bar.insertBefore(w,add); w.appendChild(b); w.appendChild(add); } else bar.appendChild(b); }
    b.textContent='📚 Add starter modules ('+n+')'; b.style.display=(isAdmin()&&n)?'':'none';
  }
  window.addEventListener('DOMContentLoaded',()=>{ const _rt=renderTraining; renderTraining=function(){ const r=_rt.apply(this,arguments); try{paintBtn();}catch(e){} return r; }; });
})();
