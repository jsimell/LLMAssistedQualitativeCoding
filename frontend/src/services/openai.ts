import OpenAI from "openai";
import { APICallQueue } from "./APICallQueue";

let openai: OpenAI | null = null;
let currentSystemPrompt: string | null = null;
let currentConversation: OpenAI.Conversations.Conversation | null = null;
let currentAPIKey: string | null = null;
const apiCallQueue = new APICallQueue();
  const acceptedModels = [
    "gpt-5.1",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
  ];

// Used to prevent multiple simultaneous OpenAI conversation initializations
let initPromise: Promise<OpenAI.Conversations.Conversation> | null = null;

/** Helper for initializing or retrieving OpenAI client
 *
 * @param apiKey User inputted OpenAI API key
 * @returns an openAI client instance
 */
const getOpenAIinstance = (apiKey: string): OpenAI => {
  if (!openai || currentAPIKey !== apiKey) {
    openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    currentAPIKey = apiKey;
    currentConversation = null;
    currentSystemPrompt = null;
  }
  return openai;
}

/**
 * Initializes or retrieves a conversation for a specific context.
 * @param apiKey The OpenAI API key
 * @param systemPrompt The system prompt for this conversation
 */
export const initializeConversation = async (
  apiKey: string,
  systemPrompt: string
) => {
  const openai = getOpenAIinstance(apiKey);

  // If the system prompt has not changed, no need to re-initialize
  if (currentSystemPrompt === systemPrompt && currentConversation) {
    return currentConversation;
  }

  // If an init is already running, wait for it and reuse the result
  if (initPromise) {
    await initPromise;
    return currentConversation;
  }

  // Create exactly once; others will await initPromise above
  initPromise = apiCallQueue.enqueue(() =>
    openai.conversations.create({
      items: [{ type: "message", role: "developer", content: systemPrompt }],
    })
  );

  try {
    const conversation = await initPromise;
    currentConversation = conversation;
    currentSystemPrompt = systemPrompt;
    console.log(`OpenAI conversation initialized. ID: ${conversation.id}`);
    return conversation;
  } finally {
    initPromise = null;
  }
};

/**
 * Calls the OpenAI API with the appropriate conversation context.
 */
export const statefullyCallOpenAI = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model: string = "gpt-4-mini"
): Promise<OpenAI.Responses.Response> => {
  const openai = getOpenAIinstance(apiKey);

  // Ensure conversation is initialized
  await initializeConversation(apiKey, systemPrompt);

  if (!acceptedModels.includes(model)) {
    console.warn(
      `Model "${model}" is not in the list of accepted models. Defaulting to "gpt-4.1-mini".`
    );
    model = "gpt-4.1-mini";
  }

  const response = await apiCallQueue.enqueue(() => {
    if (!currentConversation) {
      throw new Error("OpenAI API call failed: Conversation uninitialized");
    }
    return openai.responses.create({
      conversation: currentConversation.id,
      model: model,
      store: false,
      input: userPrompt,
    });
  });

  console.log(
    "OpenAI stateful call completed. Response content:",
    response.output_text
  );
  return response;
};

/**
 * Calls OpenAI STATELESS (no conversation history) - faster, simpler, no need for initialization or API call queuing.
 * Use for: Quick, independent suggestions where context isn't cumulative.
 *
 * Each call is independent - no history is maintained.
 */
export const callOpenAIStateless = async (
  apiKey: string,
  prompt: string,
  model: string = "gpt-4.1-mini"
): Promise<OpenAI.Responses.Response> => {
  const openai = getOpenAIinstance(apiKey);

  if (!acceptedModels.includes(model)) {
    console.warn(
      `Model "${model}" is not in the list of accepted models. Defaulting to "gpt-4.1-mini".`
    );
    model = "gpt-4.1-mini";
  }

  // Create a single model response (no caching)
  const response = await openai.responses.create({
    model: model,
    store: false,
    input: prompt,
  });

  if (!response) {
    throw new Error("OpenAI stateless call failed: No response received");
  }

  console.log("OpenAI stateless call completed. Response content:", response.output_text);
  return response;
};
