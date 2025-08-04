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
    CapabilityRegistryService,
    EnhancedCapabilityRegistryService,
    // 为增强服务提供别名，保持向后兼容
    {
      provide: 'ENHANCED_CAPABILITY_REGISTRY',
      useClass: EnhancedCapabilityRegistryService
    }
  ],
  exports: [CapabilityRegistryService, EnhancedCapabilityRegistryService],
})
export class ProvidersModule implements OnModuleInit {
  private initialized = false;

  constructor(
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly enhancedRegistry: EnhancedCapabilityRegistryService,
    private readonly longportProvider: LongportProvider,
    private readonly longportSgProvider: LongportSgProvider,
  ) {}

  async onModuleInit() {
    if (this.initialized) {
      return;
    }
    
    // 等待注册表初始化完成后再注册提供商实例
    await this.waitForRegistriesInitialization();
    
    // 🎯 自动注册所有Provider实例
    await this.registerProviders();
    
    this.initialized = true;
  }

  private async waitForRegistriesInitialization(): Promise<void> {
    // 这里暂停一下，让注册表先完成初始化
    // 可以考虑添加更智能的等待机制
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async registerProviders(): Promise<void> {
    // 注册LongPort Provider
    this.capabilityRegistry.registerProvider(this.longportProvider);
    this.enhancedRegistry.registerProvider(this.longportProvider);

    // 注册LongPort SG Provider
    this.capabilityRegistry.registerProvider(this.longportSgProvider);
    this.enhancedRegistry.registerProvider(this.longportSgProvider);

    // TODO: 注册其他Provider实例
  }
}
