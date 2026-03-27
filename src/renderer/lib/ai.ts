import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

import type { Project } from "../../shared/types";

export const createLanguageModel = (project: Project) => {
  switch (project.llmProvider) {
    case "anthropic":
      return createAnthropic({ apiKey: project.llmApiKey })(project.llmModel);
    case "openai":
    default:
      return createOpenAI({ apiKey: project.llmApiKey })(project.llmModel);
  }
};
