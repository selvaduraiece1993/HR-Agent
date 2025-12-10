// Simple local tester for /api/ai-model
// Usage: `node scripts/test_ai_model.js`

const url = 'http://localhost:3000/api/ai-model';

const body = {
  job_position: 'Frontend Engineer',
  job_description: 'Experience building React UIs with performance in mind',
  duration: '15',
  type: 'Technical',
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
    console.error('Error calling ai-model:', e);
  }
}

run();
