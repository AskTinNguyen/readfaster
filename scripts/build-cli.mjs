// Bundles the CLI + MCP server into a single dependency-free file, so
// `npx -y github:AskTinNguyen/readfaster mcp` works without a build step.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// Optional output path, used by the test that checks the committed bundle is current.
const outfile = process.argv[2] ?? 'bin/readfaster.cjs';

await build({
  entryPoints: ['cli/index.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  banner: { js: '#!/usr/bin/env node' },
  define: { __VERSION__: JSON.stringify(version) },
  legalComments: 'none',
  minify: true,
  keepNames: true,
  logLevel: 'warning',
});
console.log(`built ${outfile} (v${version})`);
