import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Calendar,
  ExternalLink,
  FileText
} from "lucide-react";
import type { Slate } from "@shared/schema";

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
  sources?: string[];
}

interface SearchResult {
  games: UpcomingGame[];
  searchQuery: string;
  timestamp: string;
  sources: string[];
}

export default function UpcomingGamesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("NCAAF games this week");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [selectedGame, setSelectedGame] = useState<UpcomingGame | null>(null);
  const [addToSlateOpen, setAddToSlateOpen] = useState(false);
  const [selectedSlateId, setSelectedSlateId] = useState<string>("");
  const [researchResults, setResearchResults] = useState<{[key: string]: { content: string; sources: string[] }}>({});

  const { data: slates = [] } = useQuery<Slate[]>({
    queryKey: ["/api/slates"],
  });

  const activeSlates = slates.filter(s => s.status !== "archived");

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/upcoming-games/search", { query });
      return response.json();
    },
    onSuccess: (data: SearchResult) => {
      setSearchResults(data);
      toast({ title: `Found ${data.games.length} upcoming games` });
    },
    onError: () => {
      toast({ title: "Search failed", description: "Could not fetch upcoming games", variant: "destructive" });
    },
  });

  const researchMutation = useMutation({
    mutationFn: async (game: UpcomingGame) => {
      const response = await apiRequest("POST", "/api/upcoming-games/research", {
        awayTeam: game.awayTeam,
        homeTeam: game.homeTeam,
        gameTime: game.gameTime,
      });
      return response.json();
    },
    onSuccess: (data, game) => {
      setResearchResults(prev => ({
        ...prev,
        [game.id]: data,
      }));
      toast({ title: "Research complete" });
    },
  });

  const addGameMutation = useMutation({
    mutationFn: async ({ slateId, game }: { slateId: string; game: UpcomingGame }) => {
      const response = await apiRequest("POST", `/api/slates/${slateId}/games`, {
        awayTeam: game.awayTeam,
        homeTeam: game.homeTeam,
        gameTime: game.gameTime,
        spread: game.spread ? parseFloat(game.spread.replace(/[^0-9.-]/g, '')) : null,
        overUnder: game.overUnder ? parseFloat(game.overUnder.replace(/[^0-9.]/g, '')) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slates"] });
      setAddToSlateOpen(false);
      setSelectedGame(null);
      toast({ title: "Game added to slate" });
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery);
    }
  };

  const handleAddToSlate = (game: UpcomingGame) => {
    setSelectedGame(game);
    setAddToSlateOpen(true);
  };

  const confirmAddToSlate = () => {
    if (selectedSlateId && selectedGame) {
      addGameMutation.mutate({ slateId: selectedSlateId, game: selectedGame });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Upcoming Games</h1>
          <p className="text-muted-foreground">Search for NCAAF games and research matchups</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search for Games
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., NCAAF games this week, SEC football Saturday"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              data-testid="input-search-games"
            />
            <Button 
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              data-testid="button-search"
            >
              {searchMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={searchMutation.isPending}
              onClick={() => { setSearchQuery("NCAAF games this week"); searchMutation.mutate("NCAAF games this week"); }}
            >
              This Week
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={searchMutation.isPending}
              onClick={() => { setSearchQuery("SEC football games this Saturday"); searchMutation.mutate("SEC football games this Saturday"); }}
            >
              SEC Games
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={searchMutation.isPending}
              onClick={() => { setSearchQuery("Big Ten football games this Saturday"); searchMutation.mutate("Big Ten football games this Saturday"); }}
            >
              Big Ten Games
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={searchMutation.isPending}
              onClick={() => { setSearchQuery("College football playoff games"); searchMutation.mutate("College football playoff games"); }}
            >
              Playoff Games
            </Button>
          </div>
        </CardContent>
      </Card>

      {searchMutation.isPending && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchResults && !searchMutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Results for "{searchResults.searchQuery}"
            </h2>
            <Badge variant="secondary">
              {searchResults.games.length} games
            </Badge>
          </div>

          {searchResults.sources && searchResults.sources.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Sources: {searchResults.sources.slice(0, 3).map((s, i) => (
                <a 
                  key={i} 
                  href={s} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline mx-1"
                >
                  [{i + 1}] <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}

          {searchResults.games.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No games found. Try a different search query.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {searchResults.games.map((game) => (
                <Card key={game.id} className="overflow-visible">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {game.awayTeam} @ {game.homeTeam}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {game.gameTime}
                          </span>
                          {game.tvNetwork && (
                            <Badge variant="outline">{game.tvNetwork}</Badge>
                          )}
                          {game.conference && (
                            <Badge variant="secondary">{game.conference}</Badge>
                          )}
                        </div>
                        {(game.spread || game.overUnder) && (
                          <div className="flex gap-3 mt-2 font-mono text-sm">
                            {game.spread && (
                              <span>Spread: <strong>{game.spread}</strong></span>
                            )}
                            {game.overUnder && (
                              <span>O/U: <strong>{game.overUnder}</strong></span>
                            )}
                          </div>
                        )}
                        {game.venue && (
                          <p className="text-sm text-muted-foreground mt-1">{game.venue}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => researchMutation.mutate(game)}
                          disabled={researchMutation.isPending}
                          data-testid={`button-research-${game.id}`}
                        >
                          {researchMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4 mr-1" />
                          )}
                          Research
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAddToSlate(game)}
                          data-testid={`button-add-${game.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add to Slate
                        </Button>
                      </div>
                    </div>

                    {researchResults[game.id] && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-2">Research Summary</h4>
                        <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                          {researchResults[game.id].content}
                        </div>
                        {researchResults[game.id].sources?.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Sources: {researchResults[game.id].sources.slice(0, 3).map((s, i) => (
                              <a 
                                key={i} 
                                href={s} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline mx-1"
                              >
                                [{i + 1}]
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={addToSlateOpen} onOpenChange={setAddToSlateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Game to Slate</DialogTitle>
            <DialogDescription>
              {selectedGame && `Add ${selectedGame.awayTeam} @ ${selectedGame.homeTeam} to a slate`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedSlateId} onValueChange={setSelectedSlateId}>
              <SelectTrigger data-testid="select-slate">
                <SelectValue placeholder="Select a slate" />
              </SelectTrigger>
              <SelectContent>
                {activeSlates.map((slate) => (
                  <SelectItem key={slate.id} value={slate.id}>
                    {slate.name} ({slate.gameCount || 0} games)
                  </SelectItem>
                ))}
                {activeSlates.length === 0 && (
                  <SelectItem value="none" disabled>
                    No active slates
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToSlateOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmAddToSlate}
              disabled={!selectedSlateId || addGameMutation.isPending}
            >
              {addGameMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
