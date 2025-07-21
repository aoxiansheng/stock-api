import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { createLogger } from "@common/config/logger.config";
import {
  ApiSuccessResponse,
  ApiStandardResponses,
} from "@common/decorators/swagger-responses.decorator";

import { ApiKeyAuth } from "../auth/decorators/auth.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { Permission } from "../auth/enums/user-role.enum";
import { RATE_LIMIT_CONFIG } from "../common/constants/rate-limit.constants";

import { CapabilityRegistryService } from "./capability-registry.service";

@ApiTags("数据源提供商")
@Controller("providers")
export class MainController {
  private readonly logger = createLogger(MainController.name);

  constructor(private readonly capabilityRegistry: CapabilityRegistryService) {}

  @ApiKeyAuth()
  @RequirePermissions(Permission.PROVIDERS_READ)
  @Throttle({ default: RATE_LIMIT_CONFIG.ENDPOINTS.PROVIDER_CAPABILITIES })
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
              name: "get-stock-quote",
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
        timestamp: "2024-01-01T12:00:00.000Z",
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
        (reg) => ({
          name: reg.capability.name,
          description: reg.capability.description,
          supportedMarkets: reg.capability.supportedMarkets,
          priority: reg.priority,
          isEnabled: reg.isEnabled,
        }),
      );
    }

    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.PROVIDERS_READ)
  @Get("best-provider/:capability/:market?")
  @ApiOperation({
    summary: "获取指定能力的最佳提供商",
    description:
      "根据指定的能力和市场，返回最适合的数据源提供商，系统会根据优先级、可用性和市场支持情况进行智能选择（需要API Key认证）",
  })
  @ApiParam({
    name: "capability",
    description: "能力名称",
    example: "get-stock-quote",
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
          capability: "get-stock-quote",
          market: "HK",
          bestProvider: {
            name: "longport",
            priority: 1,
            isEnabled: true,
            supportedMarkets: ["HK", "US"],
            description: "获取股票实时报价",
          },
        },
        timestamp: "2024-01-01T12:00:00.000Z",
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
        timestamp: "2024-01-01T12:00:00.000Z",
        path: "/providers/best-provider/invalid-capability/HK",
      },
    },
  })
  @ApiStandardResponses()
  @ApiStandardResponses()
  getBestProvider(
    @Param("capability") capability: string,
    @Param("market") market?: string,
  ) {
    const bestProvider = this.capabilityRegistry.getBestProvider(
      capability,
      market,
    );
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
    example: "longport",
  })
  @ApiSecurity("ApiKey")
  @ApiSuccessResponse({
    description: "获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取提供商能力列表成功",
        data: {
          provider: "longport",
          capabilities: [
            {
              name: "get-stock-quote",
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
        timestamp: "2024-01-01T12:00:00.000Z",
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
        timestamp: "2024-01-01T12:00:00.000Z",
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
      capabilities: Array.from(providerCapabilities.values()).map((reg) => ({
        name: reg.capability.name,
        description: reg.capability.description,
        supportedMarkets: reg.capability.supportedMarkets,
        priority: reg.priority,
        isEnabled: reg.isEnabled,
      })),
    };
  }
}
