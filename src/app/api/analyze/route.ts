import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API_BASE_URL = process.env.AAC_API_BASE_URL || "https://aac-api.navercorp.com";
const API_KEY = process.env.AAC_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const topic = (formData.get("topic") as string) || "";
    const specImage = formData.get("specImage") as File | null;
    const refImages = formData.getAll("refImages") as File[];

    if (!API_KEY) {
      return NextResponse.json(fallbackAnalysis(topic), { status: 200 });
    }

    const messages: Array<Record<string, unknown>> = [];

    messages.push({
      role: "system",
      content: `You are an expert sticker/asset designer. Analyze the planning document and reference images to extract the EXACT visual style for generating a consistent icon set.

Return a JSON object with these fields:

- analyzedStyle: Detailed style description for the user. Cover: art technique, line weight/style, color palette usage, texture, medium (pen/pencil/digital/3D), level of detail, shading method, overall aesthetic. Be VERY specific — e.g. "thick black outlines (3-4px), flat fills with no gradients, pastel color palette, kawaii cartoon style with rounded shapes and simple expressions."

- imagenPromptPrefix: Under 100 chars, keyword-only, comma-separated. Core visual DNA for Imagen model. Match EXACT complexity of reference. Examples:
  - Simple doodles → "simple line doodle, thin strokes, minimal, hand-drawn"
  - Flat vector → "flat vector icon, bold outline, solid colors, clean"
  - 3D render → "3D rendered icon, soft lighting, glossy material, vibrant"
  - Kawaii → "kawaii cartoon, thick outline, pastel colors, cute rounded shapes"

- imagenNegativeHints: Under 80 chars. What to AVOID to stay faithful. Examples:
  - For flat art → "3d, realistic, gradient, photograph, complex shading"
  - For 3D art → "flat, sketch, rough, line art, hand-drawn"

- keywords: 5-8 relevant style/theme keywords
- mood: overall mood
- colors: 3-5 hex codes matching the reference palette
- suggestedItems: 25-36 specific icon names fitting the theme (single distinct objects each)
- suggestedStylePrompt: Production-ready prompt combining analyzed style. Include specific technical terms the user can edit.
- summary: 1-2 sentence analysis summary

RULES:
1. NEVER inflate complexity. Simple reference = simple output keywords.
2. Be extremely specific about line weight, fill method, and shading.
3. suggestedItems should be concrete objects, not abstract concepts.
4. Return ONLY valid JSON, no markdown fences.`,
    });

    const userContent: Array<Record<string, unknown>> = [];

    if (specImage && specImage.size > 0) {
      const buffer = await specImage.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = specImage.type || "image/png";

      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
        },
      });
    }

    for (const refImg of refImages) {
      if (refImg && refImg.size > 0) {
        const buffer = await refImg.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = refImg.type || "image/png";

        userContent.push({
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64}`,
          },
        });
      }
    }

    const textParts = [];
    if (topic) textParts.push(`Theme/Topic: "${topic}"`);
    if (specImage) textParts.push("I've attached the planning document (기획안) image above.");
    if (refImages.length > 0) textParts.push(`I've also attached ${refImages.length} reference image(s).`);
    textParts.push("Analyze the EXACT visual style from these images and generate appropriate sticker items for this theme.");

    userContent.push({ type: "text", text: textParts.join(" ") });

    messages.push({ role: "user", content: userContent });

    const hasImages = specImage || refImages.length > 0;
    const model = hasImages ? "gemini-2.5-flash" : "gemini-2.5-flash";

    try {
      const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.5,
          max_tokens: 8000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          const partialMatch = cleaned.match(/"suggestedItems"\s*:\s*\[[\s\S]*?\]/);
          const styleMatch = cleaned.match(/"analyzedStyle"\s*:\s*"([\s\S]*?)"/);
          const prefixMatch = cleaned.match(/"imagenPromptPrefix"\s*:\s*"([\s\S]*?)"/);
          parsed = {
            analyzedStyle: styleMatch?.[1] || "",
            imagenPromptPrefix: prefixMatch?.[1] || "",
            imagenNegativeHints: "",
            keywords: [],
            mood: "",
            colors: [],
            suggestedItems: partialMatch ? JSON.parse(`{${partialMatch[0]}}`).suggestedItems || [] : [],
            suggestedStylePrompt: styleMatch?.[1] || "",
            summary: "Partial parse from truncated response",
          };
        }

        if (!parsed.analyzedStyle && parsed.suggestedStylePrompt) {
          parsed.analyzedStyle = parsed.suggestedStylePrompt;
        }
        if (!parsed.imagenPromptPrefix) {
          const fallbackPrefix = (parsed.keywords || []).slice(0, 4).join(", ");
          parsed.imagenPromptPrefix = fallbackPrefix || "sticker, high quality";
        }
        if (!parsed.imagenNegativeHints) {
          parsed.imagenNegativeHints = "";
        }

        return NextResponse.json(parsed);
      } else {
        const errText = await response.text();
        console.error("LLM analysis error:", response.status, errText);
      }
    } catch (e) {
      console.error("LLM analysis failed, using fallback:", e);
    }

    return NextResponse.json(fallbackAnalysis(topic));
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}

function fallbackAnalysis(topic: string) {
  const baseItems = [
    "Happy face", "Thumbs up", "Heart", "Star", "Lightning bolt",
    "Cloud", "Rainbow", "Fire", "Sparkle", "Crown",
    "Gift box", "Party popper", "Music note", "Flower", "Sun",
    "Moon", "Rocket", "Diamond", "Trophy", "Balloon",
    "Peace sign", "OK hand", "Clap", "Wave", "Checkmark",
    "Cat face", "Dog face", "Bear face", "Bunny", "Panda",
    "Pizza", "Coffee", "Cake", "Ice cream", "Donut",
    "Laptop", "Phone", "Camera", "Headphones", "Game controller",
  ];

  return {
    analyzedStyle: "",
    imagenPromptPrefix: "sticker, high quality, clean",
    imagenNegativeHints: "",
    keywords: topic ? topic.split(/\s+/).slice(0, 5) : [],
    mood: "playful",
    colors: ["#FF6B6B", "#4ECDC4", "#45B7D1"],
    suggestedItems: baseItems,
    suggestedStylePrompt: `sticker asset, ${topic}, single object centered, transparent background, clean edges, high quality`,
    summary: `Analysis of topic: ${topic}`,
  };
}
