import { z } from "zod";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

const researchResultSchema = z.object({
  findings: z.array(z.object({
    category: z.string(),
    headline: z.string(),
    snippet: z.string(),
    source: z.string(),
    sourceUrl: z.string().nullable(),
    relevanceScore: z.number(),
    isUncertain: z.boolean().default(false),
    uncertaintyReason: z.string().nullable().default(null),
  })),
  citations: z.array(z.object({
    index: z.number(),
    url: z.string(),
    title: z.string(),
  })),
});

export type ResearchFinding = z.infer<typeof researchResultSchema>["findings"][number];
export type Citation = z.infer<typeof researchResultSchema>["citations"][number];
export type ResearchResult = z.infer<typeof researchResultSchema>;

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  citations?: string[];
}

async function queryPerplexity(messages: PerplexityMessage[]): Promise<{ content: string; citations: string[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  const response = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages,
      return_citations: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as PerplexityResponse;
  const content = data.choices[0]?.message?.content || "";
  const citations = data.citations || [];
  
  return { content, citations };
}

export async function researchGame(homeTeam: string, awayTeam: string): Promise<ResearchResult> {
  const systemPrompt = `You are a college football research assistant focused on betting analysis.
Your job is to find the most relevant, recent information that could affect betting decisions.

Research these categories:
1. QB Status - Starting quarterback situation, injuries, suspensions, transfers
2. Key Injuries - Impact players out or questionable
3. Opt-Outs - Players sitting out for NFL draft
4. Coaching - New coaches, coordinator changes, recent firings
5. Motivation - Rivalry game, bowl eligibility, ranking implications
6. Recent Performance - Last 3-5 game trends

Return JSON in this exact format:
{
  "findings": [
    {
      "category": "qb|injury|portal|coaching|motivation|performance",
      "headline": "Brief headline",
      "snippet": "2-3 sentence summary with key facts",
      "source": "Source name",
      "sourceUrl": "URL or null",
      "relevanceScore": 0.0-1.0,
      "isUncertain": false,
      "uncertaintyReason": null
    }
  ],
  "citations": [
    {
      "index": 0,
      "url": "full URL",
      "title": "Article title"
    }
  ]
}

Important:
- Focus on information from the last 7 days
- Mark findings as uncertain if sources conflict or info is unverified
- Higher relevance scores (0.8-1.0) for confirmed news directly affecting the game
- Lower scores (0.3-0.6) for speculation or tangential information
- Always include source attribution`;

  const userPrompt = `Research the upcoming college football game: ${awayTeam} at ${homeTeam}.

Find the latest information on:
1. Quarterback situation for both teams
2. Key player injuries or absences
3. Transfer portal activity and opt-outs
4. Coaching staff changes
5. Motivation factors (rivalry, bowl eligibility, rankings)
6. Recent performance trends

Prioritize information that would be relevant for betting analysis.`;

  try {
    const { content, citations } = await queryPerplexity([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let parsedContent: Record<string, unknown>;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        parsedContent = { findings: [], citations: [] };
      }
    } catch {
      parsedContent = { findings: [], citations: [] };
    }

    const findingsWithCitations = (parsedContent.findings as ResearchFinding[] || []).map((f, i) => ({
      ...f,
      sourceUrl: citations[i] || f.sourceUrl || null,
    }));

    const citationsFormatted = citations.map((url, index) => ({
      index,
      url,
      title: new URL(url).hostname,
    }));

    return {
      findings: findingsWithCitations,
      citations: citationsFormatted,
    };
  } catch (error) {
    console.error("Perplexity research error:", error);
    return { findings: [], citations: [] };
  }
}

export async function researchSpecificTopic(
  homeTeam: string, 
  awayTeam: string, 
  topic: string
): Promise<ResearchResult> {
  const systemPrompt = `You are a college football research assistant.
Research the specific topic requested and return findings in JSON format:
{
  "findings": [
    {
      "category": "relevant category",
      "headline": "Brief headline",
      "snippet": "2-3 sentence summary",
      "source": "Source name",
      "sourceUrl": "URL or null",
      "relevanceScore": 0.0-1.0,
      "isUncertain": false,
      "uncertaintyReason": null
    }
  ],
  "citations": []
}`;

  const userPrompt = `For the game ${awayTeam} at ${homeTeam}, research: ${topic}`;

  try {
    const { content, citations } = await queryPerplexity([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let parsedContent: Record<string, unknown>;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        parsedContent = { findings: [], citations: [] };
      }
    } catch {
      parsedContent = { findings: [], citations: [] };
    }

    const findingsWithCitations = (parsedContent.findings as ResearchFinding[] || []).map((f, i) => ({
      ...f,
      sourceUrl: citations[i] || f.sourceUrl || null,
    }));

    return {
      findings: findingsWithCitations,
      citations: citations.map((url, index) => ({
        index,
        url,
        title: new URL(url).hostname,
      })),
    };
  } catch (error) {
    console.error("Perplexity research error:", error);
    return { findings: [], citations: [] };
  }
}

interface UpcomingGame {
  id: string;
  awayTeam: string;
  homeTeam: string;
  gameTime: string;
  spread?: string;
  overUnder?: string;
  venue?: string;
  tvNetwork?: string;
  conference?: string;
  notes?: string;
  sport?: string;
}

interface UpcomingGamesResult {
  games: UpcomingGame[];
  searchQuery: string;
  sport: string;
  timestamp: string;
  sources: string[];
}

type Sport = "nfl" | "ncaaf" | "ncaab" | "nba";

const sportConfig: Record<Sport, { name: string; defaultQuery: string; description: string }> = {
  nfl: {
    name: "NFL",
    defaultQuery: "upcoming NFL games this week",
    description: "National Football League"
  },
  ncaaf: {
    name: "NCAA Football",
    defaultQuery: "upcoming college football games this week",
    description: "NCAA Division I Football"
  },
  ncaab: {
    name: "NCAA Basketball",
    defaultQuery: "upcoming college basketball games this week",
    description: "NCAA Division I Men's Basketball"
  },
  nba: {
    name: "NBA",
    defaultQuery: "upcoming NBA games this week",
    description: "National Basketball Association"
  }
};

export async function searchUpcomingGames(sport: Sport, query?: string): Promise<UpcomingGamesResult> {
  const config = sportConfig[sport];
  const searchQuery = query || config.defaultQuery;
  
  const systemPrompt = `You are a ${config.name} schedule and betting information assistant.
Your job is to find upcoming ${config.name} games based on the user's query.

Return JSON in this exact format:
{
  "games": [
    {
      "id": "unique-id-123",
      "awayTeam": "Away Team Name",
      "homeTeam": "Home Team Name",
      "gameTime": "Day, Month Date at Time ET",
      "spread": "Favorite -7.5",
      "overUnder": "Total points",
      "venue": "Stadium/Arena Name, City",
      "tvNetwork": "Broadcast network",
      "conference": "Conference/Division info",
      "notes": "Any relevant notes"
    }
  ]
}

Important:
- Include actual game times and dates
- Include betting lines if available (spread and over/under)
- Include TV/streaming network information
- Generate unique IDs for each game (use format like "game-timestamp-index")
- Focus on ${config.description} games
- Return up to 10 most relevant games
- Today's date context: Use current real-world schedule data`;

  const userPrompt = `Find ${config.name} games matching this query: "${searchQuery}"

Include game times, betting lines if available, TV networks, and venues.`;

  try {
    const { content, citations } = await queryPerplexity([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let parsedContent: { games: UpcomingGame[] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        parsedContent = { games: [] };
      }
    } catch {
      parsedContent = { games: [] };
    }

    const games = (parsedContent.games || []).map((g, i) => ({
      ...g,
      id: g.id || `game-${Date.now()}-${i}`,
      sport: sport,
    }));

    return {
      games,
      searchQuery,
      sport,
      timestamp: new Date().toISOString(),
      sources: citations,
    };
  } catch (error) {
    console.error("Perplexity upcoming games search error:", error);
    return {
      games: [],
      searchQuery,
      sport,
      timestamp: new Date().toISOString(),
      sources: [],
    };
  }
}

export async function researchMatchup(
  awayTeam: string,
  homeTeam: string,
  sport: Sport = "ncaaf",
  gameTime?: string
): Promise<{ content: string; sources: string[] }> {
  const config = sportConfig[sport];
  
  const systemPrompt = `You are a ${config.name} betting analyst.
Provide a concise research summary for the matchup that would help with betting decisions.

Output format (strict):
- Exactly 5 bullet points (prefix each with "- ") capturing the most important insights
- Then a short 2-3 sentence explanation paragraph

Focus on:
1. Recent team performance (last 3-5 games)
2. Key player injuries or absences
3. Head-to-head history
4. Betting trends and public money
5. ${sport === "nfl" || sport === "ncaaf" ? "Weather impact if relevant" : "Rest days and travel"}
6. Motivation factors

Keep it tight and actionable.`;

  const userPrompt = `Research the ${config.name} matchup: ${awayTeam} at ${homeTeam}${gameTime ? ` (${gameTime})` : ""}.

Provide a betting-focused analysis with key factors that could affect the spread and total. Use the required output format.`;

  try {
    const { content, citations } = await queryPerplexity([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    return {
      content: content || "No research data available.",
      sources: citations,
    };
  } catch (error) {
    console.error("Perplexity matchup research error:", error);
    return {
      content: "Research failed. Please try again.",
      sources: [],
    };
  }
}
