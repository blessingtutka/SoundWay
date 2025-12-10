import { GoogleGenerativeAI } from '@google/generative-ai';

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

class VoiceCommandManager {
  static genAI: GoogleGenerativeAI;
  static model: any;
  static conversationContext: any[] = [];

  static init(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',

      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.3,
      },
    });
  }

  static async processCommand(text: string, availableFunctions: AppFunctionInfo[] = [], appContext: Record<string, any> = {}): Promise<VoiceCommand> {
    try {
      this.conversationContext.push({
        role: 'user',
        parts: [{ text }],
      });

      const systemPrompt = this.createSystemPrompt(availableFunctions, appContext);

      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
          ...this.conversationContext.slice(-4),
        ],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.3,
        },
      });

      const result = await chat.sendMessage(text);
      const response = await result.response;
      const responseText = response.text();

      const command = this.parseStructuredResponse(responseText);

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
- RESPOND WITH **ONLY RAW JSON**
- NO markdown
- NO code blocks
- NO explanations
- NO text before or after the JSON
- The JSON MUST BE VALID and parseable.

------------------------------------------------
AVAILABLE APP FUNCTIONS (IMPORTANT)
Each function includes:
- name
- description
- parameters (with names & types)
- examples of how users speak the command

${functionsDescription || 'No functions available'}

------------------------------------------------
SYSTEM FUNCTIONS:
- start_session: Start voice session
- end_session: End voice session

------------------------------------------------
RESPONSE FORMAT (REQUIRED FIELDS):
{
  "intent": "navigation | action | information | settings | system | conversation",
  "action": "function_name_or_system_action",
  "parameters": { "key": "value" },
  "response": "short reply to user (1 sentence)",
  "executeCommand": true/false
}

------------------------------------------------
PARAMETER RULES (CRUCIAL):
1. If the selected function has parameters, extract them from the user's input.
2. Use **exact parameter names** exactly as provided in the function list.
3. Follow the parameter types:
   - string → names, labels, free text
   - number → convert spoken numbers to numeric values
   - boolean → yes/no, on/off
   - object/other → infer structure from user command
4. If a parameter cannot be extracted, either:
   - set to null, OR
   - omit it entirely
   (Do NOT invent random parameter names.)

------------------------------------------------
INTENT RULES:
- Greetings → intent: "conversation", executeCommand: false
- "stop", "quit", "end", "close session" → action: "end_session"
- "start", "begin", "open session" → action: "start_session"

------------------------------------------------
EXAMPLES:
User: "hello"
→ {"intent":"conversation","action":"greet","parameters":{},"response":"Hello! How can I help?","executeCommand":false}

User: "go to the profile screen"
→ {"intent":"navigation","action":"navigate_to_screen","parameters":{"screen":"profile"},"response":"Opening the profile screen.","executeCommand":true}

User: "stop the session"
→ {"intent":"system","action":"end_session","parameters":{},"response":"Ending voice session.","executeCommand":true}

User: "start session"
→ {"intent":"system","action":"start_session","parameters":{},"response":"Starting voice session.","executeCommand":true}

------------------------------------------------
Now analyze the user's message and output ONLY the JSON result.`;
  }

  private static parseStructuredResponse(responseText: string): VoiceCommand {
    try {
      // Clean the response text
      const cleanedText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      // Try to find JSON in the response
      let jsonString = cleanedText;
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonString);

      // Validate required fields with defaults
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

export default VoiceCommandManager;
