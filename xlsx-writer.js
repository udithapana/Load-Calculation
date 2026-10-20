/* Minimal .xlsx writer (no external libraries): cells, formulas with cached values, styles,
   merges, frozen panes, conditional formatting, page setup, header/footer and PNG images. */
'use strict';
const XW = (() => {
  const enc = new TextEncoder();
  const X = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  // ---------- zip (stored, no compression) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {
    const d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const parts = [], central = [];
    let off = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
    const all = [...parts, ...central, new Uint8Array(e.buffer)];
    const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
    let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }

  // ---------- references ----------
  const colName = c => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
  const ref = (r, c, abs) => abs ? `$${colName(c)}$${r + 1}` : colName(c) + (r + 1);
  const range = (r1, c1, r2, c2) => `${ref(r1, c1)}:${ref(r2, c2)}`;

  // ---------- styles ----------
  const BUILTIN_FMT = { 'General': 0, '0': 1, '0.00': 2, '#,##0': 3, '#,##0.00': 4, '0%': 9, '0.00%': 10 };
  class Styles {
    constructor() {
      this.fonts = []; this.fills = []; this.borders = []; this.fmts = []; this.xfs = []; this.dxfs = [];
      this.fontMap = new Map(); this.fillMap = new Map(); this.borderMap = new Map(); this.fmtMap = new Map(); this.xfMap = new Map(); this.dxfMap = new Map();
      this.font({}); this.fills.push('<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>');
      this.border(null); this.xf({});
    }
    fontXml(f) { return `<font>${f.b ? '<b/>' : ''}${f.i ? '<i/>' : ''}${f.u ? '<u/>' : ''}${f.strike ? '<strike/>' : ''}<sz val="${f.sz || 10}"/><color rgb="FF${f.color || '1A1A1A'}"/><name val="${X(f.name || 'Calibri')}"/><family val="2"/></font>`; }
    add(list, map, xml) { if (!map.has(xml)) { map.set(xml, list.length); list.push(xml); } return map.get(xml); }
    font(f) { return this.add(this.fonts, this.fontMap, this.fontXml(f || {})); }
    fill(hex) { return hex ? this.add(this.fills, this.fillMap, `<fill><patternFill patternType="solid"><fgColor rgb="FF${hex}"/><bgColor indexed="64"/></patternFill></fill>`) : 0; }
    border(b) {
      if (!b) return this.add(this.borders, this.borderMap, '<border><left/><right/><top/><bottom/><diagonal/></border>');
      const col = b.color || 'B8C2D3';
      const side = (n, st) => st ? `<${n} style="${st}"><color rgb="FF${col}"/></${n}>` : `<${n}/>`;
      const g = k => b[k] || b.all;
      return this.add(this.borders, this.borderMap, `<border>${side('left', g('left'))}${side('right', g('right'))}${side('top', g('top'))}${side('bottom', g('bottom'))}<diagonal/></border>`);
    }
    fmt(code) {
      if (code == null) return 0;
      if (code in BUILTIN_FMT) return BUILTIN_FMT[code];
      if (!this.fmtMap.has(code)) { const id = 164 + this.fmts.length; this.fmtMap.set(code, id); this.fmts.push(`<numFmt numFmtId="${id}" formatCode="${X(code)}"/>`); }
      return this.fmtMap.get(code);
    }
    xf(s) {
      const key = JSON.stringify(s || {});
      if (this.xfMap.has(key)) return this.xfMap.get(key);
      s = s || {};
      const fontId = this.font(s.font), fillId = this.fill(s.fill), borderId = this.border(s.border), numFmtId = this.fmt(s.numFmt);
      const a = s.align || {};
      const al = (a.h || a.v || a.wrap || a.rot || a.indent) ? `<alignment${a.h ? ` horizontal="${a.h}"` : ''}${a.v ? ` vertical="${a.v}"` : ''}${a.wrap ? ' wrapText="1"' : ''}${a.rot ? ` textRotation="${a.rot}"` : ''}${a.indent ? ` indent="${a.indent}"` : ''}/>` : '';
      const xml = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"${numFmtId ? ' applyNumberFormat="1"' : ''}${fontId ? ' applyFont="1"' : ''}${fillId ? ' applyFill="1"' : ''}${borderId ? ' applyBorder="1"' : ''}${al ? ' applyAlignment="1">' + al + '</xf>' : '/>'}`;
      const id = this.xfs.length; this.xfs.push(xml); this.xfMap.set(key, id);
      return id;
    }
    dxf(s) {
      const xml = `<dxf>${s.font ? `<font>${s.font.b ? '<b/>' : ''}${s.font.color ? `<color rgb="FF${s.font.color}"/>` : ''}</font>` : ''}${s.fill ? `<fill><patternFill patternType="solid"><bgColor rgb="FF${s.fill}"/></patternFill></fill>` : ''}</dxf>`;
      return this.add(this.dxfs, this.dxfMap, xml);
    }
    xml() {
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        (this.fmts.length ? `<numFmts count="${this.fmts.length}">${this.fmts.join('')}</numFmts>` : '') +
        `<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts><fills count="${this.fills.length}">${this.fills.join('')}</fills>` +
        `<borders count="${this.borders.length}">${this.borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
        `<dxfs count="${this.dxfs.length}">${this.dxfs.join('')}</dxfs><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
    }
  }

  // ---------- sheet ----------
  class Sheet {
    constructor(wb, name) {
      this.wb = wb; this.name = name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
      this.cells = new Map(); this.cols = {}; this.heights = {}; this.merges = []; this.cf = []; this.images = [];
      this.freeze = null; this.grid = true; this.landscape = false; this.footer = ''; this.printRows = null; this.maxR = 0; this.maxC = 0; this.zoom = 100;
    }
    set(r, c, v, style, f) {
      const s = style == null ? 0 : (typeof style === 'number' ? style : this.wb.styles.xf(style));
      this.cells.set(r * 16384 + c, { r, c, v, f, s });
      this.maxR = Math.max(this.maxR, r); this.maxC = Math.max(this.maxC, c);
      return this;
    }
    style(r1, c1, r2, c2, style) {   // apply a style to a block, keeping values
      const s = this.wb.styles.xf(style);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
        const k = r * 16384 + c, cell = this.cells.get(k);
        if (cell) cell.s = s; else this.set(r, c, null, s);
      }
    }
    width(c, w) { this.cols[c] = w; return this; }
    height(r, h) { this.heights[r] = h; return this; }
    merge(r1, c1, r2, c2) { this.merges.push(range(r1, c1, r2, c2)); return this; }
    cond(sqref, rules) { this.cf.push({ sqref, rules }); return this; }
    image(bytes, c, r, w, h) { this.images.push({ bytes, c, r, w, h }); return this; }
    cellXml(cell) {
      const a = ` r="${ref(cell.r, cell.c)}"${cell.s ? ` s="${cell.s}"` : ''}`;
      const v = cell.v;
      if (cell.f) {
        const fx = `<f>${X(cell.f.replace(/^=/, ''))}</f>`;
        if (v == null || v === '') return `<c${a}>${fx}</c>`;
        if (typeof v === 'number') return `<c${a}>${fx}<v>${isFinite(v) ? v : 0}</v></c>`;
        if (typeof v === 'boolean') return `<c${a} t="b">${fx}<v>${v ? 1 : 0}</v></c>`;
        return `<c${a} t="str">${fx}<v>${X(v)}</v></c>`;
      }
      if (v == null || v === '') return `<c${a}/>`;
      if (typeof v === 'number') return isFinite(v) ? `<c${a}><v>${v}</v></c>` : `<c${a}/>`;
      if (typeof v === 'boolean') return `<c${a} t="b"><v>${v ? 1 : 0}</v></c>`;
      return `<c${a} t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`;
    }
    xml(index) {
      const rows = new Map();
      for (const cell of this.cells.values()) { if (!rows.has(cell.r)) rows.set(cell.r, []); rows.get(cell.r).push(cell); }
      Object.keys(this.heights).forEach(r => { if (!rows.has(+r)) rows.set(+r, []); });
      const rowKeys = [...rows.keys()].sort((a, b) => a - b);
      let pane = '';
      if (this.freeze) {
        const [fr, fc] = this.freeze;
        const act = fr && fc ? 'bottomRight' : fr ? 'bottomLeft' : 'topRight';
        pane = `<pane${fc ? ` xSplit="${fc}"` : ''}${fr ? ` ySplit="${fr}"` : ''} topLeftCell="${ref(fr, fc)}" activePane="${act}" state="frozen"/><selection pane="${act}" activeCell="${ref(fr, fc)}" sqref="${ref(fr, fc)}"/>`;
      }
      const cols = Object.keys(this.cols).map(Number).sort((a, b) => a - b).map(c => `<col min="${c + 1}" max="${c + 1}" width="${this.cols[c]}" customWidth="1"/>`).join('');
      let prio = 1;
      const cf = this.cf.map(g => `<conditionalFormatting sqref="${g.sqref}">` + g.rules.map(r => {
        const dx = this.wb.styles.dxf(r.style);
        if (r.type === 'cellIs') return `<cfRule type="cellIs" dxfId="${dx}" priority="${prio++}" operator="${r.op}"><formula>${X(r.formula)}</formula></cfRule>`;
        return `<cfRule type="expression" dxfId="${dx}" priority="${prio++}"${r.stop ? ' stopIfTrue="1"' : ''}><formula>${X(r.formula)}</formula></cfRule>`;
      }).join('') + '</conditionalFormatting>').join('');
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${ref(this.maxR, this.maxC)}"/>` +
        `<sheetViews><sheetView workbookViewId="0"${this.grid ? '' : ' showGridLines="0"'}${index === 0 ? ' tabSelected="1"' : ''}${this.zoom !== 100 ? ` zoomScale="${this.zoom}" zoomScaleNormal="${this.zoom}"` : ''}>${pane}</sheetView></sheetViews>` +
        `<sheetFormatPr defaultRowHeight="15"/>` + (cols ? `<cols>${cols}</cols>` : '') +
        `<sheetData>${rowKeys.map(r => `<row r="${r + 1}"${this.heights[r] ? ` ht="${this.heights[r]}" customHeight="1"` : ''}>${(rows.get(r) || []).sort((a, b) => a.c - b.c).map(c => this.cellXml(c)).join('')}</row>`).join('')}</sheetData>` +
        (this.merges.length ? `<mergeCells count="${this.merges.length}">${this.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '') + cf +
        `<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.75" header="0.3" footer="0.3"/>` +
        `<pageSetup paperSize="9" orientation="${this.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>` +
        (this.footer ? `<headerFooter><oddFooter>${X(this.footer)}</oddFooter></headerFooter>` : '') +
        (this.images.length ? '<drawing r:id="rId1"/>' : '') + '</worksheet>';
    }
  }

  // ---------- workbook ----------
  class Workbook {
    constructor(meta = {}) { this.styles = new Styles(); this.sheets = []; this.meta = meta; }
    sheet(name) { const s = new Sheet(this, name); this.sheets.push(s); return s; }
    build() {
      const files = [], ct = [], wbRels = [];
      let media = 0, drawings = 0;
      this.sheets.forEach((s, i) => {
        const n = i + 1;
        files.push({ name: `xl/worksheets/sheet${n}.xml`, data: s.xml(i) });
        ct.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
        wbRels.push(`<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`);
        if (s.images.length) {
          const dn = ++drawings;
          files.push({ name: `xl/worksheets/_rels/sheet${n}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${dn}.xml"/></Relationships>` });
          const dRels = [], anchors = [];
          s.images.forEach((im, k) => {
            const m = ++media;
            files.push({ name: `xl/media/image${m}.png`, data: im.bytes });
            dRels.push(`<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${m}.png"/>`);
            anchors.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>${im.c}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${im.r}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${Math.round(im.w * 9525)}" cy="${Math.round(im.h * 9525)}"/>` +
              `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${k + 2}" name="Chart ${k + 1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${k + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
              `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(im.w * 9525)}" cy="${Math.round(im.h * 9525)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`);
          });
          files.push({ name: `xl/drawings/drawing${dn}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors.join('')}</xdr:wsDr>` });
          files.push({ name: `xl/drawings/_rels/drawing${dn}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${dRels.join('')}</Relationships>` });
          ct.push(`<Override PartName="/xl/drawings/drawing${dn}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
        }
      });
      const n = this.sheets.length;
      wbRels.push(`<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`);
      const defined = this.sheets.map((s, i) => s.printRows ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${X(s.name.replace(/'/g, "''"))}'!$${s.printRows[0] + 1}:$${s.printRows[1] + 1}</definedName>` : '').join('');
      files.unshift(
        { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${ct.join('')}</Types>` },
        { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
        { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${X(this.meta.title || '')}</dc:title><dc:creator>${X(this.meta.creator || '')}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>` },
        { name: 'docProps/app.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application><Company>${X(this.meta.company || '')}</Company></Properties>` },
        { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${this.sheets.map((s, i) => `<sheet name="${X(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${defined ? `<definedNames>${defined}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
        { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels.join('')}</Relationships>` }
      );
      files.push({ name: 'xl/styles.xml', data: this.styles.xml() });   // styles last: sheets register dxfs while serialising
      return zip(files);
    }
  }
  return { Workbook, colName, ref, range, zip };
})();
