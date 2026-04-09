const apiKey = process.env.GEMINI_API_KEY;
const userPrompt = "Hello";

async function run() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         contents: [{
           parts: [{ text: userPrompt }]
         }],
         generationConfig: {
           maxOutputTokens: 2048
         }
       })
    });
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}
run();
