import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Settings, History, Layers, ChevronRight, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Framework, FrameworkRule, FrameworkVersion, Weights } from "@shared/schema";
import { format } from "date-fns";

const defaultWeights: Weights = {
  qbRating: 20,
  defense: 20,
  strengthOfSchedule: 15,
  motivation: 15,
  marketMovement: 10,
  homeField: 10,
  injuries: 10,
};

const weightLabels: Record<keyof Weights, string> = {
  qbRating: "QB Rating",
  defense: "Defense",
  strengthOfSchedule: "Strength of Schedule",
  motivation: "Motivation",
  marketMovement: "Market Movement",
  homeField: "Home Field Advantage",
  injuries: "Injuries Impact",
};

function WeightSlider({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: number; 
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-mono text-muted-foreground">{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={5}
        className="w-full"
      />
    </div>
  );
}

function CreateFrameworkDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; weights: Weights }) => {
      const response = await apiRequest("POST", "/api/frameworks", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frameworks"] });
      toast({ title: "Framework created" });
      setOpen(false);
      setName("");
      setDescription("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, description, weights: defaultWeights });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-framework">
          <Plus className="h-4 w-4 mr-2" />
          New Framework
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Framework</DialogTitle>
            <DialogDescription>
              Create a new analysis framework with customizable weights and rules.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bowl Season Framework"
                data-testid="input-framework-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this framework..."
                data-testid="textarea-framework-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || createMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RuleEditor({ frameworkId, rules }: { frameworkId: string; rules: FrameworkRule[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [conditionField, setConditionField] = useState("homeField");
  const [conditionOperator, setConditionOperator] = useState<"equals" | "greaterThan" | "lessThan">("equals");
  const [conditionValue, setConditionValue] = useState("");
  const [actionType, setActionType] = useState<"adjustConfidence" | "addNote" | "flag">("adjustConfidence");
  const [actionValue, setActionValue] = useState("");
  const { toast } = useToast();

  const addRuleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/frameworks/${frameworkId}/rules`, {
        name: ruleName,
        condition: {
          field: conditionField,
          operator: conditionOperator,
          value: conditionValue,
        },
        action: {
          type: actionType,
          value: actionType === "adjustConfidence" ? parseFloat(actionValue) : actionValue,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frameworks", frameworkId, "rules"] });
      toast({ title: "Rule added" });
      setAddOpen(false);
      setRuleName("");
      setConditionValue("");
      setActionValue("");
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const response = await apiRequest("PATCH", `/api/framework-rules/${id}`, { isEnabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frameworks", frameworkId, "rules"] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/framework-rules/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frameworks", frameworkId, "rules"] });
      toast({ title: "Rule deleted" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Conditional Rules</h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-add-rule">
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Rule</DialogTitle>
              <DialogDescription>
                Create a conditional rule that adjusts analysis based on specific conditions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Rule Name</Label>
                <Input
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="Home underdog boost"
                  data-testid="input-rule-name"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-2">
                  <Label>Field</Label>
                  <Select value={conditionField} onValueChange={setConditionField}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homeField">Home Field</SelectItem>
                      <SelectItem value="spread">Spread</SelectItem>
                      <SelectItem value="total">Total</SelectItem>
                      <SelectItem value="qbRating">QB Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Operator</Label>
                  <Select value={conditionOperator} onValueChange={(v: "equals" | "greaterThan" | "lessThan") => setConditionOperator(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="greaterThan">Greater Than</SelectItem>
                      <SelectItem value="lessThan">Less Than</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Value</Label>
                  <Input
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder="7"
                    data-testid="input-condition-value"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>Action</Label>
                  <Select value={actionType} onValueChange={(v: "adjustConfidence" | "addNote" | "flag") => setActionType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adjustConfidence">Adjust Confidence</SelectItem>
                      <SelectItem value="addNote">Add Note</SelectItem>
                      <SelectItem value="flag">Flag for Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Action Value</Label>
                  <Input
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    placeholder={actionType === "adjustConfidence" ? "+5" : "Note text"}
                    data-testid="input-action-value"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => addRuleMutation.mutate()}
                disabled={!ruleName || !conditionValue || addRuleMutation.isPending}
              >
                Add Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length > 0 ? (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id} data-testid={`card-rule-${rule.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant="outline" className="text-xs">
                        Priority: {rule.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      If {(rule.condition as { field: string }).field} {(rule.condition as { operator: string }).operator} {String((rule.condition as { value: unknown }).value)}, 
                      then {(rule.action as { type: string }).type}: {String((rule.action as { value: unknown }).value)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isEnabled}
                      onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, isEnabled: checked })}
                      data-testid={`switch-rule-${rule.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                      data-testid={`button-delete-rule-${rule.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          <p>No rules configured</p>
          <p className="text-sm">Add rules to customize the analysis</p>
        </div>
      )}
    </div>
  );
}

function VersionHistory({ frameworkId }: { frameworkId: string }) {
  const { data: versions = [], isLoading } = useQuery<FrameworkVersion[]>({
    queryKey: ["/api/frameworks", frameworkId, "versions"],
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        <p>No version history</p>
        <p className="text-sm">Versions are created when you save changes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {versions.map((version) => (
        <Card key={version.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge>v{version.version}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(version.createdAt), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                {version.changelog && (
                  <p className="text-sm mt-1">{version.changelog}</p>
                )}
              </div>
              <Button variant="outline" size="sm">
                Restore
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FrameworkEditor({ framework, onBack }: { framework: Framework; onBack: () => void }) {
  const [weights, setWeights] = useState<Weights>(
    (framework.weights as Weights) || defaultWeights
  );
  const { toast } = useToast();

  const { data: rules = [] } = useQuery<FrameworkRule[]>({
    queryKey: ["/api/frameworks", framework.id, "rules"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Framework>) => {
      const response = await apiRequest("PATCH", `/api/frameworks/${framework.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frameworks"] });
      toast({ title: "Framework updated" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/frameworks/${framework.id}`, { isActive: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frameworks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/frameworks/active"] });
      toast({ title: "Framework activated" });
    },
  });

  const handleWeightChange = (key: keyof Weights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate({ weights, version: framework.version + 1 });
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="md:hidden"
            data-testid="button-back-frameworks"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold truncate">{framework.name}</h2>
            <p className="text-sm text-muted-foreground truncate">{framework.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">v{framework.version}</Badge>
          {framework.isActive ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={() => activateMutation.mutate()}>
              Set Active
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="weights">
        <TabsList>
          <TabsTrigger value="weights" data-testid="tab-weights">
            <Settings className="h-4 w-4 mr-2" />
            Weights
          </TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">
            <Layers className="h-4 w-4 mr-2" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weights" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weight Configuration</CardTitle>
              <CardDescription>
                Adjust how much each factor contributes to the analysis. Total: {totalWeight}%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(Object.keys(weightLabels) as (keyof Weights)[]).map((key) => (
                <WeightSlider
                  key={key}
                  label={weightLabels[key]}
                  value={weights[key]}
                  onChange={(value) => handleWeightChange(key, value)}
                />
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setWeights(defaultWeights)}>
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <RuleEditor frameworkId={framework.id} rules={rules} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <VersionHistory frameworkId={framework.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FrameworksPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const { data: frameworks = [], isLoading } = useQuery<Framework[]>({
    queryKey: ["/api/frameworks"],
  });

  const selectedFramework = frameworks.find(f => f.id === selectedId);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className={`w-full md:w-80 shrink-0 md:border-r p-4 overflow-y-auto ${
        selectedId ? "hidden md:block" : "block"
      }`}>
        <div className="flex items-center justify-between gap-2 mb-4">
          <h1 className="text-lg font-semibold" data-testid="text-page-title">Frameworks</h1>
          <CreateFrameworkDialog />
        </div>

        <div className="space-y-2">
          {frameworks.map((framework) => (
            <button
              key={framework.id}
              onClick={() => setSelectedId(framework.id)}
              className={`w-full text-left p-3 rounded-md transition-colors hover-elevate ${
                selectedId === framework.id ? "bg-muted" : ""
              }`}
              data-testid={`button-framework-${framework.id}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium truncate">{framework.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">v{framework.version}</Badge>
                {framework.isActive && (
                  <Badge className="text-xs bg-emerald-500/10 text-emerald-600">Active</Badge>
                )}
              </div>
            </button>
          ))}

          {frameworks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2" />
              <p>No frameworks yet</p>
              <p className="text-sm">Create one to get started</p>
            </div>
          )}
        </div>
      </div>

      <div className={`flex-1 p-4 sm:p-6 overflow-y-auto ${
        selectedId ? "block" : "hidden md:block"
      }`}>
        {selectedFramework ? (
          <FrameworkEditor framework={selectedFramework} onBack={() => setSelectedId(null)} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Layers className="h-12 w-12 mx-auto mb-4" />
              <p>Select a framework to edit</p>
              <p className="text-sm">Or create a new one to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
