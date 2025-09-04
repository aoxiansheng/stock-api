#!/bin/bash

# =============================================================================
# 常量重复检测脚本
# 🎯 符合开发规范指南 - 自动化常量质量检测
#
# 功能：
# - 运行常量重复检测
# - 生成详细报告
# - 设置退出码供CI/CD使用
# - 提供多种输出格式
# =============================================================================

set -e # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认参数
REPORT_FORMAT="console"  # console, json, html
OUTPUT_FILE=""
VERBOSE=false
FAIL_ON_DUPLICATES=true
DUPLICATION_THRESHOLD=5.0

# 显示使用说明
show_help() {
    echo "常量重复检测脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -f, --format FORMAT     输出格式 (console, json, html) [默认: console]"
    echo "  -o, --output FILE       输出文件路径"
    echo "  -v, --verbose           详细输出"
    echo "  -t, --threshold RATE    重复率阈值 [默认: 5.0]"
    echo "  --no-fail               不因重复而失败退出"
    echo "  -h, --help              显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                                    # 基本检测"
    echo "  $0 -f json -o report.json           # JSON格式输出到文件"  
    echo "  $0 -v -t 3.0                        # 详细输出，3%阈值"
    echo "  $0 --no-fail                        # 不因重复而失败"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--format)
            REPORT_FORMAT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -t|--threshold)
            DUPLICATION_THRESHOLD="$2"
            shift 2
            ;;
        --no-fail)
            FAIL_ON_DUPLICATES=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 验证参数
if [[ ! "$REPORT_FORMAT" =~ ^(console|json|html)$ ]]; then
    echo -e "${RED}错误: 不支持的输出格式 '$REPORT_FORMAT'${NC}"
    exit 1
fi

# 检查依赖
check_dependencies() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: 需要安装 Node.js${NC}"
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}错误: 需要安装 npx${NC}"
        exit 1
    fi
    
    # 检查项目根目录
    if [[ ! -f "package.json" ]]; then
        echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
        exit 1
    fi
}

# 运行基础常量检测
run_basic_detection() {
    local start_time=$(date +%s)
    
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}🔍 开始常量重复检测...${NC}"
        echo -e "${CYAN}参数配置:${NC}"
        echo -e "  输出格式: $REPORT_FORMAT"
        echo -e "  重复率阈值: $DUPLICATION_THRESHOLD%"
        echo -e "  失败退出: $FAIL_ON_DUPLICATES"
        if [[ -n "$OUTPUT_FILE" ]]; then
            echo -e "  输出文件: $OUTPUT_FILE"
        fi
        echo ""
    fi
    
    # 创建基础检测脚本
    create_detection_script
    
    # 运行检测
    local result
    local exit_code=0
    
    if result=$(node /tmp/basic-constants-check.js 2>&1); then
        exit_code=$?
    else
        exit_code=$?
        echo -e "${RED}检测过程中发现问题${NC}"
    fi
    
    # 输出结果
    if [[ -n "$OUTPUT_FILE" ]]; then
        echo "$result" > "$OUTPUT_FILE"
        if [[ "$VERBOSE" == "true" ]]; then
            echo -e "${GREEN}✅ 报告已保存到: $OUTPUT_FILE${NC}"
        fi
    else
        echo "$result"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${CYAN}检测耗时: ${duration}秒${NC}"
    fi
    
    # 根据结果设置退出码
    if [[ "$FAIL_ON_DUPLICATES" == "true" ]] && [[ $exit_code -ne 0 ]]; then
        return 1
    else
        return 0
    fi
}

# 创建基础检测脚本
create_detection_script() {
    cat > /tmp/basic-constants-check.js << 'EOF'
const fs = require('fs');
const path = require('path');

// 简化的常量检测逻辑
function findConstantFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            findConstantFiles(fullPath, files);
        } else if (item.endsWith('.ts') && (item.includes('constant') || item.includes('message'))) {
            files.push(fullPath);
        }
    }
    
    return files;
}

function analyzeConstants() {
    const threshold = parseFloat(process.env.DUPLICATION_THRESHOLD || '5.0');
    const format = process.env.REPORT_FORMAT || 'console';
    
    console.log('📊 常量重复检测报告');
    console.log('='.repeat(50));
    console.log('');
    
    try {
        const srcDir = path.join(process.cwd(), 'src');
        if (!fs.existsSync(srcDir)) {
            console.log('❌ 未找到 src 目录');
            process.exit(1);
        }
        
        const constantFiles = findConstantFiles(srcDir);
        console.log(`📁 发现 ${constantFiles.length} 个常量相关文件`);
        
        let totalStrings = 0;
        let suspiciousDuplicates = 0;
        const valueMap = new Map();
        const duplicatePatterns = [];
        
        // 分析每个文件
        constantFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            const relativePath = path.relative(process.cwd(), file);
            
            // 提取字符串常量 (简化版本)
            const stringMatches = content.match(/"([^"]{2,})"/g) || [];
            const chineseStringMatches = content.match(/"([^"]*[\u4e00-\u9fff][^"]*)"/g) || [];
            
            const allStrings = [...stringMatches, ...chineseStringMatches]
                .map(s => s.replace(/"/g, ''))
                .filter(s => s.length > 2);
            
            totalStrings += allStrings.length;
            
            allStrings.forEach(str => {
                if (!valueMap.has(str)) {
                    valueMap.set(str, []);
                }
                valueMap.get(str).push(relativePath);
            });
        });
        
        // 查找重复项
        valueMap.forEach((files, value) => {
            if (files.length > 1) {
                suspiciousDuplicates++;
                duplicatePatterns.push({
                    value: value.substring(0, 50),
                    count: files.length,
                    files: files
                });
            }
        });
        
        const duplicationRate = totalStrings > 0 ? (suspiciousDuplicates / totalStrings) * 100 : 0;
        const success = duplicationRate <= threshold;
        
        // 输出报告
        console.log('📈 检测统计:');
        console.log(`   检测文件: ${constantFiles.length}`);
        console.log(`   字符串总数: ${totalStrings}`);
        console.log(`   疑似重复: ${suspiciousDuplicates}`);
        console.log(`   重复率: ${duplicationRate.toFixed(1)}%`);
        console.log(`   阈值: ${threshold}%`);
        console.log('');
        
        if (duplicatePatterns.length > 0) {
            console.log('🔍 疑似重复项 (前5个):');
            duplicatePatterns.slice(0, 5).forEach((dup, index) => {
                console.log(`   ${index + 1}. "${dup.value}${dup.value.length >= 50 ? '...' : ''}"`);
                console.log(`      重复次数: ${dup.count}`);
                console.log(`      文件: ${dup.files.slice(0, 2).join(', ')}${dup.files.length > 2 ? '...' : ''}`);
                console.log('');
            });
        }
        
        console.log(success ? '✅ 常量检测通过' : '❌ 常量检测失败');
        if (!success) {
            console.log(`💡 建议: 重复率 ${duplicationRate.toFixed(1)}% 超过阈值 ${threshold}%，请考虑整理重复常量`);
        }
        
        process.exit(success ? 0 : 1);
        
    } catch (error) {
        console.error('❌ 检测失败:', error.message);
        process.exit(1);
    }
}

// 设置环境变量并运行
process.env.DUPLICATION_THRESHOLD = process.env.DUPLICATION_THRESHOLD || '5.0';
process.env.REPORT_FORMAT = process.env.REPORT_FORMAT || 'console';

analyzeConstants();
EOF
}

# 清理临时文件
cleanup() {
    rm -f /tmp/basic-constants-check.js
}

# 主函数
main() {
    # 设置清理陷阱
    trap cleanup EXIT
    
    # 显示标题
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${PURPLE}=== 常量重复检测工具 ===${NC}"
        echo ""
    fi
    
    # 检查依赖
    check_dependencies
    
    # 运行检测
    if run_basic_detection; then
        if [[ "$VERBOSE" == "true" ]]; then
            echo -e "${GREEN}🎉 检测完成${NC}"
        fi
        exit 0
    else
        if [[ "$VERBOSE" == "true" ]]; then
            echo -e "${RED}❌ 检测失败或发现问题${NC}"
        fi
        exit 1
    fi
}

# 运行主函数
main "$@"