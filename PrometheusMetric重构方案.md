# 📈 PrometheusMetric 重构方案

> 目的：彻底淘汰旧版自定义 `PrometheusMetric` 统计逻辑，统一迁移至官方 `prom-client` Registry，并简化业务层使用方式。

---

## 1. 现状概览

1. `prom-client` 已在 `prometheus-metrics-registry.service.ts` 中封装，但业务层仍保留大量 **内存统计 → 再写 Prometheus** 的双轨逻辑。
2. 极少量脚本 / 测试代码仍直接 `import { Counter … } from 'prom-client'`，未通过统一 Registry。
3. 指标命名、标签风格不完全一致，缺乏集中校验。

---

## 2. 重构目标

| 目标 | 说明 |
|------|------|
| 单一指标源 | 仅 `prom-client` Registry（单例）产生/维护指标，杜绝业务层直接 new Counter/Gauge。 |
| API 简约 | 提供轻量 `MetricsHelper`，业务只关心 `incCounter/observeHistogram` 等。 |
| 命名规范 | 统一前缀 `newstock_` + `snake_case`，强制公共标签 `(app, version)`。 |
| 零重复统计 | 删除所有“内存计数再同步 Prometheus”逻辑。 |
| 可灰度回滚 | Registry 提供 `legacyMode`，必要时同步到旧统计对象。 |

---

## 3. 阶段化执行计划

### 阶段 I：现状梳理 
1. `grep "from 'prom-client'"` 收集直接依赖清单。
2. 统计自维护计数/数组的服务文件。

### 阶段 II：统一 Metrics Registry
1. 将 `prometheus-metrics-registry.service.ts` 移至 `src/monitoring/metrics/metrics-registry.service.ts` 并命名 `MetricsRegistryService`。
2. 保证 **单例**：在 `MonitoringModule.forRoot()` 中 `providers:[MetricsRegistryService]` + `exports`。
3. 新增包装函数：

```ts
export function createCounter(name: string, help: string, labels: string[] = []) {
  return new Counter({ name, help, labelNames: [...labels, 'app', 'version'], registers: [registry] });
}
```

### 阶段 III：业务层 API 收敛
1. 创建 `metrics-helper.ts`：

```ts
export const Metrics = {
  inc(registry: MetricsRegistryService, name: string, labels?: object) {
    registry.getCounter(name)?.inc(labels);
  },
  setGauge(registry: MetricsRegistryService, name: string, value: number, labels?: object) {
    registry.getGauge(name)?.set(labels, value);
  },
  observe(registry: MetricsRegistryService, name: string, value: number, labels?: object) {
    registry.getHistogram(name)?.observe(labels, value);
  }
};
```

2. 在 `StreamPerformanceMetrics` / `DynamicLogLevelService` 等处：
   - 删除本地 `this.totalProcessingTime` 等冗余字段。
   - 直接调用 `Metrics.inc / setGauge / observe` 更新指标。

### 阶段 IV：清理历史代码
1. 全局 `grep`，替换脚本与测试中对 `prom-client` 的直接引用。
2. 在 CI 中加入 ESLint 自定义 rule：**禁止**项目根以外目录直接 `import 'prom-client'`。

### 阶段 V：命名与标签规范
1. 新增 `docs/monitoring/prometheus-metrics.md`：
   - 命名格式：`newstock_<domain>_<action>_<unit>`。
   - 标签最少 `(app, version)`，可扩展业务维度。
2. 发布内部 ESLint plugin：检测 Counter/Gauge 名称 & label 使用。

### 阶段 VI：回滚策略
1. `MetricsRegistryService` 暴露 `legacyMode` 环境变量：
   - 开启时将 Counter/Gauge 更新镜像写入旧内存统计对象，保证历史代码可读取。
   - 关闭后仅走 prom-client。

### 阶段 VII：验证与自动化
1. **E2E**：启动 Nest 应用，请求 `/monitor/metrics`，校验核心指标存在且值递增。
2. **k6 压测**：监控 P95 延迟 & 指标吞吐，确保重构不降性能。
3. **CI**：
   - 执行 lint rule；
   - 运行 e2e & 单元测试；
   - 阻断任何新的 direct prom-client import。

---

## 4. TODO 列表

| # | 任务 | Owner | 状态 |
|---|------|-------|------|
| 1 | 创建 `MonitoringModule` 与 `MetricsRegistryService` 单例 | Backend Dev | ⬜ |
| 2 | 实现 `metrics-helper.ts` 并在业务层替换 | Backend Dev | ⬜ |
| 3 | 删除冗余内存统计 & 双写逻辑 | Backend Dev | ⬜ |
| 4 | 全局 grep 清理 `prom-client` 直接引用 | Backend Dev | ⬜ |
| 5 | 添加 ESLint 规则 & CI 校验 | DevOps | ⬜ |
| 6 | 编写 e2e/k6 监控测试脚本 | QA | ⬜ |
| 7 | 编写文档 `prometheus-metrics.md` | Tech Writer | ⬜ |
| 8 | 灰度发布 & 观察指标一致性 | DevOps | ⬜ |

## 5. 补充注意事项

> 以下细节在原方案中未显式说明，但在实际迁移落地时至关重要，需同步纳入排期与评审。

1. **依赖注入与命名迁移**：移动 Registry 文件后，需批量替换所有 `PrometheusMetricsRegistry` Import & Provider 为 `MetricsRegistryService`，并更新各 Module 的 `providers / exports`。「暂时不予实现」
2. **/metrics 公开策略与安全**：Prometheus 抓取节点通常无法携带 JWT。需在 `main.ts` 或 Ingress 层暴露一个可匿名或 BasicAuth 保护的 `/internal/metrics` 端点，或在 ServiceMonitor 配置白名单。「暂时不予实现」
3. **多进程 / Cluster 支持**：若未来使用 PM2/Nest Cluster，每个 Worker 的 Registry 需通过 `aggregatorRegistry` 汇总，避免指标重复或丢失。「暂时不予实现」
4. **内存统计字段删除清单**：列出待移除字段（如 `totalProcessingTime / batchCount / cacheHits …`）并制定回滚方案，确保功能无副作用。「暂时不予实现」
5. **告警阈值与 Dashboard 迁移**：指标命名变动后，需同步更新 Grafana 面板与 Alertmanager 规则，并规划灰度观测窗口。「暂时不予实现」
6. **历史数据保留策略**：明确 `legacyMode` 保留周期及关闭条件，记录迁移时间点，避免趋势断层。
7. **性能回归基线**：为 k6 压测设定 KPI（P95 ≤ 20 ms、吞吐 ≥ 4 k rps、Registry 内存≤50 MB 等）并在 CI 自动比较。
8. **Kubernetes 探针调整**：如 `/metrics` 路径或端口变更，需同步修正 Helm Chart 中的 `livenessProbe / readinessProbe`。
9. **ESLint Rule 细节**：记录自定义 Rule 名称、插件包、CI 命令（如 `npm run lint:metrics`），并给出示例报错信息。「暂时不予实现」
10. **变更沟通与发布计划**：补充团队培训、分阶段灰度、回滚操作手册及外部依赖方（数据平台、监控团队）通知流程。

---

> 按此路线逐步执行，即可在不影响线上监控的前提下完成 Prometheus 指标体系统一重构。
