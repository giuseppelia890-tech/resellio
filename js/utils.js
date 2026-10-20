/* ===== Resellio — utilità ===== */
const Utils = (() => {
  const EUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  const EUR0 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

  function money(n) { return EUR.format(Number(n) || 0); }
  function money0(n) { return EUR0.format(Number(n) || 0); }

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = parseFloat(String(v ?? '').replace(/[^\d,.\-]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function uid() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function today() { return isoDate(new Date()); }
  function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); }

  function fmtDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = String(iso).split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }

  function monthKey(iso) { return String(iso || '').slice(0, 7); }
  function currentMonthKey() { return monthKey(today()); }
  function monthLabel(key) {
    const m = parseInt(String(key).split('-')[1], 10);
    return MESI[(m || 1) - 1];
  }
  /** Chiavi degli ultimi n mesi (il più recente per ultimo) */
  function lastMonthKeys(n) {
    const keys = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 0; i < n; i++) {
      keys.unshift(isoDate(d).slice(0, 7));
      d.setMonth(d.getMonth() - 1);
    }
    return keys;
  }

  function formValues(form) {
    const out = {};
    form.querySelectorAll('[name]').forEach(el => {
      out[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return out;
  }

  function resizeImage(file, max = 900, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('lettura file fallita'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('immagine non valida'));
        img.onload = () => {
          let w = img.naturalWidth, h = img.naturalHeight;
          const scale = Math.min(1, max / Math.max(w, h));
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function toast(msg, type = '') {
    const root = document.getElementById('toast-root');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 350); }, 2600);
  }

  function copyText(text) {
    const done = () => toast('Copiato negli appunti ✓', 'ok');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallback());
    } else fallback();
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { toast('Copia non riuscita', 'err'); }
      ta.remove();
    }
  }

  function download(filename, text, type = 'application/json') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 400);
  }

  /* Grafico a barre (1 o più serie, gestisce valori negativi) */
  function chart(data, series, opts = {}) {
    const all = series.flatMap(s => s.values);
    const max = Math.max(0, ...all), min = Math.min(0, ...all);
    if (max === 0 && min === 0) return '<div class="chart-empty">Nessun dato per questo periodo</div>';
    const W = 640, H = opts.height || 210, pl = 8, pr = 8, pt = 24, pb = 28;
    const iw = W - pl - pr, ih = H - pt - pb, span = (max - min) || 1;
    const y = v => pt + ih * ((max - v) / span);
    const zeroY = y(0);
    const step = iw / data.length;
    const ns = series.length;
    const groupW = Math.min(step * 0.66, 54);
    const bw = groupW / ns;
    let bars = '', labels = '', vals = '';
    if (ns === 1) {
      data.forEach((d, i) => {
        const v = series[0].values[i] || 0;
        if (!v) return;
        const yy = y(v);
        const ty = v >= 0 ? yy - 6 : zeroY + Math.abs(zeroY - yy) + 13;
        vals += `<text x="${(pl + step * i + step / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" class="chart-val" fill="${v >= 0 ? '#12996b' : '#e5484d'}">${esc(money0(v))}</text>`;
      });
    }
    data.forEach((d, i) => {
      const x = pl + step * i + (step - groupW) / 2;
      series.forEach((s, si) => {
        const v = s.values[i] || 0;
        const top = Math.min(y(v), zeroY);
        const hgt = Math.abs(zeroY - y(v));
        bars += `<rect x="${(x + si * bw).toFixed(1)}" y="${top.toFixed(1)}" width="${(bw - 2.5).toFixed(1)}" height="${Math.max(hgt, v === 0 ? 0 : 1.5).toFixed(1)}" rx="3.5" fill="${s.color}"><title>${esc(d.label)} · ${esc(s.name)}: ${esc(money(v))}</title></rect>`;
      });
      labels += `<text x="${(pl + step * i + step / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="chart-label">${esc(d.label)}</text>`;
    });
    const axis = `<line x1="${pl}" y1="${zeroY}" x2="${W - pr}" y2="${zeroY}" class="chart-axis"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Grafico">${axis}${bars}${vals}${labels}</svg>`;
  }

  function emptyState(emoji, title, text, actionsHtml = '') {
    return `<div class="card empty">
      <div class="empty-emoji">${emoji}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${actionsHtml}
    </div>`;
  }

  return {
    money, money0, num, esc, uid, today, isoDate, daysAgo, fmtDate,
    monthKey, currentMonthKey, monthLabel, lastMonthKeys,
    formValues, resizeImage, toast, copyText, download, chart, emptyState,
  };
})();
