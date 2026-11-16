require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Try each model with a 10-second timeout so we don't hang
async function tryModel(model) {
  return new Promise(async (resolve) => {
    const timer = setTimeout(() => resolve({ model, result: 'TIMEOUT' }), 10000);
    try {
      const r = await ai.models.generateContent({ model, contents: 'Reply with just the word Hello.' });
      clearTimeout(timer);
      resolve({ model, result: 'OK', text: r.text.trim().slice(0, 30) });
    } catch(e) {
      clearTimeout(timer);
      let msg = e.message;
      try { msg = JSON.parse(e.message).error.message; } catch {}
      resolve({ model, result: 'FAIL', msg: msg.slice(0, 100) });
    }
  });
}

async function main() {
  const models = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
  ];
  for (const m of models) {
    const r = await tryModel(m);
    if (r.result === 'OK') {
      console.log('WINNER:', r.model, '->', r.text);
    } else {
      console.log(r.result + ':', r.model, r.msg || '');
    }
  }
}
main();
