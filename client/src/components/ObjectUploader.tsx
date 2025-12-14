import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
    accessPath: string;
    aclToken: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string; accessPath: string; name?: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
  accept?: Record<string, string[]>;
  visibility?: "public" | "private";
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  accept,
  visibility = "private",
}: ObjectUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const acceptString = accept
    ? Object.entries(accept)
        .map(([type, exts]) => [type, ...exts].join(','))
        .join(',')
    : undefined;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files).slice(0, maxNumberOfFiles);
    const validFiles = fileArray.filter(file => {
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds ${(maxFileSize / 1024 / 1024).toFixed(2)}MB limit`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    setProgress(0);

    const successfulUploads: Array<{ uploadURL: string; accessPath: string; name?: string }> = [];
    const totalFiles = validFiles.length;
    let completedFiles = 0;

    for (const file of validFiles) {
      try {
        const { url, accessPath, aclToken } = await onGetUploadParameters();
        
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const fileProgress = (e.loaded / e.total) * 100;
            const overallProgress = ((completedFiles * 100) + fileProgress) / totalFiles;
            setProgress(overallProgress);
          }
        });

        await new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(null);
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.open("PUT", url);
          xhr.send(file);
        });

        // Set ACL policy so the owner can access the file later
        await apiRequest("POST", "/api/objects/set-acl", { accessPath, aclToken, visibility });

        successfulUploads.push({ uploadURL: url, accessPath, name: file.name });
        completedFiles++;
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
        completedFiles++;
      }
    }

    // Call onComplete once with all successful uploads
    if (successfulUploads.length > 0) {
      onComplete?.({
        successful: successfulUploads,
      });

      toast({
        title: "Success",
        description: `${successfulUploads.length} file${successfulUploads.length > 1 ? 's' : ''} uploaded successfully`,
      });
    }

    setUploading(false);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxNumberOfFiles > 1}
        accept={acceptString}
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-file-upload"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={buttonClassName}
      >
        {uploading ? "Uploading..." : children}
      </Button>
      {uploading && <Progress value={progress} className="w-full" />}
    </div>
  );
}
