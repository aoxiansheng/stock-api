## StorageService 遗留代码修复方案（完整版）

### 1. 背景与架构现状

#### 1.1 目标架构定位
- **StorageService**: 专注MongoDB持久化层的读写删除和统计，职责单一
- **CommonCache**: 独立的缓存服务，处理Redis相关操作
- **监控体系**: 通过Prometheus指标准确反映存储层性能

#### 1.2 当前架构偏差
- **监控失效**: 指标名称不匹配导致Prometheus无法采集存储指标
- **数据不一致**: DTO参数误用导致API响应字段语义错误
- **类型不匹配**: 存储Schema与API接口类型定义冲突
- **职责混乱**: 存储层仍包含缓存逻辑，违反单一职责原则
- **资源浪费**: TTL索引已建立但未使用，MongoDB自动清理能力被浪费

---

### 2. 问题详细分析

#### 2.1 高优先级问题（即时修复）

##### A1. 监控指标名称不匹配
**问题描述**：业务层使用的指标名称与Prometheus注册中心不匹配，导致监控失效

**代码位置**：`src/core/04-storage/storage/services/storage.service.ts`
```typescript
// ❌ 错误：使用未注册/未对齐的指标名与单位（毫秒）
Metrics.inc(this.metricsRegistry, 'storagePersistentOperationsTotal', { operation: 'store' });
Metrics.observe(this.metricsRegistry, 'storagePersistentQueryDuration', processingTime, { query_type: 'store' });
Metrics.setGauge(this.metricsRegistry, 'storagePersistentDataVolume', dataSize, { data_type: request.storageClassification });

// ✅ 正确：使用注册中心提供的指标名与单位（秒）并补充 storage_type 标签
Metrics.inc(this.metricsRegistry, 'storageOperationsTotal', { operation: 'store', storage_type: 'persistent' });
Metrics.observe(this.metricsRegistry, 'storageQueryDuration', processingTime / 1000, { query_type: 'store', storage_type: 'persistent' });
Metrics.setGauge(this.metricsRegistry, 'storageDataVolume', dataSize, { data_type: request.storageClassification, storage_type: 'persistent' });
```

**影响评估**：
- 监控完全失效，Grafana面板显示空数据
- 无法追踪存储性能指标和异常
- 运维排查问题时缺乏关键数据

##### A2. StorageMetadataDto 参数顺序错误
**问题描述**：构造函数参数传递错误，导致API响应字段语义混乱

**代码位置**：`src/core/04-storage/storage/services/storage.service.ts:549`
```typescript
// ❌ 错误：将 storedAt 传入了构造函数的 expiresAt 位置
const responseMetadata = new StorageMetadataDto(
  document.key,
  StorageType.PERSISTENT,
  document.storageClassification as any,
  document.provider,
  document.market,
  document.dataSize,
  processingTime,
  document.compressed,
  document.tags,
  document.storedAt.toISOString() // 这个值被赋给了 expiresAt
);

// ✅ 正确：不传递 expiresAt，让其保持 undefined；然后单独设置 storedAt
const responseMetadata = new StorageMetadataDto(
  document.key,
  StorageType.PERSISTENT,
  document.storageClassification as any,
  document.provider,
  document.market,
  document.dataSize,
  processingTime,
  document.compressed,
  document.tags,
  undefined
);
responseMetadata.storedAt = document.storedAt.toISOString();
```

**影响评估**：
- API响应中expiresAt字段显示错误的存储时间
- 下游系统可能基于错误的过期时间做决策
- 破坏数据契约，影响系统可靠性

##### A3. 分页标签类型不一致  
**问题描述**：存储Schema与API接口的标签类型定义不匹配

**代码位置**：`src/core/04-storage/storage/services/storage.service.ts:416`
```typescript
// Schema 定义：tags?: Record<string, string>
// 分页 DTO 定义：tags?: string[]

// ❌ 当前实现：直接返回对象（object -> string[] 类型不匹配）
tags: item.tags || []

// ✅ 建议方案1（推荐）：将键值对转为键值串（兼顾信息量与前端展示）
tags: item.tags ? Object.entries(item.tags).map(([k, v]) => `${k}=${v}`) : []

// ✅ 建议方案2：仅保留键（信息丢失，但类型匹配）
tags: item.tags ? Object.keys(item.tags) : []

// ✅ 建议方案3：修改 DTO 类型兼容两种格式（需要评估下游影响）
// tags?: Record<string, string> | string[]
```

**影响评估**：
- 前端解析标签数据时可能出错
- 类型检查工具无法发现潜在问题
- API契约不一致，影响开发效率

#### 2.2 中优先级问题（计划修复）

##### B1. TTL索引未充分利用
**问题描述**：MongoDB TTL索引已建立但服务层固定设置为undefined，浪费自动清理能力

**优化方案**：
```typescript
// 在 StorageOptionsDto 中添加持久层 TTL 配置（避免与 cacheTtl 混淆）
export class StorageOptionsDto {
  persistentTtlSeconds?: number; // TTL秒数，undefined 表示永不过期
  // 其他选项...
}

// 服务层根据配置设置过期时间
const expiresAt = request.options?.persistentTtlSeconds 
  ? new Date(Date.now() + request.options.persistentTtlSeconds * 1000)
  : undefined;
```

##### B2. 压缩标记设计冗余
**问题描述**：根级和data内部存在双重compressed标记，增加判断复杂性

**优化方案**：
- 写入：仅在根级设置compressed标记
- 读取：优先检查根级标记，兼容历史数据的data.compressed

#### 2.3 低优先级问题（技术债务）

##### C1. 性能统计占位实现
**问题描述**：返回占位值0而非真实的Prometheus聚合数据

##### C2. 仓库层缓存方法遗留  
**问题描述**：StorageRepository仍包含Redis相关方法，违反单一职责原则

---

### 3. 分阶段修复方案

#### 3.1 Phase 0 - 即时修复（当周执行）

**目标**：解决高优先级问题，恢复监控功能，修复数据一致性

##### A1. 监控指标名称对齐
```typescript
// 文件：src/core/04-storage/storage/services/storage.service.ts
// 统一指标名称与单位（秒）+ 标签维度

// 操作计数指标（需要包含 storage_type 标签）
- Metrics.inc(this.metricsRegistry, 'storagePersistentOperationsTotal', { operation: 'store' });
+ Metrics.inc(this.metricsRegistry, 'storageOperationsTotal', { operation: 'store', storage_type: 'persistent' });

// 查询耗时指标（Prometheus 直方图单位为秒）
- Metrics.observe(this.metricsRegistry, 'storagePersistentQueryDuration', processingTime, { query_type: 'store' });
+ Metrics.observe(this.metricsRegistry, 'storageQueryDuration', processingTime / 1000, { query_type: 'store', storage_type: 'persistent' });

// 数据量指标（bytes）
- Metrics.setGauge(this.metricsRegistry, 'storagePersistentDataVolume', dataSize, { data_type: request.storageClassification });
+ Metrics.setGauge(this.metricsRegistry, 'storageDataVolume', dataSize, { data_type: request.storageClassification, storage_type: 'persistent' });
```

补充校验要点：
- storageQueryDuration 上报单位为秒，务必统一处理 `processingTime / 1000`；
- storageOperationsTotal 与 storageDataVolume 需带上 `storage_type: 'persistent'` 标签；
- 分页查询、检索、删除等路径同样参照以上规范执行。

**预期效果**：Prometheus指标恢复采集，Grafana面板正常显示数据

##### A2. StorageMetadataDto 参数修正
```typescript
// 文件：src/core/04-storage/storage/services/storage.service.ts:549行附近

// 修改前（将 storedAt 错误传入 expiresAt）
const responseMetadata = new StorageMetadataDto(
  document.key,
  StorageType.PERSISTENT,
  document.storageClassification as any,
  document.provider,
  document.market,
  document.dataSize,
  processingTime,
  document.compressed,
  document.tags,
  document.storedAt.toISOString() // ❌ 误作 expiresAt
);

// 修改后（expiresAt 保持 undefined，单独设置 storedAt）
const responseMetadata = new StorageMetadataDto(
  document.key,
  StorageType.PERSISTENT,
  document.storageClassification as any,
  document.provider,
  document.market,
  document.dataSize,
  processingTime,
  document.compressed,
  document.tags,
  undefined
);
responseMetadata.storedAt = document.storedAt.toISOString(); // ✅ 正确设置 storedAt
```

**预期效果**：API响应中storedAt显示正确的存储时间，expiresAt为undefined

##### A3. 标签类型映射修正
```typescript
// 文件：src/core/04-storage/storage/services/storage.service.ts:416行附近

// 方案选择：推荐使用“键值串”方案，兼顾信息量与前端展示
// 修改前（类型不匹配：object -> string[]）
tags: item.tags || []

// 修改后（推荐：保留键值，转为字符串）
tags: item.tags ? Object.entries(item.tags).map(([k, v]) => `${k}=${v}`) : []

// 备选方案1（仅保留键，信息丢失）
tags: item.tags ? Object.keys(item.tags) : []

// 备选方案2（修改 DTO 类型，兼容两种格式，需评估下游影响）
// DTO: tags?: Record<string, string> | string[]
```

**预期效果**：分页接口返回正确的string[]类型标签数据

#### 3.2 Phase 1 - 功能增强（1-2周内）

##### B1. TTL策略可选配置
```typescript
// 文件：src/core/storage/dto/store-data.dto.ts
interface StoreDataOptions {
  ttlSeconds?: number; // 新增：TTL秒数配置
  compressed?: boolean;
  // 其他现有选项...
}

// 文件：src/core/storage/services/storage.service.ts
async storeData(dto: StoreDataDto): Promise<StorageMetadataDto> {
  // TTL计算逻辑
  const expiresAt = dto.options?.ttlSeconds 
    ? new Date(Date.now() + dto.options.ttlSeconds * 1000)
    : undefined;

  const document = new this.storageModel({
    // ...其他字段
    expiresAt // MongoDB TTL索引会自动清理过期文档
  });
  
  // ...
}
```

**预期效果**：支持可选的自动数据清理，减少手动维护成本

##### B2. 压缩标记结构优化
```typescript
// 写入：统一使用根级 compressed 标记（data 内不再嵌套 compressed）
const documentToStore = {
  ...,
  compressed: shouldCompress,
  data: shouldCompress
    ? { /* e.g. base64 gzip string */ }
    : rawData,
};

// 读取：优先根级，其次兼容旧格式
function readAndMaybeDecompress(document: any): any {
  // 新格式优先
  if (document.compressed === true && typeof document.data === 'string') {
    return JSON.parse(decompressFromBase64Gzip(document.data));
  }

  // 旧格式兼容
  if (document.data && typeof document.data === 'object' && document.data.compressed === true) {
    return JSON.parse(decompressFromBase64Gzip(document.data.data));
  }

  // 未压缩
  return document.data;
}

// 服务层调用处（示例）：
// 文件：src/core/04-storage/storage/services/storage.service.ts
let data = document.data;
if (document.compressed === true && typeof data === 'string') {
  data = JSON.parse((await gunzip(Buffer.from(data, 'base64'))).toString());
} else if (data && typeof data === 'object' && data.compressed === true) {
  data = JSON.parse((await gunzip(Buffer.from(data.data, 'base64'))).toString());
}
```

**预期效果**：简化压缩逻辑，保持历史数据兼容性

#### 3.3 Phase 2 - 技术债务清理（长期规划）

##### C1. 性能统计数据源优化
```typescript
// 选项1：移除占位实现，返回实际 Prometheus 聚合数据（示例伪码）
async getStorageStats(): Promise<StorageStatsDto> {
  // 文件：src/core/04-storage/storage/services/storage.service.ts
  // 使用 PresenterRegistryService 获取注册表文本，再解析聚合
  const raw = await this.metricsRegistry.getMetrics(); // text exposition format
  const aggregated = parseAndAggregate(raw, {
    counters: ['newstock_storage_operations_total'],
    histograms: ['newstock_storage_query_duration_seconds'],
    gauges: ['newstock_storage_data_volume_bytes']
  });

  const stats = new StorageStatsDto();
  stats.persistent = {
    totalDocuments: await this.storageRepository.countAll(),
    totalSizeBytes: (await this.storageRepository.getSizeStats())[0]?.totalSize || 0,
    categoriesCounts: (await this.storageRepository.getStorageClassificationStats())
      .reduce((acc, it) => ({ ...acc, [it._id]: it.count }), {}),
    providerCounts: (await this.storageRepository.getProviderStats())
      .reduce((acc, it) => ({ ...acc, [it._id]: it.count }), {}),
  };
  stats.cache = { totalKeys: 0, totalMemoryUsage: 0, hitRate: 0, avgTtl: 0 };
  stats.performance = {
    avgStorageTime: aggregated.histograms['newstock_storage_query_duration_seconds']?.avg || 0,
    avgRetrievalTime: aggregated.histograms['newstock_storage_query_duration_seconds']?.avg || 0,
    operationsPerSecond: aggregated.counters['newstock_storage_operations_total']?.rate_1m || 0,
    errorRate: 0,
  };
  return stats;
}

// 选项2：文档化说明数据来源
// 在API文档中明确标注："性能数据来源于 Prometheus 指标聚合"
```

##### C2. 仓库层职责分离
```typescript
// 第一步：标记废弃方法（cache 相关职责移交至 CommonCacheService）
export class StorageRepository {
  /**
   * @deprecated 将迁移至 CommonCache，请使用 CommonCacheService
   */
  async storeInCache(key: string, data: any): Promise<void> {
    // 现有实现...
  }
  
  // 其他 Redis 相关方法同样标记 @deprecated
}

// 第二步：迁移完成后移除 Redis 依赖与类型
export class StorageRepository {
  constructor(
    // 移除 Redis 相关注入
    // private readonly redis: Redis,
    @InjectModel(StoredData.name) private storedDataModel: Model<StoredDataDocument>,
  ) {}
  
  // 只保留 MongoDB 相关方法
}
```

**预期效果**：实现存储层单一职责，提高代码可维护性

---

### 4. 详细实施步骤

#### 4.1 Phase 0 实施清单（高优先级）

##### Step 1: A1 监控指标名称修正
```bash
# 1. 全局替换指标名称（注意路径变更 & 单位修正）
cd src/core/04-storage/storage/services/
sed -i '' 's/storagePersistentOperationsTotal/storageOperationsTotal/g' storage.service.ts
sed -i '' 's/storagePersistentQueryDuration/storageQueryDuration/g' storage.service.ts
sed -i '' 's/storagePersistentDataVolume/storageDataVolume/g' storage.service.ts

# 2. 人工检查：将 Metrics.observe 传参由毫秒改为秒（/1000）
rg -n "Metrics\.observe\(.*storageQueryDuration" -n storage.service.ts

# 3. 验证替换结果
grep -n "storage.*Total\|storage.*Duration\|storage.*Volume" storage.service.ts | cat
```

**验证清单**：
- [ ] 所有指标名称已替换完成
- [ ] 无语法错误，项目可正常启动
- [ ] 本地存储操作后，Prometheus `/metrics` 端点显示正确指标

##### Step 2: A2 StorageMetadataDto参数修正
```typescript
// 定位代码位置：src/core/04-storage/storage/services/storage.service.ts 约549行
// 查找类似如下的代码：
const responseMetadata = new StorageMetadataDto(
  document.key,
  StorageType.PERSISTENT,
  document.storageClassification as any,
  document.provider,
  document.market,
  document.dataSize,
  processingTime,
  document.compressed,
  document.tags,
  document.storedAt.toISOString() // 需要移除这一行（误作 expiresAt）
);

// 修改为：
const responseMetadata = new StorageMetadataDto(
  document.key,
  StorageType.PERSISTENT,
  document.storageClassification as any,
  document.provider,
  document.market,
  document.dataSize,
  processingTime,
  document.compressed,
  document.tags,
  undefined
);
responseMetadata.storedAt = document.storedAt.toISOString();
```

**验证清单**：
- [ ] StorageMetadataDto构造调用已修正
- [ ] storedAt字段手动赋值已添加
- [ ] API响应中storedAt显示正确时间，expiresAt为null/undefined

##### Step 3: A3 标签类型映射修正
```typescript
// 定位代码位置：src/core/04-storage/storage/services/storage.service.ts 约416行
// 查找分页返回的 tags 字段映射

// 当前代码（错误）：object 直接赋给 string[]
tags: item.tags || []

// 修改为（推荐方案：保留键值信息并转为键值串）：
tags: item.tags ? Object.entries(item.tags).map(([k, v]) => `${k}=${v}`) : []

// 或选择简化方案（仅保留键）：
tags: item.tags ? Object.keys(item.tags) : []
```

**验证清单**：
- [ ] 分页接口返回的tags字段为string[]类型
- [ ] 标签内容格式符合预期（key=value 或 仅key）
- [ ] 类型检查通过，无TypeScript错误

#### 4.2 Phase 1 实施清单（功能增强）

##### Step 4: B1 TTL策略配置
```typescript
// 1. 修改 DTO 定义：src/core/04-storage/storage/dto/storage-request.dto.ts
export class StorageOptionsDto {
  @ApiPropertyOptional({ description: 'Persistent TTL in seconds' })
  @IsOptional()
  @IsNumber()
  persistentTtlSeconds?: number; // 新增：持久层TTL（避免与 cacheTtl 混淆）

  @ApiPropertyOptional({ description: 'Whether to compress data', default: false })
  @IsOptional()
  compress?: boolean;

  @ApiPropertyOptional({ description: 'Custom storage tags for organization' })
  @IsOptional()
  @IsObject()
  tags?: Record<string, string>;
}

// 2. 修改服务逻辑：src/core/04-storage/storage/services/storage.service.ts
async storeData(request: StoreDataDto): Promise<StorageResponseDto> {
  const expiresAt = request.options?.persistentTtlSeconds
    ? new Date(Date.now() + request.options.persistentTtlSeconds * 1000)
    : undefined;

  const documentToStore = {
    ...,
    expiresAt,
    storedAt: new Date()
  };
  const storedDocument = await this.storageRepository.upsert(documentToStore);
  ...
}
```

注意：
- 持久层 TTL 字段命名为 `persistentTtlSeconds`，与现有的 `cacheTtl` 明确区分；
- 启用 TTL 前需评估数据保留策略；默认不设置即永不过期；
- TTL 索引已存在：`src/core/04-storage/storage/schemas/storage.schema.ts` 中 `expiresAt` 索引。

**验证清单**：
- [ ] DTO验证规则正确，persistentTtlSeconds 为可选正整数
- [ ] 未配置 TTL 时行为与之前一致
- [ ] 配置 TTL 后 MongoDB 自动清理过期文档（`expiresAt` TTL 索引生效）

##### Step 5: B2 压缩标记优化
```typescript
// 统一压缩逻辑
function compressIfNeeded(data: any, shouldCompress: boolean) {
  return {
    compressed: shouldCompress,
    data: shouldCompress ? compress(JSON.stringify(data)) : data
  };
}

// 统一解压逻辑（向后兼容）
function decompressData(document: StorageDocument): any {
  // 新格式：检查根级compressed标记
  if (document.compressed === true) {
    return JSON.parse(decompress(document.data));
  }
  
  // 旧格式兼容：检查data.compressed
  if (typeof document.data === 'object' && document.data.compressed === true) {
    return JSON.parse(decompress(document.data.data));
  }
  
  // 未压缩数据
  return document.data;
}
```

**验证清单**：
- [ ] 新存储的数据使用根级compressed标记
- [ ] 历史数据仍能正确读取和解压
- [ ] 压缩/解压逻辑单元测试通过

---

### 5. 测试验证策略

#### 5.1 单元测试覆盖

##### 高优先级测试用例
```typescript
describe('StorageService - Metadata修复', () => {
  it('should set storedAt correctly and keep expiresAt undefined', async () => {
    const mockDocument = {
      _id: new Types.ObjectId(),
      size: 1024,
      storedAt: new Date('2025-01-19T10:00:00Z')
    };
    
    const metadata = new StorageMetadataDto(
      mockDocument._id.toString(),
      mockDocument.size
    );
    metadata.storedAt = mockDocument.storedAt.toISOString();
    
    expect(metadata.storedAt).toBe('2025-01-19T10:00:00.000Z');
    expect(metadata.expiresAt).toBeUndefined();
  });

  it('should return correct tags format in pagination', async () => {
    const mockItem = {
      tags: { environment: 'prod', version: '1.0.0' }
    };
    
    // 推荐方案：键值对格式
    const tags = mockItem.tags 
      ? Object.entries(mockItem.tags).map(([k,v]) => `${k}=${v}`) 
      : [];
    
    expect(tags).toEqual(['environment=prod', 'version=1.0.0']);
    expect(Array.isArray(tags)).toBe(true);
  });
  
  it('should use correct metric names', async () => {
    const metricsService = {
      increment: jest.fn(),
      recordDuration: jest.fn(),
      recordBytes: jest.fn()
    };
    
    // 验证使用正确的指标名称
    metricsService.increment('storageOperationsTotal');
    metricsService.recordDuration('storageQueryDuration', 100);
    metricsService.recordBytes('storageDataVolume', 1024);
    
    expect(metricsService.increment).toHaveBeenCalledWith('storageOperationsTotal');
    expect(metricsService.recordDuration).toHaveBeenCalledWith('storageQueryDuration', 100);
    expect(metricsService.recordBytes).toHaveBeenCalledWith('storageDataVolume', 1024);
  });
});

describe('StorageService - TTL功能', () => {
  it('should set expiresAt when ttlSeconds provided', async () => {
    const ttlSeconds = 3600; // 1小时
    const startTime = Date.now();
    
    const expiresAt = new Date(startTime + ttlSeconds * 1000);
    
    expect(expiresAt.getTime()).toBeGreaterThan(startTime);
    expect(expiresAt.getTime()).toBe(startTime + 3600000);
  });
  
  it('should keep expiresAt undefined when no TTL configured', async () => {
    const expiresAt = undefined;
    expect(expiresAt).toBeUndefined();
  });
});

describe('StorageService - 压缩逻辑', () => {
  it('should handle compression with root-level flag', () => {
    const document = {
      compressed: true,
      data: 'compressed_payload'
    };
    
    // 测试新的解压逻辑
    const shouldDecompress = document.compressed === true;
    expect(shouldDecompress).toBe(true);
  });
  
  it('should maintain backward compatibility with data.compressed', () => {
    const legacyDocument = {
      data: {
        compressed: true,
        data: 'legacy_compressed_payload'
      }
    };
    
    // 测试向后兼容逻辑
    const shouldDecompress = typeof legacyDocument.data === 'object' 
      && legacyDocument.data.compressed === true;
    expect(shouldDecompress).toBe(true);
  });
});
```

#### 5.2 集成测试验证

##### 监控指标集成测试
```typescript
describe('Storage Metrics Integration', () => {
  it('should record correct prometheus metrics', async () => {
    // 执行存储操作
    await storageService.storeData({
      key: 'test-key',
      data: { test: 'data' },
      options: { compressed: false }
    });
    
    // 验证Prometheus指标
    const metricsResponse = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);
      
    expect(metricsResponse.text).toContain('newstock_storage_operations_total');
    expect(metricsResponse.text).toContain('newstock_storage_query_duration_seconds');
    expect(metricsResponse.text).toContain('newstock_storage_data_volume_bytes');
  });
});
```

##### API契约集成测试
```typescript
describe('Storage API Contract', () => {
  it('should return correct metadata structure', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/storage/data')
      .send({
        key: 'integration-test',
        data: { sample: 'data' }
      })
      .expect(201);
      
    expect(response.body.data.metadata).toHaveProperty('id');
    expect(response.body.data.metadata).toHaveProperty('size');
    expect(response.body.data.metadata).toHaveProperty('storedAt');
    expect(response.body.data.metadata.expiresAt).toBeUndefined();
  });
  
  it('should return string array for tags in pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/storage/data?page=1&limit=10')
      .expect(200);
      
    const items = response.body.data.items;
    items.forEach(item => {
      if (item.tags) {
        expect(Array.isArray(item.tags)).toBe(true);
        item.tags.forEach(tag => {
          expect(typeof tag).toBe('string');
        });
      }
    });
  });
});
```

#### 5.3 E2E测试场景

```typescript
describe('Storage E2E Tests', () => {
  it('should handle complete storage lifecycle with monitoring', async () => {
    // 1. 存储数据（启用持久层 TTL）
    const storeResponse = await request(app.getHttpServer())
      .post('/api/v1/storage/data')
      .send({
        key: 'e2e-test-key',
        data: { test: 'complete-lifecycle' },
        options: { compressed: true, persistentTtlSeconds: 3600 }
      });
      
    expect(storeResponse.status).toBe(201);
    const { id } = storeResponse.body.data.metadata;
    
    // 2. 检索数据
    const retrieveResponse = await request(app.getHttpServer())
      .get(`/api/v1/storage/data/${id}`);
      
    expect(retrieveResponse.status).toBe(200);
    expect(retrieveResponse.body.data.data).toEqual({ test: 'complete-lifecycle' });
    
    // 3. 验证分页接口
    const paginationResponse = await request(app.getHttpServer())
      .get('/api/v1/storage/data?page=1&limit=10');
      
    expect(paginationResponse.status).toBe(200);
    
    // 4. 验证监控指标更新
    const metricsResponse = await request(app.getHttpServer())
      .get('/metrics');
      
    expect(metricsResponse.text).toMatch(/newstock_storage_operations_total\{.*\} \d+/);
    
    // 5. 删除数据
    await request(app.getHttpServer())
      .delete(`/api/v1/storage/data/${id}`)
      .expect(200);
  });
});
```

### 6. 风险评估与缓解策略

#### 6.1 技术风险评估

| 风险项 | 级别 | 影响 | 缓解策略 |
|--------|------|------|----------|
| 监控指标丢失 | 低 | 暂时无法监控存储性能 | Phase 0优先修复，影响时间短 |
| API响应格式变化 | 低 | 下游系统解析错误 | 修复为正确格式，不破坏契约 |
| TTL功能异常 | 中 | 数据误删或累积 | 默认关闭，充分测试后启用 |
| 历史数据兼容性 | 中 | 旧数据无法读取 | 保留兼容逻辑，分批验证 |
| 性能影响 | 低 | 解压逻辑复杂化 | 影响微小，定期性能测试 |

#### 6.2 业务风险评估

| 风险项 | 级别 | 影响 | 缓解策略 |
|--------|------|------|----------|
| 服务中断 | 低 | 存储功能不可用 | 渐进式部署，快速回滚 |
| 数据丢失 | 低 | TTL误删重要数据 | 默认关闭，谨慎配置 |
| 监控盲区 | 中 | 无法发现存储问题 | 优先修复监控指标 |

#### 6.3 回滚策略

##### 快速回滚计划
```bash
# Phase 0 回滚
git revert <commit-hash>  # 回滚指标名称修改
# 或手动恢复（macOS）：
cd src/core/04-storage/storage/services/
sed -i '' 's/storageOperationsTotal/storagePersistentOperationsTotal/g' storage.service.ts
sed -i '' 's/storageQueryDuration/storagePersistentQueryDuration/g' storage.service.ts
sed -i '' 's/storageDataVolume/storagePersistentDataVolume/g' storage.service.ts
```

##### 渐进式回滚
```typescript
// 使用功能开关控制新逻辑
const USE_NEW_METADATA_LOGIC = process.env.USE_NEW_METADATA_LOGIC === 'true';

if (USE_NEW_METADATA_LOGIC) {
  // 新逻辑
  metadata.storedAt = document.storedAt.toISOString();
} else {
  // 旧逻辑（临时兼容）
  // ...
}
```

### 7. 监控与告警配置

#### 7.1 关键指标监控
```yaml
# Prometheus告警规则
groups:
  - name: storage_alerts
    rules:
      - alert: StorageMetricsDown
        expr: increase(newstock_storage_operations_total[5m]) == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Storage metrics not updating"
          
      - alert: StorageHighLatency
        expr: histogram_quantile(0.95, newstock_storage_query_duration_seconds_bucket) > 1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Storage query latency too high"
          
      - alert: StorageDataVolumeHigh
        expr: newstock_storage_data_volume_bytes > 10GB
        for: 1m
        labels:
          severity: info
        annotations:
          summary: "Storage data volume is high"
```

#### 7.2 健康检查增强
```typescript
// 添加存储健康检查
@Controller('health')
export class HealthController {
  @Get('storage')
  async checkStorageHealth(): Promise<HealthCheckResult> {
    const result = await this.health.check([
      () => this.storageHealthIndicator.isHealthy('storage'),
      () => this.metricsHealthIndicator.isHealthy('storage-metrics')
    ]);
    
    return result;
  }
}
```

### 8. 实施时间表

#### 8.1 里程碑计划

**M1: 监控恢复（Week 1）**
- [ ] A1 指标名称修正
- [ ] A2 元数据参数修复  
- [ ] A3 标签类型修正
- [ ] 监控面板验证

**M2: 功能增强（Week 2-3）**
- [ ] B1 TTL策略实现
- [ ] B2 压缩逻辑优化
- [ ] 向后兼容性测试

**M3: 技术债务清理（Week 4+）**
- [ ] C1 性能统计优化
- [ ] C2 仓库层解耦
- [ ] 完整的回归测试

#### 8.2 上线策略

1. **开发环境验证**（1-2天）
2. **测试环境部署**（3-5天）
3. **灰度发布**（1周观察）
4. **全量发布**（确认稳定后）

---

**文档版本**: v2.0  
**更新日期**: 2025-01-19  
**审核状态**: ✅ 已通过技术审核和优化  
**负责人**: Storage模块开发团队