/* Regen Hybrid Load Calculator — shared catalogue, data model and load-analysis engine.
   Used by form.html (customer form) and index.html (engineer app). */
'use strict';
const HLC = (() => {
  const FORM_TYPE = 'regen-hybrid-load-form';
  const PROJECT_TYPE = 'regen-hybrid-load-project';
  const VERSION = 1;
  const LS_PREFIX = 'hlc_';           // every storage key this app uses starts with this

  const COMPANY = {
    name: 'Regen Renewables (Pvt) Ltd.',
    tag: 'Regen – The Solar Energy Company',
    addr: '31/10, Castle Street, Colombo 8. 00800 Sri Lanka',
    web: 'regen.lk'
  };
  const copyright = () => `© ${new Date().getFullYear()} Regen Renewables (Pvt) Ltd. All Rights Reserved.`;
  const NOTICE = 'This document, including all designs, drawings, specifications and technical information, is the intellectual property of Regen Renewables (Pvt) Ltd. It is confidential and may not be copied, reproduced, modified, distributed or shared with third parties without prior written consent.';
  const COMPANY_LINE = 'Regen Renewables (Pvt) Ltd.   |   31/10, Castle Street, Colombo 8. 00800 Sri Lanka   |   regen.lk';

  // Load types: default starting-current (surge) multiplier
  const TYPES = {
    R: { label: 'Heating / resistive', s: 1 },
    M: { label: 'Motor / compressor', s: 3 },
    I: { label: 'Inverter-type motor', s: 1.5 },
    E: { label: 'Electronic', s: 1 },
    L: { label: 'Lighting', s: 1 }
  };

  // k key, n name, w typical W per unit, t type, s surge ×, d duty (energy only), f flexible by default, h typical hours
  const CATS = [
    { id: 'light', name: 'Lighting', items: [
      { k: 'led_bulb', n: 'LED bulb', w: 9, t: 'L', h: [18, 19, 20, 21, 22] },
      { k: 'led_tube', n: 'LED tube light', w: 18, t: 'L', h: [18, 19, 20, 21, 22] },
      { k: 'cfl', n: 'CFL bulb', w: 15, t: 'L', h: [18, 19, 20, 21, 22] },
      { k: 'outdoor_light', n: 'Outdoor / security light', w: 30, t: 'L', h: [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5] }
    ]},
    { id: 'cool', name: 'Fans & air conditioning', items: [
      { k: 'ceiling_fan', n: 'Ceiling fan', w: 75, t: 'M', s: 2 },
      { k: 'stand_fan', n: 'Table / stand fan', w: 55, t: 'M', s: 2 },
      { k: 'exhaust_fan', n: 'Exhaust fan', w: 40, t: 'M', s: 2 },
      { k: 'ac_inv_9', n: 'Air conditioner – inverter 9,000 BTU', w: 800, t: 'I', d: 0.7 },
      { k: 'ac_inv_12', n: 'Air conditioner – inverter 12,000 BTU', w: 1100, t: 'I', d: 0.7 },
      { k: 'ac_inv_18', n: 'Air conditioner – inverter 18,000 BTU', w: 1650, t: 'I', d: 0.7 },
      { k: 'ac_inv_24', n: 'Air conditioner – inverter 24,000 BTU', w: 2200, t: 'I', d: 0.7 },
      { k: 'ac_fix_12', n: 'Air conditioner – non-inverter 12,000 BTU', w: 1300, t: 'M', d: 0.85 },
      { k: 'ac_fix_18', n: 'Air conditioner – non-inverter 18,000 BTU', w: 1900, t: 'M', d: 0.85 }
    ]},
    { id: 'kitchen', name: 'Kitchen', items: [
      { k: 'fridge', n: 'Refrigerator', w: 150, t: 'M', d: 0.4, h: 'all' },
      { k: 'fridge_inv', n: 'Refrigerator – inverter type', w: 100, t: 'I', d: 0.4, h: 'all' },
      { k: 'freezer', n: 'Deep freezer', w: 200, t: 'M', d: 0.5, h: 'all' },
      { k: 'rice_cooker', n: 'Rice cooker', w: 700, t: 'R', d: 0.6, f: 1 },
      { k: 'kettle', n: 'Electric kettle', w: 1500, t: 'R', f: 1 },
      { k: 'microwave', n: 'Microwave oven', w: 1200, t: 'E', s: 1.5, f: 1 },
      { k: 'induction', n: 'Induction cooker', w: 2000, t: 'E', d: 0.8 },
      { k: 'oven', n: 'Electric oven', w: 2000, t: 'R', d: 0.7, f: 1 },
      { k: 'blender', n: 'Blender / mixer grinder', w: 500, t: 'M', s: 2, f: 1 },
      { k: 'wet_grinder', n: 'Wet grinder', w: 300, t: 'M', f: 1 },
      { k: 'toaster', n: 'Toaster / sandwich maker', w: 800, t: 'R', f: 1 },
      { k: 'dispenser', n: 'Water dispenser (hot & cold)', w: 500, t: 'R', d: 0.3, h: 'all' },
      { k: 'dishwasher', n: 'Dishwasher', w: 1800, t: 'R', d: 0.7, f: 1 }
    ]},
    { id: 'laundry', name: 'Laundry & cleaning', items: [
      { k: 'washer_top', n: 'Washing machine – top load', w: 500, t: 'M', d: 0.6, f: 1 },
      { k: 'washer_front', n: 'Washing machine – front load (with heater)', w: 2000, t: 'R', s: 1.5, d: 0.5, f: 1 },
      { k: 'dryer', n: 'Clothes dryer', w: 2500, t: 'R', s: 1.5, d: 0.8, f: 1 },
      { k: 'iron', n: 'Clothes iron', w: 1000, t: 'R', d: 0.6, f: 1 },
      { k: 'vacuum', n: 'Vacuum cleaner', w: 1200, t: 'M', s: 2, f: 1 }
    ]},
    { id: 'water', name: 'Water pumps & heaters', items: [
      { k: 'pump_05', n: 'Water pump 0.5 HP', w: 375, t: 'M', d: 0.5, f: 1 },
      { k: 'pump_1', n: 'Water pump 1 HP', w: 750, t: 'M', d: 0.5, f: 1 },
      { k: 'booster', n: 'Pressure booster pump', w: 750, t: 'M', d: 0.3 },
      { k: 'geyser', n: 'Water heater / geyser (storage)', w: 3000, t: 'R', d: 0.5, f: 1 },
      { k: 'shower', n: 'Instant shower heater', w: 3500, t: 'R', d: 0.5 }
    ]},
    { id: 'media', name: 'TV, computers & electronics', items: [
      { k: 'tv_small', n: 'TV (up to 43")', w: 70, t: 'E' },
      { k: 'tv_large', n: 'TV (50" and above)', w: 130, t: 'E' },
      { k: 'desktop', n: 'Desktop computer', w: 200, t: 'E' },
      { k: 'laptop', n: 'Laptop', w: 65, t: 'E' },
      { k: 'router', n: 'Wi-Fi router', w: 15, t: 'E', h: 'all' },
      { k: 'sound', n: 'Sound system', w: 100, t: 'E' },
      { k: 'cctv', n: 'CCTV system', w: 60, t: 'E', h: 'all' },
      { k: 'printer', n: 'Printer', w: 300, t: 'E', f: 1 },
      { k: 'chargers', n: 'Phone / device chargers', w: 10, t: 'E', f: 1 }
    ]},
    { id: 'other', name: 'Other', items: [
      { k: 'hair_dryer', n: 'Hair dryer', w: 1200, t: 'R' },
      { k: 'gate_motor', n: 'Gate motor', w: 300, t: 'M' },
      { k: 'treadmill', n: 'Treadmill', w: 1500, t: 'M', f: 1 },
      { k: 'aquarium', n: 'Aquarium pump / filter', w: 30, t: 'M', s: 1.5, h: 'all' },
      { k: 'ev_charger', n: 'Electric vehicle charger', w: 7000, t: 'E', f: 1 },
      { k: 'custom', n: 'Other appliance', w: 0, t: 'E' }
    ]}
  ];
  const ITEM = {};
  CATS.forEach(c => c.items.forEach(it => { it.cat = c.id; ITEM[it.k] = it; }));
  const CAT_NAME = Object.fromEntries(CATS.map(c => [c.id, c.name]));

  // ---------- small helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
  const hh = h => String(((h % 24) + 24) % 24).padStart(2, '0') + ':00';
  const ampm = h => { h = ((h % 24) + 24) % 24; const s = h < 12 ? 'AM' : 'PM'; const x = h % 12 === 0 ? 12 : h % 12; return x + ' ' + s; };
  const ampmShort = h => { h = ((h % 24) + 24) % 24; return (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? 'a' : 'p'); };
  const countHrs = hrs => hrs.reduce((s, x) => s + (x ? 1 : 0), 0);
  const fmtKW = w => (w / 1000).toFixed(2);
  const emptyHrs = () => new Array(24).fill(0);

  // consecutive blocks of 1s in a 24-slot array, joined across midnight
  function blocks(hrs) {
    const n = countHrs(hrs);
    if (n === 0) return [];
    if (n === 24) return [[0, 24]];
    let start = 0;
    while (hrs[start] || !hrs[(start + 23) % 24]) { start = (start + 1) % 24; if (start === 0) break; }
    // start = an hour that is on and whose previous hour is off
    const out = [];
    for (let i = 0; i < 24; i++) {
      const h = (start + i) % 24;
      if (hrs[h] && !hrs[(h + 23) % 24]) out.push([h, h]);
      if (hrs[h]) out[out.length - 1][1] = h + 1;
    }
    return out.sort((a, b) => a[0] - b[0]);
  }
  function slotsText(hrs, style = '24') {
    const f = style === '12' ? ampm : hh;
    return blocks(hrs).map(([a, b]) => b - a >= 24 ? 'All day (24 h)' : `${f(a)}–${f(b)}`).join(', ');
  }

  // ---------- storage (always prefixed; never clears other apps' data) ----------
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(LS_PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(LS_PREFIX + k); } catch (e) { } }
  };

  // Robust JSON reader for files that went through WhatsApp / email (BOM, trailing junk)
  function parseFileText(text) {
    let t = String(text).replace(/^﻿/, '').trim();
    try { return JSON.parse(t); } catch (e) { }
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) {
      // trim trailing garbage progressively
      let end = b;
      while (end > a) {
        try { return JSON.parse(t.slice(a, end + 1)); } catch (e) { end = t.lastIndexOf('}', end - 1); }
      }
    }
    throw new Error('This file is not a load form or project file.');
  }

  // ---------- appliance model ----------
  function newAppliance(k) {
    const it = ITEM[k] || ITEM.custom;
    let hrs = emptyHrs();
    if (it.h === 'all') hrs = new Array(24).fill(1);
    else if (Array.isArray(it.h)) it.h.forEach(h => hrs[h] = 1);
    return normalise({
      id: uid(), k: it.k, cat: it.cat, name: it.k === 'custom' ? '' : it.n,
      qty: 1, qtyOn: 1, w: it.w, unit: 'W', t: it.t, s: it.s ?? TYPES[it.t].s, d: it.d ?? 1,
      f: !!it.f, b: false, use: 'daily', hrs, hpd: countHrs(hrs), hpdManual: false, notes: '', ph: '', inc: true
    });
  }
  function normalise(a) {
    const it = ITEM[a.k] || ITEM.custom;
    a.id = a.id || uid();
    a.k = ITEM[a.k] ? a.k : 'custom';
    a.cat = a.cat || it.cat;
    a.name = String(a.name ?? it.n ?? '').slice(0, 80);
    a.qty = Math.max(0, Math.round(num(a.qty, 1)));
    a.qtyOn = Math.max(0, Math.min(a.qty, Math.round(num(a.qtyOn, a.qty))));
    a.w = Math.max(0, num(a.w, it.w));
    a.unit = a.unit === 'kW' ? 'kW' : 'W';
    a.t = TYPES[a.t] ? a.t : it.t;
    a.s = Math.max(1, num(a.s, TYPES[a.t].s));
    a.d = Math.min(1, Math.max(0.05, num(a.d, 1)));
    a.f = !!a.f; a.b = !!a.b; a.inc = a.inc !== false;
    a.use = ['daily', 'weekdays', 'weekends', 'occasional'].includes(a.use) ? a.use : 'daily';
    const hrs = Array.isArray(a.hrs) ? a.hrs.slice(0, 24).map(x => x ? 1 : 0) : [];
    while (hrs.length < 24) hrs.push(0);
    a.hrs = hrs;
    a.hpdManual = !!a.hpdManual;
    a.hpd = a.hpdManual ? Math.min(24, Math.max(0, num(a.hpd, countHrs(hrs)))) : countHrs(hrs);
    a.notes = String(a.notes ?? '').slice(0, 300);
    a.ph = ['L1', 'L2', 'L3', '3P'].includes(a.ph) ? a.ph : '';
    return a;
  }
  const USE_LABEL = { daily: 'Every day', weekdays: 'Weekdays', weekends: 'Weekends', occasional: 'Occasionally' };

  function emptyCustomer() {
    return {
      name: '', phone: '', email: '', address: '',
      utility: 'CEB', account: '', billName: '', supply: '', capacity: '', tariff: 'Domestic',
      units: '', bill: '', solar: 'No', solarKw: '', solarScheme: '', outages: '', backupHrs: '', notes: '',
      declName: '', declDate: '', signature: ''
    };
  }

  // ---------- analysis ----------
  const defaultInverter = () => ({ phase: 1, kw: 5, surge: 2, warn: 80, margin: 10, scope: 'all', phaseKw: '' });
  const SIZES = {
    1: [3, 3.6, 5, 6, 8, 10, 12, 16],
    3: [5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50]
  };

  const inScope = (a, inv) => a.inc !== false && (inv.scope !== 'backup' || a.b) && a.qtyOn > 0 && a.w > 0 && a.k !== undefined;
  const runW = a => a.qtyOn * a.w;
  const phaseLimitW = inv => (num(inv.phaseKw, 0) > 0 ? num(inv.phaseKw) : inv.kw / 3) * 1000;

  function hourState(apps, inv, h) {
    const three = +inv.phase === 3;
    let total = 0, extra = 0, extraName = '';
    const ph = { L1: 0, L2: 0, L3: 0 };
    const on = [];
    for (const a of apps) {
      if (!inScope(a, inv) || !a.hrs[h]) continue;
      const p = runW(a);
      total += p;
      on.push({ id: a.id, name: a.name || 'Appliance', p, n: a.qtyOn });
      if (three) {
        if (a.ph === '3P') { ph.L1 += p / 3; ph.L2 += p / 3; ph.L3 += p / 3; }
        else ph[a.ph || 'L1'] += p;
      }
      const ex = (a.s - 1) * a.w;          // one unit of the largest motor starting
      if (ex > extra) { extra = ex; extraName = a.name; }
    }
    on.sort((x, y) => y.p - x.p);
    const maxPh = three ? Math.max(ph.L1, ph.L2, ph.L3) : 0;
    return { h, total, ph, maxPh, on, extra, extraName };
  }
  function severity(st, inv) {
    const rated = inv.kw * 1000;
    let s = Math.max(0, st.total - rated);
    if (+inv.phase === 3) { const pl = phaseLimitW(inv); for (const k of ['L1', 'L2', 'L3']) s += Math.max(0, st.ph[k] - pl); }
    return s;
  }

  function analyse(apps, inv) {
    const rated = inv.kw * 1000, warn = inv.warn / 100, three = +inv.phase === 3, pl = phaseLimitW(inv);
    const hours = [];
    let peak = 0, peakHour = 0, maxSurgePeak = 0;
    const peakPh = { L1: 0, L2: 0, L3: 0 };
    for (let h = 0; h < 24; h++) {
      const st = hourState(apps, inv, h);
      const over = st.total > rated + 0.01 || (three && st.maxPh > pl + 0.01);
      const high = !over && (st.total > rated * warn + 0.01 || (three && st.maxPh > pl * warn + 0.01));
      st.status = over ? 'over' : high ? 'high' : 'ok';
      st.loading = rated > 0 ? st.total / rated : 0;
      st.surgePeak = st.total + st.extra;
      st.surgeOver = st.on.length > 0 && st.surgePeak > rated * inv.surge + 0.01;
      if (st.total > peak) { peak = st.total; peakHour = h; }
      if (st.surgePeak > maxSurgePeak) maxSurgePeak = st.surgePeak;
      if (three) for (const k of ['L1', 'L2', 'L3']) peakPh[k] = Math.max(peakPh[k], st.ph[k]);
      hours.push(st);
    }
    // energy (duty factor applies to energy only; peak uses full rating)
    let energy = 0, eDay = 0, eNight = 0;
    const eHour = new Array(24).fill(0);
    for (const a of apps) {
      if (!inScope(a, inv)) continue;
      const n = countHrs(a.hrs);
      if (!n) continue;
      const perHour = runW(a) * a.d * (a.hpd / n) / 1000;
      a.hrs.forEach((on, h) => { if (on) eHour[h] += perHour; });
    }
    eHour.forEach((e, h) => { energy += e; if (h >= 6 && h < 18) eDay += e; else eNight += e; });
    const connected = apps.filter(a => inScope(a, inv)).reduce((s, a) => s + a.qty * a.w, 0);
    return {
      hours, peak, peakHour, peakPh, maxSurgePeak, energy, eDay, eNight, eHour, connected, rated, pl, three,
      over: hours.filter(x => x.status === 'over').map(x => x.h),
      high: hours.filter(x => x.status === 'high').map(x => x.h),
      surge: hours.filter(x => x.surgeOver).map(x => x.h)
    };
  }

  // Greedy re-scheduling of flexible appliances out of overloaded hours.
  function planShift(apps, inv) {
    const work = apps.map(a => ({ ...a, hrs: a.hrs.slice() }));
    const rated = inv.kw * 1000, warn = inv.warn / 100;
    const moves = [], locked = new Set(), skip = new Set();
    const circ = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 24 - d); };
    for (let guard = 0; guard < 400; guard++) {
      let H = -1, S = 0;
      for (let h = 0; h < 24; h++) {
        if (skip.has(h)) continue;
        const s = severity(hourState(work, inv, h), inv);
        if (s > S + 0.01) { S = s; H = h; }
      }
      if (H < 0) break;
      let best = null;
      for (const a of work) {
        if (!inScope(a, inv) || !a.f || !a.hrs[H] || locked.has(a.id + ':' + H)) continue;
        for (let t = 0; t < 24; t++) {
          if (t === H || a.hrs[t]) continue;
          a.hrs[H] = 0; a.hrs[t] = 1;
          const sH = severity(hourState(work, inv, H), inv);
          const stT = hourState(work, inv, t);
          const sT = severity(stT, inv);
          a.hrs[H] = 1; a.hrs[t] = 0;
          if (sT > 0.01) continue;                // target hour must stay within rating
          const gain = S - sH;
          if (gain <= 0.01) continue;
          const solar = t >= 8 && t < 16 ? 1 : 0;
          const cand = {
            a, t, p: runW(a), resolves: sH <= 0.01, gain,
            hi: stT.total > rated * warn ? 1 : 0, dist: circ(H, t) - solar * 1.5
          };
          const key = c => [c.resolves ? 0 : 1, c.resolves ? c.p : -c.gain, c.hi, c.dist];
          if (!best) { best = cand; continue; }
          const k1 = key(cand), k2 = key(best);
          for (let i = 0; i < k1.length; i++) { if (k1[i] < k2[i] - 1e-9) { best = cand; break; } if (k1[i] > k2[i] + 1e-9) break; }
        }
      }
      if (!best) { skip.add(H); continue; }
      best.a.hrs[H] = 0; best.a.hrs[best.t] = 1;
      locked.add(best.a.id + ':' + best.t);
      moves.push({ id: best.a.id, name: best.a.name, from: H, to: best.t, p: best.p });
    }
    const res = analyse(work, inv);
    return { apps: work, moves, result: res, resolved: res.over.length === 0 };
  }

  // Group hour moves per appliance for display
  function groupMoves(moves) {
    const g = new Map();
    for (const m of moves) {
      if (!g.has(m.id)) g.set(m.id, { id: m.id, name: m.name, p: m.p, from: emptyHrs(), to: emptyHrs() });
      const x = g.get(m.id);
      if (x.to[m.from]) x.to[m.from] = 0; else x.from[m.from] = 1;
      if (x.from[m.to]) x.from[m.to] = 0; else x.to[m.to] = 1;
    }
    return [...g.values()].filter(x => countHrs(x.from) || countHrs(x.to));
  }

  function recommendInverter(res, inv, sizes) {
    const list = (sizes && sizes.length ? sizes : SIZES[+inv.phase === 3 ? 3 : 1]).slice().sort((a, b) => a - b);
    const m = 1 + num(inv.margin, 0) / 100;
    const needRun = res.peak / 1000 * m;
    let needPh = 0;
    if (res.three) {
      const pf = phaseLimitW(inv) / (inv.kw * 1000 / 3);    // per-phase allowance relative to rated/3
      needPh = 3 * Math.max(res.peakPh.L1, res.peakPh.L2, res.peakPh.L3) / 1000 * m / (pf || 1);
    }
    const needSurge = res.maxSurgePeak / 1000 / (inv.surge || 1);
    const req = Math.max(needRun, needPh, needSurge);
    const driver = req === needSurge && needSurge > needRun && needSurge > needPh ? 'surge' : (req === needPh && needPh > needRun ? 'phase' : 'running');
    let pick = null;
    const single = list.find(s => s >= req - 1e-9);
    if (single != null) pick = { n: 1, size: single, total: single };
    else {
      for (const s of list) for (let n = 2; n <= 10; n++) {
        if (n * s >= req - 1e-9) {
          const c = { n, size: s, total: n * s };
          if (!pick || c.total < pick.total - 1e-9 || (Math.abs(c.total - pick.total) < 1e-9 && c.n < pick.n)) pick = c;
          break;
        }
      }
    }
    return { req, needRun, needPh, needSurge, driver, pick, label: pick ? (pick.n > 1 ? `${pick.n} × ${pick.size} kW (${pick.total} kW) in parallel` : `${pick.size} kW`) : '—' };
  }

  // Balance single-phase appliances across L1/L2/L3 (keeps 3P items as they are)
  function autoBalance(apps, inv) {
    const vec = { L1: new Array(24).fill(0), L2: new Array(24).fill(0), L3: new Array(24).fill(0) };
    const scoped = apps.filter(a => inScope(a, inv));
    scoped.filter(a => a.ph === '3P').forEach(a => a.hrs.forEach((on, h) => { if (on) for (const k in vec) vec[k][h] += runW(a) / 3; }));
    const single = scoped.filter(a => a.ph !== '3P').sort((x, y) => runW(y) * (countHrs(y.hrs) ? 1 : 0) - runW(x) * (countHrs(x.hrs) ? 1 : 0));
    for (const a of single) {
      let bestK = 'L1', bestV = Infinity;
      for (const k of ['L1', 'L2', 'L3']) {
        let mx = 0, sum = 0;
        for (let h = 0; h < 24; h++) { const v = vec[k][h] + (a.hrs[h] ? runW(a) : 0); mx = Math.max(mx, v); sum += v; }
        const score = mx * 1000 + sum / 1000;
        if (score < bestV) { bestV = score; bestK = k; }
      }
      a.ph = bestK;
      a.hrs.forEach((on, h) => { if (on) vec[bestK][h] += runW(a); });
    }
  }

  // ---------- 24-hour chart (SVG string) ----------
  const LIGHT_PAL = { ok: '#1f4e8c', high: '#d99a00', over: '#c62828', grid: '#e3e7ef', text: '#4a5568', line: '#0f1f3d', warn: '#d99a00', band: '#fff6dc', bg: '#ffffff', sel: '#0f1f3d' };
  function niceStep(max) {
    const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function chartSVG(res, inv, pal = LIGHT_PAL, opt = {}) {
    const W = opt.w || 760, H = opt.h || 300, L = 46, R = 14, T = 18, B = 34;
    const pw = W - L - R, ph = H - T - B;
    const rated = inv.kw;
    const top = Math.max(res.peak / 1000, res.maxSurgePeak && opt.surge ? res.maxSurgePeak / 1000 : 0, rated) * 1.15 || 1;
    const step = niceStep(top), ymax = Math.ceil(top / step) * step;
    const y = v => T + ph - (v / ymax) * ph;
    const bw = pw / 24;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" role="img" aria-label="24-hour load profile">`;
    s += `<rect x="0" y="0" width="${W}" height="${H}" fill="${pal.bg}"/>`;
    // solar hours band 06–18
    s += `<rect x="${L + 6 * bw}" y="${T}" width="${12 * bw}" height="${ph}" fill="${pal.band}"/>`;
    s += `<text x="${L + 12 * bw}" y="${T + 11}" font-size="10" text-anchor="middle" fill="${pal.text}" opacity="0.8">Daylight (solar) hours</text>`;
    for (let v = 0; v <= ymax + 1e-9; v += step) {
      s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${pal.grid}" stroke-width="1"/>`;
      s += `<text x="${L - 6}" y="${y(v) + 3.5}" font-size="10.5" text-anchor="end" fill="${pal.text}">${+v.toFixed(2)}</text>`;
    }
    s += `<text x="12" y="${T + ph / 2}" font-size="10.5" fill="${pal.text}" transform="rotate(-90 12 ${T + ph / 2})" text-anchor="middle">kW</text>`;
    res.hours.forEach((hr, h) => {
      const v = hr.total / 1000, x = L + h * bw + bw * 0.14, w = bw * 0.72;
      const col = hr.status === 'over' ? pal.over : hr.status === 'high' ? pal.high : pal.ok;
      if (v > 0) s += `<rect data-h="${h}" x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0.5, y(0) - y(v)).toFixed(1)}" rx="2" fill="${col}"${opt.sel === h ? ` stroke="${pal.sel}" stroke-width="2"` : ''}/>`;
      if (opt.hit) s += `<rect data-h="${h}" class="hit" x="${L + h * bw}" y="${T}" width="${bw}" height="${ph}" fill="transparent"/>`;
      if (h % 3 === 0) s += `<text x="${L + h * bw + bw / 2}" y="${H - B + 15}" font-size="10.5" text-anchor="middle" fill="${pal.text}">${ampmShort(h)}</text>`;
    });
    s += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="${pal.text}" stroke-width="1"/>`;
    // warning + rated lines
    const wv = rated * inv.warn / 100;
    s += `<line x1="${L}" x2="${W - R}" y1="${y(wv)}" y2="${y(wv)}" stroke="${pal.warn}" stroke-width="1.2" stroke-dasharray="2 4"/>`;
    s += `<line x1="${L}" x2="${W - R}" y1="${y(rated)}" y2="${y(rated)}" stroke="${pal.line}" stroke-width="1.8" stroke-dasharray="7 4"/>`;
    const lbl = `Inverter ${rated} kW`;
    s += `<rect x="${W - R - 8 - lbl.length * 6.1}" y="${y(rated) - 17}" width="${lbl.length * 6.1 + 8}" height="14" rx="3" fill="${pal.bg}" opacity="0.9"/>`;
    s += `<text x="${W - R - 4}" y="${y(rated) - 6}" font-size="10.5" font-weight="700" text-anchor="end" fill="${pal.line}">${lbl}</text>`;
    s += `<text x="${W - R - 4}" y="${y(wv) + 12}" font-size="9.5" text-anchor="end" fill="${pal.warn}">${inv.warn}% level</text>`;
    s += `<text x="${L + pw / 2}" y="${H - 4}" font-size="10" text-anchor="middle" fill="${pal.text}">Hour of day (bar = load from that hour to the next)</text>`;
    s += '</svg>';
    return s;
  }
  function svgToPng(svg, scale = 2) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width * scale; c.height = img.height * scale;
        const g = c.getContext('2d'); g.scale(scale, scale); g.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? b.arrayBuffer().then(buf => resolve({ bytes: new Uint8Array(buf), w: img.width, h: img.height })) : reject(new Error('PNG failed')), 'image/png');
      };
      img.onerror = () => reject(new Error('Chart render failed'));
      img.src = url;
    });
  }

  // ---------- hour picker (shared UI) ----------
  const HOUR_ROWS = [['Night', 0], ['Morning', 6], ['Afternoon', 12], ['Evening', 18]];
  const PRESETS = [['Morning 6–9 AM', 6, 9], ['Day 9 AM–5 PM', 9, 17], ['Evening 6–10 PM', 18, 22], ['Night 10 PM–6 AM', 22, 30], ['24 hours', 0, 24]];
  function hourPickerHTML(hrs) {
    let s = '<div class="hp" role="group" aria-label="Hours of use">';
    for (const [lbl, st] of HOUR_ROWS) {
      s += `<div class="hp-row"><span class="hp-lbl">${lbl}</span><div class="hp-cells">`;
      for (let h = st; h < st + 6; h++) s += `<button type="button" class="hp-c${hrs[h] ? ' on' : ''}" data-h="${h}" aria-pressed="${hrs[h] ? 'true' : 'false'}" title="${ampm(h)} – ${ampm(h + 1)}">${ampmShort(h)}</button>`;
      s += '</div></div>';
    }
    s += '<div class="hp-pre">' + PRESETS.map((p, i) => `<button type="button" class="chip" data-pre="${i}">${p[0]}</button>`).join('') + '<button type="button" class="chip ghost" data-pre="clear">Clear</button></div></div>';
    return s;
  }
  function applyPreset(hrs, which) {
    if (which === 'clear') { hrs.fill(0); return; }
    const [, a, b] = PRESETS[+which];
    for (let h = a; h < b; h++) hrs[h % 24] = 1;
  }

  // Download helper (Blob + anchor — works on GitHub Pages / Chrome / Android)
  function download(name, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  async function shareFile(name, data, mime, title, text) {
    try {
      const file = new File([data], name, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        return 'shared';
      }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    download(name, data, mime);
    return 'downloaded';
  }
  const safeName = s => String(s || '').trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_').slice(0, 40) || 'Customer';
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  return {
    FORM_TYPE, PROJECT_TYPE, VERSION, COMPANY, copyright, NOTICE, COMPANY_LINE, TYPES, CATS, ITEM, CAT_NAME, USE_LABEL, SIZES,
    esc, uid, num, hh, ampm, ampmShort, countHrs, fmtKW, emptyHrs, blocks, slotsText, store, parseFileText,
    newAppliance, normalise, emptyCustomer, defaultInverter, inScope, runW, phaseLimitW, hourState,
    analyse, planShift, groupMoves, recommendInverter, autoBalance, chartSVG, svgToPng, LIGHT_PAL,
    hourPickerHTML, applyPreset, download, shareFile, safeName, today
  };
})();
