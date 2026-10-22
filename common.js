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
    a.phLock = !!a.phLock;
    return a;
  }
  const USE_LABEL = { daily: 'Every day', weekdays: 'Weekdays', weekends: 'Weekends', occasional: 'Occasionally' };

  // ---------- electricity connection: capacity, tariff and TOU ----------
  const CAPACITIES = ['30 A', '60 A', 'Other', 'Not sure'];
  // same category names as the Site Inspection app
  const TARIFF_GROUPS = [
    ['Domestic & religious', ['Domestic', 'Religious']],
    ['General purpose', ['GP 1 Small', 'GP 2 Medium', 'GP 3 Large']],
    ['Hotel', ['H 1 Small', 'H 2 Medium', 'H 3 Large']],
    ['Industrial', ['IP 1 Small', 'IP 2 Medium', 'IP 3 Large']],
    ['Government', ['GV 1 Small', 'GV 2 Medium', 'GV 3 Large']]
  ];
  const TARIFFS = TARIFF_GROUPS.flatMap(g => g[1]);
  // Medium and Large categories are billed by time of use (Day / Peak / Off-peak)
  const TOU_TARIFFS = TARIFFS.filter(t => /Medium|Large/.test(t));
  const TOU_PERIODS = [
    { k: 'touDay', label: 'Day', time: '5:30 AM – 6:30 PM' },
    { k: 'touPeak', label: 'Peak', time: '6:30 PM – 10:30 PM' },
    { k: 'touOff', label: 'Off-peak', time: '10:30 PM – 5:30 AM' }
  ];
  const isTouTariff = t => TOU_TARIFFS.includes(t);
  const touOn = c => !!c && (isTouTariff(c.tariff) || !!c.tou);
  const touTotal = c => TOU_PERIODS.reduce((s, p) => s + (parseFloat(c[p.k]) || 0), 0);
  const hasTouValues = c => TOU_PERIODS.some(p => String(c[p.k] ?? '') !== '');
  function capacityText(c) {
    if (!c || !c.capacity) return '';
    return c.capacity === 'Other' ? (String(c.capacityOther || '').trim() || 'Other (not specified)') : c.capacity;
  }
  function tariffOptionsHTML(cur, placeholder) {
    const known = TARIFFS.includes(cur) || cur === 'Not sure' || !cur;
    return (placeholder ? `<option value="">${placeholder}</option>` : '') +
      TARIFF_GROUPS.map(([g, list]) => `<optgroup label="${g}">${list.map(t => `<option${t === cur ? ' selected' : ''}>${t}</option>`).join('')}</optgroup>`).join('') +
      `<option${cur === 'Not sure' ? ' selected' : ''}>Not sure</option>` +
      (known ? '' : `<option selected>${esc(cur)}</option>`);
  }
  // daily kWh per CEB TOU period from an hourly energy profile (hour h = h:00–h+1:00; half hours at 5:30, 18:30, 22:30)
  function touSplit(eHour) {
    const w = { day: new Array(24).fill(0), peak: new Array(24).fill(0), off: new Array(24).fill(0) };
    for (let h = 0; h < 24; h++) {
      if (h >= 6 && h <= 17) w.day[h] = 1;
      else if (h >= 19 && h <= 21) w.peak[h] = 1;
      else if (h === 5) { w.off[h] = 0.5; w.day[h] = 0.5; }
      else if (h === 18) { w.day[h] = 0.5; w.peak[h] = 0.5; }
      else if (h === 22) { w.peak[h] = 0.5; w.off[h] = 0.5; }
      else w.off[h] = 1;
    }
    const sum = k => eHour.reduce((s, e, h) => s + e * w[k][h], 0);
    return { day: sum('day'), peak: sum('peak'), off: sum('off') };
  }
  // name for another entry of the same appliance (used at other times): "Ceiling fan (2)"
  function entryName(apps, a) {
    const base = String(a.name || '').replace(/\s\(\d+\)$/, '');
    const used = new Set(apps.filter(x => x.k === a.k && String(x.name || '').replace(/\s\(\d+\)$/, '') === base).map(x => (String(x.name).match(/\((\d+)\)$/) || [0, 1])[1] * 1));
    let n = 2; while (used.has(n)) n++;
    return `${base} (${n})`;
  }

  // ---------- monthly energy per entry ----------
  // days the appliance is used in a month, from "How often"
  const DAYS = { daily: 30, weekdays: 22, weekends: 8, occasional: 4 };
  const daysPerMonth = a => DAYS[a && a.use] || 30;
  const kwhDay = a => (a.qtyOn * a.w * a.d * a.hpd) / 1000;            // on a day it is used
  const kwhMonth = a => kwhDay(a) * daysPerMonth(a);

  // ---------- quick-fill typical lists (editable starting points), by monthly units ----------
  const TEMPLATE_LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  const TPL = (() => {
  const R = (a, b) => { const h = []; for (let x = a; x < b; x++) h.push(x % 24); return h; };
  const ALL = 'all';
  const L = {
    bulbs:   ['led_bulb', 6, 6, R(18, 23), null, { b: 1 }],
    tubes:   ['led_tube', 2, 2, R(18, 22), null, { b: 1 }],
    fridge:  ['fridge', 1, 1, ALL, null, { b: 1 }],
    tv:      ['tv_small', 1, 1, R(19, 23), null, { b: 1 }],
    fan1:    ['ceiling_fan', 1, 1, R(19, 23), null, { b: 1 }],
    fans2:   ['ceiling_fan', 2, 2, R(19, 23).concat(R(13, 15)), null, { b: 1 }],
    fans3:   ['ceiling_fan', 3, 3, R(19, 24).concat(R(12, 16)), null, { b: 1 }],
    rice:    ['rice_cooker', 1, 1, [6], 1, {}],
    router:  ['router', 1, 1, ALL, null, { b: 1 }],
    charge:  ['chargers', 3, 3, R(21, 24), null, { b: 1 }],
    iron:    ['iron', 1, 1, [19], 0.5, { f: 1 }],
    kettle:  ['kettle', 1, 1, [6], 0.25, {}],
    pump:    ['pump_1', 1, 1, [6, 18], 1, { f: 1, b: 1 }],
    washer:  ['washer_top', 1, 1, [9, 10], 2, { f: 1, use: 'weekends' }],
    laptop:  ['laptop', 1, 1, R(9, 15), null, { b: 1 }],
    outdoor: ['outdoor_light', 2, 2, R(18, 30), null, { b: 1 }],
    micro:   ['microwave', 1, 1, [19], 0.25, {}],
    tv2:     ['tv_large', 1, 1, R(19, 22), null, { b: 1 }],
    sound:   ['sound', 1, 1, [19, 20], null, { use: 'weekends' }],
    ac1_4:   ['ac_inv_12', 1, 1, R(22, 26), null, { notes: 'Bedroom 1' }],
    ac1_6:   ['ac_inv_12', 1, 1, R(22, 28), null, { notes: 'Bedroom 1' }],
    ac1_8:   ['ac_inv_12', 1, 1, R(22, 30), null, { notes: 'Bedroom 1' }],
    ac2_4:   ['ac_inv_12', 1, 1, R(22, 26), null, { notes: 'Bedroom 2' }],
    ac2_6:   ['ac_inv_12', 1, 1, R(22, 28), null, { notes: 'Bedroom 2' }],
    ac2_8:   ['ac_inv_12', 1, 1, R(22, 30), null, { notes: 'Bedroom 2' }],
    ac3_3:   ['ac_inv_9', 1, 1, R(13, 16), null, { notes: 'Living room, afternoon' }],
    ac3_5:   ['ac_inv_9', 1, 1, R(13, 18), null, { notes: 'Living room, afternoon' }],
    geyserH: ['geyser', 1, 1, [6], 0.5, { f: 1 }],
    geyser:  ['geyser', 1, 1, [5, 6], 1, { f: 1 }],
    cctv:    ['cctv', 1, 1, ALL, null, { b: 1 }],
    induct:  ['induction', 1, 1, [18], 0.5, {}],
    freezer: ['freezer', 1, 1, ALL, null, { b: 1 }],
    dish:    ['dishwasher', 1, 1, [20], 1, { f: 1 }],
    ev:      ['ev_charger', 1, 1, [22], 1, { f: 1, w: 3700, notes: 'Single-phase 16 A charger' }],
  };
  const T = {
    100: ['bulbs', 'fridge', 'tv', 'fan1', 'rice', 'router', 'charge', 'iron'],
    200: ['bulbs', 'tubes', 'fridge', 'tv', 'fans2', 'rice', 'kettle', 'micro', 'router', 'charge', 'iron', 'pump', 'washer', 'laptop', 'outdoor'],
  };
  T[300] = T[200].concat(['ac1_4', 'tv2', 'sound']);
  T[400] = T[200].concat(['ac1_6', 'tv2', 'sound', 'geyserH', 'cctv']);
  T[500] = T[200].concat(['ac1_8', 'tv2', 'sound', 'geyser', 'cctv', 'induct']);
  T[600] = T[500].concat(['ac2_4']);
  T[700] = T[500].concat(['ac2_6', 'freezer']);
  T[800] = T[500].concat(['ac2_8', 'freezer', 'ac3_3']);
  T[900] = T[500].concat(['ac2_8', 'freezer', 'ac3_5', 'dish']).map(x => x === 'fans2' ? 'fans3' : x);
  T[1000] = T[900].concat(['ev']);
    return { L, T };
  })();
  function buildTemplate(level) {
    const ids = TPL.T[level]; if (!ids) return [];
    return ids.map(id => {
      const [key, qty, qtyOn, hrs, hpd, x] = TPL.L[id];
      const a = newAppliance(key);
      a.qty = qty; a.qtyOn = qtyOn;
      a.hrs = hrs === 'all' ? new Array(24).fill(1) : (() => { const h = emptyHrs(); hrs.forEach(i => { h[i] = 1; }); return h; })();
      Object.assign(a, x); a.b = !!x.b; a.f = !!x.f;
      if (hpd != null) { a.hpd = hpd; a.hpdManual = true; }
      return normalise(a);
    });
  }

  function emptyCustomer() {
    return {
      name: '', phone: '', email: '', address: '',
      utility: 'CEB', account: '', billName: '', supply: '', capacity: '', capacityOther: '', tariff: 'Domestic',
      tou: false, touDay: '', touPeak: '', touOff: '',
      units: '', bill: '', solar: 'No', solarKw: '', solarScheme: '', outages: '', backupHrs: '', notes: '',
      declName: '', declDate: '', signature: ''
    };
  }

  // ---------- analysis ----------
  // Inverter settings. Three-phase limits come from the datasheet:
  //   phaseKw      max continuous output per phase (kW)
  //   unbalKw      max allowed difference between the highest and lowest phase (kW) – '' when the datasheet states no limit
  //   phasePeakKw  per-phase short-time / peak capability (kW, ~10 s) used for motor starting – '' = phaseKw × surge
  const defaultInverter = () => ({ phase: 1, kw: 5, surge: 2, warn: 80, margin: 10, scope: 'all', phaseKw: '', unbalKw: '', phasePeakKw: '', model: '', scaled: false });
  const SIZES = {
    1: [3, 3.6, 5, 6, 8, 10, 12, 16],
    3: [5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50]
  };
  const PH = ['L1', 'L2', 'L3'];

  const inScope = (a, inv) => a.inc !== false && (inv.scope !== 'backup' || a.b) && a.qtyOn > 0 && a.w > 0 && a.k !== undefined;
  const runW = a => a.qtyOn * a.w;
  function limits(inv) {
    const kw = num(inv.kw, 0), three = +inv.phase === 3;
    const given = num(inv.phaseKw, 0) > 0;
    const phaseKw = given ? num(inv.phaseKw) : kw / 3;
    const unb = num(inv.unbalKw, 0) > 0 ? num(inv.unbalKw) : null;
    const pk = num(inv.phasePeakKw, 0) > 0 ? num(inv.phasePeakKw) : phaseKw * num(inv.surge, 1);
    return { three, rated: kw * 1000, pl: phaseKw * 1000, unbal: unb == null ? null : unb * 1000, ppk: pk * 1000, assumed: three && !given, scaled: three && !!inv.scaled };
  }
  const phaseLimitW = inv => limits(inv).pl;

  function hourState(apps, inv, h) {
    const three = +inv.phase === 3;
    let total = 0, extra = 0, extraName = '';
    const ph = { L1: 0, L2: 0, L3: 0 }, xph = { L1: 0, L2: 0, L3: 0 }, xname = { L1: '', L2: '', L3: '' };
    const on = [];
    for (const a of apps) {
      if (!inScope(a, inv) || !a.hrs[h]) continue;
      const p = runW(a);
      total += p;
      on.push({ id: a.id, name: a.name || 'Appliance', p, n: a.qtyOn, ph: three ? (a.ph || 'L1') : '' });
      const ex = (a.s - 1) * a.w;          // one unit of the largest motor starting
      if (ex > extra) { extra = ex; extraName = a.name; }
      if (three) {
        if (a.ph === '3P') for (const k of PH) { ph[k] += p / 3; if (ex / 3 > xph[k]) { xph[k] = ex / 3; xname[k] = a.name; } }
        else { const k = a.ph || 'L1'; ph[k] += p; if (ex > xph[k]) { xph[k] = ex; xname[k] = a.name; } }
      }
    }
    on.sort((x, y) => y.p - x.p);
    const maxPh = three ? Math.max(ph.L1, ph.L2, ph.L3) : 0;
    const imb = three ? maxPh - Math.min(ph.L1, ph.L2, ph.L3) : 0;
    return { h, total, ph, maxPh, imb, xph, xname, on, extra, extraName };
  }
  // how far an hour is beyond the limits (W); 0 = within every limit
  function severity(st, inv, L) {
    L = L || limits(inv);
    let s = Math.max(0, st.total - L.rated);
    if (L.three) {
      for (const k of PH) s += Math.max(0, st.ph[k] - L.pl);
      if (L.unbal != null) s += Math.max(0, st.imb - L.unbal);
    }
    return s;
  }

  function analyse(apps, inv) {
    const L = limits(inv), warn = inv.warn / 100, three = L.three, E = 0.01;
    const hours = [];
    let peak = 0, peakHour = 0, maxSurgePeak = 0, peakImb = 0, maxSurgePh = 0;
    const peakPh = { L1: 0, L2: 0, L3: 0 }, peakPhHour = { L1: 0, L2: 0, L3: 0 }, phOver = { L1: [], L2: [], L3: [] }, unbalHours = [], phaseSurgeHours = [];
    for (let h = 0; h < 24; h++) {
      const st = hourState(apps, inv, h);
      const why = [];
      if (st.total > L.rated + E) why.push('total');
      if (three) {
        for (const k of PH) if (st.ph[k] > L.pl + E) { why.push(k); phOver[k].push(h); }
        if (L.unbal != null && st.imb > L.unbal + E) { why.push('unbal'); unbalHours.push(h); }
      }
      const high = !why.length && (st.total > L.rated * warn + E || (three && (st.maxPh > L.pl * warn + E || (L.unbal != null && st.imb > L.unbal * warn + E))));
      st.why = why;
      st.status = why.length ? 'over' : high ? 'high' : 'ok';
      st.label = why.includes('total') ? 'OVERLOAD' : why.some(w => w[0] === 'L') ? 'PHASE OVERLOAD' : why.includes('unbal') ? 'UNBALANCE' : high ? 'HIGH' : 'OK';
      st.loading = L.rated > 0 ? st.total / L.rated : 0;
      st.surgePeak = st.total + st.extra;
      st.surgeOver = st.on.length > 0 && st.surgePeak > L.rated * inv.surge + E;
      st.surgePh = [];
      if (three) for (const k of PH) {
        const v = st.ph[k] + st.xph[k];
        if (v > maxSurgePh) maxSurgePh = v;
        if (st.xph[k] > 0 && v > L.ppk + E) st.surgePh.push(k);
      }
      if (st.surgePh.length) { st.surgeOver = true; phaseSurgeHours.push(h); }
      if (st.total > peak) { peak = st.total; peakHour = h; }
      if (st.surgePeak > maxSurgePeak) maxSurgePeak = st.surgePeak;
      if (three) {
        for (const k of PH) if (st.ph[k] > peakPh[k]) { peakPh[k] = st.ph[k]; peakPhHour[k] = h; }
        if (st.imb > peakImb) peakImb = st.imb;
      }
      hours.push(st);
    }
    // energy (duty factor applies to energy only; peak uses full rating)
    let energy = 0, eDay = 0, eNight = 0;
    const eHour = new Array(24).fill(0);
    for (const a of apps) {
      if (!inScope(a, inv)) continue;
      const n = countHrs(a.hrs);
      if (!n) continue;
      const perHour = runW(a) * a.d * (a.hpd / n) / 1000 * daysPerMonth(a) / 30;   // average day
      a.hrs.forEach((on, h) => { if (on) eHour[h] += perHour; });
    }
    eHour.forEach((e, h) => { energy += e; if (h >= 6 && h < 18) eDay += e; else eNight += e; });
    const scoped = apps.filter(a => inScope(a, inv));
    const connected = scoped.reduce((s, a) => s + a.qty * a.w, 0);
    // single-phase appliances that are too big for one phase of this inverter, whichever phase they are on
    const tooBig = three ? scoped.filter(a => a.ph !== '3P' && countHrs(a.hrs) && runW(a) > L.pl + E).map(a => ({ id: a.id, name: a.name, p: runW(a) })) : [];
    return {
      hours, peak, peakHour, peakPh, peakPhHour, peakImb, maxSurgePeak, maxSurgePh, energy, eDay, eNight, eHour, connected,
      rated: L.rated, pl: L.pl, unbal: L.unbal, ppk: L.ppk, assumed: L.assumed, scaled: L.scaled, three, phOver, unbalHours, phaseSurgeHours, tooBig,
      over: hours.filter(x => x.status === 'over').map(x => x.h),
      totalOver: hours.filter(x => x.why.includes('total')).map(x => x.h),
      phaseOverAny: hours.filter(x => x.why.some(w => w[0] === 'L')).map(x => x.h),
      high: hours.filter(x => x.status === 'high').map(x => x.h),
      surge: hours.filter(x => x.surgeOver).map(x => x.h)
    };
  }

  // Greedy re-scheduling of flexible appliances out of overloaded hours (total, phase and imbalance limits).
  function planShift(apps, inv) {
    const work = apps.map(a => ({ ...a, hrs: a.hrs.slice() }));
    const L = limits(inv), warn = inv.warn / 100;
    const sev = st => severity(st, inv, L);
    const moves = [], locked = new Set(), skip = new Set();
    const circ = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 24 - d); };
    for (let guard = 0; guard < 400; guard++) {
      let H = -1, S = 0;
      for (let h = 0; h < 24; h++) {
        if (skip.has(h)) continue;
        const s = sev(hourState(work, inv, h));
        if (s > S + 0.01) { S = s; H = h; }
      }
      if (H < 0) break;
      let best = null;
      for (const a of work) {
        if (!inScope(a, inv) || !a.f || !a.hrs[H] || locked.has(a.id + ':' + H)) continue;
        for (let t = 0; t < 24; t++) {
          if (t === H || a.hrs[t]) continue;
          a.hrs[H] = 0; a.hrs[t] = 1;
          const sH = sev(hourState(work, inv, H));
          const stT = hourState(work, inv, t);
          const sT = sev(stT);
          a.hrs[H] = 1; a.hrs[t] = 0;
          if (sT > 0.01) continue;                // target hour must stay within every limit
          const gain = S - sH;
          if (gain <= 0.01) continue;
          const solar = t >= 8 && t < 16 ? 1 : 0;
          const cand = { a, t, p: runW(a), resolves: sH <= 0.01, gain, hi: stT.total > L.rated * warn ? 1 : 0, dist: circ(H, t) - solar * 1.5 };
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

  // ---------- phase balancing ----------
  // Score of a phase assignment: [W beyond the limits, W beyond the warning level, highest phase peak] – lower is better
  function phaseScore(apps, inv, L) {
    const w = inv.warn / 100;
    let sev = 0, hi = 0, pk = 0;
    for (let h = 0; h < 24; h++) {
      const st = hourState(apps, inv, h);
      sev += severity(st, inv, L);
      for (const k of PH) hi += Math.max(0, st.ph[k] - L.pl * w);
      if (L.unbal != null) hi += Math.max(0, st.imb - L.unbal * w);
      pk = Math.max(pk, st.maxPh);
    }
    return [Math.round(sev), Math.round(hi), Math.round(pk)];
  }
  // Stage 1 removes limit violations (sev); only when there are none, stage 2 brings phases under the warning level (hi).
  // A step must reduce the stage's measure; ties go to the lower highest-phase peak. Fewest moves wins over cosmetic balance.
  function planPhases(apps, inv) {
    if (+inv.phase !== 3) return null;
    const L = limits(inv);
    const work = apps.map(a => ({ ...a, hrs: a.hrs, ph: a.ph || 'L1' }));
    const mov = work.filter(a => inScope(a, inv) && a.ph !== '3P' && !a.phLock && countHrs(a.hrs));
    let cur = phaseScore(work, inv, L);
    const start = cur.slice();
    const stage = cur[0] > 0 ? 0 : 1;
    const key = s => [s[stage], s[2]];
    const lt = (x, y) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
    for (let it = 0; it < 40 && cur[stage] > 0; it++) {
      let best = null, bestS = null;
      const consider = (s, change) => {
        if (s[stage] >= cur[stage]) return;                       // must reduce this stage's measure
        if (stage === 1 && s[0] > 0) return;                       // never create an overload
        if (!best || lt(key(s), key(bestS)) || (key(s)[0] === key(bestS)[0] && key(s)[1] === key(bestS)[1] && change.length < best.length)) { best = change; bestS = s; }
      };
      for (const a of mov) for (const k of PH) {
        if (k === a.ph) continue;
        const o = a.ph; a.ph = k; const s = phaseScore(work, inv, L); a.ph = o;
        consider(s, [[a, k]]);
      }
      for (let i = 0; i < mov.length; i++) for (let j = i + 1; j < mov.length; j++) {
        const a = mov[i], b = mov[j]; if (a.ph === b.ph) continue;
        const oa = a.ph, ob = b.ph; a.ph = ob; b.ph = oa; const s = phaseScore(work, inv, L); a.ph = oa; b.ph = ob;
        consider(s, [[a, ob], [b, oa]]);
      }
      if (!best) break;
      best.forEach(([a, k]) => a.ph = k); cur = bestS;
    }
    // prune: put back any moved circuit whose move is not needed for the final result
    const orig = new Map(apps.map(a => [a.id, a.ph || 'L1']));
    for (let pass = 0; pass < 3; pass++) {
      let changedAny = false;
      for (const a of mov.filter(x => x.ph !== orig.get(x.id)).sort((x, y) => runW(x) - runW(y))) {
        const k = a.ph; a.ph = orig.get(a.id);
        const s = phaseScore(work, inv, L);
        if (s[0] <= cur[0] && (stage === 0 || s[1] <= cur[1])) { cur = s; changedAny = true; } else a.ph = k;
      }
      if (!changedAny) break;
    }
    const moves = work.filter(a => a.ph !== orig.get(a.id) && inScope(a, inv)).map(a => ({ id: a.id, name: a.name, from: orig.get(a.id), to: a.ph, p: runW(a) }));
    const result = analyse(work, inv);
    return { apps: work, moves, result, before: start, after: cur, resolvedPhase: result.over.length === 0 };
  }
  // First assignment when a project becomes three-phase: spread the largest loads, then refine.
  function autoBalance(apps, inv, keepAssigned) {
    const vec = { L1: new Array(24).fill(0), L2: new Array(24).fill(0), L3: new Array(24).fill(0) };
    const scoped = apps.filter(a => inScope(a, inv));
    const fixed = a => a.ph === '3P' || a.phLock || (keepAssigned && a.ph);
    scoped.filter(fixed).forEach(a => a.hrs.forEach((on, h) => { if (!on) return; if (a.ph === '3P') for (const k of PH) vec[k][h] += runW(a) / 3; else vec[a.ph || 'L1'][h] += runW(a); }));
    const free = scoped.filter(a => !fixed(a)).sort((x, y) => runW(y) * (countHrs(y.hrs) ? 1 : 0) - runW(x) * (countHrs(x.hrs) ? 1 : 0));
    for (const a of free) {
      let bestK = 'L1', bestV = Infinity;
      for (const k of PH) {
        let mx = 0, sum = 0;
        for (let h = 0; h < 24; h++) { const v = vec[k][h] + (a.hrs[h] ? runW(a) : 0); mx = Math.max(mx, v); sum += v; }
        const score = mx * 1000 + sum / 1000;
        if (score < bestV) { bestV = score; bestK = k; }
      }
      a.ph = bestK;
      a.hrs.forEach((on, h) => { if (on) vec[bestK][h] += runW(a); });
    }
    const p = planPhases(apps, inv);
    if (p) { const m = new Map(p.apps.map(a => [a.id, a.ph])); apps.forEach(a => { if (m.has(a.id)) a.ph = m.get(a.id); }); }
    apps.forEach(a => { if (!a.ph) a.ph = 'L1'; });
  }

  // ---------- inverter recommendation ----------
  // models: saved datasheet entries [{name, phase, kw, surge, phaseKw, unbalKw, phasePeakKw}]
  function recommendInverter(res, inv, sizes, models) {
    const three = +inv.phase === 3, L = limits(inv);
    const m = 1 + num(inv.margin, 0) / 100;
    const need = {
      run: res.peak / 1000 * m,
      phase: three ? Math.max(res.peakPh.L1, res.peakPh.L2, res.peakPh.L3) / 1000 * m : 0,
      unbal: three ? res.peakImb / 1000 : 0,
      surge: res.maxSurgePeak / 1000,
      phasePeak: three ? res.maxSurgePh / 1000 : 0
    };
    const capsOf = (kw, surge, phaseKw, unbalKw, phasePeakKw) => ({ kw, surge: kw * surge, phase: phaseKw, unbal: unbalKw == null ? Infinity : unbalKw, phasePeak: phasePeakKw });
    const fits = c => c.kw >= need.run - 1e-9 && c.surge >= need.surge - 1e-9 && (!three || (c.phase >= need.phase - 1e-9 && c.unbal >= need.unbal - 1e-9 && c.phasePeak >= need.phasePeak - 1e-9));
    const cands = [];
    const lib = (models || []).filter(x => +x.phase === +inv.phase && num(x.kw) > 0);
    let basis = 'sizes';
    if (lib.length) {
      basis = 'library';
      for (const x of lib) for (let n = 1; n <= 6; n++) {
        const pk = num(x.phaseKw, 0) > 0 ? num(x.phaseKw) : num(x.kw) / 3;
        const c = capsOf(n * num(x.kw), num(x.surge, 2), n * pk, num(x.unbalKw, 0) > 0 ? n * num(x.unbalKw) : null, n * (num(x.phasePeakKw, 0) > 0 ? num(x.phasePeakKw) : pk * num(x.surge, 2)));
        if (fits(c)) { cands.push({ n, size: num(x.kw), total: n * num(x.kw), model: x, caps: c }); break; }
      }
    } else {
      // no datasheet library: scale the selected inverter's datasheet ratios to the standard sizes
      const rPh = L.pl / L.rated, rUn = L.unbal == null ? null : L.unbal / L.rated, rPk = L.ppk / L.rated;
      const list = (sizes && sizes.length ? sizes : SIZES[three ? 3 : 1]).slice().sort((a, b) => a - b);
      for (const s of list) for (let n = 1; n <= 10; n++) {
        const kw = n * s, c = capsOf(kw, inv.surge, kw * rPh, rUn == null ? null : kw * rUn, kw * rPk);
        if (fits(c)) { cands.push({ n, size: s, total: kw, caps: c }); break; }
      }
    }
    cands.sort((a, b) => a.total - b.total || a.n - b.n);
    const pick = cands[0] || null;
    // which requirement sets the size (compare each need with what the selected inverter offers per kW)
    const per = { run: 1, surge: inv.surge, phase: L.pl / L.rated, unbal: L.unbal == null ? null : L.unbal / L.rated, phasePeak: L.ppk / L.rated };
    const eq = { run: need.run, surge: need.surge / per.surge };
    if (three) { eq.phase = need.phase / per.phase; eq.phasePeak = need.phasePeak / per.phasePeak; if (per.unbal) eq.unbal = need.unbal / per.unbal; }
    let driver = 'run', req = 0;
    for (const k in eq) if (eq[k] > req + 1e-9) { req = eq[k]; driver = k; }
    if (pick) {       // the requirement that binds hardest on the chosen inverter
      let u = -1;
      for (const k of ['run', 'surge', 'phase', 'unbal', 'phasePeak']) {
        if (!three && ['phase', 'unbal', 'phasePeak'].includes(k)) continue;
        const cap = pick.caps[k]; if (!isFinite(cap) || cap <= 0) continue;
        const r = need[k] / cap; if (r > u + 1e-9) { u = r; driver = k; }
      }
    }
    const DRV = { run: 'the running peak', surge: 'motor starting surge', phase: 'the most loaded phase', unbal: 'the phase imbalance', phasePeak: 'motor starting on one phase' };
    let label = '—';
    if (pick) {
      const nm = pick.model ? pick.model.name : `${pick.size} kW`;
      label = pick.n > 1 ? `${pick.n} × ${nm} in parallel (${pick.total} kW)` : nm + (pick.model ? ` (${pick.size} kW)` : '');
    }
    return { req, need, driver, driverText: DRV[driver], pick, label, basis, assumed: L.assumed || L.scaled };
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
  // per-phase grouped bars (L1 brown, L2 black, L3 grey – IEC conductor colours); bars over the per-phase limit in red
  const PHASE_COL = { L1: '#8b5a2b', L2: '#1c1c1c', L3: '#8a94a6' };
  function phaseChartSVG(res, inv, pal = LIGHT_PAL, opt = {}) {
    const W = opt.w || 760, H = opt.h || 300, L = 46, R = 14, T = 18, B = 34;
    const pw = W - L - R, ph = H - T - B, pl = res.pl / 1000;
    const top = Math.max(res.peakPh.L1, res.peakPh.L2, res.peakPh.L3, res.pl) / 1000 * 1.15 || 1;
    const step = niceStep(top), ymax = Math.ceil(top / step) * step;
    const y = v => T + ph - (v / ymax) * ph;
    const bw = pw / 24;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" role="img" aria-label="Load per phase over 24 hours">`;
    s += `<rect x="0" y="0" width="${W}" height="${H}" fill="${pal.bg}"/>`;
    s += `<rect x="${L + 6 * bw}" y="${T}" width="${12 * bw}" height="${ph}" fill="${pal.band}"/>`;
    for (let v = 0; v <= ymax + 1e-9; v += step) {
      s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${pal.grid}" stroke-width="1"/>`;
      s += `<text x="${L - 6}" y="${y(v) + 3.5}" font-size="10.5" text-anchor="end" fill="${pal.text}">${+v.toFixed(2)}</text>`;
    }
    s += `<text x="12" y="${T + ph / 2}" font-size="10.5" fill="${pal.text}" transform="rotate(-90 12 ${T + ph / 2})" text-anchor="middle">kW per phase</text>`;
    res.hours.forEach((hr, h) => {
      PH.forEach((k, i) => {
        const v = hr.ph[k] / 1000, w = bw * 0.24, x = L + h * bw + bw * 0.13 + i * w;
        const over = hr.ph[k] > res.pl + 0.01;
        if (v > 0) s += `<rect data-h="${h}" x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${(w - 0.6).toFixed(1)}" height="${Math.max(0.5, y(0) - y(v)).toFixed(1)}" fill="${over ? pal.over : PHASE_COL[k]}"${opt.sel === h ? ` stroke="${pal.sel}" stroke-width="1.5"` : ''}/>`;
      });
      if (opt.hit) s += `<rect data-h="${h}" class="hit" x="${L + h * bw}" y="${T}" width="${bw}" height="${ph}" fill="transparent"/>`;
      if (h % 3 === 0) s += `<text x="${L + h * bw + bw / 2}" y="${H - B + 15}" font-size="10.5" text-anchor="middle" fill="${pal.text}">${ampmShort(h)}</text>`;
    });
    s += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="${pal.text}" stroke-width="1"/>`;
    s += `<line x1="${L}" x2="${W - R}" y1="${y(pl)}" y2="${y(pl)}" stroke="${pal.line}" stroke-width="1.8" stroke-dasharray="7 4"/>`;
    const lbl = `Per-phase limit ${+pl.toFixed(2)} kW${res.assumed ? ' (assumed)' : ''}`;
    s += `<rect x="${W - R - 8 - lbl.length * 5.9}" y="${y(pl) - 17}" width="${lbl.length * 5.9 + 8}" height="14" rx="3" fill="${pal.bg}" opacity="0.9"/>`;
    s += `<text x="${W - R - 4}" y="${y(pl) - 6}" font-size="10.5" font-weight="700" text-anchor="end" fill="${pal.line}">${lbl}</text>`;
    s += `<text x="${L + pw / 2}" y="${H - 4}" font-size="10" text-anchor="middle" fill="${pal.text}">Hour of day · bars per hour: L1, L2, L3</text>`;
    return s + '</svg>';
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

  // SVG -> JPEG (white background) for the PDF report: { bytes, w, h } in pixels
  function svgToJpeg(svg, scale = 2, quality = 0.92) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.scale(scale, scale); g.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? b.arrayBuffer().then(buf => resolve({ bytes: new Uint8Array(buf), w: c.width, h: c.height })) : reject(new Error('Chart image failed')), 'image/jpeg', quality);
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

  // ---------- Google Sheet (Apps Script web app) client ----------
  // Requests are sent as text/plain so the browser does not need a CORS preflight (Apps Script does not answer those).
  const configUrl = () => String((window.HLC_CONFIG && window.HLC_CONFIG.scriptUrl) || '').trim();
  const validScriptUrl = u => /^https:\/\/script\.google(usercontent)?\.com\/.+/.test(String(u || '').trim());
  async function cloudPost(url, body, ms = 30000) {
    if (!validScriptUrl(url)) throw new Error('The Google Sheet link is not set up. It should start with https://script.google.com/');
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), ms);
    let res, txt;
    try {
      res = await fetch(url.trim(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', signal: ctl ? ctl.signal : undefined });
      txt = await res.text();
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error('No answer from the server. Check the internet connection and try again.');
      throw new Error('Could not reach the server. Check the internet connection and try again.');
    } finally { clearTimeout(timer); }
    try { return JSON.parse(txt); }
    catch (e) { throw new Error(res && res.ok ? 'The Google Sheet link answered with a web page instead of data. In Apps Script, check the deployment is a Web app with access “Anyone”.' : `Server error ${res ? res.status : ''}`.trim()); }
  }

  return {
    FORM_TYPE, PROJECT_TYPE, VERSION, COMPANY, copyright, NOTICE, COMPANY_LINE, TYPES, CATS, ITEM, CAT_NAME, USE_LABEL, SIZES,
    esc, uid, num, hh, ampm, ampmShort, countHrs, fmtKW, emptyHrs, blocks, slotsText, store, parseFileText,
    newAppliance, normalise, emptyCustomer, defaultInverter, inScope, runW, phaseLimitW, limits, PH, hourState, severity,
    analyse, planShift, groupMoves, recommendInverter, autoBalance, planPhases, phaseChartSVG, chartSVG, svgToPng, svgToJpeg, LIGHT_PAL,
    configUrl, validScriptUrl, cloudPost, DAYS, daysPerMonth, kwhDay, kwhMonth, TEMPLATE_LEVELS, buildTemplate,
    CAPACITIES, TARIFF_GROUPS, TARIFFS, TOU_TARIFFS, TOU_PERIODS, isTouTariff, touOn, touTotal, hasTouValues, capacityText, tariffOptionsHTML, touSplit, entryName,
    hourPickerHTML, applyPreset, PHASE_COL, download, shareFile, safeName, today
  };
})();
