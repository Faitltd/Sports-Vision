import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, MoreHorizontal, Calendar, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Slate } from "@shared/schema";
import { format } from "date-fns";

function SlateCard({ slate }: { slate: Slate }) {
  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    enriching: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    ready: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    exported: "bg-primary/10 text-primary",
  };

  return (
    <Link href={`/slates/${slate.id}`}>
      <Card 
        className="hover-elevate cursor-pointer transition-colors"
        data-testid={`card-slate-${slate.id}`}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-medium" data-testid={`text-slate-name-${slate.id}`}>
              {slate.name}
            </CardTitle>
            <Badge 
              variant="secondary" 
              className={`text-xs capitalize w-fit ${statusColors[slate.status] || ""}`}
              data-testid={`badge-status-${slate.id}`}
            >
              {slate.status}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => e.preventDefault()}
                data-testid={`button-slate-menu-${slate.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid={`menu-duplicate-${slate.id}`}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem data-testid={`menu-archive-${slate.id}`}>
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span data-testid={`text-game-count-${slate.id}`}>
                {slate.gameCount} {slate.gameCount === 1 ? "game" : "games"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span data-testid={`text-updated-${slate.id}`}>
                {format(new Date(slate.updatedAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CreateSlateDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pastedText, setPastedText] = useState("");
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
        description: `"${slate.name}" has been created.`,
      });
      setOpen(false);
      setName("");
      setPastedText("");
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
              Create a new slate to analyze college football games. You can add games manually or upload a screenshot.
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
            <div className="grid gap-2">
              <Label htmlFor="games">Paste Games (Optional)</Label>
              <Textarea
                id="games"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your games here or upload a screenshot after creating the slate..."
                className="min-h-[100px]"
                data-testid="textarea-paste-games"
              />
            </div>
            <div className="flex items-center justify-center border-2 border-dashed border-muted rounded-md p-6">
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Screenshot upload available after creation
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || createMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? "Creating..." : "Create Slate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SlatesPage() {
  const { data: slates, isLoading, error } = useQuery<Slate[]>({
    queryKey: ["/api/slates"],
  });

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Failed to load slates. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Slates</h1>
          <p className="text-muted-foreground text-sm">
            Manage your betting slates and analyze games
          </p>
        </div>
        <CreateSlateDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-16 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : slates && slates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slates.map((slate) => (
            <SlateCard key={slate.id} slate={slate} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium mb-1">No slates yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first slate to start analyzing games.
              </p>
            </div>
            <CreateSlateDialog />
          </div>
        </Card>
      )}
    </div>
  );
}
