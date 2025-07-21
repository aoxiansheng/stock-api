import { Module, OnModuleInit } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";

import { CapabilityRegistryService } from "./capability-registry.service";
import { LongportModule } from "./longport/longport.module";
import { LongportProvider } from "./longport/longport.provider";
import { LongportSgModule } from "./longport-sg/longport-sg.module";
import { LongportSgProvider } from "./longport-sg/longport-sg.provider";
import { MainController } from "./providers-controller";

// Provider实例导入

@Module({
  imports: [
    AuthModule,
    LongportModule,
    LongportSgModule,
  ],
  controllers: [MainController],
  providers: [CapabilityRegistryService],
  exports: [CapabilityRegistryService],
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly longportProvider: LongportProvider,
    private readonly longportSgProvider: LongportSgProvider,
  ) {}

  async onModuleInit() {
    // 🎯 自动注册所有Provider实例
    await this.registerProviders();
  }

  private async registerProviders(): Promise<void> {
    // 注册LongPort Provider
    this.capabilityRegistry.registerProvider(this.longportProvider);
    
    // 注册LongPort SG Provider
    this.capabilityRegistry.registerProvider(this.longportSgProvider);
    
    // TODO: 注册其他Provider实例
  }
}
