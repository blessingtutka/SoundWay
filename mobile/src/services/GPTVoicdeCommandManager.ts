import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface AppFunctionInfo {
  name: string;
  description: string;
  examples: string[];
  parameters?: { name: string; type: string; description?: string }[];
}

export interface VoiceCommand {
  intent: string;
  action: string;
  parameters: Record<string, any>;
  response: string;
  executeCommand: boolean;
}

class VoiceCommandManagerGPT {
  static client: OpenAI;
  static conversationContext: ChatCompletionMessageParam[] = [];

  static init(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  static async processCommand(text: string, availableFunctions: AppFunctionInfo[] = [], appContext: Record<string, any> = {}): Promise<VoiceCommand> {
    try {
      this.conversationContext.push({ role: 'user', content: text });

      const systemPrompt = this.createSystemPrompt(availableFunctions, appContext);

      const messages: ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }, ...this.conversationContext.slice(-4)];

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4.1', // Pro-level model
        messages,
        temperature: 0.3,
        max_tokens: 500,
      });

      const responseText = completion.choices[0].message?.content || '';
      const command = this.parseStructuredResponse(responseText);

      this.conversationContext.push({ role: 'assistant', content: responseText });

      return command;
    } catch (error) {
      console.error('NLP Processing error:', error);
      return this.createFallbackResponse(text);
    }
  }

  private static createSystemPrompt(availableFunctions: AppFunctionInfo[], appContext: Record<string, any>): string {
    const functionsDescription = availableFunctions
      .map((fn) => {
        const paramString = fn.parameters ? fn.parameters.map((p) => `- ${p.name} (${p.type}): ${p.description || ''}`).join('\n') : 'None';
        return `
Function: ${fn.name}
Description: ${fn.description}
Parameters:
${paramString}
Examples: ${fn.examples.join(', ')}
`;
      })
      .join('\n\n');

    return `You are a voice assistant for a mobile app. Your ONLY job is to analyze the user's voice command and produce a valid JSON object.

CRITICAL RULES:
- RESPOND WITH ONLY RAW JSON
- NO markdown, NO code blocks, NO explanations
- The JSON MUST BE VALID and parseable

AVAILABLE APP FUNCTIONS:
${functionsDescription || 'No functions available'}

SYSTEM FUNCTIONS:
- start_session: Start voice session
- end_session: End voice session

RESPONSE FORMAT:
{
  "intent": "navigation | action | information | settings | system | conversation",
  "action": "function_name_or_system_action",
  "parameters": { "key": "value" },
  "response": "short reply to user (1 sentence)",
  "executeCommand": true/false
}

PARAMETER RULES:
- Use exact parameter names
- Use correct types (string, number, boolean, object)
- Omit unknown parameters or set them to null

INTENT RULES:
- Greetings → intent: "conversation", executeCommand: false
- "stop", "quit", "end", "close session" → action: "end_session"
- "start", "begin", "open session" → action: "start_session"

Analyze the user's message and output ONLY the JSON result.`;
  }

  private static parseStructuredResponse(responseText: string): VoiceCommand {
    try {
      const cleanedText = responseText.replace(/```json\s*|```\s*/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : cleanedText;

      const parsed = JSON.parse(jsonString);

      return {
        intent: parsed.intent || 'conversation',
        action: parsed.action || 'respond',
        parameters: parsed.parameters || {},
        response: parsed.response || `I heard: "${cleanedText.substring(0, 50)}". How can I help?`,
        executeCommand: parsed.executeCommand !== undefined ? parsed.executeCommand : false,
      };
    } catch (error) {
      console.error('Failed to parse JSON response:', error, 'Response:', responseText);
      return this.createFallbackResponse(responseText);
    }
  }

  private static createFallbackResponse(text: string): VoiceCommand {
    const shortText = text.length > 50 ? text.substring(0, 50) + '...' : text;
    return {
      intent: 'conversation',
      action: 'respond',
      parameters: {},
      response: `I heard: "${shortText}". How can I assist you?`,
      executeCommand: false,
    };
  }

  static clearContext() {
    this.conversationContext = [];
  }
}

export default VoiceCommandManagerGPT;
