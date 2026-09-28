import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('bin/readfaster.cjs', () => {
  it('is up to date with the sources (run `npm run build:cli` and commit if this fails)', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'rf-')), 'readfaster.cjs');
    execFileSync(process.execPath, ['scripts/build-cli.mjs', out], { stdio: 'pipe' });
    expect(readFileSync(out, 'utf8') === readFileSync('bin/readfaster.cjs', 'utf8')).toBe(true);
  }, 30000);

  it('runs', () => {
    const help = execFileSync(process.execPath, ['bin/readfaster.cjs', 'help'], { encoding: 'utf8' });
    expect(help).toContain('readfaster mcp');
    const analysis = execFileSync(process.execPath, ['bin/readfaster.cjs', 'analyze', '--json', '-'], { input: 'Great question! The answer is 4.', encoding: 'utf8' });
    expect(JSON.parse(analysis).fillers[0].label).toBe('Compliment opener');
  });
});
