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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  CalendarPlus,
  XCircle,
  FileText,
  Download,
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
  Upload,
  ExternalLink,
  Wallet,
  IndianRupee,
  QrCode,
  Building,
  Copy,
  Mail,
  Send,
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
interface PaymentAccount {
  id: string;
  accountType: "upi" | "bank";
  accountName: string;
  upiId?: string;
  qrCodeUrl?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  priority: "primary" | "secondary";
  isActive: boolean;
  displayOrder: number;
}

interface SubscriptionPaymentProof {
  id: string;
  subscriptionId: string;
  transactionId: string;
  screenshotUrl?: string;
  paymentMethod: string;
  amount: string;
  status: "pending" | "verified" | "rejected";
  submittedAt: string;
  adminNotes?: string;
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
function InvoicesTab() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState({ month: "", year: "" });
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<{ id: string; invoiceNumber: string; ownerEmail: string; ownerName: string } | null>(null);
  const [sendEmail, setSendEmail] = useState("");

  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/invoices"],
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ invoiceId, email }: { invoiceId: string; email: string }) => {
      const res = await apiRequest("POST", `/api/admin/invoices/${invoiceId}/send-email`, { email });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice sent", description: `Invoice emailed to ${sendEmail}` });
      setSendDialogOpen(false);
      setSendTarget(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to send invoice", description: error.message || "Please try again", variant: "destructive" });
    },
  });

  const openSendDialog = (inv: any) => {
    setSendTarget({ id: inv.id, invoiceNumber: inv.invoiceNumber, ownerEmail: inv.ownerEmail || "", ownerName: inv.ownerName || "" });
    setSendEmail(inv.ownerEmail || "");
    setSendDialogOpen(true);
  };

  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    }
  };
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.ownerName?.toLowerCase().includes(q) ||
      inv.ownerEmail?.toLowerCase().includes(q);
    const invDate = new Date(inv.invoiceDate);
    const matchesMonth =
      !dateFilter.month ||
      invDate.getMonth() + 1 === parseInt(dateFilter.month);
    const matchesYear =
      !dateFilter.year || invDate.getFullYear() === parseInt(dateFilter.year);
    return matchesSearch && matchesMonth && matchesYear;
  });
  const totalRevenue = filteredInvoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount || 0),
    0,
  );
  const totalGST = filteredInvoices.reduce(
    (sum, inv) =>
      sum +
      Number(inv.cgstAmount || 0) +
      Number(inv.sgstAmount || 0) +
      Number(inv.igstAmount || 0),
    0,
  );
  const years = [
    ...new Set(invoices.map((inv) => new Date(inv.invoiceDate).getFullYear())),
  ].sort((a, b) => b - a);
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];
  return (
    <>
    {/* Send Invoice Email Dialog */}
    <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Send Invoice by Email
          </DialogTitle>
          <DialogDescription>
            Sending invoice <span className="font-medium">{sendTarget?.invoiceNumber}</span> to{" "}
            <span className="font-medium">{sendTarget?.ownerName}</span>.
            You can edit the recipient email before sending.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="send-invoice-email">Recipient Email</Label>
          <Input
            id="send-invoice-email"
            type="email"
            value={sendEmail}
            onChange={(e) => setSendEmail(e.target.value)}
            placeholder="owner@example.com"
            data-testid="input-send-invoice-email"
          />
          <p className="text-xs text-muted-foreground">
            The invoice PDF will be attached to this email.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              sendTarget &&
              sendEmailMutation.mutate({ invoiceId: sendTarget.id, email: sendEmail })
            }
            disabled={sendEmailMutation.isPending || !sendEmail.trim()}
            data-testid="button-send-invoice-confirm"
          >
            {sendEmailMutation.isPending ? (
              "Sending…"
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Invoices</p>
            <p className="text-2xl font-semibold">{filteredInvoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total GST</p>
            <p className="text-2xl font-semibold">
              ₹{totalGST.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice no, owner name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={dateFilter.month}
          onChange={(e) =>
            setDateFilter((p) => ({ ...p, month: e.target.value }))
          }
        >
          <option value="">All Months</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={dateFilter.year}
          onChange={(e) =>
            setDateFilter((p) => ({ ...p, year: e.target.value }))
          }
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        {(searchQuery || dateFilter.month || dateFilter.year) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setDateFilter({ month: "", year: "" });
            }}
          >
            Clear
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery || dateFilter.month || dateFilter.year
            ? "No invoices match your search"
            : "No invoices generated yet"}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Invoice No.</th>
                  <th className="text-left p-3 font-medium">Owner</th>
                  <th className="text-left p-3 font-medium">Plan</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 font-medium">Base</th>
                  <th className="text-right p-3 font-medium">GST</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const gst =
                    Number(inv.cgstAmount || 0) +
                    Number(inv.sgstAmount || 0) +
                    Number(inv.igstAmount || 0);
                  const gstType =
                    Number(inv.igstAmount) > 0
                      ? `IGST ${inv.igstRate}%`
                      : `CGST+SGST ${inv.cgstRate}%+${inv.sgstRate}%`;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3 font-mono text-xs font-medium text-primary">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{inv.ownerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {inv.ownerEmail}
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        {inv.planName}
                        <br />
                        <span className="text-muted-foreground">
                          {inv.planDuration}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3 text-right text-xs">
                        Rs.
                        {Number(inv.baseAmount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-3 text-right text-xs">
                        Rs.
                        {gst.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                        <br />
                        <span className="text-muted-foreground">{gstType}</span>
                      </td>
                      <td className="p-3 text-right font-semibold">
                        Rs.
                        {Number(inv.totalAmount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDownload(inv.id, inv.invoiceNumber)
                            }
                            data-testid={`button-download-invoice-${inv.id}`}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSendDialog(inv)}
                            data-testid={`button-send-invoice-${inv.id}`}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Send
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
export default function AdminSubscriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending_payment");
  const [mainTab, setMainTab] = useState("subscriptions");
  const [showPaymentAccountDialog, setShowPaymentAccountDialog] =
    useState(false);
  const [editingPaymentAccount, setEditingPaymentAccount] =
    useState<PaymentAccount | null>(null);
  const [paymentAccountForm, setPaymentAccountForm] = useState<any>({
    accountType: "upi",
    accountName: "",
    upiId: "",
    qrCodeUrl: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    priority: "secondary",
    displayOrder: 0,
    isActive: true,
  });
  const [selectedSubProofs, setSelectedSubProofs] = useState<
    SubscriptionPaymentProof[]
  >([]);
  const [proofLoading, setProofLoading] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState<any>({
    tier: "basic",
    name: "",
    description: "",
    duration: "monthly",
    price: "",
    cutoffPrice: "",
    maxProperties: 1,
    maxPhotosPerProperty: 10,
    bookingManagementEnabled: true,
    priorityPlacement: false,
    analyticsEnabled: false,
    isActive: true,
    sortOrder: 0,
  });
  const [selectedSub, setSelectedSub] = useState<OwnerSubscription | null>(
    null,
  );
  const [actionType, setActionType] = useState<
    "activate" | "cancel" | "waive" | null
  >(null);
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("30");
  const [selectedSubForExtend, setSelectedSubForExtend] = useState<any>(null);

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
  const extendMutation = useMutation({
    mutationFn: async ({ subId, days }: { subId: string; days: number }) =>
      apiRequest("POST", `/api/admin/owner-subscriptions/${subId}/extend`, {
        days,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/owner-subscriptions"],
      });
      toast({
        title: "Extended",
        description: `Subscription extended by ${extendDays} days.`,
      });
      setExtendDialogOpen(false);
      setExtendDays("30");
      setSelectedSubForExtend(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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
    setSelectedSubProofs([]);
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    setStartDate(now.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
    // Fetch payment proofs for this subscription
    if (type === "activate") {
      fetchPaymentProofs(sub.id);
    }
  };
  // ── Payment Accounts Query ──
  const { data: paymentAccountsRaw = [], refetch: refetchPaymentAccounts } =
    useQuery<any[]>({
      queryKey: ["/api/admin/payment-accounts"],
      queryFn: () =>
        fetch("/api/admin/payment-accounts", { credentials: "include" }).then(
          (r) => r.json(),
        ),
    });

  const paymentAccountsList: PaymentAccount[] = paymentAccountsRaw.map(
    (a: any) => ({
      id: a.id,
      accountType: a.accountType || a.account_type,
      accountName: a.accountName || a.account_name,
      upiId: a.upiId || a.upi_id,
      qrCodeUrl: a.qrCodeUrl || a.qr_code_url,
      bankName: a.bankName || a.bank_name,
      accountNumber: a.accountNumber || a.account_number,
      ifscCode: a.ifscCode || a.ifsc_code,
      branchName: a.branchName || a.branch_name,
      priority: a.priority,
      isActive: a.isActive ?? a.is_active,
      displayOrder: a.displayOrder || a.display_order || 0,
    }),
  );

  const savePaymentAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingPaymentAccount
        ? `/api/admin/payment-accounts/${editingPaymentAccount.id}`
        : "/api/admin/payment-accounts";
      const method = editingPaymentAccount ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/payment-accounts"],
      });
      setShowPaymentAccountDialog(false);
      toast({
        title: editingPaymentAccount ? "Account updated" : "Account added",
      });
    },
    onError: () =>
      toast({ title: "Failed to save account", variant: "destructive" }),
  });

  const deletePaymentAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/payment-accounts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/payment-accounts"],
      });
      toast({ title: "Account deleted" });
    },
  });

  const fetchPaymentProofs = async (subscriptionId: string) => {
    setProofLoading(true);
    try {
      const res = await fetch(
        `/api/admin/payment-proofs/by-subscription/${subscriptionId}`,
        { credentials: "include" },
      );
      const proofs = await res.json();
      setSelectedSubProofs(proofs);
    } catch {
      setSelectedSubProofs([]);
    } finally {
      setProofLoading(false);
    }
  };

  function openNewPaymentAccount() {
    setEditingPaymentAccount(null);
    setPaymentAccountForm({
      accountType: "upi",
      accountName: "",
      upiId: "",
      qrCodeUrl: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
      priority: "secondary",
      displayOrder: 0,
      isActive: true,
    });
    setShowPaymentAccountDialog(true);
  }

  function openEditPaymentAccount(acc: any) {
    setEditingPaymentAccount(acc);
    setPaymentAccountForm({
      accountType: acc.accountType || acc.account_type || "upi",
      accountName: acc.accountName || acc.account_name || "",
      upiId: acc.upiId || acc.upi_id || "",
      qrCodeUrl: acc.qrCodeUrl || acc.qr_code_url || "",
      bankName: acc.bankName || acc.bank_name || "",
      accountNumber: acc.accountNumber || acc.account_number || "",
      ifscCode: acc.ifscCode || acc.ifsc_code || "",
      branchName: acc.branchName || acc.branch_name || "",
      priority: acc.priority || "secondary",
      displayOrder: acc.displayOrder || acc.display_order || 0,
      isActive: acc.isActive ?? acc.is_active ?? true,
    });
    setShowPaymentAccountDialog(true);
  }
  // ── Plans Query ──
  const { data: plans = [], refetch: refetchPlans } = useQuery<
    SubscriptionPlan[]
  >({
    queryKey: ["/api/admin/subscription-plans"],
    queryFn: async () => {
      const res = await fetch(
        "/api/admin/subscription-plans?includeInactive=true",
        { credentials: "include" },
      );
      return res.json();
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log(
        "savePlan editingPlan:",
        editingPlan?.id,
        "method:",
        editingPlan ? "PATCH" : "POST",
      );
      console.log("savePlan data:", JSON.stringify(data));
      const url = editingPlan
        ? "/api/admin/subscription-plans/" + editingPlan.id
        : "/api/admin/subscription-plans";
      const method = editingPlan ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/subscription-plans"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setShowPlanDialog(false);
      toast({ title: editingPlan ? "Plan updated" : "Plan created" });
    },
    onError: () =>
      toast({ title: "Error saving plan", variant: "destructive" }),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch("/api/admin/subscription-plans/" + id, {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/subscription-plans"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({ title: "Plan deleted" });
    },
  });

  function openNewPlan() {
    setEditingPlan(null);
    setPlanForm({
      tier: "basic",
      name: "",
      description: "",
      duration: "monthly",
      price: "",
      cutoffPrice: "",
      maxProperties: 1,
      maxPhotosPerProperty: 10,
      bookingManagementEnabled: true,
      priorityPlacement: false,
      analyticsEnabled: false,
      isActive: true,
      sortOrder: 0,
    });
    setShowPlanDialog(true);
  }

  function openEditPlan(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setPlanForm({
      tier: plan.tier,
      name: plan.name,
      description: plan.description || "",
      duration: plan.duration,
      price: Number(plan.price),
      cutoffPrice: plan.cutoffPrice ? Number(plan.cutoffPrice) : "",
      maxProperties: plan.maxProperties,
      maxPhotosPerProperty: plan.maxPhotosPerProperty,
      bookingManagementEnabled: plan.bookingManagementEnabled,
      priorityPlacement: plan.priorityPlacement,
      analyticsEnabled: plan.analyticsEnabled,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
    setShowPlanDialog(true);
  }

  function planDiscount(plan: SubscriptionPlan) {
    if (!plan.cutoffPrice || Number(plan.cutoffPrice) <= Number(plan.price))
      return null;
    return Math.round(
      ((Number(plan.cutoffPrice) - Number(plan.price)) /
        Number(plan.cutoffPrice)) *
        100,
    );
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
    <div className="container mx-auto py-6 px-4 space-y-6">
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
        {mainTab === "plans" && (
          <Button size="sm" onClick={openNewPlan}>
            <Plus className="h-4 w-4 mr-1" />
            New Plan
          </Button>
        )}
        {mainTab === "payment-accounts" && (
          <Button size="sm" onClick={openNewPaymentAccount}>
            <Plus className="h-4 w-4 mr-1" />
            Add Account
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            mainTab === "plans"
              ? refetchPlans()
              : mainTab === "payment-accounts"
                ? refetchPaymentAccounts()
                : refetch()
          }
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="mb-4 flex w-full overflow-x-auto">
          <TabsTrigger value="plans" className="flex-shrink-0">Subscription Plans</TabsTrigger>
          <TabsTrigger value="payment-accounts" className="flex-shrink-0">Payment Accounts</TabsTrigger>
          <TabsTrigger value="invoices" className="flex-shrink-0">Invoices</TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex-shrink-0">Owner Subscriptions</TabsTrigger>
        </TabsList>
        {/* PAYMENT ACCOUNTS TAB */}
        <TabsContent value="payment-accounts" className="space-y-4">
          {paymentAccountsList.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="mb-2">No payment accounts configured yet.</p>
                <p className="text-sm">
                  Add your UPI ID and bank details so owners know where to pay.
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={openNewPaymentAccount}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add First Account
                </Button>
              </CardContent>
            </Card>
          )}

          {paymentAccountsList.map((acc) => (
            <Card key={acc.id} className={!acc.isActive ? "opacity-60" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${acc.accountType === "upi" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                    >
                      {acc.accountType === "upi" ? (
                        <QrCode className="h-5 w-5" />
                      ) : (
                        <Building className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{acc.accountName}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${acc.priority === "primary" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                        >
                          {acc.priority === "primary" ? "Primary" : "Secondary"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${acc.accountType === "upi" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                        >
                          {acc.accountType === "upi" ? "UPI" : "Bank Transfer"}
                        </span>
                        {!acc.isActive && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            Hidden
                          </span>
                        )}
                      </div>
                      {acc.accountType === "upi" && acc.upiId && (
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">
                            {acc.upiId}
                          </code>
                          {acc.qrCodeUrl && (
                            <span className="text-xs text-muted-foreground">
                              • QR code set
                            </span>
                          )}
                        </div>
                      )}
                      {acc.accountType === "bank" && (
                        <div className="text-sm text-muted-foreground">
                          {acc.bankName && <span>{acc.bankName} · </span>}
                          {acc.accountNumber && (
                            <span className="font-mono">
                              ****{acc.accountNumber.slice(-4)}
                            </span>
                          )}
                          {acc.ifscCode && <span> · {acc.ifscCode}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditPaymentAccount(acc)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm("Delete this account?"))
                          deletePaymentAccountMutation.mutate(acc.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="invoices" className="mt-6">
          <InvoicesTab />
        </TabsContent>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="space-y-4">
          {plans.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No plans yet. Click "New Plan" to create one.
              </CardContent>
            </Card>
          )}
          {[...plans]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((plan: SubscriptionPlan) => {
              const disc = planDiscount(plan);
              return (
                <Card
                  key={plan.id}
                  className={!plan.isActive ? "opacity-60 bg-muted/30" : ""}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                            {plan.tier}
                          </span>
                          <span className="font-semibold">{plan.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {plan.duration.replace("_", "-")}
                          </span>
                          {!plan.isActive && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                              Hidden from owners
                            </span>
                          )}
                        </div>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {plan.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {plan.maxProperties === 999
                              ? "Unlimited properties"
                              : plan.maxProperties +
                                (plan.maxProperties === 1
                                  ? " property"
                                  : " properties")}
                          </span>
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {plan.maxPhotosPerProperty === 999
                              ? "Unlimited photos"
                              : plan.maxPhotosPerProperty + " photos/property"}
                          </span>
                          {plan.analyticsEnabled && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              Analytics
                            </span>
                          )}
                          {plan.priorityPlacement && (
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                              Priority
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-baseline gap-2 justify-end">
                          {plan.cutoffPrice &&
                            Number(plan.cutoffPrice) > Number(plan.price) && (
                              <span className="text-sm text-muted-foreground line-through">
                                {"₹" +
                                  Number(plan.cutoffPrice).toLocaleString(
                                    "en-IN",
                                  )}
                              </span>
                            )}
                          <span className="text-xl font-bold">
                            {"₹" + Number(plan.price).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {disc && (
                          <p className="text-xs text-green-600 font-medium">
                            {disc}% off
                          </p>
                        )}
                        <div className="flex gap-2 mt-3 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditPlan(plan)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (window.confirm("Delete this plan?"))
                                deletePlanMutation.mutate(plan.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
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
                <div className="px-6 overflow-x-auto">
                  <TabsList className="mb-4 flex w-full overflow-x-auto">
                    <TabsTrigger value="pending_payment" className="flex-shrink-0">
                      Pending{" "}
                      <Badge variant="secondary" className="ml-1.5 text-xs">
                        {pending}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="active" className="flex-shrink-0">Active</TabsTrigger>
                    <TabsTrigger value="expired" className="flex-shrink-0">Expired</TabsTrigger>
                    <TabsTrigger value="cancelled" className="flex-shrink-0">Cancelled</TabsTrigger>
                    <TabsTrigger value="waived" className="flex-shrink-0">Waived</TabsTrigger>
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
                                        <TooltipContent>
                                          Activate
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                            onClick={() => {
                                              setSelectedSubForExtend(sub);
                                              setExtendDays("30");
                                              setExtendDialogOpen(true);
                                            }}
                                          >
                                            <CalendarPlus className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Extend</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                                            onClick={() =>
                                              openAction(sub, "waive")
                                            }
                                          >
                                            <Gift className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Waive Fee
                                        </TooltipContent>
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
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                            onClick={() => {
                                              setSelectedSubForExtend(sub);
                                              setExtendDays("30");
                                              setExtendDialogOpen(true);
                                            }}
                                          >
                                            <CalendarPlus className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Extend</TooltipContent>
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
                                        <TooltipContent>
                                          Cancel Subscription
                                        </TooltipContent>
                                      </Tooltip>
                                    </>
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
                                      <TooltipContent>
                                        Reactivate
                                      </TooltipContent>
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
                        {selectedSub.owner.firstName}{" "}
                        {selectedSub.owner.lastName}
                      </strong>{" "}
                      — {selectedSub.plan.name} plan
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Payment Proof Section */}
                {actionType === "activate" && selectedSub && (
                  <div className="rounded-xl border p-4 bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                      Payment Proof
                    </p>
                    {proofLoading ? (
                      <div className="text-sm text-muted-foreground">
                        Loading proof...
                      </div>
                    ) : selectedSubProofs.length === 0 ? (
                      <div className="flex items-center gap-2 text-amber-600 text-sm">
                        <XCircle className="h-4 w-4" />
                        <span>No payment proof submitted by owner yet</span>
                      </div>
                    ) : (
                      selectedSubProofs.map((proof) => (
                        <div key={proof.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              Proof submitted
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${proof.status === "verified" ? "bg-green-100 text-green-700" : proof.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}
                            >
                              {proof.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Transaction ID
                              </p>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {proof.transactionId}
                              </code>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Amount Paid
                              </p>
                              <p className="font-semibold">
                                ₹{Number(proof.amount).toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>
                          {proof.screenshotUrl && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Screenshot
                              </p>
                              <a
                                href={proof.screenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary underline"
                              >
                                <ExternalLink className="h-3 w-3" /> View
                                Screenshot
                              </a>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

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
                      <Label className="text-xs">
                        Activation Note (optional)
                      </Label>
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
            <DialogTitle>
              {editingPlan ? "Edit Plan" : "New Subscription Plan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tier</Label>
                <Select
                  value={planForm.tier}
                  onValueChange={(v) =>
                    setPlanForm((f: any) => ({ ...f, tier: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration</Label>
                <Select
                  value={planForm.duration}
                  onValueChange={(v) =>
                    setPlanForm((f: any) => ({ ...f, duration: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half_yearly">Half-yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Plan name</Label>
              <Input
                value={planForm.name}
                onChange={(e: any) =>
                  setPlanForm((f: any) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Starter Monthly"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={planForm.description}
                onChange={(e: any) =>
                  setPlanForm((f: any) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                rows={2}
                placeholder="Short description for owners"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  Selling price (₹){" "}
                  <span className="text-xs text-muted-foreground">actual</span>
                </Label>
                <Input
                  type="number"
                  value={planForm.price}
                  onChange={(e: any) =>
                    setPlanForm((f: any) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="999"
                />
              </div>
              <div>
                <Label>
                  Cut-off price (₹){" "}
                  <span className="text-xs text-muted-foreground">
                    strikethrough
                  </span>
                </Label>
                <Input
                  type="number"
                  value={planForm.cutoffPrice}
                  onChange={(e: any) =>
                    setPlanForm((f: any) => ({
                      ...f,
                      cutoffPrice: e.target.value,
                    }))
                  }
                  placeholder="1499 (optional)"
                />
                {planForm.cutoffPrice &&
                  Number(planForm.cutoffPrice) > Number(planForm.price) && (
                    <p className="text-xs text-green-600 mt-1">
                      {Math.round(
                        ((Number(planForm.cutoffPrice) -
                          Number(planForm.price)) /
                          Number(planForm.cutoffPrice)) *
                          100,
                      )}
                      % discount shown
                    </p>
                  )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max properties</Label>
                <Input
                  type="number"
                  value={planForm.maxProperties}
                  onChange={(e: any) =>
                    setPlanForm((f: any) => ({
                      ...f,
                      maxProperties: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <Label>Max photos/property</Label>
                <Input
                  type="number"
                  value={planForm.maxPhotosPerProperty}
                  onChange={(e: any) =>
                    setPlanForm((f: any) => ({
                      ...f,
                      maxPhotosPerProperty: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-3 border rounded-lg p-3">
              <p className="text-sm font-medium">Features</p>
              {[
                { k: "bookingManagementEnabled", l: "Booking management" },
                { k: "analyticsEnabled", l: "Analytics dashboard" },
                { k: "priorityPlacement", l: "Priority placement" },
              ].map(({ k, l }) => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="font-normal">{l}</Label>
                  <Switch
                    checked={!!planForm[k]}
                    onCheckedChange={(v: boolean) =>
                      setPlanForm((f: any) => ({ ...f, [k]: v }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={planForm.sortOrder}
                  onChange={(e: any) =>
                    setPlanForm((f: any) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={planForm.isActive}
                  onCheckedChange={(v: boolean) =>
                    setPlanForm((f: any) => ({ ...f, isActive: v }))
                  }
                />
                <Label className="font-normal">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => savePlanMutation.mutate(planForm)}
              disabled={savePlanMutation.isPending}
            >
              {savePlanMutation.isPending ? "Saving..." : "Save plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Account Create/Edit Dialog */}
      <Dialog
        open={showPaymentAccountDialog}
        onOpenChange={setShowPaymentAccountDialog}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPaymentAccount
                ? "Edit Payment Account"
                : "Add Payment Account"}
            </DialogTitle>
            <DialogDescription>
              This will be shown to owners when they subscribe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Account Type</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={paymentAccountForm.accountType}
                  onChange={(e) =>
                    setPaymentAccountForm((f: any) => ({
                      ...f,
                      accountType: e.target.value,
                    }))
                  }
                >
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  value={paymentAccountForm.priority}
                  onChange={(e) =>
                    setPaymentAccountForm((f: any) => ({
                      ...f,
                      priority: e.target.value,
                    }))
                  }
                >
                  <option value="primary">Primary (shown first)</option>
                  <option value="secondary">Secondary</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Account / Display Name *</Label>
              <Input
                className="mt-1"
                placeholder="e.g. ZECOHO Payments"
                value={paymentAccountForm.accountName}
                onChange={(e) =>
                  setPaymentAccountForm((f: any) => ({
                    ...f,
                    accountName: e.target.value,
                  }))
                }
              />
            </div>

            {paymentAccountForm.accountType === "upi" && (
              <>
                <div>
                  <Label>UPI ID *</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. zecoho@okaxis"
                    value={paymentAccountForm.upiId}
                    onChange={(e) =>
                      setPaymentAccountForm((f: any) => ({
                        ...f,
                        upiId: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>
                    QR Code Image URL{" "}
                    <span className="text-xs text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    className="mt-1"
                    placeholder="https://..."
                    value={paymentAccountForm.qrCodeUrl}
                    onChange={(e) =>
                      setPaymentAccountForm((f: any) => ({
                        ...f,
                        qrCodeUrl: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload your UPI QR to Google Drive/Cloudinary and paste the
                    public URL here
                  </p>
                  {paymentAccountForm.qrCodeUrl && (
                    <img
                      src={paymentAccountForm.qrCodeUrl}
                      alt="QR Preview"
                      className="w-24 h-24 mt-2 rounded-lg border object-contain bg-white"
                    />
                  )}
                </div>
              </>
            )}

            {paymentAccountForm.accountType === "bank" && (
              <>
                <div>
                  <Label>Bank Name *</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. HDFC Bank"
                    value={paymentAccountForm.bankName}
                    onChange={(e) =>
                      setPaymentAccountForm((f: any) => ({
                        ...f,
                        bankName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Account Number *</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. 50100123456789"
                    value={paymentAccountForm.accountNumber}
                    onChange={(e) =>
                      setPaymentAccountForm((f: any) => ({
                        ...f,
                        accountNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>IFSC Code *</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. HDFC0001234"
                      value={paymentAccountForm.ifscCode}
                      onChange={(e) =>
                        setPaymentAccountForm((f: any) => ({
                          ...f,
                          ifscCode: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>
                      Branch{" "}
                      <span className="text-xs text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Connaught Place"
                      value={paymentAccountForm.branchName}
                      onChange={(e) =>
                        setPaymentAccountForm((f: any) => ({
                          ...f,
                          branchName: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Display Order</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={paymentAccountForm.displayOrder}
                  onChange={(e) =>
                    setPaymentAccountForm((f: any) => ({
                      ...f,
                      displayOrder: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={paymentAccountForm.isActive}
                  onCheckedChange={(v: boolean) =>
                    setPaymentAccountForm((f: any) => ({ ...f, isActive: v }))
                  }
                />
                <Label className="font-normal">
                  Active (visible to owners)
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentAccountDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                savePaymentAccountMutation.mutate(paymentAccountForm)
              }
              disabled={
                savePaymentAccountMutation.isPending ||
                !paymentAccountForm.accountName
              }
            >
              {savePaymentAccountMutation.isPending
                ? "Saving..."
                : "Save Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
            <DialogDescription>
              Extend validity for{" "}
              <strong>{selectedSubForExtend?.ownerName}</strong>. Current
              expiry:{" "}
              <strong>
                {selectedSubForExtend?.endDate
                  ? new Date(selectedSubForExtend.endDate).toLocaleDateString(
                      "en-IN",
                    )
                  : "—"}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Number of days to extend</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[7, 15, 30, 60, 90].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant="outline"
                  onClick={() => setExtendDays(String(d))}
                  className={
                    extendDays === String(d)
                      ? "border-primary text-primary"
                      : ""
                  }
                >
                  +{d}d
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExtendDialogOpen(false);
                setSelectedSubForExtend(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedSubForExtend &&
                extendMutation.mutate({
                  subId: selectedSubForExtend.id,
                  days: Number(extendDays),
                })
              }
              disabled={
                extendMutation.isPending ||
                !extendDays ||
                Number(extendDays) < 1
              }
            >
              {extendMutation.isPending
                ? "Extending..."
                : `Extend by ${extendDays} days`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
