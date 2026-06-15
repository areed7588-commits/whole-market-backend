// Save this as: /api/quote.js in your Vercel project

const FINNHUB_KEY = 'd8o6oj9r01qrbffjrnrgd8o6oj9r01qrbffjrns0';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get ticker from query parameter
  const { ticker } = req.query;

  if (!ticker) {
    return res.status(400).json({ error: 'ticker parameter required' });
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Finnhub API error' });
    }

    const data = await response.json();

    // Return only the fields we need
    return res.status(200).json({
      price: data.c,
      dollarChange: data.d,
      pctChange: data.dp
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
