import { Module, OnModuleInit } from "@nestjs/common";

import { AuthModule } from "../../auth/module/auth.module";

import { CapabilityRegistryService } from "../services/capability-registry.service";
import { EnhancedCapabilityRegistryService } from "../services/enhanced-capability-registry.service";
import { LongportModule } from "../longport/module/longport.module";
import { LongportProvider } from "../longport/longport.provider";
import { LongportSgModule } from "../longport-sg/module/longport-sg.module";
import { LongportSgProvider } from "../longport-sg/longport-sg.provider";
import { ProvidersController } from "../controller/providers-controller";

// Provider实例导入

@Module({
  imports: [AuthModule, LongportModule, LongportSgModule],
  controllers: [ProvidersController],
  providers: [
    EnhancedCapabilityRegistryService,
    // 提供别名以保持向后兼容性 - 让旧代码继续使用 CapabilityRegistryService
    {
      provide: CapabilityRegistryService,
      useExisting: EnhancedCapabilityRegistryService,
    },
    // 为增强服务提供别名
    {
      provide: "ENHANCED_CAPABILITY_REGISTRY",
      useExisting: EnhancedCapabilityRegistryService,
    },
    // 为StreamDataFetcherService提供正确的token
    {
      provide: "ENHANCED_CAPABILITY_REGISTRY_SERVICE",
      useExisting: EnhancedCapabilityRegistryService,
    },
  ],
  exports: [
    CapabilityRegistryService,
    EnhancedCapabilityRegistryService,
    "ENHANCED_CAPABILITY_REGISTRY_SERVICE", // 导出新添加的token
  ],
})
export class ProvidersModule implements OnModuleInit {
  private initialized = false;

  constructor(
    // 只注入增强服务，由于别名设置，capabilityRegistry 实际上也是 EnhancedCapabilityRegistryService
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly longportProvider: LongportProvider,
    private readonly longportSgProvider: LongportSgProvider,
  ) {}

  async onModuleInit() {
    if (this.initialized) {
      return;
    }

    // 等待注册表初始化完成后再注册提供商实例
    await this.waitForRegistriesInitialization();

    // 🎯 只使用统一的注册服务 - 消除重复注册
    await this.registerProviders();

    this.initialized = true;
  }

  private async waitForRegistriesInitialization(): Promise<void> {
    // 等待增强注册表完成初始化
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async registerProviders(): Promise<void> {
    // 只使用一个注册表，避免重复注册
    this.capabilityRegistry.registerProvider(this.longportProvider);
    this.capabilityRegistry.registerProvider(this.longportSgProvider);

    // TODO: 注册其他Provider实例
  }
}
