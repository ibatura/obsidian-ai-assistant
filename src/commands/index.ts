import type AiAssistantPlugin from "../main";
import { insertLlmResultRaw, insertLlmResultWithTemplate } from "./insertResult";

export function registerCommands(plugin: AiAssistantPlugin): void {
  plugin.addCommand({
    id: "ask-ai",
    name: "Ask AI",
    editorCallback: async (editor, view) => {
      await insertLlmResultRaw(editor, view.file, plugin.app, plugin.settings);
    },
  });

  plugin.addCommand({
    id: "ask-ai-with-template",
    name: "Ask AI with template",
    editorCallback: async (editor, view) => {
      await insertLlmResultWithTemplate(editor, view.file, plugin.app, plugin.settings);
    },
  });
}
