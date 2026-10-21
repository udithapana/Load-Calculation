/* Minimal PDF writer (no external libraries): A4 pages in millimetres, Helvetica / Helvetica-Bold text
   (Windows-1252 characters), lines, rectangles, circles and JPEG images. Used for the load calculation report. */
'use strict';
const PW = (() => {
  const W = { R: [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761, 556, 0, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500], B: [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761, 556, 0, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0, 0, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 0, 500, 667, 278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333, 400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611, 722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278, 611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556] };
  const MAP = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142,
    '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159 };
  const SUB = { '→': '->', '←': '<-', '≈': '~', '≤': '<=', '≥': '>=', '✓': 'OK', '✕': 'x', ' ': ' ', '−': '-', '‑': '-', 'φ': 'ph', ' ': ' ', ' ': ' ', '∑': 'Sum ', '⅓': '1/3', 'Σ': 'Sum ', '⅔': '2/3' };
  const K = 72 / 25.4;                       // mm -> pt
  const enc = new TextEncoder();
  // text -> array of Windows-1252 codes
  function codes(s) {
    const out = [];
    for (const chRaw of String(s == null ? '' : s)) {
      const ch = SUB[chRaw] !== undefined ? SUB[chRaw] : chRaw;
      for (const c of ch) {
        const u = c.codePointAt(0);
        if (u >= 32 && u < 127) out.push(u);
        else if (MAP[c]) out.push(MAP[c]);
        else if (u >= 160 && u <= 255) out.push(u);
        else if (u === 9) out.push(32);
        else out.push(63);                 // "?"
      }
    }
    return out;
  }
  function width(s, size, bold) {
    const t = W[bold ? 'B' : 'R'];
    return codes(s).reduce((a, c) => a + (t[c - 32] || 556), 0) * size / 1000 / K;   // mm
  }
  function esc(cs) { return cs.map(c => (c === 40 || c === 41 || c === 92) ? '\\' + String.fromCharCode(c) : (c < 128 ? String.fromCharCode(c) : '\\' + c.toString(8).padStart(3, '0'))).join(''); }
  function wrap(s, maxW, size, bold) {
    const lines = [];
    String(s == null ? '' : s).split('\n').forEach(par => {
      const words = par.split(/\s+/).filter(x => x !== ''); let line = '';
      if (!words.length) { lines.push(''); return; }
      for (const w0 of words) {
        let w = w0;
        const test = line ? line + ' ' + w : w;
        if (width(test, size, bold) <= maxW) { line = test; continue; }
        if (line) lines.push(line);
        while (width(w, size, bold) > maxW && w.length > 1) {        // break very long words
          let k = w.length; while (k > 1 && width(w.slice(0, k), size, bold) > maxW) k--;
          lines.push(w.slice(0, k)); w = w.slice(k);
        }
        line = w;
      }
      lines.push(line);
    });
    return lines;
  }
  const rgb = hex => { const h = String(hex || '000000').replace('#', ''); return [0, 2, 4].map(i => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' '); };

  class Doc {
    constructor(opt) { opt = opt || {}; this.w = opt.w || 210; this.h = opt.h || 297; this.pages = []; this.images = []; this.addPage(); }
    addPage() { this.cur = []; this.pages.push(this.cur); return this; }
    get pageCount() { return this.pages.length; }
    setPage(i) { this.cur = this.pages[i - 1]; }
    Y(y) { return ((this.h - y) * K).toFixed(2); }
    X(x) { return (x * K).toFixed(2); }
    text(x, y, s, o) {
      o = o || {};
      const size = o.size || 9, bold = !!o.bold;
      let tx = x; const wd = width(s, size, bold);
      if (o.align === 'right') tx = x - wd; else if (o.align === 'center') tx = x - wd / 2;
      this.cur.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + rgb(o.color) + ' rg ' + this.X(tx) + ' ' + this.Y(y) + ' Td (' + esc(codes(s)) + ') Tj ET');
      return wd;
    }
    line(x1, y1, x2, y2, o) {
      o = o || {};
      const dash = o.dash ? '[' + o.dash.map(d => (d * K).toFixed(2)).join(' ') + '] 0 d ' : '';
      this.cur.push('q ' + rgb(o.color || '9AA5B8') + ' RG ' + ((o.width || 0.25) * K).toFixed(2) + ' w ' + dash + this.X(x1) + ' ' + this.Y(y1) + ' m ' + this.X(x2) + ' ' + this.Y(y2) + ' l S Q');
    }
    rect(x, y, w, h, o) {
      o = o || {};
      const op = o.fill && o.stroke ? 'B' : o.fill ? 'f' : 'S';
      this.cur.push('q ' + (o.fill ? rgb(o.fill) + ' rg ' : '') + (o.stroke ? rgb(o.stroke) + ' RG ' : '') + ((o.width || 0.25) * K).toFixed(2) + ' w ' +
        this.X(x) + ' ' + this.Y(y + h) + ' ' + (w * K).toFixed(2) + ' ' + (h * K).toFixed(2) + ' re ' + op + ' Q');
    }
    circle(cx, cy, r, o) {
      o = o || {};
      const c = 0.5523 * r, X = v => this.X(v), Yy = v => this.Y(v);
      const op = o.fill && o.stroke ? 'B' : o.fill ? 'f' : 'S';
      this.cur.push('q ' + (o.fill ? rgb(o.fill) + ' rg ' : '') + (o.stroke ? rgb(o.stroke) + ' RG ' : '') + ((o.width || 0.25) * K).toFixed(2) + ' w ' +
        X(cx + r) + ' ' + Yy(cy) + ' m ' +
        X(cx + r) + ' ' + Yy(cy - c) + ' ' + X(cx + c) + ' ' + Yy(cy - r) + ' ' + X(cx) + ' ' + Yy(cy - r) + ' c ' +
        X(cx - c) + ' ' + Yy(cy - r) + ' ' + X(cx - r) + ' ' + Yy(cy - c) + ' ' + X(cx - r) + ' ' + Yy(cy) + ' c ' +
        X(cx - r) + ' ' + Yy(cy + c) + ' ' + X(cx - c) + ' ' + Yy(cy + r) + ' ' + X(cx) + ' ' + Yy(cy + r) + ' c ' +
        X(cx + c) + ' ' + Yy(cy + r) + ' ' + X(cx + r) + ' ' + Yy(cy + c) + ' ' + X(cx + r) + ' ' + Yy(cy) + ' c ' + op + ' Q');
    }
    // JPEG bytes (Uint8Array) of pw x ph pixels, drawn at x,y with size w x h (mm)
    image(jpeg, pw, ph, x, y, w, h) {
      const id = this.images.length + 1; this.images.push({ jpeg, pw, ph });
      this.cur.push('q ' + (w * K).toFixed(2) + ' 0 0 ' + (h * K).toFixed(2) + ' ' + this.X(x) + ' ' + this.Y(y + h) + ' cm /Im' + id + ' Do Q');
    }
    width(s, size, bold) { return width(s, size, bold); }
    wrap(s, maxW, size, bold) { return wrap(s, maxW, size, bold); }
    output(meta) {
      meta = meta || {};
      const objs = [];
      const add = body => { objs.push(body); return objs.length; };
      const catalog = add(null), pagesObj = add(null);
      const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const imgObjs = this.images.map(im => add({ dict: '<< /Type /XObject /Subtype /Image /Width ' + im.pw + ' /Height ' + im.ph + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.jpeg.length + ' >>', bin: im.jpeg }));
      const xo = imgObjs.length ? '/XObject << ' + imgObjs.map((n, i) => '/Im' + (i + 1) + ' ' + n + ' 0 R').join(' ') + ' >>' : '';
      const pageNums = this.pages.map(ops => {
        const content = enc.encode(ops.join('\n'));
        const cs = add({ dict: '<< /Length ' + content.length + ' >>', bin: content });
        return add('<< /Type /Page /Parent ' + pagesObj + ' 0 R /MediaBox [0 0 ' + (this.w * K).toFixed(2) + ' ' + (this.h * K).toFixed(2) + '] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >> ' + xo + ' >> /Contents ' + cs + ' 0 R >>');
      });
      objs[catalog - 1] = '<< /Type /Catalog /Pages ' + pagesObj + ' 0 R >>';
      objs[pagesObj - 1] = '<< /Type /Pages /Kids [' + pageNums.map(n => n + ' 0 R').join(' ') + '] /Count ' + pageNums.length + ' >>';
      const lit = s => '(' + esc(codes(String(s).replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7e]/g, ''))) + ')';   // document info: plain ASCII
      const info = add('<< /Title ' + lit(meta.title || '') + ' /Author ' + lit(meta.author || '') + ' /Creator ' + lit(meta.creator || '') + ' /Producer (Regen Load Calculator) >>');
      const parts = []; let len = 0; const offs = [];
      const push = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
      push('%PDF-1.4\n%');
      push(new Uint8Array([0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
      objs.forEach((o, i) => {
        offs.push(len);
        if (typeof o === 'string') push((i + 1) + ' 0 obj\n' + o + '\nendobj\n');
        else { push((i + 1) + ' 0 obj\n' + o.dict + '\nstream\n'); push(o.bin); push('\nendstream\nendobj\n'); }
      });
      const xref = len;
      push('xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join(''));
      push('trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
      const out = new Uint8Array(len); let p = 0; parts.forEach(u => { out.set(u, p); p += u.length; });
      return out;
    }
  }
  return { Doc, width, wrap };
})();
