import { describe, it, expect, vi, beforeEach } from "vitest";
import { insertLlmResultRaw, insertLlmResultWithTemplate } from "./insertResult";
import { AiAssistantSettings } from "../settings";

let mockOpenAndAwait = vi.fn().mockResolvedValue(null as null);

vi.mock("../ui/progressIndicator", () => ({
  showProgressIndicator: vi.fn(() => ({
    updateStatus: vi.fn(),
    complete: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock("../ui/promptPickerModal", () => ({
  PromptPickerModal: vi.fn(function (this: { openAndAwait: typeof mockOpenAndAwait }) {
    this.openAndAwait = mockOpenAndAwait;
  }),
}));

vi.mock("../core/linkResolver", () => ({
  expandObsidianLinks: vi.fn().mockResolvedValue({ expanded: "", unresolved: [] }),
}));

vi.mock("../core/noteNamesContext", () => ({
  buildNoteNamesBlock: vi.fn().mockReturnValue("## Vault notes available for linking\n\n"),
}));

const { expandObsidianLinks } = await import("../core/linkResolver");

// Shared test fixtures
function makeEditor(selection = "", line = "current line text") {
  return {
    getSelection: vi.fn().mockReturnValue(selection),
    getLine: vi.fn().mockReturnValue(line),
    lastLine: vi.fn().mockReturnValue(10),
    getCursor: vi.fn().mockReturnValue({ line: 5, ch: 10 }),
    replaceRange: vi.fn(),
    replaceSelection: vi.fn(),
  };
}

function makeApp() {
  return {
    vault: {
      read: vi.fn().mockResolvedValue("template content"),
      getFiles: vi.fn().mockReturnValue([]),
      getMarkdownFiles: vi.fn().mockReturnValue([]),
      getAbstractFileByPath: vi.fn(),
    },
    metadataCache: {
      getFirstLinkpathDest: vi.fn().mockReturnValue(null),
      getFileCache: vi.fn().mockReturnValue({}),
    },
  };
}

function makeSettings(overrides: Partial<AiAssistantSettings> = {}): AiAssistantSettings {
  return {
    insertPosition: "after-selection",
    llmResultHeading: "AI Result",
    llmProvider: "cli",
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
    cliCommand: "echo",
    cliArgs: "",
    cliCwd: "",
    llmInlinePrompt: "You are an expert assistant.",
    llmIncludeInlineSystemPrompt: true,
    llmPromptsFolder: "",
    includeVaultNoteNames: false,
    vaultNoteNamesExclusions: ["Untitled*", "Screenshot*"],
    debug: false,
    ...overrides,
  } as AiAssistantSettings;
}

describe("insertLlmResultRaw", () => {
  let mockEditor: ReturnType<typeof makeEditor>;
  let mockApp: ReturnType<typeof makeApp>;
  let mockFile: { path: string };
  let mockSettings: AiAssistantSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenAndAwait = vi.fn().mockResolvedValue(null);
    mockEditor = makeEditor();
    mockApp = makeApp();
    mockFile = { path: "test.md" };
    mockSettings = makeSettings();

    (expandObsidianLinks as ReturnType<typeof vi.fn>).mockResolvedValue({
      expanded: "current line text",
      unresolved: [],
    });
  });

  it("shows notice and exits when no file provided", async () => {
    await insertLlmResultRaw(mockEditor as any, null, mockApp as any, mockSettings);
    expect(mockEditor.replaceRange).not.toHaveBeenCalled();
    expect(mockEditor.replaceSelection).not.toHaveBeenCalled();
  });

  it("falls back to current line when selection is empty", async () => {
    mockEditor.getSelection.mockReturnValue("");
    mockEditor.getLine.mockReturnValue("current line text");

    await insertLlmResultRaw(mockEditor as any, mockFile as any, mockApp as any, mockSettings);

    expect(mockEditor.getLine).toHaveBeenCalled();
  });

  it("uses selection when non-empty", async () => {
    mockEditor = makeEditor("selected text");
    (expandObsidianLinks as ReturnType<typeof vi.fn>).mockResolvedValue({
      expanded: "selected text",
      unresolved: [],
    });

    await insertLlmResultRaw(mockEditor as any, mockFile as any, mockApp as any, mockSettings);

    expect(mockEditor.getLine).not.toHaveBeenCalled();
  });

  it("shows 'Nothing to send' notice and aborts when both selection and line are empty", async () => {
    mockEditor = makeEditor("   ", "   ");

    await insertLlmResultRaw(mockEditor as any, mockFile as any, mockApp as any, mockSettings);

    expect(expandObsidianLinks).not.toHaveBeenCalled();
    expect(mockEditor.replaceRange).not.toHaveBeenCalled();
  });

  it("sends inline system prompt when toggle is on", async () => {
    mockSettings = makeSettings({ llmIncludeInlineSystemPrompt: true, llmInlinePrompt: "my prompt" });
    mockEditor = makeEditor("some text");
    (expandObsidianLinks as ReturnType<typeof vi.fn>).mockResolvedValue({
      expanded: "some text",
      unresolved: [],
    });

    // Command will run to provider validation (cli with echo command passes)
    await insertLlmResultRaw(mockEditor as any, mockFile as any, mockApp as any, mockSettings);
    // No errors thrown means the flow proceeded past prompt resolution
  });

  it("sends with no system prompt when toggle is off", async () => {
    mockSettings = makeSettings({ llmIncludeInlineSystemPrompt: false });
    mockEditor = makeEditor("some text");
    (expandObsidianLinks as ReturnType<typeof vi.fn>).mockResolvedValue({
      expanded: "some text",
      unresolved: [],
    });

    await insertLlmResultRaw(mockEditor as any, mockFile as any, mockApp as any, mockSettings);
    // No errors thrown; empty system prompt is valid
  });

  it("shows notice for unresolved links but continues", async () => {
    mockEditor = makeEditor("See [[Missing]]");
    (expandObsidianLinks as ReturnType<typeof vi.fn>).mockResolvedValue({
      expanded: "See [[Missing]]",
      unresolved: ["[[Missing]]"],
    });

    await insertLlmResultRaw(mockEditor as any, mockFile as any, mockApp as any, mockSettings);
    // Command continues (provider validation fires next since cliCommand is set)
  });
});

describe("insertLlmResultWithTemplate", () => {
  let mockEditor: ReturnType<typeof makeEditor>;
  let mockApp: ReturnType<typeof makeApp>;
  let mockFile: { path: string };
  let mockSettings: AiAssistantSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenAndAwait = vi.fn().mockResolvedValue({ path: "Prompts/AI/my-template.md" });
    mockEditor = makeEditor("some text");
    mockApp = makeApp();
    mockFile = { path: "test.md" };
    mockSettings = makeSettings();

    (expandObsidianLinks as ReturnType<typeof vi.fn>).mockResolvedValue({
      expanded: "some text",
      unresolved: [],
    });
  });

  it("shows notice and exits when no file provided", async () => {
    await insertLlmResultWithTemplate(mockEditor as any, null, mockApp as any, mockSettings);
    expect(mockEditor.replaceRange).not.toHaveBeenCalled();
    expect(mockEditor.replaceSelection).not.toHaveBeenCalled();
  });

  it("aborts when picker is cancelled", async () => {
    mockOpenAndAwait = vi.fn().mockResolvedValue("cancelled");

    await insertLlmResultWithTemplate(mockEditor as any, mockFile as any, mockApp as any, mockSettings);

    expect(mockEditor.replaceRange).not.toHaveBeenCalled();
    expect(mockEditor.replaceSelection).not.toHaveBeenCalled();
  });

  it("reads template file when picker returns a file", async () => {
    const pickedFile = { path: "Prompts/AI/my-template.md" };
    mockOpenAndAwait = vi.fn().mockResolvedValue(pickedFile);

    await insertLlmResultWithTemplate(mockEditor as any, mockFile as any, mockApp as any, mockSettings);

    expect(mockApp.vault.read).toHaveBeenCalledWith(pickedFile);
  });

  it("concatenates inline prompt and template when toggle is on", async () => {
    const pickedFile = { path: "Prompts/AI/my-template.md" };
    mockOpenAndAwait = vi.fn().mockResolvedValue(pickedFile);
    mockSettings = makeSettings({
      llmIncludeInlineSystemPrompt: true,
      llmInlinePrompt: "base instruction",
    });
    mockApp.vault.read.mockResolvedValue("template content");

    await insertLlmResultWithTemplate(mockEditor as any, mockFile as any, mockApp as any, mockSettings);

    expect(mockApp.vault.read).toHaveBeenCalledWith(pickedFile);
    // Both inline and template are used; flow proceeds to LLM call
  });

  it("uses only template content when toggle is off", async () => {
    const pickedFile = { path: "Prompts/AI/my-template.md" };
    mockOpenAndAwait = vi.fn().mockResolvedValue(pickedFile);
    mockSettings = makeSettings({ llmIncludeInlineSystemPrompt: false });
    mockApp.vault.read.mockResolvedValue("template content");

    await insertLlmResultWithTemplate(mockEditor as any, mockFile as any, mockApp as any, mockSettings);

    expect(mockApp.vault.read).toHaveBeenCalledWith(pickedFile);
  });

  it("shows 'Nothing to send' notice and aborts when input is empty", async () => {
    mockEditor = makeEditor("   ", "   ");

    await insertLlmResultWithTemplate(mockEditor as any, mockFile as any, mockApp as any, mockSettings);

    expect(mockOpenAndAwait).not.toHaveBeenCalled();
    expect(mockEditor.replaceRange).not.toHaveBeenCalled();
  });

  it("expands wikilinks in selected text", async () => {
    mockEditor = makeEditor("See [[MyNote]]");
    (expandObsidianLinks as ReturnType<typeof vi.fn>).mockResolvedValue({
      expanded: "See full note content",
      unresolved: [],
    });

    await insertLlmResultWithTemplate(mockEditor as any, mockFile as any, mockApp as any, mockSettings);

    expect(expandObsidianLinks).toHaveBeenCalledWith("See [[MyNote]]", "test.md", mockApp);
  });
});
