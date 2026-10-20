/* ===== Resellio — account online e backup (Firebase) ===== */
const Cloud = (() => {
  let auth = null, db = null, user = null, ready = false;
  let pushTimer = null, lastSync = 0, syncState = 'off';

  /* Messaggi d'errore di Firebase tradotti in italiano */
  const ERR = {
    'auth/invalid-email': 'Indirizzo email non valido',
    'auth/user-not-found': 'Nessun account con questa email',
    'auth/wrong-password': 'Password errata',
    'auth/invalid-credential': 'Email o password errati',
    'auth/invalid-login-credentials': 'Email o password errati',
    'auth/email-already-in-use': 'C\'è già un account con questa email',
    'auth/weak-password': 'La password deve avere almeno 6 caratteri',
    'auth/popup-closed-by-user': 'Hai chiuso la finestra di Google: riprova',
    'auth/popup-blocked': 'Il browser ha bloccato la finestra: consentila e riprova',
    'auth/cancelled-popup-request': 'Hai chiuso la finestra di Google: riprova',
    'auth/network-request-failed': 'Nessuna connessione a internet',
    'auth/too-many-requests': 'Troppi tentativi: riprova tra qualche minuto',
    'auth/operation-not-allowed': 'Metodo di accesso non ancora attivato: controlla nelle impostazioni di Firebase',
    'auth/unauthorized-domain': 'Dominio non autorizzato: aggiungilo in Firebase → Accesso utenti → Domini autorizzati',
  };
  function errMsg(e) {
    if (!e) return 'Errore sconosciuto, riprova';
    return ERR[e.code] || e.message || 'Errore, riprova';
  }

  function configured() {
    const c = window.FIREBASE_CONFIG;
    return !!(c && c.apiKey && c.projectId && typeof firebase !== 'undefined');
  }
  function active() { return ready; }
  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  /* --- Avvio: ascolta lo stato dell'account (letto anche da cache, così funziona offline) --- */
  function init(onChange) {
    if (!configured()) return false;
    if (ready) return true;
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      auth.onAuthStateChanged(u => {
        user = u || null;
        ready = true;
        setSync(user ? 'on' : 'off');
        if (onChange) onChange(user);
      });
      // serve a completare il login Google quando si ritorna dal redirect (APK)
      auth.getRedirectResult().catch(() => { });
    } catch (e) { ready = false; return false; }
    return true;
  }

  /* --- Accesso --- */
  function google() {
    if (!ready) return;
    const p = new firebase.auth.GoogleAuthProvider();
    // nell'APK (WebView) il popup non esiste: si usa il reindirizzamento
    if (isNative()) { auth.signInWithRedirect(p).catch(e => Utils.toast(errMsg(e), 'err')); return; }
    auth.signInWithPopup(p).catch(e => {
      if (e.code === 'auth/popup-blocked') auth.signInWithRedirect(p).catch(err => Utils.toast(errMsg(err), 'err'));
      /* popup chiuso dall'utente: si resta sulla schermata, nessun errore */
    });
  }

  function emailLogin(email, password, register) {
    if (!ready) return Promise.resolve();
    const job = register
      ? auth.createUserWithEmailAndPassword(email, password)
      : auth.signInWithEmailAndPassword(email, password);
    return job.catch(e => Utils.toast(errMsg(e), 'err'));
  }

  function resetPassword(email) {
    if (!ready) return;
    if (!email) { Utils.toast('Scrivi prima la tua email', 'err'); return; }
    auth.sendPasswordResetEmail(email)
      .then(() => Utils.toast('Email di reset inviata: controlla la posta 📬', 'ok'))
      .catch(e => Utils.toast(errMsg(e), 'err'));
  }

  function logout() {
    if (!ready) return;
    auth.signOut()
      .then(() => Utils.toast('Disconnesso. I dati restano su questo dispositivo.'))
      .catch(() => { });
  }

  /* --- Backup online dei dati ---
     Il dispositivo è sempre la fonte vera (localStorage). Il cloud è uno specchio:
     - all'accesso, se questo dispositivo è vuoto ma il backup c'è → lo ripristino
     - se il dispositivo ha già dati → li tengo e li rimando su */
  function pullMerge() {
    if (!ready || !user) return Promise.resolve(null);
    setSync('syncing');
    return db.collection('users').doc(user.uid).get()
      .then(doc => {
        const data = doc && doc.exists ? doc.data() : null;
        const localEmpty = Store.state.items.length === 0 && Store.state.deals.length === 0;
        if (data && data.state && localEmpty) {
          Store.importJSON(data.state);
          App.refresh();
          Utils.toast('Dati ripristinati dal backup online ☁️', 'ok');
        }
        return pushNow();
      })
      .catch(() => setSync('err'));
  }

  function schedulePush() {
    if (!ready || !user) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 4000);   // aspetto che finisca di scrivere, poi invio
  }

  function pushNow() {
    if (!ready || !user) return Promise.resolve(false);
    setSync('syncing');
    return db.collection('users').doc(user.uid).set({
      state: Store.exportJSON(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
      .then(() => { lastSync = Date.now(); setSync('ok'); return true; })
      .catch(() => { setSync('err'); return false; });
  }

  /* --- Stato di sincronizzazione (piccolo indicatore in alto) --- */
  function setSync(s) {
    syncState = s;
    const b = document.getElementById('sync-state');
    if (!b) return;
    const ora = lastSync ? ' alle ' + new Date(lastSync).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
    const map = {
      off: ['', 'Non connesso'],
      on: ['☁️', 'Account online attivo'],
      syncing: ['☁️…', 'Sincronizzazione in corso'],
      ok: ['☁️✓', 'Backup online aggiornato' + ora],
      err: ['⚠️ Backup non riuscito', 'Controlla la connessione e riprova'],
    };
    const m = map[s] || map.off;
    b.textContent = m[0];
    b.title = m[1];
    b.hidden = !m[0];
    b.classList.toggle('sync-err', s === 'err');
  }

  /* --- Schermata di accesso --- */
  const ui = { screen: null, msg: null, form: null, mode: 'login' };

  function uiInit() {
    ui.screen = document.getElementById('login-screen');
    if (!ui.screen) return;
    ui.msg = document.getElementById('login-msg');
    ui.form = document.getElementById('login-form');

    ui.screen.addEventListener('click', e => {
      if (e.target.closest('#btn-google')) { google(); return; }
      if (e.target.closest('#btn-register')) { toggleMode(); return; }
      if (e.target.closest('#btn-reset')) { resetPassword(field('email')); return; }
      if (e.target.closest('#btn-offline')) { Auth.lock(); return; }
    });
    ui.form.addEventListener('submit', e => {
      e.preventDefault();
      const email = field('email'), password = field('password');
      if (!email || !password) { Utils.toast('Compila email e password', 'err'); return; }
      const reg = ui.mode === 'register';
      if (reg && password.length < 6) { Utils.toast('La password deve avere almeno 6 caratteri', 'err'); return; }
      emailLogin(email, password, reg);
    });
  }

  function field(name) {
    const el = ui.form && ui.form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function toggleMode() {
    ui.mode = ui.mode === 'login' ? 'register' : 'login';
    const reg = ui.mode === 'register';
    if (ui.msg) ui.msg.textContent = reg ? 'Crea il tuo account' : 'Accedi per continuare';
    const submit = ui.form.querySelector('[type="submit"]');
    if (submit) submit.textContent = reg ? '📧 Crea account' : '📧 Accedi';
    const alt = document.getElementById('btn-register');
    if (alt) alt.textContent = reg ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati';
  }

  function show(msgText, canGoOffline) {
    if (!ui.screen) return;
    if (msgText && ui.msg) ui.msg.textContent = msgText;
    const off = document.getElementById('btn-offline');
    if (off) off.hidden = !canGoOffline;
    ui.screen.hidden = false;
    document.body.classList.add('locked');
  }

  function hide() {
    if (ui.screen) ui.screen.hidden = true;
    /* se il blocco password è a sua volta aperto, non tolgo lo sfondo */
    const lock = document.getElementById('lock-screen');
    if (!lock || lock.hidden) document.body.classList.remove('locked');
  }

  /* Schermata breve durante il primo controllo dell'account */
  function bootShow() {
    const b = document.getElementById('boot-screen');
    if (b) { b.hidden = false; document.body.classList.add('locked'); }
  }
  function bootHide() {
    const b = document.getElementById('boot-screen');
    if (b) b.hidden = true;
  }

  return {
    init, uiInit, configured, active, errMsg, isNative,
    show, hide, bootShow, bootHide,
    schedulePush, pushNow, pullMerge, logout, setSync,
    get user() { return user; },
  };
})();
