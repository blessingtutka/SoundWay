import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AppFunctionInfo {
  name: string;
  description: string;
  examples: string[];
}

class VoiceCommandManager {
  static genAI: GoogleGenerativeAI;
  static model: any;
  static conversationContext: any[] = [];

  static init(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-pro',
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.3,
      },
    });
  }

  static async processCommand(
    text: string,
    availableFunctions: AppFunctionInfo[] = [],
    appContext: Record<string, any> = {},
  ) {
    try {
      // Add to conversation context
      this.conversationContext.push({
        role: 'user',
        parts: [{ text }],
      });

      // Create system prompt with available functions
      const systemPrompt = this.createSystemPrompt(
        availableFunctions,
        appContext,
      );

      const result = await this.model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...this.conversationContext,
        ],
      });

      const response = await result.response;
      const responseText = response.text();

      // Parse the structured response
      const command = this.parseStructuredResponse(responseText);

      // Add AI response to context
      this.conversationContext.push({
        role: 'model',
        parts: [{ text: responseText }],
      });

      return command;
    } catch (error) {
      console.error('NLP Processing error:', error);
      return this.createFallbackResponse(text);
    }
  }

  private static createSystemPrompt(
    availableFunctions: AppFunctionInfo[],
    appContext: Record<string, any>,
  ): string {
    const functionsDescription = availableFunctions
      .map(
        func =>
          `- ${func.name}: ${func.description} (Examples: ${func.examples.join(', ')})`,
      )
      .join('\n');

    return `You are a voice assistant for a mobile app. Analyze the voice command and return a JSON response.

Available App Functions:
${functionsDescription}

Current App Context:
${JSON.stringify(appContext, null, 2)}

Response Format (JSON only):
{
  "intent": "navigation|action|information|settings|system|conversation",
  "action": "function_name_or_system_action",
  "parameters": {"key": "value"},
  "response": "spoken_response_to_user",
  "executeCommand": true/false
}

Guidelines:
- Use available functions when possible
- Be concise and clear in responses
- Extract parameters from user command
- For unknown functions, set executeCommand: false
- Handle natural language variations`;
  }

  private static parseStructuredResponse(responseText: string): any {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
    }

    return this.createFallbackResponse(responseText);
  }

  private static createFallbackResponse(text: string) {
    return {
      intent: 'conversation',
      action: 'respond',
      parameters: {},
      response: `I heard: "${text}". How can I help you with that?`,
      executeCommand: false,
    };
  }

  static clearContext() {
    this.conversationContext = [];
  }
}

export default VoiceCommandManager;
