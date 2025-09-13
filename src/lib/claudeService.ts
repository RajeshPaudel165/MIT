import Anthropic from '@anthropic-ai/sdk';
import { dataContextService, UserDataContext } from './dataContextService';

const claudeApiKey = import.meta.env.VITE_CLAUDE_API_KEY;

if (!claudeApiKey) {
  throw new Error('VITE_CLAUDE_API_KEY is not defined in environment variables');
}

const anthropic = new Anthropic({
  apiKey: claudeApiKey,
  // Note: In a production environment, you should handle API calls through your backend
  // to keep your API key secure. For demo purposes, we're using it client-side.
  dangerouslyAllowBrowser: true
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  messages: ChatMessage[];
  isLoading: boolean;
}

export interface PlantIdentificationResult {
  commonName: string;
  scientificName: string;
  family: string;
  genus: string;
  confidence: number;
  characteristics: {
    leafShape?: string;
    leafColor?: string;
    flowerColor?: string;
    plantType?: string;
    size?: string;
  };
  careInstructions: {
    watering: string;
    sunlight: string;
    soilType: string;
    temperature: string;
  };
  description: string;
  nativeRegion?: string;
  growthHabit?: string;
}

export class ClaudeService {
  private static instance: ClaudeService;
  
  private constructor() {}
  
  static getInstance(): ClaudeService {
    if (!ClaudeService.instance) {
      ClaudeService.instance = new ClaudeService();
    }
    return ClaudeService.instance;
  }
  
  /**
   * Convert image file to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Identify plant from image using Claude Vision
   */
  async identifyPlantFromImage(imageFile: File): Promise<PlantIdentificationResult> {
    try {
      const base64Image = await this.fileToBase64(imageFile);
      const mimeType = imageFile.type;

      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022', // Use Haiku model for vision analysis
        max_tokens: 2000,
        system: `You are an expert botanist and plant identification specialist. Analyze plant images with high accuracy and provide detailed plant information.

IMPORTANT: You must respond with ONLY a valid JSON object in this exact format:
{
  "commonName": "String",
  "scientificName": "String", 
  "family": "String",
  "genus": "String",
  "confidence": 0.95,
  "characteristics": {
    "leafShape": "String",
    "leafColor": "String", 
    "flowerColor": "String",
    "plantType": "String",
    "size": "String"
  },
  "careInstructions": {
    "watering": "String",
    "sunlight": "String", 
    "soilType": "String",
    "temperature": "String"
  },
  "description": "String",
  "nativeRegion": "String",
  "growthHabit": "String"
}

Analyze the plant image carefully and provide:
- Accurate plant identification with scientific name
- Confidence level (0.0 to 1.0)
- Detailed characteristics visible in the image
- Comprehensive care instructions
- Descriptive information about the plant
- Native region and growth habits

If you cannot identify the plant with reasonable confidence, set confidence to 0.3 or lower and provide general plant care advice.`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please identify this plant and provide comprehensive information about it in the specified JSON format.'
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: base64Image
                }
              }
            ]
          }
        ]
      });

      if (response.content && response.content.length > 0) {
        const textContent = response.content.find(c => c.type === 'text');
        if (textContent) {
          try {
            // Parse the JSON response
            const identificationResult = JSON.parse(textContent.text);
            return identificationResult as PlantIdentificationResult;
          } catch (parseError) {
            console.error('Error parsing plant identification JSON:', parseError);
            throw new Error('Failed to parse plant identification result');
          }
        }
      }
      
      throw new Error('No response content received from Claude Vision');
    } catch (error) {
      console.error('Error identifying plant from image:', error);
      if (error instanceof Error) {
        throw new Error(`Plant Identification Error: ${error.message}`);
      }
      throw new Error('An unexpected error occurred during plant identification.');
    }
  }

  async sendMessage(
    messages: ChatMessage[], 
    userId?: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      // Get user data context if userId is provided
      let enhancedSystemPrompt = systemPrompt;
      
      if (userId && !systemPrompt) {
        try {
          const userContext = await dataContextService.getUserDataContext(userId);
          const contextData = dataContextService.formatDataContextForClaude(userContext);
          
          enhancedSystemPrompt = `You are a helpful AI assistant for a soil monitoring and plant care application called "Soil Savvy Suite". You have access to the user's real-time soil data and plant information.

${contextData}

IMPORTANT GUIDELINES:
- Use the user's actual soil data and plant information to provide personalized advice
- Reference specific soil readings (pH, moisture, nutrients) when making recommendations
- Mention the user's specific plants by name when relevant
- If soil conditions are critical, prioritize addressing those issues
- Provide actionable, specific advice based on the real data
- If no soil data is available, mention this and provide general guidance
- Keep responses helpful, friendly, and focused on plant care and soil health topics
- Use emojis appropriately to make responses engaging

You can help users with:
- Interpreting their current soil conditions
- Specific care advice for their registered plants
- Troubleshooting plant problems using soil data
- Nutrient management recommendations
- Watering schedule adjustments based on soil moisture
- pH adjustment strategies
- General gardening tips tailored to their situation`;
        } catch (contextError) {
          console.error('Error loading user context:', contextError);
          // Fall back to basic system prompt if context loading fails
          enhancedSystemPrompt = `You are a helpful AI assistant for a soil monitoring and plant care application called "Soil Savvy Suite". You can help users with:
          - Plant care advice and recommendations
          - Soil health analysis and interpretation
          - Gardening tips and best practices
          - Troubleshooting plant problems
          - General plant and soil-related questions
          
          Keep your responses helpful, friendly, and focused on plant care and soil health topics.`;
        }
      }

      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1500, // Increased for more detailed responses with context
        system: enhancedSystemPrompt || `ou are Soil Savvy Suite, a friendly and knowledgeable AI assistant designed to help users monitor soil health and care for their plants. Your goal is to provide clear, practical, and supportive guidance to gardeners of all levels.

You can assist with:

🌱 Plant Care Advice: Personalized recommendations on watering, sunlight, fertilization, pruning, and growth support.

🌍 Soil Health Analysis: Interpreting soil data (pH, nutrients, moisture, etc.) and offering actionable steps to improve soil quality.

🌿 Gardening Tips & Best Practices: Seasonal care tips, sustainable gardening methods, and planting strategies.

🛠️ Troubleshooting Plant Problems: Identifying issues like pests, diseases, or nutrient deficiencies and suggesting solutions.

❓ General Plant & Soil Questions: Answering user queries with accurate, helpful, and easy-to-follow advice.

Tone & Style Guidelines:

Be friendly, encouraging, and approachable—like a knowledgeable gardening buddy.

Provide clear, actionable steps rather than just general theory.

Adapt your advice to the user’s context (indoor/outdoor plants, climate, soil conditions, etc.).

Where helpful, suggest natural, sustainable, or DIY solutions.
        
        Keep your responses helpful, friendly, and focused on plant care and soil health topics.`,
        messages: conversationHistory,
      });

      if (response.content && response.content.length > 0) {
        const textContent = response.content.find(c => c.type === 'text');
        return textContent ? textContent.text : 'I apologize, but I couldn\'t generate a proper response. Please try again.';
      }
      
      return 'I apologize, but I couldn\'t generate a response. Please try again.';
    } catch (error) {
      console.error('Error calling Claude API:', error);
      if (error instanceof Error) {
        throw new Error(`Claude API Error: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while communicating with Claude.');
    }
  }
}

export const claudeService = ClaudeService.getInstance();