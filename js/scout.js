/* ===== Resellio — caccia occasioni: recupero e valutazione annunci ===== */
const Scout = (() => {
  const { esc, money, num } = Utils;

  /* --- Prezzi e normalizzazione --- */
  function parsePrice(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v && typeof v === 'object') v = v.amount ?? v.value ?? v.total_price ?? '';
    const m = String(v ?? '').replace(/\s/g, '').match(/(\d[\d.,]*)/);
    if (!m) return 0;
    let s = m[1];
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  function normalizeItem(o) {
    let url = o.url || o.web_url || (o.id ? '/items/' + o.id : '');
    if (url && !/^https?:/i.test(url)) url = 'https://www.vinted.it' + url;
    return {
      id: String(o.id || url || Math.random().toString(36).slice(2)),
      titolo: String(o.title || o.name || '').trim().slice(0, 140),
      brand: String(o.brand_title || (o.brand && (o.brand.title || o.brand.name)) || '').trim().slice(0, 60),
      prezzo: parsePrice(o.total_item_price ?? o.price ?? o.raw_price),
      foto: (o.photo && (o.photo.url || o.photo.src)) ||
            (Array.isArray(o.photos) && o.photos[0] && (o.photos[0].url || o.photos[0].src)) || '',
      url,
    };
  }

  function looksLikeItem(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
    const hasTitle = typeof (o.title || o.name) === 'string';
    const hasPrice = 'price' in o || 'total_item_price' in o || 'raw_price' in o || 'final_price' in o;
    return hasTitle && hasPrice;
  }

  function extractItems(node, depth = 0) {
    if (!node || depth > 7) return null;
    if (Array.isArray(node)) {
      const good = node.filter(looksLikeItem);
      if (good.length && good.length >= Math.max(1, node.length * 0.5)) return good;
      for (const n of node) { const r = extractItems(n, depth + 1); if (r) return r; }
      return null;
    }
    if (typeof node === 'object') {
      for (const v of Object.values(node)) { const r = extractItems(v, depth + 1); if (r) return r; }
    }
    return null;
  }

  /* --- Recupero automatico --- */
  /* Strategia primaria: r.jina.ai restituisce la pagina di ricerca Vinted come testo leggibile */
  function parseMeta(meta) {
    const parts = meta.split(',').map(s => s.trim());
    const titleParts = [];
    let brand = '', taglia = '';
    for (const p of parts) {
      if (!p) continue;
      if (/€|eur/i.test(p) || /^\d[\d.,]*$/.test(p)) continue; // prezzi
      const m = p.match(/^(Brand|Condizioni|Stato|Taglia|Colore|Materiale|Prezzo):\s*(.*)$/i);
      if (m) {
        const key = m[1].toLowerCase(), val = m[2].trim();
        if (key === 'brand') brand = val;
        else if (key === 'taglia') taglia = val;
      } else titleParts.push(p);
    }
    const prezzo = parsePrice((meta.match(/(\d[\d.,]*)\s*€/) || [])[1] || '');
    return { titolo: titleParts.join(', ').trim(), brand, taglia, prezzo };
  }

  function parseJinaMarkdown(md) {
    const text = String(md || '');
    const IMG_RE = /!\[Image[^:]*:\s*(.*?)\]\((https?:\/\/[^)\s]+)\)/g;
    const LINK_RE = /\[\]\((https?:\/\/[^)\s]*?\/items\/[^)\s]+?)(?:\s+"(.*?)")?\)/g;
    const imgs = [...text.matchAll(IMG_RE)].map(m => ({ pos: m.index, url: m[2] }));
    const links = [...text.matchAll(LINK_RE)];
    const usedImgs = new Set();
    const seen = new Set();
    const out = [];
    for (const link of links) {
      const url = link[1].split('?')[0];
      const meta = link[2] || '';
      if (!meta || seen.has(url)) continue;
      const p = parseMeta(meta);
      if (!p.titolo || !(p.prezzo > 0)) continue;
      seen.add(url);
      let foto = '', best = -1;
      imgs.forEach((im, i) => {
        if (usedImgs.has(i)) return;
        if (im.pos < link.index && im.pos > best) { best = i; foto = im.url; }
      });
      if (best >= 0) usedImgs.add(best);
      out.push({ id: url.split('/').filter(Boolean).pop() || String(out.length), titolo: p.titolo.slice(0, 140), brand: p.brand.slice(0, 60), taglia: p.taglia, prezzo: p.prezzo, foto, url });
    }
    return out;
  }

  /* Strategia secondaria: API JSON di Vinted tramite proxy CORS pubblici */
  const PROXIES = [
    u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    u => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
    u => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
  ];

  function searchTextFromUrl(u) {
    try {
      const url = new URL(String(u).trim());
      return url.searchParams.get('search_text') || url.searchParams.get('q') || '';
    } catch (e) { return ''; }
  }
  function hostFromUrl(u) {
    try { return new URL(String(u).trim()).host || 'www.vinted.it'; }
    catch (e) { return 'www.vinted.it'; }
  }

  async function fetchResults(q, sourceUrl, onStatus) {
    const host = hostFromUrl(sourceUrl || '');
    const eq = encodeURIComponent(q);
    const catalogUrl = `https://${host}/catalog?search_text=${eq}`;

    // 1) Strategia primaria: leggo la pagina di ricerca Vinted come testo
    if (onStatus) onStatus('Apro la ricerca su Vinted…');
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 28000);
      const res = await fetch('https://r.jina.ai/' + catalogUrl, {
        signal: ctrl.signal,
        headers: { 'Accept': 'text/plain' },
      });
      clearTimeout(timer);
      if (res.ok) {
        const items = parseJinaMarkdown(await res.text());
        if (items.length) return items;
      }
    } catch (e) { /* passo alla strategia 2 */ }

    // 2) Strategia secondaria: API JSON di Vinted tramite proxy pubblici
    const targets = [
      `https://${host}/api/v2/search/items?search_text=${eq}&per_page=24&page=1&currency=EUR&order=rank_or_date_desc`,
      `https://${host}/api/v2/catalog/items?search_text=${eq}&per_page=24&page=1&currency=EUR`,
    ];
    let tries = 0;
    for (const target of targets) {
      for (const proxy of PROXIES) {
        tries++;
        if (onStatus) onStatus(`Provo un altro canale… (tentativo ${tries})`);
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 9000);
          const res = await fetch(proxy(target), { signal: ctrl.signal });
          clearTimeout(timer);
          if (!res.ok) continue;
          const data = JSON.parse(await res.text());
          const found = extractItems(data);
          if (found && found.length) {
            return found.map(normalizeItem).filter(x => x.prezzo > 0 && x.titolo);
          }
        } catch (e) { /* proxy non disponibile: provo il prossimo */ }
      }
    }
    return null;
  }

  /* --- Parsing risultati incollati --- */
  const URL_RE = /https?:\/\/[^\s"'<>]*vinted[^\s"'<>]*/i;
  const PRICE_RE = /(?:€|eur)?\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:€|eur)?/i;

  function parsePasted(text) {
    const lines = String(text || '').split(/\r?\n/);
    const out = [];
    let pending = null; // riga senza prezzo, in attesa di un prezzo sulla riga successiva
    for (const raw of lines) {
      const line = raw.replace(/[·•|]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!line) continue;
      const urlMatch = line.match(URL_RE);
      const url = urlMatch ? urlMatch[0] : '';
      const rest = (url ? line.replace(URL_RE, '') : line).trim();

      // prezzo: cerchiamo dopo "€/EUR" oppure l'ultimo numero decimale della riga
      let price = 0, title = rest;
      const explicit = rest.match(/(?:€|eur)\s*(\d{1,5}(?:[.,]\d{1,2})?)|(?:\d{1,5}(?:[.,]\d{1,2})?)\s*(?:€|eur)/i);
      if (explicit) {
        price = parsePrice(explicit[1] || explicit[0]);
        title = rest.replace(explicit[0], ' ').trim();
      } else {
        const loose = rest.match(/(\d{1,5}[.,]\d{2})\b/);
        if (loose) { price = parsePrice(loose[1]); title = rest.replace(loose[0], ' ').trim(); }
      }
      title = title.replace(/^[-–—:;\t]+|[-–—:;\t]+$/g, '').trim();

      if (price > 0 && title.replace(/[^a-zA-Z0-9]/g, '').length >= 2) {
        out.push({ id: 'p' + out.length + '_' + Date.now().toString(36), titolo: title.slice(0, 140), brand: '', prezzo: price, foto: '', url });
        pending = null;
      } else if (url) {
        pending = url; // riga con link utile per la riga-prezzo vicina
      } else if (out.length && url === '' && pending === null) {
        // niente da fare
      }
      if (pending && out.length && !out[out.length - 1].url) {
        out[out.length - 1].url = pending;
        pending = null;
      }
    }
    return out.filter(x => x.prezzo > 0);
  }

  /* --- Valutazione: conviene comprare o no? --- */
  function analyze(items, ctx) {
    const prices = items.map(i => i.prezzo).filter(p => p > 0);
    const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const maxBuy = ctx.resale > 0
      ? Math.max(0, ctx.resale * (1 - ctx.feePct / 100 - ctx.marginPct / 100))
      : null;

    const rows = items.map(item => {
      const P = item.prezzo;
      const profit = maxBuy != null ? ctx.resale * (1 - ctx.feePct / 100) - P : null;
      const roi = profit != null && P > 0 ? profit / P * 100 : null;
      const reasons = [];
      let level = null;

      if (maxBuy != null) {
        if (P <= maxBuy) { level = 'si'; }
        else if (P <= maxBuy * 1.15) { level = 'maybe'; }
        else { level = 'no'; }
      }
      if (avg != null) {
        const delta = (P - avg) / avg * 100;
        if (delta <= -15) reasons.push(`🔥 Sotto la media della ricerca (${delta.toFixed(0)}%)`);
        else if (delta >= 15) reasons.push(`📊 Sopra la media della ricerca (+${delta.toFixed(0)}%)`);
        else reasons.push(`📊 In linea con la media del mercato`);
        if (maxBuy == null) {
          level = P <= avg * 0.8 ? 'si' : P <= avg * 1.05 ? 'maybe' : 'no';
        }
      }
      if (profit != null) {
        reasons.push(profit >= 0
          ? `💰 Guadagno stimato ${money(profit)}${roi != null ? ` · ROI ${roi.toFixed(0)}%` : ''}`
          : `🚨 Rispetto alla vendita attesa perdi ${money(Math.abs(profit))}`);
      }
      if (maxBuy != null) {
        reasons.unshift(P <= maxBuy
          ? `🎯 Sotto la soglia d'acquisto (${money(maxBuy)})`
          : (level === 'maybe'
            ? `🤝 Sopra la soglia ma trattabile: offri fino a ${money(maxBuy)}`
            : `⛔ Sopra la soglia d'acquisto (${money(maxBuy)})`));
      }
      if (level == null) {
        level = 'maybe';
        reasons.push('ℹ️ Indica il prezzo di rivendita atteso per giudicarlo');
      }
      return { item, level, profit, roi, reasons };
    });

    const order = { si: 0, maybe: 1, no: 2 };
    rows.sort((a, b) => (order[a.level] - order[b.level]) || ((b.profit ?? -1e9) - (a.profit ?? -1e9)));

    return {
      rows, avg, maxBuy,
      counts: {
        si: rows.filter(r => r.level === 'si').length,
        maybe: rows.filter(r => r.level === 'maybe').length,
        no: rows.filter(r => r.level === 'no').length,
      },
    };
  }

  /* --- Rendering risultati (usato da Views) --- */
  const LEVELS = {
    si:    { label: '✅ Comprare', cls: 'lv-si' },
    maybe: { label: '⚠️ Trattabile', cls: 'lv-maybe' },
    no:    { label: '❌ Non comprare', cls: 'lv-no' },
  };

  function resultsHTML(analysis, ctx) {
    if (!analysis.rows.length) return '';
    const best = analysis.rows.find(r => r.level === 'si');
    return `
    <div class="scout-summary card">
      <div class="scout-counts">
        <span class="badge b-sold">✅ ${analysis.counts.si} da comprare</span>
        <span class="badge b-foto">⚠️ ${analysis.counts.maybe} trattabili</span>
        <span class="badge b-gray">❌ ${analysis.counts.no} non conviene</span>
      </div>
      <div class="scout-facts">
        ${analysis.avg != null ? `<span>Prezzo medio ricerca: <b>${money(analysis.avg)}</b></span>` : ''}
        ${analysis.maxBuy != null ? `<span>Tua soglia d'acquisto: <b>${money(analysis.maxBuy)}</b></span>` : ''}
        ${best ? `<span>Migliore: <b>${esc(best.item.titolo.slice(0, 40))}</b></span>` : ''}
      </div>
    </div>
    <div class="scout-grid">
      ${analysis.rows.map(r => {
        const L = LEVELS[r.level];
        const id = esc(r.item.id);
        return `<article class="scout-card ${L.cls}">
          <div class="scout-thumb">${r.item.foto ? `<img src="${esc(r.item.foto)}" alt="" loading="lazy">` : '🔎'}</div>
          <div class="scout-info">
            <div class="scout-top">
              <h3>${esc(r.item.titolo)}</h3>
              <span class="scout-price">${money(r.item.prezzo)}</span>
            </div>
            ${r.item.brand ? `<p class="muted small">${esc(r.item.brand)}</p>` : ''}
            <span class="badge ${L.cls === 'lv-si' ? 'b-sold' : L.cls === 'lv-maybe' ? 'b-foto' : 'b-gray'}">${L.label}</span>
            <ul class="scout-reasons">${r.reasons.map(x => `<li>${x}</li>`).join('')}</ul>
            <div class="scout-actions">
              <button class="btn btn-sm btn-primary" data-action="scout-deal" data-id="${id}">➡️ In lista acquisti</button>
              ${r.item.url ? `<button class="btn btn-sm btn-ghost" data-action="open-link" data-href="${esc(r.item.url)}">🔗 Apri su Vinted</button>` : ''}
            </div>
          </div>
        </article>`;
      }).join('')}
    </div>`;
  }

  return {
    parsePrice, parsePasted, parseJinaMarkdown, fetchResults, searchTextFromUrl, analyze, resultsHTML,
  };
})();
