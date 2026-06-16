// /api/quote.js - Alpha Vantage Backend
// Handles market cap data and top gainers/losers for US stock market

const https = require('https');

const ALPHA_VANTAGE_KEY = process.env.ALPHAVANTAGE_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

// Cache to avoid excessive API calls
let cache = {
  global: null,
  movers: null,
  globalTime: 0,
  moversTime: 0,
  CACHE_TTL: 60000 // 1 minute cache
};

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', reject);
  });
}

// Get top gainers and losers from entire US market
async function getTopMovers() {
  const now = Date.now();
  
  // Return cached data if fresh
  if (cache.movers && (now - cache.moversTime) < cache.CACHE_TTL) {
    return cache.movers;
  }

  try {
    const url = `${BASE_URL}?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await makeRequest(url);

    if (!response.top_gainers || !response.top_losers) {
      return { gainers: [], losers: [] };
    }

    // Extract top 5 gainers and losers
    const gainers = response.top_gainers.slice(0, 5).map(stock => ({
      ticker: stock.ticker,
      price: parseFloat(stock.price),
      change_amount: parseFloat(stock.change_amount),
      change_percent: parseFloat(stock.change_percent)
    }));

    const losers = response.top_losers.slice(0, 5).map(stock => ({
      ticker: stock.ticker,
      price: parseFloat(stock.price),
      change_amount: parseFloat(stock.change_amount),
      change_percent: parseFloat(stock.change_percent)
    }));

    cache.movers = { gainers, losers };
    cache.moversTime = now;

    return { gainers, losers };
  } catch (error) {
    console.error('Error fetching movers:', error);
    return { gainers: [], losers: [] };
  }
}

// Get global market data (total market cap, sentiment, etc)
async function getGlobalMarketData() {
  const now = Date.now();
  
  // Return cached data if fresh
  if (cache.global && (now - cache.globalTime) < cache.CACHE_TTL) {
    return cache.global;
  }

  try {
    const url = `${BASE_URL}?function=GLOBAL&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await makeRequest(url);

    if (!response.data) {
      return null;
    }

    const data = response.data;
    const globalData = {
      us_market_cap: data['39. US Market Cap (Trillions)'] || '0',
      market_status: data['40. Market Status'] || 'unknown'
    };

    cache.global = globalData;
    cache.globalTime = now;

    return globalData;
  } catch (error) {
    console.error('Error fetching global market data:', error);
    return null;
  }
}

// Main handler
exports.handler = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { endpoint } = req.query;

    if (endpoint === 'movers') {
      // Get top gainers and losers
      const movers = await getTopMovers();
      res.status(200).json(movers);
    } else if (endpoint === 'global') {
      // Get global market data (total market cap)
      const global = await getGlobalMarketData();
      res.status(200).json(global || { error: 'Unable to fetch market data' });
    } else {
      res.status(400).json({ error: 'Invalid endpoint. Use ?endpoint=movers or ?endpoint=global' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
