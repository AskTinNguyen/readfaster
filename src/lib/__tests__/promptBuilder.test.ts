import { describe, expect, it } from 'vitest';
import { PRESETS, RULES, applyPreset, buildPrompt, defaultOptions } from '../promptBuilder';

describe('buildPrompt', () => {
  it('includes enabled rules with values substituted', () => {
    const o = defaultOptions();
    o.values.budget = 123;
    const p = buildPrompt(o);
    expect(p).toContain('under 123 words');
    expect(p).not.toContain('{n}');
    const enabled = RULES.filter((r) => o.enabled[r.id]).length;
    expect(p.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(enabled);
  });

  it('is empty when nothing is enabled', () => {
    const o = defaultOptions();
    for (const k of Object.keys(o.enabled)) o.enabled[k] = false;
    expect(buildPrompt(o)).toBe('');
  });

  it('wraps for each target', () => {
    const o = defaultOptions();
    expect(buildPrompt({ ...o, target: 'claude-md' })).toMatch(/^## Communication style/);
    expect(buildPrompt({ ...o, target: 'system' })).toMatch(/^# Response style/);
    expect(buildPrompt({ ...o, target: 'inline' })).toMatch(/---\n$/);
  });

  it('applies presets, including their extra instructions', () => {
    for (const preset of PRESETS) {
      const o = applyPreset(preset, 'system');
      const p = buildPrompt(o);
      expect(p.length).toBeGreaterThan(0);
      if (preset.extra) expect(p).toContain(preset.extra);
      for (const id of Object.keys(preset.rules)) expect(RULES.some((r) => r.id === id)).toBe(true);
    }
  });
});
