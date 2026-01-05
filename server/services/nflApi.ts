import axios from "axios";

const NFL_API_BASE_URL = "https://v1.american-football.api-sports.io";
const NFL_API_KEY = process.env.NFL_API_KEY;

interface NFLGame {
  id: number;
  date: string;
  time: string;
  timestamp: number;
  timezone: string;
  stage: string | null;
  week: string;
  venue: {
    name: string;
    city: string;
  };
  status: {
    short: string;
    long: string;
  };
  league: {
    id: number;
    name: string;
    season: string;
    logo: string;
    country: {
      name: string;
      code: string;
      flag: string;
    };
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  scores: {
    home: {
      quarter_1: number | null;
      quarter_2: number | null;
      quarter_3: number | null;
      quarter_4: number | null;
      overtime: number | null;
      total: number | null;
    };
    away: {
      quarter_1: number | null;
      quarter_2: number | null;
      quarter_3: number | null;
      quarter_4: number | null;
      overtime: number | null;
      total: number | null;
    };
  };
}

interface NFLOdds {
  league: { id: number; name: string; season: string };
  game: { id: number };
  bookmakers: {
    id: number;
    name: string;
    bets: {
      id: number;
      name: string;
      values: { value: string; odd: string }[];
    }[];
  }[];
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
  sport: string;
}

async function makeApiRequest<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  if (!NFL_API_KEY) {
    console.error("NFL_API_KEY not configured");
    return null;
  }

  try {
    const response = await axios.get(`${NFL_API_BASE_URL}${endpoint}`, {
      params: { ...params, timezone: "America/New_York" },
      headers: {
        "x-apisports-key": NFL_API_KEY,
      },
    });

    const remaining = response.headers["x-ratelimit-requests-remaining"];
    if (remaining) {
      console.log(`NFL API: ${remaining} requests remaining today`);
    }

    return response.data;
  } catch (error) {
    console.error(`NFL API error for ${endpoint}:`, error);
    return null;
  }
}

function formatGameTime(date: string, time: string): string {
  try {
    const gameDate = new Date(`${date}T${time}`);
    return gameDate.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return `${date} ${time}`;
  }
}

export async function getNFLGamesForDate(date: string): Promise<UpcomingGame[]> {
  const data = await makeApiRequest<{ response: NFLGame[] }>("/games", { 
    date, 
    league: "1" 
  });

  if (!data?.response) {
    return [];
  }

  return data.response
    .filter((game) => game.status.short !== "FT" && game.status.short !== "AOT")
    .map((game) => ({
      id: `nfl-api-${game.id}`,
      awayTeam: game.teams.away.name,
      homeTeam: game.teams.home.name,
      gameTime: formatGameTime(game.date, game.time),
      venue: game.venue ? `${game.venue.name}, ${game.venue.city}` : undefined,
      conference: game.week || undefined,
      notes: game.status.long !== "Not Started" ? game.status.long : undefined,
      sport: "nfl",
    }));
}

export async function getNFLGamesForWeek(): Promise<UpcomingGame[]> {
  const today = new Date();
  const dates: string[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }

  const allGames: UpcomingGame[] = [];
  
  for (const date of dates) {
    const games = await getNFLGamesForDate(date);
    allGames.push(...games);
    
    if (allGames.length >= 10) break;
  }

  return allGames.slice(0, 10);
}

export async function getNFLOddsForGame(gameId: number): Promise<{ spread?: string; overUnder?: string } | null> {
  const data = await makeApiRequest<{ response: NFLOdds[] }>("/odds", {
    game: gameId.toString(),
  });

  if (!data?.response?.length) {
    return null;
  }

  const odds = data.response[0];
  const bookmaker = odds.bookmakers?.[0];
  
  if (!bookmaker) return null;

  let spread: string | undefined;
  let overUnder: string | undefined;

  for (const bet of bookmaker.bets) {
    if (bet.name === "Handicap" || bet.name === "Spread") {
      const homeSpread = bet.values.find((v) => v.value.includes("Home"));
      if (homeSpread) {
        spread = homeSpread.value.replace("Home ", "");
      }
    }
    if (bet.name === "Over/Under" || bet.name === "Total") {
      const over = bet.values.find((v) => v.value.includes("Over"));
      if (over) {
        overUnder = over.value.replace("Over ", "");
      }
    }
  }

  return { spread, overUnder };
}

export async function searchNFLGames(query: string): Promise<UpcomingGame[]> {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes("today") || queryLower.includes("tonight")) {
    const today = new Date().toISOString().split("T")[0];
    return getNFLGamesForDate(today);
  }
  
  if (queryLower.includes("tomorrow")) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getNFLGamesForDate(tomorrow.toISOString().split("T")[0]);
  }
  
  if (queryLower.includes("sunday")) {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return getNFLGamesForDate(nextSunday.toISOString().split("T")[0]);
  }
  
  if (queryLower.includes("thursday")) {
    const today = new Date();
    const daysUntilThursday = (4 - today.getDay() + 7) % 7 || 7;
    const nextThursday = new Date(today);
    nextThursday.setDate(today.getDate() + daysUntilThursday);
    return getNFLGamesForDate(nextThursday.toISOString().split("T")[0]);
  }
  
  if (queryLower.includes("monday")) {
    const today = new Date();
    const daysUntilMonday = (1 - today.getDay() + 7) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return getNFLGamesForDate(nextMonday.toISOString().split("T")[0]);
  }

  return getNFLGamesForWeek();
}

export function isNFLApiConfigured(): boolean {
  return !!NFL_API_KEY;
}
