import { readdir, stat } from 'fs/promises';
import { join, extname, dirname, relative } from 'path';
import { createLogger } from '@common/config/logger.config';
import { SmartPathResolver } from './smart-path-resolver';
import { getProviderScanConfig, shouldExcludeDirectory } from '../config/provider-scan.config';
import {
  ProviderInfo,
  ProviderLoadResult,
  ScanOptions,
  ConventionViolation,
  ScanStats,
  ScanResult
} from '../decorators/metadata.types';

/**
 * 约定优于配置的目录扫描器 - 单例模式防止重复扫描
 */
export class ConventionScanner {
  private static readonly logger = createLogger('ConventionScanner');
  private static instance: ConventionScanner | null = null;
  private static scanCache = new Map<string, ScanResult>();
  private static lastScanTime: Date | null = null;
  
  private constructor() {}
  
  /**
   * 获取单例实例
   */
  static getInstance(): ConventionScanner {
    if (!ConventionScanner.instance) {
      ConventionScanner.instance = new ConventionScanner();
    }
    return ConventionScanner.instance;
  }
  
  private static getDefaultOptions(): Required<ScanOptions> {
    const scanConfig = getProviderScanConfig();
    return {
      recursive: true,
      excludeDirs: scanConfig.excludedDirs,
      includeExtensions: scanConfig.supportedExtensions,
      validateConventions: scanConfig.validateConventions,
      autoFix: false
    };
  }

  /**
   * 扫描所有提供商 - 带缓存机制
   */
  async scanProviders(options: ScanOptions = {}): Promise<ScanResult> {
    const finalOptions = { ...ConventionScanner.getDefaultOptions(), ...options };
    const providersPath = SmartPathResolver.getProvidersPath();
    
    // 缓存键：基于路径和选项生成
    const cacheKey = `${providersPath}:${JSON.stringify(finalOptions)}`;
    
    // 检查缓存（5分钟内的扫描结果直接返回）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (ConventionScanner.scanCache.has(cacheKey) && 
        ConventionScanner.lastScanTime && 
        ConventionScanner.lastScanTime > fiveMinutesAgo) {
      ConventionScanner.logger.debug('使用缓存的扫描结果');
      return ConventionScanner.scanCache.get(cacheKey)!;
    }
    
    ConventionScanner.logger.log(`开始扫描提供商目录: ${providersPath}`);

    const providers: ProviderInfo[] = [];
    const violations: ConventionViolation[] = [];
    const stats: ScanStats = {
      totalDirectories: 0,
      validProviders: 0,
      invalidProviders: 0,
      skippedDirectories: 0,
      processedFiles: 0
    };

    try {
      const entries = await readdir(providersPath, { withFileTypes: true });
      stats.totalDirectories = entries.filter(e => e.isDirectory()).length;

      for (const entry of entries) {
        if (this.isProviderDirectory(entry, finalOptions)) {
          const result = await this.analyzeProvider(entry.name, finalOptions);
          
          if (result.success && result.provider) {
            providers.push(result.provider);
            stats.validProviders++;
          } else {
            stats.invalidProviders++;
            if (result.error) {
              violations.push(this.errorToViolation(entry.name, result.error));
            }
          }
        } else {
          stats.skippedDirectories++;
        }
      }

      // 验证约定
      if (finalOptions.validateConventions) {
        const conventionViolations = await this.validateConventions(providers);
        violations.push(...conventionViolations);
      }

      ConventionScanner.logger.log(
        `扫描完成: ${stats.validProviders} 个有效提供商, ${stats.invalidProviders} 个无效, ${violations.length} 个约定违规`
      );

      const result = { providers, violations, stats };
      
      // 缓存结果
      ConventionScanner.scanCache.set(cacheKey, result);
      ConventionScanner.lastScanTime = new Date();
      
      return result;
    } catch (error) {
      ConventionScanner.logger.error(`扫描提供商失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 扫描特定提供商的能力
   */
  async scanProviderCapabilities(providerName: string, options: ScanOptions = {}): Promise<{
    capabilities: string[];
    violations: ConventionViolation[];
  }> {
    const finalOptions = { ...ConventionScanner.getDefaultOptions(), ...options };
    const capabilitiesPath = SmartPathResolver.getProviderCapabilitiesPath(providerName);
    
    const capabilities: string[] = [];
    const violations: ConventionViolation[] = [];

    try {
      if (!SmartPathResolver.pathExists(capabilitiesPath)) {
        violations.push({
          type: 'missing_directory',
          path: capabilitiesPath,
          message: `提供商 ${providerName} 缺少 capabilities 目录`,
          suggestion: `创建目录: ${capabilitiesPath}`,
          autoFixable: true
        });
        return { capabilities, violations };
      }

      const files = await readdir(capabilitiesPath);
      
      for (const file of files) {
        if (this.isCapabilityFile(file, finalOptions)) {
          const capabilityName = this.extractCapabilityName(file);
          capabilities.push(capabilityName);

          // 验证能力文件约定
          const capabilityViolations = await this.validateCapabilityFile(
            providerName, 
            capabilityName, 
            file
          );
          violations.push(...capabilityViolations);
        }
      }

      return { capabilities, violations };
    } catch (error) {
      violations.push({
        type: 'invalid_structure',
        path: capabilitiesPath,
        message: `扫描能力失败: ${error.message}`
      });
      return { capabilities, violations };
    }
  }

  /**
   * 判断是否为提供商目录
   */
  private isProviderDirectory(entry: any, options: ScanOptions): boolean {
    if (!entry.isDirectory()) return false;
    
    // 使用统一的排除逻辑
    if (shouldExcludeDirectory(entry.name)) return false;
    
    // 支持选项中的额外排除目录
    if (options.excludeDirs?.includes(entry.name)) return false;

    return true;
  }

  /**
   * 分析提供商
   */
  private async analyzeProvider(name: string, options: ScanOptions): Promise<ProviderLoadResult> {
    try {
      // 检查提供商结构
      const structureValid = await this.validateProviderStructure(name);
      if (!structureValid) {
        return {
          success: false,
          error: new Error(`提供商 ${name} 结构不完整`)
        };
      }

      // 扫描能力
      const { capabilities } = await this.scanProviderCapabilities(name, options);

      // 尝试加载提供商主文件
      const providerMain = await this.loadProviderMain(name);

      const provider: ProviderInfo = {
        name,
        main: providerMain,
        capabilities,
        autoDiscovered: true
      };

      return {
        success: true,
        provider
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * 验证提供商结构
   */
  private async validateProviderStructure(providerName: string): Promise<boolean> {
    const providerPath = SmartPathResolver.getProviderPath(providerName);
    
    try {
      const stats = await stat(providerPath);
      if (!stats.isDirectory()) return false;

      // 检查必需的文件或目录
      const capabilitiesPath = join(providerPath, 'capabilities');
      const hasCapabilities = SmartPathResolver.pathExists(capabilitiesPath);
      
      // 检查主文件
      const possibleMainFiles = [
        join(providerPath, 'index.ts'),
        join(providerPath, `${providerName}.provider.ts`),
        join(providerPath, 'provider.ts')
      ];

      const hasMainFile = possibleMainFiles.some(file => SmartPathResolver.pathExists(file));

      return hasCapabilities || hasMainFile;
    } catch {
      return false;
    }
  }

  /**
   * 加载提供商主文件
   */
  private async loadProviderMain(providerName: string): Promise<any | null> {
    const providerPath = SmartPathResolver.getProviderPath(providerName);
    
    // 使用统一配置生成主文件路径
    const scanConfig = getProviderScanConfig();
    const possibleMainFiles = scanConfig.mainFilePatterns.map(pattern => {
      const filename = pattern.replace('{provider}', providerName);
      return join(providerPath, filename);
    });

    for (const file of possibleMainFiles) {
      if (SmartPathResolver.pathExists(file)) {
        try {
          // 构建正确的相对导入路径
          const targetFile = file.replace(/\.ts$/, '');
          const currentFileDir = dirname(__filename);
          
          // 使用path.relative计算相对路径
          let relativeToCurrentFile = relative(currentFileDir, targetFile);
          
          // 确保路径以 './' 或 '../' 开头
          if (!relativeToCurrentFile.startsWith('.')) {
            relativeToCurrentFile = './' + relativeToCurrentFile;
          }
          
          const module = await import(relativeToCurrentFile);
          return module.default || module;
        } catch (error) {
          ConventionScanner.logger.debug(`加载提供商主文件失败: ${file}, ${error.message}`);
        }
      }
    }

    return null;
  }

  /**
   * 判断是否为能力文件
   */
  private isCapabilityFile(filename: string, options: ScanOptions): boolean {
    const ext = extname(filename);
    if (!options.includeExtensions?.includes(ext)) return false;
    if (filename.startsWith('.')) return false;
    if (filename.includes('.spec.') || filename.includes('.test.')) return false;

    return true;
  }

  /**
   * 提取能力名称
   */
  private extractCapabilityName(filename: string): string {
    return filename.replace(/\.(ts|js)$/, '');
  }

  /**
   * 验证能力文件约定
   */
  private async validateCapabilityFile(
    providerName: string,
    capabilityName: string,
    filename: string
  ): Promise<ConventionViolation[]> {
    const violations: ConventionViolation[] = [];

    // 检查命名约定
    if (!this.isValidCapabilityName(capabilityName)) {
      violations.push({
        type: 'naming_convention',
        path: join(SmartPathResolver.getProviderCapabilitiesPath(providerName), filename),
        message: `能力名称 ${capabilityName} 不符合命名约定`,
        suggestion: '能力名称应使用 kebab-case 格式，如: get-stock-quote'
      });
    }

    // TODO: 可以添加更多验证，如检查文件内容是否实现了正确的接口

    return violations;
  }

  /**
   * 验证能力名称
   */
  private isValidCapabilityName(name: string): boolean {
    // 检查 kebab-case 格式
    const kebabCasePattern = /^[a-z]+(-[a-z]+)*$/;
    return kebabCasePattern.test(name);
  }

  /**
   * 验证约定
   */
  private async validateConventions(providers: ProviderInfo[]): Promise<ConventionViolation[]> {
    const violations: ConventionViolation[] = [];

    for (const provider of providers) {
      // 检查提供商名称约定
      if (!this.isValidProviderName(provider.name)) {
        violations.push({
          type: 'naming_convention',
          path: SmartPathResolver.getProviderPath(provider.name),
          message: `提供商名称 ${provider.name} 不符合命名约定`,
          suggestion: '提供商名称应使用 kebab-case 格式'
        });
      }

      // 检查是否有能力
      if (provider.capabilities.length === 0) {
        violations.push({
          type: 'missing_file',
          path: SmartPathResolver.getProviderCapabilitiesPath(provider.name),
          message: `提供商 ${provider.name} 没有任何能力`,
          suggestion: '至少实现一个能力文件'
        });
      }
    }

    return violations;
  }

  /**
   * 验证提供商名称
   */
  private isValidProviderName(name: string): boolean {
    const kebabCasePattern = /^[a-z]+(-[a-z]+)*$/;
    return kebabCasePattern.test(name);
  }

  /**
   * 将错误转换为约定违规
   */
  private errorToViolation(providerName: string, error: Error): ConventionViolation {
    return {
      type: 'invalid_structure',
      path: SmartPathResolver.getProviderPath(providerName),
      message: `提供商 ${providerName} 加载失败: ${error.message}`,
      suggestion: '检查提供商结构和文件完整性'
    };
  }

  /**
   * 清除扫描缓存
   */
  static clearCache(): void {
    ConventionScanner.scanCache.clear();
    ConventionScanner.lastScanTime = null;
    ConventionScanner.logger.debug('扫描缓存已清除');
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats() {
    return {
      cacheSize: ConventionScanner.scanCache.size,
      lastScanTime: ConventionScanner.lastScanTime,
      cacheKeys: Array.from(ConventionScanner.scanCache.keys())
    };
  }
}

