import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, Upload, Play, Download, Plus, Trash2, 
  Lock, Unlock, AlertCircle, CheckCircle, RefreshCw, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Slate, Game } from "@shared/schema";

function GameRow({ game, slateId }: { game: Game; slateId: string }) {
  const statusIcons: Record<string, React.ReactNode> = {
    pending: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
    enriching: <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />,
    ready: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    locked: <Lock className="h-4 w-4 text-primary" />,
    override: <Edit2 className="h-4 w-4 text-amber-500" />,
  };

  const { toast } = useToast();

  const lockMutation = useMutation({
    mutationFn: async () => {
      const endpoint = game.isLocked 
        ? `/api/games/${game.id}/unlock` 
        : `/api/games/${game.id}/lock`;
      const response = await apiRequest("POST", endpoint);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slates", slateId, "games"] });
      toast({
        title: game.isLocked ? "Game unlocked" : "Game locked",
        description: game.isLocked 
          ? "This pick can now be modified." 
          : "This pick is now locked for export.",
      });
    },
  });

  return (
    <TableRow data-testid={`row-game-${game.id}`}>
      <TableCell className="font-medium">
        <Link 
          href={`/slates/${slateId}/games/${game.id}`}
          className="hover:underline"
          data-testid={`link-game-${game.id}`}
        >
          <div className="flex flex-col gap-1">
            <span>{game.awayTeam}</span>
            <span className="text-muted-foreground">@ {game.homeTeam}</span>
          </div>
        </Link>
      </TableCell>
      <TableCell className="font-mono text-sm">
        {game.spread !== null ? (
          <span>
            {game.spreadTeam} {game.spread > 0 ? "+" : ""}{game.spread}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="font-mono text-sm">
        {game.total !== null ? (
          <span>O/U {game.total}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {statusIcons[game.status] || statusIcons.pending}
          <span className="capitalize text-sm">{game.status}</span>
        </div>
      </TableCell>
      <TableCell>
        {game.pick ? (
          <div className="flex flex-col gap-1">
            <Badge variant="secondary" className="w-fit font-mono">
              {game.pick} {game.pickLine && `${game.pickLine > 0 ? "+" : ""}${game.pickLine}`}
            </Badge>
            {game.pickEdge && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                Edge: +{game.pickEdge}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">No pick</span>
        )}
      </TableCell>
      <TableCell>
        {game.confidenceLow && game.confidenceHigh ? (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full"
                style={{ width: `${((game.confidenceLow + game.confidenceHigh) / 2) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono">
              {Math.round(game.confidenceLow * 100)}-{Math.round(game.confidenceHigh * 100)}%
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => lockMutation.mutate()}
          disabled={lockMutation.isPending}
          data-testid={`button-lock-${game.id}`}
        >
          {game.isLocked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function AddGameDialog({ slateId }: { slateId: string }) {
  const [open, setOpen] = useState(false);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [spread, setSpread] = useState("");
  const [spreadTeam, setSpreadTeam] = useState("");
  const [total, setTotal] = useState("");
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: async (data: { homeTeam: string; awayTeam: string; spread?: number; spreadTeam?: string; total?: number }) => {
      const response = await apiRequest("POST", `/api/slates/${slateId}/games`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slates", slateId, "games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/slates"] });
      toast({
        title: "Game added",
        description: "The game has been added to the slate.",
      });
      setOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setHomeTeam("");
    setAwayTeam("");
    setSpread("");
    setSpreadTeam("");
    setTotal("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      homeTeam,
      awayTeam,
      spread: spread ? parseFloat(spread) : undefined,
      spreadTeam: spreadTeam || undefined,
      total: total ? parseFloat(total) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-add-game">
          <Plus className="h-4 w-4 mr-2" />
          Add Game
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Game</DialogTitle>
            <DialogDescription>
              Manually add a game to this slate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="awayTeam">Away Team</Label>
                <Input
                  id="awayTeam"
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  placeholder="Alabama"
                  data-testid="input-away-team"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="homeTeam">Home Team</Label>
                <Input
                  id="homeTeam"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  placeholder="Georgia"
                  data-testid="input-home-team"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="spread">Spread</Label>
                <Input
                  id="spread"
                  type="number"
                  step="0.5"
                  value={spread}
                  onChange={(e) => setSpread(e.target.value)}
                  placeholder="-3.5"
                  data-testid="input-spread"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="spreadTeam">Spread Team</Label>
                <Select value={spreadTeam} onValueChange={setSpreadTeam}>
                  <SelectTrigger data-testid="select-spread-team">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {awayTeam && <SelectItem value={awayTeam}>{awayTeam}</SelectItem>}
                    {homeTeam && <SelectItem value={homeTeam}>{homeTeam}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="total">Total</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.5"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="52.5"
                  data-testid="input-total"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!homeTeam || !awayTeam || addMutation.isPending}
              data-testid="button-confirm-add-game"
            >
              Add Game
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UploadScreenshotDialog({ slateId }: { slateId: string }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const ocrResponse = await apiRequest("POST", "/api/ocr/image", { imageBase64: base64 });
      const ocrResult = await ocrResponse.json();

      if (ocrResult.games && ocrResult.games.length > 0) {
        const gamesResponse = await apiRequest("POST", `/api/slates/${slateId}/games/batch`, ocrResult.games);
        await gamesResponse.json();

        queryClient.invalidateQueries({ queryKey: ["/api/slates", slateId, "games"] });
        queryClient.invalidateQueries({ queryKey: ["/api/slates"] });

        toast({
          title: "Games imported",
          description: `Successfully imported ${ocrResult.games.length} games from screenshot.`,
        });
        setOpen(false);
      } else {
        toast({
          title: "No games found",
          description: "Could not extract any games from the screenshot.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to process the screenshot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-upload-screenshot">
          <Upload className="h-4 w-4 mr-2" />
          Upload Screenshot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Screenshot</DialogTitle>
          <DialogDescription>
            Upload a screenshot of your betting slate. We'll use AI to extract the games automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div 
            className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-file-upload"
            />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Processing screenshot...</span>
              </div>
            ) : (
              <>
                <p className="font-medium mb-1">Click to upload</p>
                <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SlateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: slate, isLoading: slateLoading } = useQuery<Slate>({
    queryKey: ["/api/slates", id],
    enabled: !!id,
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/slates", id, "games"],
    enabled: !!id,
  });

  const enrichMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/slates/${id}/enrich`);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/slates", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/slates", id, "games"] });
      toast({
        title: "Enrichment complete",
        description: `Research completed for ${result.results?.length || 0} games.`,
      });
    },
    onError: () => {
      toast({
        title: "Enrichment failed",
        description: "Failed to research games. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    window.open(`/api/slates/${id}/export`, "_blank");
  };

  const isLoading = slateLoading || gamesLoading;
  const lockedCount = games.filter(g => g.isLocked).length;

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-24 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!slate) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Slate not found.</p>
        <Link href="/">
          <Button variant="ghost">Go back to slates</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold" data-testid="text-slate-title">{slate.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{games.length} games</span>
            <span>•</span>
            <span>{lockedCount} locked</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UploadScreenshotDialog slateId={id!} />
          <AddGameDialog slateId={id!} />
          <Button 
            variant="outline"
            onClick={() => enrichMutation.mutate()}
            disabled={enrichMutation.isPending || games.length === 0}
            data-testid="button-enrich"
          >
            {enrichMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Enriching...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Research
              </>
            )}
          </Button>
          <Button 
            onClick={handleExport}
            disabled={lockedCount === 0}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Export ({lockedCount})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Games</CardTitle>
        </CardHeader>
        <CardContent>
          {games.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matchup</TableHead>
                  <TableHead>Spread</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pick</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((game) => (
                  <GameRow key={game.id} game={game} slateId={id!} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No games in this slate yet. Add games manually or upload a screenshot.
              </p>
              <div className="flex items-center justify-center gap-2">
                <UploadScreenshotDialog slateId={id!} />
                <AddGameDialog slateId={id!} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
