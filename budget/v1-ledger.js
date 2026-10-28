/*
 * Budget v2: the old app's arithmetic, ported line for line from v1's
 * budget.html. It is used once, when you bring your old books in: the
 * import works out what the old app would show today, builds the v2 tables,
 * and checks that v2 arrives at the same balances to the halala.
 */
(function (root) {
"use strict";

function pad(n) { return String(n).padStart(2, '0'); }
const Tn = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const Ht = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0); };
function payDay(y, m) { const w = new Date(y, m - 1, 25, 12).getDay(); return w === 5 ? 24 : w === 6 ? 26 : 25; }
function payDate(y, m) { return Tn(new Date(y, m - 1, payDay(y, m), 12)); }
function cycleOf(date) {
  const s = Ht(date); let y = s.getFullYear(), m = s.getMonth() + 1;
  if (s.getDate() >= payDay(y, m)) { m += 1; if (m > 12) { m = 1; y += 1; } }
  return `${y}-${pad(m)}`;
}
function cycleRange(c) {
  const [y, m] = c.split('-').map(Number); let py = y, pm = m - 1; if (pm < 1) { pm = 12; py -= 1; }
  const start = payDate(py, pm); const e = Ht(payDate(y, m)); e.setDate(e.getDate() - 1);
  return { start, end: Tn(e) };
}
const nextCycle = (c, n) => { let [y, m] = c.split('-').map(Number); m += n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return `${y}-${pad(m)}`; };
function dueDate(c, day) {
  const r = cycleRange(c); const h = Number(r.start.slice(8)); let B = Number(r.start.slice(0, 4)), V = Number(r.start.slice(5, 7));
  if (Number(day) < h) { V += 1; if (V > 12) { V = 1; B += 1; } }
  const last = new Date(B, V, 0).getDate(); const k = Math.min(Number(day), last);
  const s = `${B}-${pad(V)}-${pad(k)}`; return s < r.start ? r.start : s > r.end ? r.end : s;
}

function fundsFor(accts, env) { const out = []; (accts || []).forEach(a => (a.funds || []).forEach(f => { if (f.env === env) out.push({ acct: a.id, f }); })); return out; }
function restAcct(accts, env) {
  const p = fundsFor(accts, env); if (!p.length) return null;
  const r = p.find(x => x.f.rest); if (r) return r.acct;
  const w = p.find(x => x.f.share == null); if (w) return w.acct;
  return p.reduce((C, B) => Math.abs(Number(B.f.share) || 0) > Math.abs(Number(C.f.share) || 0) ? B : C).acct;
}
function shareOf(accts, acct, env, amount) {
  const rest = restAcct(accts, env);
  if (acct !== rest) { const b = fundsFor(accts, env).find(v => v.acct === acct); return (b && b.f.share != null && Number(b.f.share)) || 0; }
  const fixed = fundsFor(accts, env).reduce((s, v) => v.acct === rest || v.f.share == null ? s : s + (Number(v.f.share) || 0), 0);
  return (Number(amount) || 0) - fixed;
}

function compute(o, entries, today, viewCycle) {
  const BUF = { id: 'buffer', name: 'Remaining', group: 'buffer', roll: true, lumpy: true };
  const envs = o.envelopes.map(e => (e.type === 'sink' ? { ...e, roll: true } : e));
  const n = [...envs, BUF];
  const K = o.firstCycle || '2026-08';
  const R = cycleOf(today);
  const y = viewCycle || R;
  const salKeys = Object.keys(o.salaryPlans || {}).sort();
  const salary = (c) => { for (let i = salKeys.length - 1; i >= 0; i--) if (salKeys[i] <= c) return Number(o.salaryPlans[salKeys[i]]); return Number(o.salary) || 0; };
  const resAcct = (c) => (o.reserveMoves || []).filter(m => m.cycle === c && m.acct).reduce((s, f) => s + (f.dir === 'out' ? Number(f.amount) : -Number(f.amount)), 0);
  const income = (c) => salary(c) + resAcct(c);
  const planKeys = Object.keys(o.plans || {}).sort();
  const budget = (env, c) => {
    const f = (o.overrides || {})[c]; if (f && f[env] != null) return Number(f[env]);
    for (let i = planKeys.length - 1; i >= 0; i--) { const U = planKeys[i]; if (U <= c && o.plans[U][env] != null) return Number(o.plans[U][env]); }
    const H = envs.find(e => e.id === env); return (H && Number(H.budget)) || 0;
  };
  const totalBudget = (c) => envs.reduce((s, f) => s + budget(f.id, c), 0);
  const ne = (env, c) => env === 'buffer' ? income(c) - totalBudget(c) : budget(env, c);
  const accts = o.accounts;
  const home = {};
  accts.forEach(a => a.funds.forEach(m => { if (home[m.env] == null) home[m.env] = restAcct(accts, m.env) || a.id; }));
  const acctOf = (e) => e.acct || home[e.env] || null;

  const set = new Set([R, y]); entries.forEach(e => set.add(cycleOf(e.date)));
  const Fe = [...set].filter(c => c >= K).sort();
  if (!Fe.length) Fe.push(R);
  while (Fe.length && Fe[Fe.length - 1] < y) Fe.push(nextCycle(Fe[Fe.length - 1], 1));
  while (Fe.length && Fe[Fe.length - 1] < R) Fe.push(nextCycle(Fe[Fe.length - 1], 1));
  const cycles = [];
  for (let i = 0; i < Fe.length; i++) { cycles.push(Fe[i]); if (i < Fe.length - 1) { let m = Fe[i]; while (nextCycle(m, 1) < Fe[i + 1]) { m = nextCycle(m, 1); cycles.push(m); } } }

  const zt = o.ledgerFrom || K;
  const At = [];
  const sched = [];
  const add = (cid, date, acct, env, amount, kind, note, extra) => { if (amount) At.push({ cid, date, acct: acct || null, env: env || null, amount, kind, note, ...(extra || {}) }); };
  cycles.forEach(c => {
    const r = cycleRange(c);
    if (c === zt) (o.openings || []).forEach(f => add(c, r.start, f.acct, f.env, Number(f.amount) || 0, 'open', 'Starting balance'));
    accts.forEach(a => a.funds.forEach(H => {
      const amt = H.env === 'buffer' ? salary(c) - totalBudget(c) : budget(H.env, c);
      add(c, r.start, a.id, H.env, shareOf(accts, a.id, H.env, amt), 'fund', 'Payday');
    }));
    (o.reserveMoves || []).filter(f => f.cycle === c && f.acct).forEach(f => add(c, f.date || r.start, f.acct, 'buffer', f.dir === 'out' ? Number(f.amount) || 0 : -(Number(f.amount) || 0), 'reserve', f.note || 'Reserve'));
    entries.filter(f => cycleOf(f.date) === c).forEach(f => add(c, f.date, acctOf(f), f.env, -(Number(f.amount) || 0), 'spend', f.label, { id: f.id }));
    n.forEach(f => {
      const H = entries.filter(m => m.env === f.id && cycleOf(m.date) === c);
      const amt = f.id === 'buffer' ? salary(c) - totalBudget(c) : budget(f.id, c);
      if (!f.dueDay || f.roll || H.length) return;
      const d = dueDate(c, f.dueDay); if (d > today) return;
      const U = { id: `sched:${f.id}:${c}`, env: f.id, date: d, amount: amt };
      sched.push({ cycle: c, ...U });
      add(c, U.date, acctOf(U), f.id, -U.amount, 'sched', 'Scheduled');
    });
    (o.transfers || []).filter(f => f.cycle === c && f.kind !== 'acct' && f.posted).forEach(f => {
      const H = Number(f.amount) || 0; const fa = f.fromAcct || restAcct(accts, f.from); const ta = f.toAcct || restAcct(accts, f.to);
      add(c, f.date || r.start, fa, f.from, -H, 'realloc', f.note || 'Moved budget');
      add(c, f.date || r.start, ta, f.to, H, 'realloc', f.note || 'Moved budget');
    });
    (o.accountMoves || []).filter(f => f.cycle === c).forEach(f => {
      const H = Number(f.amount) || 0;
      add(c, f.date || r.start, f.from, null, -H, 'move', f.note || 'Moved');
      add(c, f.date || r.start, f.to, null, H, 'move', f.note || 'Moved');
    });
  });

  const ct = {}, Nt = {}, Bn = {}, ft = {};
  const Ft = 'unassigned';
  n.forEach(a => ft[a.id] = 0); ft[Ft] = 0;
  cycles.forEach(c => {
    const m = At.filter(U => U.cid === c);
    if (c === zt) Object.keys(ft).forEach(U => ft[U] = 0);
    const live = c >= zt;
    const H = {};
    [...n, { id: Ft, name: 'Unassigned', roll: true }].forEach(U => {
      const me = m.filter(fe => fe.env === U.id);
      const base = me.filter(fe => fe.kind === 'fund' || fe.kind === 'realloc').reduce((s, e) => s + e.amount, 0);
      const open = me.filter(fe => fe.kind === 'open').reduce((s, e) => s + e.amount, 0);
      const vt = me.filter(fe => fe.kind !== 'fund' && fe.kind !== 'open' && fe.kind !== 'realloc');
      const received = vt.filter(fe => fe.amount > 0).reduce((s, e) => s + e.amount, 0);
      const spent = -vt.filter(fe => fe.amount < 0).reduce((s, e) => s + e.amount, 0);
      const carryIn = (ft[U.id] || 0) + open;
      const alloc = base + carryIn + received;
      H[U.id] = { base, carryIn, received, alloc, spent, left: alloc - spent };
    });
    ct[c] = H;
    Nt[c] = accts.map(U => {
      const me = m.filter(e => e.acct === U.id);
      const pay = me.filter(e => e.kind === 'fund' || e.kind === 'realloc').reduce((s, e) => s + e.amount, 0);
      const open = me.filter(e => e.kind === 'open').reduce((s, e) => s + e.amount, 0);
      const moved = me.filter(e => e.kind === 'move').reduce((s, e) => s + e.amount, 0);
      const res = me.filter(e => e.kind === 'reserve').reduce((s, e) => s + e.amount, 0);
      const spent = -me.filter(e => e.kind === 'spend' || e.kind === 'sched').reduce((s, e) => s + e.amount, 0);
      const carry = live ? (Bn[U.id] || 0) + open : 0;
      const left = carry + pay + res + moved - spent;
      if (live) Bn[U.id] = left;
      return { id: U.id, name: U.name, carry, payday: pay, moved, received: res, spent, left };
    });
    let ie = 0;
    n.forEach(U => { if (U.roll) ft[U.id] = H[U.id].left; else { ie += H[U.id].left; ft[U.id] = 0; } });
    ft[Ft] = H[Ft].left + ie;
  });

  const reserves = (o.reserves || []).map(r => ({ id: r.id, name: r.name, balance: (o.reserveMoves || []).filter(f => f.reserve === r.id).reduce((s, f) => s + (f.dir === 'in' ? Number(f.amount) : -Number(f.amount)), Number(r.opening) || 0) }));
  return { cycles, envByCycle: ct, acctByCycle: Nt, ledger: At, sched, salary, budget, income, totalBudget, reserves, home, zt, today, R };
}

var V1 = { compute: compute, cycleOf: cycleOf, cycleRange: cycleRange, nextCycle: nextCycle, dueDate: dueDate, restAcct: restAcct, shareOf: shareOf, payDate: payDate };
if (typeof module !== "undefined" && module.exports) module.exports = V1;
else root.V1 = V1;
})(typeof window !== "undefined" ? window : this);
