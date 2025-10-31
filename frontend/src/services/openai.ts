import OpenAI from "openai";

// Store multiple conversations by key
const conversations = new Map<string, {
  conversation: OpenAI.Responses.Response.Conversation;
  systemPrompt: string;
}>();

let openai: OpenAI | null = null;

/**
 * Initializes or retrieves a conversation for a specific context.
 * @param apiKey The OpenAI API key
 * @param systemPrompt The system prompt for this conversation
 * @param conversationKey Unique key to identify this conversation (e.g., "full-coding", "passage-coding")
 */
const initializeConversation = async (
  apiKey: string, 
  systemPrompt: string,
  conversationKey: string = "default"
) => {
  // Initialize OpenAI client if needed
  if (!openai) {
    openai = new OpenAI({apiKey: apiKey, dangerouslyAllowBrowser: true});
  }

  // Check if conversation exists and system prompt matches
  const existing = conversations.get(conversationKey);
  if (existing && existing.systemPrompt === systemPrompt) {
    return existing.conversation;
  }

  // Remove possible existing conversation that has an outdated system prompt
  if (existing) {
    conversations.delete(conversationKey);
  }

  // Create new conversation
  const conversation = await openai.conversations.create({
    items: [
      { type: "message", role: "developer", content: systemPrompt }
    ],
  });

  if (!conversation) {
    throw new Error('OpenAI initialization failed: No response received');
  }

  conversations.set(conversationKey, { conversation, systemPrompt });
  console.log(`OpenAI conversation initialized for key: ${conversationKey}, id: ${conversation.id}`);
  
  return conversation;
};

/**
 * Calls the OpenAI API with the appropriate conversation context.
 */
export const statefullyCallOpenAI = async (
  apiKey: string, 
  systemPrompt: string, 
  userPrompt: string,
  conversationKey: string = "default",
  model: string = "gpt-4-mini"
): Promise<OpenAI.Responses.Response> => {
  const conversation = await initializeConversation(apiKey, systemPrompt, conversationKey);

  if (!openai) {
    throw new Error('OpenAI API call failed: OpenAI instance not initialized');
  }

  const acceptedModels = ["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini"];
  if (!acceptedModels.includes(model)) {
    console.warn(`Model "${model}" is not in the list of accepted models. Defaulting to "gpt-4.1-mini".`);
    model = "gpt-4.1-mini";
  }

  const response = await openai.responses.create({
    conversation: conversation.id,
    model: model,
    input: userPrompt,
  });

  return response;
};

/**
 * Calls OpenAI STATELESS (no conversation history) - faster, simpler.
 * Use for: Quick, independent suggestions where context isn't cumulative.
 * 
 * Each call is independent - no history is maintained.
 */
export const callOpenAIStateless = async (
  apiKey: string,
  prompt: string,
  model: string = "gpt-4o-mini"
): Promise<OpenAI.Responses.Response> => {
  // Initialize OpenAI client if needed
  if (!openai) {
    openai = new OpenAI({apiKey: apiKey, dangerouslyAllowBrowser: true});
  }

  const acceptedModels = ["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4o-mini"];
  if (!acceptedModels.includes(model)) {
    console.warn(`Model "${model}" is not in the list of accepted models. Defaulting to "gpt-4o-mini".`);
    model = "gpt-4o-mini";
  }

  // Create a single model response (no caching)
  const response = await openai.responses.create({
    model: model,
    input: prompt,
  });

  if (!response) {
    throw new Error('OpenAI stateless call failed: No response received');
  }

  return response;
};