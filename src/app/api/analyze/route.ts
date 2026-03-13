import { NextRequest, NextResponse } from "next/server";

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
      content: `You are an expert sticker/asset designer. Your job is to analyze a planning document (기획안) and reference images to extract the EXACT visual style.

You MUST return a JSON object with these fields:
- analyzedStyle: A VERY detailed style description extracted from the reference/planning images. Describe the exact art technique, line weight, color usage, texture, medium (pen, pencil, digital, etc.), level of detail, and overall aesthetic as precisely as possible. This is displayed to the user.
- imagenPromptPrefix: A SHORT keyword-only style prompt optimized for Imagen image generation model. MUST be under 80 characters. Use comma-separated keywords only, NO sentences. This MUST faithfully capture the EXACT complexity level of the reference — if the reference is simple/minimal, use words like "simple", "minimal", "basic". If detailed, use "detailed", "intricate". NEVER add complexity that doesn't exist in the reference. Example for simple doodles: "simple black ink doodle, thin lines, minimal detail, hand-drawn sketch". Example for detailed art: "detailed digital illustration, vibrant colors, intricate shading".
- keywords: array of 5-8 relevant keywords
- mood: overall mood description  
- colors: array of 3-5 hex color codes that match the style
- suggestedItems: array of 25-36 specific sticker item names that fit the theme (each a single distinct object)
- imagenNegativeHints: Keywords for what to AVOID to stay faithful to the reference style. Under 80 characters. If reference is simple doodles, include "detailed, realistic, 3d, shading, gradient, complex". If reference is detailed art, include "simple, sketch, rough, unfinished". This prevents the model from drifting away from the intended style.
- suggestedStylePrompt: a production-ready style prompt combining the analyzed style with generation best practices (displayed in UI for user editing)
- summary: brief analysis summary

CRITICAL RULES:
1. imagenPromptPrefix MUST be under 80 characters, keyword-only, comma-separated. It captures the CORE visual DNA of the reference images.
2. NEVER inflate the complexity. If the reference is simple sketches with thin lines, the prefix must say "simple" and "minimal". Do NOT add "detailed" or "professional" to simple art.
3. analyzedStyle is the detailed version for human reading.
4. If images show hand-drawn doodles, capture that in both fields. If 3D renders, capture that. Be extremely specific about the level of detail and simplicity.

Return ONLY valid JSON, no markdown.`,
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
