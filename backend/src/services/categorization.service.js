export const categorizeTransaction = (merchant) => {
  if (!merchant) return 'Other';
  const text = merchant.toLowerCase();

  const rules = {
    'Food': ['zomato', 'swiggy', 'blinkit', 'dominos', 'mcdonalds', 'kfc', 'starbucks', 'cafe', 'swiggy instamart'],
    'Travel': ['ola', 'uber', 'irctc', 'makemytrip', 'indigo', 'flight', 'train', 'metro', 'yatra', 'redbus'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'reliance', 'mart', 'dmart', 'bigbasket', 'blinkit'],
    'Entertainment': ['netflix', 'spotify', 'prime', 'hotstar', 'bookmyshow', 'pvr', 'inox', 'youtube premium'],
    'Health': ['apollo', 'medplus', '1mg', 'pharmacy', 'hospital', 'clinic', 'practo', 'netmeds'],
    'Utilities': ['bescom', 'tata power', 'jio', 'airtel', 'vi', 'bill', 'recharge', 'electricity', 'water', 'gas']
  };

  for (const [category, keywords] of Object.entries(rules)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'Other';
};
