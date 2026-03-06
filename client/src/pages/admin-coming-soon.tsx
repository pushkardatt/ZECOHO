import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Radio,
  Users,
  UserPlus,
  Trash2,
  Mail,
  Download,
  RefreshCw,
} from "lucide-react";
import type { SiteSettings } from "@shared/schema";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  createdAt: string;
}

interface WhitelistEntry {
  id: string;
  email: string;
  note: string | null;
  addedBy: string | null;
  createdAt: string;
}

export default function AdminComingSoon() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");

  const { data: settings, isLoading: loadingSettings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const { data: waitlist = [], isLoading: loadingWaitlist } = useQuery<WaitlistEntry[]>({
    queryKey: ["/api/admin/waitlist"],
    staleTime: 30000,
  });

  const { data: whitelist = [], isLoading: loadingWhitelist } = useQuery<WhitelistEntry[]>({
    queryKey: ["/api/admin/whitelist"],
    staleTime: 30000,
  });

  const toggleModeMutation = useMutation({
    mutationFn: (enable: boolean) =>
      apiRequest("PATCH", "/api/admin/site-settings", { comingSoonMode: enable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coming-soon/access"] });
      toast({ title: "Updated", description: "Coming Soon mode has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update mode.", variant: "destructive" });
    },
  });

  const addWhitelistMutation = useMutation({
    mutationFn: ({ email, note }: { email: string; note: string }) =>
      apiRequest("POST", "/api/admin/whitelist", { email, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whitelist"] });
      setNewEmail("");
      setNewNote("");
      toast({ title: "Added", description: "Email added to tester whitelist." });
    },
    onError: async (err: any) => {
      let msg = "Failed to add email.";
      try { const b = await err.response?.json(); if (b?.message) msg = b.message; } catch {}
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const removeWhitelistMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/whitelist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whitelist"] });
      toast({ title: "Removed", description: "Email removed from whitelist." });
    },
  });

  const deleteWaitlistMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/waitlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/waitlist"] });
      toast({ title: "Deleted", description: "Waitlist entry removed." });
    },
  });

  if (!user || user.userRole !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
          <Button onClick={() => setLocation("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const isComingSoonOn = settings?.comingSoonMode ?? false;
  const enabledAt = settings?.comingSoonEnabledAt
    ? new Date(settings.comingSoonEnabledAt).toLocaleString()
    : null;

  const exportWaitlistCSV = () => {
    if (!waitlist.length) return;
    const header = "Name,Email,Phone,Message,Date";
    const rows = waitlist.map(e =>
      [e.name, e.email, e.phone || "", (e.message || "").replace(/,/g, ";"), new Date(e.createdAt).toLocaleDateString()].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "waitlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back-admin"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Coming Soon Mode</h1>
            <p className="text-sm text-muted-foreground">Control site access and manage early visitors</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <Card className="mb-4" data-testid="card-coming-soon-toggle">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4" />
              Site Mode
            </CardTitle>
            <CardDescription>
              When Coming Soon mode is ON, only existing users, admins, and whitelisted testers can access the site. All other visitors see the Coming Soon page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isComingSoonOn ? "bg-amber-500" : "bg-green-500"}`} />
                    <div>
                      <p className="font-medium text-sm">
                        {isComingSoonOn ? "Coming Soon — Site is restricted" : "Live — Site is open to everyone"}
                      </p>
                      {isComingSoonOn && enabledAt && (
                        <p className="text-xs text-muted-foreground">Enabled at: {enabledAt}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={isComingSoonOn ? "destructive" : "default"}
                    disabled={toggleModeMutation.isPending}
                    onClick={() => toggleModeMutation.mutate(!isComingSoonOn)}
                    data-testid="button-toggle-coming-soon"
                  >
                    {toggleModeMutation.isPending
                      ? "Updating..."
                      : isComingSoonOn
                      ? "Turn OFF (Go Live)"
                      : "Turn ON Coming Soon"}
                  </Button>
                </div>
                {isComingSoonOn && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    <strong>To test:</strong> Open an incognito / private browser window and visit the site — admin accounts always bypass the gate automatically.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tester Whitelist */}
        <Card className="mb-4" data-testid="card-whitelist">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Tester Whitelist
              <Badge variant="secondary">{whitelist.length}</Badge>
            </CardTitle>
            <CardDescription>
              Add email addresses that can access the site even when Coming Soon mode is ON.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add form */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="flex-1 min-w-0"
                  data-testid="input-whitelist-email"
                  onKeyDown={e => {
                    if (e.key === "Enter" && newEmail.trim()) {
                      e.preventDefault();
                      addWhitelistMutation.mutate({ email: newEmail.trim(), note: newNote.trim() });
                    }
                  }}
                />
                <Button
                  onClick={() => addWhitelistMutation.mutate({ email: newEmail.trim(), note: newNote.trim() })}
                  disabled={!newEmail.trim() || addWhitelistMutation.isPending}
                  data-testid="button-whitelist-add"
                >
                  {addWhitelistMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Add Tester"}
                </Button>
              </div>
              <Input
                placeholder="Note (optional — e.g. 'QA team')"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                data-testid="input-whitelist-note"
              />
            </div>

            {/* Whitelist entries */}
            {loadingWhitelist ? (
              <div className="space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : whitelist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No testers added yet.</p>
            ) : (
              <div className="space-y-2">
                {whitelist.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                    data-testid={`whitelist-entry-${entry.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{entry.email}</span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-5">{entry.note}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWhitelistMutation.mutate(entry.id)}
                      disabled={removeWhitelistMutation.isPending}
                      data-testid={`button-whitelist-remove-${entry.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Waitlist signups */}
        <Card data-testid="card-waitlist">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Waitlist Signups
                  <Badge variant="secondary">{waitlist.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Visitors who submitted their info from the Coming Soon page.
                </CardDescription>
              </div>
              {waitlist.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportWaitlistCSV}
                  data-testid="button-export-waitlist"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export CSV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingWaitlist ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : waitlist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No signups yet. Once Coming Soon mode is ON, visitors can join the waitlist.
              </p>
            ) : (
              <div className="space-y-2">
                {waitlist.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50"
                    data-testid={`waitlist-entry-${entry.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.email}</p>
                      {entry.phone && (
                        <p className="text-xs text-muted-foreground">{entry.phone}</p>
                      )}
                      {entry.message && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{entry.message}"</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWaitlistMutation.mutate(entry.id)}
                      disabled={deleteWaitlistMutation.isPending}
                      data-testid={`button-waitlist-delete-${entry.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
