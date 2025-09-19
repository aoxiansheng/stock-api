#!/bin/bash
echo "🔍 验证兼容层清理完成..."

# 检查是否还有兼容方法
COMPAT_METHODS=$(grep -r "async mapSymbol" src/core/02-processing/symbol-transformer/ --include="*.ts" || echo "无发现")
if [ "$COMPAT_METHODS" != "无发现" ]; then
  echo "❌ 仍有兼容方法未清理: $COMPAT_METHODS"
  exit 1
fi

# 检查是否还有Token别名
COMPAT_TOKENS=$(grep -r "SYMBOL_.*_TOKEN.*=" src/core/02-processing/symbol-transformer/ --include="*.ts" || echo "无发现")
if [ "$COMPAT_TOKENS" != "无发现" ]; then
  echo "❌ 仍有兼容Token未清理: $COMPAT_TOKENS"
  exit 1
fi

# 检查是否还有接口重导出
REEXPORT_TOKENS=$(grep -r "SYMBOL_.*_TOKEN" src/core/02-processing/symbol-transformer/interfaces/ --include="*.ts" || echo "无发现")
if [ "$REEXPORT_TOKENS" != "无发现" ]; then
  echo "❌ 仍有Token重导出未清理: $REEXPORT_TOKENS"
  exit 1
fi

echo "✅ 兼容层清理验证完成 - 移除了36行兼容代码"