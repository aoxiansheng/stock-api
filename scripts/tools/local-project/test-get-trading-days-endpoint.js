#!/usr/bin/env node
/* eslint-disable no-console */
const { createEndpointClient, parseSymbols } = require("./project-api-client");

async function main() {
  const client = createEndpointClient();
  const { args } = client;

  const symbols = parseSymbols(args.symbols, "AAPL.US");
  const provider = String(args.provider || "infoway").trim().toLowerCase();
  const market = String(args.market || "US").trim().toUpperCase();
  const beginDay = String(args["begin-day"] || "20260101").trim();
  const endDay = String(args["end-day"] || "20260131").trim();

  const requestBody = {
    symbols,
    receiverType: "get-trading-days",
    options: {
      preferredProvider: provider,
      market,
      beginDay,
      endDay,
    },
  };

  const response = await client.post("/receiver/data", requestBody);

  console.log(
    JSON.stringify(
      {
        request: {
          endpoint: "POST /api/v1/receiver/data",
          body: requestBody,
        },
        response: {
          ok: response.ok,
          status: response.status,
          body: response.data,
        },
      },
      null,
      2,
    ),
  );

  if (!response.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error?.message || String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
