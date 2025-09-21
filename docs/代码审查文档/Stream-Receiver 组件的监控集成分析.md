分析结果：Stream-Receiver 组件监控集成

  经过详细分析，Stream-Receiver 组件的监控集成存在混合实现，部分正确，部分需要改进：

  ✅ 优点（符合事件驱动架构）

  1. 正确的架构设计

  constructor(
    private readonly eventBus: EventEmitter2,  // ✅ 只注入事件总线
    // ✅ 移除违规的直接 CollectorService 依赖，改用事件化监控
  )
  注释明确表明已移除直接的 CollectorService 依赖

  2. 标准的事件发送方法

  private emitMonitoringEvent(
    metricName: string,
    metricValue: number,
    tags: Record<string, any> = {},
  ): void {
    setImmediate(() => {  // ✅ 异步处理
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream_receiver",
        metricType: "performance",
        metricName,
        metricValue,
        tags: { component: "stream-receiver", ...tags }
      });
    });
  }

  3. 丰富的监控覆盖

  - ✅ 管道性能监控 (pipeline_processed)
  - ✅ 延迟监控 (stream_latency)
  - ✅ 批处理监控 (batch_processed)
  - ✅ 动态配置监控 (batch_interval_adjusted)
  - ✅ 错误监控 (ERROR_HANDLED, CRITICAL_ERROR)

  4. 业务监控分离

  private emitBusinessEvent(
    metricName: string,
    metricValue: number = 1,
    tags: Record<string, any> = {},
  ): void {
    // 专门的业务指标发送方法
    metricType: "business"
  }

  ❌ 问题与改进建议

  1. WebSocket Gateway 缺少监控

  // ❌ Gateway 中缺少监控集成
  async handleConnection(client: Socket) {
    // 只有日志，没有监控事件
    this.logger.log("WebSocket 客户端连接", { clientId: client.id });
  }

  async handleDisconnect(client: Socket) {
    // 只有日志，没有监控事件  
    this.logger.log("WebSocket 客户端断开连接", { clientId: client.id });
  }

  建议修改：
  // ✅ 应该添加连接监控
  async handleConnection(client: Socket) {
    // 发送连接监控事件到 StreamReceiverService
    this.streamReceiverService.recordWebSocketConnection(client.id, true);

    this.logger.log("WebSocket 客户端连接", { clientId: client.id });
    client.emit("connected", StreamResponses.connected(client.id));
  }

  async handleDisconnect(client: Socket) {
    // 发送断开连接监控事件
    this.streamReceiverService.recordWebSocketConnection(client.id, false);

    this.logger.log("WebSocket 客户端断开连接", { clientId: client.id });
  }

  2. 遗留的直接服务调用注释

  // ❌ 存在遗留注释
  // ✅ 使用CollectorService记录流数据延迟指标
  这些注释应该更新为事件驱动方式的描述。

  3. 监控失败处理不一致

  // ✅ 好的实现
  } catch (error) {
    this.logger.warn("业务监控事件发送失败", {
      metricName,
      error: error.message,
    });
  }

  // ❌ 缺少错误处理的地方
  private emitMonitoringEvent(...) {
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          // ...
        });
      } catch (error) {
        // ❌ 缺少错误处理
      }
    });
  }

