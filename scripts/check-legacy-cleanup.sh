#!/bin/bash

# 旧系统清理验证脚本
# 检查遗留文件和废弃字段清理情况

echo "🧹 旧系统清理验证报告"
echo "==================================="

# 检查 .legacy 文件
echo ""
echo "📄 检查 .legacy 文件..."
legacy_files=$(find src/ -name "*.legacy" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$legacy_files" -eq 0 ]; then
    echo "✅ 无 .legacy 文件"
else
    echo "❌ 发现 $legacy_files 个 .legacy 文件:"
    find src/ -name "*.legacy" -type f
fi

# 检查 StreamCacheService 别名清理
echo ""
echo "🔧 检查 StreamCacheService 别名..."
if grep -r "provide.*StreamCacheService" src/ >/dev/null 2>&1; then
    echo "❌ 发现 StreamCacheService provider 别名:"
    grep -rn "provide.*StreamCacheService" src/
else
    echo "✅ StreamCacheService provider 别名已清理"
fi

if grep -r "exports.*StreamCacheService" src/ >/dev/null 2>&1; then
    echo "❌ 发现 StreamCacheService export 别名:"
    grep -rn "exports.*StreamCacheService" src/
else
    echo "✅ StreamCacheService export 别名已清理"
fi

# 检查 processingTime 字段迁移
echo ""
echo "⏰ 检查 processingTime 字段迁移..."
deprecated_fields=$(grep -r "processingTime[^M]" src/ --include="*.ts" | grep -v "processingTimeMs" | grep -v "processingTimeout" | wc -l | tr -d ' ')
if [ "$deprecated_fields" -eq 0 ]; then
    echo "✅ processingTime 字段已全部迁移为 processingTimeMs"
else
    echo "⚠️  发现 $deprecated_fields 处可能未迁移的 processingTime 字段:"
    grep -rn "processingTime[^M]" src/ --include="*.ts" | grep -v "processingTimeMs" | grep -v "processingTimeout" | head -5
fi

# 检查 metricsLegacyModeEnabled 清理
echo ""
echo "🎯 检查 Feature Flags 清理..."
if grep -r "metricsLegacyModeEnabled" src/ >/dev/null 2>&1; then
    echo "❌ metricsLegacyModeEnabled 仍然存在:"
    grep -rn "metricsLegacyModeEnabled" src/
else
    echo "✅ metricsLegacyModeEnabled 已清理"
fi

# 检查注释更新
echo ""
echo "📝 检查注释更新..."
old_comments=$(grep -r "StreamCacheService[^S]" src/ --include="*.ts" | wc -l | tr -d ' ')
if [ "$old_comments" -eq 0 ]; then
    echo "✅ StreamCacheService 注释已更新"
else
    echo "⚠️  发现 $old_comments 处可能需要更新的注释:"
    grep -rn "StreamCacheService[^S]" src/ --include="*.ts"
fi

# 应用启动测试
echo ""
echo "🚀 应用启动测试..."
echo "注意: 将启动应用10秒后自动终止"

# 启动应用并限制时间
DISABLE_AUTO_INIT=false timeout 10s bun run start >/dev/null 2>&1 &
START_PID=$!

sleep 10
kill $START_PID 2>/dev/null
wait $START_PID 2>/dev/null

if [ $? -eq 0 ] || [ $? -eq 143 ]; then  # 143 是 SIGTERM 的退出码
    echo "✅ 应用启动测试通过"
else
    echo "❌ 应用启动测试失败"
fi

echo ""
echo "==================================="
echo "🎯 验证完成！"
echo ""
echo "如果所有项目都显示 ✅，说明清理工作已完成。"
echo "如果有 ❌ 或 ⚠️，请根据提示进行修复。"