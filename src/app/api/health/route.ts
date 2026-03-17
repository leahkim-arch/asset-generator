import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET() {
  const apiKey = process.env.AAC_API_KEY || "";
  const apiUrl = process.env.AAC_API_BASE_URL || "https://aac-api.navercorp.com";
  const hasKey = !!apiKey;
  const hasUrl = !!process.env.AAC_API_BASE_URL;
  const keyPrefix = apiKey.slice(0, 5) || "none";

  let apiReachable = false;
  let apiError = "";
  let apiResponseTime = 0;

  try {
    const start = Date.now();
    const res = await fetch(`${apiUrl}/v1/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    apiResponseTime = Date.now() - start;
    apiReachable = res.ok;
    if (!res.ok) {
      apiError = `HTTP ${res.status}: ${await res.text().catch(() => "no body")}`;
    }
  } catch (e) {
    apiError = e instanceof Error ? e.message : "Unknown fetch error";
  }

  return NextResponse.json({
    status: "ok",
    hasApiKey: hasKey,
    hasApiUrl: hasUrl,
    keyPrefix,
    apiUrl,
    apiReachable,
    apiError: apiError || undefined,
    apiResponseTime,
    timestamp: new Date().toISOString(),
  });
}
