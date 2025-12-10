import { FEEDBACK_PROMPT } from '@/services/Constants';
import { NextResponse } from 'next/server';
import { chatWithLLM } from '@/lib/llm';
import { getModelForTask } from '@/lib/getModel';

export async function POST(req) {
  try {
    const { conversation } = await req.json();

    const FINAL_PROMPT = FEEDBACK_PROMPT.replace(
      '{{conversation}}',
      JSON.stringify(conversation, null, 2)
    );

    const { vendor, model } = getModelForTask('FEEDBACK');

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
      parsedResponse =
        typeof responseText === 'string'
          ? JSON.parse(responseText)
          : responseText;
    } catch (err) {
      console.error('Failed to parse LLM response:', responseText, err);
      throw new Error('Invalid JSON received from AI');
    }

    // Return the parsed object directly (e.g. { feedback: [...] })
    return NextResponse.json(parsedResponse);
  } catch (err) {
    console.error('Router Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
// import { FEEDBACK_PROMPT } from '@/services/Constants';
// import { NextResponse } from 'next/server';
// import { chatWithLLM } from '@/lib/llm';
// import { getModelForTask } from '@/lib/getModel';

// export async function POST(req) {
//   try {
//     const { conversation } = await req.json();

//     // Get vendor + model automatically from .env and constants
//     const { vendor, model } = getModelForTask('FEEDBACK');

//     const FINAL_PROMPT = FEEDBACK_PROMPT.replace(
//       '{{conversation}}',
//       JSON.stringify(conversation, null, 2)
//     );

//     console.log('Vendor:', vendor);
//     console.log('Model:', model);

//     const llmReq = {
//       model,
//       messages: [{ role: 'user', content: FINAL_PROMPT }],
//     };

//     const responseText = await chatWithLLM(vendor, llmReq);

//     let parsed = null;
//     try {
//       parsed = JSON.parse(responseText);
//     } catch {
//       parsed = { raw: responseText };
//     }

//     return NextResponse.json({
//       vendor,
//       model,
//       feedback: parsed,
//     });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }
