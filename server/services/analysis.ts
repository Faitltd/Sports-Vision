import OpenAI from "openai";
import { storage } from "../storage";
import type { Game, Evidence } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface FactorScore {
  category: string;
  homeScore: number;
  awayScore: number;
  reasoning: string;
  keyFacts: string[];
  citations: string[];
}

interface AnalysisResult {
  pick: string;
  pickTeam: "home" | "away";
  confidenceLow: number;
  confidenceHigh: number;
  whyFactors: Array<{
    category: string;
    weight: number;
    featureValue: number;
    contribution: number;
    description: string;
    keyFacts: string[];
    citations: string[];
    favoredTeam: "home" | "away" | "neutral";
  }>;
  totalHomeScore: number;
  totalAwayScore: number;
}

const FACTOR_TO_CATEGORY: Record<string, string[]> = {
  qbRating: ["qb", "quarterback"],
  defense: ["defense", "defensive"],
  injuries: ["injury", "injuries"],
  strengthOfSchedule: ["sos", "schedule"],
  homeField: ["home", "homefield"],
  motivation: ["motivation", "rivalry"],
  portal: ["portal", "transfer"],
  coaching: ["coaching", "coach"],
  weather: ["weather"],
  marketMovement: ["market", "odds", "line"],
};

function categorizeEvidence(evidence: Evidence[]): Record<string, Evidence[]> {
  const categorized: Record<string, Evidence[]> = {};

  for (const ev of evidence) {
    const category = ev.category?.toLowerCase() || "general";
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push(ev);
  }

  return categorized;
}

function mapEvidenceCategoryToFactor(category: string): string | null {
  const catLower = category.toLowerCase();
  for (const [factor, keywords] of Object.entries(FACTOR_TO_CATEGORY)) {
    if (keywords.some((kw) => catLower.includes(kw))) {
      return factor;
    }
  }
  return null;
}

async function scoreEvidenceWithAI(
  evidence: Evidence[],
  homeTeam: string,
  awayTeam: string
): Promise<FactorScore[]> {
  if (evidence.length === 0) {
    return [];
  }

  const evidenceText = evidence
    .slice(0, 20)
    .map((e, i) => {
      const content = e.fullContent || e.snippet || e.headline || "";
      return `${i + 1}. [${e.category}] ${content.substring(0, 500)} (Source: ${e.source})`;
    })
    .join("\n\n");

  const prompt = `Analyze the following evidence for the game: ${awayTeam} @ ${homeTeam}

EVIDENCE:
${evidenceText}

For each relevant factor category, score how much the evidence favors each team on a scale of 0-10:
- 0 = strongly favors away team
- 5 = neutral/equal
- 10 = strongly favors home team

Return JSON with this exact format:
{
  "factors": [
    {
      "category": "qbRating",
      "homeScore": 0-10,
      "awayScore": 0-10,
      "reasoning": "Brief explanation",
      "keyFacts": ["fact 1", "fact 2"],
      "citations": ["Source 1", "Source 2"]
    }
  ]
}

Categories to evaluate: qbRating, defense, injuries, strengthOfSchedule, motivation, portal, coaching
Only include categories where evidence exists. Be objective and evidence-based.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an objective sports analyst. Score evidence fairly based on what it actually says, not assumptions.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);
    return (result.factors || []).map((f: any) => ({
      category: f.category || "general",
      homeScore: Math.min(10, Math.max(0, f.homeScore || 5)),
      awayScore: Math.min(10, Math.max(0, f.awayScore || 5)),
      reasoning: f.reasoning || "",
      keyFacts: f.keyFacts || [],
      citations: f.citations || [],
    }));
  } catch (error) {
    console.error("AI scoring error:", error);
    return heuristicScore(evidence, homeTeam, awayTeam);
  }
}

function heuristicScore(
  evidence: Evidence[],
  homeTeam: string,
  awayTeam: string
): FactorScore[] {
  const byCategory = categorizeEvidence(evidence);
  const scores: FactorScore[] = [];

  for (const [category, items] of Object.entries(byCategory)) {
    let homeScore = 5;
    let awayScore = 5;
    const keyFacts: string[] = [];
    const citations: string[] = [];

    for (const ev of items) {
      const content = (ev.fullContent || ev.snippet || ev.headline || "").toLowerCase();
      const homeTeamLower = homeTeam.toLowerCase();
      const awayTeamLower = awayTeam.toLowerCase();

      const mentionsHome = content.includes(homeTeamLower);
      const mentionsAway = content.includes(awayTeamLower);

      const positiveRegex = /strong|excellent|advantage|dominant|leading|top|best|improved|healthy|returning|win/i;
      const negativeRegex = /weak|poor|struggling|injury|injured|out|missing|loss|concern|problem|questionable/i;

      const isPositive = positiveRegex.test(content);
      const isNegative = negativeRegex.test(content);

      if (mentionsHome && !mentionsAway) {
        if (isPositive) homeScore += 1;
        if (isNegative) homeScore -= 1;
      } else if (mentionsAway && !mentionsHome) {
        if (isPositive) awayScore += 1;
        if (isNegative) awayScore -= 1;
      }

      if (ev.headline) keyFacts.push(ev.headline);
      if (ev.source) citations.push(ev.source);
    }

    homeScore = Math.min(10, Math.max(0, homeScore));
    awayScore = Math.min(10, Math.max(0, awayScore));

    const factor = mapEvidenceCategoryToFactor(category);
    if (factor) {
      scores.push({
        category: factor,
        homeScore,
        awayScore,
        reasoning: `Based on ${items.length} evidence items in ${category}`,
        keyFacts: keyFacts.slice(0, 3),
        citations: Array.from(new Set(citations)).slice(0, 3),
      });
    }
  }

  return scores;
}

export async function analyzeGame(gameId: string): Promise<AnalysisResult | null> {
  const game = await storage.getGame(gameId);
  if (!game) {
    throw new Error("Game not found");
  }

  const framework = await storage.getActiveFramework();
  if (!framework) {
    throw new Error("No active framework found");
  }

  const evidence = await storage.getEvidence(gameId);
  const weights = framework.weights as Record<string, number>;

  const factorScores =
    evidence.length > 0
      ? await scoreEvidenceWithAI(evidence, game.homeTeam, game.awayTeam)
      : [];

  let totalHomeScore = 0;
  let totalAwayScore = 0;
  let totalWeight = 0;
  const whyFactors: AnalysisResult["whyFactors"] = [];

  const homeFieldWeight = weights.homeField ?? 0;
  if (homeFieldWeight > 0) {
    const homeFieldBonus = (homeFieldWeight / 100) * 1.5;
    totalHomeScore += homeFieldBonus;
    totalWeight += homeFieldWeight;

    whyFactors.push({
      category: "homeField",
      weight: homeFieldWeight,
      featureValue: 7,
      contribution: homeFieldBonus,
      description: "Home field advantage provides inherent edge",
      keyFacts: ["Playing at home stadium", "Crowd support advantage"],
      citations: [],
      favoredTeam: "home",
    });
  }

  for (const [factor, weight] of Object.entries(weights)) {
    if (weight === 0 || factor === "homeField") continue;

    const factorScore = factorScores.find((f) => f.category === factor);

    if (factorScore) {
      const normalizedHome = factorScore.homeScore / 10;
      const normalizedAway = factorScore.awayScore / 10;
      const homeContribution = normalizedHome * (weight / 100);
      const awayContribution = normalizedAway * (weight / 100);

      totalHomeScore += homeContribution;
      totalAwayScore += awayContribution;
      totalWeight += weight;

      const netContribution = homeContribution - awayContribution;
      const favoredTeam: "home" | "away" | "neutral" =
        netContribution > 0.05 ? "home" : netContribution < -0.05 ? "away" : "neutral";

      whyFactors.push({
        category: factor,
        weight,
        featureValue: (factorScore.homeScore + factorScore.awayScore) / 2,
        contribution: netContribution,
        description: factorScore.reasoning,
        keyFacts: factorScore.keyFacts,
        citations: factorScore.citations,
        favoredTeam,
      });
    } else {
      totalWeight += weight;
      whyFactors.push({
        category: factor,
        weight,
        featureValue: 5,
        contribution: 0,
        description: "No specific evidence available for this factor",
        keyFacts: [],
        citations: [],
        favoredTeam: "neutral",
      });
    }
  }

  const scoreDiff = totalHomeScore - totalAwayScore;
  
  const hasEvidenceBasedScoring = factorScores.length > 0 || (homeFieldWeight > 0);
  
  if (!hasEvidenceBasedScoring || (factorScores.length === 0 && homeFieldWeight === 0)) {
    return {
      pick: "",
      pickTeam: "home",
      confidenceLow: 0,
      confidenceHigh: 0,
      whyFactors: [{
        category: "baseline",
        weight: 0,
        featureValue: 5,
        contribution: 0,
        description: "Insufficient evidence to make a confident recommendation. Run research to gather more data.",
        keyFacts: [],
        citations: [],
        favoredTeam: "neutral",
      }],
      totalHomeScore: 0,
      totalAwayScore: 0,
    };
  }

  const pickTeam: "home" | "away" = scoreDiff >= 0 ? "home" : "away";
  const pick = pickTeam === "home" ? game.homeTeam : game.awayTeam;

  const maxPossibleDiff = totalWeight / 100;
  const normalizedDiff = Math.abs(scoreDiff) / Math.max(maxPossibleDiff, 0.1);
  const baseConfidence = Math.min(90, Math.max(50, 55 + normalizedDiff * 40));

  return {
    pick,
    pickTeam,
    confidenceLow: Math.round(Math.max(30, baseConfidence - 8)),
    confidenceHigh: Math.round(Math.min(95, baseConfidence + 8)),
    whyFactors,
    totalHomeScore: Math.round(totalHomeScore * 100) / 100,
    totalAwayScore: Math.round(totalAwayScore * 100) / 100,
  };
}

export async function analyzeAndUpdateGame(gameId: string): Promise<Game | null> {
  const result = await analyzeGame(gameId);
  if (!result) return null;

  const framework = await storage.getActiveFramework();
  
  const hasValidPick = result.pick && result.pick.length > 0;

  const updatedGame = await storage.updateGame(gameId, {
    pick: hasValidPick ? result.pick : null,
    confidenceLow: hasValidPick ? result.confidenceLow : null,
    confidenceHigh: hasValidPick ? result.confidenceHigh : null,
    frameworkVersion: framework?.version || 1,
    status: hasValidPick ? "ready" : "pending",
  });

  await storage.deleteWhyFactors(gameId);

  const whyFactorInserts = result.whyFactors.map((wf) => ({
    gameId,
    category: wf.category,
    featureValue: wf.featureValue,
    contribution: wf.contribution,
    description: `[Weight: ${wf.weight}%] ${wf.description}`,
    keyFacts: wf.keyFacts,
    uncertaintyFlags: wf.favoredTeam === "neutral" ? ["Inconclusive evidence"] : undefined,
    citations: wf.citations,
  }));

  if (whyFactorInserts.length > 0) {
    await storage.createWhyFactors(whyFactorInserts);
  }

  return updatedGame || null;
}

export async function analyzeSlate(slateId: string): Promise<Game[]> {
  const games = await storage.getGames(slateId);
  const results: Game[] = [];

  for (const game of games) {
    const updated = await analyzeAndUpdateGame(game.id);
    if (updated) {
      results.push(updated);
    }
  }

  return results;
}
