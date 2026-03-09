# Infoway 产品清单 (Support List) API 使用说明

## 1. 接口概述

本接口用于透传并拉取 Infoway 数据供应商所支持的底层全部产品/标的列表。该接口在 Stock API 系统内部直接提供暴露，使前端或其它系统可以通过标准的请求获取各国家、各市场的代码全集或指定查询匹配的产品。

* **Endpoint:** `GET /api/v1/receiver/support-list`
* **鉴权方式:** API Key 认证（Headers 传入 `X-App-Key` 和 `X-Access-Token`）
* **Swagger Tags:** 🚀 强时效接口 - 实时数据接收

---

## 2. 请求参数 (Query Parameters)

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
| :--- | :--- | :---: | :--- | :--- |
| **type** | `string` | **是** | **核心参数**，指定需要拉取的产品市场或类别。不支持为空。 | `STOCK_US` |
| **symbols** | `string` | 否 | 指定感兴趣的部分产品代码进行精确过滤，多个代码之间用以英文逗号 `,` 分隔。留空则代表拉取该 `type` 下的全量清单数据。最大限制1000个。 | `.DJI.US,.IXIC.US` |
| **preferredProvider** | `string` | 否 | 指定由哪个底层 Provider 履约查询请求。通常针对 Infoway 产品清单，请确保系统路由到 `infoway`。 | `infoway` |

### 支持的 `type` 类型枚举 (INFOWAY_SUPPORT_LIST_TYPES)

Infoway Provider 当前原生支持拉取以下 8 种类型/市场的所有代码及产品名称：

1. **`STOCK_US`**: 美股市场及美股指数等产品（约 14,000+ 条标的）。
2. **`STOCK_HK`**: 港股市场及港股指数等产品（约 4,300+ 条标的）。
3. **`STOCK_CN`**: A股（中国大陆）市场及对应指数。
4. **`FUTURES`**: 期货市场（涵盖各类外围）。
5. **`FOREX`**: 外汇/货币对。
6. **`ENERGY`**: 能源及附属大宗商品。
7. **`METAL`**: 贵金属（含现货黄金/白银等）。
8. **`CRYPTO`**: 加密数字货币及其指数。

*(注意：请求时 `type` 参数强制区分大小写或将被代码安全转化，推荐使用标准大写。)*

---

## 3. 响应格式

请求成功后将返回标准 `DataResponseDto` 格式的数据结构。拉取的所有标的原始记录将被统一包含在 `data` 或 `data.data` 体内。此功能透传了上游厂商的基础语义。

### 成功响应示例 (Status Code: 200)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "请求成功",
  "data": {
    "data": [
      {
        "symbol": ".DJI.US",
        "name_cn": "道琼斯指数",
        "name_hk": "道瓊斯指數",
        "name_en": "Dow Jones Industrial Average"
      },
      {
        "symbol": "IBKR.US",
        "name_cn": "盈透证券",
        "name_hk": "盈透證券",
        "name_en": "Interactive Brokers Group, Inc."
      },
      {
        "symbol": "FUTU.US",
        "name_cn": "富途控股",
        "name_hk": "富途控股",
        "name_en": "Futu Holdings Limited"
      }
    ],
    "metadata": {
      "provider": "infoway",
      "capability": "get-support-list",
      "timestamp": "2026-03-09T12:00:00.000Z",
      "requestId": "req_84d728...",
      "processingTimeMs": 140,
      "hasPartialFailures": false,
      "totalRequested": 0,
      "successfullyProcessed": 14425
    }
  },
  "timestamp": "2026-03-09T12:00:00.000Z"
}
```

---

## 4. 如何在本地联调与验证

项目中提供了一个便捷的调试抓取脚本，位于 `scripts/tools/local-project/test-get-support-list.js`。

### ① 拉取指定类型的全量列表数据：
默认直接执行脚本时，将抓取并在终端输出 `STOCK_US` 的**完整 JSON 列表**，并且会自动写入 `scripts/tmp/support-list-raw.json` 供本地编辑器快速分析提取。

```bash
# 默认全量抓取 美股 (STOCK_US) 列表
node scripts/tools/local-project/test-get-support-list.js
```

### ② 指定拉取港股 (STOCK_HK) 列表：
通过配置 `TEST_TYPE` 环境变量运行同一套脚本：

```bash
# 透传抓取 港股 列表，并将日志提取成独立文件
TEST_TYPE="STOCK_HK" node scripts/tools/local-project/test-get-support-list.js > scripts/tmp/support-list-hk.json
```

### ③ 指定过滤查询部分产品：
通过配置 `TEST_SYMBOLS` 对其进行显式过滤限制（一般用于验证格式提取）：

```bash
# 只拉取美股特定 2 支产品的结构情况
TEST_SYMBOLS="AAPL.US,IBKR.US" node scripts/tools/local-project/test-get-support-list.js
```

---

## 5. 注意事项

1. **缓存与性能：** 该接口目前透传调用外部，虽然响应速度快（通常几百毫秒内返回万级别的数据），但应注意在网关或代理侧加入适当的本地化持久缓存，防止短时间内对全量超集 `get-support-list` 这个相对庞大的负载进行过多重复高频请求。
2. **规范参数使用：** `type` 的合法性检查内置在 Service 层（引用被统一抽象在 `normalizeInfowaySupportListType` 中），如果您传递的 `type` 不属于支持的 8 类其一，将报出 HTTP 400 (Bad Request)。
3. **符号格式化验证放行：** Infoway 支持诸如 `.DJI.US` 或 `.IXIC.US` 这样以特殊点号前缀开头的标的。为此，其 DTO `support-list-request.dto.ts` 的内部使用专属正则 `^[A-Za-z0-9._:-]+$` 放行支持该特异化结构，不需受标准 `symbol.market` 解析规则阻拦。
