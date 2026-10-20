/* ===== Resellio — app: router ed eventi ===== */
const App = (() => {
  const { esc, num } = Utils;

  const VIEWS = {
    dashboard:  { title: 'Dashboard',            render: () => Views.dashboard() },
    inventory:  { title: 'Inventario',           render: () => Views.inventory() },
    calculator: { title: 'Prezzi & profitti',    render: () => Views.calculator() },
    sales:      { title: 'Vendite',              render: () => Views.sales() },
    shopping:   { title: 'Lista acquisti',       render: () => Views.shopping() },
    scouting:   { title: 'Caccia occasioni',     render: () => Views.scouting() },
    generator:  { title: 'Genera annuncio',      render: () => Views.generator() },
  };

  const ui = { view: 'dashboard', inv: { q: '', stato: 'tutti', fonte: 'tutte', sort: 'recenti' }, salesPeriod: '6mesi' };

  function go(view) {
    if (!VIEWS[view]) view = 'dashboard';
    if (location.hash !== '#/' + view) location.hash = '#/' + view;
    else render();
  }

  function currentView() {
    const v = (location.hash || '').replace(/^#\/?/, '');
    return VIEWS[v] ? v : 'dashboard';
  }

  function render() {
    ui.view = currentView();
    const el = document.getElementById('view');
    document.getElementById('page-title').textContent = VIEWS[ui.view].title;
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === ui.view));
    el.innerHTML = VIEWS[ui.view].render();
    el.classList.remove('enter');
    void el.offsetWidth;
    el.classList.add('enter');
    if (ui.view === 'calculator') Calc.update();
    if (ui.view === 'generator') AdGen.update();
  }

  function refresh() { render(); }
  function refreshInvList() {
    const el = document.getElementById('inv-list');
    if (el) el.innerHTML = Views.inventoryList();
  }
  function refreshScoutResults() {
    const el = document.getElementById('scout-results');
    if (el) el.innerHTML = Views.scoutResults();
  }

  /* --- Recupero automatico annunci da Vinted --- */
  async function scoutFetch() {
    const form = document.getElementById('scout-form');
    const status = document.getElementById('scout-status');
    const btn = document.getElementById('scout-fetch-btn');
    const val = Utils.formValues(form);
    const q = String(val.q || '').trim() || Scout.searchTextFromUrl(val.sourceUrl);
    if (!q) { Utils.toast('Scrivi cosa vuoi cercare (o incolla un URL di ricerca Vinted)', 'err'); return; }
    Store.saveScout({ q, sourceUrl: String(val.sourceUrl || '').trim(), resale: val.resale, marginPct: val.marginPct });
    btn.disabled = true;
    status.innerHTML = '<div class="scout-loading">⏳ Cerco su Vinted…</div>';
    let items = null;
    try {
      items = await Scout.fetchResults(q, val.sourceUrl, msg => {
        status.innerHTML = `<div class="scout-loading">⏳ ${esc(msg)}</div>`;
      });
    } catch (e) { items = null; }
    btn.disabled = false;
    if (items && items.length) {
      Store.saveScout({ results: items });
      status.innerHTML = '';
      refreshScoutResults();
      Utils.toast(`${items.length} annunci trovati e valutati 🔎`, 'ok');
    } else {
      status.innerHTML = `<div class="scout-warning">⚠️ Vinted blocca il recupero automatico dei risultati dal browser.<br>
        È normale! Incolla qui sotto i risultati copiati dalla ricerca: li analizzo lo stesso 👇</div>`;
      const paste = document.getElementById('scout-paste');
      if (paste) { paste.focus(); paste.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
  }

  /* --- Delegazione globale click --- */
  function onClick(e) {
    const viewEl = e.target.closest('[data-view]');
    if (viewEl) { go(viewEl.dataset.view); return; }
    const aEl = e.target.closest('[data-action]');
    if (!aEl) return;
    const a = aEl.dataset.action;
    const id = aEl.dataset.id;

    switch (a) {
      case 'close-modal': Modals.close(); break;

      case 'add-item': Modals.item(null); break;
      case 'edit-item': Modals.item(id); break;
      case 'sell-item': e.stopPropagation(); Modals.sell(id); break;
      case 'reopen-item':
        Store.reopen(id);
        Utils.toast('Articolo rimesso in vendita ↩️', 'ok');
        refresh();
        break;
      case 'delete-item':
        Modals.confirm('Eliminare definitivamente questo articolo?').then(ok => {
          if (!ok) return;
          Store.deleteItem(id);
          Modals.close();
          Utils.toast('Articolo eliminato');
          refresh();
        });
        break;

      case 'add-deal': Modals.deal(null); break;
      case 'edit-deal': Modals.deal(id); break;
      case 'delete-deal':
        Modals.confirm('Eliminare questa opportunità dalla lista?').then(ok => {
          if (!ok) return;
          Store.deleteDeal(id);
          Utils.toast('Opportunità eliminata');
          refresh();
        });
        break;
      case 'deal-status': {
        Store.updateDeal(id, { stato: aEl.dataset.status });
        refresh();
        break;
      }
      case 'deal-to-item': {
        const d = Store.getDeal(id);
        if (!d) break;
        if (d.stato === 'acquistato') { Utils.toast('Questo articolo è già in inventario'); break; }
        Modals.item(null, {
          dealId: id,
          prefill: {
            nome: d.nome, brand: d.brand || '', fonte: d.fonte,
            prezzoAcquisto: d.prezzoMax || d.prezzoRichiesto || '',
            prezzoVendita: d.prezzoVenditaAtteso || '',
            dataAcquisto: Utils.today(), stato: 'da_fotografare',
          },
        });
        break;
      }

      case 'inv-status': {
        ui.inv.stato = aEl.dataset.status;
        const chips = aEl.closest('.chips');
        if (chips) chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === aEl));
        refreshInvList();
        break;
      }

      case 'open-link': {
        const href = aEl.dataset.href;
        if (href) window.open(href, '_blank', 'noopener');
        break;
      }

      case 'copy': {
        if (aEl.dataset.copyText != null) Utils.copyText(aEl.dataset.copyText);
        else if (aEl.dataset.copyTarget) {
          const t = document.querySelector(aEl.dataset.copyTarget);
          if (t) Utils.copyText(t.textContent);
        }
        break;
      }

      case 'calc-to-item':
        Modals.item(null, {
          prefill: {
            prezzoAcquisto: aEl.dataset.costo,
            costiAcquisto: aEl.dataset.extra,
            prezzoVendita: Math.round(num(aEl.dataset.prezzo) * 100) / 100,
            stato: 'da_fotografare',
            dataAcquisto: Utils.today(),
          },
        });
        break;

      case 'scout-fetch':
        scoutFetch();
        break;
      case 'scout-parse': {
        const ta = document.getElementById('scout-paste');
        const parsed = Scout.parsePasted(ta ? ta.value : '');
        if (!parsed.length) {
          Utils.toast('Non ho trovato prezzi nel testo: incolla righe con titolo e prezzo', 'err');
          break;
        }
        Store.saveScout({ results: parsed });
        refreshScoutResults();
        Utils.toast(`${parsed.length} annunci analizzati 🔎`, 'ok');
        break;
      }
      case 'scout-clear':
        Store.saveScout({ results: [] });
        Utils.toast('Risultati svuotati');
        render();
        break;
      case 'scout-deal': {
        const res = Store.state.scout.results.find(r => String(r.id) === aEl.dataset.id);
        if (!res) break;
        const ctx = Store.scoutCtx();
        Modals.deal(null, {
          nome: res.taglia ? `${res.titolo} (${res.taglia})` : res.titolo,
          brand: res.brand, fonte: 'vinted',
          prezzoRichiesto: res.prezzo,
          prezzoVenditaAtteso: ctx.resale || '',
          link: res.url || '',
        });
        break;
      }

      case 'settings': Modals.settings(); break;

      case 'lock-app':
        Modals.close();
        Auth.lock();
        break;
      case 'close-offline':
        Cloud.hide();
        Auth.hideLock();
        Cloud.show();
        break;
      case 'sync-now':
        Modals.close();
        Cloud.pushNow().then(ok => { if (ok) Utils.toast('Backup online aggiornato ☁️', 'ok'); });
        break;
      case 'logout':
        Modals.close();
        Cloud.logout();
        break;
      case 'pin-setup':
        Modals.close();
        Auth.startSetup();
        break;
      case 'pin-remove':
        Modals.confirm('Togliere il PIN? Chiunque usi questo dispositivo potrà aprire l\'app e vedere tutti i dati.', { okLabel: 'Togli il PIN' }).then(ok => {
          if (!ok) return;
          Auth.remove();
          Utils.toast('PIN rimosso');
        });
        break;

      case 'export':
        Utils.download('resellio-backup-' + Utils.today() + '.json', Store.exportJSON());
        Utils.toast('Backup scaricato ⬇️', 'ok');
        break;
      case 'import': document.getElementById('import-file').click(); break;
      case 'reset-data':
        Modals.confirm('Svuotare TUTTI i dati (inventario, vendite, lista acquisti)? Consiglia di esportare prima un backup.', { okLabel: 'Svuota tutto' }).then(ok => {
          if (!ok) return;
          Store.reset();
          Modals.close();
          Utils.toast('Dati azzerati');
          refresh();
        });
        break;
      case 'load-sample':
        Modals.confirm('Caricare i dati di esempio? Vengono aggiunti a quelli esistenti.', { danger: false, okLabel: 'Carica esempio' }).then(ok => {
          if (!ok) return;
          Store.seedSample();
          Modals.close();
          Utils.toast('Dati di esempio caricati ✨', 'ok');
          refresh();
        });
        break;
    }
  }

  /* --- Input / change globali --- */
  function onInput(e) {
    if (e.target.closest('#calc-form')) { Calc.update(); return; }
    if (e.target.closest('#gen-form')) { AdGen.update(); return; }
    if (e.target.closest('#scout-form')) {
      const val = Utils.formValues(e.target.closest('#scout-form'));
      Store.saveScout({ q: val.q, sourceUrl: val.sourceUrl, resale: val.resale, marginPct: val.marginPct });
      refreshScoutResults();
      return;
    }
    if (e.target.matches('[data-filter="q"]')) {
      ui.inv.q = e.target.value;
      refreshInvList();
    }
  }

  function onChange(e) {
    const t = e.target;
    if (t.closest('#calc-form')) Calc.update();
    if (t.closest('#gen-form')) AdGen.update();
    if (t.matches('[data-filter="fonte"]')) { ui.inv.fonte = t.value; refreshInvList(); }
    if (t.matches('[data-filter="sort"]')) { ui.inv.sort = t.value; refreshInvList(); }
    if (t.matches('[data-filter="sales-period"]')) { ui.salesPeriod = t.value; render(); }
    if (t.id === 'import-file' && t.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          Store.importJSON(String(reader.result));
          Utils.toast('Backup importato ✓', 'ok');
          refresh();
        } catch (err) {
          Utils.toast('File di backup non valido', 'err');
        }
        t.value = '';
      };
      reader.readAsText(t.files[0]);
    }
  }

  function start() {
    Store.load();
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') Modals.close(); });
    window.addEventListener('hashchange', render);
    window.addEventListener('online', () => { if (Cloud.user) Cloud.pullMerge(); });
    if (!location.hash) location.hash = '#/dashboard';
    render();
    Auth.start();
    Cloud.uiInit();
    if (Cloud.configured()) Cloud.bootShow();
    if (!Cloud.init(onAuthState)) Auth.entry();   // Firebase non configurato → solo PIN
    registerSW();
  }

  /* Come si apre l'app: account online ricordato, altrimenti login, oppure PIN se offline */
  function onAuthState(user) {
    Cloud.bootHide();
    if (user) {
      Auth.hideLock();
      Cloud.hide();
      Auth.updateLockButton();
      Cloud.pullMerge();
      return;
    }
    if (!Cloud.active()) { Auth.entry(); return; }
    if (!navigator.onLine && Auth.pinSet()) { Auth.lock(); return; }
    Cloud.show(navigator.onLine ? 'Accedi per continuare' : 'Serve internet per la prima connessione', Auth.pinSet());
  }

  /* --- PWA: service worker per funzionare offline e installare su Android --- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    // da file:// non può funzionare: serve un indirizzo http(s)
    if (!/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline non disponibile: l'app funziona comunque */
    });
  }

  return { ui, go, render, refresh, start };
})();

App.start();
