import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.AAC_API_KEY;
  const hasUrl = !!process.env.AAC_API_BASE_URL;
  const keyPrefix = process.env.AAC_API_KEY?.slice(0, 5) || "none";

  return NextResponse.json({
    status: "ok",
    hasApiKey: hasKey,
    hasApiUrl: hasUrl,
    keyPrefix,
    timestamp: new Date().toISOString(),
  });
}
