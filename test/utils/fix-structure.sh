#!/bin/bash

# 自动生成的目录结构修复脚本
# 请在执行前备份代码！

set -e

echo "开始修复目录结构..."

# 创建必要的目录
mkdir -p "src/common/modules/pagination/modules/module"
mkdir -p "src/common/modules/permission/modules/module"

# 移动文件到正确位置（跳过冲突文件）
echo "移动: common/modules/pagination/modules/pagination.module.ts -> common/modules/pagination/modules/module/pagination.module.ts"
mv "src/common/modules/pagination/modules/pagination.module.ts" "src/common/modules/pagination/modules/module/pagination.module.ts"
echo "移动: common/modules/permission/modules/permission-validation.module.ts -> common/modules/permission/modules/module/permission-validation.module.ts"
mv "src/common/modules/permission/modules/permission-validation.module.ts" "src/common/modules/permission/modules/module/permission-validation.module.ts"

echo "目录结构修复完成！"
echo "正在清理空的 service 目录..."

# 清理空的 service 目录
find src -type d -name "service" -empty -delete 2>/dev/null || true
echo "已清理空的 service 目录"
echo "请检查并更新相关的导入语句"
echo "正在清理修复脚本..."

# 自焚命令 - 删除自己
SCRIPT_PATH="$0"
rm -f "$SCRIPT_PATH"
echo "修复脚本已自动删除"
