// lib/llm.js
import OpenAI, { AzureOpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

import {
  AZURE_MODELS,
  OPENROUTER_MODELS,
  ANTHROPIC_MODELS,
  GOOGLE_MODELS,
} from '@/services/Constants';

/**
 * Automatically returns a default model based on provider + task.
 */
export function getDefaultModel(provider, task) {
  switch (provider) {
    case 'azure':
      return AZURE_MODELS[task];

    case 'openrouter':
      return OPENROUTER_MODELS[task];

    case 'anthropic':
      return ANTHROPIC_MODELS[task];

    case 'gemini':
      return GOOGLE_MODELS[task];

    default:
      return OPENROUTER_MODELS[task]; // fallback
  }
}

export async function chatWithLLM(vendor, req) {
  // Task type is required for default model selection
  const task = req.task || 'QUESTION_GENERATION';

  // Auto-select model if not provided
  const modelToUse = req.model || getDefaultModel(vendor, task);

  if (!modelToUse) {
    throw new Error(
      `No model found for vendor "${vendor}" and task "${task}". Check your .env and constants.js.`
    );
  }

  switch (vendor) {
    case 'azure': {
      const client = new AzureOpenAI({
        azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
      });

      const completion = await client.chat.completions.create({
        model: modelToUse,
        messages: req.messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'interview_questions_response',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                interviewQuestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      question: {
                        type: 'string',
                        description: 'The interview question text',
                      },
                      type: {
                        type: 'string',
                        description:
                          'The category of the question (e.g., behavioral, technical)',
                      },
                    },
                    // In strict mode, all properties must be required
                    required: ['question', 'type'],
                    additionalProperties: false,
                  },
                },
              },
              // In strict mode, top-level additionalProperties must be false
              required: ['interviewQuestions'],
              additionalProperties: false,
            },
          },
        },
      });

      const jsonText = completion.choices[0].message.content;

      // Parsing logic
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse JSON:', e, jsonText);
        throw e;
      }

      return parsed;
    }

    case 'openai': {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await client.chat.completions.create({
        model: modelToUse,
        messages: req.messages,
      });

      return completion?.choices?.[0]?.message?.content ?? '';
    }

    case 'openrouter': {
      const client = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      });

      const completion = await client.chat.completions.create({
        model: modelToUse,
        messages: req.messages,
      });

      return completion?.choices?.[0]?.message?.content ?? '';
    }

    case 'anthropic': {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const userText = req.messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join('\n');

      const msg = await anthropic.messages.create({
        model: modelToUse,
        max_tokens: 2048,
        messages: [
          { role: 'user', content: [{ type: 'text', text: userText }] },
        ],
      });

      const first = Array.isArray(msg?.content)
        ? msg.content.find((c) => c.type === 'text')
        : null;

      return first?.text ?? '';
    }

    case 'gemini': {
      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
      const userText = req.messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join('\n');

      // Call generateContent with the right model and content
      const result = await ai.models.generateContent({
        model: modelToUse,
        contents: userText,
      });
      return result.text;
    }

    default:
      throw new Error(`Unsupported vendor: ${vendor}`);
  }
}
