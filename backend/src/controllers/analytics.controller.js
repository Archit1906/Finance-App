import { query } from '../config/db.js';

export const getSummary = async (req, res, next) => {
  try {
    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    const result = await query(
      `SELECT type, SUM(amount) as total FROM transactions 
       WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2 GROUP BY type`,
      [req.user.id, currentMonth]
    );

    let income = 0;
    let expense = 0;

    result.rows.forEach(r => {
      if (r.type === 'income') income = Number(r.total);
      if (r.type === 'expense') expense = Number(r.total);
    });

    const savings = income - expense;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;

    res.json({ success: true, data: { income, expense, savings, savingsRate, month: currentMonth } });
  } catch (err) {
    next(err);
  }
};

export const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { month } = req.query; 
    const targetMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    const result = await query(
      `SELECT category, SUM(amount) as total FROM transactions 
       WHERE user_id = $1 AND type = 'expense' AND TO_CHAR(date, 'YYYY-MM') = $2 
       GROUP BY category ORDER BY total DESC`,
      [req.user.id, targetMonth]
    );

    res.json({ success: true, data: result.rows.map(r => ({ category: r.category, total: Number(r.total) })) });
  } catch(err) { 
    next(err); 
  }
};

export const getTrend = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT TO_CHAR(date, 'YYYY-MM') as month, type, SUM(amount) as total 
       FROM transactions WHERE user_id = $1 AND date >= current_date - interval '6 months'
       GROUP BY month, type ORDER BY month ASC`,
      [req.user.id]
    );

    const trends = {};
    result.rows.forEach(r => {
      if (!trends[r.month]) trends[r.month] = { income: 0, expense: 0 };
      trends[r.month][r.type] = Number(r.total);
    });

    const formattedData = Object.keys(trends).map(month => ({
      month,
      income: trends[month].income,
      expense: trends[month].expense
    }));

    res.json({ success: true, data: formattedData });
  } catch (err) {
    next(err);
  }
};

export const getTopMerchants = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT merchant, SUM(amount) as total FROM transactions 
       WHERE user_id = $1 AND type = 'expense' AND merchant IS NOT NULL AND merchant != ''
       GROUP BY merchant ORDER BY total DESC LIMIT 5`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows.map(r => ({ merchant: r.merchant, total: Number(r.total) })) });
  } catch(err) {
    next(err);
  }
};
