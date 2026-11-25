import { describe, it, expect } from 'vitest';
import type { PalaceScore } from './palace.ts';
import { slotEvent, buildIcs, googleCalendarUrl } from './ics.ts';

function ps(palace: number, direction: PalaceScore['direction'], band: PalaceScore['band']): PalaceScore {
  return { palace, direction, band, rung: '凶方', reasons: [], blocked: false,
    score: 0, display: null, matched: [], warnings: [], badges: [], grades: [], baseFilter: '凶方',
    strength: { gate: null, star: null, spirit: null, stems: {} } };
}

describe('ics export', () => {
  const palaces = [ps(9, 'S', 'prime'), ps(4, 'SE', 'good'), ps(1, 'N', 'plain'), ps(5, null, 'plain')];
  const ev = slotEvent({ y: 2026, m: 8, d: 14 }, 4, palaces);   // 辰时 07:00–09:00

  it('summarises 大吉/吉 directions', () => {
    expect(ev.title).toContain('辰时');
    expect(ev.description).toContain('大吉方位：南');   // ladder band
    expect(ev.description).toContain('吉方位：东南');
    expect(ev.end.getTime() - ev.start.getTime()).toBe(2 * 3600 * 1000);
  });

  it('places the 时辰 at its UTC+8 instant, 子时 starting the previous evening', () => {
    expect(ev.start.toISOString()).toBe('2026-08-13T23:00:00.000Z');              // 辰 07:00 UTC+8
    expect(slotEvent({ y: 2026, m: 8, d: 14 }, 0, palaces).start.toISOString())
      .toBe('2026-08-13T15:00:00.000Z');                                         // 子 23:00 on the 13th, UTC+8
    expect(slotEvent({ y: 2026, m: 3, d: 1 }, 0, palaces).start.toISOString())
      .toBe('2026-02-28T15:00:00.000Z');                                         // across a month edge
  });

  it('builds a valid VEVENT with UTC stamps', () => {
    const ics = buildIcs(ev);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(ics).toMatch(/DTEND:\d{8}T\d{6}Z/);
    expect(ics).toContain('END:VCALENDAR');
  });

  it('builds a Google Calendar template url', () => {
    const url = googleCalendarUrl(ev);
    expect(url).toContain('calendar.google.com');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toMatch(/dates=\d{8}T\d{6}Z%2F\d{8}T\d{6}Z/);
  });
});
