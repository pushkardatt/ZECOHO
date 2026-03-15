import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Users,
  Crown,
  Search,
  RefreshCw,
  Gift,
  Ban,
  Calendar,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface OwnerSubscription {
  id: string;
  ownerId: string;
  planId: string;
  tier: string;
  status: "pending_payment" | "active" | "expired" | "cancelled" | "waived";
  duration: string;
  startDate: string | null;
  endDate: string | null;
  pricePaid: string | null;
  paymentReference: string | null;
  activationNote: string | null;
  isWaived: boolean;
  createdAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  plan: {
    id: string;
    name: string;
    tier: string;
    price: string;
  };
}

interface SubscriptionPlan {
  id: string;
  tier: string;
  name: string;
  description?: string;
  duration: string;
  price: string;
  cutoffPrice?: string;
  maxProperties: number;
  maxPhotosPerProperty: number;
  bookingManagementEnabled: boolean;
  priorityPlacement: boolean;
  analyticsEnabled: boolean;
  isActive: boolean;
  sortOrder: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending_payment: {
      label: "Pending Payment",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    },
    active: {
      label: "Active",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    },
    expired: {
      label: "Expired",
      className:
        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    },
    waived: {
      label: "Waived",
      className:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    },
  };
  const s = map[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    basic: "bg-slate-100 text-slate-700",
    standard: "bg-blue-100 text-blue-700",
    premium: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[tier] ?? "bg-gray-100 text-gray-600"}`}
    >
      {tier === "premium" && <Crown className="h-3 w-3" />}
      {tier}
    </span>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          {icon}
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-6 w-12 mb-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminSubscriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending_payment");
  const [mainTab, setMainTab] = useState("subscriptions");
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState<any>({ tier: "basic", name: "", description: "", duration: "monthly", price: "", cutoffPrice: "", maxProperties: 1, maxPhotosPerProperty: 10, bookingManagementEnabled: true, priorityPlacement: false, analyticsEnabled: false, isActive: true, sortOrder: 0 });
  const [selectedSub, setSelectedSub] = useState<OwnerSubscription | null>(
    null,
  );
  const [actionType, setActionType] = useState<
    "activate" | "cancel" | "waive" | null
  >(null);
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ── Queries ──
  const {
    data: subs = [],
    isLoading,
    refetch,
  } = useQuery<OwnerSubscription[]>({
    queryKey: ["/api/admin/owner-subscriptions"],
    queryFn: () =>
      apiRequest("GET", "/api/admin/owner-subscriptions").then((r) => r.json()),
    enabled: !!user,
  });

  // ── Mutations ──
  const activateMutation = useMutation({
    mutationFn: async ({
      id,
      note,
      startDate,
      endDate,
    }: {
      id: string;
      note: string;
      startDate: string;
      endDate: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/owner-subscriptions/${id}/activate`,
        { note, startDate, endDate },
      );
      if (!res.ok) throw new Error("Failed to activate");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription activated!",
        description: "The owner's plan is now active.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/owner-subscriptions"],
      });
      closeDialog();
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to activate subscription.",
        variant: "destructive",
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/owner-subscriptions/${id}/cancel`,
        { reason },
      );
      if (!res.ok) throw new Error("Failed to cancel");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subscription cancelled." });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/owner-subscriptions"],
      });
      closeDialog();
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to cancel subscription.",
        variant: "destructive",
      }),
  });

  const waiveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/owner-subscriptions/${id}/waive`,
        { note },
      );
      if (!res.ok) throw new Error("Failed to waive");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription waived!",
        description: "Fee has been waived for this owner.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/owner-subscriptions"],
      });
      closeDialog();
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to waive subscription.",
        variant: "destructive",
      }),
  });

  // ── Helpers ──
  const closeDialog = () => {
    setSelectedSub(null);
    setActionType(null);
    setNote("");
    setStartDate("");
    setEndDate("");
  };

  const openAction = (
    sub: OwnerSubscription,
    type: "activate" | "cancel" | "waive",
  ) => {
    setSelectedSub(sub);
    setActionType(type);
    // Default end date to 1 month from now
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    setStartDate(now.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  // ── Plans Query ──
  const { data: plans = [], refetch: refetchPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/admin/subscription-plans"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subscription-plans?includeInactive=true", { credentials: "include" });
      return res.json();
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("savePlan editingPlan:", editingPlan?.id, "method:", editingPlan ? "PATCH" : "POST");
      console.log("savePlan data:", JSON.stringify(data));
      const url = editingPlan ? '/api/admin/subscription-plans/' + editingPlan.id : "/api/admin/subscription-plans";
      const method = editingPlan ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] }); queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] }); setShowPlanDialog(false); toast({ title: editingPlan ? "Plan updated" : "Plan created" }); },
    onError: () => toast({ title: "Error saving plan", variant: "destructive" }),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch('/api/admin/subscription-plans/' + id, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] }); queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] }); toast({ title: "Plan deleted" }); },
  });

  function openNewPlan() {
    setEditingPlan(null);
    setPlanForm({ tier: "basic", name: "", description: "", duration: "monthly", price: "", cutoffPrice: "", maxProperties: 1, maxPhotosPerProperty: 10, bookingManagementEnabled: true, priorityPlacement: false, analyticsEnabled: false, isActive: true, sortOrder: 0 });
    setShowPlanDialog(true);
  }

  function openEditPlan(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setPlanForm({ ...plan, cutoffPrice: plan.cutoffPrice || "" });
    setShowPlanDialog(true);
  }

  function planDiscount(plan: SubscriptionPlan) {
    if (!plan.cutoffPrice || Number(plan.cutoffPrice) <= Number(plan.price)) return null;
    return Math.round(((Number(plan.cutoffPrice) - Number(plan.price)) / Number(plan.cutoffPrice)) * 100);
  }

  const handleConfirm = () => {
    if (!selectedSub) return;
    if (actionType === "activate")
      activateMutation.mutate({ id: selectedSub.id, note, startDate, endDate });
    if (actionType === "cancel")
      cancelMutation.mutate({ id: selectedSub.id, reason: note });
    if (actionType === "waive")
      waiveMutation.mutate({ id: selectedSub.id, note });
  };
  const isActionLoading =
    activateMutation.isPending ||
    cancelMutation.isPending ||
    waiveMutation.isPending;

  // ── Stats ──
  const pending = subs.filter((s) => s.status === "pending_payment").length;
  const active = subs.filter((s) => s.status === "active").length;
  const expired = subs.filter((s) => s.status === "expired").length;
  const waived = subs.filter((s) => s.status === "waived").length;

  // ── Filtered ──
  const filtered = subs.filter((s) => {
    const matchTab = s.status === activeTab;
    const matchSearch =
      !search ||
      `${s.owner.firstName} ${s.owner.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      s.owner.email.toLowerCase().includes(search.toLowerCase()) ||
      s.plan.name.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Subscription Management
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Review and activate owner subscription requests
          </p>
        </div>
        {mainTab === "plans" && <Button size="sm" onClick={openNewPlan}><Plus className="h-4 w-4 mr-1" />New Plan</Button>}
        <Button variant="outline" size="sm" onClick={() => mainTab === "plans" ? refetchPlans() : refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Owner Subscriptions</TabsTrigger>
        </TabsList>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="space-y-4">
          {plans.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No plans yet. Click "New Plan" to create one.</CardContent></Card>
          )}
          {[...plans].sort((a,b) => a.sortOrder - b.sortOrder).map((plan: SubscriptionPlan) => {
            const disc = planDiscount(plan);
            return (
              <Card key={plan.id} className={!plan.isActive ? "opacity-60 bg-muted/30" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{plan.tier}</span>
                        <span className="font-semibold">{plan.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{plan.duration.replace("_","-")}</span>
                        {!plan.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Hidden from owners</span>}
                      </div>
                      {plan.description && <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>}
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded">{plan.maxProperties === 999 ? "Unlimited properties" : plan.maxProperties + (plan.maxProperties === 1 ? " property" : " properties")}</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">{plan.maxPhotosPerProperty === 999 ? "Unlimited photos" : plan.maxPhotosPerProperty + " photos/property"}</span>
                        {plan.analyticsEnabled && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Analytics</span>}
                        {plan.priorityPlacement && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">Priority</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-2 justify-end">
                        {plan.cutoffPrice && Number(plan.cutoffPrice) > Number(plan.price) && (
                          <span className="text-sm text-muted-foreground line-through">{"₹" + Number(plan.cutoffPrice).toLocaleString("en-IN")}</span>
                        )}
                        <span className="text-xl font-bold">{"₹" + Number(plan.price).toLocaleString("en-IN")}</span>
                      </div>
                      {disc && <p className="text-xs text-green-600 font-medium">{disc}% off</p>}
                      <div className="flex gap-2 mt-3 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openEditPlan(plan)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => { if(window.confirm("Delete this plan?")) deletePlanMutation.mutate(plan.id); }}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Payment"
          value={pending}
          loading={isLoading}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Active"
          value={active}
          loading={isLoading}
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="Expired"
          value={expired}
          loading={isLoading}
        />
        <StatCard
          icon={<Gift className="h-5 w-5" />}
          label="Waived"
          value={waived}
          loading={isLoading}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Owner Subscriptions</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search owner or plan..."
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6">
              <TabsList className="mb-4">
                <TabsTrigger value="pending_payment">
                  Pending{" "}
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {pending}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="expired">Expired</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                <TabsTrigger value="waived">Waived</TabsTrigger>
              </TabsList>
            </div>

            {[
              "pending_payment",
              "active",
              "expired",
              "cancelled",
              "waived",
            ].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No subscriptions found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Owner</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Price Paid</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">
                                {sub.owner.firstName} {sub.owner.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {sub.owner.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {sub.plan.name}
                          </TableCell>
                          <TableCell>
                            <TierBadge tier={sub.tier} />
                          </TableCell>
                          <TableCell className="text-sm">
                            {sub.pricePaid
                              ? `₹${Number(sub.pricePaid).toLocaleString("en-IN")}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(sub.startDate)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(sub.endDate)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={sub.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {sub.status === "pending_payment" && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-green-600 border-green-200 hover:bg-green-50"
                                        onClick={() =>
                                          openAction(sub, "activate")
                                        }
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Activate</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                                        onClick={() => openAction(sub, "waive")}
                                      >
                                        <Gift className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Waive Fee</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() =>
                                          openAction(sub, "cancel")
                                        }
                                      >
                                        <Ban className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancel</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              {sub.status === "active" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => openAction(sub, "cancel")}
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Cancel Subscription
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {(sub.status === "expired" ||
                                sub.status === "cancelled") && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-green-600 border-green-200 hover:bg-green-50"
                                      onClick={() =>
                                        openAction(sub, "activate")
                                      }
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reactivate</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={!!selectedSub && !!actionType}
        onOpenChange={(o) => !o && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "activate" && "Activate Subscription"}
              {actionType === "cancel" && "Cancel Subscription"}
              {actionType === "waive" && "Waive Subscription Fee"}
            </DialogTitle>
            <DialogDescription>
              {selectedSub && (
                <>
                  Owner:{" "}
                  <strong>
                    {selectedSub.owner.firstName} {selectedSub.owner.lastName}
                  </strong>{" "}
                  — {selectedSub.plan.name} plan
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === "activate" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Activation Note (optional)</Label>
                  <Textarea
                    placeholder="e.g. Payment confirmed via UPI"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
            {actionType === "cancel" && (
              <div className="space-y-1">
                <Label className="text-xs">Reason for Cancellation</Label>
                <Textarea
                  placeholder="e.g. Payment not received after 3 days"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            {actionType === "waive" && (
              <div className="space-y-1">
                <Label className="text-xs">Waiver Note</Label>
                <Textarea
                  placeholder="e.g. Early adopter benefit, no payment required"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                isActionLoading ||
                (actionType === "cancel" && !note) ||
                (actionType === "waive" && !note)
              }
              variant={actionType === "cancel" ? "destructive" : "default"}
            >
              {isActionLoading
                ? "Processing..."
                : actionType === "activate"
                  ? "Activate"
                  : actionType === "cancel"
                    ? "Cancel Subscription"
                    : "Waive Fee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* close subscriptions tab content and main tabs */}
      </TabsContent>
      </Tabs>

      {/* Plan Create/Edit Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "New Subscription Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tier</Label>
                <Select value={planForm.tier} onValueChange={v => setPlanForm((f:any) => ({...f, tier: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Duration</Label>
                <Select value={planForm.duration} onValueChange={v => setPlanForm((f:any) => ({...f, duration: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half_yearly">Half-yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Plan name</Label>
              <Input value={planForm.name} onChange={(e:any) => setPlanForm((f:any) => ({...f, name: e.target.value}))} placeholder="e.g. Starter Monthly" />
            </div>
            <div><Label>Description</Label>
              <Textarea value={planForm.description} onChange={(e:any) => setPlanForm((f:any) => ({...f, description: e.target.value}))} rows={2} placeholder="Short description for owners" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Selling price (₹) <span className="text-xs text-muted-foreground">actual</span></Label>
                <Input type="number" value={planForm.price} onChange={(e:any) => setPlanForm((f:any) => ({...f, price: e.target.value}))} placeholder="999" />
              </div>
              <div>
                <Label>Cut-off price (₹) <span className="text-xs text-muted-foreground">strikethrough</span></Label>
                <Input type="number" value={planForm.cutoffPrice} onChange={(e:any) => setPlanForm((f:any) => ({...f, cutoffPrice: e.target.value}))} placeholder="1499 (optional)" />
                {planForm.cutoffPrice && Number(planForm.cutoffPrice) > Number(planForm.price) && (
                  <p className="text-xs text-green-600 mt-1">{Math.round(((Number(planForm.cutoffPrice)-Number(planForm.price))/Number(planForm.cutoffPrice))*100)}% discount shown</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max properties</Label>
                <Input type="number" value={planForm.maxProperties} onChange={(e:any) => setPlanForm((f:any) => ({...f, maxProperties: Number(e.target.value)}))} />
              </div>
              <div><Label>Max photos/property</Label>
                <Input type="number" value={planForm.maxPhotosPerProperty} onChange={(e:any) => setPlanForm((f:any) => ({...f, maxPhotosPerProperty: Number(e.target.value)}))} />
              </div>
            </div>
            <div className="space-y-3 border rounded-lg p-3">
              <p className="text-sm font-medium">Features</p>
              {[{k:"bookingManagementEnabled",l:"Booking management"},{k:"analyticsEnabled",l:"Analytics dashboard"},{k:"priorityPlacement",l:"Priority placement"}].map(({k,l}) => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="font-normal">{l}</Label>
                  <Switch checked={!!planForm[k]} onCheckedChange={(v:boolean) => setPlanForm((f:any) => ({...f, [k]: v}))} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sort order</Label>
                <Input type="number" value={planForm.sortOrder} onChange={(e:any) => setPlanForm((f:any) => ({...f, sortOrder: Number(e.target.value)}))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={planForm.isActive} onCheckedChange={(v:boolean) => setPlanForm((f:any) => ({...f, isActive: v}))} />
                <Label className="font-normal">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
            <Button onClick={() => savePlanMutation.mutate(planForm)} disabled={savePlanMutation.isPending}>
              {savePlanMutation.isPending ? "Saving..." : "Save plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
