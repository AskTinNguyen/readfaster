/** Agent-facing facts shown in the app and kept in sync with the MCP server. */

/** How users install the CLI / MCP server. Change to "readfaster" once published to npm. */
export const PACKAGE_SPEC = 'github:AskTinNguyen/readfaster';

export interface ToolDoc {
  name: string;
  summary: string;
  needsApp: string;
}

export const MCP_TOOLS: ToolDoc[] = [
  { name: 'analyze_readability', summary: 'Scores text 0–100 for fast reading, with findings: buried answer, filler, long sentences, walls of text.', needsApp: 'No' },
  { name: 'tighten_text', summary: 'Strips stock openers, sign-offs and wordy phrases without touching code.', needsApp: 'No' },
  { name: 'get_style_prompt', summary: 'Returns writing instructions for fast-to-read output: your saved builder settings, or a preset.', needsApp: 'Uses your saved style if connected' },
  { name: 'list_training_content', summary: 'Lists drills and practice passages.', needsApp: 'No' },
  { name: 'send_to_reader', summary: 'Opens text in the Reader (pacer, chunk, flash or formatted), optionally with quiz questions the agent wrote.', needsApp: 'Opens it if needed' },
  { name: 'start_drill', summary: 'Starts a drill, by default at your recommended speed.', needsApp: 'Opens it if needed' },
  { name: 'open_app', summary: 'Opens or pairs ReadFaster in your browser, optionally on a given page.', needsApp: 'Opens it' },
  { name: 'get_progress', summary: 'Reads your speed, comprehension, streak, recommended speed and recent sessions.', needsApp: 'Yes' },
  { name: 'update_settings', summary: 'Changes reading speed, chunk size, font, theme and other display settings.', needsApp: 'Yes' },
];
