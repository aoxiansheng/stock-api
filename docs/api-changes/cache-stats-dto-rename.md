# CacheStatsDto Swagger 变更记录

## 重命名详情

### 变更内容
- **旧名称**: `CacheStatsDto`
- **新名称**: `RedisCacheRuntimeStatsDto`
- **变更原因**: 解决与 `StorageCacheStatsDto` 的命名冲突

### API文档影响

#### 1. OpenAPI Schema 更新
- 所有引用 `CacheStatsDto` 的 schema 已更新为 `RedisCacheRuntimeStatsDto`
- API响应示例已同步更新
- Swagger UI 显示正确的新类名

#### 2. 字段保持不变
以下字段保持完全相同，不影响API兼容性：
- `hits: number`
- `misses: number` 
- `hitRate: number`
- `memoryUsage: number`
- `keyCount: number`
- `avgTtl: number`

#### 3. 向后兼容性
- API端点路径保持不变
- 响应格式保持不变
- 只有内部类型名称发生变化

### 验证清单
- [x] 所有 @ApiProperty 引用已更新
- [x] Swagger UI 显示正确
- [x] OpenAPI 规范文件正确
- [x] 测试覆盖新类名
- [x] 序列化/反序列化正常

---
*变更时间: 2025-09-01T16:49:59.738Z*
*影响级别: 内部重构，无API破坏性变更*
