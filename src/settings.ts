export type LlmProvider = "copilot" | "claude" | "claude-proxy" | "gemini" | "cli";

export interface AiAssistantSettings {
  // Provider selection
  llmProvider: LlmProvider;
  llmModel: string;
  timeoutMs: number;

  // Copilot
  copilotApiBaseUrl: string;
  copilotApiKey: string;

  // Claude
  claudeApiBaseUrl: string;
  claudeApiKey: string;

  // Claude via OpenAI-compatible proxy
  claudeProxyApiBaseUrl: string;
  claudeProxyApiKey: string;

  // Gemini
  geminiApiBaseUrl: string;
  geminiApiKey: string;

  // CLI (local tools like `claude`, `gemini`, `llm`)
  cliCommand: string;   // binary name or absolute path, e.g. "claude"
  cliArgs: string;      // extra args, space-separated, e.g. "-p"
  cliCwd: string;       // optional working directory; empty = inherit from Obsidian

  // Prompt configuration
  llmInlinePrompt: string;
  llmIncludeInlineSystemPrompt: boolean;
  llmPromptsFolder: string;

  // Insertion behavior
  llmResultHeading: string;
  insertPosition: "at-cursor" | "after-selection" | "end-of-file";

  // Vault note names in context
  includeVaultNoteNames: boolean;
  vaultNoteNamesExclusions: string[];

  // Debugging
  debug: boolean;
}

export const DEFAULT_SETTINGS: AiAssistantSettings = {
  llmProvider: "copilot",
  llmModel: "",
  timeoutMs: 60000,

  copilotApiBaseUrl: "",
  copilotApiKey: "",

  claudeApiBaseUrl: "",
  claudeApiKey: "",

  claudeProxyApiBaseUrl: "",
  claudeProxyApiKey: "",

  geminiApiBaseUrl: "",
  geminiApiKey: "",

  cliCommand: "claude",
  cliArgs: "",
  cliCwd: "",

  llmInlinePrompt: "You are an expert assistant. Generate the requested result in Markdown.",
  llmIncludeInlineSystemPrompt: true,
  llmPromptsFolder: "Prompts/AI",

  llmResultHeading: "AI Result",
  insertPosition: "after-selection",

  includeVaultNoteNames: false,
  vaultNoteNamesExclusions: ["Untitled*", "Screenshot*"],

  debug: false,
};
