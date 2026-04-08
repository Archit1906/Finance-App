import fs from 'fs';
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBZfh85qPtEKIhjdgpC5siQ-3gRNelwK0A';

const systemPrompt = "You are a specialized AI financial coach for the 'Personal Wealth OS' app. Keep answers under 100 words. Be highly pragmatic, encouraging, and expert in personal finance.";

async function run() {
  const userPrompt = `SYSTEM INSTRUCTION: ${systemPrompt}\n\nUSER MESSAGE: How do I save on 80C taxes?`;
  console.log("sending prompt...");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 300 }
      })
    });
    const data = await response.json();
    fs.writeFileSync('myoutput8.json', JSON.stringify(data, null, 2), 'utf-8');
  } catch(e) {
    console.error(e);
  }
}
run();
