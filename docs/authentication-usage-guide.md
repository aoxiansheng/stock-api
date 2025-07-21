# 认证系统使用指南

本指南将帮助您快速集成智能股票数据系统的认证功能，从零开始构建安全的应用程序。

## 📋 目录

- [快速开始](#快速开始)
- [Web应用集成](#web应用集成)
- [移动应用集成](#移动应用集成)
- [服务端集成](#服务端集成)
- [第三方应用集成](#第三方应用集成)
- [错误处理最佳实践](#错误处理最佳实践)
- [性能优化建议](#性能优化建议)
- [安全注意事项](#安全注意事项)

---

## 快速开始

### 步骤1: 环境准备

确保您的开发环境已安装必要的工具：

```bash
# 安装HTTP客户端库 (以Node.js为例)
npm install axios

# 或者使用Python
pip install requests

# 或者使用Java
# 添加OkHttp或Apache HttpClient依赖
```

### 步骤2: 获取访问凭据

#### 方法A: 管理员直接创建
如果您是系统管理员，可以直接在后台创建API Key：

```bash
# 1. 注册管理员账户
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@company.com",
    "password": "SecurePassword123!",
    "role": "admin"
  }'

# 2. 登录获取JWT
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin", 
    "password": "SecurePassword123!"
  }'

# 3. 创建API Key
curl -X POST http://localhost:3000/api/v1/auth/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "生产环境API Key",
    "description": "用于生产环境数据获取",
    "permissions": ["data:read", "query:execute", "providers:read"],
    "rateLimit": {
      "requests": 10000,
      "window": "1h"
    }
  }'
```

#### 方法B: 开发者自助申请
开发者可以注册账户并自助管理API Key：

```bash
# 1. 注册开发者账户
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "developer123",
    "email": "dev@company.com", 
    "password": "DevPassword123!",
    "role": "developer"
  }'

# 2. 登录并创建API Key (流程同上)
```

### 步骤3: 测试API访问

```bash
# 使用获得的API Key测试数据获取
curl -X POST http://localhost:3000/api/v1/receiver/data \
  -H "Content-Type: application/json" \
  -H "X-App-Key: YOUR_APP_KEY" \
  -H "X-Access-Token: YOUR_ACCESS_TOKEN" \
  -d '{
    "symbols": ["AAPL.US", "700.HK"],
    "dataType": "stock-quote"
  }'
```

### 步骤4: 理解权限系统

系统采用统一的权限验证架构：

#### 权限类型
- **数据访问权限**: `data:read`, `query:execute`, `providers:read`
- **开发者权限**: `system:monitor`, `system:metrics`, `config:read`
- **管理员权限**: `user:manage`, `apikey:manage`, `config:write`

#### 权限验证机制
- **JWT用户**: 基于角色 + 权限双重验证
- **API Key**: 基于权限列表验证
- **统一守卫**: UnifiedPermissionsGuard处理所有权限验证

#### 权限配置示例
```json
{
  "permissions": [
    "data:read",        // 必需：读取股票数据
    "query:execute",    // 必需：执行数据查询
    "providers:read"    // 可选：查看数据提供商信息
  ]
}
```

#### 权限错误处理
当权限不足时，API会返回详细的错误信息：
```json
{
  "statusCode": 403,
  "message": "API Key权限不足",
  "error": "Insufficient Permissions",
  "details": {
    "type": "API_KEY_PERMISSION_DENIED",
    "requiredPermissions": ["data:read", "query:execute"],
    "grantedPermissions": ["data:read"],
    "missingPermissions": ["query:execute"]
  }
}
```

---

## Web应用集成

### React应用示例

#### 1. 创建认证服务

```javascript
// services/authService.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('jwt_token');
    this.apiKey = localStorage.getItem('api_key');
    this.accessToken = localStorage.getItem('access_token');
  }

  // JWT认证相关
  async login(username, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });
      
      const { accessToken, refreshToken, user } = response.data.data;
      
      // 存储令牌
      localStorage.setItem('jwt_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      this.token = accessToken;
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  }

  async logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('api_key');
    localStorage.removeItem('access_token');
    this.token = null;
    this.apiKey = null;
    this.accessToken = null;
  }

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken
      });
      
      const { accessToken } = response.data.data;
      localStorage.setItem('jwt_token', accessToken);
      this.token = accessToken;
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  // API Key管理
  async createApiKey(keyData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/api-keys`, keyData, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const { appKey, accessToken } = response.data.data;
      
      // 存储API凭据
      localStorage.setItem('api_key', appKey);
      localStorage.setItem('access_token', accessToken);
      
      this.apiKey = appKey;
      this.accessToken = accessToken;
      
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || '创建API Key失败');
    }
  }

  async getApiKeys() {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/api-keys`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || '获取API Key列表失败');
    }
  }

  // 检查认证状态
  isAuthenticated() {
    return !!this.token;
  }

  hasApiKey() {
    return !!(this.apiKey && this.accessToken);
  }

  // 获取认证头
  getJwtHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  getApiKeyHeaders() {
    return {
      'X-App-Key': this.apiKey,
      'X-Access-Token': this.accessToken,
      'Content-Type': 'application/json'
    };
  }
}

export default new AuthService();
```

#### 2. 创建数据服务

```javascript
// services/stockDataService.js
import axios from 'axios';
import authService from './authService';

const API_BASE_URL = 'http://localhost:3000/api/v1';

class StockDataService {
  // 获取股票数据
  async getStockQuote(symbols, options = {}) {
    try {
      const response = await axios.post(`${API_BASE_URL}/receiver/data`, {
        symbols,
        dataType: 'stock-quote',
        options
      }, {
        headers: authService.getApiKeyHeaders()
      });
      
      // 检查频率限制头信息
      this.logRateLimitInfo(response.headers);
      
      return response.data.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  // 获取提供商能力
  async getProviderCapabilities() {
    try {
      const response = await axios.get(`${API_BASE_URL}/providers/capabilities`, {
        headers: authService.getApiKeyHeaders()
      });
      return response.data.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  // 执行查询
  async executeQuery(queryData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/query/execute`, queryData, {
        headers: authService.getApiKeyHeaders()
      });
      
      this.logRateLimitInfo(response.headers);
      return response.data.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  // 记录频率限制信息
  logRateLimitInfo(headers) {
    const limit = headers['x-ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    
    if (limit && remaining && reset) {
      console.log(`频率限制: ${remaining}/${limit} 剩余, 重置时间: ${new Date(reset * 1000)}`);
      
      // 如果剩余请求数较少，显示警告
      if (parseInt(remaining) < parseInt(limit) * 0.1) {
        console.warn(`⚠️ API请求即将达到限制，剩余: ${remaining}/${limit}`);
      }
    }
  }

  // 错误处理
  handleApiError(error) {
    if (error.response?.status === 401) {
      console.error('API认证失败，请检查API Key');
      authService.logout();
    } else if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.error(`请求频率超限，请在 ${retryAfter} 秒后重试`);
    } else if (error.response?.status === 403) {
      console.error('权限不足，请检查API Key权限配置');
    }
  }
}

export default new StockDataService();
```

#### 3. React组件示例

```jsx
// components/StockDashboard.jsx
import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import stockDataService from '../services/stockDataService';

const StockDashboard = () => {
  const [user, setUser] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      if (authService.isAuthenticated()) {
        const userData = JSON.parse(localStorage.getItem('user'));
        setUser(userData);
        
        const keys = await authService.getApiKeys();
        setApiKeys(keys.items || []);
      }
    } catch (error) {
      setError('加载用户数据失败');
    }
  };

  const handleLogin = async (username, password) => {
    const result = await authService.login(username, password);
    if (result.success) {
      setUser(result.user);
      loadUserData();
    } else {
      setError(result.error);
    }
  };

  const createApiKey = async () => {
    try {
      const keyData = {
        name: '仪表板API Key',
        description: '用于股票仪表板数据获取',
        permissions: ['data:read', 'query:execute', 'providers:read'],
        rateLimit: {
          requests: 1000,
          window: '1h'
        }
      };
      
      const newKey = await authService.createApiKey(keyData);
      setApiKeys([...apiKeys, newKey]);
    } catch (error) {
      setError(error.message);
    }
  };

  const fetchStockData = async () => {
    if (!authService.hasApiKey()) {
      setError('请先创建API Key');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await stockDataService.getStockQuote(['AAPL.US', '700.HK', 'TSLA.US']);
      setStockData(data);
    } catch (error) {
      setError(error.response?.data?.message || '获取股票数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} error={error} />;
  }

  return (
    <div className="stock-dashboard">
      <header>
        <h1>股票数据仪表板</h1>
        <div className="user-info">
          <span>欢迎, {user.username}</span>
          <button onClick={() => authService.logout()}>退出</button>
        </div>
      </header>

      <section className="api-key-section">
        <h2>API Key 管理</h2>
        {apiKeys.length === 0 ? (
          <div>
            <p>您还没有API Key，请先创建一个：</p>
            <button onClick={createApiKey}>创建API Key</button>
          </div>
        ) : (
          <div>
            <p>活跃的API Keys: {apiKeys.filter(k => k.isActive).length}</p>
            <button onClick={loadUserData}>刷新列表</button>
          </div>
        )}
      </section>

      <section className="data-section">
        <h2>股票数据</h2>
        <button onClick={fetchStockData} disabled={loading || !authService.hasApiKey()}>
          {loading ? '加载中...' : '获取股票数据'}
        </button>
        
        {error && <div className="error">{error}</div>}
        
        {stockData && (
          <div className="stock-data">
            <h3>实时报价</h3>
            <pre>{JSON.stringify(stockData, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  );
};

// 登录表单组件
const LoginForm = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="login-form">
      <h2>登录</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password" 
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">登录</button>
      </form>
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default StockDashboard;
```

---

## 移动应用集成

### React Native示例

#### 1. 认证管理器

```javascript
// utils/AuthManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthManager {
  constructor() {
    this.baseURL = 'http://localhost:3000/api/v1';
    this.token = null;
    this.apiKey = null;
    this.accessToken = null;
  }

  async initialize() {
    try {
      this.token = await AsyncStorage.getItem('jwt_token');
      this.apiKey = await AsyncStorage.getItem('api_key');
      this.accessToken = await AsyncStorage.getItem('access_token');
    } catch (error) {
      console.error('初始化认证管理器失败:', error);
    }
  }

  async login(username, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const { accessToken, refreshToken, user } = data.data;
        
        await AsyncStorage.multiSet([
          ['jwt_token', accessToken],
          ['refresh_token', refreshToken],
          ['user', JSON.stringify(user)],
        ]);
        
        this.token = accessToken;
        return { success: true, user };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      return { success: false, error: '网络错误' };
    }
  }

  async logout() {
    try {
      await AsyncStorage.multiRemove([
        'jwt_token', 'refresh_token', 'user', 'api_key', 'access_token'
      ]);
      this.token = null;
      this.apiKey = null;
      this.accessToken = null;
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  }

  async makeApiRequest(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 如果是API Key认证的端点
    if (options.useApiKey && this.apiKey && this.accessToken) {
      headers['X-App-Key'] = this.apiKey;
      headers['X-Access-Token'] = this.accessToken;
    }
    
    // 如果是JWT认证的端点
    if (options.useJWT && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      // 检查频率限制
      if (response.headers.get('X-RateLimit-Remaining')) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const limit = response.headers.get('X-RateLimit-Limit');
        console.log(`频率限制: ${remaining}/${limit}`);
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '请求失败');
      }
      
      return data;
    } catch (error) {
      console.error(`API请求失败 ${endpoint}:`, error);
      throw error;
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  hasApiKey() {
    return !!(this.apiKey && this.accessToken);
  }
}

export default new AuthManager();
```

#### 2. 股票数据Hook

```javascript
// hooks/useStockData.js
import { useState, useEffect } from 'react';
import AuthManager from '../utils/AuthManager';

export const useStockData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStockQuote = async (symbols) => {
    if (!AuthManager.hasApiKey()) {
      setError('请先配置API Key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await AuthManager.makeApiRequest('/receiver/data', {
        method: 'POST',
        useApiKey: true,
        body: JSON.stringify({
          symbols,
          dataType: 'stock-quote'
        }),
      });

      setData(response.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    fetchStockQuote,
  };
};

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadApiKeys = async () => {
    if (!AuthManager.isAuthenticated()) {
      setError('请先登录');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await AuthManager.makeApiRequest('/auth/api-keys', {
        method: 'GET',
        useJWT: true,
      });

      setApiKeys(response.data.items || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async (keyData) => {
    try {
      const response = await AuthManager.makeApiRequest('/auth/api-keys', {
        method: 'POST',
        useJWT: true,
        body: JSON.stringify(keyData),
      });

      const newKey = response.data;
      setApiKeys([...apiKeys, newKey]);
      
      // 自动设置为当前使用的API Key
      await AsyncStorage.multiSet([
        ['api_key', newKey.appKey],
        ['access_token', newKey.accessToken],
      ]);
      
      AuthManager.apiKey = newKey.appKey;
      AuthManager.accessToken = newKey.accessToken;
      
      return newKey;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  useEffect(() => {
    if (AuthManager.isAuthenticated()) {
      loadApiKeys();
    }
  }, []);

  return {
    apiKeys,
    loading,
    error,
    loadApiKeys,
    createApiKey,
  };
};
```

#### 3. React Native组件

```jsx
// screens/StockScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import AuthManager from '../utils/AuthManager';
import { useStockData, useApiKeys } from '../hooks/useStockData';

const StockScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { data: stockData, loading: stockLoading, error: stockError, fetchStockQuote } = useStockData();
  const { apiKeys, loading: keyLoading, error: keyError, createApiKey } = useApiKeys();

  useEffect(() => {
    AuthManager.initialize();
  }, []);

  const handleCreateApiKey = async () => {
    try {
      await createApiKey({
        name: '移动应用API Key',
        description: '用于移动应用数据获取',
        permissions: ['data:read', 'query:execute', 'providers:read'],
        rateLimit: {
          requests: 500,
          window: '1h'
        }
      });
      Alert.alert('成功', 'API Key创建成功');
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };

  const handleFetchData = () => {
    fetchStockQuote(['AAPL.US', '700.HK', 'MSFT.US']);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (AuthManager.hasApiKey()) {
      await handleFetchData();
    }
    setRefreshing(false);
  };

  const renderStockItem = ({ item }) => (
    <View style={styles.stockItem}>
      <Text style={styles.symbol}>{item.symbol}</Text>
      <Text style={styles.price}>${item.lastPrice}</Text>
      <Text style={[
        styles.change,
        parseFloat(item.change) >= 0 ? styles.positive : styles.negative
      ]}>
        {item.change} ({item.changePercent}%)
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>股票数据</Text>
      
      {/* API Key状态 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Key状态</Text>
        {AuthManager.hasApiKey() ? (
          <Text style={styles.statusText}>✅ 已配置API Key</Text>
        ) : (
          <View>
            <Text style={styles.statusText}>❌ 未配置API Key</Text>
            <TouchableOpacity style={styles.button} onPress={handleCreateApiKey}>
              <Text style={styles.buttonText}>创建API Key</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 数据获取 */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.button, (!AuthManager.hasApiKey() || stockLoading) && styles.buttonDisabled]}
          onPress={handleFetchData}
          disabled={!AuthManager.hasApiKey() || stockLoading}
        >
          <Text style={styles.buttonText}>
            {stockLoading ? '加载中...' : '获取股票数据'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 错误显示 */}
      {(stockError || keyError) && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{stockError || keyError}</Text>
        </View>
      )}

      {/* 股票数据列表 */}
      {stockData && (
        <FlatList
          data={stockData}
          keyExtractor={(item) => item.symbol}
          renderItem={renderStockItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          style={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  stockItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbol: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  change: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  positive: {
    color: '#4caf50',
  },
  negative: {
    color: '#f44336',
  },
});

export default StockScreen;
```

---

## 服务端集成

### Node.js/Express示例

#### 1. 认证中间件

```javascript
// middleware/auth.js
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';

// API Key验证中间件
const validateApiKey = async (req, res, next) => {
  try {
    const appKey = req.headers['x-app-key'];
    const accessToken = req.headers['x-access-token'];

    if (!appKey || !accessToken) {
      return res.status(401).json({
        error: 'Missing API credentials',
        message: 'X-App-Key and X-Access-Token headers are required'
      });
    }

    // 这里可以添加本地验证逻辑，或者调用认证服务验证
    // 简化示例：直接传递给下游服务验证
    req.apiCredentials = { appKey, accessToken };
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Authentication error',
      message: error.message
    });
  }
};

// JWT验证中间件
const validateJWT = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Missing JWT token',
        message: 'Authorization header with Bearer token is required'
      });
    }

    // 可以添加JWT验证逻辑
    req.userToken = token;
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Authentication error',
      message: error.message
    });
  }
};

module.exports = {
  validateApiKey,
  validateJWT
};
```

#### 2. 股票数据代理服务

```javascript
// services/stockProxy.js
const axios = require('axios');

class StockDataProxy {
  constructor() {
    this.baseURL = 'http://localhost:3000/api/v1';
    this.rateLimitInfo = new Map();
  }

  // 代理股票数据请求
  async getStockData(apiCredentials, requestData) {
    try {
      const response = await axios.post(`${this.baseURL}/receiver/data`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'X-App-Key': apiCredentials.appKey,
          'X-Access-Token': apiCredentials.accessToken
        },
        timeout: 10000 // 10秒超时
      });

      // 记录频率限制信息
      this.updateRateLimitInfo(apiCredentials.appKey, response.headers);

      return {
        success: true,
        data: response.data.data,
        rateLimitInfo: this.getRateLimitInfo(apiCredentials.appKey)
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 批量获取股票数据
  async getBatchStockData(apiCredentials, symbolBatches) {
    const results = [];
    const errors = [];

    for (const batch of symbolBatches) {
      try {
        const result = await this.getStockData(apiCredentials, {
          symbols: batch,
          dataType: 'stock-quote'
        });
        
        if (result.success) {
          results.push(...result.data);
        } else {
          errors.push(result);
        }

        // 检查频率限制，如果接近限制则暂停
        const rateLimitInfo = this.getRateLimitInfo(apiCredentials.appKey);
        if (rateLimitInfo && rateLimitInfo.remaining < 10) {
          console.warn('接近频率限制，暂停批量请求');
          break;
        }

        // 添加延迟避免过快请求
        await this.delay(100);
      } catch (error) {
        errors.push({ error: error.message, batch });
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      errors,
      rateLimitInfo: this.getRateLimitInfo(apiCredentials.appKey)
    };
  }

  // 智能重试机制
  async makeRequestWithRetry(apiCredentials, requestData, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.getStockData(apiCredentials, requestData);
        
        if (result.success) {
          return result;
        }

        // 如果是频率限制错误，等待后重试
        if (result.status === 429) {
          const retryAfter = result.retryAfter || 60;
          console.log(`频率限制，等待 ${retryAfter} 秒后重试 (尝试 ${attempt}/${maxRetries})`);
          await this.delay(retryAfter * 1000);
          continue;
        }

        // 其他错误不重试
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `请求失败，已重试 ${maxRetries} 次: ${error.message}`
          };
        }
        
        // 指数退避
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  // 更新频率限制信息
  updateRateLimitInfo(appKey, headers) {
    const limit = headers['x-ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];

    if (limit && remaining && reset) {
      this.rateLimitInfo.set(appKey, {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: parseInt(reset),
        updatedAt: new Date()
      });
    }
  }

  // 获取频率限制信息
  getRateLimitInfo(appKey) {
    return this.rateLimitInfo.get(appKey);
  }

  // 错误处理
  handleError(error) {
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        error: error.response.data.message || '请求失败',
        retryAfter: error.response.headers['retry-after']
      };
    } else if (error.request) {
      return {
        success: false,
        error: '网络连接失败'
      };
    } else {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 分割数组为批次
  static chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

module.exports = StockDataProxy;
```

#### 3. Express路由示例

```javascript
// routes/stock.js
const express = require('express');
const { validateApiKey } = require('../middleware/auth');
const StockDataProxy = require('../services/stockProxy');

const router = express.Router();
const stockProxy = new StockDataProxy();

// 获取单只股票数据
router.post('/quote', validateApiKey, async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({
        error: 'Missing symbol parameter'
      });
    }

    const result = await stockProxy.getStockData(req.apiCredentials, {
      symbols: [symbol],
      dataType: 'stock-quote'
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data[0],
        rateLimitInfo: result.rateLimitInfo
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 批量获取股票数据
router.post('/quotes', validateApiKey, async (req, res) => {
  try {
    const { symbols, batchSize = 10 } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        error: 'symbols must be an array'
      });
    }

    // 分批处理
    const batches = StockDataProxy.chunkArray(symbols, batchSize);
    const result = await stockProxy.getBatchStockData(req.apiCredentials, batches);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 获取股票历史数据（示例）
router.post('/history', validateApiKey, async (req, res) => {
  try {
    const { symbol, period = '1d' } = req.body;
    
    // 使用智能重试机制
    const result = await stockProxy.makeRequestWithRetry(req.apiCredentials, {
      symbols: [symbol],
      dataType: 'stock-history',
      options: { period }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 检查API状态
router.get('/status', validateApiKey, async (req, res) => {
  try {
    const rateLimitInfo = stockProxy.getRateLimitInfo(req.apiCredentials.appKey);
    
    res.json({
      status: 'active',
      apiKey: req.apiCredentials.appKey.substring(0, 8) + '***',
      rateLimitInfo,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
```

---

## 第三方应用集成

### Python应用示例

#### 1. Python SDK

```python
# stock_api_client.py
import requests
import time
import logging
from typing import List, Dict, Optional, Union
from datetime import datetime
import json

class StockAPIClient:
    def __init__(self, base_url: str = "http://localhost:3000/api/v1"):
        self.base_url = base_url
        self.session = requests.Session()
        self.app_key = None
        self.access_token = None
        self.jwt_token = None
        self.rate_limit_info = {}
        
        # 配置日志
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def set_api_credentials(self, app_key: str, access_token: str):
        """设置API Key凭据"""
        self.app_key = app_key
        self.access_token = access_token
        self.session.headers.update({
            'X-App-Key': app_key,
            'X-Access-Token': access_token,
            'Content-Type': 'application/json'
        })

    def set_jwt_token(self, token: str):
        """设置JWT Token"""
        self.jwt_token = token
        self.session.headers.update({
            'Authorization': f'Bearer {token}'
        })

    def login(self, username: str, password: str) -> Dict:
        """用户登录"""
        try:
            response = self.session.post(f'{self.base_url}/auth/login', json={
                'username': username,
                'password': password
            })
            
            if response.status_code == 201:
                data = response.json()['data']
                self.set_jwt_token(data['accessToken'])
                return {
                    'success': True,
                    'user': data['user'],
                    'token': data['accessToken']
                }
            else:
                return {
                    'success': False,
                    'error': response.json().get('message', '登录失败')
                }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def create_api_key(self, name: str, description: str, 
                      permissions: List[str], rate_limit: Dict) -> Dict:
        """创建API Key"""
        try:
            response = self.session.post(f'{self.base_url}/auth/api-keys', json={
                'name': name,
                'description': description,
                'permissions': permissions,
                'rateLimit': rate_limit
            })
            
            if response.status_code == 201:
                data = response.json()['data']
                # 自动设置为当前使用的凭据
                self.set_api_credentials(data['appKey'], data['accessToken'])
                return {'success': True, 'data': data}
            else:
                return {
                    'success': False,
                    'error': response.json().get('message', '创建API Key失败')
                }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_stock_quote(self, symbols: Union[str, List[str]], 
                       options: Optional[Dict] = None) -> Dict:
        """获取股票报价"""
        if isinstance(symbols, str):
            symbols = [symbols]
        
        try:
            response = self.session.post(f'{self.base_url}/receiver/data', json={
                'symbols': symbols,
                'dataType': 'stock-quote',
                'options': options or {}
            })
            
            # 更新频率限制信息
            self._update_rate_limit_info(response.headers)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json()['data'],
                    'rate_limit': self.rate_limit_info
                }
            else:
                return self._handle_error_response(response)
                
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_provider_capabilities(self) -> Dict:
        """获取数据提供商能力"""
        try:
            response = self.session.get(f'{self.base_url}/providers/capabilities')
            
            self._update_rate_limit_info(response.headers)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json()['data']
                }
            else:
                return self._handle_error_response(response)
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def execute_query(self, query_type: str, **kwargs) -> Dict:
        """执行查询"""
        try:
            query_data = {
                'queryType': query_type,
                **kwargs
            }
            
            response = self.session.post(f'{self.base_url}/query/execute', 
                                       json=query_data)
            
            self._update_rate_limit_info(response.headers)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json()['data']
                }
            else:
                return self._handle_error_response(response)
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_batch_quotes(self, symbols: List[str], batch_size: int = 10, 
                        delay_between_batches: float = 0.1) -> Dict:
        """批量获取股票报价（带频率限制控制）"""
        results = []
        errors = []
        
        # 分批处理
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i + batch_size]
            
            # 检查频率限制
            if self._should_wait_for_rate_limit():
                wait_time = self._calculate_wait_time()
                self.logger.info(f"频率限制，等待 {wait_time} 秒")
                time.sleep(wait_time)
            
            result = self.get_stock_quote(batch)
            
            if result['success']:
                results.extend(result['data'])
            else:
                errors.append({
                    'batch': batch,
                    'error': result['error']
                })
                
                # 如果是频率限制错误，等待更长时间
                if '429' in str(result.get('status', '')):
                    self.logger.warning("遇到频率限制，延长等待时间")
                    time.sleep(60)  # 等待1分钟
            
            # 批次间延迟
            if i + batch_size < len(symbols):
                time.sleep(delay_between_batches)
        
        return {
            'success': len(errors) == 0,
            'data': results,
            'errors': errors,
            'total_requested': len(symbols),
            'total_received': len(results)
        }

    def _update_rate_limit_info(self, headers):
        """更新频率限制信息"""
        limit = headers.get('X-RateLimit-Limit')
        remaining = headers.get('X-RateLimit-Remaining')
        reset = headers.get('X-RateLimit-Reset')
        
        if limit and remaining and reset:
            self.rate_limit_info = {
                'limit': int(limit),
                'remaining': int(remaining),
                'reset': int(reset),
                'reset_time': datetime.fromtimestamp(int(reset))
            }
            
            # 记录频率限制状态
            self.logger.info(f"频率限制: {remaining}/{limit}, "
                           f"重置时间: {self.rate_limit_info['reset_time']}")

    def _should_wait_for_rate_limit(self) -> bool:
        """判断是否需要等待频率限制"""
        if not self.rate_limit_info:
            return False
        
        remaining = self.rate_limit_info.get('remaining', 0)
        limit = self.rate_limit_info.get('limit', 0)
        
        # 如果剩余请求数低于10%，则等待
        return remaining < limit * 0.1

    def _calculate_wait_time(self) -> float:
        """计算等待时间"""
        if not self.rate_limit_info:
            return 1.0
        
        reset_time = self.rate_limit_info.get('reset', time.time() + 60)
        current_time = time.time()
        
        return max(1.0, reset_time - current_time)

    def _handle_error_response(self, response) -> Dict:
        """处理错误响应"""
        try:
            error_data = response.json()
            return {
                'success': False,
                'status': response.status_code,
                'error': error_data.get('message', '请求失败'),
                'details': error_data.get('details', {})
            }
        except:
            return {
                'success': False,
                'status': response.status_code,
                'error': f'HTTP {response.status_code} Error'
            }

    def get_rate_limit_status(self) -> Dict:
        """获取当前频率限制状态"""
        return self.rate_limit_info
```

#### 2. 使用示例

```python
# example_usage.py
from stock_api_client import StockAPIClient
import time

def main():
    # 初始化客户端
    client = StockAPIClient()
    
    # 方式1: 直接使用API Key（如果已有）
    # client.set_api_credentials(
    #     app_key="your-app-key",
    #     access_token="your-access-token"
    # )
    
    # 方式2: 登录并创建API Key
    login_result = client.login("admin", "password123")
    if not login_result['success']:
        print(f"登录失败: {login_result['error']}")
        return
    
    print(f"登录成功: {login_result['user']['username']}")
    
    # 创建API Key
    api_key_result = client.create_api_key(
        name="Python应用API Key",
        description="用于Python应用的数据获取",
        permissions=["data:read", "query:execute", "providers:read"],
        rate_limit={
            "requests": 1000,
            "window": "1h"
        }
    )
    
    if not api_key_result['success']:
        print(f"创建API Key失败: {api_key_result['error']}")
        return
    
    print(f"API Key创建成功: {api_key_result['data']['appKey']}")
    
    # 获取单只股票数据
    quote_result = client.get_stock_quote("AAPL.US")
    if quote_result['success']:
        print(f"AAPL股票数据: {quote_result['data']}")
    else:
        print(f"获取股票数据失败: {quote_result['error']}")
    
    # 批量获取股票数据
    symbols = ["AAPL.US", "MSFT.US", "GOOGL.US", "700.HK", "TSLA.US"]
    batch_result = client.get_batch_quotes(symbols, batch_size=3)
    
    if batch_result['success']:
        print(f"成功获取 {len(batch_result['data'])} 只股票数据")
        for stock in batch_result['data']:
            print(f"{stock['symbol']}: ${stock['lastPrice']}")
    else:
        print(f"批量获取失败，错误数: {len(batch_result['errors'])}")
    
    # 获取提供商能力
    capabilities_result = client.get_provider_capabilities()
    if capabilities_result['success']:
        print(f"可用数据提供商: {list(capabilities_result['data'].keys())}")
    
    # 显示频率限制状态
    rate_limit_status = client.get_rate_limit_status()
    if rate_limit_status:
        print(f"频率限制状态: {rate_limit_status['remaining']}/{rate_limit_status['limit']}")

if __name__ == "__main__":
    main()
```

---

## 错误处理最佳实践

### 1. 分类处理不同类型的错误

```javascript
// 通用错误处理函数
function handleApiError(error) {
  const response = error.response;
  
  if (!response) {
    // 网络错误
    return {
      type: 'NETWORK_ERROR',
      message: '网络连接失败，请检查网络设置',
      retry: true,
      retryAfter: 5000
    };
  }
  
  switch (response.status) {
    case 401:
      // 认证失败
      return {
        type: 'AUTH_ERROR',
        message: 'API凭据无效，请检查App Key和Access Token',
        retry: false,
        action: 'REFRESH_CREDENTIALS'
      };
      
    case 403:
      // 权限不足
      return {
        type: 'PERMISSION_ERROR',
        message: '权限不足，请检查API Key权限配置',
        retry: false,
        action: 'CHECK_PERMISSIONS'
      };
      
    case 429:
      // 频率限制
      const retryAfter = response.headers['retry-after'] || 60;
      return {
        type: 'RATE_LIMIT_ERROR',
        message: `请求频率超限，请在 ${retryAfter} 秒后重试`,
        retry: true,
        retryAfter: retryAfter * 1000,
        details: response.data.details
      };
      
    case 400:
      // 请求参数错误
      return {
        type: 'VALIDATION_ERROR',
        message: '请求参数错误',
        retry: false,
        details: response.data.details
      };
      
    case 500:
      // 服务器错误
      return {
        type: 'SERVER_ERROR',
        message: '服务器内部错误，请稍后重试',
        retry: true,
        retryAfter: 10000
      };
      
    default:
      return {
        type: 'UNKNOWN_ERROR',
        message: response.data?.message || '未知错误',
        retry: false
      };
  }
}
```

### 2. 智能重试机制

```javascript
// 智能重试函数
async function makeRequestWithRetry(requestFn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryCondition = (error) => error.retry
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = handleApiError(error);
      
      // 如果是最后一次尝试或不应该重试，直接抛出错误
      if (attempt === maxRetries || !retryCondition(lastError)) {
        throw lastError;
      }
      
      // 计算延迟时间
      let delay;
      if (lastError.retryAfter) {
        delay = lastError.retryAfter;
      } else {
        delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
      }
      
      console.log(`请求失败，${delay/1000}秒后重试 (${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// 使用示例
async function getStockDataWithRetry(symbols) {
  return makeRequestWithRetry(
    () => stockDataService.getStockQuote(symbols),
    {
      maxRetries: 3,
      retryCondition: (error) => 
        error.type === 'RATE_LIMIT_ERROR' || 
        error.type === 'NETWORK_ERROR' || 
        error.type === 'SERVER_ERROR'
    }
  );
}
```

### 3. 频率限制处理

```javascript
// 频率限制管理器
class RateLimitManager {
  constructor() {
    this.limits = new Map();
    this.queues = new Map();
  }
  
  // 更新频率限制信息
  updateLimits(apiKey, headers) {
    const limit = parseInt(headers['x-ratelimit-limit']);
    const remaining = parseInt(headers['x-ratelimit-remaining']);
    const reset = parseInt(headers['x-ratelimit-reset']);
    
    if (limit && remaining !== undefined && reset) {
      this.limits.set(apiKey, {
        limit,
        remaining,
        reset: reset * 1000, // 转换为毫秒
        updatedAt: Date.now()
      });
    }
  }
  
  // 检查是否可以发送请求
  canMakeRequest(apiKey) {
    const limits = this.limits.get(apiKey);
    if (!limits) return true;
    
    // 如果已经重置，更新状态
    if (Date.now() > limits.reset) {
      this.limits.delete(apiKey);
      return true;
    }
    
    return limits.remaining > 0;
  }
  
  // 获取等待时间
  getWaitTime(apiKey) {
    const limits = this.limits.get(apiKey);
    if (!limits) return 0;
    
    return Math.max(0, limits.reset - Date.now());
  }
  
  // 带队列的请求管理
  async queueRequest(apiKey, requestFn) {
    if (!this.queues.has(apiKey)) {
      this.queues.set(apiKey, []);
    }
    
    const queue = this.queues.get(apiKey);
    
    return new Promise((resolve, reject) => {
      queue.push({ requestFn, resolve, reject });
      this.processQueue(apiKey);
    });
  }
  
  async processQueue(apiKey) {
    const queue = this.queues.get(apiKey);
    if (!queue || queue.length === 0) return;
    
    if (!this.canMakeRequest(apiKey)) {
      const waitTime = this.getWaitTime(apiKey);
      console.log(`API Key ${apiKey} 频率限制，等待 ${waitTime/1000} 秒`);
      setTimeout(() => this.processQueue(apiKey), waitTime);
      return;
    }
    
    const { requestFn, resolve, reject } = queue.shift();
    
    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    // 处理下一个请求
    setTimeout(() => this.processQueue(apiKey), 100); // 100ms间隔
  }
}

// 使用示例
const rateLimitManager = new RateLimitManager();

async function makeApiRequest(apiKey, requestFn) {
  return rateLimitManager.queueRequest(apiKey, requestFn);
}
```

---

## 性能优化建议

### 1. 缓存策略

```javascript
// 多级缓存实现
class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.localStoragePrefix = 'stock_api_cache_';
    this.defaultTTL = 5 * 60 * 1000; // 5分钟
  }
  
  // 设置缓存
  set(key, data, ttl = this.defaultTTL) {
    const item = {
      data,
      expiry: Date.now() + ttl,
      timestamp: Date.now()
    };
    
    // 内存缓存
    this.memoryCache.set(key, item);
    
    // 本地存储缓存
    try {
      localStorage.setItem(
        this.localStoragePrefix + key,
        JSON.stringify(item)
      );
    } catch (error) {
      console.warn('本地存储已满，清理过期数据');
      this.cleanupLocalStorage();
    }
  }
  
  // 获取缓存
  get(key) {
    // 先检查内存缓存
    let item = this.memoryCache.get(key);
    
    // 如果内存缓存没有，检查本地存储
    if (!item) {
      try {
        const stored = localStorage.getItem(this.localStoragePrefix + key);
        if (stored) {
          item = JSON.parse(stored);
          // 恢复到内存缓存
          this.memoryCache.set(key, item);
        }
      } catch (error) {
        console.warn('读取本地缓存失败:', error);
      }
    }
    
    // 检查是否过期
    if (item && Date.now() > item.expiry) {
      this.delete(key);
      return null;
    }
    
    return item?.data || null;
  }
  
  // 删除缓存
  delete(key) {
    this.memoryCache.delete(key);
    localStorage.removeItem(this.localStoragePrefix + key);
  }
  
  // 清理过期的本地存储
  cleanupLocalStorage() {
    const keys = Object.keys(localStorage);
    const prefix = this.localStoragePrefix;
    
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (Date.now() > item.expiry) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      }
    });
  }
  
  // 生成缓存键
  generateKey(params) {
    return JSON.stringify(params);
  }
}

// 使用缓存的数据服务
class CachedStockDataService {
  constructor() {
    this.cache = new CacheManager();
    this.baseService = new StockDataService();
  }
  
  async getStockQuote(symbols, useCache = true) {
    const cacheKey = this.cache.generateKey({ 
      type: 'stock-quote', 
      symbols: symbols.sort() 
    });
    
    // 检查缓存
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('使用缓存数据');
        return cached;
      }
    }
    
    // 从API获取数据
    const data = await this.baseService.getStockQuote(symbols);
    
    // 缓存结果
    this.cache.set(cacheKey, data, 30000); // 缓存30秒
    
    return data;
  }
}
```

### 2. 批量处理优化

```javascript
// 批量请求优化器
class BatchOptimizer {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 10;
    this.batchDelay = options.batchDelay || 100;
    this.concurrency = options.concurrency || 3;
    this.pendingRequests = new Map();
    this.requestQueue = [];
  }
  
  // 添加请求到批次
  addRequest(symbol, resolve, reject) {
    const batchKey = this.getCurrentBatchKey();
    
    if (!this.pendingRequests.has(batchKey)) {
      this.pendingRequests.set(batchKey, {
        symbols: [],
        resolvers: [],
        createdAt: Date.now()
      });
      
      // 延迟执行批次
      setTimeout(() => this.executeBatch(batchKey), this.batchDelay);
    }
    
    const batch = this.pendingRequests.get(batchKey);
    batch.symbols.push(symbol);
    batch.resolvers.push({ resolve, reject, symbol });
    
    // 如果批次满了，立即执行
    if (batch.symbols.length >= this.batchSize) {
      this.executeBatch(batchKey);
    }
  }
  
  // 获取当前批次键
  getCurrentBatchKey() {
    const now = Date.now();
    return Math.floor(now / this.batchDelay);
  }
  
  // 执行批次请求
  async executeBatch(batchKey) {
    const batch = this.pendingRequests.get(batchKey);
    if (!batch) return;
    
    this.pendingRequests.delete(batchKey);
    
    try {
      const result = await stockDataService.getStockQuote(batch.symbols);
      
      // 将结果分发给各个请求
      batch.resolvers.forEach(({ resolve, symbol }) => {
        const stockData = result.find(stock => stock.symbol === symbol);
        resolve(stockData);
      });
    } catch (error) {
      // 批次失败，单独重试每个请求
      batch.resolvers.forEach(({ resolve, reject, symbol }) => {
        this.retrySingleRequest(symbol, resolve, reject);
      });
    }
  }
  
  // 单独重试请求
  async retrySingleRequest(symbol, resolve, reject) {
    try {
      const result = await stockDataService.getStockQuote([symbol]);
      resolve(result[0]);
    } catch (error) {
      reject(error);
    }
  }
  
  // 获取股票数据（对外接口）
  getStockQuote(symbol) {
    return new Promise((resolve, reject) => {
      this.addRequest(symbol, resolve, reject);
    });
  }
}

// 使用示例
const batchOptimizer = new BatchOptimizer({
  batchSize: 10,
  batchDelay: 200,
  concurrency: 3
});

// 并发请求多只股票，自动批量优化
async function getMultipleStocks(symbols) {
  const promises = symbols.map(symbol => 
    batchOptimizer.getStockQuote(symbol)
  );
  
  return Promise.all(promises);
}
```

---

## 安全注意事项

### 1. 凭据安全管理

```javascript
// 安全凭据管理器
class SecureCredentialManager {
  constructor() {
    this.encryptionKey = this.generateEncryptionKey();
  }
  
  // 生成加密密钥
  generateEncryptionKey() {
    // 在实际应用中，应使用更安全的密钥管理方案
    return crypto.getRandomValues(new Uint8Array(32));
  }
  
  // 加密存储API凭据
  storeCredentials(appKey, accessToken) {
    try {
      const credentials = { appKey, accessToken, timestamp: Date.now() };
      const encrypted = this.encrypt(JSON.stringify(credentials));
      
      // 存储到安全位置（如加密的本地存储）
      localStorage.setItem('encrypted_credentials', encrypted);
      
      // 设置自动清理
      setTimeout(() => this.clearCredentials(), 24 * 60 * 60 * 1000); // 24小时
    } catch (error) {
      console.error('存储凭据失败:', error);
    }
  }
  
  // 获取凭据
  getCredentials() {
    try {
      const encrypted = localStorage.getItem('encrypted_credentials');
      if (!encrypted) return null;
      
      const decrypted = this.decrypt(encrypted);
      const credentials = JSON.parse(decrypted);
      
      // 检查是否过期（24小时）
      if (Date.now() - credentials.timestamp > 24 * 60 * 60 * 1000) {
        this.clearCredentials();
        return null;
      }
      
      return {
        appKey: credentials.appKey,
        accessToken: credentials.accessToken
      };
    } catch (error) {
      console.error('获取凭据失败:', error);
      this.clearCredentials();
      return null;
    }
  }
  
  // 清理凭据
  clearCredentials() {
    localStorage.removeItem('encrypted_credentials');
    
    // 清理内存中的敏感数据
    if (this.encryptionKey) {
      this.encryptionKey.fill(0);
    }
  }
  
  // 简单加密（实际应用中应使用更强的加密）
  encrypt(text) {
    // 这里应实现真正的加密算法
    return btoa(text);
  }
  
  // 简单解密
  decrypt(encrypted) {
    return atob(encrypted);
  }
}
```

### 2. 请求安全验证

```javascript
// 请求安全验证器
class RequestSecurityValidator {
  constructor() {
    this.suspiciousActivityThreshold = 100; // 每分钟最大请求数
    this.requestHistory = [];
  }
  
  // 验证请求频率
  validateRequestFrequency() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // 清理旧记录
    this.requestHistory = this.requestHistory.filter(
      timestamp => timestamp > oneMinuteAgo
    );
    
    // 检查频率
    if (this.requestHistory.length > this.suspiciousActivityThreshold) {
      throw new Error('请求频率异常，可能存在安全风险');
    }
    
    this.requestHistory.push(now);
  }
  
  // 验证请求参数
  validateRequestParams(params) {
    // 检查SQL注入
    const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i;
    const stringParams = JSON.stringify(params);
    
    if (sqlInjectionPattern.test(stringParams)) {
      throw new Error('检测到潜在的SQL注入攻击');
    }
    
    // 检查XSS
    const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    if (xssPattern.test(stringParams)) {
      throw new Error('检测到潜在的XSS攻击');
    }
    
    // 验证股票代码格式
    if (params.symbols) {
      const invalidSymbols = params.symbols.filter(symbol => 
        !/^[A-Z0-9]+\.(HK|US|SZ|SH)$/.test(symbol)
      );
      
      if (invalidSymbols.length > 0) {
        throw new Error(`无效的股票代码格式: ${invalidSymbols.join(', ')}`);
      }
    }
  }
  
  // 生成请求签名
  generateRequestSignature(params, timestamp, secretKey) {
    const message = JSON.stringify(params) + timestamp;
    return crypto.createHmac('sha256', secretKey)
                 .update(message)
                 .digest('hex');
  }
  
  // 验证请求签名
  validateRequestSignature(params, timestamp, signature, secretKey) {
    const expectedSignature = this.generateRequestSignature(params, timestamp, secretKey);
    
    if (signature !== expectedSignature) {
      throw new Error('请求签名验证失败');
    }
    
    // 检查时间戳（防重放攻击）
    const now = Date.now();
    if (Math.abs(now - timestamp) > 300000) { // 5分钟
      throw new Error('请求时间戳过期');
    }
  }
}
```

### 3. 环境变量管理

```javascript
// 环境配置管理
class EnvironmentConfig {
  constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.loadConfig();
  }
  
  detectEnvironment() {
    if (typeof window !== 'undefined') {
      // 浏览器环境
      return window.location.hostname === 'localhost' ? 'development' : 'production';
    } else {
      // Node.js环境
      return process.env.NODE_ENV || 'development';
    }
  }
  
  loadConfig() {
    const configs = {
      development: {
        apiBaseUrl: 'http://localhost:3000/api/v1',
        enableLogging: true,
        enableDebug: true,
        requestTimeout: 10000,
        retryAttempts: 3
      },
      staging: {
        apiBaseUrl: 'https://staging-api.stockdata.com/api/v1',
        enableLogging: true,
        enableDebug: false,
        requestTimeout: 15000,
        retryAttempts: 3
      },
      production: {
        apiBaseUrl: 'https://api.stockdata.com/api/v1',
        enableLogging: false,
        enableDebug: false,
        requestTimeout: 20000,
        retryAttempts: 5
      }
    };
    
    return configs[this.environment] || configs.development;
  }
  
  get(key) {
    return this.config[key];
  }
  
  // 安全的凭据获取
  getSecureCredentials() {
    if (this.environment === 'development') {
      // 开发环境可以使用硬编码（仅用于测试）
      return {
        appKey: process.env.DEV_APP_KEY,
        accessToken: process.env.DEV_ACCESS_TOKEN
      };
    } else {
      // 生产环境必须从安全存储获取
      return this.getCredentialsFromSecureStorage();
    }
  }
  
  getCredentialsFromSecureStorage() {
    // 从安全密钥管理服务获取凭据
    // 例如: AWS Secrets Manager, Azure Key Vault 等
    throw new Error('请配置安全凭据存储');
  }
}

// 全局配置实例
const envConfig = new EnvironmentConfig();

// 使用示例
const apiClient = new StockAPIClient(envConfig.get('apiBaseUrl'));
apiClient.setTimeout(envConfig.get('requestTimeout'));
```

---

## 总结

本使用指南涵盖了认证系统的各种集成场景：

### ✅ 覆盖场景
- **Web应用** - React/JavaScript完整示例
- **移动应用** - React Native集成方案
- **服务端** - Node.js/Express代理服务
- **第三方应用** - Python SDK完整实现

### 🔧 核心特性
- **完整的错误处理** - 分类处理各种错误情况
- **智能重试机制** - 指数退避和频率限制处理
- **性能优化** - 缓存策略和批量处理
- **安全保护** - 凭据管理和请求验证

### 📚 实用工具
- 现成的代码模板和示例
- 最佳实践和安全建议
- 详细的错误处理方案
- 性能优化策略

开发者可以直接参考相应的代码示例快速集成认证系统，确保应用的安全性和稳定性！

---

*文档版本：v1.0.0*  
*最后更新：2025-07-01*