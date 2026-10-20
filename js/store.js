/* ===== Resellio — stato e persistenza ===== */
const Store = (() => {
  const KEY = 'resellio_v1';

  const STATI = {
    da_fotografare: { label: 'Da fotografare', emoji: '📸', cls: 'b-foto' },
    da_pubblicare:  { label: 'Da pubblicare',  emoji: '✍️', cls: 'b-draft' },
    in_vendita:     { label: 'In vendita',     emoji: '🛍️', cls: 'b-live' },
    venduto:        { label: 'Venduto',        emoji: '💰', cls: 'b-sold' },
  };
  const FONTI = {
    vinted: 'Vinted',
    privato: 'Venditore privato',
    mercatino: 'Mercatino / Thrift',
    liquidazione: 'Liquidazione',
    altro: 'Altro',
  };
  const CONDIZIONI = ['Nuovo con etichetta', 'Nuovo senza etichetta', 'Come nuovo', 'Buono stato', 'Discreto stato'];
  const CATEGORIE = ['T-shirt', 'Felpa', 'Camicia', 'Pantalone', 'Jeans', 'Gonna', 'Vestito', 'Giacca', 'Giubbotto', 'Abito da sera', 'Sportswear', 'Scarpe', 'Borsa', 'Cappello', 'Sciarpa', 'Accessorio', 'Altro'];

  const DEAL_STATI = {
    da_contattare: { label: '📞 Da contattare', cls: '' },
    trattativa:    { label: '🤝 In trattativa', cls: '' },
    acquistato:    { label: '✅ Acquistato', cls: '' },
    scartato:      { label: '❌ Scartato', cls: '' },
  };

  const defaults = () => ({
    version: 1,
    items: [],
    deals: [],
    scout: { q: '', sourceUrl: '', resale: 0, marginPct: null, results: [] },
    settings: {
      commissionPct: 0,
      defaultMarginPct: 40,
      roundMode: '99',
      shippingNote: 'Spedisco entro 24/48h con imballaggio curato 📦',
    },
  });

  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : defaults();
      if (!state || typeof state !== 'object') state = defaults();
      state.items = Array.isArray(state.items) ? state.items : [];
      state.deals = Array.isArray(state.deals) ? state.deals : [];
      state.scout = state.scout && typeof state.scout === 'object' ? state.scout : defaults().scout;
      state.scout.results = Array.isArray(state.scout.results) ? state.scout.results : [];
      state.settings = Object.assign(defaults().settings, state.settings || {});
    } catch (e) {
      state = defaults();
    }
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      Utils.toast('Spazio esaurito: elimina alcune foto o esporta un backup', 'err');
      return false;
    }
  }

  /* --- Articoli --- */
  function getItem(id) { return state.items.find(i => i.id === id) || null; }
  function addItem(data) {
    const item = Object.assign({ id: Utils.uid() }, data);
    state.items.unshift(item);
    save();
    return item;
  }
  function updateItem(id, patch) {
    const it = getItem(id);
    if (!it) return null;
    Object.assign(it, patch);
    save();
    return it;
  }
  function deleteItem(id) {
    state.items = state.items.filter(i => i.id !== id);
    state.deals.forEach(d => { if (d.itemId === id) { d.itemId = null; } });
    save();
  }
  function markSold(id, { prezzoVenduto, dataVendita, costiVendita }) {
    return updateItem(id, {
      stato: 'venduto',
      prezzoVenduto: Utils.num(prezzoVenduto),
      dataVendita: dataVendita || Utils.today(),
      costiVendita: Utils.num(costiVendita),
    });
  }
  function reopen(id) {
    return updateItem(id, { stato: 'in_vendita', prezzoVenduto: 0, dataVendita: '', costiVendita: 0 });
  }

  /* --- Lista acquisti (deal) --- */
  function getDeal(id) { return state.deals.find(d => d.id === id) || null; }
  function addDeal(data) {
    const deal = Object.assign({ id: Utils.uid(), dataCreazione: Utils.today(), stato: 'da_contattare', priorita: 'media' }, data);
    state.deals.unshift(deal);
    save();
    return deal;
  }
  function updateDeal(id, patch) {
    const d = getDeal(id);
    if (!d) return null;
    Object.assign(d, patch);
    save();
    return d;
  }
  function deleteDeal(id) {
    state.deals = state.deals.filter(d => d.id !== id);
    save();
  }

  /* --- Calcoli --- */
  function num(v) { return Utils.num(v); }
  function cost(it) { return num(it.prezzoAcquisto) + num(it.costiAcquisto); }
  function feeFor(it, price) {
    const pct = it.commissionePct != null ? num(it.commissionePct) : num(state.settings.commissionPct);
    return price * pct / 100;
  }
  function profit(it) {
    if (it.stato === 'venduto') {
      const p = num(it.prezzoVenduto);
      return p - cost(it) - num(it.costiVendita) - feeFor(it, p);
    }
    const p = num(it.prezzoVendita);
    if (!p) return 0;
    return p - cost(it) - feeFor(it, p);
  }
  function hasTarget(it) { return it.stato !== 'venduto' && num(it.prezzoVendita) > 0; }

  /* --- Statistiche dashboard --- */
  function dashboardStats() {
    const items = state.items;
    const mk = Utils.currentMonthKey();
    let monthProfit = 0, monthSales = 0, monthRevenue = 0;
    items.forEach(i => {
      if (i.stato === 'venduto' && Utils.monthKey(i.dataVendita) === mk) {
        monthProfit += profit(i);
        monthSales++;
        monthRevenue += num(i.prezzoVenduto);
      }
    });
    const potential = items.filter(hasTarget).reduce((s, i) => s + profit(i), 0);
    const invested = items.filter(i => i.stato !== 'venduto').reduce((s, i) => s + cost(i), 0);
    const activeCount = items.filter(i => i.stato !== 'venduto').length;
    const soldCount = items.filter(i => i.stato === 'venduto').length;

    const keys = Utils.lastMonthKeys(6);
    const months = keys.map(k => {
      let prof = 0, rev = 0;
      items.forEach(i => {
        if (i.stato === 'venduto' && Utils.monthKey(i.dataVendita) === k) {
          prof += profit(i); rev += num(i.prezzoVenduto);
        }
      });
      return { key: k, label: Utils.monthLabel(k), profit: prof, revenue: rev };
    });

    const statusCounts = {};
    Object.keys(STATI).forEach(s => { statusCounts[s] = 0; });
    items.forEach(i => { if (statusCounts[i.stato] != null) statusCounts[i.stato]++; });

    return { monthProfit, monthSales, monthRevenue, potential, invested, activeCount, soldCount, months, statusCounts };
  }

  function soldSorted() {
    return state.items.filter(i => i.stato === 'venduto')
      .slice().sort((a, b) => String(b.dataVendita || '').localeCompare(String(a.dataVendita || '')));
  }

  /* --- Caccia occasioni: stato e contesto valutazione --- */
  function saveScout(patch) {
    Object.assign(state.scout, patch);
    save();
  }
  function scoutCtx() {
    const s = state.scout;
    return {
      resale: num(s.resale),
      feePct: num(state.settings.commissionPct),
      marginPct: s.marginPct != null && s.marginPct !== '' ? num(s.marginPct) : num(state.settings.defaultMarginPct),
    };
  }

  /* --- Dati di esempio --- */
  function seedSample() {
    const d = s => Utils.daysAgo(s);
    [
      { nome: 'Felpa Carhartt WIP', brand: 'Carhartt', categoria: 'Felpa', taglia: 'L', colore: 'Nero', materiale: 'Felpa di cotone', condizione: 'Come nuovo', fonte: 'vinted', stato: 'in_vendita', prezzoAcquisto: 14, costiAcquisto: 0, costiVendita: 0, prezzoVendita: 39.99, dataAcquisto: d(18), link: '', note: '' },
      { nome: 'Sneakers New Balance 574', brand: 'New Balance', categoria: 'Scarpe', taglia: '42', colore: 'Grigio', materiale: 'Suede e tessuto', condizione: 'Buono stato', fonte: 'privato', stato: 'da_pubblicare', prezzoAcquisto: 22, costiAcquisto: 4, costiVendita: 0, prezzoVendita: 54.99, dataAcquisto: d(9), link: '', note: 'Pulite, suole poco usate' },
      { nome: "Jeans Levi's 501", brand: "Levi's", categoria: 'Jeans', taglia: '40', colore: 'Blu scuro', materiale: 'Denim', condizione: 'Buono stato', fonte: 'mercatino', stato: 'da_fotografare', prezzoAcquisto: 9.5, costiAcquisto: 0, costiVendita: 0, prezzoVendita: 0, dataAcquisto: d(4), link: '', note: '' },
      { nome: 'Giacca The North Face', brand: 'The North Face', categoria: 'Giacca', taglia: 'M', colore: 'Verde militare', materiale: 'Softshell', condizione: 'Come nuovo', fonte: 'vinted', stato: 'venduto', prezzoAcquisto: 25, costiAcquisto: 0, costiVendita: 2, prezzoVendita: 75, prezzoVenduto: 75, dataAcquisto: d(40), dataVendita: d(6), link: '', note: '' },
      { nome: 'Vestito Zara', brand: 'Zara', categoria: 'Vestito', taglia: 'S', colore: 'Nero', materiale: 'Viscosa', condizione: 'Come nuovo', fonte: 'privato', stato: 'venduto', prezzoAcquisto: 6, costiAcquisto: 0, costiVendita: 0, prezzoVendita: 24.9, prezzoVenduto: 24.9, dataAcquisto: d(55), dataVendita: d(34), link: '', note: '' },
    ].forEach(i => addItem(i));

    [
      { nome: 'Felpa gommata Essentials', brand: 'Essentials', fonte: 'vinted', prezzoRichiesto: 18, prezzoMax: 20, prezzoVenditaAtteso: 45, priorita: 'alta', stato: 'trattativa', contatto: '@user_vx', link: '', note: 'Trattativa in corso, vuole 20€' },
      { nome: 'Lotto 10 t-shirt vintage', brand: '', fonte: 'privato', prezzoRichiesto: 25, prezzoMax: 30, prezzoVenditaAtteso: 70, priorita: 'media', stato: 'da_contattare', contatto: 'Sara — mercatino domenica', link: '', note: '' },
    ].forEach(d0 => addDeal(d0));

    save();
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }
  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.items)) throw new Error('Formato backup non valido');
    state = Object.assign(defaults(), data);
    state.settings = Object.assign(defaults().settings, data.settings || {});
    save();
  }
  function reset() {
    state = defaults();
    save();
  }

  return {
    get state() { return state; },
    STATI, FONTI, CONDIZIONI, CATEGORIE, DEAL_STATI,
    load, save, seedSample, exportJSON, importJSON, reset,
    getItem, addItem, updateItem, deleteItem, markSold, reopen,
    getDeal, addDeal, updateDeal, deleteDeal,
    saveScout, scoutCtx,
    cost, feeFor, profit, hasTarget, dashboardStats, soldSorted,
  };
})();
