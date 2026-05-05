import { App, PluginSettingTab, Setting } from "obsidian";
import type AiAssistantPlugin from "../main";

export class AiAssistantSettingTab extends PluginSettingTab {
  plugin: AiAssistantPlugin;

  constructor(app: App, plugin: AiAssistantPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private addSectionHeader(name: string, description: string): void {
    new Setting(this.containerEl)
      .setHeading()
      .setName(name)
      .setDesc(description);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── Section A: Provider & Connection ──────────────────────────────────────
    this.addSectionHeader(
      "LLM provider & connection",
      "Choose which AI service to use and how to connect."
    );

    new Setting(containerEl)
      .setName("AI provider")
      .setDesc("Choose which AI backend to use.")
      .addDropdown(drop =>
        drop
          .addOption("copilot", "Copilot")
          .addOption("claude", "Claude")
          .addOption("claude-proxy", "Claude (OpenAI-compatible proxy)")
          .addOption("gemini", "Gemini")
          .addOption("cli", "Local CLI")
          .setValue(this.plugin.settings.llmProvider)
          .onChange(async (value) => {
            this.plugin.settings.llmProvider = value as "copilot" | "claude" | "claude-proxy" | "gemini" | "cli";
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName("Model")
      .setDesc("Provider-specific model ID (leave empty for the provider default).")
      .addText(text =>
        text
          .setPlaceholder("e.g. gpt-4.1-mini, claude-3.7-sonnet")
          .setValue(this.plugin.settings.llmModel)
          .onChange(async (value) => {
            this.plugin.settings.llmModel = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Request timeout")
      .setDesc("Maximum time in milliseconds to wait for a response. Default: 60000 ms (1 minute).")
      .addText(text =>
        text
          .setPlaceholder("60000")
          .setValue(String(this.plugin.settings.timeoutMs))
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed > 0) {
              this.plugin.settings.timeoutMs = parsed;
              await this.plugin.saveSettings();
            }
          })
      );

    // ── Section B: API Credentials ────────────────────────────────────────────
    this.addSectionHeader(
      "API credentials",
      "Enter authentication details for your chosen provider. Stored securely in Obsidian's configuration."
    );

    if (this.plugin.settings.llmProvider === "copilot") {
      new Setting(containerEl)
        .setName("Copilot API base URL")
        .setDesc("Base URL for the Copilot (or Copilot proxy) endpoint.")
        .addText(text =>
          text
            .setPlaceholder("https://api.githubcopilot.com")
            .setValue(this.plugin.settings.copilotApiBaseUrl)
            .onChange(async (value) => {
              this.plugin.settings.copilotApiBaseUrl = value.trim();
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Copilot API key")
        .setDesc("API key / token for Copilot. Required.")
        .addText(text =>
          text
            .setPlaceholder("token...")
            .setValue(this.plugin.settings.copilotApiKey)
            .onChange(async (value) => {
              this.plugin.settings.copilotApiKey = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    if (this.plugin.settings.llmProvider === "claude") {
      new Setting(containerEl)
        .setName("Claude API base URL")
        .setDesc("Base URL for the Anthropic Messages API. Leave empty to use the default.")
        .addText(text =>
          text
            .setPlaceholder("https://api.anthropic.com")
            .setValue(this.plugin.settings.claudeApiBaseUrl)
            .onChange(async (value) => {
              this.plugin.settings.claudeApiBaseUrl = value.trim();
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Claude API key")
        .setDesc("API key for Claude. Required.")
        .addText(text =>
          text
            .setPlaceholder("sk-ant-...")
            .setValue(this.plugin.settings.claudeApiKey)
            .onChange(async (value) => {
              this.plugin.settings.claudeApiKey = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    if (this.plugin.settings.llmProvider === "claude-proxy") {
      new Setting(containerEl)
        .setName("Claude proxy API base URL")
        .setDesc("Base URL of an OpenAI-compatible endpoint that exposes Claude (e.g. OpenRouter, Together, internal gateway).")
        .addText(text =>
          text
            .setPlaceholder("https://openrouter.ai/api")
            .setValue(this.plugin.settings.claudeProxyApiBaseUrl)
            .onChange(async (value) => {
              this.plugin.settings.claudeProxyApiBaseUrl = value.trim();
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Claude proxy API key")
        .setDesc("OpenAI-format API key for the proxy. Sent as Authorization: Bearer <key>.")
        .addText(text =>
          text
            .setPlaceholder("sk-...")
            .setValue(this.plugin.settings.claudeProxyApiKey)
            .onChange(async (value) => {
              this.plugin.settings.claudeProxyApiKey = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    if (this.plugin.settings.llmProvider === "gemini") {
      new Setting(containerEl)
        .setName("Gemini API base URL")
        .setDesc("Base URL for the Gemini API. Leave empty to use the default.")
        .addText(text =>
          text
            .setPlaceholder("https://generativelanguage.googleapis.com")
            .setValue(this.plugin.settings.geminiApiBaseUrl)
            .onChange(async (value) => {
              this.plugin.settings.geminiApiBaseUrl = value.trim();
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Gemini API key")
        .setDesc("API key for Gemini. Required.")
        .addText(text =>
          text
            .setPlaceholder("AI...")
            .setValue(this.plugin.settings.geminiApiKey)
            .onChange(async (value) => {
              this.plugin.settings.geminiApiKey = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    if (this.plugin.settings.llmProvider === "cli") {
      new Setting(containerEl)
        .setName("CLI command")
        .setDesc("Binary name (e.g. claude) or absolute path. The prompt text is piped to stdin.")
        .addText(text =>
          text
            .setPlaceholder("claude")
            .setValue(this.plugin.settings.cliCommand)
            .onChange(async (value) => {
              this.plugin.settings.cliCommand = value.trim();
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("CLI arguments")
        .setDesc("Extra arguments passed to the CLI, space-separated.")
        .addText(text =>
          text
            .setPlaceholder("-p")
            .setValue(this.plugin.settings.cliArgs)
            .onChange(async (value) => {
              this.plugin.settings.cliArgs = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Working directory")
        .setDesc("Leave empty to inherit from Obsidian; override to run in a specific directory.")
        .addText(text =>
          text
            .setPlaceholder("/path/to/cwd (optional)")
            .setValue(this.plugin.settings.cliCwd)
            .onChange(async (value) => {
              this.plugin.settings.cliCwd = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    // ── Section C: System prompt & templates ──────────────────────────────────
    this.addSectionHeader(
      "System prompt & templates",
      "Configure the system prompt sent alongside requests. Use 'Ask AI' to send raw text, or 'Ask AI with template' to pick a prompt file from your vault."
    );

    new Setting(containerEl)
      .setName("System prompt")
      .setDesc(
        "Instruction sent to the AI as the system message when the toggle below is enabled. " +
        "For 'Ask AI with template', this is prepended before the chosen template."
      )
      .addTextArea(text =>
        text
          .setPlaceholder("Describe what the AI should produce...")
          .setValue(this.plugin.settings.llmInlinePrompt)
          .onChange(async (value) => {
            this.plugin.settings.llmInlinePrompt = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Include system prompt")
      .setDesc(
        "When enabled, the system prompt above is sent alongside your document selection. " +
        "When disabled, only your document selection is sent (or just the template for 'Ask AI with template')."
      )
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.llmIncludeInlineSystemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.llmIncludeInlineSystemPrompt = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Prompts templates folder")
      .setDesc("Vault-relative path to the folder containing your prompt template files (used by 'Ask AI with template').")
      .addText(text =>
        text
          .setPlaceholder("Prompts templates/AI")
          .setValue(this.plugin.settings.llmPromptsFolder)
          .onChange(async (value) => {
            this.plugin.settings.llmPromptsFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    // ── Section D: Vault note names in context ────────────────────────────────
    this.addSectionHeader(
      "Vault note names in context",
      "Enrich the AI context with a list of existing note names so the AI can reference them as [[wiki-links]]."
    );

    new Setting(containerEl)
      .setName("Include vault note names in LLM context")
      .setDesc("When enabled, all vault note names (minus exclusions) are appended to the prompt so the AI can create [[Note Name]] links.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.includeVaultNoteNames)
          .onChange(async (value) => {
            this.plugin.settings.includeVaultNoteNames = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.includeVaultNoteNames) {
      new Setting(containerEl)
        .setName("Excluded name patterns")
        .setDesc(
          "Notes whose name or vault path matches any pattern are excluded. " +
          "Supports *, **, and ?. Case-insensitive. " +
          "Patterns without / match the note basename; patterns with / match the vault-relative path."
        );

      const exclusions = this.plugin.settings.vaultNoteNamesExclusions;
      exclusions.forEach((pattern, idx) => {
        new Setting(containerEl)
          .addText(text =>
            text
              .setPlaceholder("Untitled*")
              .setValue(pattern)
              .onChange(async (value) => {
                this.plugin.settings.vaultNoteNamesExclusions[idx] = value;
                await this.plugin.saveSettings();
              })
          )
          .addButton(btn =>
            btn
              .setIcon("trash")
              .setTooltip("Remove pattern")
              .onClick(async () => {
                this.plugin.settings.vaultNoteNamesExclusions.splice(idx, 1);
                await this.plugin.saveSettings();
                this.display();
              })
          );
      });

      new Setting(containerEl)
        .addButton(btn =>
          btn
            .setButtonText("+ Add pattern")
            .onClick(async () => {
              this.plugin.settings.vaultNoteNamesExclusions.push("");
              await this.plugin.saveSettings();
              this.display();
            })
        );
    }

    // ── Section E: Result Insertion ───────────────────────────────────────────
    this.addSectionHeader(
      "Where to insert results",
      "Configure how and where AI responses appear in your document."
    );

    new Setting(containerEl)
      .setName("Result heading")
      .setDesc("Markdown heading inserted above the AI result (e.g. AI Result). Leave empty for no heading.")
      .addText(text =>
        text
          .setPlaceholder("AI Result")
          .setValue(this.plugin.settings.llmResultHeading)
          .onChange(async (value) => {
            this.plugin.settings.llmResultHeading = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Insert position")
      .setDesc("Where to place the AI result in the note.")
      .addDropdown(drop =>
        drop
          .addOption("after-selection", "After selection (or cursor line)")
          .addOption("at-cursor", "At cursor (replaces selection)")
          .addOption("end-of-file", "At end of file")
          .setValue(this.plugin.settings.insertPosition)
          .onChange(async (value) => {
            this.plugin.settings.insertPosition = value as "after-selection" | "at-cursor" | "end-of-file";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Debug")
      .setDesc("When enabled, insert the full request sent to the AI before the AI result.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.debug)
          .onChange(async (value) => {
            this.plugin.settings.debug = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
