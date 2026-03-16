#!/usr/bin/env node
/* eslint-disable no-console */
const { createEndpointClient, parseSymbols } = require("./project-api-client");

async function main() {
  const client = createEndpointClient();
  const { args } = client;

  const symbols = parseSymbols(args.symbols, "00700.HK,AAPL.US,600519.SH");
  const provider = String(args.provider || "infoway").trim().toLowerCase();
  const market = String(args.market || "").trim().toUpperCase();

  const requestBody = {
    symbols,
    receiverType: "get-market-status",
    options: {
      preferredProvider: provider,
    },
  };

  if (market) {
    requestBody.options.market = market;
  }

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
