import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiFallback = (env) => ({
  name: 'api-fallback',
  configureServer(server) {
    server.middlewares.use('/api/chat', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body);
            const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured in .env' }));
              return;
            }

            const systemContext = `You are "Ask Darshan" — a professional AI assistant representing Darshan Patil.
The chatbot must ONLY answer questions related to Darshan's portfolio.
If the user asks ANYTHING outside:
Respond EXACTLY with: "This question is not related to my portfolio."

Darshan Patil:
- AI & Data Science student (Pune)
- Data Analyst at Linkcode Technologies

Projects:
- Kisandhan: QR-based milk collection & payment system for farmers
- TaxBot: AI chatbot for tax-related queries using LLM
- Rentiverse: Agentic AI rental platform (AIR 21 / 19,000+ teams)
- Credit Card Fraud Detection: ML model handling imbalanced datasets
- Recommendation System: NLP + collaborative filtering

Skills: Python, SQL, Machine Learning, Power BI, APIs, LangChain
Achievements: AIR 21 Odoo Hackathon, 1st Prize ICRTAIDS, Vice President AISA
Response Rules: Answer in 3-5 sentences, be concise, professional, no hallucinations.`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: systemContext + "\n\nUser Question: " + parsed.message }] }]
              })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Error from Gemini API');

            const reply = data.candidates[0]?.content?.parts[0]?.text || "Sorry, I couldn't generate a response.";
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ reply }));
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });
      }
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      apiFallback(env),
    ],
  };
});
