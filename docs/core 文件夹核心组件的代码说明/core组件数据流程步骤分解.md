工作流程流转

**正确的数据流程**: Request → Receiver(内含SDK调用) → Transformer → Storage → Response
**关键纠正**: 第三方SDK数据获取发生在Receiver组件内部，不是独立步骤

1. Receiver 组件 - 请求入口、路由和数据获取

  **🎯 第三方SDK调用在此组件内部完成**
  
  - 端点: POST /api/v1/receiver/data
  - 认证: API Key验证 (X-App-Key + X-Access-Token)
  - 市场推断: 700.HK → Market.HK (基于.HK后缀)
  - 提供商选择: 通过CapabilityRegistryService选择longport
  - 数据类型映射: "stock-quote" → "get-stock-quote"
  - **🔥 原始数据获取**: 在executeDataFetching()方法中调用capability.execute()
  - **🔥 SDK调用**: 通过LongportContextService调用LongPort SDK (ctx.quote())
  - **🔥 原始数据处理**: 获取第三方SDK返回的原始数据格式

  2. Symbol Mapper 组件 - 符号格式转换

  - 输入: ["700.HK"]
  - 转换逻辑: 查找LongPort专用映射规则
  - 输出: ["00700.HK"] (如有映射) 或保持 ["700.HK"]
  - 元数据: 记录转换成功率和处理时间
  - **注意**: 此组件在Receiver内部调用，用于SDK调用前的符号预处理

  3. Data Mapper 组件 - 字段映射规则

  - 规则查找: 获取longport+quote_fields的映射规则
  - 预设字段: 22个股票报价字段的标准化映射
  - 映射示例: secu_quote[].last_done → lastPrice
  - **注意**: 此组件提供映射规则，实际映射在Transformer中执行

  4. Transformer 组件 - 数据转换执行

  - **输入**: Receiver组件已获取的原始SDK数据
  - 字段转换: 应用Data Mapper提供的映射规则
  - 数据结构标准化: 转换为统一的响应格式
  - 符号还原: 将提供商符号还原为请求的原始符号
  - **注意**: 不负责获取原始数据，只负责数据转换

  5. Storage 组件 - 双存储策略

  - Redis缓存: 1秒TTL (交易时间) / 60秒TTL (非交易时间)
  - MongoDB持久化: 永久存储历史数据
  - 数据压缩: 大数据自动gzip压缩
  - 缓存键: receiver:realtime:longport:stock-quote:700.HK:

  6. Query 组件 - 查询和后台更新

  - 弱时效查询: 用于分析场景，支持5分钟数据新鲜度
  - 后台更新: 缓存命中后异步更新数据
  - 变化检测: 智能检测股价显著变化

  **技术实现细节 - SDK调用路径**

  ```typescript
  // 1. ReceiverService.handleRequest() - 主入口
  // 2. ReceiverService.executeDataFetching() - 数据获取
  // 3. capability.execute() - 调用Provider能力
  // 4. LongportContextService.getQuoteContext() - 获取SDK上下文  
  // 5. ctx.quote(symbols) - 实际LongPort SDK调用
  ```

  **关键文件路径**:
  - SDK调用: `src/core/receiver/services/receiver.service.ts:690`
  - Provider能力: `src/providers/longport/capabilities/get-stock-quote.ts:36`
  - SDK上下文: `src/providers/longport/services/longport-context.service.ts:36`

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

