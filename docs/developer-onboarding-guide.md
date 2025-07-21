# 第三方开发者接入指南

## 📋 概述

欢迎使用智能股票数据系统！本指南将帮助第三方开发者快速接入我们的API服务，获得高质量的股票数据。我们提供完整的认证体系、丰富的数据源和强大的查询能力。

### 🚀 为什么选择我们的API？

- **多数据源聚合** - 整合LongPort、iTick等主流数据提供商
- **智能数据映射** - 统一的数据格式，无需适配多套API
- **三层认证体系** - JWT + API Key + 频率限制，安全可靠
- **毫秒级响应** - 基于Redis的高性能缓存系统
- **37个标准字段** - 预设字段映射，数据格式标准化
- **实时数据** - 支持港股、美股、A股实时行情

---

## 🛣️ 接入流程

### 第一步：注册开发者账户

#### 1.1 在线注册
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "email": "developer@company.com",
    "password": "SecurePassword123!",
    "role": "developer"
  }'
```

#### 1.2 邮箱验证
注册成功后，您将收到验证邮件，点击链接激活账户。

#### 1.3 账户类型说明
- **开发者** - 可创建和管理个人API Key，适合个人开发者和小团队
- **企业用户** - 需要联系我们的商务团队，提供更高的配额和技术支持

### 第二步：创建API Key

#### 2.1 登录获取JWT Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "SecurePassword123!"
  }'
```

**响应示例：**
```json
{
  "statusCode": 200,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "def50200...",
    "user": {
      "id": "668a1234567890abcdef1234",
      "username": "your_username",
      "email": "developer@company.com",
      "role": "developer"
    }
  }
}
```

#### 2.2 创建API Key
```bash
curl -X POST http://localhost:3000/api/v1/auth/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "我的第一个API Key",
    "description": "用于获取美股和港股数据",
    "permissions": [
      "data:read",
      "query:execute",
      "providers:read"
    ],
    "rateLimit": {
      "requests": 1000,
      "window": "1h"
    }
  }'
```

**响应示例（保存好这些凭据！）：**
```json
{
  "statusCode": 201,
  "message": "API Key创建成功",
  "data": {
    "appKey": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "accessToken": "a1b2c3d4e5f678901234567890abcdef",
    "name": "我的第一个API Key",
    "permissions": ["data:read", "query:execute", "providers:read"],
    "rateLimit": {
      "requests": 1000,
      "window": "1h"
    }
  }
}
```

### 第三步：测试API访问

#### 3.1 验证API Key
```bash
curl -X POST http://localhost:3000/api/v1/receiver/data \
  -H "Content-Type: application/json" \
  -H "X-App-Key: 85df7049-0dc9-42c9-847a-d49d75a9298d" \
  -H "X-Access-Token: 4b7abf5789ed487ea54c5d1cd4e56b9d" \
  -d '{
    "symbols": ["AAPL.US"],
    "dataType": "stock-quote"
  }'
```

#### 3.2 成功响应示例
```json
{
  "statusCode": 200,
  "message": "数据获取成功",
  "data": {
    "results": [
      {
        "symbol": "AAPL.US",
        "lastPrice": 150.25,
        "change": 2.15,
        "changePercent": 1.45,
        "volume": 45678901,
        "timestamp": "2025-07-01T15:30:00.000Z"
      }
    ],
    "metadata": {
      "provider": "longport",
      "timestamp": "2025-07-01T15:30:05.123Z",
      "cached": false
    }
  }
}
```

---

## 📚 权限系统指南

### 权限类型说明

| 权限 | 说明 | 适用场景 |
|------|------|----------|
| `data:read` | 读取股票数据 | 获取实时行情、历史数据 |
| `query:execute` | 执行查询 | 使用高级查询功能 |
| `query:stats` | 查看查询统计 | 监控查询性能 |
| `providers:read` | 查看数据源信息 | 了解数据源能力 |
| `symbols:read` | 读取符号映射 | 查看符号转换规则 |
| `system:health` | 系统健康检查 | 监控系统状态 |

### 推荐权限配置

#### 基础开发者（个人项目）
```json
{
  "permissions": [
    "data:read",
    "providers:read",
    "system:health"
  ],
  "rateLimit": {
    "requests": 1000,
    "window": "1h"
  }
}
```

#### 专业开发者（商业应用）
```json
{
  "permissions": [
    "data:read",
    "query:execute",
    "query:stats",
    "providers:read",
    "symbols:read"
  ],
  "rateLimit": {
    "requests": 10000,
    "window": "1h"
  }
}
```

#### 企业用户（大规模应用）
```json
{
  "permissions": [
    "data:read",
    "query:execute",
    "query:stats",
    "providers:read",
    "symbols:read",
    "system:health",
    "system:metrics"
  ],
  "rateLimit": {
    "requests": 100000,
    "window": "1h"
  }
}
```

---

## 🔧 集成示例

### Web应用集成

#### React + TypeScript
```typescript
// api/stockClient.ts
interface StockClient {
  appKey: string;
  accessToken: string;
  baseURL: string;
}

class StockDataAPI {
  private client: StockClient;

  constructor(appKey: string, accessToken: string) {
    this.client = {
      appKey,
      accessToken,
      baseURL: 'https://localhost:3000'
    };
  }

  // 获取股票行情
  async getQuote(symbols: string[]): Promise<StockQuote[]> {
    const response = await fetch(`${this.client.baseURL}/api/v1/receiver/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': this.client.appKey,
        'X-Access-Token': this.client.accessToken,
      },
      body: JSON.stringify({
        symbols,
        dataType: 'stock-quote'
      })
    });

    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status}`);
    }

    const result = await response.json();
    return result.data.results;
  }

  // 获取基本信息
  async getBasicInfo(symbols: string[]): Promise<StockBasicInfo[]> {
    const response = await fetch(`${this.client.baseURL}/api/v1/receiver/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': this.client.appKey,
        'X-Access-Token': this.client.accessToken,
      },
      body: JSON.stringify({
        symbols,
        dataType: 'stock-basic-info'
      })
    });

    const result = await response.json();
    return result.data.results;
  }
}

// 使用示例
const api = new StockDataAPI(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'a1b2c3d4e5f678901234567890abcdef'
);

// React组件中使用
function StockPrice({ symbol }: { symbol: string }) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      setLoading(true);
      try {
        const quotes = await api.getQuote([symbol]);
        setQuote(quotes[0]);
      } catch (error) {
        console.error('获取股价失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
    
    // 每30秒刷新一次
    const interval = setInterval(fetchQuote, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) return <div>加载中...</div>;
  if (!quote) return <div>暂无数据</div>;

  return (
    <div className="stock-price">
      <h3>{quote.symbol}</h3>
      <p className="price">${quote.lastPrice}</p>
      <p className={quote.change >= 0 ? 'positive' : 'negative'}>
        {quote.change >= 0 ? '+' : ''}{quote.change} ({quote.changePercent}%)
      </p>
    </div>
  );
}
```

### 移动应用集成

#### React Native
```javascript
// services/StockAPI.js
class StockAPI {
  constructor(appKey, accessToken) {
    this.appKey = appKey;
    this.accessToken = accessToken;
    this.baseURL = 'https://localhost:3000';
  }

  async request(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Key': this.appKey,
          'X-Access-Token': this.accessToken,
        },
        body: JSON.stringify(data)
      });

      // 检查频率限制
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const resetTime = response.headers.get('X-RateLimit-Reset');
      
      if (response.status === 429) {
        throw new Error(`请求过于频繁，请在 ${new Date(resetTime * 1000).toLocaleTimeString()} 后重试`);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '请求失败');
      }

      return await response.json();
    } catch (error) {
      console.error('API请求错误:', error);
      throw error;
    }
  }

  async getStockQuote(symbols) {
    const result = await this.request('/api/v1/receiver/data', {
      symbols,
      dataType: 'stock-quote'
    });
    return result.data.results;
  }
}

// React Native组件
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';

const stockAPI = new StockAPI(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'a1b2c3d4e5f678901234567890abcdef'
);

function WatchList({ watchlist }) {
  const [quotes, setQuotes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuotes = async () => {
    try {
      const data = await stockAPI.getStockQuote(watchlist);
      setQuotes(data);
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQuotes();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, [watchlist]);

  const renderItem = ({ item }) => (
    <View style={styles.quoteItem}>
      <Text style={styles.symbol}>{item.symbol}</Text>
      <Text style={styles.price}>${item.lastPrice}</Text>
      <Text style={[
        styles.change,
        { color: item.change >= 0 ? 'green' : 'red' }
      ]}>
        {item.change >= 0 ? '+' : ''}{item.change} ({item.changePercent}%)
      </Text>
    </View>
  );

  return (
    <FlatList
      data={quotes}
      renderItem={renderItem}
      keyExtractor={(item) => item.symbol}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
}
```

### 服务端集成

#### Node.js + Express
```javascript
// server.js
const express = require('express');
const axios = require('axios');

class StockDataService {
  constructor(appKey, accessToken) {
    this.appKey = appKey;
    this.accessToken = accessToken;
    this.baseURL = 'https://localhost:3000';
    
    // 创建axios实例
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-App-Key': this.appKey,
        'X-Access-Token': this.accessToken,
        'Content-Type': 'application/json'
      }
    });

    // 添加请求拦截器
    this.client.interceptors.request.use(
      config => {
        console.log(`API请求: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      error => Promise.reject(error)
    );

    // 添加响应拦截器
    this.client.interceptors.response.use(
      response => {
        const remaining = response.headers['x-ratelimit-remaining'];
        const resetTime = response.headers['x-ratelimit-reset'];
        
        console.log(`剩余请求数: ${remaining}, 重置时间: ${new Date(resetTime * 1000)}`);
        return response;
      },
      error => {
        if (error.response?.status === 429) {
          console.error('频率限制触发，请稍后重试');
        }
        return Promise.reject(error);
      }
    );
  }

  async getStockData(symbols, dataType) {
    try {
      const response = await this.client.post('/api/v1/receiver/data', {
        symbols,
        dataType
      });
      
      return response.data.data.results;
    } catch (error) {
      throw new Error(`获取股票数据失败: ${error.message}`);
    }
  }

  async queryStocks(queryType, parameters) {
    try {
      const response = await this.client.post('/api/v1/query/execute', {
        queryType,
        parameters
      });
      
      return response.data.data;
    } catch (error) {
      throw new Error(`股票查询失败: ${error.message}`);
    }
  }
}

const app = express();
app.use(express.json());

// 初始化股票数据服务
const stockService = new StockDataService(
  process.env.STOCK_API_APP_KEY,
  process.env.STOCK_API_ACCESS_TOKEN
);

// API路由
app.get('/api/quotes/:symbols', async (req, res) => {
  try {
    const symbols = req.params.symbols.split(',');
    const quotes = await stockService.getStockData(symbols, 'stock-quote');
    
    res.json({
      success: true,
      data: quotes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/watchlist', async (req, res) => {
  try {
    const { symbols } = req.body;
    const quotes = await stockService.getStockData(symbols, 'stock-quote');
    const basicInfo = await stockService.getStockData(symbols, 'stock-basic-info');
    
    // 合并数据
    const combined = quotes.map(quote => {
      const info = basicInfo.find(info => info.symbol === quote.symbol);
      return { ...quote, basicInfo: info };
    });
    
    res.json({
      success: true,
      data: combined
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('服务器启动在端口 3000');
});
```

### Python集成

#### 使用requests库
```python
# stock_client.py
import requests
import time
from typing import List, Dict, Optional
import logging

class StockAPIClient:
    def __init__(self, app_key: str, access_token: str, base_url: str = "https://localhost:3000"):
        self.app_key = app_key
        self.access_token = access_token
        self.base_url = base_url
        self.session = requests.Session()
        
        # 设置默认请求头
        self.session.headers.update({
            'X-App-Key': self.app_key,
            'X-Access-Token': self.access_token,
            'Content-Type': 'application/json'
        })
        
        # 配置日志
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def _make_request(self, endpoint: str, data: dict) -> dict:
        """发送API请求"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.post(url, json=data)
            
            # 检查频率限制
            remaining = response.headers.get('X-RateLimit-Remaining')
            reset_time = response.headers.get('X-RateLimit-Reset')
            
            if remaining:
                self.logger.info(f"剩余请求数: {remaining}")
            
            if response.status_code == 429:
                reset_datetime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(int(reset_time)))
                raise Exception(f"请求频率超限，重置时间: {reset_datetime}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"API请求失败: {e}")
            raise

    def get_stock_quote(self, symbols: List[str]) -> List[Dict]:
        """获取股票行情"""
        data = {
            "symbols": symbols,
            "dataType": "stock-quote"
        }
        
        result = self._make_request("/api/v1/receiver/data", data)
        return result.get("data", {}).get("results", [])

    def get_basic_info(self, symbols: List[str]) -> List[Dict]:
        """获取股票基本信息"""
        data = {
            "symbols": symbols,
            "dataType": "stock-basic-info"
        }
        
        result = self._make_request("/api/v1/receiver/data", data)
        return result.get("data", {}).get("results", [])

    def execute_query(self, query_type: str, parameters: dict) -> dict:
        """执行高级查询"""
        data = {
            "queryType": query_type,
            "parameters": parameters
        }
        
        result = self._make_request("/api/v1/query/execute", data)
        return result.get("data", {})

    def get_capabilities(self) -> dict:
        """获取数据源能力"""
        response = self.session.get(f"{self.base_url}/api/v1/providers/capabilities")
        response.raise_for_status()
        return response.json()

# 使用示例
if __name__ == "__main__":
    # 初始化客户端
    client = StockAPIClient(
        app_key="f47ac10b-58cc-4372-a567-0e02b2c3d479",
        access_token="a1b2c3d4e5f678901234567890abcdef"
    )
    
    # 获取股票行情
    symbols = ["AAPL.US", "700.HK", "000001.SZ"]
    
    try:
        quotes = client.get_stock_quote(symbols)
        for quote in quotes:
            print(f"{quote['symbol']}: ${quote['lastPrice']} ({quote['changePercent']}%)")
        
        # 获取基本信息
        basic_info = client.get_basic_info(symbols)
        for info in basic_info:
            print(f"{info['symbol']}: {info.get('companyName', 'N/A')}")
            
    except Exception as e:
        print(f"错误: {e}")

# portfolio_tracker.py - 投资组合跟踪器示例
import json
import time
from datetime import datetime

class PortfolioTracker:
    def __init__(self, client: StockAPIClient):
        self.client = client
        self.portfolio = {}  # symbol -> quantity
    
    def add_position(self, symbol: str, quantity: int):
        """添加持仓"""
        self.portfolio[symbol] = self.portfolio.get(symbol, 0) + quantity
    
    def remove_position(self, symbol: str, quantity: int):
        """减少持仓"""
        if symbol in self.portfolio:
            self.portfolio[symbol] = max(0, self.portfolio[symbol] - quantity)
            if self.portfolio[symbol] == 0:
                del self.portfolio[symbol]
    
    def get_portfolio_value(self) -> dict:
        """获取投资组合总值"""
        if not self.portfolio:
            return {"totalValue": 0, "positions": []}
        
        symbols = list(self.portfolio.keys())
        quotes = self.client.get_stock_quote(symbols)
        
        positions = []
        total_value = 0
        
        for quote in quotes:
            symbol = quote["symbol"]
            if symbol in self.portfolio:
                quantity = self.portfolio[symbol]
                price = quote["lastPrice"]
                value = quantity * price
                
                positions.append({
                    "symbol": symbol,
                    "quantity": quantity,
                    "price": price,
                    "value": value,
                    "change": quote["change"],
                    "changePercent": quote["changePercent"]
                })
                
                total_value += value
        
        return {
            "totalValue": total_value,
            "positions": positions,
            "timestamp": datetime.now().isoformat()
        }
    
    def monitor_portfolio(self, interval: int = 60):
        """监控投资组合（每分钟更新）"""
        while True:
            try:
                portfolio_data = self.get_portfolio_value()
                print(f"\n=== 投资组合更新 {portfolio_data['timestamp']} ===")
                print(f"总价值: ${portfolio_data['totalValue']:.2f}")
                
                for position in portfolio_data["positions"]:
                    change_indicator = "📈" if position["change"] >= 0 else "📉"
                    print(f"{change_indicator} {position['symbol']}: "
                          f"{position['quantity']} 股 @ ${position['price']:.2f} "
                          f"= ${position['value']:.2f} "
                          f"({position['changePercent']:.2f}%)")
                
                time.sleep(interval)
                
            except Exception as e:
                print(f"监控错误: {e}")
                time.sleep(interval)

# 使用投资组合跟踪器
if __name__ == "__main__":
    client = StockAPIClient(
        app_key="your-app-key",
        access_token="your-access-token"
    )
    
    tracker = PortfolioTracker(client)
    
    # 添加持仓
    tracker.add_position("AAPL.US", 100)
    tracker.add_position("700.HK", 500)
    tracker.add_position("000001.SZ", 1000)
    
    # 开始监控
    tracker.monitor_portfolio()
```

---

## 📊 数据格式说明

### 股票行情数据 (stock-quote)
```json
{
  "symbol": "AAPL.US",           // 股票代码
  "lastPrice": 150.25,           // 最新价
  "change": 2.15,                // 涨跌额
  "changePercent": 1.45,         // 涨跌幅(%)
  "volume": 45678901,            // 成交量
  "amount": 6847483275.25,       // 成交额
  "openPrice": 148.10,           // 开盘价
  "highPrice": 151.50,           // 最高价
  "lowPrice": 147.80,            // 最低价
  "prevClosePrice": 148.10,      // 昨收价
  "bid1Price": 150.24,           // 买一价
  "ask1Price": 150.26,           // 卖一价
  "bid1Volume": 100,             // 买一量
  "ask1Volume": 200,             // 卖一量
  "marketValue": 2387453928475,  // 总市值
  "circulationValue": 2298374829, // 流通市值
  "peRatio": 24.56,              // 市盈率
  "pbRatio": 5.67,               // 市净率
  "timestamp": "2025-07-01T15:30:00.000Z", // 时间戳
  "market": "US",                // 市场
  "currency": "USD"              // 币种
}
```

### 股票基本信息 (stock-basic-info)
```json
{
  "symbol": "AAPL.US",
  "companyName": "Apple Inc.",
  "industry": "Technology",
  "sector": "Consumer Electronics",
  "description": "苹果公司设计、制造和销售智能手机、个人电脑、平板电脑等",
  "website": "https://www.apple.com",
  "employees": 164000,
  "marketCap": 2387453928475,
  "sharesOutstanding": 15892450000,
  "floatShares": 15834892450,
  "dividend": 0.92,
  "dividendYield": 0.61,
  "eps": 6.13,
  "roe": 0.617,
  "roa": 0.271,
  "debtToEquity": 2.18,
  "listingDate": "1980-12-12",
  "exchange": "NASDAQ",
  "currency": "USD",
  "country": "US"
}
```

### 市场支持

| 市场代码 | 市场名称 | 代码后缀 | 示例 |
|----------|----------|----------|------|
| HK | 香港 | .HK | 700.HK, 0005.HK |
| US | 美国 | .US | AAPL.US, TSLA.US |
| SZ | 深圳 | .SZ | 000001.SZ, 300001.SZ |
| SH | 上海 | .SH | 600000.SH, 688001.SH |

---

## ⚡ 性能优化建议

### 1. 批量请求
```javascript
// ❌ 低效：单个请求
for (const symbol of symbols) {
  const quote = await api.getQuote([symbol]);
}

// ✅ 高效：批量请求
const quotes = await api.getQuote(symbols);
```

### 2. 缓存策略
```javascript
class CachedStockAPI {
  constructor(api) {
    this.api = api;
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30秒缓存
  }

  async getQuote(symbols) {
    const now = Date.now();
    const uncachedSymbols = [];
    const result = [];

    // 检查缓存
    for (const symbol of symbols) {
      const cached = this.cache.get(symbol);
      if (cached && (now - cached.timestamp) < this.cacheTimeout) {
        result.push(cached.data);
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    // 获取未缓存的数据
    if (uncachedSymbols.length > 0) {
      const fresh = await this.api.getQuote(uncachedSymbols);
      for (const quote of fresh) {
        this.cache.set(quote.symbol, {
          data: quote,
          timestamp: now
        });
        result.push(quote);
      }
    }

    return result;
  }
}
```

### 3. 连接池
```javascript
// Node.js HTTP代理池
const HttpsProxyAgent = require('https-proxy-agent');
const axios = require('axios');

const api = axios.create({
  httpsAgent: new HttpsProxyAgent({
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    freeSocketTimeout: 30000
  })
});
```

### 4. 错误重试
```javascript
class RetryableAPI {
  constructor(api, maxRetries = 3, backoffMs = 1000) {
    this.api = api;
    this.maxRetries = maxRetries;
    this.backoffMs = backoffMs;
  }

  async withRetry(operation) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // 不重试的错误类型
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw error;
        }
        
        if (attempt < this.maxRetries) {
          const delay = this.backoffMs * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  async getQuote(symbols) {
    return this.withRetry(() => this.api.getQuote(symbols));
  }
}
```

---

## 🔐 安全最佳实践

### 1. 环境变量管理
```bash
# .env
STOCK_API_APP_KEY=f47ac10b-58cc-4372-a567-0e02b2c3d479
STOCK_API_ACCESS_TOKEN=a1b2c3d4e5f678901234567890abcdef
STOCK_API_BASE_URL=https://localhost:3000

# 在代码中使用
const config = {
  appKey: process.env.STOCK_API_APP_KEY,
  accessToken: process.env.STOCK_API_ACCESS_TOKEN,
  baseURL: process.env.STOCK_API_BASE_URL
};
```

### 2. 凭据轮换
```javascript
// 定期轮换访问令牌
class CredentialManager {
  constructor(jwtToken) {
    this.jwtToken = jwtToken;
    this.apiKeys = new Map();
  }

  async rotateAccessToken(apiKeyId) {
    const response = await fetch(`/api/v1/auth/api-keys/${apiKeyId}/regenerate-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.jwtToken}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    // 更新存储的凭据
    this.apiKeys.set(apiKeyId, {
      appKey: result.data.appKey,
      accessToken: result.data.accessToken,
      updatedAt: new Date()
    });

    return result.data;
  }

  // 每30天自动轮换
  scheduleRotation(apiKeyId) {
    setInterval(async () => {
      try {
        await this.rotateAccessToken(apiKeyId);
        console.log(`API Key ${apiKeyId} 凭据已轮换`);
      } catch (error) {
        console.error('凭据轮换失败:', error);
      }
    }, 30 * 24 * 60 * 60 * 1000); // 30天
  }
}
```

### 3. 请求签名（可选的高级安全）
```javascript
const crypto = require('crypto');

class SecureStockAPI {
  constructor(appKey, accessToken, secretKey) {
    this.appKey = appKey;
    this.accessToken = accessToken;
    this.secretKey = secretKey;
  }

  generateSignature(timestamp, body) {
    const message = `${this.appKey}:${timestamp}:${JSON.stringify(body)}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('hex');
  }

  async request(endpoint, data) {
    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp, data);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': this.appKey,
        'X-Access-Token': this.accessToken,
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signature
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }
}
```

---

## 📈 监控和故障排查

### 1. 使用统计监控
```javascript
class APIMonitor {
  constructor(api) {
    this.api = api;
    this.stats = {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      errors: []
    };
  }

  async monitoredRequest(operation) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const result = await operation();
      this.stats.successRequests++;
      
      const responseTime = Date.now() - startTime;
      this.updateAvgResponseTime(responseTime);
      
      return result;
    } catch (error) {
      this.stats.failedRequests++;
      this.stats.errors.push({
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });
      
      throw error;
    }
  }

  updateAvgResponseTime(responseTime) {
    const total = this.stats.avgResponseTime * (this.stats.successRequests - 1);
    this.stats.avgResponseTime = (total + responseTime) / this.stats.successRequests;
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.successRequests / this.stats.totalRequests,
      errorRate: this.stats.failedRequests / this.stats.totalRequests
    };
  }
}
```

### 2. 频率限制处理
```javascript
class RateLimitHandler {
  constructor(api) {
    this.api = api;
    this.requestQueue = [];
    this.processing = false;
  }

  async queueRequest(operation) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const { operation, resolve, reject } = this.requestQueue.shift();

      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        if (error.response?.status === 429) {
          // 频率限制，重新加入队列
          this.requestQueue.unshift({ operation, resolve, reject });
          
          const resetTime = error.response.headers['x-ratelimit-reset'];
          const waitTime = (resetTime * 1000) - Date.now() + 1000; // 多等1秒
          
          console.log(`频率限制触发，等待 ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          reject(error);
        }
      }
    }

    this.processing = false;
  }
}
```

### 3. 健康检查
```javascript
class HealthChecker {
  constructor(api) {
    this.api = api;
    this.isHealthy = true;
    this.lastCheck = null;
    this.checkInterval = 60000; // 1分钟
  }

  async checkHealth() {
    try {
      const start = Date.now();
      
      // 简单的健康检查请求
      await this.api.getQuote(['AAPL.US']);
      
      const responseTime = Date.now() - start;
      
      this.isHealthy = responseTime < 5000; // 5秒内响应视为健康
      this.lastCheck = new Date();
      
      return {
        healthy: this.isHealthy,
        responseTime,
        timestamp: this.lastCheck
      };
    } catch (error) {
      this.isHealthy = false;
      this.lastCheck = new Date();
      
      return {
        healthy: false,
        error: error.message,
        timestamp: this.lastCheck
      };
    }
  }

  startMonitoring() {
    setInterval(() => {
      this.checkHealth().then(result => {
        if (!result.healthy) {
          console.error('API健康检查失败:', result);
          // 可以在这里发送告警
        }
      });
    }, this.checkInterval);
  }
}
```

---

## 🆘 常见问题解答

### Q1: API Key创建后立即使用报错？
**A:** API Key创建后需要等待几秒钟才能生效，建议等待5秒后再使用。

### Q2: 为什么返回的数据字段与文档不一致？
**A:** 不同数据源的字段可能有差异，建议使用我们的数据映射功能统一字段格式。

### Q3: 如何获得更高的频率限制？
**A:** 联系我们的商务团队申请企业级账户，可以获得更高的配额。

### Q4: 股票代码格式有什么要求？
**A:** 必须包含市场后缀，如 AAPL.US、700.HK、000001.SZ。

### Q5: 如何处理数据延迟？
**A:** 实时数据会有15分钟延迟，如需真实时数据请联系商务团队。

### Q6: API支持WebSocket推送吗？
**A:** 目前只支持HTTP请求，WebSocket功能正在开发中。

### Q7: 如何获得历史数据？
**A:** 使用查询接口的BY_TIME_RANGE查询类型可以获取历史数据。

---

## 💬 技术支持

### 联系方式
- **技术支持邮箱**: tech-support@stockdata.com
- **商务合作**: business@stockdata.com  
- **紧急支持**: emergency@stockdata.com

### 支持时间
- **工作日**: 9:00 - 18:00 (UTC+8)
- **周末**: 仅紧急支持
- **响应时间**: 2小时内回复

### 社区资源
- **开发者论坛**: https://forum.stockdata.com
- **GitHub示例**: https://github.com/stockdata/examples
- **技术博客**: https://blog.stockdata.com

### 状态页面
- **服务状态**: https://status.stockdata.com
- **维护公告**: https://status.stockdata.com/maintenance

---

## 📋 版本更新日志

### v1.0.0 (2025-07-01)
- ✅ 完整的三层认证系统
- ✅ LongPort数据源集成
- ✅ 智能频率限制功能  
- ✅ 37个预设字段标准化
- ✅ 完整的开发者文档

### 即将发布
- 🚧 WebSocket实时推送
- 🚧 更多数据源集成
- 🚧 高级查询语言
- 🚧 数据回放功能

---

## 📄 服务协议

使用我们的API服务即表示您同意我们的[服务条款](https://stockdata.com/terms)和[隐私政策](https://stockdata.com/privacy)。

### 使用限制
- 不得滥用API进行恶意攻击
- 不得转售或分发API访问权限
- 遵守各交易所的数据使用规定
- 合理使用，避免对服务造成负担

### 数据使用声明
- 数据仅供参考，不构成投资建议
- 不保证数据的完全准确性和实时性
- 投资有风险，决策需谨慎

---

*文档版本: v1.0.0*  
*最后更新: 2025-07-01*  
*维护团队: 智能股票数据系统开发组*