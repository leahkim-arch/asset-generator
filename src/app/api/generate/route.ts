import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.AAC_API_BASE_URL || "https://aac-api.navercorp.com";
const API_KEY = process.env.AAC_API_KEY || "";
const MODEL = "vertex_ai/imagen-4.0-ultra-generate-001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, negativePrompt, size = "1024x1024" } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: "API key is not configured" },
        { status: 500 }
      );
    }

    const fullPrompt = negativePrompt
      ? `${prompt}. Avoid: ${negativePrompt}`
      : prompt;

    const response = await fetch(`${API_BASE_URL}/v1/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: fullPrompt,
        n: 1,
        size,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", response.status, errorText);
      return NextResponse.json(
        { error: `API request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.data?.[0]?.b64_json) {
      return NextResponse.json({
        imageUrl: `data:image/png;base64,${data.data[0].b64_json}`,
        seed: Date.now(),
      });
    } else if (data.data?.[0]?.url) {
      return NextResponse.json({
        imageUrl: data.data[0].url,
        seed: Date.now(),
      });
    }

    return NextResponse.json(
      { error: "Unexpected API response format" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
