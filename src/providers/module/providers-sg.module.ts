import { Module, OnModuleInit } from "@nestjs/common";

import { AuthModule } from "../../auth/module/auth.module";

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
  ],
  exports: [
    EnhancedCapabilityRegistryService,
  ],
})
export class ProvidersModule implements OnModuleInit {
  private initialized = false;

  constructor(
    // 直接注入增强服务
    private readonly capabilityRegistry: EnhancedCapabilityRegistryService,
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
