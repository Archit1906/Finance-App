import { query } from '../config/db.js';
import { categorizeTransaction } from '../services/categorization.service.js';

export const getTransactions = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate } = req.query;
    let sql = 'SELECT * FROM transactions WHERE user_id = $1';
    const params = [req.user.id];
    let paramCount = 1;

    if (type) {
      paramCount++;
      sql += ` AND type = $${paramCount}`;
      params.push(type);
    }
    if (category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      params.push(category);
    }
    if (startDate) {
      paramCount++;
      sql += ` AND date >= $${paramCount}`;
      params.push(startDate);
    }
    if (endDate) {
      paramCount++;
      sql += ` AND date <= $${paramCount}`;
      params.push(endDate);
    }

    sql += ' ORDER BY date DESC, created_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

export const createTransaction = async (req, res, next) => {
  try {
    let { amount, type, category, merchant, date, notes } = req.body;
    
    if (!category && type === 'expense') {
      category = categorizeTransaction(merchant);
    } else if (!category) {
      category = 'Other';
    }

    const result = await query(
      `INSERT INTO transactions (user_id, amount, type, category, merchant, date, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, amount, type, category, merchant, date, notes]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const setClause = [];
    const params = [id, req.user.id];
    let paramCount = 2;

    for (const [key, value] of Object.entries(updates)) {
      paramCount++;
      setClause.push(`${key} = $${paramCount}`);
      params.push(value);
    }

    const sql = `UPDATE transactions SET ${setClause.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`;
    
    const result = await query(sql, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found or unauthorized' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found or unauthorized' });
    }

    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    next(err);
  }
};
