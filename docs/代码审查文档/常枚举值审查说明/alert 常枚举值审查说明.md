# alert 常枚举值审查说明

## 1. 枚举与常量重复/未使用审查

### 1.1 识别范围
- 路径：`backend/src/alert/**`
- 类型：`export const ... as const` 的枚举式对象、常量对象组，以及与之相关的类型定义。

### 1.2 发现的重复项（定义完全相同/语义重叠）

#### 二次审核发现的关键重复项
**🚨 跨组件严重性级别重复冲突：**
- `AlertSeverity` (types) vs `ALERTING_SEVERITY_LEVELS` (constants) vs **`common/constants/error-messages.constants.ts` 中的类似错误级别定义**
- 不仅在 alert 模块内部存在双轨定义，与 common 模块的错误消息严重性也存在语义重叠
- **影响范围扩大**：这种不一致性影响整个系统的错误处理和告警分级

#### 原审核发现的重复项
- `src/alert/types/alert.types.ts` 的 `AlertSeverity` 与 `src/alert/constants/alerting.constants.ts` 的 `ALERTING_SEVERITY_LEVELS`
  - 前者值范围：`critical|warning|info`
  - 后者值范围：`critical|high|medium|low|info`
  - **二次审核加强建议**：不仅需要内部统一，还需要与 common 模块协调，建立全系统统一的严重性分级体系

### 1.3 未使用的常量/枚举键

#### 二次审核发现的跨组件未使用项关联
**🔍 跨组件审核发现的关联性：**
- alert 模块的 `NOTIFICATION_OPERATIONS` 中未使用的操作键与 `auth` 模块的 `AUTH_OPERATIONS` 存在模式相似性，说明系统中存在"操作常量过度定义"的通病
- cache 模块、monitoring 模块也存在类似的大量未使用操作常量定义
- **建议建立统一的操作常量清理标准**

#### 原审核发现的未使用项
- `src/alert/constants/notification.constants.ts`：
  - `NOTIFICATION_OPERATIONS` 中以下键未检索到使用：
    - `FORMAT_STRING`, `VALIDATE_CHANNEL_CONFIG`, `GET_SENDER_STATUS`, `PROCESS_NOTIFICATION_RESULT`, `HANDLE_NOTIFICATION_ERROR`
  - `NOTIFICATION_CONFIG`、`NOTIFICATION_TYPE_PRIORITY`、`NOTIFICATION_METRICS`、`NOTIFICATION_TIME_CONFIG`、`NOTIFICATION_ALERT_THRESHOLDS`：未检索到外部引用。
  - **二次审核补充**：这些未使用常量占用了大量内存空间，建议批量清理
- `src/alert/constants/alerting.constants.ts`：
  - `ALERTING_THRESHOLDS`、`ALERTING_RETRY_CONFIG`：未检索到外部引用。
  - `ALERTING_DEFAULT_STATS` 只在 `alerting.service.ts` 中用于初始化统计，合理保留。
  - 方法 `AlertingTemplateUtil.calculatePriorityScore` 未检索到直接调用。
- `src/alert/constants/alert-history.constants.ts`：
  - `ALERT_HISTORY_METRICS`、`ALERT_HISTORY_TIME_CONFIG`、`ALERT_HISTORY_THRESHOLDS`：未检索到外部引用。
  - `ALERT_STATUS_MAPPING` 与 `types.AlertStatus` 含义重叠（均提供 `FIRING|ACKNOWLEDGED|RESOLVED`），建议统一。

> 证据：通过全量静态检索（限定 `alert` 目录，排除 `constants` 自身）未匹配到使用位置。

### 1.4 未使用的渠道类型
- `NotificationChannelType.SMS`：仅在类型枚举中定义，未发现任何发送器或业务使用。

### 1.5 可能重复的操作名集合
- `ALERTING_OPERATIONS` 与 `ALERT_HISTORY_OPERATIONS`、`NOTIFICATION_OPERATIONS` 彼此语义边界清晰，未发现完全重复键值，但建议将操作名枚举下沉到各自模块并按需裁剪未用键。

---

## 2. 数据模型/类/表字段语义重复分析与合并建议

### 2.1 告警严重度枚举重复
- `AlertSeverity`（types）与 `ALERTING_SEVERITY_LEVELS`（constants）语义重叠，建议：
  - 统一到 `types.AlertSeverity`，如需 `high/medium/low` 粒度，在 `types` 扩展并替换调用方；删除 `ALERTING_SEVERITY_LEVELS`。

### 2.2 告警状态映射与状态值重复
- `ALERT_STATUS_MAPPING`（constants）与 `types.AlertStatus`（types）重复，建议：
  - 保留 `types.AlertStatus` 作为权威来源；删除 `ALERT_STATUS_MAPPING` 并替换引用（当前未外部使用，可直接移除）。

### 2.3 规则与历史字段间可能的重复信息
- `AlertHistory` 中包含 `ruleId` 与 `ruleName`。在保留反范式以便快速查询的前提下，两字段共同存在合理，但：
  - 若系统已有高效联表/缓存，可考虑仅存 `ruleId`，通过聚合/联查获取 `ruleName`。

### 2.4 `tags` 与 `metadata/context` 语义边界
- `tags: Record<string,string>` 与 `context/metadata: Record<string, any>` 并存：
  - `tags` 在查询筛选、索引中被使用（建有 `tags.environment/service` 索引）；
  - `context` 用于模版渲染与结果上下文；`metadata` 仅存在于 `NotificationLog`。
- 建议：
  - 保留 `tags`（查询友好、已建索引）；
  - 保留 `context`（渲染/业务上下文）；
  - `NotificationLog.metadata` 按需保留（当前未被读取逻辑使用，保留作扩展点）。

### 2.5 `createdBy` 字段使用性
- `AlertRule.createdBy` 在 schema 中存在但未发现服务使用。若审计需求明确，应在创建流程写入；否则考虑移除以简化模型。

---

## 3. 字段复杂性评估与删除/优化建议

### 3.1 候选删除/裁剪项（未使用或冗余）
- 常量组：
  - `NOTIFICATION_CONFIG`、`NOTIFICATION_TYPE_PRIORITY`、`NOTIFICATION_METRICS`、`NOTIFICATION_TIME_CONFIG`、`NOTIFICATION_ALERT_THRESHOLDS`（未被引用）。
  - `ALERTING_THRESHOLDS`、`ALERTING_RETRY_CONFIG`（未被引用）。
  - `ALERT_HISTORY_METRICS`、`ALERT_HISTORY_TIME_CONFIG`、`ALERT_HISTORY_THRESHOLDS`（未被引用）。
  - `ALERT_STATUS_MAPPING`（与 `AlertStatus` 重复）。
  - `NOTIFICATION_OPERATIONS` 中未用键：`FORMAT_STRING`、`VALIDATE_CHANNEL_CONFIG`、`GET_SENDER_STATUS`、`PROCESS_NOTIFICATION_RESULT`、`HANDLE_NOTIFICATION_ERROR`。
- 类型/字段：
  - `NotificationChannelType.SMS`（无发送器/引用，可暂移除或保留为未来占位并加注释）。
  - `AlertingTemplateUtil.calculatePriorityScore`（未被使用，可删除或在规则引擎中引入评分逻辑后再保留）。
  - `AlertRule.createdBy`（业务未使用，若无审计需求建议移除）。

> 原则：KISS、YAGNI。删除未使用项可降低维护成本与误导风险。

### 3.2 可简化项
- 统一操作名常量：仅保留实际使用的操作名，避免“万能操作枚举”。
- 统一严重度/状态来源到 `types`，减少跨文件查找成本。
- 模板正则常量已集中，保持良好；若未来只在 `notification.utils.ts` 使用，可内聚到对应工具附近并保留导出以供复用。

### 3.3 性能与可维护性影响
- 删除未使用常量将减少无意义的导入与静态检查负担；
- 保留 `tags` 并维持索引，有利于查询性能；
- 合并枚举定义减少歧义与分叉逻辑。

---

## 4. 具体改动建议清单

- 删除或精简（建议按优先级从上到下执行）：
  1) 删除 `ALERT_STATUS_MAPPING`，统一用 `types.AlertStatus`。
  2) 删除未引用的常量组：
     - `NOTIFICATION_CONFIG`、`NOTIFICATION_TYPE_PRIORITY`、`NOTIFICATION_METRICS`、`NOTIFICATION_TIME_CONFIG`、`NOTIFICATION_ALERT_THRESHOLDS`
     - `ALERTING_THRESHOLDS`、`ALERTING_RETRY_CONFIG`
     - `ALERT_HISTORY_METRICS`、`ALERT_HISTORY_TIME_CONFIG`、`ALERT_HISTORY_THRESHOLDS`
  3) 在 `NOTIFICATION_OPERATIONS` 中移除未用键：`FORMAT_STRING`、`VALIDATE_CHANNEL_CONFIG`、`GET_SENDER_STATUS`、`PROCESS_NOTIFICATION_RESULT`、`HANDLE_NOTIFICATION_ERROR`。
  4) 统一严重度：在 `types.AlertSeverity` 中扩展到 `critical|high|medium|low|info`（若业务需要），删除 `ALERTING_SEVERITY_LEVELS`，并替换使用处的取值与颜色映射。
  5) 评估 `AlertRule.createdBy`：若无用，移除 schema 与接口定义；如保留，完善创建链路写入。
  6) 若近期无计划支持短信，移除 `NotificationChannelType.SMS`，或保留并明确“未实现”的注释与校验。
  7) 若不引入优先级评分逻辑，删除 `AlertingTemplateUtil.calculatePriorityScore`。

---

## 5. 参考文件与证据（节选）
- `src/alert/constants/notification.constants.ts`
- `src/alert/constants/alerting.constants.ts`
- `src/alert/constants/alert-history.constants.ts`
- `src/alert/constants/alert.constants.ts`
- `src/alert/types/alert.types.ts`
- `src/alert/schemas/*.ts`
- `src/alert/services/*.ts`
- `src/alert/utils/notification.utils.ts`

（以上依据本次静态检索结果，若未来新增引用请据实调整） 