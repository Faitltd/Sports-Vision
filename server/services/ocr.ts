import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const gameExtractionSchema = z.object({
  games: z.array(z.object({
    homeTeam: z.string(),
    awayTeam: z.string(),
    spread: z.number().nullable(),
    spreadTeam: z.string().nullable(),
    total: z.number().nullable(),
    moneylineHome: z.number().nullable(),
    moneylineAway: z.number().nullable(),
    gameTime: z.string().nullable(),
  })),
  rawText: z.string(),
});

export type ExtractedGame = z.infer<typeof gameExtractionSchema>["games"][number];
export type OCRResult = z.infer<typeof gameExtractionSchema>;

export async function extractGamesFromImage(imageBase64: string): Promise<OCRResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert at extracting college football betting information from screenshots.
Extract all games shown in the image. For each game, identify:
- Home team and away team names
- Point spread (positive number with the team it's for)
- Total points (over/under line)
- Moneyline odds for both teams
- Game time if visible

Return JSON in this exact format:
{
  "games": [
    {
      "homeTeam": "Team Name",
      "awayTeam": "Team Name",
      "spread": -3.5,
      "spreadTeam": "Team Name",
      "total": 45.5,
      "moneylineHome": -150,
      "moneylineAway": +130,
      "gameTime": "2024-01-15T15:30:00Z"
    }
  ],
  "rawText": "Raw OCR text from the image"
}

Important:
- Spreads are stored as the line value (e.g., -3.5 means the spreadTeam is favored by 3.5)
- Moneyline values should be integers (e.g., -150, +130)
- Game times should be ISO format or null if not visible
- If a value cannot be determined, use null`
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
              detail: "high"
            }
          },
          {
            type: "text",
            text: "Extract all college football games and betting lines from this image."
          }
        ]
      }
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OCR");
  }

  const parsed = JSON.parse(content);
  return gameExtractionSchema.parse(parsed);
}

export async function extractGamesFromText(text: string): Promise<OCRResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert at extracting college football betting information.
Parse the provided text and extract all games. For each game, identify:
- Home team and away team names
- Point spread (positive number with the team it's for)
- Total points (over/under line)
- Moneyline odds for both teams
- Game time if visible

Return JSON in this exact format:
{
  "games": [
    {
      "homeTeam": "Team Name",
      "awayTeam": "Team Name",
      "spread": -3.5,
      "spreadTeam": "Team Name",
      "total": 45.5,
      "moneylineHome": -150,
      "moneylineAway": +130,
      "gameTime": "2024-01-15T15:30:00Z"
    }
  ],
  "rawText": "Original text provided"
}`
      },
      {
        role: "user",
        content: text
      }
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from parser");
  }

  const parsed = JSON.parse(content);
  return gameExtractionSchema.parse(parsed);
}
