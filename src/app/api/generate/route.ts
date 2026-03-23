import { NextRequest, NextResponse } from "next/server";
import { GENERATION_MODELS, type GenerationModel } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AAC_API_BASE = process.env.AAC_API_BASE_URL || "https://aac-api.navercorp.com";
const AAC_API_KEY = process.env.AAC_API_KEY || "";
const SNOW_API_BASE = process.env.SNOW_API_BASE_URL || "https://litellm-snow.io.naver.com";
const SNOW_API_KEY = process.env.SNOW_API_KEY || "";

function getApiConfig(apiSource?: string) {
  if (apiSource === "snow") {
    return { base: SNOW_API_BASE, key: SNOW_API_KEY || AAC_API_KEY };
  }
  return { base: AAC_API_BASE, key: AAC_API_KEY };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`요청 시간 초과 (${Math.round(timeoutMs / 1000)}초)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, negativePrompt, model = "gemini-3.1-flash-image", referenceImageUrl } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    if (!AAC_API_KEY) {
      return NextResponse.json({ error: "API key is not configured" }, { status: 500 });
    }

    const modelKey = model as GenerationModel;
    const modelInfo = GENERATION_MODELS[modelKey];
    if (!modelInfo) {
      return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 });
    }

    const { base, key } = getApiConfig(modelInfo.apiSource);

    if (modelInfo.apiType === "imagen") {
      return handleImagenGeneration(modelInfo.id, prompt, negativePrompt, base, key);
    }
    return handleGeminiGeneration(modelInfo.id, prompt, negativePrompt, referenceImageUrl, base, key);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Generation error:", message);
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 });
  }
}

async function handleImagenGeneration(modelId: string, prompt: string, negativePrompt?: string, apiBase?: string, apiKey?: string) {
  const base = apiBase || AAC_API_BASE;
  const key = apiKey || AAC_API_KEY;

  const requestBody: Record<string, unknown> = {
    model: modelId,
    prompt,
    n: 1,
  };

  if (modelId === "grok-imagine-image-pro") {
    // Grok doesn't support size parameter
  } else if (modelId === "seedream-5-0-260128") {
    requestBody.size = "2048x2048";
  } else {
    requestBody.size = "2048x2048";
  }

  if (negativePrompt) {
    requestBody.negative_prompt = negativePrompt;
  }

  const response = await fetchWithTimeout(`${base}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  }, 60000);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Imagen API error:", response.status, errorText);
    const snippet = errorText.slice(0, 200);
    return NextResponse.json({ error: `${modelId} API failed (${response.status}): ${snippet}` }, { status: response.status });
  }

  const data = await response.json();

  if (data.data?.[0]?.b64_json) {
    return NextResponse.json({ imageUrl: `data:image/png;base64,${data.data[0].b64_json}`, seed: Date.now() });
  }
  if (data.data?.[0]?.url) {
    return NextResponse.json({ imageUrl: data.data[0].url, seed: Date.now() });
  }

  console.error("Imagen unexpected response:", JSON.stringify(data).slice(0, 500));
  return NextResponse.json({ error: "Imagen: unexpected response format" }, { status: 500 });
}

async function handleGeminiGeneration(modelId: string, prompt: string, negativePrompt?: string, referenceImageUrl?: string, apiBase?: string, apiKey?: string) {
  const base = apiBase || AAC_API_BASE;
  const key = apiKey || AAC_API_KEY;

  let textPrompt = prompt;
  if (negativePrompt) {
    textPrompt += `\n\nAVOID: ${negativePrompt}`;
  }
  textPrompt += "\n\nIMPORTANT: SQUARE 1:1 aspect ratio. Output only the image, no text response.";

  let messageContent: unknown;
  if (referenceImageUrl && referenceImageUrl.startsWith("data:")) {
    textPrompt = `STYLE REFERENCE: The attached image shows the exact visual style to follow. Generate a NEW icon matching this exact same style.\n\n${textPrompt}`;
    messageContent = [
      { type: "image_url", image_url: { url: referenceImageUrl } },
      { type: "text", text: textPrompt },
    ];
  } else {
    messageContent = textPrompt;
  }

  const response = await fetchWithTimeout(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: messageContent }],
      temperature: 0.5,
      max_tokens: 4096,
      image_size: "1024x1024",
    }),
  }, 60000);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error (${modelId}):`, response.status, errorText);
    const snippet = errorText.slice(0, 200);
    return NextResponse.json({ error: `${modelId} API failed (${response.status}): ${snippet}` }, { status: response.status });
  }

  const data = await response.json();
  const choice = data.choices?.[0]?.message;

  if (!choice) {
    console.error(`Gemini no choice (${modelId}):`, JSON.stringify(data).slice(0, 500));
    return NextResponse.json({ error: `${modelId}: no response` }, { status: 500 });
  }

  // Case 1: images array on message (Gemini image_generation models)
  if (Array.isArray(choice.images) && choice.images.length > 0) {
    const img = choice.images[0];
    if (img.image_url?.url) {
      return NextResponse.json({ imageUrl: img.image_url.url, seed: Date.now() });
    }
    if (img.url) {
      return NextResponse.json({ imageUrl: img.url, seed: Date.now() });
    }
    if (img.b64_json) {
      return NextResponse.json({ imageUrl: `data:image/png;base64,${img.b64_json}`, seed: Date.now() });
    }
  }

  // Case 2: content is array of parts (multimodal response)
  if (Array.isArray(choice.content)) {
    for (const part of choice.content) {
      if (part.inline_data?.data) {
        const mime = part.inline_data.mime_type || "image/png";
        return NextResponse.json({ imageUrl: `data:${mime};base64,${part.inline_data.data}`, seed: Date.now() });
      }
      if (part.image_url?.url) {
        return NextResponse.json({ imageUrl: part.image_url.url, seed: Date.now() });
      }
    }
  }

  // Case 3: content is string with embedded base64
  if (typeof choice.content === "string" && choice.content.includes("base64")) {
    const b64Match = choice.content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/);
    if (b64Match) {
      return NextResponse.json({ imageUrl: b64Match[0], seed: Date.now() });
    }
  }

  console.error(`Gemini image extract failed (${modelId}). Keys:`, Object.keys(choice), JSON.stringify(data).slice(0, 500));
  return NextResponse.json({ error: `${modelId}: could not extract image` }, { status: 500 });
}
