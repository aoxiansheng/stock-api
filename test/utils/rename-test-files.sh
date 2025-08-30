#!/bin/bash
# 自动生成的测试文件重命名脚本
# 执行前请备份测试文件

echo "开始批量重命名测试文件..."

echo "重命名: setup.ts -> setup.ts"
mv "/Users/honor/Documents/code/newstockapi/backend/test/jest/shared/setup.ts" "/Users/honor/Documents/code/newstockapi/backend/test/jest/shared/setup.ts"

echo "重命名: test-utils.ts -> test-utils.ts"
mv "/Users/honor/Documents/code/newstockapi/backend/test/jest/shared/test-utils.ts" "/Users/honor/Documents/code/newstockapi/backend/test/jest/shared/test-utils.ts"

echo "重命名: receiver-service-test-builder.ts -> receiver-service-test-builder.ts"
mv "/Users/honor/Documents/code/newstockapi/backend/test/jest/utils/receiver-service-test-builder.ts" "/Users/honor/Documents/code/newstockapi/backend/test/jest/utils/receiver-service-test-builder.ts"

echo "重命名完成!"