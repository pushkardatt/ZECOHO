const fs = require('fs');
let c = fs.readFileSync('client/src/pages/admin-subscriptions.tsx', 'utf8');

// Add new imports
c = c.replace(
  "import { Plus, Pencil, Trash2 } from",
  "import { Plus, Pencil, Trash2, X } from"
);

// Add Switch and Select imports if not present
if (!c.includes("import { Switch }")) {
  c = c.replace(
    'import { Tabs, TabsContent, TabsList, TabsTrigger }',
    'import { Switch } from "@/components/ui/switch";\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";\nimport { Tabs, TabsContent, TabsList, TabsTrigger }'
  );
}

// Add SubscriptionPlan type
if (!c.includes('interface SubscriptionPlan')) {
  c = c.replace(
    '// ── Helpers',
    `interface SubscriptionPlan {
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

// ── Helpers`
  );
}

// Add state variables
c = c.replace(
  'const [activeTab, setActiveTab] = useState("pending_payment");',
  `const [activeTab, setActiveTab] = useState("pending_payment");
  const [mainTab, setMainTab] = useState("subscriptions");
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState<any>({ tier: "basic", name: "", description: "", duration: "monthly", price: "", cutoffPrice: "", maxProperties: 1, maxPhotosPerProperty: 10, bookingManagementEnabled: true, priorityPlacement: false, analyticsEnabled: false, isActive: true, sortOrder: 0 });`
);

// Add plans query and mutations before the filter logic
c = c.replace(
  'if (!selectedSub) return;',
  `if (!selectedSub) return;

  const { data: plans = [], refetch: refetchPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/admin/subscription-plans"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subscription-plans?includeInactive=true", { credentials: "include" });
      return res.json();
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingPlan ? '/api/admin/subscription-plans/' + editingPlan.id : "/api/admin/subscription-plans";
      const method = editingPlan ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] }); setShowPlanDialog(false); toast({ title: editingPlan ? "Plan updated" : "Plan created" }); },
    onError: () => toast({ title: "Error saving plan", variant: "destructive" }),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch('/api/admin/subscription-plans/' + id, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] }); toast({ title: "Plan deleted" }); },
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
  }`
);

// Wrap existing content in Subscriptions tab and add Plans tab
// Find the stats grid and wrap it
c = c.replace(
  '<div className="grid grid-cols-2 md:grid-cols-4 gap-4">',
  `<Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">`
);

// Add New Plan button to header
c = c.replace(
  '<Button variant="outline" size="sm" onClick={() => refetch()}>',
  `{mainTab === "plans" && <Button size="sm" onClick={openNewPlan}><Plus className="h-4 w-4 mr-1" />New Plan</Button>}
        <Button variant="outline" size="sm" onClick={() => mainTab === "plans" ? refetchPlans() : refetch()}>`
);

// Close the subscriptions TabsContent and main Tabs before the plan dialog
c = c.replace(
  `      </Dialog>
    </div>
  );
}`,
  `      </Dialog>

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
}`
);

fs.writeFileSync('client/src/pages/admin-subscriptions.tsx', c);
console.log('Done!', c.split('\n').length, 'lines');
