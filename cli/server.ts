import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BRIDGE_PORT_RANGE } from '../src/lib/protocol';
import { BridgeServer } from './bridge';
import { createMcpServer } from './mcp';
import { loadConfig, loadOrCreateToken, openUrl } from './util';

/** `readfaster mcp`: the stdio MCP server plus the local browser bridge. stdout carries protocol only. */
export async function runMcp(version: string) {
  const cfg = loadConfig();
  const log = (m: string) => process.stderr.write(`[readfaster] ${m}\n`);

  let bridge: BridgeServer | null = new BridgeServer({
    port: cfg.port,
    token: loadOrCreateToken(),
    allowedOrigins: cfg.allowedOrigins,
    range: BRIDGE_PORT_RANGE,
    log,
  });
  try {
    const port = await bridge.start();
    log(`browser bridge listening on 127.0.0.1:${port}`);
  } catch (e) {
    log(`browser bridge unavailable (${e instanceof Error ? e.message : e}); link-based tools still work`);
    bridge = null;
  }

  const server = createMcpServer({ bridge, appUrl: cfg.appUrl, openUrl: (u) => openUrl(u, cfg.noOpen), version });
  const transport = new StdioServerTransport();
  const shutdown = async () => {
    await bridge?.stop();
    process.exit(0);
  };
  process.stdin.on('close', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  await server.connect(transport);
  log(`MCP server ready (app: ${cfg.appUrl})`);
}
