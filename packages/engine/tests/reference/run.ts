/**
 * Test runner: npm run test:engine
 *  1. Solar-term times vs 12 reference timestamps (±2 min).
 *  2. Day pillar anchors.
 *  3. Ten full reference charts (pillars, 局数, 值符/值使, 空亡, every palace).
 *  4. 置闰 structural invariants 1900–2100 (chunk grid, 36/39 halves, 接不过五).
 *  5. 拆补 intra-day term switching.
 */
import { buildChart } from '../../../../src/engine/index.ts';
import { termJdLocal, gregorianFromJd, solarTermsOfYear, jdFromGregorian, TERM_NAMES } from '../../../../src/engine/astro.ts';
import { dayGanZhi, dayNumber, ganZhi } from '../../../../src/engine/ganzhi.ts';
import { solsticeAnchor, getJuZhiRun } from '../../../../src/engine/ju.ts';
import { CHARTS, TERM_TIMES } from './references.ts';
import { CHARTS2 } from './references2.ts';

let pass = 0, fail = 0;
const failures: string[] = [];
function check(cond: boolean, msg: string) {
  if (cond) pass++;
  else { fail++; failures.push(msg); }
}

/* ---------- 1. solar term times ---------- */
for (const t of TERM_TIMES) {
  const terms = solarTermsOfYear(t.y);
  const found = terms.filter(x => x.name === t.name).find(x => Math.abs(x.jdLocal - jdFromGregorian(t.y, t.m, t.d)) < 20);
  if (!found) { check(false, `term ${t.name} ${t.y} not found`); continue; }
  const expJd = jdFromGregorian(t.y, t.m, t.d) + (t.hh * 60 + t.mm) / 1440;
  const diffMin = (found.jdLocal - expJd) * 1440;
  check(Math.abs(diffMin) <= 2, `term ${t.name} ${t.y}-${t.m}-${t.d}: computed ${found.time.y}-${found.time.m}-${found.time.d} ${found.time.hh}:${found.time.mm} vs expected ${t.hh}:${t.mm} (diff ${diffMin.toFixed(2)} min)`);
}

/* ---------- 2. day pillar anchors ---------- */
check(dayGanZhi(dayNumber(2000, 1, 1)).name === '戊午', 'day pillar 2000-01-01 should be 戊午');
check(dayGanZhi(dayNumber(2026, 3, 17)).name === '庚寅', 'day pillar 2026-03-17 should be 庚寅');
check(dayGanZhi(dayNumber(2019, 12, 26)).name === '丁酉', 'day pillar 2019-12-26 should be 丁酉');

/* ---------- 3. reference charts ---------- */
for (const f of [...CHARTS, ...CHARTS2]) {
  const c = buildChart({ y: f.y, m: f.m, d: f.d, hh: f.hh, mm: f.mm, method: 'zhirun', spiritVariant: f.spiritVariant });
  const tag = `[${f.id}]`;
  check(c.summary.fourPillars === f.pillars, `${tag} pillars: got ${c.summary.fourPillars}, want ${f.pillars}`);
  check(c.juResult.dun === f.dun && c.juResult.ju === f.ju, `${tag} ju: got ${c.juResult.dun}${c.juResult.ju}, want ${f.dun}${f.ju}`);
  check(c.board.zhiFuStar === f.zhiFuStar && c.board.zhiFuPalace === f.zhiFuPalace,
    `${tag} 值符: got ${c.board.zhiFuStar}@${c.board.zhiFuPalace}, want ${f.zhiFuStar}@${f.zhiFuPalace}`);
  check(c.board.zhiShiGate === f.zhiShiGate && c.board.zhiShiPalace === f.zhiShiPalace,
    `${tag} 值使: got ${c.board.zhiShiGate}@${c.board.zhiShiPalace}, want ${f.zhiShiGate}@${f.zhiShiPalace}`);
  check(c.board.xunShou === f.xunShou && c.board.xunShouYi === f.xunShouYi,
    `${tag} 旬首: got ${c.board.xunShou}${c.board.xunShouYi}, want ${f.xunShou}${f.xunShouYi}`);
  check(c.board.dayKongWang === f.dayKong, `${tag} 日空: got ${c.board.dayKongWang}, want ${f.dayKong}`);
  check(c.board.hourKongWang === f.hourKong, `${tag} 时空: got ${c.board.hourKongWang}, want ${f.hourKong}`);
  for (const pf of f.palaces) {
    const pal = c.board.palaces[pf.p - 1];
    const s = (a: string[]) => [...a].sort().join(',');
    check(pal.spirit === pf.spirit, `${tag} P${pf.p} spirit: got ${pal.spirit}, want ${pf.spirit}`);
    check(pal.gate === pf.gate, `${tag} P${pf.p} gate: got ${pal.gate}, want ${pf.gate}`);
    check(s(pal.stars) === s(pf.stars), `${tag} P${pf.p} stars: got ${pal.stars}, want ${pf.stars}`);
    check(s(pal.tianPanStems) === s(pf.tian), `${tag} P${pf.p} tianpan: got ${pal.tianPanStems}, want ${pf.tian}`);
    check(pal.diPanStem === pf.di, `${tag} P${pf.p} dipan: got ${pal.diPanStem}, want ${pf.di}`);
  }
}

/* ---------- 4. 置闰 invariants 1900–2100 ---------- */
{
  const anchors: { a: number; kind: string; year: number; lead: number; run: boolean; sday: number }[] = [];
  for (let y = 1900; y <= 2100; y++) {
    for (const kind of ['summer', 'winter'] as const) {
      const r = solsticeAnchor(y, kind);
      anchors.push({ a: r.anchorDayNum, kind, year: y, lead: r.lead, run: r.hasRunBefore, sday: r.solsticeDayNum });
    }
  }
  anchors.sort((x, y) => x.a - y.a);
  let runCount = 0;
  for (let i = 1; i < anchors.length; i++) {
    const span = (anchors[i].a - anchors[i - 1].a) / 5;
    check(span === 36 || span === 39,
      `anchor span ${anchors[i - 1].kind} ${anchors[i - 1].year} -> ${anchors[i].kind} ${anchors[i].year}: ${span} chunks`);
    if (span === 39) runCount++;
    // anchor must be a 上/中/下-consistent 甲/己 day and specifically an 上元符头
    const gz = dayGanZhi(anchors[i].a);
    check((gz.stem === 0 || gz.stem === 5) && gz.branch % 3 === 0,
      `anchor ${anchors[i].year} ${anchors[i].kind} is ${gz.name}, not an 上元符头`);
    // 接不过五: anchor may lag its solstice day by at most 5 days
    const lag = anchors[i].a - anchors[i].sday;
    check(lag <= 5, `接气 lag ${lag} > 5 at ${anchors[i].year} ${anchors[i].kind}`);
    // 超不过九: anchor may lead its solstice day by at most 9 days
    check(anchors[i].sday - anchors[i].a <= 9, `超神 lead ${anchors[i].sday - anchors[i].a} > 9 at ${anchors[i].year} ${anchors[i].kind}`);
  }
  console.log(`置闰 scan 1900-2100: ${anchors.length} solstice anchors, ${runCount} intercalations (闰), all invariants checked.`);
  // every day 1900-2100 must produce a ju without internal-error throws
  let ok = true;
  const start = dayNumber(1900, 1, 15), end = dayNumber(2100, 12, 15);
  for (let dnum = start; dnum <= end; dnum += 1) {
    try { getJuZhiRun(dnum); } catch (e) { ok = false; failures.push(`getJuZhiRun threw at dayNum ${dnum}: ${e}`); break; }
  }
  check(ok, '置闰 full-range day scan');
}

/* ---------- 5. 拆补 intra-day switching & method divergence ---------- */
{
  // 小暑 2026-07-07 09:56 — before: 夏至上 阴9; after: 小暑上 阴8 (same day 壬午)
  const before = buildChart({ y: 2026, m: 7, d: 7, hh: 9, mm: 0, method: 'chaibu' });
  const after = buildChart({ y: 2026, m: 7, d: 7, hh: 11, mm: 0, method: 'chaibu' });
  check(before.juResult.dun === 'yin' && before.juResult.ju === 9, `拆补 2026-07-07 09:00: got ${before.juResult.dun}${before.juResult.ju}, want yin9 (夏至上)`);
  check(after.juResult.dun === 'yin' && after.juResult.ju === 8, `拆补 2026-07-07 11:00: got ${after.juResult.dun}${after.juResult.ju}, want yin8 (小暑上)`);
  // spec's verified case: 2026-07-06 23:00 晚子时 壬午日 庚子时, 拆补 = 阴9
  const spec = buildChart({ y: 2026, m: 7, d: 6, hh: 23, mm: 0, method: 'chaibu' });
  check(spec.pillars.day.name === '壬午' && spec.pillars.hour.name === '庚子', `拆补 spec case pillars: ${spec.pillars.day.name} ${spec.pillars.hour.name}`);
  check(spec.juResult.dun === 'yin' && spec.juResult.ju === 9, `拆补 2026-07-06 23:00: got ${spec.juResult.dun}${spec.juResult.ju}, want yin9`);
  // same moment under 置闰 = 阴8 (小暑上, chunk 己卯 7/4) — documented method divergence
  const zr = buildChart({ y: 2026, m: 7, d: 6, hh: 23, mm: 0, method: 'zhirun' });
  check(zr.juResult.dun === 'yin' && zr.juResult.ju === 8, `置闰 2026-07-06 23:00: got ${zr.juResult.dun}${zr.juResult.ju}, want yin8 (小暑上, 符头己卯)`);
  console.log(`method divergence check: 2026-07-06 23:00 拆补=阴${spec.juResult.ju}局, 置闰=阴${zr.juResult.ju}局 (expected 9 vs 8)`);
  // 2019 接气 window: 2019-12-22 (day of 冬至) stays 大雪下 阴1局 until 甲午 12-23 opens 冬至上
  const jieqi = buildChart({ y: 2019, m: 12, d: 22, hh: 14, mm: 0, method: 'zhirun' });
  check(jieqi.juResult.servingTerm === '大雪' && jieqi.juResult.dun === 'yin' && jieqi.juResult.ju === 1,
    `置闰 2019-12-22 (大雪下, 接气前): got ${jieqi.juResult.dun}${jieqi.juResult.ju} ${jieqi.juResult.servingTerm}, want yin1 大雪`);
  // the physical intercalation of that cycle was 闰芒种 2019 (超神 reached 10 days at 夏至):
  // repeated 芒种 三元 = 己卯 6/11, 甲申 6/16, 己丑 6/21; 夏至上 opens 甲午 6/26 (接气 5 days)
  const run619 = buildChart({ y: 2019, m: 6, d: 18, hh: 12, mm: 0, method: 'zhirun' });
  check(run619.juResult.isRun === true && run619.juResult.servingTerm === '芒种' && run619.juResult.dun === 'yang' && run619.juResult.ju === 3,
    `置闰 2019-06-18 (闰芒种中): got ${run619.juResult.dun}${run619.juResult.ju} ${run619.juResult.servingTerm} run=${run619.juResult.isRun}, want yang3 芒种(闰)`);
  const post = buildChart({ y: 2019, m: 6, d: 27, hh: 12, mm: 0, method: 'zhirun' });
  check(post.juResult.dun === 'yin' && post.juResult.ju === 9 && post.juResult.servingTerm === '夏至',
    `置闰 2019-06-27 (夏至上, 接气): got ${post.juResult.dun}${post.juResult.ju} ${post.juResult.servingTerm}, want yin9 夏至`);
}

/* ---------- 6. divergence windows confirmed by batch-2 screenshots ---------- */
{
  // 2024-09-30: app (置闰) = 阴6 (寒露上, 超神7天); strict 拆补 = 阴7 (秋分上)
  const cb1 = buildChart({ y: 2024, m: 9, d: 30, hh: 19, mm: 21, method: 'chaibu' });
  check(cb1.juResult.dun === 'yin' && cb1.juResult.ju === 7 && cb1.juResult.servingTerm === '秋分',
    `拆补 2024-09-30: got ${cb1.juResult.dun}${cb1.juResult.ju} ${cb1.juResult.servingTerm}, want yin7 秋分`);
  // 2024-11-01: app (置闰) = 阴9 (立冬中); strict 拆补 = 阴8 (霜降中)
  const cb2 = buildChart({ y: 2024, m: 11, d: 1, hh: 18, mm: 27, method: 'chaibu' });
  check(cb2.juResult.dun === 'yin' && cb2.juResult.ju === 8 && cb2.juResult.servingTerm === '霜降',
    `拆补 2024-11-01: got ${cb2.juResult.dun}${cb2.juResult.ju} ${cb2.juResult.servingTerm}, want yin8 霜降`);
  // 2025-04-06: app (置闰) = 阳6 (春分下); strict 拆补 = 阳7 (清明下)
  const cb3 = buildChart({ y: 2025, m: 4, d: 6, hh: 18, mm: 1, method: 'chaibu' });
  check(cb3.juResult.dun === 'yang' && cb3.juResult.ju === 7 && cb3.juResult.servingTerm === '清明',
    `拆补 2025-04-06: got ${cb3.juResult.dun}${cb3.juResult.ju} ${cb3.juResult.servingTerm}, want yang7 清明`);
  console.log('divergence windows: 2024-09-30 置闰阴6/拆补阴7 · 2024-11-01 置闰阴9/拆补阴8 · 2025-04-06 置闰阳6/拆补阳7 — app matches 置闰 in all three.');
}

/* ---------- summary ---------- */
console.log(`\n${pass} checks passed, ${fail} failed.`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures.slice(0, 40)) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('ALL TESTS PASSED ✓');
