import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface ChatResponse {
  content: string;
  sources: string[];
}

export class OpenAIService {
  static async generateResponse(
    query: string, 
    context: Array<{ chunk: string; source: string; chunkIndex: number }>,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<ChatResponse> {
    try {
      if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_ENV_VAR) {
        throw new Error("OpenAI API key not configured");
      }

      const contextText = context.map((ctx, index) => 
        `[Source ${index + 1}: ${ctx.source}]\n${ctx.chunk}`
      ).join('\n\n');

      const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided document context. 
      
Guidelines:
- Always base your answers on the provided context
- If the context doesn't contain relevant information, say so clearly
- Provide specific, detailed answers when possible
- Include relevant quotes from the documents when appropriate
- Be concise but comprehensive
- If asked about something not in the context, explain that you can only answer based on the provided documents

Context from documents:
${contextText}`;

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-6), // Keep last 6 messages for context
        { role: "user", content: query }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content || "I couldn't generate a response.";
      const sources = context.map(ctx => ctx.source);

      return {
        content,
        sources: [...new Set(sources)] // Remove duplicates
      };
    } catch (error) {
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }
}
