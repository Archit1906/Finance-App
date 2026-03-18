import { query } from '../config/db.js';
import { getLivePrice } from '../services/pricing.service.js';

export const getInvestments = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    
    let totalInvested = 0; 
    let currentValue = 0;
    
    const holdings = result.rows.map(inv => {
      const q = Number(inv.quantity);
      const bp = Number(inv.buy_price);
      const cp = Number(inv.current_price) || bp;
      
      const invested = bp * q;
      const liveCurrent = Number(inv.current_value) || (q * cp);
      
      totalInvested += invested;
      currentValue += liveCurrent;
      
      const pnl = liveCurrent - invested;
      const pnl_percent = invested > 0 ? (pnl / invested) * 100 : 0;
      
      return {
        ...inv,
        amount_invested: invested,
        live_value: liveCurrent,
        pnl,
        pnl_percent
      };
    });

    let maxLastUpdated = null;
    if (result.rows.length > 0) {
      const dates = result.rows.map(r => new Date(r.last_updated).getTime()).filter(x => !isNaN(x));
      if (dates.length > 0) maxLastUpdated = new Date(Math.max(...dates)).toISOString();
    }

    res.json({ 
      success: true, 
      data: { 
        holdings, 
        summary: { 
          totalInvested, 
          currentValue, 
          totalPnl: currentValue - totalInvested,
          pnlPercent: totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0,
          lastUpdated: maxLastUpdated
        } 
      } 
    });
  } catch (err) { next(err); }
};

export const addInvestment = async (req, res, next) => {
  try {
    const { asset_type, symbol, name, quantity, buy_price, buy_date, notes } = req.body;
    
    let current_price = buy_price;
    if(symbol) {
       const live = await getLivePrice(asset_type, symbol);
       if (live) current_price = live;
    }

    const current_value = Number(quantity) * Number(current_price);

    const result = await query(
      `INSERT INTO investments (user_id, asset_type, symbol, name, quantity, buy_price, buy_date, current_price, current_value, notes, last_updated) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
      [req.user.id, asset_type, symbol, name, quantity, buy_price, buy_date, current_price, current_value, notes]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

export const refreshPrices = async (req, res, next) => {
  try {
    const latestQuery = await query("SELECT MAX(last_updated) as latest FROM investments WHERE user_id = $1", [req.user.id]);
    if (latestQuery.rows[0].latest) {
      const msDiff = new Date() - new Date(latestQuery.rows[0].latest);
      const minsDiff = Math.floor(msDiff / 60000);
      if (minsDiff < 15) {
         return res.json({ success: true, message: `Prices are up to date (next refresh in ${15 - minsDiff} min)`, cached: true });
      }
    }

    const result = await query("SELECT id, asset_type, symbol, current_price FROM investments WHERE user_id = $1 AND symbol IS NOT NULL AND asset_type IN ('stock', 'mutual_fund', 'crypto')", [req.user.id]);
    let updatedCount = 0;
    
    for (const inv of result.rows) {
      const live = await getLivePrice(inv.asset_type, inv.symbol, inv.current_price);
      if (live) {
        await query(
          "UPDATE investments SET current_price = $1, current_value = quantity * $1, last_updated = NOW() WHERE id = $2",
          [live, inv.id]
        );
        updatedCount++;
      }
    }

    await query("UPDATE investments SET last_updated = NOW() WHERE user_id = $1", [req.user.id]);

    res.json({ success: true, message: `Successfully refreshed ${updatedCount} investments`, cached: false });
  } catch (err) { next(err); }
};

export const updateInvestment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { asset_type, symbol, name, quantity, buy_price, buy_date, notes } = req.body;
    const result = await query(
      `UPDATE investments 
       SET asset_type = $1, symbol = $2, name = $3, quantity = $4, buy_price = $5, buy_date = $6, notes = $7, current_value = current_price * $4
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [asset_type, symbol, name, quantity, buy_price, buy_date, notes, id, req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

export const deleteInvestment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM investments WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};
