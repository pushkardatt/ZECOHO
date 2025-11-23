import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
  accept?: Record<string, string[]>;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  accept,
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
    
    for (const file of fileArray) {
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `File size must be less than ${(maxFileSize / 1024 / 1024).toFixed(2)}MB`,
          variant: "destructive",
        });
        continue;
      }

      setUploading(true);
      setProgress(0);

      try {
        const { url } = await onGetUploadParameters();
        
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setProgress(percentComplete);
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

        onComplete?.({
          successful: [{ uploadURL: url }],
        });

        toast({
          title: "Success",
          description: "File uploaded successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        setProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
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
