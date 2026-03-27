const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const DEFAULT_QUERY = process.env.DEFAULT_QUERY || '(stock market OR $SPY OR $QQQ) lang:en -is:retweet';

const POSITIVE_WORDS = [
  'bullish', 'breakout', 'rally', 'surge', 'buy', 'green', 'uptrend', 'strong', 'gain', 'moon', 'beat'
];
const NEGATIVE_WORDS = [
  'bearish', 'sell', 'crash', 'dump', 'red', 'downtrend', 'weak', 'loss', 'panic', 'miss', 'recession'
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function getSentimentFromText(text = '') {
  const lower = text.toLowerCase();
  let score = 0;
  for (const word of POSITIVE_WORDS) {
    if (lower.includes(word)) score += 1;
  }
  for (const word of NEGATIVE_WORDS) {
    if (lower.includes(word)) score -= 1;
  }
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function summarizeTweets(tweets = []) {
  const buckets = { positive: 0, neutral: 0, negative: 0 };
  const enriched = tweets.map((tweet) => {
    const sentiment = getSentimentFromText(tweet.text);
    buckets[sentiment] += 1;
    return {
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      author_id: tweet.author_id,
      sentiment
    };
  });

  const total = enriched.length || 1;
  const score = Number((((buckets.positive - buckets.negative) / total) * 100).toFixed(2));

  return {
    score,
    counts: buckets,
    total: enriched.length,
    samples: enriched.slice(0, 15)
  };
}

async function fetchTwitterSentiment(query) {
  if (!TWITTER_BEARER_TOKEN) {
    return {
      source: 'mock',
      query,
      generated_at: new Date().toISOString(),
      ...summarizeTweets([
        { id: '1', text: 'Market looks bullish with a strong rally in tech today', created_at: new Date().toISOString() },
        { id: '2', text: 'Seeing weak momentum and possible crash signals in growth stocks', created_at: new Date().toISOString() },
        { id: '3', text: 'Mixed session so far, waiting for the Fed comments', created_at: new Date().toISOString() }
      ])
    };
  }

  const endpoint = new URL('https://api.twitter.com/2/tweets/search/recent');
  endpoint.searchParams.set('query', query);
  endpoint.searchParams.set('max_results', '50');
  endpoint.searchParams.set('tweet.fields', 'created_at,author_id,lang');

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Twitter API error ${response.status}: ${body}`);
  }

  const payload = await response.json();
  const tweets = (payload.data || []).filter((tweet) => tweet.lang === 'en');

  return {
    source: 'twitter-v2',
    query,
    generated_at: new Date().toISOString(),
    ...summarizeTweets(tweets)
  };
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  const incomingPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(incomingPath).replace(/^\.+/, '');
  const filePath = path.join(__dirname, 'public', safePath);

  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 404, { error: 'Not Found' });
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (parsedUrl.pathname === '/api/twitter-sentiment') {
    try {
      const query = parsedUrl.searchParams.get('query') || DEFAULT_QUERY;
      const data = await fetchTwitterSentiment(query);
      sendJson(res, 200, data);
    } catch (error) {
      sendJson(res, 500, {
        error: 'Unable to fetch sentiment data',
        detail: error.message
      });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Dashboard running on http://localhost:${PORT}`);
});
