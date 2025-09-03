import { readdir, stat } from "fs/promises";
import { join } from "path";

import { Injectable, OnModuleInit } from "@nestjs/common";

import { createLogger } from "@app/config/logger.config";

import { ICapability } from "../interfaces/capability.interface";
import { ICapabilityRegistration } from "../interfaces/provider.interface";
import {
  IStreamCapability,
  IStreamCapabilityRegistration,
} from "../interfaces/stream-capability.interface";
import {
  getProviderScanConfig,
  shouldExcludeDirectory,
} from "../config/provider-scan.config";

const toCamelCase = (str: string) =>
  str.replace(/-(\w)/g, (_, c) => c.toUpperCase());

@Injectable()
export class CapabilityRegistryService implements OnModuleInit {
  private readonly logger = createLogger(CapabilityRegistryService.name);
  private readonly capabilities = new Map<
    string,
    Map<string, ICapabilityRegistration>
  >();
  private readonly streamCapabilities = new Map<
    string,
    Map<string, IStreamCapabilityRegistration>
  >();
  private readonly providers = new Map<string, any>();
  private initialized = false;
  private static discoveryPromise: Promise<void> | null = null;

  constructor() {}

  async onModuleInit() {
    // 防止重复初始化 - 使用单例模式
    if (CapabilityRegistryService.discoveryPromise) {
      this.logger.debug("等待现有能力发现完成...");
      await CapabilityRegistryService.discoveryPromise;
      return;
    }

    if (this.initialized) {
      this.logger.debug("能力注册表已初始化，跳过重复初始化");
      return;
    }

    CapabilityRegistryService.discoveryPromise = this.discoverCapabilities();
    try {
      await CapabilityRegistryService.discoveryPromise;
    } finally {
      CapabilityRegistryService.discoveryPromise = null;
    }
  }

  async discoverCapabilities(): Promise<void> {
    this.logger.log("开始自动发现数据源能力...");

    // 修复路径：从 services/ 目录上升到 providers/ 目录
    const providersPath = join(__dirname, "..");
    try {
      const providerDirs = await readdir(providersPath, {
        withFileTypes: true,
      });

      // 使用统一的扫描配置
      const scanConfig = getProviderScanConfig();

      for (const dirent of providerDirs) {
        if (
          dirent.isDirectory() &&
          !shouldExcludeDirectory(dirent.name, scanConfig)
        ) {
          await this.loadProviderCapabilities(dirent.name);
        }
      }

      this.initialized = true;
      this.logger.log({
        message: "能力发现完成",
        totalCapabilities: this.getTotalCapabilitiesCount(),
      });
    } catch (error) {
      this.logger.error({ error: error.stack }, "自动发现能力时发生错误");
      throw error;
    }
  }

  private async loadProviderCapabilities(providerName: string): Promise<void> {
    try {
      // 修复路径：从 services/ 目录上升到 providers/ 目录，然后进入提供商目录
      const capabilitiesPath = join(
        __dirname,
        "..",
        providerName,
        "capabilities",
      );

      if (!(await this.directoryExists(capabilitiesPath))) {
        this.logger.warn({
          message: `提供商 ${providerName} 缺少 'capabilities' 目录`,
          provider: providerName,
        });
        return;
      }

      const capabilityFiles = (await readdir(capabilitiesPath)).filter((file) =>
        file.endsWith(".ts"),
      );

      for (const file of capabilityFiles) {
        const capabilityName = file.replace(/\.ts$/, "");
        await this.loadCapability(providerName, capabilityName);
      }

      this.logger.log({
        message: `已加载提供商 ${providerName} 的能力`,
        provider: providerName,
        count: capabilityFiles.length,
      });
    } catch (error) {
      this.logger.error(
        { error: error.stack, provider: providerName },
        `无法加载提供商 ${providerName} 的能力`,
      );
    }
  }

  private async loadCapability(
    providerName: string,
    capabilityName: string,
  ): Promise<void> {
    const logContext = { provider: providerName, capability: capabilityName };
    try {
      const capabilityModule = await import(
        `../${providerName}/capabilities/${capabilityName}`
      );
      const camelCaseName = toCamelCase(capabilityName);
      const capability =
        capabilityModule.default || capabilityModule[camelCaseName];

      if (!capability) {
        this.logger.warn(
          logContext,
          `能力 ${providerName}/${capabilityName} 未找到`,
        );
        return;
      }

      // 检查是否为 WebSocket 流能力
      if (capabilityName.startsWith("stream-")) {
        await this.loadStreamCapability(
          providerName,
          capabilityName,
          capability,
        );
      } else {
        // 传统 REST 能力
        if (typeof capability.execute === "function") {
          this.registerCapability(providerName, capability, 1, true);
        } else {
          this.logger.warn(
            logContext,
            `REST 能力 ${providerName}/${capabilityName} 格式不正确`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        { ...logContext, error: error.stack },
        `无法加载能力 ${providerName}/${capabilityName}`,
      );
    }
  }

  private async loadStreamCapability(
    providerName: string,
    capabilityName: string,
    capability: IStreamCapability,
  ): Promise<void> {
    const logContext = {
      provider: providerName,
      capability: capabilityName,
      type: "stream",
    };

    try {
      // 验证流能力接口
      if (
        typeof capability.initialize === "function" &&
        typeof capability.subscribe === "function" &&
        typeof capability.unsubscribe === "function" &&
        typeof capability.onMessage === "function" &&
        typeof capability.cleanup === "function" &&
        typeof capability.isConnected === "function"
      ) {
        this.registerStreamCapability(providerName, capability, 1, true);
        this.logger.log(
          logContext,
          `流能力 ${providerName}/${capabilityName} 注册成功`,
        );
      } else {
        this.logger.warn(
          logContext,
          `流能力 ${providerName}/${capabilityName} 接口不完整`,
        );
      }
    } catch (error) {
      this.logger.error(
        { ...logContext, error: error.stack },
        `注册流能力 ${providerName}/${capabilityName} 失败`,
      );
    }
  }

  registerCapability(
    providerName: string,
    capability: ICapability,
    priority: number,
    isEnabled: boolean,
  ): void {
    if (!this.capabilities.has(providerName)) {
      this.capabilities.set(providerName, new Map());
    }

    const registration: ICapabilityRegistration = {
      providerName,
      capability,
      priority,
      isEnabled,
    };

    this.capabilities.get(providerName)!.set(capability.name, registration);
  }

  getCapability(
    providerName: string,
    capabilityName: string,
  ): ICapability | null {
    const registration = this.capabilities
      .get(providerName)
      ?.get(capabilityName);
    return registration?.isEnabled ? registration.capability : null;
  }

  getBestProvider(capabilityName: string, market?: string): string | null {
    const candidates: { provider: string; priority: number }[] = [];

    for (const [providerName, capabilities] of this.capabilities) {
      const registration = capabilities.get(capabilityName);
      if (registration?.isEnabled) {
        const capability = registration.capability;
        if (!market || capability.supportedMarkets.includes(market)) {
          candidates.push({
            provider: providerName,
            priority: registration.priority,
          });
        }
      }
    }

    if (candidates.length === 0) return null;

    // 按优先级排序，优先级数字越小越优先
    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0].provider;
  }

  getAllCapabilities(): Map<string, Map<string, ICapabilityRegistration>> {
    return this.capabilities;
  }

  /**
   * 注册Provider实例
   *
   * @param provider Provider实例
   */
  registerProvider(provider: any): void {
    if (!provider || !provider.name) {
      this.logger.warn("尝试注册无效的Provider实例");
      return;
    }

    this.providers.set(provider.name, provider);
    this.logger.log(`Provider实例注册成功: ${provider.name}`);
  }

  /**
   * 获取Provider实例
   *
   * @param providerName Provider名称
   * @returns Provider实例或null
   */
  getProvider(providerName: string): any {
    const provider = this.providers.get(providerName);
    if (!provider) {
      this.logger.debug(`未找到Provider实例: ${providerName}`);
      return null;
    }
    return provider;
  }

  /**
   * 获取所有已注册的Provider实例
   *
   * @returns 所有Provider实例的Map
   */
  getAllProviders(): Map<string, any> {
    return new Map(this.providers);
  }

  /**
   * 检查Provider是否已注册
   *
   * @param providerName Provider名称
   * @returns 是否已注册
   */
  isProviderRegistered(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /**
   * 注册流能力
   */
  registerStreamCapability(
    providerName: string,
    capability: IStreamCapability,
    priority: number,
    isEnabled: boolean,
  ): void {
    if (!this.streamCapabilities.has(providerName)) {
      this.streamCapabilities.set(providerName, new Map());
    }

    const registration: IStreamCapabilityRegistration = {
      providerName,
      capability,
      priority,
      isEnabled,
      connectionStatus: "disconnected",
      errorCount: 0,
    };

    this.streamCapabilities
      .get(providerName)!
      .set(capability.name, registration);

    this.logger.log({
      message: "流能力注册成功",
      provider: providerName,
      capability: capability.name,
      priority,
    });
  }

  /**
   * 获取流能力
   */
  getStreamCapability(
    providerName: string,
    capabilityName: string,
  ): IStreamCapability | null {
    const registration = this.streamCapabilities
      .get(providerName)
      ?.get(capabilityName);
    return registration?.isEnabled ? registration.capability : null;
  }

  /**
   * 获取最佳流提供商
   */
  getBestStreamProvider(
    capabilityName: string,
    market?: string,
  ): string | null {
    const candidates: { provider: string; priority: number }[] = [];

    for (const [providerName, capabilities] of this.streamCapabilities) {
      const registration = capabilities.get(capabilityName);
      if (
        registration?.isEnabled &&
        registration.connectionStatus !== "error"
      ) {
        const capability = registration.capability;
        if (!market || capability.supportedMarkets.includes(market)) {
          candidates.push({
            provider: providerName,
            priority: registration.priority,
          });
        }
      }
    }

    if (candidates.length === 0) return null;

    // 按优先级排序，优先级数字越小越优先
    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0].provider;
  }

  /**
   * 获取所有流能力
   */
  getAllStreamCapabilities(): Map<
    string,
    Map<string, IStreamCapabilityRegistration>
  > {
    return this.streamCapabilities;
  }

  /**
   * 更新流能力连接状态
   */
  updateStreamCapabilityStatus(
    providerName: string,
    capabilityName: string,
    status: "disconnected" | "connecting" | "connected" | "error",
    error?: string,
  ): void {
    const registration = this.streamCapabilities
      .get(providerName)
      ?.get(capabilityName);

    if (registration) {
      registration.connectionStatus = status;

      if (status === "connected") {
        registration.lastConnectedAt = new Date();
        registration.errorCount = 0;
      } else if (status === "error") {
        registration.errorCount++;
        if (error) {
          registration.lastError = error;
        }
      }

      this.logger.log({
        message: "流能力状态更新",
        provider: providerName,
        capability: capabilityName,
        status,
        errorCount: registration.errorCount,
      });
    }
  }

  private async directoryExists(path: string): Promise<boolean> {
    try {
      return (await stat(path)).isDirectory();
    } catch {
      return false;
    }
  }

  private getTotalCapabilitiesCount(): number {
    let count = 0;
    for (const capabilities of this.capabilities.values()) {
      count += capabilities.size;
    }
    for (const streamCapabilities of this.streamCapabilities.values()) {
      count += streamCapabilities.size;
    }
    return count;
  }
}
