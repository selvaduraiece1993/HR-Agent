import { QUESTIONS_PROMPT } from '@/services/Constants';
import { NextResponse } from 'next/server';
import { chatWithLLM } from '@/lib/llm';
import { getModelForTask } from '@/lib/getModel';

export async function POST(req) {
  try {
    const { job_position, job_description, duration, type } = await req.json();

    const FINAL_PROMPT = QUESTIONS_PROMPT.replace(
      '{{job_position}}',
      job_position
    )
      .replace('{{job_description}}', job_description)
      .replace('{{duration}}', duration)
      .replace('{{type}}', type);

    const { vendor, model } = getModelForTask('QUESTION_GENERATION');

    const llmRequest = {
      model,
      messages: [
        {
          role: 'user',
          content: FINAL_PROMPT,
        },
      ],
      // If using OpenAI, ensure your response_format schema is passed here in chatWithLLM logic
    };

    const responseText = await chatWithLLM(vendor, llmRequest);

    // --- FIX: Parse the JSON string from the LLM here ---
    let parsedResponse;
    try {
      // If chatWithLLM returns a string, parse it.
      // If it uses the .parse() helper and returns an object, use it directly.
      parsedResponse =
        typeof responseText === 'string'
          ? JSON.parse(responseText)
          : responseText;
    } catch (err) {
      console.error('Failed to parse LLM response:', responseText, err);
      throw new Error('Invalid JSON received from AI');
    }

    // Return the parsed object directly (e.g. { interviewQuestions: [...] })
    return NextResponse.json(parsedResponse);
  } catch (err) {
    console.error('Router Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
