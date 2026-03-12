#!/usr/bin/env node
/* eslint-disable no-console */

function parseCliArgs(argv = process.argv.slice(2)) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] || "");
    if (!token.startsWith("--")) {
      continue;
    }

    const raw = token.slice(2);
    const equalIndex = raw.indexOf("=");
    if (equalIndex >= 0) {
      const key = raw.slice(0, equalIndex);
      const value = raw.slice(equalIndex + 1);
      result[key] = value;
      continue;
    }

    const next = argv[index + 1];
    if (next && !String(next).startsWith("--")) {
      result[raw] = String(next);
      index += 1;
      continue;
    }

    result[raw] = "true";
  }

  return result;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value).trim().toLowerCase() === "true";
}

function parseSymbols(value, fallback) {
  return String(value || fallback || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function buildAuthHeaders(args) {
  const bearer = String(args.bearer || "").trim();
  if (bearer) {
    return { Authorization: `Bearer ${bearer}` };
  }

  const appKey = String(args["app-key"] || "").trim();
  const accessToken = String(args["access-token"] || "").trim();
  if (appKey && accessToken) {
    return {
      "X-App-Key": appKey,
      "X-Access-Token": accessToken,
    };
  }

  throw new Error("缺少认证头：请通过 --bearer，或同时提供 --app-key 与 --access-token");
}

function createEndpointClient(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv);
  const baseUrl = String(args["base-url"] || "http://127.0.0.1:3001").replace(/\/$/, "");
  const apiPrefix = String(args["api-prefix"] || "/api/v1");
  const timeoutMs = Number(args["timeout-ms"] || 15000);
  const authHeaders = buildAuthHeaders(args);

  async function post(path, body, requestOptions = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}${apiPrefix}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...(requestOptions.headers || {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    args,
    apiPrefix,
    baseUrl,
    post,
    timeoutMs,
  };
}

module.exports = {
  parseCliArgs,
  createEndpointClient,
  parseBoolean,
  parseSymbols,
};
