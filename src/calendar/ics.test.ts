import { describe, it, expect } from 'vitest';
import type { PalaceScore } from './palace.ts';
import { slotEvent, buildIcs, googleCalendarUrl } from './ics.ts';

function ps(palace: number, direction: PalaceScore['direction'], score: number): PalaceScore {
  return { palace, direction, band: 'plain', rung: '凶方', reasons: [], blocked: false,
    score, matched: [], warnings: [], badges: [], baseFilter: '凶方',
    strength: { gate: null, star: null, spirit: null, stems: {} } };
}

describe('ics export', () => {
  const palaces = [ps(9, 'S', 200), ps(4, 'SE', 40), ps(1, 'N', -10), ps(5, null, 0)];
  const ev = slotEvent({ y: 2026, m: 8, d: 14 }, 4, palaces);   // 辰时 07:00–09:00

  it('summarises 大吉/吉 directions', () => {
    expect(ev.title).toContain('辰时');
    expect(ev.description).toContain('大吉方位：南');   // score 200 ≥ SCORE_PRIME
    expect(ev.description).toContain('吉方位：东南');   // score 40 in [16,120)
    expect(ev.end.getTime() - ev.start.getTime()).toBe(2 * 3600 * 1000);
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
