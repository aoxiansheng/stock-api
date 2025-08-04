#!/usr/bin/env node

import { Command } from 'commander';
import { ProviderGeneratorCLI } from './provider-generator.cli';

/**
 * 提供商管理CLI工具入口
 */
export async function main() {
  const program = new Command();

  program
    .name('provider-cli')
    .description('数据源提供商管理CLI工具')
    .version('1.0.0');

  // 注册所有命令
  ProviderGeneratorCLI.registerCommands(program);

  // 解析命令行参数
  await program.parseAsync(process.argv);
}

export { ProviderGeneratorCLI };

// 运行CLI - 只在直接运行时执行
main().catch(error => {
  console.error('CLI执行失败:', error.message);
  process.exit(1);
});