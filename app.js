(() => {
  const $ = s => document.querySelector(s), cfg = window.FIREBASE_CONFIG || {};
  const show = n => ["home", "chat", "notice"].forEach(k => $("#" + k).hidden = k !== n);
  const notice = t => { $("#notice-text").textContent = t; show("notice"); };
  if (!cfg.apiKey || !cfg.databaseURL) return notice("Setup needed: add your Firebase config to firebase-config.js (see README).");

  firebase.initializeApp(cfg);
  const auth = firebase.auth(), db = firebase.database(), TS = firebase.database.ServerValue.TIMESTAMP;
  let uid, ref, host = false, offs = [];
  // Ephemeral identity: lives in this tab only (sessionStorage + session-persisted anonymous auth)
  const name = sessionStorage.gr_name || (sessionStorage.gr_name = "Ghost-" + Math.random().toString(16).slice(2, 6).toUpperCase());
  const newId = () => [...crypto.getRandomValues(new Uint8Array(10))].map(b => (b % 36).toString(36)).join("");
  const roomId = () => (location.hash.match(/^#room=([a-z0-9]{6,20})$/) || [])[1];
  const err = t => { $("#err").textContent = t || ""; };
  const leave = () => { offs.forEach(f => f()); offs = []; ref = null; };

  const route = () => {
    leave(); const id = roomId();
    if (!id) return show("home");
    ref = db.ref("rooms/" + id);
    ref.child("meta").once("value").then(s => {
      if (!s.exists()) return notice("This room doesn't exist or has ended.");
      host = s.val().host === uid; enter();
    }).catch(() => notice("Couldn't open this room."));
  };

  const ended = () => { leave(); notice("This session has ended and its messages were deleted."); };

  const enter = () => {
    show("chat"); $("#msgs").replaceChildren(); $("#end").hidden = !host; err();
    const r = ref, pres = r.child("presence/" + uid), mq = r.child("messages").limitToLast(200);
    pres.set(name); pres.onDisconnect().remove();
    const a = mq.on("child_added", s => render(s.val()));
    const p = r.child("presence").on("value", s => $("#count").textContent = s.numChildren() + " here");
    const m = r.child("meta").on("value", s => { if (!s.exists()) ended(); });
    offs = [() => mq.off("child_added", a), () => r.child("presence").off("value", p), () => r.child("meta").off("value", m), () => pres.remove()];
  };

  const render = m => {
    const d = document.createElement("div"), n = document.createElement("small"), box = $("#msgs");
    d.className = "msg" + (m.u === uid ? " me" : ""); n.textContent = m.n; d.append(n);
    if (m.t) d.append(document.createTextNode(m.t));
    if (m.i && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(m.i)) { const i = new Image(); i.src = m.i; i.alt = "Shared image"; d.append(i); }
    const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.append(d); if (stick || m.u === uid) box.scrollTop = box.scrollHeight;
  };

  const push = o => ref.child("messages").push({ u: uid, n: name, ts: TS, ...o }).catch(() => err("Message failed to send. Check your connection."));

  // Client-side image compression: JPEG, max 800px, shrunk until it fits the database limit
  const compress = f => new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      URL.revokeObjectURL(url); let w = 800, q = .7;
      for (;;) {
        const k = Math.min(1, w / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const d = c.toDataURL("image/jpeg", q);
        if (d.length <= 95000) return res(d);
        if (q > .4) q -= .1; else if (w > 200) w -= 150; else return rej();
      }
    };
    img.onerror = rej; img.src = url;
  });

  $("#create").onclick = () => {
    const id = newId();
    db.ref("rooms/" + id + "/meta").set({ host: uid, created: TS }).then(() => { location.hash = "room=" + id; }).catch(() => notice("Couldn't create a room. Check the database rules in the README."));
  };
  $("#form").onsubmit = e => { e.preventDefault(); const t = $("#text").value.trim(); if (!t || !ref) return; err(); push({ t }); $("#text").value = ""; };
  $("#file").onchange = e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f || !ref) return;
    if (!f.type.startsWith("image/")) return err("Choose an image file.");
    compress(f).then(i => { err(); push({ i }); }).catch(() => err("That image couldn't be processed."));
  };
  $("#copy").onclick = () => navigator.clipboard.writeText(location.href).then(() => err("Link copied."), () => prompt("Copy this link:", location.href));
  $("#end").onclick = () => { if (confirm("End the session and delete all messages for everyone?")) ref.remove().catch(() => err("Only the host can end this session.")); };
  const home = () => { leave(); history.replaceState(null, "", location.pathname); show("home"); };
  $("#leave").onclick = home; $("#back").onclick = home;
  addEventListener("hashchange", () => { if (uid) route(); });

  auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).then(() => auth.signInAnonymously())
    .then(c => { uid = c.user.uid; route(); })
    .catch(() => notice("Couldn't sign in. Enable Anonymous sign-in in Firebase Authentication (see README)."));
})();
