import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, MoreHorizontal, Plus, Sparkles, Upload, Download, Archive, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Game, Slate, WhyFactor, Evidence } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UpcomingGame = {
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
  sources?: string[];
};

type UpcomingGamesResult = {
  games: UpcomingGame[];
  searchQuery: string;
  sport: string;
  timestamp: string;
  sources: string[];
};

const ACTIVE_SLATE_STORAGE_KEY = "activeSlateId";

type OcrResult = {
  games: Array<{
    homeTeam: string;
    awayTeam: string;
    spread: number | null;
    spreadTeam: string | null;
    total: number | null;
    moneylineHome: number | null;
    moneylineAway: number | null;
    gameTime: string | null;
  }>;
  rawText: string;
};

function useActiveSlateId() {
  const [activeSlateId, setActiveSlateId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACTIVE_SLATE_STORAGE_KEY);
  });

  const update = (nextId: string | null) => {
    setActiveSlateId(nextId);
    if (typeof window !== "undefined") {
      if (nextId) {
        window.localStorage.setItem(ACTIVE_SLATE_STORAGE_KEY, nextId);
      } else {
        window.localStorage.removeItem(ACTIVE_SLATE_STORAGE_KEY);
      }
    }
  };

  return { activeSlateId, setActiveSlateId: update };
}

function statusBadge(status: string) {
  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    enriching: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    ready: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    exported: "bg-primary/10 text-primary",
    archived: "bg-muted text-muted-foreground opacity-60",
  };

  return (
    <Badge variant="secondary" className={`text-xs capitalize ${statusColors[status] || ""}`}>
      {status}
    </Badge>
  );
}

function CreateSlateDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest("POST", "/api/slates", data);
      return response.json();
    },
    onSuccess: (slate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/slates"] });
      toast({
        title: "Slate created",
        description: `\"${slate.name}\" has been created.`,
      });
      setOpen(false);
      setName("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create slate. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-slate">
          <Plus className="h-4 w-4 mr-2" />
          New Slate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Slate</DialogTitle>
            <DialogDescription>
              Create a new slate to analyze games.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Slate Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Week 12 Main Slate"
                data-testid="input-slate-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddGamesDialog({ slateId }: { slateId: string | null }) {
  const [open, setOpen] = useState(false);
  const [manualAwayTeam, setManualAwayTeam] = useState("");
  const [manualHomeTeam, setManualHomeTeam] = useState("");
  const [manualSpread, setManualSpread] = useState("");
  const [manualSpreadTeam, setManualSpreadTeam] = useState("");
  const [manualTotal, setManualTotal] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const { toast } = useToast();

  const addManualMutation = useMutation({
    mutationFn: async () => {
      if (!slateId) throw new Error("No active slate");
      const response = await apiRequest("POST", `/api/slates/${slateId}/games`, {
        awayTeam: manualAwayTeam,
        homeTeam: manualHomeTeam,
        spread: manualSpread ? parseFloat(manualSpread) : undefined,
        spreadTeam: manualSpreadTeam || undefined,
        total: manualTotal ? parseFloat(manualTotal) : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/slates", slateId, "games"] });
      toast({ title: "Game added" });
      setManualAwayTeam("");
      setManualHomeTeam("");
      setManualSpread("");
      setManualSpreadTeam("");
      setManualTotal("");
    },
    onError: () => {
      toast({ title: "Add failed", variant: "destructive" });
    },
  });

  const addOcrMutation = useMutation({
    mutationFn: async () => {
      if (!slateId) throw new Error("No active slate");

      const payload = await (async () => {
        if (ocrFile) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(ocrFile);
          });
          const response = await apiRequest("POST", "/api/ocr/image", { imageBase64: base64 });
          return response.json() as Promise<OcrResult>;
        }

        if (ocrText.trim()) {
          const response = await apiRequest("POST", "/api/ocr/text", { text: ocrText });
          return response.json() as Promise<OcrResult>;
        }

        throw new Error("Provide a screenshot or pasted text.");
      })();

      if (!payload.games.length) {
        throw new Error("No games detected.");
      }

      const response = await apiRequest("POST", `/api/slates/${slateId}/games/batch`, payload.games);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/slates", slateId, "games"] });
      toast({ title: "Games added" });
      setOcrText("");
      setOcrFile(null);
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: error.message || "OCR failed", variant: "destructive" });
    },
  });

  const hasActiveSlate = Boolean(slateId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!hasActiveSlate} data-testid="button-add-games">
          <Upload className="h-4 w-4 mr-2" />
          Add Games
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Games</DialogTitle>
          <DialogDescription>
            Add games manually or paste/upload a slate for OCR extraction.
          </DialogDescription>
        </DialogHeader>
        {!hasActiveSlate && (
          <Card className="p-4 text-sm text-muted-foreground">
            Select a slate first to add games.
          </Card>
        )}
        <Tabs defaultValue="manual">
          <TabsList>
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ocr">OCR</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="manual-away">Away Team</Label>
                <Input
                  id="manual-away"
                  value={manualAwayTeam}
                  onChange={(e) => setManualAwayTeam(e.target.value)}
                  placeholder="Away Team"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manual-home">Home Team</Label>
                <Input
                  id="manual-home"
                  value={manualHomeTeam}
                  onChange={(e) => setManualHomeTeam(e.target.value)}
                  placeholder="Home Team"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="manual-spread">Spread</Label>
                <Input
                  id="manual-spread"
                  value={manualSpread}
                  onChange={(e) => setManualSpread(e.target.value)}
                  placeholder="-3.5"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manual-spread-team">Spread Team</Label>
                <Input
                  id="manual-spread-team"
                  value={manualSpreadTeam}
                  onChange={(e) => setManualSpreadTeam(e.target.value)}
                  placeholder="Team"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manual-total">Total</Label>
                <Input
                  id="manual-total"
                  value={manualTotal}
                  onChange={(e) => setManualTotal(e.target.value)}
                  placeholder="45.5"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => addManualMutation.mutate()}
                disabled={!hasActiveSlate || !manualAwayTeam || !manualHomeTeam || addManualMutation.isPending}
              >
                Add Game
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="ocr" className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="ocr-text">Paste Text</Label>
              <Textarea
                id="ocr-text"
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                placeholder="Paste raw slate text here..."
                className="min-h-[120px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ocr-file">Upload Screenshot</Label>
              <Input
                id="ocr-file"
                type="file"
                accept="image/*"
                onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                OCR auto-detects whether you pasted text or uploaded an image.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => addOcrMutation.mutate()}
                disabled={!hasActiveSlate || addOcrMutation.isPending}
              >
                Extract & Add
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function GameWorkspacePanel({
  gameId,
  onOpenChange,
}: {
  gameId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const { data: game, isLoading } = useQuery<Game>({
    queryKey: ["/api/games", gameId],
    enabled: Boolean(gameId),
  });

  const { data: evidence = [] } = useQuery<Evidence[]>({
    queryKey: ["/api/games", gameId, "evidence"],
    enabled: Boolean(gameId),
  });

  const { data: whyFactors = [] } = useQuery<WhyFactor[]>({
    queryKey: ["/api/games", gameId, "why-factors"],
    enabled: Boolean(gameId),
  });

  const enrichMutation = useMutation({
    mutationFn: async () => {
      if (!gameId) throw new Error("Missing game");
      const response = await apiRequest("POST", `/api/games/${gameId}/enrich`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId, "why-factors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId, "evidence"] });
      toast({ title: "Enrichment complete" });
    },
    onError: () => {
      toast({ title: "Enrichment failed", variant: "destructive" });
    },
  });

  const notesMutation = useMutation({
    mutationFn: async (payload: { notes: string; overrideReason: string | null; flaggedForReview: boolean }) => {
      if (!gameId) throw new Error("Missing game");
      const response = await apiRequest("PATCH", `/api/games/${gameId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId] });
      toast({ title: "Notes updated" });
    },
  });

  const handleSaveNotes = (value: string) => {
    const normalized = value.trim();
    const flaggedForReview = /#review\b/i.test(normalized);
    const overrideReason = /#override\b/i.test(normalized) ? normalized : null;
    notesMutation.mutate({
      notes: normalized,
      overrideReason,
      flaggedForReview,
    });
  };

  const [notesValue, setNotesValue] = useState("");

  useEffect(() => {
    if (game?.notes !== undefined) {
      setNotesValue(game.notes || "");
    }
  }, [game?.notes]);

  const confidenceRange = useMemo(() => {
    if (!game?.confidenceLow || !game?.confidenceHigh) return null;
    return `${Math.round(game.confidenceLow)}-${Math.round(game.confidenceHigh)}%`;
  }, [game]);

  return (
    <Sheet open={Boolean(gameId)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Game Workspace</SheetTitle>
        </SheetHeader>
        {isLoading || !game ? (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            <div>
              <h3 className="text-lg font-semibold">
                {game.awayTeam} @ {game.homeTeam}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="capitalize">{game.status}</span>
                {game.spread !== null && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {game.spreadTeam} {game.spread > 0 ? "+" : ""}{game.spread}
                  </Badge>
                )}
                {game.total !== null && (
                  <Badge variant="outline" className="font-mono text-xs">
                    O/U {game.total}
                  </Badge>
                )}
              </div>
            </div>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recommendation</p>
                  <p className="text-xl font-semibold font-mono">{game.pick || "No pick yet"}</p>
                </div>
                <Button
                  onClick={() => enrichMutation.mutate()}
                  disabled={enrichMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {enrichMutation.isPending ? "Enriching..." : "Enrich Game"}
                </Button>
              </div>
              {game.pickLine !== null && (
                <p className="text-sm text-muted-foreground">Line: {game.pickLine > 0 ? "+" : ""}{game.pickLine}</p>
              )}
              {game.pickEdge && (
                <p className="text-sm text-emerald-600">Edge: +{game.pickEdge}</p>
              )}
              {confidenceRange && (
                <p className="text-sm text-muted-foreground">Confidence: {confidenceRange}</p>
              )}
            </Card>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes & Overrides</Label>
              <Textarea
                id="notes"
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add notes. Tag #review or #override to flag."
                className="min-h-[120px]"
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleSaveNotes(notesValue)}
                  disabled={notesMutation.isPending}
                >
                  Save Notes
                </Button>
              </div>
            </div>

            <Tabs defaultValue="why">
              <TabsList>
                <TabsTrigger value="why">Why Factors</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
              </TabsList>
              <TabsContent value="why" className="space-y-3">
                {whyFactors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No factors yet.</p>
                ) : (
                  whyFactors.map((factor) => (
                    <Card key={factor.id} className="p-3">
                      <p className="font-medium text-sm">{factor.category}</p>
                      <p className="text-xs text-muted-foreground">{factor.description}</p>
                    </Card>
                  ))
                )}
              </TabsContent>
              <TabsContent value="evidence" className="space-y-3">
                {evidence.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No evidence yet.</p>
                ) : (
                  evidence.map((item) => (
                    <Card key={item.id} className="p-3">
                      <p className="text-sm font-medium">{item.headline || item.category}</p>
                      <p className="text-xs text-muted-foreground">{item.source}</p>
                      {item.snippet && <p className="text-xs mt-2">{item.snippet}</p>}
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function SlateDashboardPage() {
  const { toast } = useToast();
  const { activeSlateId, setActiveSlateId } = useActiveSlateId();
  const [expandedSlateId, setExpandedSlateId] = useState<string | null>(activeSlateId);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [upcomingOpen, setUpcomingOpen] = useState(true);

  const { data: slates = [], isLoading: slatesLoading } = useQuery<Slate[]>({
    queryKey: ["/api/slates"],
  });

  const { data: upcomingGames, isLoading: upcomingLoading } = useQuery<UpcomingGamesResult>({
    queryKey: ["/api/upcoming-games", "nfl", "default"],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/upcoming-games/search", { sport: "nfl" });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeSlates = slates.filter((slate) => slate.status !== "archived");

  useEffect(() => {
    if (activeSlates.length === 0) {
      setExpandedSlateId(null);
      setActiveSlateId(null);
      return;
    }

    const stillValid = activeSlateId && activeSlates.some((slate) => slate.id === activeSlateId);
    if (!stillValid) {
      setExpandedSlateId(activeSlates[0].id);
      setActiveSlateId(activeSlates[0].id);
    }
  }, [activeSlates, activeSlateId, setActiveSlateId]);

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/slates", expandedSlateId, "games"],
    enabled: Boolean(expandedSlateId),
  });

  const enrichSlateMutation = useMutation({
    mutationFn: async (slateId: string) => {
      const response = await apiRequest("POST", `/api/slates/${slateId}/enrich`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/slates", expandedSlateId, "games"] });
      toast({ title: "Slate enriched" });
    },
    onError: () => {
      toast({ title: "Slate enrichment failed", variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (slateId: string) => {
      const response = await apiRequest("PATCH", `/api/slates/${slateId}`, { status: "archived" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slates"] });
      toast({ title: "Slate archived" });
    },
  });

  const exportSlate = async (slateId: string) => {
    try {
      const response = await apiRequest("GET", `/api/slates/${slateId}/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `slate-${slateId}-picks.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleRowToggle = (slateId: string) => {
    const nextId = expandedSlateId === slateId ? null : slateId;
    setExpandedSlateId(nextId);
    setActiveSlateId(nextId);
  };

  const formatGameTime = (value?: string | null) => {
    if (!value) return "Time TBD";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Slate Dashboard</h1>
          <p className="text-muted-foreground">Manage slates, enrich games, and keep context in one view.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateSlateDialog />
          <AddGamesDialog slateId={expandedSlateId} />
        </div>
      </div>

      {activeSlates.length > 0 ? (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-sm text-muted-foreground">Active slate</div>
            <Select
              value={expandedSlateId || ""}
              onValueChange={(value) => handleRowToggle(value)}
            >
              <SelectTrigger className="sm:w-[320px]">
                <SelectValue placeholder="Select a slate" />
              </SelectTrigger>
              <SelectContent>
                {activeSlates.map((slate) => (
                  <SelectItem key={slate.id} value={slate.id}>
                    {slate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <h2 className="text-lg font-semibold">Get Started</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Create a framework, add a slate, and upload games to start analyzing picks.
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <CreateSlateDialog />
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Games</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {slatesLoading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-12 w-full" />
                </TableCell>
              </TableRow>
            )}
            {activeSlates.map((slate) => (
              <TableRow key={slate.id} className="cursor-pointer" onClick={() => handleRowToggle(slate.id)}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${expandedSlateId === slate.id ? "rotate-180" : ""}`}
                    />
                    <span>{slate.name}</span>
                  </div>
                </TableCell>
                <TableCell>{statusBadge(slate.status)}</TableCell>
                <TableCell>{slate.gameCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(slate.updatedAt), "MMM d, yyyy")}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => enrichSlateMutation.mutate(slate.id)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Enrich All
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportSlate(slate.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveMutation.mutate(slate.id)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <Collapsible open={upcomingOpen} onOpenChange={setUpcomingOpen}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Upcoming NFL Games</h2>
              <p className="text-sm text-muted-foreground">Auto-fetched from the upcoming games feed.</p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${upcomingOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            {upcomingLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-2">
                {(upcomingGames?.games || []).map((game) => (
                  <div key={game.id} className="flex items-start justify-between gap-4 border rounded-md p-3">
                    <div>
                      <div className="font-medium">
                        {game.awayTeam} @ {game.homeTeam}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatGameTime(game.gameTime)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                        {game.spread && (
                          <span className="text-lg font-mono text-foreground px-2 py-1 border-2 border-primary bg-primary/15">
                            Spread: {game.spread}
                          </span>
                        )}
                        {game.overUnder && (
                          <span className="text-lg font-mono text-foreground px-2 py-1 border-2 border-primary bg-primary/15">
                            O/U: {game.overUnder}
                          </span>
                        )}
                        {game.tvNetwork && <span>{game.tvNetwork}</span>}
                      </div>
                    </div>
                    {game.sources?.[0] && (
                      <a
                        href={game.sources[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-xs flex items-center gap-1"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
                {(upcomingGames?.games || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No upcoming NFL games found.</p>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {expandedSlateId && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Games</h2>
              <p className="text-sm text-muted-foreground">Click a game to open the workspace.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => enrichSlateMutation.mutate(expandedSlateId)}
              disabled={enrichSlateMutation.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {enrichSlateMutation.isPending ? "Enriching..." : "Enrich Slate"}
            </Button>
          </div>

          {gamesLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="space-y-2">
              {games.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  className="w-full text-left border rounded-md p-3 hover:bg-muted/40"
                  onClick={() => setSelectedGameId(game.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {game.awayTeam} @ {game.homeTeam}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">{game.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {game.pick && (
                        <Badge variant="secondary" className="font-mono">
                          {game.pick}
                        </Badge>
                      )}
                      {game.isLocked && (
                        <Badge variant="outline" className="text-xs">Locked</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {games.length === 0 && (
                <p className="text-sm text-muted-foreground">No games yet. Use Add Games to start.</p>
              )}
            </div>
          )}
        </Card>
      )}

      <GameWorkspacePanel
        gameId={selectedGameId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedGameId(null);
          }
        }}
      />
    </div>
  );
}
