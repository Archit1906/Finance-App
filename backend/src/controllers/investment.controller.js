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

    res.json({ 
      success: true, 
      data: { 
        holdings, 
        summary: { 
          totalInvested, 
          currentValue, 
          totalPnl: currentValue - totalInvested,
          pnlPercent: totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0
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
    const result = await query("SELECT id, asset_type, symbol FROM investments WHERE user_id = $1 AND symbol IS NOT NULL AND asset_type IN ('mutual_fund', 'crypto')", [req.user.id]);
    let updatedCount = 0;
    
    for (const inv of result.rows) {
      const live = await getLivePrice(inv.asset_type, inv.symbol);
      if (live) {
        await query(
          "UPDATE investments SET current_price = $1, current_value = quantity * $1, last_updated = NOW() WHERE id = $2",
          [live, inv.id]
        );
        updatedCount++;
      }
    }

    res.json({ success: true, message: `Successfully refreshed ${updatedCount} investments` });
  } catch (err) { next(err); }
};
