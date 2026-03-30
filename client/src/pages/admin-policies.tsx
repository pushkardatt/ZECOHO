import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Plus, FileText, Shield, Edit, Eye, Upload, Archive, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Policy } from "@shared/schema";

export default function AdminPolicies() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [newPolicyType, setNewPolicyType] = useState<"terms" | "privacy">("terms");
  const [newPolicyTitle, setNewPolicyTitle] = useState("");
  const [newPolicyContent, setNewPolicyContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  if (user?.userRole !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You need admin privileges to access this panel.
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { data: policies = [], isLoading } = useQuery<Policy[]>({
    queryKey: ["/api/admin/policies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; content: string }) => {
      return apiRequest("POST", "/api/admin/policies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
      toast({ title: "Success", description: "Policy draft created successfully" });
      setCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: string; content?: string } }) => {
      return apiRequest("PATCH", `/api/admin/policies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
      toast({ title: "Success", description: "Policy updated successfully" });
      setEditDialogOpen(false);
      setSelectedPolicy(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/policies/${id}/publish`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
      toast({ title: "Success", description: data.message || "Policy published successfully" });
      setPublishDialogOpen(false);
      setSelectedPolicy(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetCreateForm = () => {
    setNewPolicyType("terms");
    setNewPolicyTitle("");
    setNewPolicyContent("");
  };

  const handleDownload = (policy: Policy) => {
    const typeLabel = policy.type === "terms" ? "Terms & Conditions" : "Privacy Policy";
    const dateStr = policy.publishedAt
      ? `Published: ${new Date(policy.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`
      : `Created: ${new Date(policy.createdAt!).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`;

    const header = [
      "=".repeat(70),
      `ZECOHO - ${typeLabel.toUpperCase()}`,
      `${policy.title}`,
      `Version: ${policy.version}  |  Status: ${policy.status.toUpperCase()}`,
      dateStr,
      "=".repeat(70),
      "",
    ].join("\n");

    const blob = new Blob([header + policy.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slug = policy.type === "terms" ? "terms-and-conditions" : "privacy-policy";
    link.download = `zecoho-${slug}-v${policy.version}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openEditDialog = (policy: Policy) => {
    setSelectedPolicy(policy);
    setEditTitle(policy.title);
    setEditContent(policy.content);
    setEditDialogOpen(true);
  };

  const openPublishDialog = (policy: Policy) => {
    setSelectedPolicy(policy);
    setPublishDialogOpen(true);
  };

  const openPreviewDialog = (policy: Policy) => {
    setSelectedPolicy(policy);
    setPreviewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Published</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const termsPolicies = policies.filter(p => p.type === "terms");
  const privacyPolicies = policies.filter(p => p.type === "privacy");

  const PolicyCard = ({ policy }: { policy: Policy }) => (
    <Card key={policy.id} className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate">{policy.title}</CardTitle>
            <CardDescription className="mt-1">
              Version {policy.version} {getStatusBadge(policy.status)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {policy.type === "terms" ? (
              <FileText className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {policy.content.substring(0, 200)}...
        </div>
        <div className="text-xs text-muted-foreground mb-4">
          {policy.publishedAt ? (
            <span>Published: {new Date(policy.publishedAt).toLocaleDateString()}</span>
          ) : (
            <span>Created: {new Date(policy.createdAt!).toLocaleDateString()}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPreviewDialog(policy)}
            data-testid={`button-preview-policy-${policy.id}`}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(policy)}
            data-testid={`button-download-policy-${policy.id}`}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          {policy.status === "draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(policy)}
                data-testid={`button-edit-policy-${policy.id}`}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => openPublishDialog(policy)}
                data-testid={`button-publish-policy-${policy.id}`}
              >
                <Upload className="h-4 w-4 mr-1" />
                Publish
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Policy Management</h1>
          <p className="text-muted-foreground">
            Manage Terms & Conditions and Privacy Policy versions
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-policy">
          <Plus className="h-4 w-4 mr-2" />
          Create New Version
        </Button>
      </div>

      <Card className="mb-6 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">How Policy Versioning Works</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                When you publish a new policy version, the previous published version is automatically archived. 
                All users will be required to accept the new version on their next login.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="terms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="terms" data-testid="tab-terms">
            <FileText className="h-4 w-4 mr-2" />
            Terms & Conditions ({termsPolicies.length})
          </TabsTrigger>
          <TabsTrigger value="privacy" data-testid="tab-privacy">
            <Shield className="h-4 w-4 mr-2" />
            Privacy Policy ({privacyPolicies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terms">
          {termsPolicies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No Terms & Conditions policies yet</p>
                <Button onClick={() => { setNewPolicyType("terms"); setCreateDialogOpen(true); }}>
                  Create First Version
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {termsPolicies.map((policy) => (
                <PolicyCard key={policy.id} policy={policy} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="privacy">
          {privacyPolicies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No Privacy Policy versions yet</p>
                <Button onClick={() => { setNewPolicyType("privacy"); setCreateDialogOpen(true); }}>
                  Create First Version
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {privacyPolicies.map((policy) => (
                <PolicyCard key={policy.id} policy={policy} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Policy Version</DialogTitle>
            <DialogDescription>
              Create a new draft version of your Terms or Privacy Policy
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="policy-type">Policy Type</Label>
              <Select value={newPolicyType} onValueChange={(v: "terms" | "privacy") => setNewPolicyType(v)}>
                <SelectTrigger data-testid="select-policy-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terms">Terms & Conditions</SelectItem>
                  <SelectItem value="privacy">Privacy Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-title">Title</Label>
              <Input
                id="policy-title"
                placeholder={newPolicyType === "terms" ? "Terms & Conditions" : "Privacy Policy"}
                value={newPolicyTitle}
                onChange={(e) => setNewPolicyTitle(e.target.value)}
                data-testid="input-policy-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-content">Content</Label>
              <Textarea
                id="policy-content"
                placeholder="Enter policy content..."
                value={newPolicyContent}
                onChange={(e) => setNewPolicyContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-policy-content"
              />
              <p className="text-xs text-muted-foreground">
                Supports plain text. Use line breaks for paragraphs.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetCreateForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate({ type: newPolicyType, title: newPolicyTitle, content: newPolicyContent })}
              disabled={!newPolicyTitle.trim() || !newPolicyContent.trim() || createMutation.isPending}
              data-testid="button-save-policy"
            >
              {createMutation.isPending ? "Creating..." : "Create Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Policy Draft</DialogTitle>
            <DialogDescription>
              Update the content of this draft policy
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                data-testid="input-edit-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-edit-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedPolicy && updateMutation.mutate({ id: selectedPolicy.id, data: { title: editTitle, content: editContent } })}
              disabled={!editTitle.trim() || !editContent.trim() || updateMutation.isPending}
              data-testid="button-update-policy"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to publish this policy version?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> Publishing this policy will:
              </p>
              <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                <li>Archive the current published version (if any)</li>
                <li>Make this version the active policy</li>
                <li>Require all users to accept the new version on their next login</li>
              </ul>
            </div>
            {selectedPolicy && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedPolicy.title}</p>
                <p className="text-sm text-muted-foreground">Version {selectedPolicy.version}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedPolicy && publishMutation.mutate(selectedPolicy.id)}
              disabled={publishMutation.isPending}
              data-testid="button-confirm-publish"
            >
              {publishMutation.isPending ? "Publishing..." : "Publish Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPolicy?.title}</DialogTitle>
            <DialogDescription>
              Version {selectedPolicy?.version} - {selectedPolicy?.status}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="prose dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm bg-muted p-4 rounded-lg">
                {selectedPolicy?.content}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            {selectedPolicy && (
              <Button onClick={() => handleDownload(selectedPolicy)} data-testid="button-download-preview-policy">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
