import { AiAssistantSettings } from "../settings";

const DEFAULT_INLINE_PROMPT = "You are an expert assistant. Generate the requested result in Markdown.";

export function resolveInlinePrompt(settings: AiAssistantSettings): string {
  if (settings.llmIncludeInlineSystemPrompt === false) return "";
  return settings.llmInlinePrompt || DEFAULT_INLINE_PROMPT;
}
