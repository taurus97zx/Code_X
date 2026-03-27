# 股市情绪追踪网页监控面板

一个轻量级网页监控面板，用于追踪股市情绪，并接入 Twitter（X）最近推文数据。

## 功能

- 按关键词获取 Twitter 最近推文
- 基于词典规则计算看多 / 中性 / 看空分布
- 输出一个 `-100 ~ +100` 的情绪指数
- 每 60 秒自动刷新，可手动刷新
- 无 Token 时自动使用 mock 数据，便于本地调试

## 快速启动

```bash
cp .env.example .env
# 编辑 .env，填入 TWITTER_BEARER_TOKEN
npm start
```

打开：`http://localhost:3000`

## API

`GET /api/twitter-sentiment?query=<twitter search query>`

返回字段：

- `source`: `twitter-v2` 或 `mock`
- `score`: 情绪指数
- `counts`: 情绪计数
- `samples`: 推文样本

## 注意

Twitter API v2 需要有效的开发者权限与 Bearer Token。
