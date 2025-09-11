import { Command } from "commander";
import { createLogger } from "@appcore/config/logger.config";
import { SmartErrorHandler } from "../utils/smart-error-handler";
import { SmartPathResolver } from "../utils/smart-path-resolver";
import { ConventionScanner } from "../utils/convention-scanner";
import { API_OPERATIONS } from '@common/constants/domain';

/**
 * 提供商生成器CLI工具
 */
export class ProviderGeneratorCLI {
  private static readonly logger = createLogger("ProviderGeneratorCLI");

  /**
   * 注册CLI命令
   */
  static registerCommands(program: Command): void {
    // 生成提供商命令
    program
      .command("provider:generate <name>")
      .description("生成新的数据源提供商")
      .option(
        "-c, --capabilities <capabilities>",
        "能力列表（逗号分隔）",
        API_OPERATIONS.STOCK_DATA.GET_QUOTE,
      )
      .option("-d, --description <description>", "提供商描述")
      .option("--with-tests", "生成测试文件", false)
      .option("--with-docs", "生成文档文件", true)
      .option("--auto-fix", "自动修复问题", true)
      .action(this.generateProvider.bind(this));

    // 验证提供商命令
    program
      .command("provider:validate <name>")
      .description("验证提供商结构和约定")
      .option("--auto-fix", "自动修复可修复的问题", false)
      .option("--verbose", "显示详细信息", false)
      .action(this.validateProvider.bind(this));

    // 列出所有提供商命令
    program
      .command("providers:list")
      .description("列出所有已注册的提供商")
      .option("--detailed", "显示详细信息", false)
      .action(this.listProviders.bind(this));

    // 扫描提供商命令
    program
      .command("providers:scan")
      .description("扫描并分析所有提供商")
      .option("--validate", "验证约定", true)
      .option("--auto-fix", "自动修复问题", false)
      .action(this.scanProviders.bind(this));

    // 修复提供商命令
    program
      .command("provider:fix <name>")
      .description("自动修复提供商问题")
      .action(this.fixProvider.bind(this));

    // 生成能力命令
    program
      .command("capability:generate <provider> <capability>")
      .description("为提供商生成新能力")
      .option("-d, --description <description>", "能力描述")
      .option("-m, --markets <markets>", "支持的市场（逗号分隔）", "US,HK")
      .option("-p, --priority <priority>", "优先级", "1")
      .action(this.generateCapability.bind(this));
  }

  /**
   * 生成提供商
   */
  private static async generateProvider(
    name: string,
    options: {
      capabilities: string;
      description?: string;
      withTests: boolean;
      withDocs: boolean;
      autoFix: boolean;
    },
  ): Promise<void> {
    try {
      console.log(`🚀 开始生成提供商: ${name}`);

      // 验证提供商名称
      if (!this.isValidProviderName(name)) {
        console.error(`❌ 提供商名称不符合约定: ${name}`);
        console.log("💡 提供商名称应使用 kebab-case 格式，如: my-provider");
        return;
      }

      // 检查提供商是否已存在
      const providerPath = SmartPathResolver.getProviderPath(name);
      if (SmartPathResolver.pathExists(providerPath)) {
        console.warn(`⚠️  提供商目录已存在: ${providerPath}`);
        console.log("如果要重新生成，请先删除现有目录");
        return;
      }

      // 解析能力列表
      const capabilities = options.capabilities.split(",").map((c) => c.trim());

      // 生成提供商模板
      const generatedFiles = await SmartErrorHandler.generateProviderTemplate(
        name,
        {
          capabilities,
          withTests: options.withTests,
          withDocs: options.withDocs,
          description: options.description || `${name} 数据源`,
        },
      );

      console.log(`✅ 提供商 ${name} 生成成功！`);
      console.log(`📁 生成的文件 (${generatedFiles.length} 个):`);
      generatedFiles.forEach((file) => {
        console.log(`   - ${SmartPathResolver.getRelativePath(file)}`);
      });

      console.log("\n📖 接下来的步骤:");
      console.log(
        `1. 查看生成的文档: ${SmartPathResolver.getRelativePath(providerPath)}/README.md`,
      );
      console.log(
        `2. 实现能力逻辑: ${SmartPathResolver.getRelativePath(providerPath)}/capabilities/`,
      );
      console.log(`3. 配置提供商设置`);
      console.log(`4. 运行验证: bun run provider:validate ${name}`);
      console.log(`5. 添加到 ProvidersModule 中注册`);
    } catch (error) {
      console.error(`❌ 生成提供商失败: ${error.message}`);
      this.logger.error(`生成提供商失败: ${name}`, error);
    }
  }

  /**
   * 验证提供商
   */
  private static async validateProvider(
    name: string,
    options: { autoFix: boolean; verbose: boolean },
  ): Promise<void> {
    try {
      console.log(`🔍 开始验证提供商: ${name}`);

      const scanner = ConventionScanner.getInstance();
      const { capabilities, violations } =
        await scanner.scanProviderCapabilities(name);

      console.log(`📊 验证结果:`);
      console.log(`   - 发现能力: ${capabilities.length} 个`);
      console.log(`   - 发现问题: ${violations.length} 个`);

      if (options.verbose) {
        console.log(`\n🔍 详细信息:`);
        console.log(
          `   - 提供商路径: ${SmartPathResolver.getProviderPath(name)}`,
        );
        console.log(
          `   - 能力目录: ${SmartPathResolver.getProviderCapabilitiesPath(name)}`,
        );
      }

      if (capabilities.length > 0) {
        console.log(`\n✅ 能力列表:`);
        capabilities.forEach((cap) => console.log(`   - ${cap}`));
      }

      if (violations.length > 0) {
        console.log(`\n⚠️  发现的问题:`);
        violations.forEach((violation, index) => {
          console.log(`   ${index + 1}. ${violation.message}`);
          if (violation.suggestion) {
            console.log(`      💡 建议: ${violation.suggestion}`);
          }
        });

        if (options.autoFix) {
          console.log(`\n🔧 开始自动修复...`);
          const fixResult =
            await SmartErrorHandler.autoFixViolations(violations);

          if (fixResult.fixedIssues.length > 0) {
            console.log(`✅ 修复完成的问题:`);
            fixResult.fixedIssues.forEach((issue) =>
              console.log(`   - ${issue}`),
            );
          }

          if (fixResult.remainingIssues.length > 0) {
            console.log(`❌ 仍需手动修复的问题:`);
            fixResult.remainingIssues.forEach((issue) =>
              console.log(`   - ${issue}`),
            );
          }
        }
      } else {
        console.log(`✅ 验证通过，没有发现问题`);
      }
    } catch (error) {
      console.error(`❌ 验证提供商失败: ${error.message}`);
      this.logger.error(`验证提供商失败: ${name}`, error);
    }
  }

  /**
   * 列出所有提供商
   */
  private static async listProviders(options: {
    detailed: boolean;
  }): Promise<void> {
    try {
      console.log(`📋 扫描提供商...`);

      const scanner = ConventionScanner.getInstance();
      const { providers, stats } = await scanner.scanProviders();

      console.log(`\n📊 统计信息:`);
      console.log(`   - 总目录数: ${stats.totalDirectories}`);
      console.log(`   - 有效提供商: ${stats.validProviders}`);
      console.log(`   - 无效提供商: ${stats.invalidProviders}`);
      console.log(`   - 跳过目录: ${stats.skippedDirectories}`);

      if (providers.length === 0) {
        console.log(`\n⚠️  未发现任何提供商`);
        return;
      }

      console.log(`\n📦 提供商列表:`);
      providers.forEach((provider, index) => {
        console.log(`\n${index + 1}. ${provider.name}`);
        console.log(
          `   📁 路径: ${SmartPathResolver.getRelativePath(SmartPathResolver.getProviderPath(provider.name))}`,
        );
        console.log(`   🔧 能力数: ${provider.capabilities.length}`);

        if (options.detailed) {
          if (provider.capabilities.length > 0) {
            console.log(`   ⚡ 能力列表:`);
            provider.capabilities.forEach((cap) =>
              console.log(`      - ${cap}`),
            );
          }
          console.log(
            `   🤖 自动发现: ${provider.autoDiscovered ? "是" : "否"}`,
          );
        }
      });
    } catch (error) {
      console.error(`❌ 列出提供商失败: ${error.message}`);
      this.logger.error("列出提供商失败", error);
    }
  }

  /**
   * 扫描提供商
   */
  private static async scanProviders(options: {
    validate: boolean;
    autoFix: boolean;
  }): Promise<void> {
    try {
      console.log(`🔍 开始扫描提供商...`);

      const scanner = ConventionScanner.getInstance();
      const { providers, violations, stats } = await scanner.scanProviders({
        validateConventions: options.validate,
      });

      // 显示统计信息
      console.log(`\n📊 扫描结果:`);
      console.log(`   - 扫描目录: ${stats.totalDirectories} 个`);
      console.log(`   - 有效提供商: ${stats.validProviders} 个`);
      console.log(`   - 无效提供商: ${stats.invalidProviders} 个`);
      console.log(`   - 跳过目录: ${stats.skippedDirectories} 个`);
      console.log(`   - 约定违规: ${violations.length} 个`);

      // 显示提供商信息
      if (providers.length > 0) {
        console.log(`\n✅ 有效提供商:`);
        providers.forEach((provider) => {
          console.log(
            `   - ${provider.name} (${provider.capabilities.length} 个能力)`,
          );
        });
      }

      // 显示违规信息
      if (violations.length > 0) {
        console.log(`\n⚠️  约定违规:`);
        violations.forEach((violation, index) => {
          console.log(
            `   ${index + 1}. [${violation.type}] ${violation.message}`,
          );
          if (violation.suggestion) {
            console.log(`      💡 ${violation.suggestion}`);
          }
        });

        // 自动修复
        if (options.autoFix) {
          console.log(`\n🔧 开始自动修复...`);
          const fixResult =
            await SmartErrorHandler.autoFixViolations(violations);

          console.log(`\n修复结果:`);
          console.log(`   - 修复成功: ${fixResult.fixedIssues.length} 个`);
          console.log(
            `   - 需手动修复: ${fixResult.remainingIssues.length} 个`,
          );

          if (fixResult.fixedIssues.length > 0) {
            console.log(`\n✅ 修复成功的问题:`);
            fixResult.fixedIssues.forEach((issue) =>
              console.log(`   - ${issue}`),
            );
          }
        }
      }
    } catch (error) {
      console.error(`❌ 扫描提供商失败: ${error.message}`);
      this.logger.error("扫描提供商失败", error);
    }
  }

  /**
   * 修复提供商
   */
  private static async fixProvider(name: string): Promise<void> {
    try {
      console.log(`🔧 开始修复提供商: ${name}`);

      // 首先验证提供商
      const scanner = ConventionScanner.getInstance();
      const { violations } = await scanner.scanProviderCapabilities(name);

      if (violations.length === 0) {
        console.log(`✅ 提供商 ${name} 没有发现问题`);
        return;
      }

      console.log(`发现 ${violations.length} 个问题，开始修复...`);

      // 自动修复
      const fixResult = await SmartErrorHandler.autoFixViolations(violations);

      console.log(`\n修复完成:`);
      console.log(`   - 修复成功: ${fixResult.fixedIssues.length} 个`);
      console.log(`   - 需手动修复: ${fixResult.remainingIssues.length} 个`);

      if (fixResult.fixedIssues.length > 0) {
        console.log(`\n✅ 修复成功:`);
        fixResult.fixedIssues.forEach((issue) => console.log(`   - ${issue}`));
      }

      if (fixResult.remainingIssues.length > 0) {
        console.log(`\n❌ 需手动修复:`);
        fixResult.remainingIssues.forEach((issue) =>
          console.log(`   - ${issue}`),
        );
      }
    } catch (error) {
      console.error(`❌ 修复提供商失败: ${error.message}`);
      this.logger.error(`修复提供商失败: ${name}`, error);
    }
  }

  /**
   * 生成能力
   */
  private static async generateCapability(
    provider: string,
    capability: string,
    options: {
      description?: string;
      markets: string;
      priority: string;
    },
  ): Promise<void> {
    try {
      console.log(`🚀 为提供商 ${provider} 生成能力: ${capability}`);

      // 验证提供商是否存在
      const providerPath = SmartPathResolver.getProviderPath(provider);
      if (!SmartPathResolver.pathExists(providerPath)) {
        console.error(`❌ 提供商 ${provider} 不存在`);
        console.log(`💡 请先运行: bun run provider:generate ${provider}`);
        return;
      }

      // 验证能力名称
      if (!this.isValidCapabilityName(capability)) {
        console.error(`❌ 能力名称不符合约定: ${capability}`);
        console.log("💡 能力名称应使用 kebab-case 格式，如: get-stock-quote");
        return;
      }

      // 检查能力是否已存在
      const capabilityPath = join(
        SmartPathResolver.getProviderCapabilitiesPath(provider),
        `${capability}.ts`,
      );

      if (SmartPathResolver.pathExists(capabilityPath)) {
        console.warn(`⚠️  能力文件已存在: ${capability}.ts`);
        return;
      }

      // 生成能力文件
      const capabilityFile = await this.generateCapabilityFile(
        provider,
        capability,
        options,
      );

      await writeFile(capabilityPath, capabilityFile);

      console.log(`✅ 能力 ${capability} 生成成功！`);
      console.log(
        `📁 文件位置: ${SmartPathResolver.getRelativePath(capabilityPath)}`,
      );
      console.log(`\n📖 接下来的步骤:`);
      console.log(`1. 实现能力逻辑`);
      console.log(`2. 配置支持的市场和符号格式`);
      console.log(`3. 添加错误处理`);
      console.log(`4. 编写测试`);
    } catch (error) {
      console.error(`❌ 生成能力失败: ${error.message}`);
      this.logger.error(`生成能力失败: ${provider}/${capability}`, error);
    }
  }

  /**
   * 验证提供商名称
   */
  private static isValidProviderName(name: string): boolean {
    const kebabCasePattern = /^[a-z]+(-[a-z]+)*$/;
    return kebabCasePattern.test(name);
  }

  /**
   * 验证能力名称
   */
  private static isValidCapabilityName(name: string): boolean {
    const kebabCasePattern = /^[a-z]+(-[a-z]+)*$/;
    return kebabCasePattern.test(name);
  }

  /**
   * 生成能力文件内容
   */
  private static async generateCapabilityFile(
    provider: string,
    capability: string,
    options: any,
  ): Promise<string> {
    const className =
      this.toPascalCase(capability.replace(/-/g, " ")) + "Capability";
    const markets = options.markets
      .split(",")
      .map((m: string) => `'${m.trim()}'`)
      .join(", ");

    return `import { Capability } from '../../../decorators';
import { ICapability } from '../../../interfaces/capability.interface';
import { DataRequest, DataResponse } from '../../../interfaces/data.interface';

@Capability({
  name: '${capability}',
  provider: '${provider}',
  description: '${options.description || capability + " 能力实现"}',
  markets: [${markets}],
  priority: ${options.priority}
})
export class ${className} implements ICapability {
  readonly name = '${capability}';
  readonly supportedMarkets = [${markets}];
  readonly supportedSymbolFormats = ['SYMBOL.MARKET'];

  async execute(request: DataRequest): Promise<DataResponse> {
    // TODO: 实现具体的数据获取逻辑
    throw new Error('Method not implemented');
  }
}

export default ${className};
`;
  }

  private static toPascalCase(str: string): string {
    return str
      .split(/[-\s_]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }
}

// 导入所需的依赖
import { writeFile } from "fs/promises";
import { join } from "path";
