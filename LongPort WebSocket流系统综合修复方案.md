通过对代码的深入分析，我发现了以下核心问题：

  1. 多处初始化问题：
    - LongportStreamContextService 缺乏单例模式保障
    - 测试中可能创建多个实例，导致状态不一致
    - 不同组件间缺乏统一的初始化协调
  2. 重复订阅逻辑问题：
    - subscribedSymbols Set持久化保存已订阅符号
    - 即使WebSocket连接断开重连，系统仍认为符号"已订阅"
    - 连接状态与订阅状态不匹配时的处理逻辑有问题
  3. 订阅清理和退订问题：
    - 连接断开时不会自动清理订阅状态
    - cleanup() 方法实现不够彻底
    - 重连后无法恢复之前的订阅状态
  4. 状态不一致问题：
    - WebSocket连接状态与订阅状态不同步
    - isConnected 标志与实际SDK连接状态可能不一致
    - 缺乏状态验证和同步机制
  5. 数据流向不合规问题：
    - 当前直接从SDK获取数据后输出，跳过了合规的数据处理流程
    - 缺少符号格式验证与转换步骤
    - 缺少数据映射转换和标准化处理
    - 未通过统一的存储和查询组件输出数据

  🎯 修复方案设计

  1. 多处初始化问题修复

  核心策略：实现真正的单例模式，确保全局唯一实例

  具体方案：
  - 在LongportStreamContextService中实现严格的单例模式
  - 添加实例锁机制，防止并发初始化
  - 增加初始化状态跟踪，确保只初始化一次
  - 为测试环境提供实例重置机制

  实现要点：
  // 在LongportStreamContextService中添加：
  private static instance: LongportStreamContextService;
  private static initializationLock = false;
  private initializationStatus: 'not_started' | 'initializing' | 'completed' | 'failed' = 'not_started';

  public static getInstance(configService: ConfigService): LongportStreamContextService {
    if (!LongportStreamContextService.instance) {
      LongportStreamContextService.instance = new LongportStreamContextService(configService);
    }
    return LongportStreamContextService.instance;
  }

  2. 重复订阅逻辑修复

  核心策略：连接状态与订阅状态联动管理，避免无效的重复订阅

  具体方案：
  - 连接断开时自动清理订阅状态，因为SDK连接断开后所有订阅都会失效
  - 重连成功后根据需要重新建立订阅，而不是认为之前的订阅依然有效
  - 只有在WebSocket连接正常且未向SDK发起过订阅的符号才需要订阅
  - 实现订阅状态与连接状态的联动清理机制

  实现要点：
  private subscribedSymbols = new Set<string>();    // 当前连接下已向SDK订阅的符号
  private connectionId: string | null = null;            // 当前连接ID，用于检测连接变更
  
  // 连接断开时清理订阅状态
  private handleConnectionLost(): void {
    this.subscribedSymbols.clear();
    this.connectionId = null;
  }
  
  // 订阅前检查连接状态
  async subscribe(symbols: string[], subTypes: any[] = [SubType.Quote], isFirstPush: boolean = true)

  3. 订阅清理和退订逻辑完善

  核心策略：实现完整的生命周期管理，确保状态一致性

  具体方案：
  - 增强cleanup()方法，彻底清理所有状态
  - 实现连接断开时的自动清理机制
  - 添加优雅退订流程，确保SDK和本地状态同步
  - 连接重新建立时，根据实际需要重新订阅（而不是盲目恢复所有历史订阅）

  实现要点：
  async cleanup(): Promise<void> {
    // 1. 取消所有实际订阅
    // 2. 清理状态集合
    // 3. 重置连接标志
    // 4. 清理回调函数
    // 5. 重置初始化状态
  }

  private async handleConnectionLost(): Promise<void> {
    // 连接丢失时的自动清理
  }

  private async handleConnectionRestored(): Promise<void> {
    // 连接恢复时重置连接ID，订阅状态已在连接断开时清理
    // 等待上层组件根据实际需要发起新的订阅请求
  }

  4. 状态不一致问题解决

  核心策略：建立统一的状态管理机制，确保各层状态同步

  具体方案：
  - 实现状态同步验证机制
  - 添加定期状态检查任务
  - 建立连接状态与订阅状态的联动机制
  - 实现状态修复和自动恢复功能

  实现要点：
  interface ConnectionState {
    isConnected: boolean;
    isInitialized: boolean;
    lastConnectionTime: number;
    subscriptionCount: number;
    healthStatus: 'healthy' | 'degraded' | 'failed';
  }

  private async validateStates(): Promise<boolean> {
    // 验证连接状态与订阅状态的一致性
  }

  private startStateMonitoring(): void {
    // 启动定期状态监控
  }

  5. 健康监控和自动恢复机制

  核心策略：实现智能健康监控，支持自动故障恢复

  具体方案：
  - 实现连接健康度检测
  - 添加订阅状态健康监控
  - 实现自动重连和重新订阅机制
  - 提供健康状态报告接口

  实现要点：
  interface HealthMetrics {
    connectionUptime: number;
    subscriptionSuccess: number;
    subscriptionFailures: number;
    lastDataReceived: number;
    averageLatency: number;
  }

  private healthMonitor: {
    start(): void;
    stop(): void;
    getReport(): HealthMetrics;
    shouldReconnect(): boolean;
  }

  5. 数据流向合规化改造

  核心策略：遵循7组件架构，确保实时流数据经过完整的合规处理流程

  具体方案：
  - 在StreamReceiverService中集成SymbolMapper进行符号验证和转换
  - 通过DataMapper获取字段映射规则
  - 使用Transformer进行数据标准化转换
  - 直接输出标准化数据，跳过Storage持久化步骤（保证实时性）
  - 确保实时流数据与REST API数据格式一致

  完整数据流向（遵循7组件架构）：
  
  ```
  sequenceDiagram
      participant Client as 测试客户端
      participant Gateway as StreamReceiverGateway  
      participant Service as StreamReceiverService
      participant SymbolMapper as SymbolMapper
      participant DataMapper as DataMapper
      participant Transformer as Transformer
      participant Capability as stream-stock-quote
      participant Context as LongportStreamContextService
      participant SDK as LongPort SDK
      Client->>Gateway: emit("subscribe", {symbols: ["00700.HK"]})
      Gateway->>Service: subscribeSymbols()
      
      Note over Service: 1. 符号合规检查与转换
      Service->>SymbolMapper: validateAndMapSymbols(["00700.HK"])
      SymbolMapper-->>Service: {valid: ["00700"], mapped: {"00700.HK": "00700"}}
      
      Note over Service: 2. 检查连接状态并初始化
      Service->>Capability: isConnected(contextService)
      Capability->>Context: isWebSocketConnected()
      Context-->>Capability: false (首次)
      Service->>Capability: initialize(contextService)
      Capability->>Context: initializeWebSocket()
      Context->>SDK: QuoteContext.new(config)
      Context->>SDK: setOnQuote(callback)
      Context-->>Service: 初始化完成
      
      Note over Service: 3. 设置数据处理管道
      Service->>Context: onQuoteUpdate(processStreamData)
      Service->>DataMapper: getMappingRules('longport', 'quote_fields')
      DataMapper-->>Service: mappingRules
      
      Note over Service: 4. 发起SDK订阅
      Service->>Capability: subscribe(["00700"], contextService)
      Capability->>Context: subscribe(["00700"])
      Context->>SDK: quoteContext.subscribe(["00700"], [SubType.Quote], true)  
      Context->>Context: subscribedSymbols.add("00700")

      Note over SDK: 5. SDK接收实时数据
      SDK->>Context: onQuote回调触发(rawData)
      Context->>Context: handleQuoteUpdate(rawData)
      Context->>Context: parseLongportQuoteEvent(rawData)
      
      Note over Service: 6. 实时数据处理流程（跳过Storage，保证实时性）
      Context->>Service: processStreamData(parsedData)
      Service->>SymbolMapper: mapFromProvider(parsedData.symbol, 'longport')
      SymbolMapper-->>Service: standardSymbol
      Service->>Transformer: transformSingle(parsedData, mappingRules)
      Transformer-->>Service: transformedData
      
      Note over Service: 7. 直接输出标准化数据
      Service->>Gateway: messageCallback(transformedData)
      Gateway->>Client: emit("data", transformedData)
  ```

  实现要点：
  class StreamReceiverService {
    constructor(
      private symbolMapperService: SymbolMapperService,
      private dataMapperService: DataMapperService,
      private transformerService: TransformerService,
    ) {}

    private async processStreamData(rawData: any): Promise<any> {
      // 1. 符号格式转换
      const mappedSymbol = await this.symbolMapperService.mapFromProvider(rawData.symbol, 'longport');
      
      // 2. 获取数据映射规则
      const mappingRules = await this.dataMapperService.getMappingRules('longport', 'quote_fields');
      
      // 3. 数据转换和标准化
      const transformedData = await this.transformerService.transformSingle(rawData, mappingRules);
      
      // 4. 直接输出（跳过Storage存储，保证实时性）
      return transformedData;
    }
  }

  🔧 实施计划

  阶段1：单例模式重构（优先级：高）

  1. 重构LongportStreamContextService实现单例模式
  2. 修改所有依赖注入点使用单例实例
  3. 更新测试用例支持单例模式
  4. 验证单例模式在不同场景下的正确性

  阶段2：订阅逻辑重构（优先级：高）

  1. 实现连接状态与订阅状态联动清理机制
  2. 修复重复订阅判断逻辑，基于当前连接状态
  3. 添加订阅状态验证机制
  4. 更新相关接口和测试用例

  阶段3：生命周期管理完善（优先级：高）

  1. 增强清理和退订逻辑
  2. 实现连接状态事件处理
  3. 添加状态恢复机制
  4. 完善错误处理和日志记录

  阶段4：状态同步机制（优先级：高）

  1. 建立统一状态管理体系
  2. 实现状态验证和同步功能
  3. 添加状态监控和报告
  4. 测试各种异常场景

  阶段5：数据流向合规化改造（优先级：高）

  1. 在StreamReceiverService中集成核心组件：SymbolMapper、DataMapper、Transformer
  2. 实现实时数据处理流程：符号转换→数据映射→转换→直接输出（跳过Storage）
  3. 确保实时流数据格式与REST API一致
  4. 更新测试用例验证数据流向正确性

  阶段6：健康监控系统（优先级：中）

  1. 实现健康监控机制
  2. 添加自动恢复功能
  3. 提供监控接口和指标
  4. 性能优化和调优

  阶段7：全面测试验证（优先级：高）

  1. 修复现有测试用例
  2. 添加新的测试场景覆盖
  3. 进行压力测试和稳定性测试
  4. 验证修复效果和性能指标

  📊 预期效果

  修复后预期达到的效果：

  1. 稳定性改善：
    - 消除多实例初始化问题
    - 解决订阅状态不一致导致的失败
    - 提高连接稳定性和可靠性
  2. 功能完善：
    - 支持连接状态与订阅状态的正确联动
    - 实现完整的生命周期管理
    - 提供健康监控和自动恢复
  3. 测试通过率：
    - 提高E2E测试通过率至90%以上
    - 消除随机性测试失败
    - 确保测试结果可重现
  4. 性能优化：
    - 减少不必要的重复订阅
    - 优化连接管理开销
    - 提高数据处理效率

  🛡️ 风险控制

  潜在风险及应对措施：

  1. 兼容性风险：现有功能可能受到影响
    - 应对：分阶段实施，保持向后兼容
    - 验证：在每个阶段进行完整回归测试
  2. 性能风险：新增监控机制可能影响性能
    - 应对：使用异步处理和可配置的监控频率
    - 验证：进行性能基准测试对比
  3. 复杂性风险：系统复杂度增加可能引入新问题
    - 应对：保持代码简洁，增强文档和注释
    - 验证：代码审查和充分的单元测试覆盖

  这个综合修复方案将系统性地解决LongPort WebSocket流系统中的核心问题，提高系统的稳定性、可靠性和可维护性。
