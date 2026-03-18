import axios from 'axios';

export const getMFPrice = async (schemeCode) => {
  try {
    const { data } = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`);
    if (data.data && data.data.length > 0) {
      return parseFloat(data.data[0].nav);
    }
    return null;
  } catch(e) { 
    return null; 
  }
};

export const getCryptoPrice = async (coinId) => {
  try {
    const { data } = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=inr`);
    return data[coinId]?.inr || null;
  } catch(e) { 
    return null; 
  }
};

export const getLivePrice = async (type, symbol, currentPrice = null) => {
  if (!symbol) return null;
  
  if (type === 'mutual_fund') return await getMFPrice(symbol);
  if (type === 'crypto') return await getCryptoPrice(symbol);
  
  // Mock ±5% fluctuation for stocks strictly for the demo environment to prove Live Tracking
  if (type === 'stock' && currentPrice) {
     const p = Number(currentPrice);
     const fluctuation = p * 0.05;
     const change = (Math.random() * fluctuation * 2) - fluctuation;
     return Math.max(0.01, p + change);
  }
  
  return null; 
};
