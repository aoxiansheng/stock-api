import { Controller, Get, Param } from "@nestjs/common";
import { OPERATION_LIMITS } from '@common/constants/domain';
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS
} from '@common/constants/domain';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { createLogger } from "@app/config/logger.config";
import {
  ApiSuccessResponse,
  ApiStandardResponses,
} from "@common/core/decorators/swagger-responses.decorator";

import { ApiKeyAuth } from "../../auth/decorators/auth.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { Permission } from "../../auth/enums/user-role.enum";
import { RATE_LIMIT_CONFIG } from "@common/constants/domain/rate-limit-domain.constants";

import { CapabilityRegistryService } from "../services/capability-registry.service";

@ApiTags("数据源提供商")
@Controller("providers")
export class ProvidersController {
  private readonly logger = createLogger(ProvidersController.name);

  constructor(private readonly capabilityRegistry: CapabilityRegistryService) {}

  /**
   * 格式化能力注册信息为统一的返回格式
   * 消除重复的数据转换代码
   */
  private formatCapabilityRegistration(registration: any) {
    return {
      name: registration.capability.name,
      description: registration.capability.description,
      supportedMarkets: registration.capability.supportedMarkets,
      priority: registration.priority,
      isEnabled: registration.isEnabled,
    };
  }

  /**
   * 格式化流能力注册信息为统一的返回格式
   */
  private formatStreamCapabilityRegistration(registration: any) {
    return {
      name: registration.capability.name,
      description: registration.capability.description,
      supportedMarkets: registration.capability.supportedMarkets,
      supportedSymbolFormats: registration.capability.supportedSymbolFormats,
      priority: registration.priority,
      isEnabled: registration.isEnabled,
    };
  }

  /**
   * 获取格式化的提供商信息
   * 统一处理不存在的提供商场景
   */
  private getFormattedProviderInfo(providerName: string, capability: string) {
    const providerCapabilities = this.capabilityRegistry
      .getAllCapabilities()
      .get(providerName);
    const registration = providerCapabilities?.get(capability);

    return registration
      ? this.formatCapabilityRegistration(registration)
      : null;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.PROVIDERS_READ)
  @Throttle({ default: { ttl: 60000, limit: OPERATION_LIMITS.BATCH_SIZES.DEFAULT_PAGE_SIZE } })
  @Get("capabilities")
  @ApiOperation({
    summary: "获取所有可用能力",
    description:
      "获取系统中所有注册的数据源提供商及其能力信息，包括支持的市场、优先级等详细信息（需要API Key认证）",
  })
  @ApiSecurity("ApiKey")
  @ApiSuccessResponse({
    description: "获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取所有可用能力成功",
        data: {
          longport: [
            {
              name: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
              description: "获取股票实时报价",
              supportedMarkets: ["HK", "US"],
              priority: 1,
              isEnabled: true,
            },
          ],
          twelvedata: [
            {
              name: "get-stock-basic-info",
              description: "获取股票基本信息",
              supportedMarkets: ["US"],
              priority: 2,
              isEnabled: true,
            },
          ],
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
      },
    },
  })
  @ApiStandardResponses()
  getAllCapabilities() {
    this.logger.debug("getAllCapabilities 方法被调用");
    const capabilities = this.capabilityRegistry.getAllCapabilities();
    const result = {};

    for (const [providerName, providerCapabilities] of capabilities) {
      result[providerName] = Array.from(providerCapabilities.values()).map(
        (reg) => this.formatCapabilityRegistration(reg),
      );
    }

    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.PROVIDERS_READ)
  @Throttle({ default: { ttl: 60000, limit: OPERATION_LIMITS.BATCH_SIZES.DEFAULT_PAGE_SIZE } })
  @Get("stream-capabilities")
  @ApiOperation({
    summary: "获取所有可用流能力",
    description:
      "获取系统中所有注册的WebSocket流数据源提供商及其能力信息，包括支持的市场、符号格式、优先级等详细信息（需要API Key认证）",
  })
  @ApiSecurity("ApiKey")
  @ApiSuccessResponse({
    description: "获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取所有可用流能力成功",
        data: {
          longport: [
            {
              name: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
              description: "LongPort实时股票报价流",
              supportedMarkets: ["HK", "US", "SZ", "SH"],
              supportedSymbolFormats: ["{symbol}.{market}", "{symbol}"],
              priority: 1,
              isEnabled: true,
            },
          ],
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
      },
    },
  })
  @ApiStandardResponses()
  getAllStreamCapabilities() {
    this.logger.debug("getAllStreamCapabilities 方法被调用");
    const streamCapabilities =
      this.capabilityRegistry.getAllStreamCapabilities();
    const result = {};

    for (const [
      providerName,
      providerStreamCapabilities,
    ] of streamCapabilities) {
      result[providerName] = Array.from(
        providerStreamCapabilities.values(),
      ).map((reg) => this.formatStreamCapabilityRegistration(reg));
    }

    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.PROVIDERS_READ)
  @Get("best-provider/:capability")
  @ApiOperation({
    summary: "获取指定能力的最佳提供商",
    description:
      "根据指定的能力，返回最适合的数据源提供商，系统会根据优先级、可用性进行智能选择（需要API Key认证）",
  })
  @ApiParam({
    name: "capability",
    description: "能力名称",
    example: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
  })
  @ApiSecurity("ApiKey")
  @ApiSuccessResponse({
    description: "获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取最佳提供商成功",
        data: {
          capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          market: null,
          bestProvider: {
            name: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
            priority: 1,
            isEnabled: true,
            supportedMarkets: ["HK", "US"],
            description: "获取股票实时报价",
          },
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "未找到匹配的提供商",
    schema: {
      example: {
        statusCode: 404,
        message: "未找到支持该能力的提供商",
        error: "Not Found",
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
        path: "/providers/best-provider/invalid-capability",
      },
    },
  })
  @ApiStandardResponses()
  getBestProviderWithoutMarket(@Param("capability") capability: string) {
    const bestProviderName = this.capabilityRegistry.getBestProvider(
      capability,
      undefined,
    );

    const bestProvider = bestProviderName
      ? this.getFormattedProviderInfo(bestProviderName, capability)
      : null;

    return {
      capability,
      market: null,
      bestProvider,
    };
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.PROVIDERS_READ)
  @Get("best-provider/:capability/:market")
  @ApiOperation({
    summary: "获取指定能力的最佳提供商（指定市场）",
    description:
      "根据指定的能力和市场，返回最适合的数据源提供商，系统会根据优先级、可用性和市场支持情况进行智能选择（需要API Key认证）",
  })
  @ApiParam({
    name: "capability",
    description: "能力名称",
    example: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
  })
  @ApiParam({
    name: "market",
    description: "市场代码（可选）",
    example: "HK",
    required: false,
  })
  @ApiSecurity("ApiKey")
  @ApiSuccessResponse({
    description: "获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取最佳提供商成功",
        data: {
          capability: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
          market: "HK",
          bestProvider: {
            name: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
            priority: 1,
            isEnabled: true,
            supportedMarkets: ["HK", "US"],
            description: "获取股票实时报价",
          },
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "未找到匹配的提供商",
    schema: {
      example: {
        statusCode: 404,
        message: "未找到支持该能力的提供商",
        error: "Not Found",
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
        path: "/providers/best-provider/invalid-capability/HK",
      },
    },
  })
  @ApiStandardResponses()
  getBestProviderWithMarket(
    @Param("capability") capability: string,
    @Param("market") market: string,
  ) {
    const bestProviderName = this.capabilityRegistry.getBestProvider(
      capability,
      market,
    );

    const bestProvider = bestProviderName
      ? this.getFormattedProviderInfo(bestProviderName, capability)
      : null;

    return {
      capability,
      market,
      bestProvider,
    };
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.PROVIDERS_READ)
  @Get(":provider/capabilities")
  @ApiOperation({
    summary: "获取指定提供商的能力列表",
    description:
      "获取指定数据源提供商的所有可用能力详情，包括能力描述、支持的市场、优先级等信息（需要API Key认证）",
  })
  @ApiParam({
    name: "provider",
    description: "提供商名称",
    example: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
  })
  @ApiSecurity("ApiKey")
  @ApiSuccessResponse({
    description: "获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取提供商能力列表成功",
        data: {
          provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          capabilities: [
            {
              name: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
              description: "获取股票实时报价",
              supportedMarkets: ["HK", "US"],
              priority: 1,
              isEnabled: true,
            },
            {
              name: "get-stock-basic-info",
              description: "获取股票基本信息",
              supportedMarkets: ["HK", "US"],
              priority: 1,
              isEnabled: true,
            },
          ],
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "提供商不存在",
    schema: {
      example: {
        statusCode: 404,
        message: "提供商不存在",
        error: "Not Found",
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
        path: "/providers/invalid-provider/capabilities",
      },
    },
  })
  @ApiStandardResponses()
  getProviderCapabilities(@Param("provider") provider: string) {
    const allCapabilities = this.capabilityRegistry.getAllCapabilities();
    const providerCapabilities = allCapabilities.get(provider);

    if (!providerCapabilities) {
      return { provider, capabilities: [] };
    }

    return {
      provider,
      capabilities: Array.from(providerCapabilities.values()).map((reg) =>
        this.formatCapabilityRegistration(reg),
      ),
    };
  }
}
