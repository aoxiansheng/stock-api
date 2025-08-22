#!/bin/bash

# StreamCache 部署脚本
# 支持开发、测试、预发布、生产环境的自动化部署

set -euo pipefail

# 脚本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_ENV="${1:-development}"
DRY_RUN="${2:-false}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示使用说明
show_usage() {
    cat << EOF
StreamCache 部署脚本

用法: $0 <环境> [dry-run]

环境选项:
  development  - 开发环境 (默认)
  test        - 测试环境
  staging     - 预发布环境
  production  - 生产环境

选项:
  dry-run     - 仅显示将要执行的操作，不实际执行

示例:
  $0 development
  $0 production dry-run
  $0 staging

EOF
}

# 验证环境参数
validate_environment() {
    case "$DEPLOYMENT_ENV" in
        development|test|staging|production)
            log_info "部署环境: $DEPLOYMENT_ENV"
            ;;
        *)
            log_error "无效的环境: $DEPLOYMENT_ENV"
            show_usage
            exit 1
            ;;
    esac
}

# 检查必要的工具
check_prerequisites() {
    log_info "检查部署先决条件..."
    
    local missing_tools=()
    
    # 检查Node.js/Bun
    if ! command -v bun &> /dev/null; then
        missing_tools+=("bun")
    fi
    
    # 检查Redis
    if ! command -v redis-cli &> /dev/null; then
        missing_tools+=("redis-cli")
    fi
    
    # 检查Docker (可选)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker未安装，将跳过容器化部署选项"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "缺少必要工具: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "先决条件检查通过"
}

# 加载环境配置
load_environment_config() {
    log_info "加载 $DEPLOYMENT_ENV 环境配置..."
    
    local env_file="$PROJECT_ROOT/.env.$DEPLOYMENT_ENV"
    
    if [ -f "$env_file" ]; then
        # 导出环境变量
        set -a
        source "$env_file"
        set +a
        log_success "环境配置已加载: $env_file"
    else
        log_warning "环境配置文件不存在: $env_file"
        log_info "将使用默认配置"
    fi
}

# 验证Redis连接
verify_redis_connection() {
    log_info "验证Redis连接..."
    
    local redis_host="${REDIS_HOST:-localhost}"
    local redis_port="${REDIS_PORT:-6379}"
    local redis_db="${REDIS_STREAM_CACHE_DB:-1}"
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将连接到 Redis: $redis_host:$redis_port (DB: $redis_db)"
        return 0
    fi
    
    # 测试Redis连接
    if redis-cli -h "$redis_host" -p "$redis_port" ping > /dev/null 2>&1; then
        log_success "Redis连接成功: $redis_host:$redis_port"
    else
        log_error "Redis连接失败: $redis_host:$redis_port"
        exit 1
    fi
    
    # 测试指定DB
    if redis-cli -h "$redis_host" -p "$redis_port" -n "$redis_db" ping > /dev/null 2>&1; then
        log_success "Redis DB连接成功: DB $redis_db"
    else
        log_error "Redis DB连接失败: DB $redis_db"
        exit 1
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将执行: cd $PROJECT_ROOT && bun install"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    if bun install; then
        log_success "依赖安装完成"
    else
        log_error "依赖安装失败"
        exit 1
    fi
}

# 运行测试
run_tests() {
    log_info "运行StreamCache测试套件..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将执行StreamCache测试"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # 单元测试
    log_info "运行单元测试..."
    if bun test test/jest/unit/core/05-caching/stream-cache/; then
        log_success "单元测试通过"
    else
        log_error "单元测试失败"
        exit 1
    fi
    
    # 集成测试 (仅在非production环境)
    if [ "$DEPLOYMENT_ENV" != "production" ]; then
        log_info "运行集成测试..."
        if REDIS_TEST_DB=15 bun test test/jest/integration/core/05-caching/stream-cache/; then
            log_success "集成测试通过"
        else
            log_warning "集成测试失败，但将继续部署"
        fi
    fi
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将执行: cd $PROJECT_ROOT && bun run build"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    if bun run build; then
        log_success "项目构建完成"
    else
        log_error "项目构建失败"
        exit 1
    fi
}

# 初始化StreamCache
initialize_stream_cache() {
    log_info "初始化StreamCache..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将初始化StreamCache配置"
        return 0
    fi
    
    local redis_host="${REDIS_HOST:-localhost}"
    local redis_port="${REDIS_PORT:-6379}"
    local redis_db="${REDIS_STREAM_CACHE_DB:-1}"
    
    # 清理测试数据 (仅在非生产环境)
    if [ "$DEPLOYMENT_ENV" != "production" ]; then
        log_info "清理测试数据..."
        redis-cli -h "$redis_host" -p "$redis_port" -n "$redis_db" \
            EVAL "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 "test:*" > /dev/null 2>&1 || true
    fi
    
    # 设置基础配置键
    redis-cli -h "$redis_host" -p "$redis_port" -n "$redis_db" \
        SET "stream_cache:config:deployed_at" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" EX 86400 > /dev/null
    
    redis-cli -h "$redis_host" -p "$redis_port" -n "$redis_db" \
        SET "stream_cache:config:environment" "$DEPLOYMENT_ENV" EX 86400 > /dev/null
    
    log_success "StreamCache初始化完成"
}

# 健康检查
perform_health_check() {
    log_info "执行部署后健康检查..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将执行健康检查"
        return 0
    fi
    
    local app_url="${APP_URL:-http://localhost:3000}"
    local max_attempts=30
    local attempt=1
    
    # 等待应用启动
    log_info "等待应用启动..."
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$app_url/api/v1/monitoring/health" > /dev/null 2>&1; then
            log_success "应用健康检查通过"
            break
        fi
        
        log_info "等待应用启动... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "应用健康检查超时"
        exit 1
    fi
    
    # StreamCache特定健康检查
    if curl -sf "$app_url/api/v1/monitoring/stream-cache/stats" > /dev/null 2>&1; then
        log_success "StreamCache健康检查通过"
    else
        log_warning "StreamCache健康检查失败，请检查配置"
    fi
}

# 部署总结
deployment_summary() {
    local end_time=$(date)
    
    log_success "=== StreamCache部署完成 ==="
    echo
    echo "环境: $DEPLOYMENT_ENV"
    echo "完成时间: $end_time"
    echo "Redis: ${REDIS_HOST:-localhost}:${REDIS_PORT:-6379} (DB: ${REDIS_STREAM_CACHE_DB:-1})"
    echo
    
    if [ "$DRY_RUN" != "true" ]; then
        echo "下一步操作:"
        echo "1. 访问应用: ${APP_URL:-http://localhost:3000}"
        echo "2. 查看缓存统计: ${APP_URL:-http://localhost:3000}/api/v1/monitoring/stream-cache/stats"
        echo "3. 监控日志: tail -f logs/application.log"
        echo
    fi
    
    log_info "StreamCache部署脚本执行完成"
}

# 错误处理
cleanup_on_error() {
    log_error "部署过程中发生错误，正在清理..."
    
    # 这里可以添加清理逻辑
    # 例如：停止服务、回滚配置等
    
    exit 1
}

# 主函数
main() {
    local start_time=$(date)
    
    log_info "=== StreamCache部署开始 ==="
    log_info "开始时间: $start_time"
    log_info "目标环境: $DEPLOYMENT_ENV"
    log_info "运行模式: $([ "$DRY_RUN" = "true" ] && echo "DRY-RUN" || echo "EXECUTE")"
    echo
    
    # 设置错误处理
    trap cleanup_on_error ERR
    
    # 执行部署步骤
    validate_environment
    check_prerequisites
    load_environment_config
    verify_redis_connection
    install_dependencies
    run_tests
    build_project
    initialize_stream_cache
    perform_health_check
    deployment_summary
}

# 参数处理
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_usage
    exit 0
fi

# 执行主函数
main