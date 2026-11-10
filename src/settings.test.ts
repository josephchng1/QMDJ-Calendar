import { describe, it, expect } from 'vitest';
import { parseSettings, DEFAULT_SETTINGS } from './settings.ts';

describe('parseSettings', () => {
  it('falls back to defaults on missing, bad or non-object input', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{bad')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('[]')).toEqual(DEFAULT_SETTINGS);
  });
  it('merges stored keys over the defaults', () => {
    expect(parseSettings('{"showMarks":false}')).toEqual({ ...DEFAULT_SETTINGS, showMarks: false });
  });
});
