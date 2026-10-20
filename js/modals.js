/* ===== Resellio — modali ===== */
const Modals = (() => {
  const { esc, money, num } = Utils;
  let pendingConfirm = null;

  function open(html, { wide = false, onMount } = {}) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-backdrop"><div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
    document.body.classList.add('modal-open');
    const bd = root.querySelector('.modal-backdrop');
    bd.addEventListener('click', e => { if (e.target === bd) close(); });
    if (onMount) onMount(root);
    const first = root.querySelector('input:not([type=hidden]):not([type=file]), select, textarea');
    if (first) setTimeout(() => first.focus(), 60);
  }

  function close() {
    document.getElementById('modal-root').innerHTML = '';
    document.body.classList.remove('modal-open');
    if (pendingConfirm) { const r = pendingConfirm; pendingConfirm = null; r(false); }
  }

  function confirm(message, { okLabel = 'Conferma', danger = true } = {}) {
    return new Promise(resolve => {
      pendingConfirm = resolve;
      open(`
        <div class="modal-head"><h2>Sei sicuro?</h2>
          <button class="icon-btn" data-action="close-modal" aria-label="Chiudi">✕</button></div>
        <div class="modal-body"><p>${esc(message)}</p></div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-action="close-modal">Annulla</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${esc(okLabel)}</button>
        </div>`, {
        onMount(root) {
          root.querySelector('#confirm-ok').addEventListener('click', () => {
            const r = pendingConfirm; pendingConfirm = null; close();
            if (r) r(true);
          });
        }
      });
    });
  }

  /* --- Articolo (nuovo / modifica) --- */
  function item(id, opts = {}) {
    const existing = id ? Store.getItem(id) : null;
    const base = {
      nome: '', brand: '', categoria: '', taglia: '', colore: '', materiale: '',
      condizione: 'Buono stato', fonte: 'vinted', stato: 'da_fotografare',
      dataAcquisto: Utils.today(), prezzoAcquisto: '', costiAcquisto: '', prezzoVendita: '',
      prezzoVenduto: '', dataVendita: '', costiVendita: '', link: '', note: '', foto: '',
    };
    const draft = Object.assign(base, existing || {}, opts.prefill || {});
    let foto = draft.foto || '';

    const opt = (arr, sel) => arr.map(x => `<option value="${esc(x)}" ${x === sel ? 'selected' : ''}>${esc(x)}</option>`).join('');
    const fontiOpts = Object.entries(Store.FONTI).map(([k, v]) => `<option value="${k}" ${k === draft.fonte ? 'selected' : ''}>${esc(v)}</option>`).join('');
    const statoOpts = Object.entries(Store.STATI).map(([k, s]) => `<option value="${k}" ${k === draft.stato ? 'selected' : ''}>${s.emoji} ${esc(s.label)}</option>`).join('');
    const v = x => esc(x === '' || x == null ? '' : x);

    open(`
      <div class="modal-head"><h2>${existing ? '✏️ Modifica articolo' : '＋ Nuovo articolo'}</h2>
        <button class="icon-btn" data-action="close-modal" aria-label="Chiudi">✕</button></div>
      <div class="modal-body">
        <form id="item-form">
          <div class="form-grid">
            <div class="field span-2">
              <label>Foto</label>
              <div class="photo-row">
                <div class="photo-preview" id="foto-preview">${foto ? `<img src="${foto}" alt="">` : '📷'}</div>
                <div class="photo-ctrls">
                  <label class="btn btn-ghost btn-sm">📂 Scegli foto<input type="file" accept="image/*" id="foto-input" hidden></label>
                  <button type="button" class="btn btn-ghost btn-sm" id="foto-remove">Rimuovi foto</button>
                  <p class="hint">Foto chiara con sfondo neutro: viene ridimensionata e salvata sul dispositivo.</p>
                </div>
              </div>
            </div>
            <div class="field span-2"><label>Nome articolo *</label>
              <input class="input" name="nome" required value="${v(draft.nome)}" placeholder="es. Felpa Carhartt WIP"></div>
            <div class="field"><label>Brand</label><input class="input" name="brand" list="m-brands" value="${v(draft.brand)}" placeholder="es. Nike"></div>
            <datalist id="m-brands"><option>Nike</option><option>Adidas</option><option>Zara</option><option>H&amp;M</option><option>Levi's</option><option>Carhartt</option><option>The North Face</option></datalist>
            <div class="field"><label>Categoria</label><input class="input" name="categoria" list="m-cat" value="${v(draft.categoria)}" placeholder="es. Felpa"></div>
            <datalist id="m-cat">${Store.CATEGORIE.map(c => `<option>${c}</option>`).join('')}</datalist>
            <div class="field"><label>Taglia</label><input class="input" name="taglia" value="${v(draft.taglia)}" placeholder="es. M / 42"></div>
            <div class="field"><label>Colore</label><input class="input" name="colore" value="${v(draft.colore)}" placeholder="es. Nero"></div>
            <div class="field"><label>Materiale</label><input class="input" name="materiale" value="${v(draft.materiale)}" placeholder="es. 100% cotone"></div>
            <div class="field"><label>Condizione</label><select class="select" name="condizione">${opt(Store.CONDIZIONI, draft.condizione)}</select></div>
            <div class="field"><label>Fonte (dove l'hai preso)</label><select class="select" name="fonte">${fontiOpts}</select></div>
            <div class="field"><label>Stato</label><select class="select" name="stato" id="stato-select">${statoOpts}</select></div>
            <div class="field"><label>Data acquisto</label><input class="input" type="date" name="dataAcquisto" value="${v(draft.dataAcquisto)}"></div>
            <div class="field"><label>Prezzo di acquisto €</label><input class="input num" name="prezzoAcquisto" inputmode="decimal" value="${v(draft.prezzoAcquisto)}" placeholder="0,00"></div>
            <div class="field"><label>Costi extra acquisto €</label><input class="input num" name="costiAcquisto" inputmode="decimal" value="${v(draft.costiAcquisto)}" placeholder="trasporto, ecc."></div>
            <div class="field"><label>Prezzo di vendita €</label><input class="input num" name="prezzoVendita" inputmode="decimal" value="${v(draft.prezzoVendita)}" placeholder="0,00"></div>
            <div class="field"><label>Link annuncio Vinted</label><input class="input" type="url" name="link" value="${v(draft.link)}" placeholder="https://www.vinted.it/items/…"></div>
            <div class="field span-2" id="price-analysis" aria-live="polite"></div>
            <div class="field span-2" id="sale-section" ${draft.stato === 'venduto' ? '' : 'hidden'}>
              <div class="section-title">💰 Dettagli vendita</div>
              <div class="form-grid">
                <div class="field"><label>Prezzo venduto €</label><input class="input num" name="prezzoVenduto" inputmode="decimal" value="${v(draft.prezzoVenduto)}"></div>
                <div class="field"><label>Data vendita</label><input class="input" type="date" name="dataVendita" value="${v(draft.dataVendita)}"></div>
                <div class="field"><label>Costi vendita €</label><input class="input num" name="costiVendita" inputmode="decimal" value="${v(draft.costiVendita)}" placeholder="bump, imballaggio…"></div>
              </div>
            </div>
            <div class="field span-2"><label>Note</label>
              <textarea class="textarea" name="note" rows="2" placeholder="Promemoria, misure, trattative…">${v(draft.note)}</textarea></div>
          </div>
        </form>
      </div>
      <div class="modal-foot">
        ${existing ? `<button class="btn btn-ghost left" data-action="delete-item" data-id="${existing.id}">🗑️ Elimina</button>` : ''}
        <button class="btn btn-ghost" data-action="close-modal">Annulla</button>
        <button class="btn btn-primary" type="submit" form="item-form">💾 Salva</button>
      </div>`, {
      wide: true,
      onMount(root) {
        const form = root.querySelector('#item-form');
        const prev = root.querySelector('#foto-preview');
        root.querySelector('#foto-input').addEventListener('change', async e => {
          const f = e.target.files[0];
          if (!f) return;
          try {
            foto = await Utils.resizeImage(f);
            prev.innerHTML = `<img src="${foto}" alt="">`;
            Utils.toast('Foto aggiunta ✓', 'ok');
          } catch (err) { Utils.toast('Impossibile leggere la foto', 'err'); }
        });
        root.querySelector('#foto-remove').addEventListener('click', () => {
          foto = ''; prev.innerHTML = '📷';
        });
        const saleSection = root.querySelector('#sale-section');
        root.querySelector('#stato-select').addEventListener('change', e => {
          saleSection.hidden = e.target.value !== 'venduto';
        });

        /* --- Analisi prezzo automatica mentre compili --- */
        const analysisEl = root.querySelector('#price-analysis');
        const computeAnalysis = () => {
          const val = Utils.formValues(form);
          const costo = num(val.prezzoAcquisto);
          const extra = num(val.costiAcquisto);
          const prezzo = num(val.prezzoVendita);
          if (costo <= 0 && extra <= 0) { analysisEl.innerHTML = ''; return; }
          const s = Store.state.settings;
          const suggerito = Calc.compute({
            costo, extra,
            fee: num(s.commissionPct),
            margine: num(s.defaultMarginPct),
            arrot: s.roundMode,
          });
          if (!suggerito.valido) {
            analysisEl.innerHTML = `<div class="warn-box">⚠️ Margine + commissioni devono essere sotto il 100% per suggerire un prezzo (controlla le impostazioni).</div>`;
            return;
          }
          const profitto = prezzo > 0
            ? prezzo - suggerito.costi - prezzo * num(s.commissionPct) / 100
            : null;
          const roi = profitto != null && suggerito.costi > 0 ? profitto / suggerito.costi * 100 : null;
          let verdict;
          if (prezzo <= 0) {
            verdict = `<span class="verdict v-maybe">👆 Inserisci il prezzo di vendita per confrontarlo</span>`;
          } else if (profitto < 0) {
            verdict = `<span class="verdict v-no">❌ Sotto il pareggio: ci perd <b>${money(Math.abs(profitto))}</b></span>`;
          } else if (prezzo < suggerito.prezzo - 0.01) {
            verdict = `<span class="verdict v-maybe">⚠️ Conviene: guadagni ${money(profitto)}, ma puoi chiedere <b>${money(suggerito.prezzo)}</b></span>`;
          } else {
            verdict = `<span class="verdict v-si">✅ Ottimo prezzo: guadagno ${money(profitto)}${roi != null ? ` · ROI ${roi.toFixed(0)}%` : ''}</span>`;
          }
          const margineEff = prezzo > 0 ? (profitto / prezzo * 100) : null;
          analysisEl.innerHTML = `
            <div class="analysis-box">
              <div class="analysis-title">🔮 Analisi automatica del prezzo</div>
              <div class="analysis-grid">
                <div class="analysis-cell"><small>Costi totali</small><b>${money(suggerito.costi)}</b></div>
                <div class="analysis-cell"><small>Prezzo suggerito</small><b class="hl">${money(suggerito.prezzo)}</b></div>
                <div class="analysis-cell"><small>Prezzo pareggio</small><b>${money(suggerito.pareggio)}</b></div>
                <div class="analysis-cell"><small>Profitto a ${prezzo > 0 ? money(prezzo) : '—'}</small><b class="${profitto != null && profitto < 0 ? 'neg' : 'pos'}">${profitto != null ? money(profitto) : '—'}</b></div>
                <div class="analysis-cell"><small>ROI</small><b class="${roi != null && roi < 0 ? 'neg' : 'pos'}">${roi != null ? roi.toFixed(0) + '%' : '—'}</b></div>
                <div class="analysis-cell"><small>Margine eff.</small><b>${margineEff != null ? margineEff.toFixed(1) + '%' : '—'}</b></div>
              </div>
              <div class="analysis-verdict">${verdict}</div>
              ${prezzo > 0 && Math.abs(prezzo - suggerito.prezzo) > 0.01
                ? `<button type="button" class="btn btn-sm btn-ghost" id="use-suggested">✨ Usa il prezzo suggerito (${money(suggerito.prezzo)})</button>` : ''}
            </div>`;
          const useBtn = root.querySelector('#use-suggested');
          if (useBtn) useBtn.addEventListener('click', () => {
            form.querySelector('[name="prezzoVendita"]').value = suggerito.prezzo;
            computeAnalysis();
            Utils.toast('Prezzo suggerito inserito ✓', 'ok');
          });
        };
        form.addEventListener('input', e => {
          if (['prezzoAcquisto', 'costiAcquisto', 'prezzoVendita'].includes(e.target.name)) computeAnalysis();
        });
        computeAnalysis();

        form.addEventListener('submit', e => {
          e.preventDefault();
          const val = Utils.formValues(form);
          if (!String(val.nome).trim()) { Utils.toast('Inserisci il nome dell\'articolo', 'err'); return; }
          const data = {
            nome: String(val.nome).trim(), brand: val.brand.trim(), categoria: val.categoria.trim(),
            taglia: val.taglia.trim(), colore: val.colore.trim(), materiale: val.materiale.trim(),
            condizione: val.condizione, fonte: val.fonte, stato: val.stato,
            dataAcquisto: val.dataAcquisto, prezzoAcquisto: num(val.prezzoAcquisto),
            costiAcquisto: num(val.costiAcquisto), prezzoVendita: num(val.prezzoVendita),
            link: val.link.trim(), note: val.note.trim(), foto,
          };
          if (data.stato === 'venduto') {
            data.prezzoVenduto = num(val.prezzoVenduto) || data.prezzoVendita || data.prezzoAcquisto;
            data.dataVendita = val.dataVendita || (existing && existing.dataVendita) || Utils.today();
            data.costiVendita = num(val.costiVendita);
          } else {
            data.prezzoVenduto = 0; data.dataVendita = ''; data.costiVendita = 0;
          }
          /* Prezzo di vendita mancante? L'analisi lo propone in automatico */
          let prezzoAuto = false;
          if (!data.prezzoVendita && (data.prezzoAcquisto > 0 || data.costiAcquisto > 0) && data.stato !== 'venduto') {
            const s = Store.state.settings;
            const r = Calc.compute({
              costo: data.prezzoAcquisto, extra: data.costiAcquisto,
              fee: num(s.commissionPct), margine: num(s.defaultMarginPct), arrot: s.roundMode,
            });
            if (r.valido && r.prezzo > 0) { data.prezzoVendita = r.prezzo; prezzoAuto = true; }
          }
          if (existing) Store.updateItem(existing.id, data);
          else Store.addItem(data);
          if (opts.dealId) Store.updateDeal(opts.dealId, { stato: 'acquistato' });
          close();
          if (prezzoAuto) Utils.toast(`Articolo aggiunto ✓ — prezzo di vendita suggerito: ${money(data.prezzoVendita)}`, 'ok');
          else Utils.toast(existing ? 'Articolo aggiornato ✓' : 'Articolo aggiunto ✓', 'ok');
          App.refresh();
        });
      }
    });
  }

  /* --- Registra vendita --- */
  function sell(id) {
    const it = Store.getItem(id);
    if (!it) return;
    const costo = Store.cost(it);
    const prezzoDefault = num(it.prezzoVendita) || num(it.prezzoAcquisto) || '';
    open(`
      <div class="modal-head"><h2>💰 Registra vendita</h2>
        <button class="icon-btn" data-action="close-modal" aria-label="Chiudi">✕</button></div>
      <div class="modal-body">
        <div class="sell-summary">
          <div><small>Articolo</small><b>${esc(it.nome)}</b></div>
          <div><small>Costo totale</small><b>${money(costo)}</b></div>
          <div><small>Prezzo richiesto</small><b>${num(it.prezzoVendita) ? money(it.prezzoVendita) : '—'}</b></div>
        </div>
        <form id="sell-form" class="form-grid">
          <div class="field"><label>Prezzo venduto €</label>
            <input class="input num" name="prezzoVenduto" inputmode="decimal" value="${prezzoDefault}" required></div>
          <div class="field"><label>Data vendita</label>
            <input class="input" type="date" name="dataVendita" value="${Utils.today()}"></div>
          <div class="field span-2"><label>Costi extra di vendita € (bump, imballaggio…)</label>
            <input class="input num" name="costiVendita" inputmode="decimal" placeholder="0,00"></div>
          <div class="field span-2"><div class="profit-preview" id="sell-profit"></div></div>
        </form>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-action="close-modal">Annulla</button>
        <button class="btn btn-success" type="submit" form="sell-form">✔ Conferma vendita</button>
      </div>`, {
      onMount(root) {
        const form = root.querySelector('#sell-form');
        const out = root.querySelector('#sell-profit');
        const feePct = num(Store.state.settings.commissionPct);
        const update = () => {
          const val = Utils.formValues(form);
          const p = num(val.prezzoVenduto);
          const profit = p - costo - num(val.costiVendita) - p * feePct / 100;
          const roi = costo > 0 ? (profit / costo * 100).toFixed(0) : '—';
          out.className = 'profit-preview' + (profit < 0 ? ' neg' : '');
          out.textContent = `${profit >= 0 ? '📈' : '📉'} Guadagno netto: ${money(profit)}  ·  ROI ${roi}%`;
        };
        form.addEventListener('input', update);
        update();
        form.addEventListener('submit', e => {
          e.preventDefault();
          const val = Utils.formValues(form);
          Store.markSold(id, val);
          close();
          Utils.toast('Vendita registrata 🎉', 'ok');
          App.refresh();
        });
      }
    });
  }

  /* --- Opportunità di acquisto --- */
  function deal(id, prefill = {}) {
    const existing = id ? Store.getDeal(id) : null;
    const d = Object.assign({
      nome: '', brand: '', fonte: 'vinted', prezzoRichiesto: '', prezzoMax: '',
      prezzoVenditaAtteso: '', contatto: '', link: '', priorita: 'media', stato: 'da_contattare', note: '',
    }, existing || {}, prefill);
    const v = x => esc(x === '' || x == null ? '' : x);
    const fontiOpts = Object.entries(Store.FONTI).map(([k, val]) => `<option value="${k}" ${k === d.fonte ? 'selected' : ''}>${esc(val)}</option>`).join('');
    const statoOpts = Object.entries(Store.DEAL_STATI).map(([k, s]) => `<option value="${k}" ${k === d.stato ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
    open(`
      <div class="modal-head"><h2>${existing ? '✏️ Modifica opportunità' : '＋ Nuova opportunità'}</h2>
        <button class="icon-btn" data-action="close-modal" aria-label="Chiudi">✕</button></div>
      <div class="modal-body">
        <form id="deal-form" class="form-grid">
          <div class="field span-2"><label>Cosa vuoi comprare *</label>
            <input class="input" name="nome" required value="${v(d.nome)}" placeholder="es. Felpa gommata Essentials"></div>
          <div class="field"><label>Brand</label><input class="input" name="brand" value="${v(d.brand)}"></div>
          <div class="field"><label>Fonte</label><select class="select" name="fonte">${fontiOpts}</select></div>
          <div class="field"><label>Prezzo richiesto €</label><input class="input num" name="prezzoRichiesto" inputmode="decimal" value="${v(d.prezzoRichiesto)}"></div>
          <div class="field"><label>Prezzo massimo €</label><input class="input num" name="prezzoMax" inputmode="decimal" value="${v(d.prezzoMax)}"></div>
          <div class="field"><label>Prezzo di vendita atteso €</label><input class="input num" name="prezzoVenditaAtteso" inputmode="decimal" value="${v(d.prezzoVenditaAtteso)}"></div>
          <div class="field span-2" id="deal-analysis" aria-live="polite"></div>
          <div class="field"><label>Priorità</label><select class="select" name="priorita">
            <option value="alta" ${d.priorita === 'alta' ? 'selected' : ''}>🔴 Alta</option>
            <option value="media" ${d.priorita === 'media' ? 'selected' : ''}>🟠 Media</option>
            <option value="bassa" ${d.priorita === 'bassa' ? 'selected' : ''}>⚪ Bassa</option>
          </select></div>
          <div class="field"><label>Contatto (username, persona…)</label><input class="input" name="contatto" value="${v(d.contatto)}" placeholder="es. @user_vx"></div>
          <div class="field"><label>Stato</label><select class="select" name="stato">${statoOpts}</select></div>
          <div class="field span-2"><label>Link annuncio</label><input class="input" type="url" name="link" value="${v(d.link)}" placeholder="https://www.vinted.it/items/…"></div>
          <div class="field span-2"><label>Note</label><textarea class="textarea" name="note" rows="2">${v(d.note)}</textarea></div>
        </form>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-action="close-modal">Annulla</button>
        <button class="btn btn-primary" type="submit" form="deal-form">💾 Salva</button>
      </div>`, {
      onMount(root) {
        const form = root.querySelector('#deal-form');

        /* --- Analisi automatica: conviene comprare? --- */
        const analysisEl = root.querySelector('#deal-analysis');
        const computeDealAnalysis = () => {
          const val = Utils.formValues(form);
          const richiesto = num(val.prezzoRichiesto);
          const atteso = num(val.prezzoVenditaAtteso);
          if (richiesto <= 0 && atteso <= 0) { analysisEl.innerHTML = ''; return; }
          const s = Store.state.settings;
          const feePct = num(s.commissionPct);
          const marginPct = num(s.defaultMarginPct);
          const maxBuy = atteso > 0 ? Math.max(0, atteso * (1 - feePct / 100 - marginPct / 100)) : null;
          const profit = atteso > 0 && richiesto > 0 ? atteso * (1 - feePct / 100) - richiesto : null;
          const roi = profit != null && richiesto > 0 ? profit / richiesto * 100 : null;
          let verdict;
          if (maxBuy == null) {
            verdict = `<span class="verdict v-maybe">👆 Indica a quanto pensi di rivendere per capire quanto conviene pagare</span>`;
          } else if (richiesto <= 0) {
            verdict = `<span class="verdict v-maybe">💡 Massimo che conviene pagare: <b>${money(maxBuy)}</b> (poi inserisci il prezzo chiesto)</span>`;
          } else if (richiesto <= maxBuy) {
            verdict = `<span class="verdict v-si">✅ Conviene: a ${money(richiesto)} ci guadagni <b>${money(profit)}</b>${roi != null ? ` (ROI ${roi.toFixed(0)}%)` : ''}</span>`;
          } else if (richiesto <= maxBuy * 1.15) {
            verdict = `<span class="verdict v-maybe">🤝 Trattabile: offri fino a <b>${money(maxBuy)}</b> (a quello chiesto guadagni ${money(profit)})</span>`;
          } else {
            verdict = `<span class="verdict v-no">❌ Troppo caro: massimo ${money(maxBuy)} — a ${money(richiesto)} ${profit < 0 ? `perd ${money(Math.abs(profit))}` : 'guadagni troppo poco'}</span>`;
          }
          analysisEl.innerHTML = `
            <div class="analysis-box">
              <div class="analysis-title">🔮 Analisi automatica dell'opportunità</div>
              <div class="analysis-grid">
                <div class="analysis-cell"><small>Chiesto</small><b>${richiesto > 0 ? money(richiesto) : '—'}</b></div>
                <div class="analysis-cell"><small>Prezzo max da pagare</small><b class="${maxBuy != null && richiesto > maxBuy ? 'neg' : 'hl'}">${maxBuy != null ? money(maxBuy) : '—'}</b></div>
                <div class="analysis-cell"><small>Vendita attesa</small><b>${atteso > 0 ? money(atteso) : '—'}</b></div>
                <div class="analysis-cell"><small>Profitto stimato</small><b class="${profit != null && profit < 0 ? 'neg' : 'pos'}">${profit != null ? money(profit) : '—'}</b></div>
                <div class="analysis-cell"><small>ROI</small><b class="${roi != null && roi < 0 ? 'neg' : 'pos'}">${roi != null ? roi.toFixed(0) + '%' : '—'}</b></div>
                <div class="analysis-cell"><small>Margine target</small><b>${marginPct}%</b></div>
              </div>
              <div class="analysis-verdict">${verdict}</div>
            </div>`;
        };
        form.addEventListener('input', e => {
          if (['prezzoRichiesto', 'prezzoVenditaAtteso', 'prezzoMax'].includes(e.target.name)) computeDealAnalysis();
        });
        computeDealAnalysis();

        form.addEventListener('submit', e => {
          e.preventDefault();
          const val = Utils.formValues(form);
          if (!String(val.nome).trim()) { Utils.toast('Inserisci cosa vuoi comprare', 'err'); return; }
          const data = {
            nome: String(val.nome).trim(), brand: val.brand.trim(), fonte: val.fonte,
            prezzoRichiesto: num(val.prezzoRichiesto), prezzoMax: num(val.prezzoMax),
            prezzoVenditaAtteso: num(val.prezzoVenditaAtteso), contatto: val.contatto.trim(),
            link: val.link.trim(), priorita: val.priorita, stato: val.stato, note: val.note.trim(),
          };
          if (existing) Store.updateDeal(existing.id, data);
          else Store.addDeal(data);
          close();
          Utils.toast(existing ? 'Opportunità aggiornata ✓' : 'Opportunità aggiunta ✓', 'ok');
          App.refresh();
        });
      }
    });
  }

  /* --- Impostazioni --- */
  function settings() {
    const s = Store.state.settings;
    open(`
      <div class="modal-head"><h2>⚙️ Impostazioni</h2>
        <button class="icon-btn" data-action="close-modal" aria-label="Chiudi">✕</button></div>
      <div class="modal-body">
        <form id="settings-form" class="form-grid">
          <div class="field"><label>Commissioni Vinted %</label>
            <input class="input num" name="commissionPct" inputmode="decimal" value="${s.commissionPct}">
            <p class="hint">Di norma 0 per chi vende su Vinted IT.</p></div>
          <div class="field"><label>Margine default %</label>
            <input class="input num" name="defaultMarginPct" inputmode="decimal" value="${s.defaultMarginPct}"></div>
          <div class="field"><label>Arrotondamento prezzo</label>
            <select class="select" name="roundMode">
              <option value="99" ${s.roundMode === '99' ? 'selected' : ''}>…,99</option>
              <option value="95" ${s.roundMode === '95' ? 'selected' : ''}>…,95</option>
              <option value="none" ${s.roundMode === 'none' ? 'selected' : ''}>Esatto</option>
            </select></div>
          <div class="field span-2"><label>Nota spedizione (usata negli annunci)</label>
            <input class="input" name="shippingNote" value="${esc(s.shippingNote)}"></div>
        </form>
        <div class="settings-extra">
          <button class="btn btn-ghost btn-sm" data-action="export">⬇️ Esporta backup</button>
          <button class="btn btn-ghost btn-sm" data-action="import">⬆️ Importa backup</button>
          <button class="btn btn-ghost btn-sm" data-action="load-sample">✨ Dati di esempio</button>
          <button class="btn btn-ghost btn-sm" data-action="reset-data" style="color:var(--danger)">🗑️ Svuota tutto</button>
        </div>
        <div class="settings-extra">
          <div class="pin-row">
            <strong>🔒 Accesso con PIN</strong>
            <span class="hint">${Auth.pinSet() ? 'attivo su questo dispositivo' : 'non attivo'}</span>
          </div>
          ${Auth.pinSet()
            ? `<button class="btn btn-ghost btn-sm" data-action="pin-setup">🔑 Cambia PIN</button>
               <button class="btn btn-ghost btn-sm" data-action="lock-app">🔒 Blocca subito</button>
               <button class="btn btn-ghost btn-sm" data-action="pin-remove" style="color:var(--danger)">Togli il PIN</button>`
            : `<button class="btn btn-ghost btn-sm" data-action="pin-setup">🔑 Imposta un PIN</button>
               <p class="hint">Alla prossima apertura l\'app chiederà il PIN (da 4 a 8 cifre). Funziona anche offline: è un lucchetto per il tuo dispositivo, non un account.</p>`}
        </div>
        <div class="settings-extra">
          <div class="pin-row">
            <strong>👤 Account online</strong>
            <span class="hint">${typeof Cloud !== 'undefined' && Cloud.user ? esc(Cloud.user.email || 'Google') : 'non connesso'}</span>
          </div>
          ${typeof Cloud !== 'undefined' && Cloud.user
            ? `<button class="btn btn-ghost btn-sm" data-action="sync-now">☁️ Sincronizza ora</button>
               <button class="btn btn-ghost btn-sm" data-action="logout">Esci dall'account</button>
               <p class="hint">I dati restano su questo dispositivo e vengono copiati anche online: se cambi telefono li ritrovi accedendo con lo stesso account.</p>`
            : `<p class="hint">${typeof Cloud !== 'undefined' && Cloud.configured()
                ? 'Accedi dalla schermata iniziale con Google o email per attivare il backup online.'
                : 'Per attivare l\'accesso con Google/email e il backup online serve configurare Firebase (vedi js/firebase-config.js).'}</p>`}
        </div>
        <p class="hint">I dati sono salvati solo nel browser di questo dispositivo: esporta un backup periodicamente.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-action="close-modal">Annulla</button>
        <button class="btn btn-primary" type="submit" form="settings-form">💾 Salva</button>
      </div>`, {
      onMount(root) {
        const form = root.querySelector('#settings-form');
        form.addEventListener('submit', e => {
          e.preventDefault();
          const val = Utils.formValues(form);
          Store.state.settings = {
            commissionPct: num(val.commissionPct),
            defaultMarginPct: num(val.defaultMarginPct),
            roundMode: val.roundMode,
            shippingNote: String(val.shippingNote || '').trim(),
          };
          Store.save();
          close();
          Utils.toast('Impostazioni salvate ✓', 'ok');
          App.refresh();
        });
      }
    });
  }

  return { open, close, confirm, item, sell, deal, settings };
})();
