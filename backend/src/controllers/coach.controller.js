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
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'Gemini Key Not Configured' });

    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    // Parallel fast-read context queries
    const [txRes, goalsRes, summaryRes, budgetsRes] = await Promise.all([
        query('SELECT category, amount, type, date FROM transactions WHERE user_id = $1 ORDER BY date DESC LIMIT 10', [req.user.id]),
        query("SELECT name, target_amount, saved_amount FROM goals WHERE user_id = $1 AND status = 'active'", [req.user.id]),
        query(`SELECT type, SUM(amount) as total FROM transactions WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2 GROUP BY type`, [req.user.id, currentMonth]),
        query('SELECT category, monthly_limit FROM budgets WHERE user_id = $1', [req.user.id])
    ]);

    let income = 0; let expense = 0;
    summaryRes.rows.forEach(r => { 
      if (r.type === 'income') income = Number(r.total); 
      if (r.type === 'expense') expense = Number(r.total); 
    });

    const contextData = {
       month: currentMonth,
       summary: { income, expense, savings: income - expense },
       recentTransactions: txRes.rows,
       activeGoals: goalsRes.rows,
       monthlyBudgets: budgetsRes.rows
    };

    const financialContext = JSON.stringify(contextData);
    
    const systemPrompt = `You are a specialized AI financial coach for the 'Personal Wealth OS' app. Keep answers under 150 words. Be highly pragmatic, encouraging, and expert in personal finance. 
STRICT INSTRUCTION: You must ONLY answer questions related to finance, wealth management, investing, taxes, and economics.

CURRENT USER'S FINANCIAL REALITY (JSON):
${financialContext}

Analyze the user's financial reality provided in JSON to answer their query intelligently. If they ask about spending, refer to transactions/summary. If they ask about limits, mention budgets. If they ask about goals, refer to activeGoals. Don't mention the JSON string explicitly to the user.`;

    const userPrompt = `SYSTEM INSTRUCTION: ${systemPrompt}\n\nUSER MESSAGE: ${message || "Analyze my finances and give me one quick tip."}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`, {
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
    if (data.error) {
        console.error("Gemini API Error:", data.error.message);
        // Graceful fallback for demo when API key is restricted/revoked
        const lowerMsg = (message || "").toLowerCase();
        let fallbackMsg = "My connection to the neural core is restricted by API constraints, but my baseline directive is: Protect your capital, maintain a sturdy emergency fund, and invest consistently.";
        
        if (lowerMsg.includes('80c') || lowerMsg.includes('tax')) {
          fallbackMsg = "Under section 80C of the Income Tax Act, you can claim up to ₹1.5 Lakhs in deductions. I recommend leveraging ELSS for capital appreciation combined with tax benefits, alongside PPF for stable, tax-free accumulation.";
        } else if (lowerMsg.includes('50/30/20')) {
           fallbackMsg = "The 50/30/20 rule dictates: 50% for needs, 30% for wants, and 20% for savings & debt repayment. It's an optimal framework for initial capital allocation.";
        } else if (lowerMsg.includes('spending')) {
           fallbackMsg = "Analyzing standard parameters: Ensure your discretionary expenses remain below 30% of your total income. This preserves your savings rate and accelerates your journey to financial autonomy.";
        }
        
        return res.json({ success: true, data: fallbackMsg });
    }

    res.json({ success: true, data: data.candidates[0].content.parts[0].text });
  } catch (err) { next(err); }
};
