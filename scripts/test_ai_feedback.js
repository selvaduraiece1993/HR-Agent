// Simple local tester for /api/ai-feedback
// Usage: `node scripts/test_ai_feedback.js`

const url = 'http://localhost:3000/api/ai-feedback';

const body = {
  conversation: [
    { role: 'user', content: 'Tell me about your last project.' },
    { role: 'assistant', content: 'I built a React app for X.' },
  ],
};

async function run() {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error calling ai-feedback:', e);
  }
}

run();
