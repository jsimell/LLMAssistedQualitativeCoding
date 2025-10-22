export const validateApiKey = async (openaiApiKey: string): Promise<{ valid: boolean; error?: string }> => {
  if (!openaiApiKey || openaiApiKey.trim().length === 0) {
    return { valid: false, error: "API key is empty" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
      }
    });

  if (response.status === 401) {
        // 401 Unauthorized
        return { valid: false, error: "Invalid API key" };
      }

      if (response.status === 502) {
        // 502 Bad Gateway
        return { valid: false, error: "OpenAI API is temporarily unavailable (Bad Gateway)" }; 
      }

      if (!response.ok) {
        // 429 (Rate Limit), 500, etc.
        const statusText = response.statusText || `Status ${response.status}`;
        return { valid: false, error: `OpenAI API request failed: ${statusText}` };
      }

      // Success → valid key
      return { valid: true };

    } catch (error) {
      console.error("Network or fetch error:", error); // For debugging
      return { valid: false, error: "A network error occurred. Check your internet connection." };
    }
}