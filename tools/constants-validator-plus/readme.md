# 常量重复检测工具

## 🎯 功能概述

这是一个专门为 TypeScript 项目开发的常量重复检测工具，能够：

1. **扫描常量文件**：递归扫描指定目录下的所有 TypeScript 常量文件
2. **检测重复定义**：识别值相同但变量名不同的重复常量定义  
3. **分类重复类型**：
   - **直接重复**：两个变量赋相同的值 (a = 1000, b = 1000)
   - **引用重复**：一个变量引用另一个变量 (a = 1000, b = a)
   - **嵌套重复**：对象内部的属性值重复
4. **生成分析报告**：输出详细的 Markdown 格式分析报告

## 📊 检测结果摘要

最近一次扫描结果：
- **扫描文件数**：29 个常量文件
- **常量定义数**：685 个常量定义
- **重复组数**：115 个重复组
- **重复实例数**：372 个重复实例

### 按类型统计
- **直接重复**：57 个
- **引用重复**：58 个  
- **嵌套重复**：0 个

### 按严重程度统计
- **高严重性**：2 个（重复次数 ≥ 10）
- **中等严重性**：9 个（重复次数 5-9）
- **低严重性**：104 个（重复次数 2-4）

## 🔍 主要发现

### 高频重复常量（前5名）
1. **数字 "2"** - 重复 13 次（退避倍数、优先级等）
2. **数字 "100"** - 重复 10 次（分页大小、百分比、性能阈值等）
3. **数字 "3"** - 重复 9 次（重试次数、优先级等）
4. **数字 "10000"** - 重复 9 次（超时时间、批量大小、性能阈值等）
5. **引用 "CORE_VALUES.TIME_MS.ONE_SECOND"** - 重复 9 次（各种超时配置）

## 🚀 使用方法

### 1. 直接运行检测

```bash
# 使用默认配置扫描 src/common/constants 目录
bun run tools/constants-validator-plus/constants-duplicates-detector.ts
```

### 2. 编程方式使用

```typescript
import ConstantsDuplicatesDetector from './constants-duplicates-detector';

const detector = new ConstantsDuplicatesDetector();

// 检测重复项
const report = await detector.detectDuplicates('src/common/constants', {
  excludePatterns: ['node_modules', '*.spec.ts', '*.test.ts'],
  includeExtensions: ['.ts'],
  maxDepth: 10
});

// 保存报告
await detector.saveReport(report, 'constants-duplicates-report.md');
```

### 3. 配置选项

```typescript
interface DetectionOptions {
  excludePatterns?: string[];     // 排除的文件模式，默认 ['node_modules', '*.spec.ts', '*.test.ts']
  includeExtensions?: string[];   // 包含的文件扩展名，默认 ['.ts']
  maxDepth?: number;             // 最大扫描深度，默认 10
}
```

## 📋 输出报告

工具会生成两种输出：

### 1. 控制台摘要
```
============================================================
📊 常量重复检测报告摘要
============================================================
扫描文件数: 29
常量定义数: 685
重复组数: 115
重复实例数: 372
============================================================

🔍 前5个重复项:
1. 🔴 值 "2" - 重复 13 次
2. 🔴 值 "100" - 重复 10 次
3. 🟡 值 "3" - 重复 9 次
...
```

### 2. 详细 Markdown 报告
- 完整的统计信息
- 按重复次数排序的详细重复项列表
- 每个重复项的出现位置（文件路径和行号）
- 严重程度分类和图标标识

## 📁 文件结构

```
tools/constants-validator-plus/
├── constants-duplicates-detector.ts    # 主要检测器类
├── constants-duplicates-report.md      # 生成的分析报告
└── readme.md                          # 本说明文档
```

## 🔧 技术实现

### 核心技术
- **TypeScript AST 解析**：使用 TypeScript Compiler API 解析源代码
- **递归文件扫描**：支持深度可配置的目录递归扫描
- **智能值比较**：区分基础类型、引用类型和对象类型
- **严重程度评估**：基于重复次数和值类型的智能严重程度计算

### 支持的常量格式
- `export const NAME = value`
- `export const OBJ = Object.freeze({ ... })`
- `export const OBJ = { key: value, nested: { ... } }`
- 引用其他常量：`export const B = A` 或 `export const B = OBJ.KEY`

### 检测算法
1. **AST 遍历**：递归遍历 TypeScript AST 节点
2. **常量提取**：提取变量声明和对象属性赋值
3. **值规范化**：将相同语义的值进行归一化处理
4. **重复分组**：按值分组并识别重复项
5. **严重程度评估**：根据重复次数和值类型计算严重程度

## 💡 优化建议

基于检测结果，建议：

1. **数字常量统一化**：将高频重复的数字（如 2, 3, 100, 1000, 10000）统一到 `CORE_VALUES` 中
2. **时间配置引用化**：将直接使用毫秒数的地方改为引用 `CORE_VALUES.TIME_MS.*` 
3. **百分比常量规范化**：统一使用 `CORE_VALUES.PERCENTAGES.*`
4. **重试配置标准化**：统一重试次数、延迟时间的配置引用

## 🎯 使用场景

- **代码重构前**：识别需要统一的重复常量
- **代码审查**：检查新增常量是否与现有常量重复
- **架构优化**：了解常量使用模式，优化常量组织结构
- **文档生成**：为常量整理和文档化提供数据支持

## ⚠️ 注意事项

1. **TypeScript 依赖**：需要项目安装了 TypeScript 依赖
2. **文件路径**：使用绝对路径，确保正确解析文件
3. **编译错误**：如果源文件有语法错误，可能影响解析结果
4. **性能考虑**：大型项目建议限制扫描深度和文件范围

## 🔄 版本历史

- **v1.0.0** - 初始版本，支持基本的常量重复检测和报告生成
