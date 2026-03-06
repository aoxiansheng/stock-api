/**
 * Jest E2E 测试全局设置
 * 在所有测试运行之前加载测试环境变量
 */
import { config } from 'dotenv';
import { resolve } from 'path';

const DEFAULT_E2E_TEST_TIMEOUT_MS = 120000;

// 加载 .env.test 文件
const result = config({ path: resolve(__dirname, '../../.env.test') });

if (result.error) {
  console.warn('⚠️  警告: 未能加载 .env.test 文件:', result.error.message);
  console.warn('   测试将使用默认环境变量或系统环境变量');
} else {
  console.log('✅ 已加载测试环境变量从: .env.test');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '***已设置***' : '未设置'}`);
}

const parsedE2eTimeout = Number.parseInt(process.env.E2E_TEST_TIMEOUT_MS || '', 10);
const e2eTestTimeoutMs =
  Number.isFinite(parsedE2eTimeout) && parsedE2eTimeout > 0
    ? parsedE2eTimeout
    : DEFAULT_E2E_TEST_TIMEOUT_MS;
const shouldForceHandleCleanup = process.env.E2E_FORCE_HANDLE_CLEANUP === '1';

// 与 jest config 保持同一超时来源
process.env.E2E_TEST_TIMEOUT_MS = String(e2eTestTimeoutMs);
jest.setTimeout(e2eTestTimeoutMs);
console.log(`   E2E_TEST_TIMEOUT_MS: ${e2eTestTimeoutMs}`);

afterAll(async () => {
  try {
    const mongoose = await import('mongoose');
    const closeJobs = mongoose.connections
      .filter((conn) => conn.readyState !== 0)
      .map((conn) => conn.close(true).catch(() => undefined));
    await Promise.all(closeJobs);
    await mongoose.disconnect().catch(() => undefined);
  } catch {
    // ignore teardown errors
  }

  const getActiveHandles = (process as NodeJS.Process & {
    _getActiveHandles?: () => unknown[];
  })._getActiveHandles;

  if (!getActiveHandles) {
    return;
  }

  const activeHandles = getActiveHandles();
  if (activeHandles.length === 0) {
    console.log('[e2e/open-handles] 未检测到活动句柄');
    return;
  }

  const handleSummary = activeHandles.reduce<Record<string, number>>((acc, handle) => {
    const ctorName =
      typeof handle === 'object' && handle !== null && 'constructor' in handle
        ? (handle as { constructor?: { name?: string } }).constructor?.name
        : '';
    const handleName = ctorName || typeof handle;
    acc[handleName] = (acc[handleName] || 0) + 1;
    return acc;
  }, {});

  const summaryText = Object.entries(handleSummary)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}:${count}`)
    .join(', ');
  console.warn(`[e2e/open-handles] 活动句柄摘要(${activeHandles.length}): ${summaryText}`);

  if (!shouldForceHandleCleanup) {
    console.warn(
      '[e2e/open-handles] 默认仅诊断，不执行强制清理。设置 E2E_FORCE_HANDLE_CLEANUP=1 可启用清理。',
    );
    return;
  }

  let cleanupAttempts = 0;
  for (const handle of activeHandles) {
    const maybeHandle = handle as {
      hasRef?: () => boolean;
      unref?: () => void;
      close?: () => void;
    };
    const ctorName =
      typeof handle === 'object' && handle !== null && 'constructor' in handle
        ? (handle as { constructor?: { name?: string } }).constructor?.name
        : '';

    if (ctorName === 'Timeout') {
      clearTimeout(handle as NodeJS.Timeout);
      cleanupAttempts += 1;
      continue;
    }
    if (ctorName === 'Immediate') {
      clearImmediate(handle as NodeJS.Immediate);
      cleanupAttempts += 1;
      continue;
    }
    if (typeof maybeHandle.close === 'function') {
      try {
        maybeHandle.close();
        cleanupAttempts += 1;
      } catch {
        // ignore close errors
      }
      continue;
    }
    if (typeof maybeHandle.hasRef === 'function' && maybeHandle.hasRef()) {
      maybeHandle.unref?.();
      cleanupAttempts += 1;
    }
  }

  console.warn(`[e2e/open-handles] 强制清理已执行，尝试处理 ${cleanupAttempts} 个句柄`);
});
