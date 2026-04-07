import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const apiKey = process.env.GEMINI_API_KEY;

async function check() {
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro', 'gemini-1.0-pro'];
  for (const m of models) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({contents: [{parts: [{text: 'hello'}]}]})
    });
    const j = await r.json();
    console.log(`Model ${m}:`, j.error ? j.error.message : !!j.candidates);
  }
}
check();
