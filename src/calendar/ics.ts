// ─────────────────────────────────────────────────────────────────────────────
// ics.ts — turn a chosen 时辰 into a calendar event (§6.4). Pure string building
// (buildIcs / googleCalendarUrl / slotEvent are testable); downloadIcs touches
// the DOM. Times are emitted as UTC (…Z) derived from the browser's local time,
// so both .ics and Google Calendar place the block correctly regardless of TZ.
// ─────────────────────────────────────────────────────────────────────────────
import { scoreBand } from './bandsV2.ts';
import { DIRECTION_LABEL } from './direction.ts';
import type { PalaceScore } from './palace.ts';

const BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export interface CalEvent { start: Date; end: Date; title: string; description: string; }

/** Build an event for one 时辰 on `date`, summarising its 大吉/吉 directions. */
export function slotEvent(
  date: { y: number; m: number; d: number },
  branchIndex: number,
  palaces: PalaceScore[],
): CalEvent {
  const startHour = (23 + branchIndex * 2) % 24;         // 子=23:00 … matches shichenWindow
  const start = new Date(date.y, date.m - 1, date.d, startHour, 0, 0);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);

  const prime: string[] = [], good: string[] = [];
  for (const p of palaces) {
    if (p.palace === 5 || p.blocked || !p.direction) continue;
    const b = scoreBand(p.score, p.blocked);
    if (b === 'prime') prime.push(DIRECTION_LABEL[p.direction]);
    else if (b === 'good') good.push(DIRECTION_LABEL[p.direction]);
  }
  const branch = BRANCH[branchIndex] ?? '';
  const headline = prime[0] ? `${prime[0]}方 大吉` : good[0] ? `${good[0]}方 吉` : '无吉方';
  const title = `奇门吉时 · ${branch}时 · ${headline}`;
  const lines: string[] = [];
  if (prime.length) lines.push(`大吉方位：${prime.join('、')}`);
  if (good.length) lines.push(`吉方位：${good.join('、')}`);
  if (!prime.length && !good.length) lines.push('本时辰无吉方');
  return { start, end, title, description: lines.join('\n') };
}

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');   // YYYYMMDDTHHMMSSZ
}
function esc(s: string): string {
  return s.replace(/([\;,])/g, '\\$1').replace(/\n/g, '\\n');
}

export function buildIcs(ev: CalEvent): string {
  const uid = `${fmt(ev.start)}-${Math.random().toString(36).slice(2, 8)}@qmdj`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QMDJ Calendar//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(ev.start)}`,
    `DTEND:${fmt(ev.end)}`,
    `SUMMARY:${esc(ev.title)}`,
    `DESCRIPTION:${esc(ev.description)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export function googleCalendarUrl(ev: CalEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${fmt(ev.start)}/${fmt(ev.end)}`,
    details: ev.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcs(ev: CalEvent, filename: string): void {
  const blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
