const REFRESH_INTERVAL_MS = 60_000;

const elements = {
  query: document.querySelector('#query'),
  refreshBtn: document.querySelector('#refreshBtn'),
  score: document.querySelector('#score'),
  source: document.querySelector('#source'),
  positive: document.querySelector('#positive'),
  neutral: document.querySelector('#neutral'),
  negative: document.querySelector('#negative'),
  total: document.querySelector('#total'),
  updatedAt: document.querySelector('#updatedAt'),
  regime: document.querySelector('#regime'),
  tweets: document.querySelector('#tweets')
};

function marketRegime(score) {
  if (score >= 20) return '风险偏好（Risk-On）';
  if (score <= -20) return '风险厌恶（Risk-Off）';
  return '中性震荡（Neutral）';
}

function renderTweets(samples) {
  elements.tweets.innerHTML = '';
  if (!samples.length) {
    elements.tweets.innerHTML = '<p>暂无推文数据</p>';
    return;
  }

  for (const tweet of samples) {
    const node = document.createElement('article');
    node.className = 'tweet';
    node.innerHTML = `
      <small>${new Date(tweet.created_at).toLocaleString()} · ${tweet.sentiment}</small>
      <div>${tweet.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    `;
    elements.tweets.appendChild(node);
  }
}

async function refresh() {
  const query = encodeURIComponent(elements.query.value.trim());
  const response = await fetch(`/api/twitter-sentiment?query=${query}`);
  if (!response.ok) {
    throw new Error(`刷新失败 (${response.status})`);
  }

  const data = await response.json();
  const score = Number(data.score || 0);

  elements.score.textContent = score.toFixed(2);
  elements.score.classList.remove('positive', 'negative');
  if (score > 0) elements.score.classList.add('positive');
  if (score < 0) elements.score.classList.add('negative');

  elements.source.textContent = `数据源: ${data.source}`;
  elements.positive.textContent = data.counts?.positive ?? 0;
  elements.neutral.textContent = data.counts?.neutral ?? 0;
  elements.negative.textContent = data.counts?.negative ?? 0;
  elements.total.textContent = data.total ?? 0;
  elements.updatedAt.textContent = new Date(data.generated_at).toLocaleString();
  elements.regime.textContent = marketRegime(score);

  renderTweets(data.samples || []);
}

async function safeRefresh() {
  elements.refreshBtn.disabled = true;
  elements.refreshBtn.textContent = '刷新中...';
  try {
    await refresh();
  } catch (error) {
    elements.regime.textContent = error.message;
  } finally {
    elements.refreshBtn.disabled = false;
    elements.refreshBtn.textContent = '立即刷新';
  }
}

elements.refreshBtn.addEventListener('click', safeRefresh);
safeRefresh();
setInterval(safeRefresh, REFRESH_INTERVAL_MS);
