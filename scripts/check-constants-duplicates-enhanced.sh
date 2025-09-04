#!/bin/bash
# scripts/check-constants-duplicates-enhanced.sh
# 增强版常量重复检测脚本

set -e  # 出错时退出

echo "🔍 检查常量重复情况..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 创建临时目录
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# 统计函数
count_pattern() {
    local pattern="$1"
    local description="$2"
    local count
    count=$(grep -r "$pattern" src/core/ src/alert/ --include="*.ts" | grep -v "node_modules" | wc -l)
    echo "📊 $description: $count"
    return $count
}

echo "======================================"
echo "🎯 重复常量检测报告"
echo "======================================"

# 检查硬编码常量重复
echo -e "${BLUE}1. 检查硬编码超时配置重复...${NC}"
HARDCODED_TIMEOUTS=$(grep -r "DEFAULT_TIMEOUT_MS.*30000" src/core/ src/alert/ --include="*.ts" | grep -v "PERFORMANCE_CONSTANTS" | wc -l)
TOTAL_30000=$(grep -r "30000" src/core/ src/alert/ --include="*.ts" | grep -v "node_modules" | wc -l)

if [ $HARDCODED_TIMEOUTS -gt 0 ]; then
  echo -e "${RED}❌ 发现 $HARDCODED_TIMEOUTS 个硬编码 DEFAULT_TIMEOUT_MS: 30000 配置${NC}"
  echo "📍 详细位置:"
  grep -r "DEFAULT_TIMEOUT_MS.*30000" src/core/ src/alert/ --include="*.ts" | grep -v "PERFORMANCE_CONSTANTS"
  echo ""
else
  echo -e "${GREEN}✅ 已消除所有硬编码 DEFAULT_TIMEOUT_MS: 30000 重复${NC}"
fi

echo "📈 总共30000配置: $TOTAL_30000 个"
echo ""

# 检查统一常量使用情况
echo -e "${BLUE}2. 检查统一常量使用情况...${NC}"
UNIFIED_USAGE_PERF=$(grep -r "PERFORMANCE_CONSTANTS\." src/core/ src/alert/ --include="*.ts" | wc -l)
UNIFIED_USAGE_RETRY=$(grep -r "RETRY_CONSTANTS\." src/core/ src/alert/ --include="*.ts" | wc -l)
UNIFIED_USAGE_BATCH=$(grep -r "BATCH_CONSTANTS\." src/core/ src/alert/ --include="*.ts" | wc -l)
TOTAL_UNIFIED_USAGE=$((UNIFIED_USAGE_PERF + UNIFIED_USAGE_RETRY + UNIFIED_USAGE_BATCH))

echo -e "${GREEN}✅ PERFORMANCE_CONSTANTS 使用: $UNIFIED_USAGE_PERF 次${NC}"
echo -e "${GREEN}✅ RETRY_CONSTANTS 使用: $UNIFIED_USAGE_RETRY 次${NC}"
echo -e "${GREEN}✅ BATCH_CONSTANTS 使用: $UNIFIED_USAGE_BATCH 次${NC}"
echo -e "${GREEN}📊 统一常量总使用次数: $TOTAL_UNIFIED_USAGE${NC}"
echo ""

# 检查常见重复模式
echo -e "${BLUE}3. 检查常见重复模式...${NC}"

# 重试次数重复检查
echo "🔄 检查重试次数配置..."
MAX_RETRY_3=$(grep -r "MAX_RETRY.*3" src/core/ src/alert/ --include="*.ts" | grep -v "RETRY_CONSTANTS" | wc -l)
if [ $MAX_RETRY_3 -gt 2 ]; then
  echo -e "${YELLOW}⚠️  发现 $MAX_RETRY_3 个硬编码重试次数3的配置${NC}"
else
  echo -e "${GREEN}✅ 重试次数配置重复较少${NC}"
fi

# 批量大小重复检查
echo "📦 检查批量大小配置..."
BATCH_SIZE_100=$(grep -r "BATCH_SIZE.*100" src/core/ src/alert/ --include="*.ts" | grep -v "BATCH_CONSTANTS" | wc -l)
if [ $BATCH_SIZE_100 -gt 2 ]; then
  echo -e "${YELLOW}⚠️  发现 $BATCH_SIZE_100 个硬编码批量大小100的配置${NC}"
else
  echo -e "${GREEN}✅ 批量大小配置重复较少${NC}"
fi

# 健康检查间隔重复
echo "🏥 检查健康检查间隔配置..."
HEALTH_CHECK_30000=$(grep -r "CHECK_INTERVAL.*30000" src/core/ src/alert/ --include="*.ts" | grep -v "PERFORMANCE_CONSTANTS" | wc -l)
if [ $HEALTH_CHECK_30000 -gt 0 ]; then
  echo -e "${YELLOW}⚠️  发现 $HEALTH_CHECK_30000 个硬编码健康检查间隔30000的配置${NC}"
else
  echo -e "${GREEN}✅ 健康检查间隔配置已统一${NC}"
fi

echo ""

# 计算常量重复率
echo -e "${BLUE}4. 计算常量重复率...${NC}"

# 定义关键常量模式
declare -a PATTERNS=(
  "DEFAULT_TIMEOUT_MS.*30000"
  "MAX_RETRY.*3"
  "BATCH_SIZE.*100"
  "CHECK_INTERVAL.*30000"
)

TOTAL_DUPLICATES=0
for pattern in "${PATTERNS[@]}"; do
  count=$(grep -r "$pattern" src/core/ src/alert/ --include="*.ts" | grep -v "_CONSTANTS\." | wc -l)
  TOTAL_DUPLICATES=$((TOTAL_DUPLICATES + count))
done

# 估算总常量数量
TOTAL_CONSTANTS=$(grep -r "export const\|const.*=" src/core/ src/alert/ --include="*.ts" | wc -l)
DUPLICATION_RATE=$(echo "scale=2; ($TOTAL_DUPLICATES * 100) / $TOTAL_CONSTANTS" | bc -l 2>/dev/null || echo "0")

echo "📊 统计数据:"
echo "  - 检测到的重复常量: $TOTAL_DUPLICATES"
echo "  - 估算总常量数量: $TOTAL_CONSTANTS"
echo "  - 常量重复率: ${DUPLICATION_RATE}%"

# 评估重复率
if (( $(echo "$DUPLICATION_RATE < 2.0" | bc -l 2>/dev/null || echo 0) )); then
  echo -e "${GREEN}🎉 重复率低于2%，达到目标！${NC}"
  DUPLICATION_RESULT=0
else
  echo -e "${YELLOW}⚠️  重复率 ${DUPLICATION_RATE}% 仍需优化${NC}"
  DUPLICATION_RESULT=1
fi

echo ""

# 检查迁移完整性
echo -e "${BLUE}5. 检查迁移完整性...${NC}"

# 检查6个目标组件的迁移情况
declare -a COMPONENTS=(
  "src/core/03-fetching/data-fetcher"
  "src/core/01-entry/receiver"
  "src/core/04-storage/storage"
  "src/core/00-prepare/symbol-mapper"
  "src/core/00-prepare/data-mapper"
  "src/alert"
)

MIGRATED_COMPONENTS=0
for component in "${COMPONENTS[@]}"; do
  if [ -d "$component" ]; then
    imports=$(grep -r "from.*@common/constants/unified" "$component" --include="*.ts" 2>/dev/null | wc -l)
    if [ $imports -gt 0 ]; then
      echo -e "${GREEN}✅ $component: 已迁移 ($imports 个导入)${NC}"
      MIGRATED_COMPONENTS=$((MIGRATED_COMPONENTS + 1))
    else
      echo -e "${YELLOW}⚠️  $component: 未检测到统一常量导入${NC}"
    fi
  fi
done

echo "📈 迁移进度: $MIGRATED_COMPONENTS/6 个组件已迁移"

# 最终评估
echo ""
echo "======================================"
echo "🏆 最终评估结果"
echo "======================================"

SCORE=0
if [ $HARDCODED_TIMEOUTS -eq 0 ]; then
  SCORE=$((SCORE + 30))
  echo -e "${GREEN}✅ 主要重复消除: +30 分${NC}"
else
  echo -e "${RED}❌ 主要重复消除: 0 分${NC}"
fi

if [ $TOTAL_UNIFIED_USAGE -gt 10 ]; then
  SCORE=$((SCORE + 25))
  echo -e "${GREEN}✅ 统一常量采用: +25 分${NC}"
else
  echo -e "${YELLOW}⚠️  统一常量采用: +10 分${NC}"
  SCORE=$((SCORE + 10))
fi

if [ $MIGRATED_COMPONENTS -ge 5 ]; then
  SCORE=$((SCORE + 25))
  echo -e "${GREEN}✅ 组件迁移完整性: +25 分${NC}"
else
  SCORE=$((SCORE + 15))
  echo -e "${YELLOW}⚠️  组件迁移完整性: +15 分${NC}"
fi

if [ $DUPLICATION_RESULT -eq 0 ]; then
  SCORE=$((SCORE + 20))
  echo -e "${GREEN}✅ 重复率目标达成: +20 分${NC}"
else
  echo -e "${YELLOW}⚠️  重复率目标未达成: +5 分${NC}"
  SCORE=$((SCORE + 5))
fi

echo ""
echo "🎯 总分: $SCORE/100"

if [ $SCORE -ge 80 ]; then
  echo -e "${GREEN}🎉 优秀！常量重复修复项目成功完成！${NC}"
  EXIT_CODE=0
elif [ $SCORE -ge 60 ]; then
  echo -e "${YELLOW}✅ 良好！大部分目标已达成，仍有改进空间${NC}"
  EXIT_CODE=0
else
  echo -e "${RED}⚠️  需要改进！多个关键目标未达成${NC}"
  EXIT_CODE=1
fi

# 生成改进建议
if [ $SCORE -lt 100 ]; then
  echo ""
  echo "💡 改进建议:"
  
  if [ $HARDCODED_TIMEOUTS -gt 0 ]; then
    echo "  1. 完成剩余的硬编码超时配置迁移"
  fi
  
  if [ $TOTAL_UNIFIED_USAGE -lt 15 ]; then
    echo "  2. 增加统一常量的使用覆盖率"
  fi
  
  if [ $MIGRATED_COMPONENTS -lt 6 ]; then
    echo "  3. 完成所有目标组件的迁移工作"
  fi
  
  if [ $DUPLICATION_RESULT -ne 0 ]; then
    echo "  4. 继续减少常量重复率至2%以下"
  fi
fi

echo ""
echo "📝 检测报告生成时间: $(date)"
echo "======================================"

exit $EXIT_CODE