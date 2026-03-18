import { query } from '../config/db.js';

export const getBudgets = async (req, res, next) => {
  try {
    const { month } = req.query; // e.g. '2025-03'
    if (!month) return res.status(400).json({ success: false, error: 'Month parameter required in YYYY-MM format' });

    const result = await query('SELECT * FROM budgets WHERE user_id = $1 AND month = $2', [req.user.id, month]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

export const setBudget = async (req, res, next) => {
  try {
    const { category, monthly_limit, month } = req.body;
    
    // Check if budget already exists for that month and category
    const existing = await query('SELECT id FROM budgets WHERE user_id = $1 AND category = $2 AND month = $3', [req.user.id, category, month]);

    let result;
    if (existing.rows.length > 0) {
      result = await query(
        'UPDATE budgets SET monthly_limit = $1 WHERE id = $2 RETURNING *',
        [monthly_limit, existing.rows[0].id]
      );
    } else {
      result = await query(
        'INSERT INTO budgets (user_id, category, monthly_limit, month) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.id, category, monthly_limit, month]
      );
    }

    res.status(existing.rows.length > 0 ? 200 : 201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const getBudgetAlerts = async (req, res, next) => {
  try {
    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Get all budgets for current month
    const budgetsResp = await query('SELECT * FROM budgets WHERE user_id = $1 AND month = $2', [req.user.id, currentMonth]);
    const budgets = budgetsResp.rows;

    if (budgets.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get all expenses for current month grouped by category
    const expensesResp = await query(
      `SELECT category, SUM(amount) as total_spent 
       FROM transactions 
       WHERE user_id = $1 AND type = 'expense' AND TO_CHAR(date, 'YYYY-MM') = $2
       GROUP BY category`,
      [req.user.id, currentMonth]
    );

    const expenseMap = {};
    expensesResp.rows.forEach(r => expenseMap[r.category] = Number(r.total_spent));

    const alerts = [];
    budgets.forEach(b => {
      const spent = expenseMap[b.category] || 0;
      const limit = Number(b.monthly_limit);
      const percentage = (spent / limit) * 100;

      if (percentage >= 100) {
        alerts.push({ category: b.category, status: 'exceeded', percentage, spent, limit });
      } else if (percentage >= 80) {
        alerts.push({ category: b.category, status: 'warning', percentage, spent, limit });
      }
    });

    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
};
