工作流程流转

1. Receiver 组件 - 请求入口和路由

  - 端点: POST /api/v1/receiver/data
  - 认证: API Key验证 (X-App-Key + X-Access-Token)
  - 市场推断: 700.HK → Market.HK (基于.HK后缀)
  - 提供商选择: 通过CapabilityRegistryService选择longport
  - 数据类型映射: "stock-quote" → "get-stock-quote"

  2. Symbol Mapper 组件 - 符号格式转换

  - 输入: ["700.HK"]
  - 转换逻辑: 查找LongPort专用映射规则
  - 输出: ["00700.HK"] (如有映射) 或保持 ["700.HK"]
  - 元数据: 记录转换成功率和处理时间

  3. Data Mapper 组件 - 字段映射规则

  - 规则查找: 获取longport+stock-quote的映射规则
  - 预设字段: 22个股票报价字段的标准化映射
  - 映射示例: secu_quote[].last_done → lastPrice

  4. Transformer 组件 - 数据转换执行

  - 原始数据获取: 调用LongPort SDK获取实时报价
  - 字段转换: 应用映射规则转换字段名和数据结构
  - 符号还原: 将提供商符号还原为请求的原始符号

  5. Storage 组件 - 双存储策略

  - Redis缓存: 1秒TTL (交易时间) / 60秒TTL (非交易时间)
  - MongoDB持久化: 永久存储历史数据
  - 数据压缩: 大数据自动gzip压缩
  - 缓存键: receiver:realtime:longport:stock-quote:700.HK:

  6. Query 组件 - 查询和后台更新

  - 弱时效查询: 用于分析场景，支持5分钟数据新鲜度
  - 后台更新: 缓存命中后异步更新数据
  - 变化检测: 智能检测股价显著变化

  最终响应数据结构

  {
    "statusCode": 200,
    "message": "强时效数据获取成功",
    "data": {
      "data": [{
        "symbol": "700.HK",
        "lastPrice": 385.6,
        "previousClose": 389.8,
        "openPrice": 387.2,
        "highPrice": 390.1,
        "lowPrice": 384.5,
        "volume": 12345600,
        "turnover": 4765432100,
        "timestamp": 1704110400000,
        "tradeStatus": 1
      }],
      "metadata": {
        "provider": "longport",
        "processingTime": 23,
        "cacheUsed": false,
        "cacheTTL": 1
      }
    }
  }

