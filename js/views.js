/* ===== Resellio — viste ===== */
const Views = (() => {
  const { esc, money, fmtDate, num } = Utils;

  /* --- pezzi condivisi --- */
  function statusBadge(stato) {
    const s = Store.STATI[stato] || { label: stato, emoji: '', cls: 'b-gray' };
    return `<span class="badge ${s.cls}">${s.emoji} ${esc(s.label)}</span>`;
  }
  function sourceBadge(fonte) {
    return `<span class="badge b-gray">${esc(Store.FONTI[fonte] || '—')}</span>`;
  }
  const CAT_ICON = { Scarpe: '👟', Borsa: '👜', Cappello: '🧢', Jeans: '👖', Pantalone: '👖', Gonna: '👗', Vestito: '👗', 'Abito da sera': '👗', Giacca: '🧥', Giubbotto: '🧥', Felpa: '👕', 'T-shirt': '👕', Camicia: '👕' };
  function photo(it) {
    if (it.foto) return `<img src="${it.foto}" alt="${esc(it.nome)}" loading="lazy">`;
    return `<span>${CAT_ICON[it.categoria] || '🧺'}</span>`;
  }

  /* --- dashboard --- */
  function dashboard() {
    const st = Store.state;
    if (!st.items.length && !st.deals.length) {
      return `<div class="card welcome">
        <div class="welcome-emoji">🏷️</div>
        <h2>Benvenuto in Resellio</h2>
        <p>Il tuo gestionale per comprare, prezziare e vendere su Vinted: inventario, calcolo prezzi, vendite, lista acquisti e annunci pronti. Tutto salvato solo sul tuo dispositivo.</p>
        <div class="welcome-actions">
          <button class="btn btn-primary" data-action="add-item">＋ Aggiungi il primo articolo</button>
          <button class="btn btn-ghost" data-action="load-sample">✨ Vedi un esempio</button>
        </div>
      </div>`;
    }
    const d = Store.dashboardStats();
    const recent = [...st.items].sort((a, b) => String(b.dataAcquisto || '').localeCompare(String(a.dataAcquisto || ''))).slice(0, 4);
    const targetActive = st.items.filter(i => i.stato !== 'venduto' && Store.hasTarget(i));
    const segTot = Math.max(1, Object.values(d.statusCounts).reduce((a, b) => a + b, 0));
    const bar = segTot ? Math.min(100, Math.round((d.statusCounts.in_vendita || 0) / segTot * 100)) : 0;

    const itemRow = i => {
      const attivo = i.stato !== 'venduto';
      const prof = Store.profit(i);
      const prezzo = attivo ? num(i.prezzoVendita) : num(i.prezzoVenduto);
      const icon = CAT_ICON[i.categoria] || '🧺';
      const right = attivo
        ? (prezzo ? `<div class="it-right"><span>${money(prezzo)}</span></div>` : `<div class="it-right"><span>—</span></div>`)
        : `<div class="it-right"><b class="up">+${money(prof)}</b><span>${money(prezzo)}</span></div>`;
      return `<div class="item" data-action="edit-item" data-id="${esc(i.id)}">
        <div class="av">${i.foto ? `<img src="${esc(i.foto)}" alt="">` : icon}</div>
        <div class="it-txt"><b>${esc(i.nome)}</b><span>${Store.STATI[i.stato] ? Store.STATI[i.stato].label : (attivo ? 'In vendita' : 'Venduto')}</span></div>
        ${right}
      </div>`;
    };

    return `
    <div class="kpi reveal">
      <span class="label">Guadagno questo mese</span>
      <b class="${d.monthProfit >= 0 ? 'up' : 'down'}">${money(d.monthProfit)}</b>
      <span class="sub">${d.monthSales} vendite · ${money(d.monthRevenue)} di ricavi</span>
      <div class="bar"><i style="width:${bar}%"></i></div>
    </div>

    <div class="row3 reveal" style="margin-top:11px">
      <div class="mini"><span class="label">Investito</span><b>${money(d.invested)}</b></div>
      <div class="mini"><span class="label">Potenziale</span><b class="up">${money(d.potential)}</b></div>
      <div class="mini"><span class="label">Venduti</span><b>${d.soldCount}</b></div>
    </div>

    <div class="sec reveal">Ultimi movimenti <span class="more" data-view="inventory">Tutti ›</span></div>
    <div class="list">
      ${recent.length ? recent.map(itemRow).join('') : `<div class="item"><div class="av">🧺</div><div class="it-txt"><b>Nessun articolo</b><span>Aggiungi il tuo primo capo</span></div></div>`}
    </div>

    <div class="center"><button class="fab" data-action="add-item">＋</button></div>`;
  }

  /* --- inventario --- */
  function invCounts() {
    const c = { tutti: Store.state.items.length };
    Object.keys(Store.STATI).forEach(k => { c[k] = Store.state.items.filter(i => i.stato === k).length; });
    return c;
  }

  function inventory() {
    const c = invCounts();
    const chips = [['tutti', '✓ Tutti', ''], ...Object.keys(Store.STATI).map(k => [k, `${Store.STATI[k].emoji} ${Store.STATI[k].label}`, k])]
      .map(([v, l]) => `<button class="chip ${App.ui.inv.stato === v ? 'on' : ''}" data-action="inv-status" data-status="${v}">${l}${v === 'tutti' ? '' : ` (${c[v] ?? 0})`}</button>`).join('');
    return `
    <div style="display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 0 14px">
      ${chips}
    </div>
    <div id="inv-list">${inventoryList()}</div>
    <div class="center"><button class="fab" data-action="add-item">＋</button></div>`;
  }

  function filteredItems() {
    const f = App.ui.inv;
    let list = Store.state.items.slice();
    if (f.stato !== 'tutti') list = list.filter(i => i.stato === f.stato);
    if (f.fonte !== 'tutte') list = list.filter(i => i.fonte === f.fonte);
    if (f.q) {
      const q = f.q.toLowerCase();
      list = list.filter(i => [i.nome, i.brand, i.taglia, i.colore, i.categoria, i.note].join(' ').toLowerCase().includes(q));
    }
    if (f.sort === 'prezzo') list.sort((a, b) => (num(b.prezzoVendita) || num(b.prezzoVenduto)) - (num(a.prezzoVendita) || num(a.prezzoVenduto)));
    else if (f.sort === 'nome') list.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'it'));
    else list.sort((a, b) => String(b.dataAcquisto || '').localeCompare(String(a.dataAcquisto || '')));
    return list;
  }

  function itemCard(it) {
    const attivo = it.stato !== 'venduto';
    const prof = Store.profit(it);
    const prezzo = attivo ? num(it.prezzoVendita) : num(it.prezzoVenduto);
    const st = Store.STATI[it.stato] || {};
    const badge = `<span class="badge">${st.emoji ? `<span>${st.emoji}</span>` : (attivo ? '<span class="dot-live"></span>' : '')} ${esc(st.label || it.stato)}</span>`;
    const icon = CAT_ICON[it.categoria] || '🧺';
    return `
    <article class="card reveal item-card ${attivo ? '' : 'is-sold'}" data-action="edit-item" data-id="${esc(it.id)}">
      <div class="thumb item-photo">${it.foto ? `<img src="${esc(it.foto)}" alt="${esc(it.nome)}">` : icon}${badge}</div>
      <div class="inv-body item-body">
        <div class="nm item-name">${esc(it.nome)}</div>
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">
          <div class="price">${prezzo ? money(prezzo) : '—'}</div>
          ${attivo && prof > 0 ? `<div class="gain">+${money(prof)}</div>` : (!attivo && prof > 0 ? `<div class="gain">+${money(prof)}</div>` : '')}
        </div>
      </div>
      <div class="item-actions" style="display:none">
        ${it.link ? `<button class="icon-btn" title="Apri annuncio" data-action="open-link" data-href="${esc(it.link)}">🔗</button>` : ''}
        ${attivo
          ? `<button class="icon-btn" title="Registra vendita" data-action="sell-item" data-id="${esc(it.id)}">💰</button>`
          : `<button class="icon-btn" title="Riapri annuncio" data-action="reopen-item" data-id="${esc(it.id)}">↩️</button>`}
        <button class="icon-btn" title="Elimina" data-action="delete-item" data-id="${esc(it.id)}">🗑️</button>
      </div>
    </article>`;
  }

  function inventoryList() {
    const list = filteredItems();
    if (!list.length) {
      const hasAny = Store.state.items.length > 0;
      return Utils.emptyState('🧺',
        hasAny ? 'Nessun risultato' : 'Inventario vuoto',
        hasAny ? 'Prova a cambiare filtri o ricerca.' : 'Aggiungi il tuo primo capo: tieni traccia di costo, prezzo e stato.',
        hasAny ? '' : `<button class="btn btn-primary" data-action="add-item">＋ Nuovo articolo</button>
          <button class="btn btn-ghost" data-action="load-sample">✨ Carica dati di esempio</button>`);
    }
    return `<div class="inv inv-grid">${list.map(itemCard).join('')}</div>`;
  }

  /* --- vendite --- */
  const PERIODI = { mese: 'Questo mese', '3mesi': 'Ultimi 3 mesi', '6mesi': 'Ultimi 6 mesi', tutto: 'Tutto' };

  function sales() {
    const p = App.ui.salesPeriod;
    let sold = Store.soldSorted();
    if (p !== 'tutto') {
      const keys = p === 'mese' ? [Utils.currentMonthKey()] : Utils.lastMonthKeys(parseInt(p, 10) || 6);
      sold = sold.filter(i => keys.includes(Utils.monthKey(i.dataVendita)));
    }
    const ricavi = sold.reduce((s, i) => s + num(i.prezzoVenduto), 0);
    const profitto = sold.reduce((s, i) => s + Store.profit(i), 0);
    const margine = ricavi ? profitto / ricavi * 100 : 0;

    const keys6 = Utils.lastMonthKeys(6);
    const months = keys6.map(k => {
      let prof = 0, rev = 0;
      Store.state.items.forEach(i => {
        if (i.stato === 'venduto' && Utils.monthKey(i.dataVendita) === k) { prof += Store.profit(i); rev += num(i.prezzoVenduto); }
      });
      return { key: k, label: Utils.monthLabel(k), profit: prof, revenue: rev };
    });

    return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-ico">💰</div><div><div class="stat-label">Ricavi</div><div class="stat-value">${money(ricavi)}</div><div class="stat-sub">${sold.length} vendite</div></div></div>
      <div class="stat-card"><div class="stat-ico g">📈</div><div><div class="stat-label">Profitto netto</div><div class="stat-value ${profitto >= 0 ? 'pos' : 'neg'}">${money(profitto)}</div><div class="stat-sub">dopo costi e commissioni</div></div></div>
      <div class="stat-card"><div class="stat-ico p">📊</div><div><div class="stat-label">Margine medio</div><div class="stat-value">${margine.toFixed(0)}%</div><div class="stat-sub">sui ricavi</div></div></div>
      <div class="stat-card"><div class="stat-ico w">🗂️</div><div>
        <div class="stat-label">Periodo</div>
        <select class="select" data-filter="sales-period" style="margin-top:4px">
          ${Object.entries(PERIODI).map(([k, v]) => `<option value="${k}" ${k === p ? 'selected' : ''}>${v}</option>`).join('')}
        </select></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><div class="card-title">Andamento ultimi 6 mesi</div>
        <div class="legend"><span><i style="background:#cfe9ea"></i>Ricavi</span><span><i style="background:#0db1b6"></i>Profitto</span></div></div>
      ${Utils.chart(months, [
        { name: 'Ricavi', color: '#cfe9ea', values: months.map(m => Math.round(m.revenue * 100) / 100) },
        { name: 'Profitto', color: '#0db1b6', values: months.map(m => Math.round(m.profit * 100) / 100) },
      ])}
    </div>

    <div class="card">
      <div class="card-head"><div class="card-title">Storico vendite</div></div>
      ${sold.length ? `<div class="tbl">
        <div class="tbl-head">
          <div>Data</div><div>Articolo</div><div class="c-src">Fonte</div><div class="tbl-cell num">Costo</div>
          <div class="tbl-cell num">Venduto</div><div class="tbl-cell num">Profitto</div><div class="tbl-cell num">ROI</div><div></div>
        </div>
        ${sold.map(saleRow).join('')}
      </div>` : `<p class="hint">Nessuna vendita in questo periodo. Registra una vendita dalla scheda Inventario con il bottone 💰.</p>`}
    </div>`;
  }

  function saleRow(it) {
    const costo = Store.cost(it);
    const prof = Store.profit(it);
    const roi = costo > 0 ? prof / costo * 100 : 0;
    return `<div class="tbl-row">
      <div class="tbl-cell c-date" data-label="Data">${fmtDate(it.dataVendita)}</div>
      <div class="tbl-cell c-art" data-label="Articolo"><strong>${esc(it.nome)}</strong><span class="muted small">${esc(it.brand || '')}</span></div>
      <div class="tbl-cell c-src" data-label="Fonte">${esc(Store.FONTI[it.fonte] || '—')}</div>
      <div class="tbl-cell num" data-label="Costo">${money(costo)}</div>
      <div class="tbl-cell num" data-label="Venduto">${money(num(it.prezzoVenduto))}</div>
      <div class="tbl-cell num ${prof >= 0 ? 'pos' : 'neg'}" data-label="Profitto">${money(prof)}</div>
      <div class="tbl-cell num ${roi >= 0 ? 'pos' : 'neg'}" data-label="ROI">${roi.toFixed(0)}%</div>
      <div class="tbl-cell c-actions">
        <button class="icon-btn" title="Riapri" data-action="reopen-item" data-id="${it.id}">↩️</button>
        <button class="icon-btn" title="Modifica" data-action="edit-item" data-id="${it.id}">✏️</button>
        <button class="icon-btn" title="Elimina" data-action="delete-item" data-id="${it.id}">🗑️</button>
      </div>
    </div>`;
  }

  /* --- lista acquisti --- */
  function shopping() {
    const deals = Store.state.deals;
    const attive = deals.filter(d => d.stato !== 'acquistato' && d.stato !== 'scartato');
    const budget = attive.reduce((s, d) => s + num(d.prezzoRichiesto), 0);
    const atteso = attive.reduce((s, d) => s + (num(d.prezzoVenditaAtteso) > 0 ? num(d.prezzoVenditaAtteso) - num(d.prezzoRichiesto) : 0), 0);
    return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-ico">🔎</div><div><div class="stat-label">Opportunità attive</div><div class="stat-value">${attive.length}</div><div class="stat-sub">in trattativa o da contattare</div></div></div>
      <div class="stat-card"><div class="stat-ico w">🛒</div><div><div class="stat-label">Budget richiesto</div><div class="stat-value">${money(budget)}</div><div class="stat-sub">se acquisti tutto</div></div></div>
      <div class="stat-card"><div class="stat-ico g">💶</div><div><div class="stat-label">Profitto atteso</div><div class="stat-value pos">${money(atteso)}</div><div class="stat-sub">differenza vendita − acquisto</div></div></div>
      <div class="stat-card"><div class="stat-ico p">➕</div><div><div class="stat-label">Aggiungi</div><div style="margin-top:6px"><button class="btn btn-primary btn-sm" data-action="add-deal">Nuova opportunità</button></div></div></div>
    </div>
    ${deals.length
      ? `<div class="deals-grid">${deals.map(dealCard).join('')}</div>`
      : Utils.emptyState('🛒', 'Nessuna occasione in lista',
          'Qui tieni traccia di ciò che vuoi comprare per rivendere: annucci Vinted, venditori privati, mercatini.',
          `<button class="btn btn-primary" data-action="add-deal">＋ Nuova opportunità</button>`)}`;
  }

  function dealCard(d) {
    const richiesto = num(d.prezzoRichiesto), atteso = num(d.prezzoVenditaAtteso);
    const prof = atteso - richiesto;
    return `<article class="deal-card ${esc(d.stato)}">
      <div class="deal-top">
        <div><h3>${esc(d.nome)}</h3>
          <p class="muted small">${[d.brand, Store.FONTI[d.fonte]].filter(Boolean).map(esc).join(' · ')}</p></div>
        <div class="prio ${esc(d.priorita || 'media')}" title="Priorità ${esc(d.priorita || 'media')}"></div>
      </div>
      <div class="deal-prices">
        <div><small>Chiesto</small><b>${richiesto ? money(richiesto) : '—'}</b></div>
        <span class="arrow">→</span>
        <div><small>Vendita attesa</small><b>${atteso ? money(atteso) : '—'}</b></div>
        <div class="deal-profit"><small>Profitto atteso</small><b class="${prof > 0 ? 'pos' : ''}">${atteso ? money(prof) : '—'}</b></div>
      </div>
      ${d.contatto ? `<p class="muted small">👤 ${esc(d.contatto)}</p>` : ''}
      ${d.note ? `<p class="deal-note">📝 ${esc(d.note)}</p>` : ''}
      <div class="deal-status">
        ${Object.entries(Store.DEAL_STATI).map(([k, s]) =>
          `<button class="status-pill ${d.stato === k ? 'active' : ''}" data-action="deal-status" data-id="${d.id}" data-status="${k}">${s.label}</button>`).join('')}
      </div>
      <div class="deal-actions">
        <button class="btn btn-sm btn-ghost" data-action="deal-to-item" data-id="${d.id}" ${d.stato === 'acquistato' ? 'disabled title="Già in inventario"' : ''}>➡️ In inventario</button>
        <button class="btn btn-sm btn-ghost" data-action="edit-deal" data-id="${d.id}">✏️ Modifica</button>
        ${d.link ? `<button class="btn btn-sm btn-ghost" data-action="open-link" data-href="${esc(d.link)}">🔗 Apri</button>` : ''}
        <button class="icon-btn" title="Elimina" data-action="delete-deal" data-id="${d.id}">🗑️</button>
      </div>
    </article>`;
  }

  /* --- calcolatore --- */
  function calculator() {
    const s = Store.state.settings;
    return `
    <div class="calc-wrap">
      <div class="card">
        <div class="card-head"><div class="card-title">🧮 Quanto far pagare questo capo?</div></div>
        <form id="calc-form" class="form-grid">
          <div class="field"><label>Prezzo di acquisto €</label><input class="input num" name="costo" inputmode="decimal" placeholder="es. 12"></div>
          <div class="field"><label>Costi extra €</label><input class="input num" name="extra" inputmode="decimal" placeholder="trasporto, bump…"></div>
          <div class="field"><label>Commissioni Vinted %</label><input class="input num" name="fee" inputmode="decimal" value="${s.commissionPct}"></div>
          <div class="field"><label>Margine desiderato %</label><input class="input num" name="margine" inputmode="decimal" value="${s.defaultMarginPct}"></div>
          <div class="field span-2"><label>Arrotondamento prezzo</label>
            <div class="seg">
              <label><input type="radio" name="arrot" value="none" ${s.roundMode === 'none' ? 'checked' : ''}><span>Esatto</span></label>
              <label><input type="radio" name="arrot" value="95" ${s.roundMode === '95' ? 'checked' : ''}><span>…,95</span></label>
              <label><input type="radio" name="arrot" value="99" ${s.roundMode === '99' ? 'checked' : ''}><span>…,99</span></label>
            </div>
          </div>
        </form>
        <p class="hint">Sul Vinted di solito il venditore non paga commissioni: in questo caso tieni 0%. Il margine è calcolato sul prezzo di vendita.</p>
      </div>
      <div class="calc-out" id="calc-out"></div>
    </div>`;
  }

  /* --- generatore annunci --- */
  function generator() {
    const s = Store.state.settings;
    const opt = (arr, sel) => arr.map(x => `<option ${x === sel ? 'selected' : ''}>${x}</option>`).join('');
    return `
    <div class="gen-wrap">
      <div class="card">
        <div class="card-head"><div class="card-title">✍️ Dettagli del capo</div></div>
        <form id="gen-form" class="form-grid">
          <div class="field"><label>Brand</label><input class="input" name="brand" list="brands" placeholder="es. Nike"></div>
          <div class="field"><label>Capo / tipo</label><input class="input" name="tipo" list="tipi" placeholder="es. Felpa con cappuccio"></div>
          <datalist id="brands"><option>Nike</option><option>Adidas</option><option>Zara</option><option>H&amp;M</option><option>Levi's</option><option>Carhartt</option><option>The North Face</option><option>Patagonia</option><option>Uniqlo</option></datalist>
          <datalist id="tipi">${Store.CATEGORIE.map(c => `<option>${c}</option>`).join('')}</datalist>
          <div class="field"><label>Colore</label><input class="input" name="colore" placeholder="es. Nero"></div>
          <div class="field"><label>Taglia</label><input class="input" name="taglia" list="taglie" placeholder="es. M / 42"></div>
          <datalist id="taglie"><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option><option>36</option><option>38</option><option>40</option><option>42</option><option>44</option><option>46</option></datalist>
          <div class="field"><label>Materiale</label><input class="input" name="materiale" placeholder="es. 100% cotone"></div>
          <div class="field span-2"><label>Condizione</label><select class="select" name="condizione">${opt(Store.CONDIZIONI, 'Buono stato')}</select></div>
          <div class="field span-2"><label>Dettagli (stile, mix &amp; match, occasioni)</label>
            <textarea class="textarea" name="dettagli" rows="2" placeholder="es. indossata poche volte, perfetta con jeans e sneakers"></textarea></div>
          <div class="field span-2"><label>Difetti (lascia vuoto se assenti)</label>
            <input class="input" name="difetti" placeholder="es. piccola macchietta, non visibile indossando"></div>
          <div class="field span-2"><label>Tono dell'annuncio</label>
            <select class="select" name="tono">
              <option value="amichevole">Amichevole 👋</option>
              <option value="standard" selected>Standard 👔</option>
              <option value="professionale">Professionale 🤝</option>
            </select></div>
          <div class="field"><label class="check"><input type="checkbox" name="emoji" checked>Emoji</label></div>
          <div class="field"><label class="check"><input type="checkbox" name="hashtag" checked>Hashtag</label></div>
          <div class="field"><label class="check"><input type="checkbox" name="spedizione" checked>Nota spedizione</label></div>
          <div class="field"><label class="check"><input type="checkbox" name="offerte" checked>Invito a fare offerte</label></div>
          <div class="field span-2"><label class="check"><input type="checkbox" name="misure" checked>Riga misure su richiesta</label></div>
          <div class="field span-2"><label>Testo nota spedizione</label>
            <input class="input" name="notaSpedizione" value="${esc(s.shippingNote)}"></div>
        </form>
        <p class="hint">Compila i campi e l'annuncio si aggiorna da solo: titolo ottimizzato, descrizione pronta e hashtag.</p>
      </div>
      <div class="gen-out" id="gen-out"></div>
    </div>`;
  }

  /* --- caccia occasioni --- */
  function scouting() {
    const s = Store.state.scout;
    const marginDefault = s.marginPct != null && s.marginPct !== '' ? s.marginPct : Store.state.settings.defaultMarginPct;
    return `
    <div class="card">
      <div class="card-head"><div class="card-title">🔍 Caccia occasioni su Vinted</div>
        ${s.results.length ? `<button class="btn btn-sm btn-ghost" data-action="scout-clear">🗑️ Svuota risultati</button>` : ''}</div>
      <form id="scout-form" class="form-grid">
        <div class="field span-2"><label>Cosa vuoi cercare</label>
          <input class="input" name="q" value="${esc(s.q)}" placeholder="es. felpa carhartt, sneakers new balance…"></div>
        <div class="field span-2"><label>URL della ricerca Vinted (opzionale — lo trovi nella barra del browser)</label>
          <input class="input" name="sourceUrl" value="${esc(s.sourceUrl)}" placeholder="https://www.vinted.it/catalog?search_text=felpa+carhartt"></div>
        <div class="field"><label>Prezzo di rivendita atteso €</label>
          <input class="input num" name="resale" inputmode="decimal" value="${esc(s.resale || '')}" placeholder="es. 40"></div>
        <div class="field"><label>Margine desiderato %</label>
          <input class="input num" name="marginPct" inputmode="decimal" value="${esc(marginDefault)}"></div>
        <div class="field span-2">
          <button type="button" class="btn btn-primary" data-action="scout-fetch" id="scout-fetch-btn">🔍 Recupera annunci da Vinted</button>
          <p class="hint">L'app prova a leggere i risultati della ricerca direttamente da Vinted. Se il recupero automatico viene bloccato, usa il pannello qui sotto: incolla i risultati copiati e l'app li analizza lo stesso.</p>
        </div>
      </form>
      <div id="scout-status"></div>
    </div>

    <div class="card">
      <div class="card-head"><div class="card-title">…oppure incolla qui i risultati copiati</div></div>
      <textarea class="textarea" id="scout-paste" rows="5" placeholder="Esempio di risultati copiati da Vinted:&#10;Felpa Carhartt WIP — €24,00&#10;Jeans Levi's 501 — 15,00 EUR&#10;Sneakers NB 574 € 29,99 https://www.vinted.it/items/123"></textarea>
      <button class="btn btn-primary" style="margin-top:10px" data-action="scout-parse">📋 Analizza i risultati incollati</button>
      <p class="hint">Titolo e prezzo per riga (uno o più annunci alla volta): per ognuno ti dico se conviene comprare.</p>
    </div>

    <div id="scout-results">${scoutResults()}</div>`;
  }

  function scoutResults() {
    const s = Store.state.scout;
    if (!s.results || !s.results.length) {
      return Utils.emptyState('🔭', 'Ancora nessun annuncio da valutare',
        'Cerca su Vinted oppure incolla i risultati copiati: qui vedrai per ogni annuncio se comprare, trattare o lasciar perdere.');
    }
    return Scout.resultsHTML(Scout.analyze(s.results, Store.scoutCtx()), Store.scoutCtx());
  }

  return { dashboard, inventory, inventoryList, sales, shopping, calculator, generator, scouting, scoutResults };
})();
