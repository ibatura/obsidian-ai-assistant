import { App, Editor, Notice, TFile } from "obsidian";
import { AiAssistantSettings } from "../settings";
import { resolveInlinePrompt } from "../core/promptResolver";
import { expandObsidianLinks } from "../core/linkResolver";
import { buildNoteNamesBlock } from "../core/noteNamesContext";
import { createLlmClient } from "../core/llmClient";
import { PromptPickerModal } from "../ui/promptPickerModal";
import { showProgressIndicator } from "../ui/progressIndicator";

function isValidHttpUrl(s: string): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function validateProviderSettings(settings: AiAssistantSettings): string | null {
  switch (settings.llmProvider) {
    case "copilot":
      if (!isValidHttpUrl(settings.copilotApiBaseUrl)) return "Set a valid Copilot API base URL in plugin settings";
      if (!settings.copilotApiKey) return "Set a Copilot API key in plugin settings";
      return null;
    case "claude":
      if (settings.claudeApiBaseUrl && !isValidHttpUrl(settings.claudeApiBaseUrl)) return "Claude API base URL must be http(s)";
      if (!settings.claudeApiKey) return "Set a Claude API key in plugin settings";
      return null;
    case "claude-proxy":
      if (!isValidHttpUrl(settings.claudeProxyApiBaseUrl)) return "Set a valid Claude proxy API base URL in plugin settings";
      if (!settings.claudeProxyApiKey) return "Set a Claude proxy API key in plugin settings";
      return null;
    case "gemini":
      if (settings.geminiApiBaseUrl && !isValidHttpUrl(settings.geminiApiBaseUrl)) return "Gemini API base URL must be http(s)";
      if (!settings.geminiApiKey) return "Set a Gemini API key in plugin settings";
      return null;
    case "cli":
      if (!settings.cliCommand || !settings.cliCommand.trim()) return "Set a CLI command in plugin settings";
      return null;
    default:
      return "Unknown AI provider";
  }
}

function getRawInput(editor: Editor): string {
  const selection = editor.getSelection();
  return selection.trim()
    ? selection
    : editor.getLine(editor.getCursor().line);
}

async function runRequest(
  editor: Editor,
  file: TFile,
  app: App,
  settings: AiAssistantSettings,
  rawInput: string,
  systemPrompt: string,
): Promise<void> {
  const progress = showProgressIndicator("Preparing request...");

  try {
    // Step 1: Expand Obsidian links
    progress.updateStatus("Expanding links...", 10);
    const { expanded, unresolved } = await expandObsidianLinks(rawInput, file.path, app);
    if (unresolved.length > 0) {
      new Notice(`Could not resolve links: ${unresolved.join(", ")}`);
    }

    // Step 2: Append vault note names block if enabled
    let resolvedSystemPrompt = systemPrompt;
    if (settings.includeVaultNoteNames) {
      progress.updateStatus("Building note list...", 25);
      const noteBlock = buildNoteNamesBlock(app, settings.vaultNoteNamesExclusions);
      resolvedSystemPrompt = resolvedSystemPrompt ? `${resolvedSystemPrompt}\n\n${noteBlock}` : noteBlock;
    }

    // Step 3: Validate provider
    const validationError = validateProviderSettings(settings);
    if (validationError) {
      progress.close();
      new Notice(validationError);
      return;
    }

    // Step 4: Call LLM
    const PROVIDER_LABELS: Record<string, string> = {
      copilot: "Copilot", claude: "Claude", "claude-proxy": "Claude (proxy)", gemini: "Gemini", cli: "CLI",
    };
    const providerLabel = PROVIDER_LABELS[settings.llmProvider] ?? settings.llmProvider;
    progress.updateStatus(`Sending to ${providerLabel}...`, 30);
    const client = createLlmClient(settings);
    progress.updateStatus("Waiting for response...", 50);
    const result = await client.generateResult({ systemPrompt: resolvedSystemPrompt, userContent: expanded });

    if (!result) {
      progress.close();
      new Notice("AI returned empty result");
      return;
    }

    // Step 5: Insert result
    progress.updateStatus("Processing response...", 85);

    let block = "\n\n";

    if (settings.debug) {
      const model = settings.llmModel.trim() || "(default)";
      const systemBlock = resolvedSystemPrompt.trim()
        ? "```text\n" + resolvedSystemPrompt + "\n```"
        : "_(empty)_";
      block +=
        `## AI Request (debug)\n\n` +
        `**Provider:** ${settings.llmProvider}\n` +
        `**Model:** ${model}\n\n` +
        `### System prompt\n\n${systemBlock}\n\n` +
        `### User content\n\n\`\`\`text\n${expanded}\n\`\`\`\n\n`;
    }

    const heading = settings.llmResultHeading.trim();
    if (heading) block += `## ${heading}\n\n`;
    block += result + "\n";

    progress.updateStatus("Inserting result...", 95);
    const mode = settings.insertPosition;
    if (mode === "end-of-file") {
      const lastLine = editor.lastLine();
      editor.replaceRange(block, { line: lastLine + 1, ch: 0 });
    } else if (mode === "at-cursor") {
      editor.replaceSelection(block);
    } else {
      const cursor = editor.getCursor("to");
      editor.replaceRange(block, { line: cursor.line + 1, ch: 0 });
    }

    progress.complete();
  } catch (e) {
    console.error(e);
    progress.close();
    new Notice("Error while calling AI, see console");
  }
}

/**
 * "Ask AI" command — sends selected text (or current line) directly to the LLM.
 * Uses the inline system prompt if `llmIncludeInlineSystemPrompt` is enabled,
 * otherwise sends with no system prompt.
 */
export async function insertLlmResultRaw(
  editor: Editor,
  file: TFile | null,
  app: App,
  settings: AiAssistantSettings,
): Promise<void> {
  if (!file) {
    new Notice("No active file");
    return;
  }

  const rawInput = getRawInput(editor);
  if (!rawInput.trim()) {
    new Notice("Nothing to send to AI Agent");
    return;
  }

  const systemPrompt = resolveInlinePrompt(settings);
  await runRequest(editor, file, app, settings, rawInput, systemPrompt);
}

/**
 * "Ask AI with template" command — opens the prompt-file picker, uses the chosen
 * template as the primary system prompt, and optionally prepends the inline prompt
 * when `llmIncludeInlineSystemPrompt` is enabled.
 */
export async function insertLlmResultWithTemplate(
  editor: Editor,
  file: TFile | null,
  app: App,
  settings: AiAssistantSettings,
): Promise<void> {
  if (!file) {
    new Notice("No active file");
    return;
  }

  const rawInput = getRawInput(editor);
  if (!rawInput.trim()) {
    new Notice("Nothing to send to AI Agent");
    return;
  }

  // Open picker before showing progress so the UI isn't obscured
  const picked = await new PromptPickerModal(app, settings).openAndAwait();
  if (picked === "cancelled") {
    new Notice("Cancelled");
    return;
  }

  const inlinePrompt = resolveInlinePrompt(settings);
  const templateContent = picked ? await app.vault.read(picked) : "";
  const systemPrompt = inlinePrompt
    ? `${inlinePrompt}\n\n${templateContent}`
    : templateContent;

  await runRequest(editor, file, app, settings, rawInput, systemPrompt);
}
