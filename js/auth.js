/* ===== Resellio — accesso con PIN ===== */
const Auth = (() => {
  const KEY = 'resellio_auth';           // hash del PIN (localStorage, fuori dal backup)
  const SESSION = 'resellio_auth_ok';    // flag di sblocco (sessionStorage: si azzera chiudendo l'app)
  const MIN = 4, MAX = 8;

  /* --- Hash del PIN ---
     Usa SHA-256 quando disponibile; in file:// o WebView vecchie usa un hash semplice.
     Non è sicurezza da banca: serve a tenere fuori mani curiose, e funziona offline. */
  async function hash(pin) {
    const txt = 'resellio-pin:' + pin;
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

  function pinSet() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function unlocked() { try { return sessionStorage.getItem(SESSION) === '1'; } catch (e) { return true; } }
  function unlock() { try { sessionStorage.setItem(SESSION, '1'); } catch (e) { /* niente */ } }

  async function setPin(pin) {
    try { localStorage.setItem(KEY, await hash(pin)); }
    catch (e) { Utils.toast('Impossibile salvare il PIN', 'err'); }
  }
  function removePin() { try { localStorage.removeItem(KEY); } catch (e) { /* niente */ } }
  async function verify(pin) {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { return false; }
    if (!saved) return false;
    return (await hash(pin)) === saved;
  }

  /* --- Schermata di blocco (tastierino numerico) --- */
  let mode = 'unlock';   // unlock | create | confirm
  let buffer = '', firstPin = '', fails = 0, busy = false;
  const el = {};

  function cacheEls() {
    el.screen = document.getElementById('lock-screen');
    el.title = document.getElementById('lock-title');
    el.msg = document.getElementById('lock-msg');
    el.card = el.screen && el.screen.querySelector('.lock-card');
  }

  function setMsg(title, msg) {
    if (el.title) el.title.textContent = title;
    if (el.msg) el.msg.textContent = msg;
  }

  function drawDots() {
    if (!el.screen) return;
    let html = '';
    for (let i = 0; i < MAX; i++) html += `<span class="dot${i < buffer.length ? ' on' : ''}"></span>`;
    el.screen.querySelector('#pin-dots').innerHTML = html;
    const ok = el.screen.querySelector('[data-key="ok"]');
    if (ok) ok.disabled = buffer.length < MIN || busy;
  }

  function shake() {
    if (!el.card) return;
    el.card.classList.remove('shake');
    void el.card.offsetWidth;
    el.card.classList.add('shake');
  }

  function visible() { return !!(el.screen && !el.screen.hidden); }

  function press(k) {
    if (busy || !visible()) return;
    if (k === 'del') { buffer = buffer.slice(0, -1); drawDots(); return; }
    if (k === 'ok') { submit(); return; }
    if (k === 'forgot') { forgot(); return; }
    if (!/^[0-9]$/.test(k) || buffer.length >= MAX) return;
    buffer += k;
    drawDots();
    if (buffer.length === MAX) submit();
  }

  async function submit() {
    if (busy) return;
    if (buffer.length < MIN) { shake(); setMsg(modeMsg().t, `Almeno ${MIN} cifre`); return; }

    if (mode === 'create') {
      firstPin = buffer; buffer = ''; mode = 'confirm';
      setMsg('Conferma il PIN', 'Ripeti le stesse cifre'); drawDots();
      return;
    }

    if (mode === 'confirm') {
      if (buffer !== firstPin) {
        buffer = ''; firstPin = ''; mode = 'create'; drawDots(); shake();
        setMsg('Crea il tuo PIN', 'I due PIN non coincidono: ricomincia');
        return;
      }
      busy = true;
      await setPin(buffer);
      busy = false;
      unlock(); hide();
      updateLockButton();
      Utils.toast('PIN attivo: l\'app ora si sblocca con il tuo PIN 🔒', 'ok');
      return;
    }

    busy = true;
    const okPin = await verify(buffer);
    busy = false;
    buffer = ''; drawDots();
    if (okPin) { fails = 0; unlock(); hide(); return; }
    fails++; shake();
    setMsg('Resellio', 'PIN errato, riprova');
    if (fails >= 3) {
      busy = true; drawDots();
      const sec = Math.min(fails - 2, 5);
      setMsg('Resellio', `Attendi ${sec} secondi…`);
      setTimeout(() => { busy = false; drawDots(); setMsg('Resellio', 'Inserisci il PIN per sbloccare 🔒'); }, sec * 1000);
    }
  }

  function modeMsg() {
    if (mode === 'create') return { t: 'Crea il tuo PIN', m: `Scegli da ${MIN} a ${MAX} cifre` };
    if (mode === 'confirm') return { t: 'Conferma il PIN', m: 'Ripeti le stesse cifre' };
    return { t: 'Resellio', m: 'Inserisci il PIN per sbloccare 🔒' };
  }

  /* PIN dimenticato: l'unica via senza un server è togliere il lock (i dati restano) */
  function forgot() {
    Modals.confirm('Senza un server non posso recuperare il PIN. Vuoi toglierlo e tornare subito dentro? I dati restano al loro posto, ma l\'app tornerà aperta a chiunque usi questo dispositivo.', { okLabel: 'Togli il PIN e entra', danger: true })
      .then(ok => {
        if (!ok) return;
        removePin();
        fails = 0;
        unlock(); hide(); updateLockButton();
        Utils.toast('PIN rimosso. Ne puoi impostare uno nuovo da Impostazioni ⚙️');
      });
  }

  function show(m) {
    cacheEls();
    if (!el.screen) return;
    mode = m || 'unlock';
    buffer = ''; firstPin = ''; busy = false;
    const msg = modeMsg();
    setMsg(msg.t, msg.m);
    el.screen.hidden = false;
    document.body.classList.add('locked');
    drawDots();
  }

  function hide() {
    if (el.screen) el.screen.hidden = true;
    document.body.classList.remove('locked');
  }

  function updateLockButton() {
    const b = document.getElementById('btn-lock');
    if (b) b.hidden = !pinSet();
  }

  function onKey(e) {
    if (!visible()) return;
    if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { press('del'); e.preventDefault(); }
    else if (e.key === 'Enter') { press('ok'); e.preventDefault(); }
  }

  function start() {
    cacheEls();
    if (el.screen) {
      el.screen.addEventListener('click', e => {
        const b = e.target.closest('[data-key]');
        if (b) press(b.dataset.key);
      });
      document.addEventListener('keydown', onKey);
    }
    updateLockButton();
  }

  /* Ingresso quando NON c'è l'account online (Firebase non configurato): PIN a ogni apertura */
  function entry() {
    if (pinSet() && !unlocked()) show('unlock');
  }

  return {
    start, entry, pinSet, unlocked, unlock, updateLockButton,
    hideLock() { hide(); },
    lock() { fails = 0; show('unlock'); },
    startSetup() { fails = 0; show('create'); },
    remove() { removePin(); updateLockButton(); },
  };
})();
