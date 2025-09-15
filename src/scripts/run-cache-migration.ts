#!/usr/bin/env bun
/**
 * 缓存键迁移执行脚本
 * 🎯 命令行工具，用于执行Alert组件缓存键TTL迁移
 * 
 * @description 提供安全的缓存迁移操作，支持备份、验证和回滚
 * @author Alert配置合规优化任务  
 * @created 2025-09-15
 * 
 * 使用方法:
 * bun run src/scripts/run-cache-migration.ts --mode=dry-run
 * bun run src/scripts/run-cache-migration.ts --mode=migrate --backup
 * bun run src/scripts/run-cache-migration.ts --mode=validate
 * bun run src/scripts/run-cache-migration.ts --mode=restore --backup-id=<id>
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { CacheKeyMigrationScript } from './cache-key-migration.script';

interface CliOptions {
  mode: 'dry-run' | 'migrate' | 'validate' | 'restore' | 'stats';
  backup?: boolean;
  backupId?: string;
  help?: boolean;
}

class CacheMigrationCli {
  private readonly logger = new Logger('CacheMigrationCli');

  async run(): Promise<void> {
    const options = this.parseArguments();

    if (options.help) {
      this.printHelp();
      return;
    }

    this.logger.log('初始化NestJS应用...');
    
    // 禁用自动初始化以避免副作用
    process.env.DISABLE_AUTO_INIT = 'true';
    
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    try {
      const migrationScript = app.get(CacheKeyMigrationScript);
      
      switch (options.mode) {
        case 'dry-run':
          await this.runDryRun(migrationScript);
          break;
        case 'migrate':
          await this.runMigration(migrationScript, options.backup);
          break;
        case 'validate':
          await this.runValidation(migrationScript);
          break;
        case 'restore':
          await this.runRestore(migrationScript, options.backupId);
          break;
        case 'stats':
          await this.runStats(migrationScript);
          break;
        default:
          this.logger.error(`未知模式: ${options.mode}`);
          this.printHelp();
          process.exit(1);
      }
    } catch (error) {
      this.logger.error('执行失败', error);
      process.exit(1);
    } finally {
      await app.close();
    }
  }

  /**
   * 执行模拟迁移
   */
  private async runDryRun(migrationScript: CacheKeyMigrationScript): Promise<void> {
    this.logger.log('🔍 执行模拟迁移 (Dry Run)');
    this.logger.log('⚠️  这是模拟模式，不会对缓存进行实际修改');
    
    const result = await migrationScript.executeMigration(true);
    
    this.logger.log('📊 模拟迁移结果:');
    this.logger.log(`   总扫描键数: ${result.totalKeysScanned}`);
    this.logger.log(`   需要迁移: ${result.migratedKeys}`);
    this.logger.log(`   跳过键数: ${result.skippedKeys}`);
    this.logger.log(`   错误数量: ${result.errors.length}`);
    this.logger.log(`   执行耗时: ${result.elapsedTime}ms`);
    
    if (result.errors.length > 0) {
      this.logger.warn('发现错误:');
      result.errors.forEach(error => this.logger.warn(`   - ${error}`));
    }

    if (result.migratedKeys > 0) {
      this.logger.log('');
      this.logger.log('✅ 模拟迁移完成，可以执行实际迁移:');
      this.logger.log('   bun run src/scripts/run-cache-migration.ts --mode=migrate --backup');
    } else {
      this.logger.log('');
      this.logger.log('ℹ️  没有发现需要迁移的缓存键');
    }
  }

  /**
   * 执行实际迁移
   */
  private async runMigration(migrationScript: CacheKeyMigrationScript, createBackup: boolean): Promise<void> {
    this.logger.log('🚀 执行缓存键迁移');
    this.logger.warn('⚠️  这将对生产缓存进行实际修改');

    let backupInfo = null;

    if (createBackup) {
      this.logger.log('📦 创建迁移备份...');
      backupInfo = await migrationScript.createMigrationBackup();
      this.logger.log(`✅ 备份创建成功: ID=${backupInfo.backupId}, 键数=${backupInfo.keyCount}, 大小=${backupInfo.backupSize}`);
    }

    try {
      const result = await migrationScript.executeMigration(false);
      
      this.logger.log('📊 迁移结果:');
      this.logger.log(`   总扫描键数: ${result.totalKeysScanned}`);
      this.logger.log(`   成功迁移: ${result.migratedKeys}`);
      this.logger.log(`   跳过键数: ${result.skippedKeys}`);
      this.logger.log(`   错误数量: ${result.errors.length}`);
      this.logger.log(`   执行耗时: ${result.elapsedTime}ms`);

      if (result.errors.length > 0) {
        this.logger.error('迁移过程中发现错误:');
        result.errors.forEach(error => this.logger.error(`   - ${error}`));
      }

      this.logger.log('');
      this.logger.log('✅ 缓存键迁移完成');
      
      if (backupInfo) {
        this.logger.log(`📦 备份信息: ${backupInfo.backupId}`);
        this.logger.log('   如需回滚，请执行:');
        this.logger.log(`   bun run src/scripts/run-cache-migration.ts --mode=restore --backup-id=${backupInfo.backupId}`);
      }

      this.logger.log('');
      this.logger.log('🔍 建议执行验证:');
      this.logger.log('   bun run src/scripts/run-cache-migration.ts --mode=validate');

    } catch (error) {
      this.logger.error('迁移失败', error);
      
      if (backupInfo) {
        this.logger.log('');
        this.logger.log('🔄 可以使用以下命令回滚:');
        this.logger.log(`   bun run src/scripts/run-cache-migration.ts --mode=restore --backup-id=${backupInfo.backupId}`);
      }
      
      throw error;
    }
  }

  /**
   * 验证迁移结果
   */
  private async runValidation(migrationScript: CacheKeyMigrationScript): Promise<void> {
    this.logger.log('🔍 验证缓存键迁移结果');
    
    const result = await migrationScript.validateMigration();
    
    this.logger.log('📊 验证结果:');
    Object.entries(result.summary).forEach(([pattern, summary]) => {
      this.logger.log(`   ${pattern}:`);
      this.logger.log(`     总计: ${summary.total}`);
      this.logger.log(`     正确TTL: ${summary.correctTtl}`);
      this.logger.log(`     错误TTL: ${summary.incorrectTtl}`);
    });

    this.logger.log('');
    if (result.isValid) {
      this.logger.log('✅ 验证通过，所有缓存键TTL正确');
    } else {
      this.logger.error('❌ 验证失败，发现问题:');
      result.issues.forEach(issue => this.logger.error(`   - ${issue}`));
      
      this.logger.log('');
      this.logger.log('💡 建议重新执行迁移:');
      this.logger.log('   bun run src/scripts/run-cache-migration.ts --mode=migrate --backup');
    }
  }

  /**
   * 恢复备份
   */
  private async runRestore(migrationScript: CacheKeyMigrationScript, backupId?: string): Promise<void> {
    if (!backupId) {
      this.logger.error('❌ 恢复操作需要指定备份ID');
      this.logger.log('使用方法: --mode=restore --backup-id=<backup_id>');
      process.exit(1);
    }

    this.logger.log(`🔄 恢复缓存备份: ${backupId}`);
    this.logger.warn('⚠️  这将覆盖当前缓存数据');

    const result = await migrationScript.restoreMigrationBackup(backupId);
    
    this.logger.log('📊 恢复结果:');
    this.logger.log(`   恢复键数: ${result.restoredKeys}`);
    this.logger.log(`   错误数量: ${result.errors.length}`);

    if (result.errors.length > 0) {
      this.logger.error('恢复过程中发现错误:');
      result.errors.forEach(error => this.logger.error(`   - ${error}`));
    }

    if (result.restoredKeys > 0) {
      this.logger.log('');
      this.logger.log('✅ 缓存备份恢复完成');
    }
  }

  /**
   * 显示迁移统计
   */
  private async runStats(migrationScript: CacheKeyMigrationScript): Promise<void> {
    this.logger.log('📊 获取缓存迁移统计信息');
    
    const stats = await migrationScript.getMigrationStats();
    
    this.logger.log('');
    this.logger.log('📈 缓存统计:');
    this.logger.log(`   总键数: ${stats.totalKeys}`);
    this.logger.log(`   内存使用: ${stats.totalMemoryUsage}`);
    
    this.logger.log('');
    this.logger.log('📋 分模式统计:');
    stats.patterns.forEach(pattern => {
      this.logger.log(`   ${pattern.pattern}:`);
      this.logger.log(`     描述: ${pattern.description}`);
      this.logger.log(`     键数: ${pattern.keyCount}`);
      this.logger.log(`     平均TTL: ${pattern.avgTtl}秒`);
    });
  }

  /**
   * 解析命令行参数
   */
  private parseArguments(): CliOptions {
    const args = process.argv.slice(2);
    const options: CliOptions = {
      mode: 'dry-run',
    };

    for (const arg of args) {
      if (arg.startsWith('--mode=')) {
        options.mode = arg.split('=')[1] as CliOptions['mode'];
      } else if (arg === '--backup') {
        options.backup = true;
      } else if (arg.startsWith('--backup-id=')) {
        options.backupId = arg.split('=')[1];
      } else if (arg === '--help' || arg === '-h') {
        options.help = true;
      }
    }

    return options;
  }

  /**
   * 打印帮助信息
   */
  private printHelp(): void {
    console.log(`
缓存键迁移工具 - Alert组件TTL配置迁移

使用方法:
  bun run src/scripts/run-cache-migration.ts [选项]

选项:
  --mode=<模式>           操作模式 (必需)
    dry-run              模拟迁移，不做实际修改 (默认)
    migrate              执行实际迁移
    validate             验证迁移结果
    restore              恢复备份
    stats                显示统计信息

  --backup               在迁移前创建备份 (仅migrate模式)
  --backup-id=<ID>       指定备份ID (仅restore模式)
  --help, -h             显示此帮助信息

示例:
  # 模拟迁移，查看影响
  bun run src/scripts/run-cache-migration.ts --mode=dry-run

  # 执行迁移并创建备份
  bun run src/scripts/run-cache-migration.ts --mode=migrate --backup

  # 验证迁移结果
  bun run src/scripts/run-cache-migration.ts --mode=validate

  # 恢复指定备份
  bun run src/scripts/run-cache-migration.ts --mode=restore --backup-id=cache_migration_backup_1726394123456

  # 查看统计信息
  bun run src/scripts/run-cache-migration.ts --mode=stats

注意事项:
  - 建议先执行dry-run模式查看影响
  - migrate模式建议使用--backup选项创建备份
  - 迁移完成后建议执行validate模式验证结果
  - 如果需要回滚，可以使用restore模式恢复备份
`);
  }
}

// 执行CLI
const cli = new CacheMigrationCli();
cli.run().catch(error => {
  console.error('CLI执行失败:', error);
  process.exit(1);
});