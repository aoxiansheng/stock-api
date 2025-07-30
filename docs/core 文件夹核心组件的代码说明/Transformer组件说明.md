Transformer 是6-component架构中的第4个组件，负责实时数据转换，将Data-Mapper的映射规则应
  用到原始数据上，输出标准化的业务数据。

  数据流向: Data-Mapper → **Transformer** → Storage

  📋 核心业务逻辑

  1. 智能转换引擎 (TransformerService:50-196)

  - 映射规则查找: 根据provider和transDataRuleListType自动匹配或使用指定规则ID
  - 批量处理优化: 相同规则的请求分组并行处理，提升性能
  - 输出验证: 可选的转换后数据完整性验证
  - 性能监控: 详细的转换时间和统计指标

  2. 三种核心操作模式

  // 1. 单次转换
  transform(request: TransformRequestDto): Promise<TransformResponseDto>

  // 2. 批量转换 
  transformBatch(requests: TransformRequestDto[]): Promise<TransformResponseDto[]>

  // 3. 预览转换
  previewTransformation(request: TransformRequestDto): Promise<TransformPreviewDto>

  🔍 详细字段定义和含义

  TransformRequestDto (transform-request.dto.ts:30-56)

  provider: string              // 数据提供商 (longport, itick等)
  transDataRuleListType: string      // 数据规则列表类型 (对应Data Mapper中的规则分类)
  rawData: any                 // 原始业务数据 (任意JSON结构)
  mappingOutRuleId?: string    // 指定映射规则ID (可选，否则自动匹配)
  options?: {
    validateOutput?: boolean   // 是否验证输出数据 (默认false)
    includeMetadata?: boolean  // 是否包含转换元数据 (默认false)
    context?: Record<string, any> // 自定义转换上下文
  }

  TransformResponseDto (transform-response.dto.ts:70-84)

  transformedData: T           // 转换后的标准化数据 (通常是数组)
  metadata: TransformationMetadataDto // 转换元信息

  TransformationMetadataDto (transform-response.dto.ts:3-63)

  ruleId: string              // 应用的映射规则ID
  ruleName: string            // 映射规则名称
  provider: string            // 数据提供商
  transDataRuleListType: string    // 数据规则列表类型
  recordsProcessed: number    // 处理的记录数量
  fieldsTransformed: number   // 转换的字段数量
  processingTime: number      // 处理时间毫秒数
  timestamp: string           // 转换时间戳 (ISO格式)
  transformationsApplied?: Array<{  // 应用的转换详情 (可选)
    sourceField: string       // 源字段路径
    targetField: string       // 目标字段名
    transformType?: string    // 转换类型 (multiply, format等)
    transformValue?: any      // 转换参数
  }>

  TransformPreviewDto (transform-preview.dto.ts:57-80)

  预览功能专用DTO，提供转换预览而无需实际执行:
  transformMappingRule: TransformMappingRuleInfoDto    // 映射规则信息
  sampleInput: Record<string, any>   // 输入数据示例
  expectedOutput: Record<string, any> // 预期输出数据
  sharedDataFieldMappings: TransformFieldMappingPreviewDto[] // 字段映射预览列表

  TransformFieldMappingPreviewDto (transform-preview.dto.ts:34-55)

  sourceField: string         // 源字段路径 (如"secu_quote[].last_done")
  targetField: string         // 目标字段名 (如"lastPrice")
  sampleSourceValue: any      // 源字段示例值
  expectedTargetValue: any    // 预期目标值
  transformType?: string      // 转换类型 (multiply, format等)

  ⚡ 性能优化特性

  1. 批量处理优化算法 (TransformerService:201-298)

  // 按映射规则分组，减少重复规则查找
  const requestsByRule = new Map<string, TransformRequestDto[]>();
  // 并行处理相同规则的多个请求
  const groupPromises = groupedRequests.map(request =>
    this._executeSingleTransform(request, transformMappingRule)
  );

  2. 性能阈值监控 (transformer.constants.ts:65-72)

  SLOW_TRANSFORMATION_MS: 2000    // 慢转换阈值 (2秒)
  LARGE_DATASET_SIZE: 1000        // 大数据集阈值
  HIGH_MEMORY_USAGE_MB: 512       // 高内存使用阈值
  MAX_PROCESSING_TIME_MS: 30000   // 最大处理时间 (30秒)

  3. 配置限制 (transformer.constants.ts:52-60)

  MAX_BATCH_SIZE: 1000            // 最大批量处理数量
  MAX_FIELD_MAPPINGS: 100         // 单规则最大字段映射数
  MAX_SAMPLE_SIZE: 10             // 预览样本最大数量
  MAX_NESTED_DEPTH: 10            // 最大嵌套深度
  MAX_STRING_LENGTH: 10000        // 最大字符串长度

  🔧 支持的转换类型

  数值转换 (transformer.constants.ts:12-19)

  MULTIPLY: "multiply"     // 数值乘法 (价格单位换算)
  DIVIDE: "divide"        // 数值除法 (百分比转换)
  ADD: "add"              // 数值加法
  SUBTRACT: "subtract"    // 数值减法
  FORMAT: "format"        // 字符串格式化 (模板替换)
  CUSTOM: "custom"        // 自定义转换 (安全原因暂不支持)

  数据验证规则 (transformer.constants.ts:103-114)

  REQUIRED: "required"    // 必填字段验证
  NUMERIC: "numeric"      // 数值类型验证
  STRING: "string"        // 字符串类型验证
  DATE: "date"           // 日期类型验证
  ARRAY: "array"         // 数组类型验证
  EMAIL: "email"         // 邮箱格式验证

  🎯 API接口设计

  权限控制

  所有接口都需要 TRANSFORMER_PREVIEW 权限 (开发者/管理员级别)

  RESTful端点

  POST /transformer/transform        // 单次数据转换
  POST /transformer/transform-batch  // 批量数据转换  
  POST /transformer/preview          // 转换预览 (不实际执行)

  📊 业务场景和使用模式

  1. 单次转换场景

  适用于实时数据处理:
  // LongPort股票报价转换
  {
    "provider": "longport",
    "transDataRuleListType": "get-stock-quote",
    "rawData": {
      "secu_quote": [{
        "symbol": "700.HK",
        "last_done": 385.6,
        "change_val": -4.2
      }]
    }
  }

  2. 批量转换场景

  适用于历史数据迁移、多股票同时处理:
  // 多股票批量转换
  [
    {provider: "longport", transDataRuleListType: "get-stock-quote", rawData: {...}},
    {provider: "longport", transDataRuleListType: "get-stock-quote", rawData: {...}},
    // ...最多1000条
  ]

  3. 预览调试场景

  适用于开发调试、规则验证:
  // 预览转换效果
  {
    "provider": "longport",
    "transDataRuleListType": "get-stock-quote",
    "rawData": {...}
  }
  // 返回字段映射关系和预期输出，不实际执行

  🔄 错误处理机制

  转换失败类型 (transformer.constants.ts:24-35)

  NO_MAPPING_RULE: "未找到匹配的映射规则"
  TRANSFORMATION_FAILED: "数据转换失败"
  VALIDATION_FAILED: "转换后数据验证失败"
  INVALID_RAW_DATA: "原始数据格式无效"
  BATCH_TRANSFORMATION_FAILED: "批量转换失败"

  容错策略

  - 单次转换: 抛出异常，详细错误信息
  - 批量转换: 支持 continueOnError 选项，部分失败不影响整体
  - 预览模式: 轻量级处理，快速失败

  🎯 在6-Component架构中的定位

  Transformer作为第4个组件，是数据标准化的执行引擎:

  输入: 来自Data-Mapper的映射规则 + 原始数据
  功能: 规则应用、批量优化、性能监控、数据验证
  输出: 标准化的业务数据，供Storage组件存储

  该组件实现了高性能的数据转换中台，通过智能的批处理优化和详细的性能监控，确保数据转换的
  效率和质量，是连接数据映射规则和实际业务数据的关键桥梁。


   transformer
   依赖并调用 `data-mapper`。transformer 是上层服务，data-mapper 是底层核心引擎。
   * transformer 负责 “决策” (用哪个规则)，data-mapper 负责 “执行” (如何根据规则转换)。
   * 这种分离使得系统层次清晰：
   * transformer 则可以灵活地编排各种业务流程，如批量处理、预览、校验等，而无需关心映射的具体实现细节。
 它面向具体的业务请求，负责调用
  data-mapper 来完成实际的数据转换工作。

  主要功能：


   * 接收转换请求:
       * 它的主要入口是 transform 方法，接收一个 TransformRequestDto 对象。
       * 这个请求对象中包含了关键信息：provider (数据源), transDataRuleListType (数据类型), 和 rawData (原始数据)。


   * 智能规则查找:
       * transformer 的一个核心职责是 自动寻找最合适的映射规则。
       * 它会调用 findMappingRule 方法，根据请求中的 provider 和 transDataRuleListType，去 data-mapper
         中查找一个最匹配的、当前处于激活状态的规则。
       * 当然，也可以通过在请求中直接指定 mappingOutRuleId 来强制使用某一个特定规则。


   * 协调执行转换:
       * 一旦找到了合适的规则，transformer 就会调用 dataMapperService.applyMappingRule，把原始数据和规则 ID
         传过去，让 data-mapper 执行真正的转换工作。


   * 丰富的功能扩展:
       * 批量处理 (`transformBatch`):
         能够接收一个请求数组，并进行分组优化（将使用相同规则的请求打包处理），高效地完成批量转换。
       * 结果校验 (`validateTransformedData`):
         可以在转换完成后，对结果进行校验，例如检查目标字段是否存在、值是否为 null 等。
       * 元数据和统计 (`TransformationMetadataDto`): 转换完成后，会生成包含丰富元数据（如使用的规则
         ID、处理耗时、处理记录数等）的响应，便于监控和调试。
       * 转换预览 (`previewTransformation`):
         允许在不保存数据的情况下，用样本数据预览一个规则的转换效果，非常适合在调试和配置阶段使用。  

