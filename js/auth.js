/* ===== Resellio — blocco con password ===== */
const Auth = (() => {
  const KEY = 'resellio_auth';           // hash della password (localStorage, fuori dal backup)
  const SESSION = 'resellio_auth_ok';    // sblocco (sessionStorage: si azzera chiudendo l'app)
  const MIN = 4;

  /* --- Hash della password ---
     SHA-256 quando disponibile; in file:// o WebView vecchie un hash semplice.
     Non è sicurezza da banca: serve a tenere fuori mani curiose, e funziona offline. */
  async function hash(pw) {
    const txt = 'resellio-pw:' + pw;
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* fallback sotto */ }
    let h = 5381;
    for (let i = 0; i < txt.length; i++) h = ((h * 33) ^ txt.charCodeAt(i)) >>> 0;
    return 'f' + h.toString(16);
  }

  function lockSet() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function unlocked() { try { return sessionStorage.getItem(SESSION) === '1'; } catch (e) { return true; } }
  function unlock() { try { sessionStorage.setItem(SESSION, '1'); } catch (e) { /* niente */ } }

  async function setLock(pw) {
    try { localStorage.setItem(KEY, await hash(pw)); return true; }
    catch (e) { Utils.toast('Impossibile salvare la password', 'err'); return false; }
  }
  function removeLock() { try { localStorage.removeItem(KEY); } catch (e) { /* niente */ } }
  async function verify(pw) {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { return false; }
    if (!saved) return false;
    return (await hash(pw)) === saved;
  }

  /* --- Schermata di blocco --- */
  let mode = 'unlock';   // unlock | create | confirm
  let input = '', first = '', fails = 0, busy = false;
  const el = {};

  function cacheEls() {
    el.screen = document.getElementById('lock-screen');
    el.title = document.getElementById('lock-title');
    el.msg = document.getElementById('lock-msg');
    el.pw = document.getElementById('lock-pw');
    el.alt = document.getElementById('lock-alt');
    el.card = el.screen && el.screen.querySelector('.lock-card');
  }

  function setMsg(title, msg) {
    if (el.title) el.title.textContent = title;
    if (el.msg) el.msg.textContent = msg;
  }

  function visible() { return !!(el.screen && !el.screen.hidden); }

  function shake() {
    if (!el.card) return;
    el.card.classList.remove('shake');
    void el.card.offsetWidth;
    el.card.classList.add('shake');
  }

  function modeMsg() {
    if (mode === 'create') return { t: 'Crea la tua password', m: `Almeno ${MIN} caratteri` };
    if (mode === 'confirm') return { t: 'Conferma la password', m: 'Ripeti la stessa password' };
    return { t: 'Resellio', m: 'Inserisci la password per entrare 🔒' };
  }

  async function submit() {
    if (busy) return;
    const val = el.pw ? el.pw.value : '';
    if (val.length < MIN) {
      shake(); setMsg(modeMsg().t, `Almeno ${MIN} caratteri`);
      if (el.pw) el.pw.focus();
      return;
    }

    if (mode === 'create') {
      first = val;
      if (el.pw) { el.pw.value = ''; el.pw.focus(); }
      mode = 'confirm';
      setMsg(modeMsg().t, modeMsg().m);
      return;
    }

    if (mode === 'confirm') {
      if (val !== first) {
        input = ''; first = ''; mode = 'create';
        if (el.pw) { el.pw.value = ''; el.pw.focus(); }
        shake();
        setMsg('Crea la tua password', 'Le due password non coincidono: ricomincia');
        return;
      }
      busy = true;
      await setLock(val);
      busy = false;
      if (el.pw) el.pw.value = '';
      unlock();
      hide();
      updateLockButton();
      Utils.toast('Password attiva: l\'app ora si apre solo con quella 🔒', 'ok');
      return;
    }

    /* sblocco */
    busy = true;
    const ok = await verify(val);
    busy = false;
    if (el.pw) el.pw.value = '';
    if (ok) { fails = 0; unlock(); hide(); return; }
    fails++; shake();
    setMsg('Resellio', 'Password errata, riprova');
    if (el.pw) el.pw.focus();
    if (fails >= 3) {
      busy = true;
      const sec = Math.min(fails - 2, 5);
      setMsg('Resellio', `Attendi ${sec} secondi…`);
      setTimeout(() => { busy = false; setMsg('Resellio', 'Inserisci la password per entrare 🔒'); }, sec * 1000);
    }
  }

  function forgot() {
    Modals.confirm('Senza un server non posso recuperare la password. Vuoi toglierla e tornare subito dentro? I dati restano al loro posto, ma l\'app tornerà aperta a chiunque usi questo dispositivo.', { okLabel: 'Togli la password e entra' })
      .then(ok => {
        if (!ok) return;
        removeLock();
        fails = 0;
        unlock();
        hide();
        updateLockButton();
        Utils.toast('Password rimossa. Ne puoi impostare una nuova da Impostazioni ⚙️');
      });
  }

  /* La schermata può essere condivisa con l'accesso online: lì ho già la mia X */
  function syncAlt() {
    if (!el.alt) return;
    const acc = (typeof Cloud !== 'undefined' && Cloud.active() && !Cloud.user);
    el.alt.hidden = (mode === 'unlock') && acc;   // con l'account c'è "Accedi con l'account"
  }

  function show(m) {
    cacheEls();
    if (!el.screen) return;
    mode = m || 'unlock';
    input = ''; first = ''; busy = false;
    if (el.pw) el.pw.value = '';
    const msg = modeMsg();
    setMsg(msg.t, msg.m);
    if (el.pw) el.pw.setAttribute('placeholder', mode === 'unlock' ? 'Password' : 'Nuova password');
    el.screen.hidden = false;
    document.body.classList.add('locked');
    syncAlt();
    if (el.pw) setTimeout(() => el.pw.focus(), 80);
  }

  function hide() {
    if (el.screen) el.screen.hidden = true;
    if (!(typeof Cloud !== 'undefined' && Cloud.active() && !Cloud.user)) {
      document.body.classList.remove('locked');
    }
  }

  function updateLockButton() {
    const b = document.getElementById('btn-lock');
    if (b) b.hidden = !lockSet();
  }

  function start() {
    cacheEls();
    if (el.screen) {
      el.screen.addEventListener('click', e => {
        if (e.target.closest('#lock-forgot')) { forgot(); return; }
      });
      const form = document.getElementById('lock-form');
      if (form) {
        form.addEventListener('submit', e => { e.preventDefault(); submit(); });
      }
    }
    updateLockButton();
  }

  /* Ingresso quando NON c'è l'account online: password a ogni apertura */
  function entry() {
    if (lockSet() && !unlocked()) show('unlock');
  }

  return {
    start, entry, lockSet, unlocked, unlock, updateLockButton,
    hideLock() { hide(); },
    lock() { fails = 0; show('unlock'); },
    startSetup() { fails = 0; show('create'); },
    remove() { removeLock(); updateLockButton(); },
  };
})();
