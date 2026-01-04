import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Plus, FileCheck, Edit, Eye, Upload, Archive } from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OwnerAgreement } from "@shared/schema";

export default function AdminOwnerAgreements() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  const [selectedAgreement, setSelectedAgreement] = useState<OwnerAgreement | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
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

  const { data: agreements = [], isLoading } = useQuery<OwnerAgreement[]>({
    queryKey: ["/api/admin/owner-agreements"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      return apiRequest("POST", "/api/admin/owner-agreements", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/owner-agreements"] });
      toast({ title: "Success", description: "Owner Agreement draft created successfully" });
      setCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: string; content?: string } }) => {
      return apiRequest("PATCH", `/api/admin/owner-agreements/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/owner-agreements"] });
      toast({ title: "Success", description: "Owner Agreement updated successfully" });
      setEditDialogOpen(false);
      setSelectedAgreement(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/owner-agreements/${id}/publish`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/owner-agreements"] });
      toast({ title: "Success", description: data.message || "Owner Agreement published successfully" });
      setPublishDialogOpen(false);
      setSelectedAgreement(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetCreateForm = () => {
    setNewTitle("");
    setNewContent("");
  };

  const openEditDialog = (agreement: OwnerAgreement) => {
    setSelectedAgreement(agreement);
    setEditTitle(agreement.title);
    setEditContent(agreement.content);
    setEditDialogOpen(true);
  };

  const openPublishDialog = (agreement: OwnerAgreement) => {
    setSelectedAgreement(agreement);
    setPublishDialogOpen(true);
  };

  const openPreviewDialog = (agreement: OwnerAgreement) => {
    setSelectedAgreement(agreement);
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

  const AgreementCard = ({ agreement }: { agreement: OwnerAgreement }) => (
    <Card key={agreement.id} className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate">{agreement.title}</CardTitle>
            <CardDescription className="mt-1">
              Version {agreement.version} {getStatusBadge(agreement.status)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <FileCheck className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {agreement.content.substring(0, 200)}...
        </div>
        <div className="text-xs text-muted-foreground mb-4">
          {agreement.publishedAt ? (
            <span>Published: {new Date(agreement.publishedAt).toLocaleDateString()}</span>
          ) : (
            <span>Created: {new Date(agreement.createdAt!).toLocaleDateString()}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPreviewDialog(agreement)}
            data-testid={`button-preview-agreement-${agreement.id}`}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          {agreement.status === "draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(agreement)}
                data-testid={`button-edit-agreement-${agreement.id}`}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => openPublishDialog(agreement)}
                data-testid={`button-publish-agreement-${agreement.id}`}
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Property Owner Agreement</h1>
          <p className="text-muted-foreground">
            Manage the Property Owner Agreement versions
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-agreement">
          <Plus className="h-4 w-4 mr-2" />
          Create New Version
        </Button>
      </div>

      <Card className="mb-6 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">How Agreement Versioning Works</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                When you publish a new agreement version, the previous published version is automatically archived. 
                All property owners will be required to accept the new version before accessing owner features.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {agreements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No Owner Agreement versions yet</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Create First Version
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agreements.map((agreement) => (
            <AgreementCard key={agreement.id} agreement={agreement} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Owner Agreement Version</DialogTitle>
            <DialogDescription>
              Create a new draft version of the Property Owner Agreement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agreement-title">Title</Label>
              <Input
                id="agreement-title"
                placeholder="ZECOHO – Property Owner Agreement"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                data-testid="input-agreement-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agreement-content">Content</Label>
              <Textarea
                id="agreement-content"
                placeholder="Enter the full agreement content here..."
                className="min-h-[300px] font-mono text-sm"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                data-testid="input-agreement-content"
              />
              <p className="text-xs text-muted-foreground">
                You can use plain text or markdown formatting
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate({ title: newTitle, content: newContent })}
              disabled={!newTitle.trim() || !newContent.trim() || createMutation.isPending}
              data-testid="button-submit-create"
            >
              {createMutation.isPending ? "Creating..." : "Create Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Owner Agreement Draft</DialogTitle>
            <DialogDescription>
              Modify the draft agreement content (Version {selectedAgreement?.version})
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
                className="min-h-[300px] font-mono text-sm"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                data-testid="input-edit-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAgreement) {
                  updateMutation.mutate({
                    id: selectedAgreement.id,
                    data: { title: editTitle, content: editContent },
                  });
                }
              }}
              disabled={!editTitle.trim() || !editContent.trim() || updateMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Owner Agreement</DialogTitle>
            <DialogDescription>
              Are you sure you want to publish Version {selectedAgreement?.version}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> Publishing this version will:
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 list-disc list-inside space-y-1">
                <li>Archive the current published version (if any)</li>
                <li>Make this the active Owner Agreement</li>
                <li>Require all property owners to re-accept the agreement</li>
                <li>Block owner features until they accept the new version</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAgreement) {
                  publishMutation.mutate(selectedAgreement.id);
                }
              }}
              disabled={publishMutation.isPending}
              data-testid="button-confirm-publish"
            >
              {publishMutation.isPending ? "Publishing..." : "Publish Agreement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAgreement?.title}</DialogTitle>
            <DialogDescription>
              Version {selectedAgreement?.version} • {getStatusBadge(selectedAgreement?.status || "draft")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {selectedAgreement?.content}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
