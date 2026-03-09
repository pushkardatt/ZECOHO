import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Upload, Image, Trash2, Save, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import type { SiteSettings } from "@shared/schema";

interface UploadUrlResponse {
  uploadURL: string;
  accessPath: string;
  aclToken: string;
}

export default function AdminLogo() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoAlt, setLogoAlt] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: siteSettings, isLoading: isLoadingSettings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
    enabled: user?.userRole === "admin",
    staleTime: 0,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { logoUrl?: string | null; logoAlt?: string }) => {
      return apiRequest("PATCH", "/api/admin/site-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Logo settings saved", description: "Your logo has been updated." });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save logo settings.", variant: "destructive" });
    },
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (user?.userRole !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm mb-4">Admin access required.</p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">Back to Home</Button>
        </div>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PNG, JPG, SVG, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 5 MB.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadAndSave = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      // apiRequest returns a Response — must call .json() to get the body
      const uploadRes = await apiRequest("POST", "/api/objects/upload");
      const uploadData: UploadUrlResponse = await uploadRes.json();

      // Upload the file directly to object storage
      const putRes = await fetch(uploadData.uploadURL, {
        method: "PUT",
        body: selectedFile,
        headers: { "Content-Type": selectedFile.type },
      });
      if (!putRes.ok) throw new Error("File upload to storage failed");

      // Make the object publicly accessible
      await apiRequest("POST", "/api/objects/set-acl", {
        accessPath: uploadData.accessPath,
        aclToken: uploadData.aclToken,
        visibility: "public",
      });

      await updateSettingsMutation.mutateAsync({
        logoUrl: uploadData.accessPath,
        logoAlt: logoAlt || siteSettings?.logoAlt || "ZECOHO",
      });
    } catch (err) {
      console.error("Logo upload error:", err);
      toast({ title: "Upload failed", description: "Could not upload the logo. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveAltOnly = () => {
    updateSettingsMutation.mutate({ logoAlt: logoAlt || siteSettings?.logoAlt || "ZECOHO" });
  };

  const handleRemoveLogo = () => {
    updateSettingsMutation.mutate({ logoUrl: null });
  };

  const currentLogoUrl = siteSettings?.logoUrl;
  const effectiveAlt = logoAlt || siteSettings?.logoAlt || "ZECOHO";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back-admin"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Logo Settings</h1>
            <p className="text-muted-foreground text-sm">Upload and manage the website logo</p>
          </div>
        </div>

        {/* Current Logo Preview */}
        <Card className="mb-4" data-testid="card-current-logo">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="w-4 h-4" />
              Current Logo
            </CardTitle>
            <CardDescription>This logo is displayed in the site header and across all pages.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSettings ? (
              <Skeleton className="h-20 w-48" />
            ) : currentLogoUrl ? (
              <div className="flex flex-col gap-4">
                <div className="border rounded-md p-4 bg-muted/30 inline-flex items-center justify-center min-h-20">
                  <img
                    src={currentLogoUrl}
                    alt={siteSettings?.logoAlt || "ZECOHO"}
                    className="max-h-16 max-w-xs object-contain"
                    data-testid="img-current-logo"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Custom logo is active. Alt text: <span className="font-medium text-foreground">{siteSettings?.logoAlt}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={updateSettingsMutation.isPending}
                  className="w-fit"
                  data-testid="button-remove-logo"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Remove Logo (revert to default)
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="border rounded-md p-4 bg-muted/30 inline-flex items-center justify-center min-h-20">
                  <span className="font-bold text-xl text-muted-foreground">ZECOHO</span>
                </div>
                <p className="text-sm text-muted-foreground">Using the default text/SVG logo. Upload an image below to replace it.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="my-4" />

        {/* Upload New Logo */}
        <Card className="mb-4" data-testid="card-upload-logo">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload New Logo
            </CardTitle>
            <CardDescription>PNG, JPG, SVG or WebP. Max 5 MB. Recommended size: 200×60 px.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Use a transparent background image (PNG or SVG) for best results across light and dark themes.
              </AlertDescription>
            </Alert>

            <div
              className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover-elevate transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-logo"
            >
              {previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-16 max-w-xs object-contain"
                    data-testid="img-logo-preview"
                  />
                  <p className="text-sm text-muted-foreground">{selectedFile?.name} — click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="w-8 h-8" />
                  <p className="text-sm font-medium">Click to select a file</p>
                  <p className="text-xs">or drag and drop</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-logo-file"
            />

            <div className="space-y-2">
              <Label htmlFor="logo-alt" data-testid="label-logo-alt">Alt Text (accessibility)</Label>
              <Input
                id="logo-alt"
                placeholder={siteSettings?.logoAlt || "ZECOHO"}
                value={logoAlt}
                onChange={(e) => setLogoAlt(e.target.value)}
                data-testid="input-logo-alt"
              />
              <p className="text-xs text-muted-foreground">Describes the logo for screen readers and when the image fails to load.</p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleUploadAndSave}
                disabled={!selectedFile || isUploading || updateSettingsMutation.isPending}
                data-testid="button-upload-save"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading…" : "Upload & Save Logo"}
              </Button>
              {!selectedFile && (
                <Button
                  variant="outline"
                  onClick={handleSaveAltOnly}
                  disabled={!logoAlt || updateSettingsMutation.isPending}
                  data-testid="button-save-alt"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Alt Text Only
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
