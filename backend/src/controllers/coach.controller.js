import { query } from '../config/db.js';

export const getGamificationStats = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as total 
       FROM transactions WHERE user_id = $1 AND type = 'expense' 
       GROUP BY month ORDER BY month DESC LIMIT 12`, [req.user.id]
    );

    // Simple gamification mock mechanism - count how many consecutive months expenses stayed below Rs 50k
    let streak = 0;
    for (const r of result.rows) {
      if (Number(r.total) < 50000) streak++;
      else break;
    }

    res.json({ success: true, data: { currentStreak: streak, badge: streak > 3 ? 'Gold Saver' : 'Starter' } });
  } catch(err) { next(err); }
};

export const getCoachAdvice = async (req, res, next) => {
  try {
    const { message } = req.body;
    
    // In a real app, gather context and inject it. Doing a simple text proxy.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'Gemini Key Not Configured' });

    const systemPrompt = "You are a specialized AI financial coach for the 'Personal Wealth OS' app. Keep answers under 100 words. Be highly pragmatic, encouraging, and expert in personal finance.";
    const userPrompt = `SYSTEM INSTRUCTION: ${systemPrompt}\n\nUSER MESSAGE: ${message || "Analyze my finances and give me one quick tip."}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         contents: [{
           parts: [{ text: userPrompt }]
         }],
         generationConfig: {
           maxOutputTokens: 300
         }
       })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    res.json({ success: true, data: data.candidates[0].content.parts[0].text });
  } catch (err) { next(err); }
};
