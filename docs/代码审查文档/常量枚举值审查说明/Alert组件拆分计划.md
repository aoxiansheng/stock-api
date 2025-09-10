🎯 Alert & Notification 模块拆分方案

 

  📊 当前问题分析

  当前 alert 模块违反了单一职责原则，承担了太多功能：

  src/alert/
  ├── 警告核心功能 (应保留在alert模块)
  │   ├── rule-engine.service.ts      # 规则引擎
  │   ├── alerting.service.ts         # 警告服务
  │   ├── alert-history.service.ts    # 警告历史
  │   └── alert.controller.ts         # 警告控制器
  │
  ├── 通知相关功能 (应迁移到notification模块)
  │   ├── notification.service.ts     # 通知服务
  │   ├── notification-senders/       # 通知发送器
  │   ├── dto/notification-channels/  # 通知渠道DTO
  │   └── schemas/notification-log.schema.ts
  │
  └── 混合功能 (需要拆分)
      ├── constants/                  # 常量需要拆分
      ├── types/                      # 类型需要拆分
      └── utils/                      # 工具需要拆分

  🏗️ 拆分架构设计

  1. Alert 模块 (保留并精简)

  src/alert/
  ├── controllers/
  │   └── alert.controller.ts         # 警告REST API
  ├── services/
  │   ├── alerting.service.ts         # 警告业务逻辑
  │   ├── alert-history.service.ts    # 警告历史管理
  │   └── rule-engine.service.ts      # 规则评估引擎
  ├── dto/
  │   ├── alert.dto.ts                # 警告相关DTO
  │   ├── alert-rule.dto.ts           # 警告规则DTO
  │   └── alert-history.dto.ts        # 警告历史DTO
  ├── schemas/
  │   ├── alert.schema.ts             # 警告数据模型
  │   ├── alert-rule.schema.ts        # 规则数据模型
  │   └── alert-history.schema.ts     # 历史数据模型
  ├── types/
  │   └── alert.types.ts              # 警告相关类型
  ├── constants/
  │   ├──  alert.constants.ts          # 警告相关常量
  │   └──  base-values.constants.ts  
  ├── events/                         # 🆕 事件定义
  │   └── alert.events.ts
  ├── config/                         # 配置文件
  │   └── alert.config.ts  
  └── alert.module.ts

  职责：
  - 警告规则管理 (CRUD)
  - 警告评估和生成
  - 警告状态管理 (firing, resolved, suppressed)
  - 警告历史记录
  - 发出警告事件 (关键：与notification解耦)

  2. Notification 模块 (新建)

  src/notification/
  ├── controllers/
  │   └── notification.controller.ts  # 通知REST API
  ├── services/
  │   ├── notification.service.ts     # 通知编排服务
  │   ├── notification-history.service.ts # 通知历史
  │   └── senders/                     # 通知发送器
  │       ├── email.sender.ts
  │       ├── webhook.sender.ts
  │       ├── slack.sender.ts
  │       ├── dingtalk.sender.ts
  │       └── sms.sender.ts
  ├── dto/
  │   ├── notification.dto.ts         # 通知相关DTO
  │   └── channels/                    # 各渠道DTO
  │       ├── email-notification.dto.ts
  │       ├── webhook-notification.dto.ts
  │       └── ...
  ├── schemas/
  │   ├── notification.schema.ts      # 通知数据模型
  │   ├── notification-channel.schema.ts # 渠道配置
  │   └── notification-log.schema.ts  # 通知日志
  ├── types/
  │   └── notification.types.ts       # 通知相关类型
  ├── constants/
  │   └── notification.constants.ts   # 通知相关常量
  ├── listeners/                      # 🆕 事件监听器
  │   └── alert-event.listener.ts    # 监听警告事件
  └── notification.module.ts

  职责：
  - 通知渠道管理 (email, webhook, SMS等)
  - 通知模板管理
  - 通知发送编排和重试
  - 通知历史和状态跟踪
  - 监听警告事件并发送通知

  🔄 模块间通信设计

  事件驱动架构 (推荐)

  // src/alert/events/alert.events.ts
  export class AlertFiredEvent {
    constructor(
      public readonly alert: Alert,
      public readonly rule: AlertRule,
      public readonly context: AlertContext
    ) {}
  }

  export class AlertResolvedEvent {
    constructor(
      public readonly alert: Alert,
      public readonly resolvedAt: Date
    ) {}
  }

  // src/alert/services/alerting.service.ts  
  @Injectable()
  export class AlertingService {
    constructor(private eventEmitter: EventEmitter2) {}

    async processAlert(alert: Alert, rule: AlertRule) {
      // 警告处理逻辑
      await this.saveAlert(alert);

      // 🎯 发出事件，不直接调用通知服务
      this.eventEmitter.emit('alert.fired', new AlertFiredEvent(alert, rule));
    }
  }

  // src/notification/listeners/alert-event.listener.ts
  @Injectable()
  export class AlertEventListener {
    constructor(private notificationService: NotificationService) {}

    @OnEvent('alert.fired')
    async handleAlertFired(event: AlertFiredEvent) {
      await this.notificationService.sendNotifications(
        event.alert,
        event.rule
      );
    }

    @OnEvent('alert.resolved')
    async handleAlertResolved(event: AlertResolvedEvent) {
      await this.notificationService.sendResolutionNotifications(event.alert);
    }
  }

  📋 迁移执行计划



⏺ Phase 1: 准备阶段 🛠️

  1. 创建事件系统
  # 在alert模块添加事件定义
  src/alert/events/alert.events.ts
  2. 创建notification模块骨架
  mkdir -p src/notification/{controllers,services,dto,schemas,types,constants,listeners}

  Phase 2: 迁移通知功能 📦

  1. 迁移通知发送器
  # 从 alert/services/notification-senders/ 迁移到
  # notification/services/senders/
  2. 迁移通知相关DTO和Schema
  # notification-channels/ -> notification/dto/channels/  
  # notification-log.schema.ts -> notification/schemas/
  3. 拆分常量和类型
  // 拆分 alert/constants/messages.ts 中的通知相关常量
  // 迁移到 notification/constants/notification.constants.ts

  Phase 3: 重构通信机制 🔄

  1. 在Alert服务中添加事件发射
  // 替换直接调用通知服务 -> 发出事件
  await this.notificationService.send() // ❌ 移除
  this.eventEmitter.emit('alert.fired', event) // ✅ 添加
  2. 在Notification模块添加事件监听器
  // 监听alert事件并处理通知发送
  @OnEvent('alert.fired')
  async handleAlertFired(event: AlertFiredEvent)

  Phase 4: 更新依赖和测试 ✅

  1. 更新模块依赖关系
  // app.module.ts 添加 NotificationModule
  // 确保事件系统正确配置
  2. 更新测试文件
  # 分离测试文件到对应模块
  # 添加事件驱动的集成测试

  🎯 拆分后的优势

  1. 职责清晰

  - Alert: 专注警告逻辑，不关心如何通知
  - Notification: 专注通知发送，不关心警告规则

  2. 可维护性提升

  - 独立开发和部署
  - 单独的测试策略
  - 更容易的代码审查

  3. 扩展性增强

  - Notification模块可被其他模块复用 (如系统通知、用户消息等)
  - 新增通知渠道只需修改Notification模块
  - 新增警告规则只需修改Alert模块

  4. 性能优化

  - 可以独立优化通知发送性能
  - 支持异步通知发送
  - 可以添加消息队列缓冲



⏺ 💡 推荐拆分方案总结

  我强烈建议进行这个拆分，因为它符合以下设计原则：

  1. 单一职责原则 - 每个模块专注一个核心功能
  2. 开闭原则 - 易于扩展新的通知渠道或警告规则
  3. 依赖倒置 - 通过事件接口解耦，而非直接依赖
  4. 关注点分离 - 警告生成与通知发送完全分离

  🚀 建议的实施方式

  选择事件驱动架构，因为：
  - ✅ 完全解耦 - Alert和Notification模块零依赖
  - ✅ 异步处理 - 通知发送不阻塞警告处理
  - ✅ 易于扩展 - 可以轻松添加新的事件监听器
  - ✅ 容错性强 - 通知失败不影响警告生成
  - ✅ 可观测性 - 事件流便于监控和调试

 