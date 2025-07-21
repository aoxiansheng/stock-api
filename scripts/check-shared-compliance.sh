#!/bin/bash

# Shared 模块复用合规检查脚本
# 用于自动检查代码是否符合 common 模块复用规范

set -e

echo "🔍 开始 Shared 模块复用合规检查..."
echo "=================================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 计数器
VIOLATIONS=0
WARNINGS=0

# 检查函数
check_violation() {
    local message="$1"
    local count="$2"
    if [ "$count" -gt 0 ]; then
        echo -e "${RED}❌ $message: $count 个违规${NC}"
        VIOLATIONS=$((VIOLATIONS + count))
    else
        echo -e "${GREEN}✅ $message: 通过${NC}"
    fi
}

check_warning() {
    local message="$1"
    local count="$2"
    if [ "$count" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $message: $count 个警告${NC}"
        WARNINGS=$((WARNINGS + count))
    else
        echo -e "${GREEN}✅ $message: 通过${NC}"
    fi
}

echo -e "${BLUE}1. 检查 console.log 使用...${NC}"
CONSOLE_COUNT=$(grep -r "console\." src/ --include="*.ts" --exclude-dir=node_modules | wc -l || echo "0")
check_violation "禁止使用 console.log/warn/error" "$CONSOLE_COUNT"

if [ "$CONSOLE_COUNT" -gt 0 ]; then
    echo "   违规文件:"
    grep -r "console\." src/ --include="*.ts" --exclude-dir=node_modules | head -5
    if [ "$CONSOLE_COUNT" -gt 5 ]; then
        echo "   ... 还有 $((CONSOLE_COUNT - 5)) 个违规"
    fi
fi

echo ""
echo -e "${BLUE}2. 检查原生 Logger 使用...${NC}"
LOGGER_COUNT=$(grep -r "new Logger" src/ --include="*.ts" --exclude-dir=node_modules | wc -l || echo "0")
check_violation "禁止使用 new Logger" "$LOGGER_COUNT"

if [ "$LOGGER_COUNT" -gt 0 ]; then
    echo "   违规文件:"
    grep -r "new Logger" src/ --include="*.ts" --exclude-dir=node_modules | head -5
fi

echo ""
echo -e "${BLUE}3. 检查相对路径导入 common 模块...${NC}"
RELATIVE_IMPORT_COUNT=$(grep -r "from.*\.\./.*common" src/ --include="*.ts" --exclude-dir=node_modules | wc -l || echo "0")
check_violation "禁止相对路径导入 common 模块" "$RELATIVE_IMPORT_COUNT"

if [ "$RELATIVE_IMPORT_COUNT" -gt 0 ]; then
    echo "   违规文件:"
    grep -r "from.*\.\./.*common" src/ --include="*.ts" --exclude-dir=node_modules | head -5
fi

echo ""
echo -e "${BLUE}4. 检查是否使用 sanitizeLogData...${NC}"
SERVICES_WITHOUT_SANITIZE=$(find src/ -name "*.service.ts" -exec grep -L "sanitizeLogData" {} \; | wc -l || echo "0")
check_warning "服务层未使用 sanitizeLogData" "$SERVICES_WITHOUT_SANITIZE"

if [ "$SERVICES_WITHOUT_SANITIZE" -gt 0 ]; then
    echo "   需要检查的文件:"
    find src/ -name "*.service.ts" -exec grep -L "sanitizeLogData" {} \; | head -5
fi

echo ""
echo -e "${BLUE}5. 检查是否使用 createLogger...${NC}"
SERVICES_WITHOUT_CREATE_LOGGER=$(find src/ -name "*.service.ts" -exec grep -L "createLogger" {} \; | wc -l || echo "0")
check_violation "服务层未使用 createLogger" "$SERVICES_WITHOUT_CREATE_LOGGER"

if [ "$SERVICES_WITHOUT_CREATE_LOGGER" -gt 0 ]; then
    echo "   违规文件:"
    find src/ -name "*.service.ts" -exec grep -L "createLogger" {} \; | head -5
fi

echo ""
echo -e "${BLUE}6. 检查硬编码市场常量...${NC}"
HARDCODED_MARKETS=$(grep -r "\['HK'\|'US'\|'SZ'\|'SH'\]" src/ --include="*.ts" --exclude-dir=node_modules | wc -l || echo "0")
check_warning "可能存在硬编码市场常量" "$HARDCODED_MARKETS"

echo ""
echo -e "${BLUE}7. 检查硬编码数据类型...${NC}"
HARDCODED_DATATYPES=$(grep -r "stock-quote\|index-quote" src/ --include="*.ts" --exclude-dir=node_modules --exclude="*.constants.ts" | wc -l || echo "0")
check_warning "可能存在硬编码数据类型" "$HARDCODED_DATATYPES"

echo ""
echo -e "${BLUE}8. 检查 @common 路径别名使用...${NC}"
SHARED_IMPORTS=$(grep -r "from '@common" src/ --include="*.ts" | wc -l || echo "0")
TOTAL_TS_FILES=$(find src/ -name "*.ts" | wc -l || echo "1")
SHARED_USAGE_RATIO=$((SHARED_IMPORTS * 100 / TOTAL_TS_FILES))

if [ "$SHARED_USAGE_RATIO" -lt 30 ]; then
    echo -e "${YELLOW}⚠️  @common 路径别名使用率较低: ${SHARED_USAGE_RATIO}%${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ @common 路径别名使用率: ${SHARED_USAGE_RATIO}%${NC}"
fi

echo ""
echo "=================================================="
echo -e "${BLUE}📊 检查结果汇总${NC}"
echo "=================================================="

if [ "$VIOLATIONS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}🎉 恭喜！所有检查都通过了！${NC}"
    echo -e "${GREEN}✅ 代码完全符合 Shared 模块复用规范${NC}"
    exit 0
elif [ "$VIOLATIONS" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  检查通过，但有 $WARNINGS 个警告需要关注${NC}"
    echo -e "${YELLOW}💡 建议查看警告并进行优化${NC}"
    exit 0
else
    echo -e "${RED}❌ 发现 $VIOLATIONS 个违规项和 $WARNINGS 个警告${NC}"
    echo -e "${RED}🚨 请修复违规项后重新提交${NC}"
    echo ""
    echo -e "${BLUE}📖 修复指南：${NC}"
    echo "1. 查看 docs/common-module-compliance-checklist.md"
    echo "2. 参考 docs/开发规范指南.md 第10章"
    echo "3. 使用标准重构模板进行修复"
    echo ""
    echo -e "${BLUE}🛠️  快速修复命令：${NC}"
    echo "npm run lint:fix  # 自动修复部分问题"
    echo "npm run format    # 格式化代码"
    exit 1
fi
