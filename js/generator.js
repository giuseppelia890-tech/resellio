/* ===== Resellio — calcolatore prezzi ===== */
const Calc = (() => {
  const { num, money, esc } = Utils;

  function roundPsych(v, mode) {
    if (mode === '99') return Math.ceil(v - 0.99) + 0.99;
    if (mode === '95') return Math.ceil(v - 0.95) + 0.95;
    return Math.round(v * 100) / 100;
  }

  function compute(d) {
    const costi = d.costo + d.extra;
    const feeShare = d.fee / 100;
    const den = 1 - feeShare;
    const denM = den - d.margine / 100;
    const pareggio = den > 0 ? Math.ceil(costi / den * 100) / 100 : null;
    const raw = denM > 0 ? costi / denM : null;
    const prezzo = raw != null ? roundPsych(Math.max(raw, 0.01), d.arrot) : null;
    const feeVal = prezzo != null ? prezzo * feeShare : 0;
    const profitto = prezzo != null ? prezzo - costi - feeVal : null;
    const margineEff = prezzo ? profitto / prezzo * 100 : 0;
    const roi = costi > 0 && prezzo != null ? profitto / costi * 100 : 0;
    return { costi, pareggio, prezzo, feeVal, profitto, margineEff, roi, valido: prezzo != null };
  }

  function update() {
    const form = document.getElementById('calc-form');
    const out = document.getElementById('calc-out');
    if (!form || !out) return;
    const g = n => { const el = form.querySelector('[name="' + n + '"]'); return el ? el.value : ''; };
    const d = {
      costo: num(g('costo')),
      extra: num(g('extra')),
      fee: num(g('fee')),
      margine: num(g('margine')),
      arrot: (form.querySelector('[name="arrot"]:checked') || {}).value || 'none',
    };
    out.innerHTML = output(d);
  }

  function output(d) {
    const r = compute(d);
    if (!r.valido) {
      return `<div class="card"><div class="warn-box">⚠️ Margine + commissioni devono essere inferiori al 100% per calcolare un prezzo.</div></div>`;
    }
    const scenarios = [20, 30, 40, 50].map(m => {
      const s = compute({ ...d, margine: m });
      const hl = Math.abs(m - d.margine) < 0.01 ? ' style="background:var(--brand-soft)"' : '';
      return `<tr${hl}><td>${m}%</td><td>${money(s.prezzo)}</td><td class="${s.profitto >= 0 ? 'pos' : 'neg'}">${money(s.profitto)}</td></tr>`;
    }).join('');
    return `
    <div class="card">
      <div class="big-price">
        <small>Prezzo di vendita consigliato</small>
        <div class="price-value">${money(r.prezzo)}</div>
        <div class="margine-pill">margine target ${d.margine}%</div>
      </div>
      <div class="metric-grid">
        <div class="metric"><span>Costi totali</span><b>${money(r.costi)}</b></div>
        <div class="metric"><span>Commissioni</span><b>${money(r.feeVal)}</b></div>
        <div class="metric"><span>Profitto netto</span><b class="${r.profitto >= 0 ? 'pos' : 'neg'}">${money(r.profitto)}</b></div>
        <div class="metric"><span>ROI</span><b class="${r.roi >= 0 ? 'pos' : 'neg'}">${r.roi.toFixed(0)}%</b></div>
      </div>
      <p class="hint" style="text-align:center">Prezzo di pareggio: <b>${money(r.pareggio)}</b> · Margine effettivo: <b>${r.margineEff.toFixed(1)}%</b></p>
      <button class="btn btn-primary btn-block" style="margin-top:12px" data-action="calc-to-item" data-costo="${d.costo}" data-extra="${d.extra}" data-prezzo="${r.prezzo}">＋ Salva come articolo in inventario</button>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">Confronto margini</div></div>
      <table class="scenarios">
        <thead><tr><th>Margine</th><th>Prezzo</th><th>Profitto</th></tr></thead>
        <tbody>${scenarios}</tbody>
      </table>
      <p class="hint">Il prezzo include le commissioni Vinted e il margine scelto sul prezzo di vendita.</p>
    </div>`;
  }

  return { update, compute, roundPsych };
})();

/* ===== Resellio — generatore annunci Vinted ===== */
const AdGen = (() => {
  const { esc } = Utils;

  function readForm() {
    const form = document.getElementById('gen-form');
    if (!form) return null;
    const v = Utils.formValues(form);
    return v;
  }

  function join(parts) { return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(); }

  function capWords(str, max = 60) {
    if (str.length <= max) return str;
    let s = str;
    while (s.length > max && s.includes(' ')) s = s.slice(0, s.lastIndexOf(' '));
    return s.length > max ? s.slice(0, max).trim() : s;
  }

  function titles(d) {
    const size = d.taglia ? `T.${d.taglia}` : '';
    const condShort = {
      'Nuovo con etichetta': 'Nuovo con etichetta',
      'Nuovo senza etichetta': 'Nuovo',
      'Come nuovo': 'Come nuovo',
    }[d.condizione] || '';
    const t = [
      join([d.brand, d.tipo, d.colore, size]),
      join([d.tipo, d.brand, condShort, size]),
      join([d.brand, d.tipo, d.materiale, size]),
      join([condShort, d.brand, d.tipo, d.colore, size]),
    ].filter(Boolean);
    const seen = new Set();
    const out = [];
    for (const x of t) {
      const c = capWords(x, 60);
      if (!c || seen.has(c.toLowerCase())) continue;
      seen.add(c.toLowerCase());
      out.push(c);
    }
    if (!out.length) out.push('Annuncio Vinted');
    return out.slice(0, 3);
  }

  function slug(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '').slice(0, 24);
  }

  function hashtags(d) {
    const tags = [];
    const add = t => { if (t && t.length > 1 && !tags.includes(t)) tags.push(t); };
    add(slug(d.brand));
    add(slug(d.tipo));
    add('vinted');
    add('secondamano');
    add('usato');
    add('occasione');
    const cat = (d.tipo || '').toLowerCase();
    if (/scarpa|sneaker|calz/.test(cat)) add('sneakers');
    else if (/borsa|zaino/.test(cat)) add('borse');
    else if (/giacca|giubbotto|pium/.test(cat)) add('giacche');
    else add('abbigliamento');
    return tags.slice(0, 9);
  }

  function description(v) {
    const E = v.emoji !== false;
    const B = E ? '📌' : '•';
    const L = [];
    const head = join([v.brand, v.tipo]) || 'Articolo';
    L.push(E ? `✨ ${head}${v.taglia ? ` (${v.taglia})` : ''}` : `${head}${v.taglia ? ` (${v.taglia})` : ''}`);
    L.push('');
    if (v.condizione) L.push(`${B} Condizione: ${v.condizione}`);
    if (v.taglia) L.push(`${B} Taglia: ${v.taglia}`);
    if (v.colore) L.push(`${B} Colore: ${v.colore}`);
    if (v.materiale) L.push(`${B} Materiale: ${v.materiale}`);
    if (v.dettagli) { L.push(''); L.push(`🔎 Dettagli: ${v.dettagli}`); }
    if (v.difetti) { L.push(''); L.push(`⚠️ Difetti: ${v.difetti}`); }
    L.push('');
    const T = TONES[v.tono] || TONES.standard;
    L.push(T.intro);
    L.push('');
    if (v.misure) L.push(`${E ? '📏' : '-'} Misure approssimative disponibili su richiesta.`);
    if (v.spedizione && v.notaSpedizione) L.push(`📦 ${v.notaSpedizione}`);
    if (v.offerte) L.push(T.offerta);
    if (v.hashtag) { L.push(''); L.push(hashtags(v).map(t => '#' + t).join(' ')); }
    L.push('');
    L.push(T.outro);
    return L.join('\n');
  }

  const TONES = {
    amichevole: {
      intro: 'Ciao! 👋 Ti propongo questo capo, comodissimo e facile da abbinare.',
      offerta: '💡 Fai un\'offerta, sono aperto/a a trattative!',
      outro: 'Scrivimi pure per qualsiasi domanda, rispondo rapidamente 😊',
    },
    standard: {
      intro: 'In vendita questo capo in ottime condizioni, come da foto.',
      offerta: '💰 Prezzo trattabile, offerte benvenute.',
      outro: 'Per informazioni o trattative, contattami pure.',
    },
    professionale: {
      intro: 'Propongo articolo verificato e descritto con precisione, come mostrato nelle foto.',
      offerta: '💼 Offerte ragionevoli prontamente considerate.',
      outro: 'Spedizione tracciata e imballaggio curato. A disposizione per ogni informazione.',
    },
  };

  function update() {
    const out = document.getElementById('gen-out');
    const v = readForm();
    if (!out || !v) return;
    const t = titles(v);
    const desc = description(v);
    const tags = hashtags(v);
    out.innerHTML = `
      <div class="out-block">
        <div class="out-head"><h3>✍️ Titolo consigliato</h3></div>
        ${t.map((x, i) => {
          const n = x.length;
          const badge = `<span class="charcount ${n > 60 ? 'warn' : ''}">${n} caratteri</span>`;
          if (i === 0) {
            return `<div class="title-hero"><span>${esc(x)}</span>${badge}</div>
              <div style="display:flex;justify-content:flex-end;margin-top:8px">
                <button class="btn btn-sm btn-ghost" data-action="copy" data-copy-text="${esc(x)}">Copia titolo</button>
              </div>`;
          }
          return `<div class="alt-title"><span>${esc(x)}</span>
            <button class="btn btn-sm btn-ghost" data-action="copy" data-copy-text="${esc(x)}">Copia</button></div>`;
        }).join('')}
        <p class="hint">Titolo fino a ~60 caratteri con brand + capo + taglia: è ciò che i compratori vedono prima.</p>
      </div>
      <div class="out-block">
        <div class="out-head"><h3>📄 Descrizione</h3>
          <button class="btn btn-sm btn-primary" data-action="copy" data-copy-target="#gen-desc">Copia descrizione</button>
        </div>
        <div class="pre-text" id="gen-desc">${esc(desc)}</div>
      </div>
      <div class="out-block">
        <div class="out-head"><h3># Hashtag</h3>
          <button class="btn btn-sm btn-ghost" data-action="copy" data-copy-text="${esc(tags.map(x => '#' + x).join(' '))}">Copia hashtag</button>
        </div>
        <div class="tag-row">${tags.map(x => `<span class="tag">#${esc(x)}</span>`).join('')}</div>
      </div>`;
  }

  return { update, titles, description, hashtags };
})();
