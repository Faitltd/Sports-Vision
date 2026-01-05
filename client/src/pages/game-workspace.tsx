import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, Lock, Unlock, Flag, MessageSquare, 
  ExternalLink, AlertTriangle, CheckCircle, Clock,
  ChevronDown, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Game, Evidence, WhyFactor, DataSnapshot } from "@shared/schema";
import { useState } from "react";
import { format } from "date-fns";

function RecommendationPanel({ game, slateId }: { game: Game; slateId: string }) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overridePick, setOverridePick] = useState("");
  const [overrideLine, setOverrideLine] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [notes, setNotes] = useState(game.notes || "");
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
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
      toast({
        title: game.isLocked ? "Game unlocked" : "Game locked",
      });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/games/${game.id}/override`, {
        pick: overridePick,
        pickLine: parseFloat(overrideLine) || null,
        overrideReason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
      setOverrideOpen(false);
      toast({ title: "Pick overridden" });
    },
  });

  const notesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/games/${game.id}`, { notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
      toast({ title: "Notes saved" });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/games/${game.id}`, { 
        flaggedForReview: !game.flaggedForReview 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
    },
  });

  const confidenceAvg = game.confidenceLow && game.confidenceHigh 
    ? (game.confidenceLow + game.confidenceHigh) / 2 
    : 0;

  const researchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/games/${game.id}/research`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id, "evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id, "why-factors"] });
      toast({ title: "Research complete", description: "Analysis has been updated with new findings." });
    },
    onError: () => {
      toast({ title: "Research failed", variant: "destructive" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/games/${game.id}/analyze`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id, "why-factors"] });
      toast({ title: "Analysis complete" });
    },
    onError: () => {
      toast({ title: "Analysis failed", variant: "destructive" });
    },
  });

  return (
    <div className="flex flex-col gap-4 p-4 border-r bg-muted/30 w-80 shrink-0 overflow-y-auto">
      <div className="flex items-center gap-2">
        <Link href={`/slates/${slateId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back-to-slate">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate" data-testid="text-away-team">{game.awayTeam}</h2>
          <p className="text-sm text-muted-foreground truncate" data-testid="text-home-team">@ {game.homeTeam}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Recommendation</CardTitle>
            <Badge 
              variant={game.status === "ready" ? "default" : "secondary"}
              className="capitalize"
            >
              {game.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {game.pick ? (
            <div className="flex flex-col gap-3">
              <div className="text-center py-3 bg-muted rounded-md">
                <p className="text-2xl font-bold font-mono" data-testid="text-pick">
                  {game.pick}
                </p>
                {game.pickLine && (
                  <p className="text-lg font-mono text-muted-foreground">
                    {game.pickLine > 0 ? "+" : ""}{game.pickLine}
                  </p>
                )}
              </div>
              
              {game.pickEdge && (
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Edge:</span>
                  <span className="ml-2 font-mono text-emerald-600 dark:text-emerald-400" data-testid="text-edge">
                    +{game.pickEdge}
                  </span>
                </div>
              )}

              {game.confidenceLow && game.confidenceHigh && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-mono" data-testid="text-confidence">
                      {Math.round(game.confidenceLow)}-{Math.round(game.confidenceHigh)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${confidenceAvg}%` }}
                    />
                  </div>
                </div>
              )}

              {game.frameworkVersion && (
                <p className="text-xs text-muted-foreground text-center">
                  Framework v{game.frameworkVersion}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>No recommendation yet</p>
              <p className="text-xs mt-1 mb-3">Run research to generate picks</p>
              <Button 
                onClick={() => researchMutation.mutate()}
                disabled={researchMutation.isPending}
                className="w-full"
                data-testid="button-run-research"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${researchMutation.isPending ? "animate-spin" : ""}`} />
                {researchMutation.isPending ? "Researching..." : "Run Research"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <Button 
          variant={game.isLocked ? "default" : "outline"}
          onClick={() => lockMutation.mutate()}
          disabled={lockMutation.isPending}
          className="w-full"
          data-testid="button-lock-toggle"
        >
          {game.isLocked ? (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Locked
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4 mr-2" />
              Lock Pick
            </>
          )}
        </Button>

        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => researchMutation.mutate()}
            disabled={researchMutation.isPending || analyzeMutation.isPending}
            className="flex-1"
            data-testid="button-refresh-research"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${researchMutation.isPending ? "animate-spin" : ""}`} />
            {researchMutation.isPending ? "..." : "Research"}
          </Button>
          <Button 
            variant="outline"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending || researchMutation.isPending}
            className="flex-1"
            data-testid="button-reanalyze"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${analyzeMutation.isPending ? "animate-spin" : ""}`} />
            {analyzeMutation.isPending ? "..." : "Re-Analyze"}
          </Button>
        </div>

        <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" data-testid="button-override">
              Override
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override Recommendation</DialogTitle>
              <DialogDescription>
                Manually set a pick that overrides the framework recommendation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="pick">Pick</Label>
                <Input
                  id="pick"
                  value={overridePick}
                  onChange={(e) => setOverridePick(e.target.value)}
                  placeholder="Alabama -3.5"
                  data-testid="input-override-pick"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="line">Line</Label>
                <Input
                  id="line"
                  type="number"
                  step="0.5"
                  value={overrideLine}
                  onChange={(e) => setOverrideLine(e.target.value)}
                  placeholder="-3.5"
                  data-testid="input-override-line"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why you're overriding..."
                  data-testid="textarea-override-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => overrideMutation.mutate()}
                disabled={!overridePick || overrideMutation.isPending}
                data-testid="button-confirm-override"
              >
                Override
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button 
          variant={game.flaggedForReview ? "destructive" : "ghost"}
          onClick={() => flagMutation.mutate()}
          disabled={flagMutation.isPending}
          className="w-full"
          data-testid="button-flag"
        >
          <Flag className="h-4 w-4 mr-2" />
          {game.flaggedForReview ? "Flagged" : "Flag for Review"}
        </Button>
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes..."
          className="min-h-[80px]"
          data-testid="textarea-notes"
        />
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => notesMutation.mutate()}
          disabled={notesMutation.isPending || notes === game.notes}
          data-testid="button-save-notes"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Save Notes
        </Button>
      </div>

      {game.overrideReason && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
              Override Reason
            </p>
            <p className="text-sm">{game.overrideReason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MobileGameHeader({ game, slateId }: { game: Game; slateId: string }) {
  const { toast } = useToast();
  const [showActions, setShowActions] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overridePick, setOverridePick] = useState("");
  const [overrideLine, setOverrideLine] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [notes, setNotes] = useState(game.notes || "");

  const lockMutation = useMutation({
    mutationFn: async () => {
      const endpoint = game.isLocked 
        ? `/api/games/${game.id}/unlock` 
        : `/api/games/${game.id}/lock`;
      const response = await apiRequest("POST", endpoint);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
      toast({ title: game.isLocked ? "Game unlocked" : "Game locked" });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/games/${game.id}`, { 
        flaggedForReview: !game.flaggedForReview 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
    },
  });

  const researchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/games/${game.id}/research`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id, "evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id, "why-factors"] });
      toast({ title: "Research complete" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/games/${game.id}/analyze`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id, "why-factors"] });
      toast({ title: "Analysis complete" });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/games/${game.id}/override`, {
        pick: overridePick,
        pickLine: parseFloat(overrideLine) || null,
        overrideReason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
      setOverrideOpen(false);
      toast({ title: "Pick overridden" });
    },
  });

  const notesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/games/${game.id}`, { notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", game.id] });
      toast({ title: "Notes saved" });
    },
  });

  return (
    <div className="lg:hidden border-b bg-muted/30">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Link href={`/slates/${slateId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back-mobile">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{game.awayTeam} @ {game.homeTeam}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={game.status === "ready" ? "default" : "secondary"} className="capitalize text-xs">
                {game.status}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            data-testid="button-toggle-actions"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showActions ? "rotate-180" : ""}`} />
          </Button>
        </div>
        
        {game.pick && (
          <div className="flex items-center gap-3 bg-background rounded-md p-3">
            <div className="text-center min-w-fit">
              <p className="text-lg font-bold font-mono">{game.pick}</p>
              {game.pickLine && (
                <p className="text-sm font-mono text-muted-foreground">
                  {game.pickLine > 0 ? "+" : ""}{game.pickLine}
                </p>
              )}
            </div>
            {game.confidenceLow && game.confidenceHigh && (
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-mono">
                    {Math.round(game.confidenceLow)}-{Math.round(game.confidenceHigh)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(game.confidenceLow + game.confidenceHigh) / 2}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant={game.isLocked ? "default" : "outline"}
            size="sm"
            onClick={() => lockMutation.mutate()}
            disabled={lockMutation.isPending}
            data-testid="button-lock-mobile"
          >
            {game.isLocked ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
            {game.isLocked ? "Locked" : "Lock"}
          </Button>
          <Button
            variant={game.flaggedForReview ? "destructive" : "ghost"}
            size="sm"
            onClick={() => flagMutation.mutate()}
            disabled={flagMutation.isPending}
            data-testid="button-flag-mobile"
          >
            <Flag className="h-4 w-4 mr-1" />
            {game.flaggedForReview ? "Flagged" : "Flag"}
          </Button>
        </div>
        
        {game.overrideReason && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Override Reason</p>
            <p className="text-sm">{game.overrideReason}</p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="border-t p-4 space-y-3 bg-background">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => researchMutation.mutate()}
              disabled={researchMutation.isPending || analyzeMutation.isPending}
              data-testid="button-research-mobile"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${researchMutation.isPending ? "animate-spin" : ""}`} />
              Research
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending || researchMutation.isPending}
              data-testid="button-analyze-mobile"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${analyzeMutation.isPending ? "animate-spin" : ""}`} />
              Re-Analyze
            </Button>
            <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-override-mobile">
                  Override
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Override Recommendation</DialogTitle>
                  <DialogDescription>
                    Manually set a pick that overrides the framework recommendation.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pick-mobile">Pick</Label>
                    <Input
                      id="pick-mobile"
                      value={overridePick}
                      onChange={(e) => setOverridePick(e.target.value)}
                      placeholder="Alabama -3.5"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="line-mobile">Line</Label>
                    <Input
                      id="line-mobile"
                      type="number"
                      step="0.5"
                      value={overrideLine}
                      onChange={(e) => setOverrideLine(e.target.value)}
                      placeholder="-3.5"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reason-mobile">Reason</Label>
                    <Textarea
                      id="reason-mobile"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Explain why you're overriding..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => overrideMutation.mutate()}
                    disabled={!overridePick || overrideMutation.isPending}
                  >
                    Override
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes-mobile">Notes</Label>
            <Textarea
              id="notes-mobile"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              className="min-h-[60px]"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => notesMutation.mutate()}
              disabled={notesMutation.isPending || notes === game.notes}
              data-testid="button-save-notes-mobile"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Save Notes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidencePanel({ gameId }: { gameId: string }) {
  const { data: evidence = [], isLoading } = useQuery<Evidence[]>({
    queryKey: ["/api/games", gameId, "evidence"],
  });

  const categoryIcons: Record<string, React.ReactNode> = {
    qb: <span className="text-xs">QB</span>,
    injury: <AlertTriangle className="h-3 w-3" />,
    portal: <span className="text-xs">P</span>,
    coaching: <span className="text-xs">C</span>,
    motivation: <span className="text-xs">M</span>,
    performance: <span className="text-xs">R</span>,
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (evidence.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No evidence gathered yet</p>
        <p className="text-sm mt-1">Run research to gather information</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {evidence.map((ev) => (
        <Card key={ev.id} data-testid={`card-evidence-${ev.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-6 w-6 rounded bg-muted shrink-0">
                {categoryIcons[ev.category] || <span className="text-xs">{ev.category[0].toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {ev.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{ev.source}</span>
                  {ev.relevanceScore && (
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        ev.relevanceScore >= 0.8 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                          : ""
                      }`}
                    >
                      {Math.round(ev.relevanceScore * 100)}%
                    </Badge>
                  )}
                </div>
                {ev.headline && (
                  <p className="font-medium text-sm mb-1">{ev.headline}</p>
                )}
                <p className="text-sm text-muted-foreground">{ev.snippet}</p>
                {ev.sourceUrl && (
                  <a 
                    href={ev.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Source
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WhyPanel({ gameId }: { gameId: string }) {
  const { data: factors = [], isLoading } = useQuery<WhyFactor[]>({
    queryKey: ["/api/games", gameId, "why-factors"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (factors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No analysis available yet</p>
        <p className="text-sm mt-1">Run the framework to generate analysis</p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {factors.map((factor) => (
        <AccordionItem key={factor.id} value={factor.id}>
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="capitalize">
                {factor.category}
              </Badge>
              {factor.contribution !== null && factor.contribution !== undefined && (
                <span className={`text-sm font-mono ${
                  factor.contribution > 0 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : factor.contribution < 0 
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }`}>
                  {factor.contribution > 0 ? "+" : ""}{factor.contribution.toFixed(1)}
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pl-2">
              {factor.featureValue !== null && factor.featureValue !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Value:</span>
                  <span className="font-mono">{factor.featureValue.toFixed(2)}</span>
                </div>
              )}
              {factor.description && (
                <p className="text-sm">{factor.description}</p>
              )}
              {factor.keyFacts && Array.isArray(factor.keyFacts) && (factor.keyFacts as unknown as string[]).length > 0 && (
                <ul className="text-sm space-y-1">
                  {(factor.keyFacts as unknown as string[]).map((fact: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              )}
              {factor.uncertaintyFlags && Array.isArray(factor.uncertaintyFlags) && (factor.uncertaintyFlags as unknown as string[]).length > 0 && (
                <div className="bg-amber-500/10 rounded-md p-3">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Uncertainty</span>
                  </div>
                  <ul className="text-sm space-y-1">
                    {(factor.uncertaintyFlags as unknown as string[]).map((flag: string, i: number) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function DataSnapshotsPanel({ gameId }: { gameId: string }) {
  const { data: snapshots = [], isLoading } = useQuery<DataSnapshot[]>({
    queryKey: ["/api/games", gameId, "snapshots"],
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const snapshotsByType = snapshots.reduce((acc, snapshot) => {
    if (!acc[snapshot.type]) {
      acc[snapshot.type] = [];
    }
    acc[snapshot.type].push(snapshot);
    return acc;
  }, {} as Record<string, DataSnapshot[]>);

  return (
    <Tabs defaultValue="odds" className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="odds">Odds</TabsTrigger>
        <TabsTrigger value="stats">Stats</TabsTrigger>
        <TabsTrigger value="injuries">Injuries</TabsTrigger>
        <TabsTrigger value="portal">Portal</TabsTrigger>
      </TabsList>
      {["odds", "stats", "injuries", "portal"].map(type => (
        <TabsContent key={type} value={type}>
          {snapshotsByType[type] && snapshotsByType[type].length > 0 ? (
            <div className="space-y-3">
              {snapshotsByType[type].map(snapshot => (
                <Card key={snapshot.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {snapshot.source}
                        </Badge>
                        {snapshot.hasChanged && (
                          <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                            Changed
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(new Date(snapshot.fetchedAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto font-mono">
                      {JSON.stringify(snapshot.data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No {type} data available</p>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export default function GameWorkspacePage() {
  const { slateId, gameId } = useParams<{ slateId: string; gameId: string }>();
  const { toast } = useToast();

  const { data: game, isLoading } = useQuery<Game>({
    queryKey: ["/api/games", gameId],
    enabled: !!gameId,
  });

  const researchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/games/${gameId}/research`);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId, "evidence"] });
      toast({
        title: "Research complete",
        description: `Found ${result.findingsCount} pieces of evidence.`,
      });
    },
    onError: () => {
      toast({
        title: "Research failed",
        description: "Failed to research this game. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="w-80 p-4 border-r bg-muted/30">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Game not found.</p>
        <Link href={`/slates/${slateId}`}>
          <Button variant="ghost">Go back to slate</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="hidden lg:block">
        <RecommendationPanel game={game} slateId={slateId!} />
      </div>
      
      <MobileGameHeader game={game} slateId={slateId!} />
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Analysis & Evidence</h2>
          <Button 
            onClick={() => researchMutation.mutate()}
            disabled={researchMutation.isPending}
            size="sm"
            data-testid="button-run-research"
          >
            {researchMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Researching...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Run Research</span>
                <span className="sm:hidden">Research</span>
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="evidence" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="evidence" className="flex-1 sm:flex-initial" data-testid="tab-evidence">Evidence</TabsTrigger>
            <TabsTrigger value="why" className="flex-1 sm:flex-initial" data-testid="tab-why">Why</TabsTrigger>
            <TabsTrigger value="data" className="flex-1 sm:flex-initial lg:hidden" data-testid="tab-data">Data</TabsTrigger>
          </TabsList>
          <TabsContent value="evidence" className="mt-4">
            <EvidencePanel gameId={gameId!} />
          </TabsContent>
          <TabsContent value="why" className="mt-4">
            <WhyPanel gameId={gameId!} />
          </TabsContent>
          <TabsContent value="data" className="mt-4 lg:hidden">
            <DataSnapshotsPanel gameId={gameId!} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden lg:block w-96 shrink-0 border-l bg-muted/30 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">Data Snapshots</h3>
        <DataSnapshotsPanel gameId={gameId!} />
      </div>
    </div>
  );
}
