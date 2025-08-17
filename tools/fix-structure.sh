#!/bin/bash

# 自动生成的目录结构修复脚本
# 请在执行前备份代码！

set -e

echo "⚠️  检测到文件冲突，以下文件将被跳过:"
echo "  跳过: providers/decorators/metadata.types.ts -> providers/decorators/types/metadata.types.ts (目标位置已存在文件)"
echo ""
echo "请手动处理这些冲突文件后重新运行脚本"
echo ""

echo "开始修复目录结构..."

# 创建必要的目录
mkdir -p "src/core/public/smart-cache/module"

# 移动文件到正确位置（跳过冲突文件）
echo "移动: core/public/smart-cache/smart-cache.module.ts -> core/public/smart-cache/module/smart-cache.module.ts"
mv "src/core/public/smart-cache/smart-cache.module.ts" "src/core/public/smart-cache/module/smart-cache.module.ts"

echo "目录结构修复完成！"
echo "正在清理空的 service 目录..."

# 清理空的 service 目录
find src -type d -name "service" -empty -delete 2>/dev/null || true
echo "已清理空的 service 目录"
echo "⚠️  1 个文件因冲突被跳过，请手动处理"
echo "请检查并更新相关的导入语句"
echo "正在清理修复脚本..."

# 自焚命令 - 删除自己
SCRIPT_PATH="$0"
rm -f "$SCRIPT_PATH"
echo "修复脚本已自动删除"
