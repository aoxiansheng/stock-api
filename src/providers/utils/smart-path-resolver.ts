import { join, dirname } from "path";
import { existsSync, readFileSync } from "fs";
import { createLogger } from "@common/logging";

/**
 * 智能路径解析器 - 解决不同环境下的路径问题
 */
export class SmartPathResolver {
  private static readonly logger = createLogger("SmartPathResolver");
  private static cachedProjectRoot: string | null = null;

  /**
   * 获取项目根路径 - 使用多种策略确保路径正确
   */
  static getProjectRoot(): string {
    if (this.cachedProjectRoot) {
      return this.cachedProjectRoot;
    }

    const strategies = [
      () => this.getFromEnvironment(),
      () => this.findPackageJsonRoot(),
      () => this.findSrcRoot(),
      () => this.getFallbackPath(),
    ];

    for (const strategy of strategies) {
      try {
        const root = strategy();
        if (root && this.validateProjectStructure(root)) {
          this.cachedProjectRoot = root;
          this.logger.log(`项目根路径确定: ${root}`);
          return root;
        }
      } catch (error) {
        this.logger.debug(`路径策略失败: ${error.message}`);
        // 继续尝试下一个策略
      }
    }

    throw new Error(
      "无法确定项目根路径，请设置 PROJECT_ROOT 环境变量或确保项目结构正确",
    );
  }

  /**
   * 获取提供商目录路径
   */
  static getProvidersPath(): string {
    return join(this.getProjectRoot(), "src", "providers");
  }

  /**
   * 获取特定提供商的路径
   */
  static getProviderPath(providerName: string): string {
    return join(this.getProvidersPath(), providerName);
  }

  /**
   * 获取特定提供商的能力目录路径
   */
  static getProviderCapabilitiesPath(providerName: string): string {
    return join(this.getProviderPath(providerName), "capabilities");
  }

  /**
   * 验证路径是否存在
   */
  static pathExists(path: string): boolean {
    return existsSync(path);
  }

  /**
   * 清除缓存（主要用于测试）
   */
  static clearCache(): void {
    this.cachedProjectRoot = null;
  }

  /**
   * 策略1: 从环境变量获取
   */
  private static getFromEnvironment(): string | null {
    const envPath = process.env.PROJECT_ROOT;
    if (envPath && existsSync(envPath)) {
      this.logger.debug(`使用环境变量路径: ${envPath}`);
      return envPath;
    }
    return null;
  }

  /**
   * 策略2: 查找 package.json 所在目录
   */
  private static findPackageJsonRoot(startDir?: string): string {
    // 优先使用工作目录，然后使用模块路径
    const searchPaths = [
      process.cwd(),
      startDir || __dirname,
      join(__dirname, "..", "..", ".."), // 从 src/providers/utils 向上3级
    ];

    for (const searchStart of searchPaths) {
      let current = searchStart;
      const rootPath = dirname(current);

      while (current !== rootPath) {
        const packagePath = join(current, "package.json");
        if (existsSync(packagePath)) {
          // 验证这是正确的 package.json
          if (this.isCorrectPackageJson(packagePath)) {
            this.logger.debug(`找到 package.json: ${packagePath}`);
            return current;
          }
        }
        current = dirname(current);
      }
    }

    throw new Error("未找到有效的 package.json");
  }

  /**
   * 策略3: 查找 src 目录的父目录
   */
  private static findSrcRoot(startDir?: string): string {
    // 优先使用工作目录，然后使用模块路径
    const searchPaths = [
      process.cwd(),
      startDir || __dirname,
      join(__dirname, "..", "..", ".."), // 从 src/providers/utils 向上3级
    ];

    for (const searchStart of searchPaths) {
      let current = searchStart;
      const rootPath = dirname(current);

      while (current !== rootPath) {
        const srcPath = join(current, "src");
        if (existsSync(srcPath)) {
          // 验证 src 目录结构
          const providersPath = join(srcPath, "providers");
          if (existsSync(providersPath)) {
            this.logger.debug(`找到 src 目录: ${srcPath}`);
            return current;
          }
        }
        current = dirname(current);
      }
    }

    throw new Error("未找到有效的 src 目录");
  }

  /**
   * 策略4: 使用工作目录作为后备
   */
  private static getFallbackPath(): string {
    const cwd = process.cwd();
    const srcPath = join(cwd, "src");

    if (existsSync(srcPath)) {
      this.logger.debug(`使用工作目录: ${cwd}`);
      return cwd;
    }

    throw new Error("工作目录中未找到 src 目录");
  }

  /**
   * 验证项目结构是否正确
   */
  private static validateProjectStructure(rootPath: string): boolean {
    const requiredPaths = [
      join(rootPath, "src"),
      join(rootPath, "src", "providers"),
      join(rootPath, "package.json"),
    ];

    for (const path of requiredPaths) {
      if (!existsSync(path)) {
        this.logger.debug(`缺少必需路径: ${path}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 验证是否是正确的 package.json
   */
  private static isCorrectPackageJson(packagePath: string): boolean {
    try {
      const content = readFileSync(packagePath, "utf-8");
      const packageJson = JSON.parse(content);

      // 检查是否包含NestJS相关依赖
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const nestjsIndicators = [
        "@nestjs/core",
        "@nestjs/common",
        "@nestjs/platform-express",
      ];

      return nestjsIndicators.some(
        (indicator) => dependencies && dependencies[indicator],
      );
    } catch (error) {
      this.logger.debug(`解析 package.json 失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取相对于项目根目录的相对路径
   */
  static getRelativePath(absolutePath: string): string {
    const root = this.getProjectRoot();
    return absolutePath.replace(root, "").replace(/^\//, "");
  }

  /**
   * 构建安全的文件路径（防止路径遍历攻击）
   */
  static buildSafePath(basePath: string, ...segments: string[]): string {
    const fullPath = join(basePath, ...segments);

    // 确保路径在基础路径内
    if (!fullPath.startsWith(basePath)) {
      throw new Error(`不安全的路径: ${fullPath}`);
    }

    return fullPath;
  }

  /**
   * 获取调试信息
   */
  static getDebugInfo(): Record<string, any> {
    try {
      return {
        currentWorkingDirectory: process.cwd(),
        dirname: __dirname,
        projectRoot: this.cachedProjectRoot || "not determined",
        providersPath: this.cachedProjectRoot
          ? this.getProvidersPath()
          : "not determined",
        environmentVariables: {
          PROJECT_ROOT: process.env.PROJECT_ROOT || "not set",
          NODE_ENV: process.env.NODE_ENV || "not set",
        },
        pathValidation: this.cachedProjectRoot
          ? {
              projectRootExists: existsSync(this.cachedProjectRoot),
              srcExists: existsSync(join(this.cachedProjectRoot, "src")),
              providersExists: existsSync(this.getProvidersPath()),
            }
          : "project root not determined",
      };
    } catch (error) {
      return {
        error: error.message,
        currentWorkingDirectory: process.cwd(),
        dirname: __dirname,
      };
    }
  }
}
