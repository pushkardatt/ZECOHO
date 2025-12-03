import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  X,
  FileText,
  Home,
  IdCard,
  Building,
  Shield,
  Flame,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { KycDocument } from "@shared/schema";

interface DocumentCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  required: boolean;
  documentTypes: { value: string; label: string; description?: string }[];
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: "propertyOwnership",
    label: "Property Ownership Proof",
    icon: Home,
    description: "Submit any ONE of the following documents",
    required: true,
    documentTypes: [
      { value: "property_registration", label: "Property Registration Document", description: "Official registration from sub-registrar" },
      { value: "sale_deed", label: "Sale Deed", description: "Legal sale agreement document" },
      { value: "property_tax", label: "Property Tax Receipt", description: "Latest property tax payment receipt" },
      { value: "lease_agreement", label: "Lease Agreement", description: "If renting out but legally allowed to operate" },
    ],
  },
  {
    id: "identityProof",
    label: "Owner Identity Proof",
    icon: IdCard,
    description: "Submit any ONE valid government ID",
    required: true,
    documentTypes: [
      { value: "passport", label: "Passport", description: "Valid Indian passport" },
      { value: "aadhaar", label: "Aadhaar Card", description: "UIDAI issued Aadhaar" },
      { value: "voter_id", label: "Voter ID", description: "Election Commission ID card" },
      { value: "driving_license", label: "Driving License", description: "Valid DL from any RTO" },
    ],
  },
  {
    id: "businessLicense",
    label: "Business/Hotel License",
    icon: Building,
    description: "Depending on local rules, submit applicable licenses",
    required: false,
    documentTypes: [
      { value: "trade_license", label: "Trade License / Shop & Establishment", description: "Local body issued trade license" },
      { value: "hotel_registration", label: "Hotel/Guest House Registration", description: "Tourism dept registration certificate" },
      { value: "gst_registration", label: "GST Registration", description: "If turnover exceeds threshold" },
    ],
  },
  {
    id: "noc",
    label: "NOC (No Objection Certificate)",
    icon: Shield,
    description: "If required by local authorities",
    required: false,
    documentTypes: [
      { value: "owner_noc", label: "NOC from Property Owner", description: "If lister is manager or tenant" },
      { value: "municipality_noc", label: "NOC from Municipality", description: "Local authority clearance (recommended)" },
    ],
  },
  {
    id: "safetyCertificates",
    label: "Safety & Compliance Certificates",
    icon: Flame,
    description: "Required if operating commercially",
    required: false,
    documentTypes: [
      { value: "fire_safety", label: "Fire Safety Certificate", description: "Fire dept NOC for commercial operation" },
      { value: "electrical_safety", label: "Electrical Safety Certificate", description: "Certified electrical inspection" },
      { value: "lift_safety", label: "Lift Safety Certificate", description: "Only if lifts are present" },
    ],
  },
];

interface KycDocuments {
  propertyOwnership: KycDocument[];
  identityProof: KycDocument[];
  businessLicense: KycDocument[];
  noc: KycDocument[];
  safetyCertificates: KycDocument[];
}

interface KycDocumentUploaderProps {
  value: KycDocuments;
  onChange: (docs: KycDocuments) => void;
}

export function KycDocumentUploader({ value, onChange }: KycDocumentUploaderProps) {
  const { toast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["propertyOwnership", "identityProof"]);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({});

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleDocumentUpload = (categoryId: string, result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedUrl = result.successful[0].uploadURL;
      const documentType = selectedTypes[categoryId] || "other";
      
      const newDoc: KycDocument = {
        url: uploadedUrl,
        documentType,
        fileName: result.successful[0].name || `Document ${(value[categoryId as keyof KycDocuments]?.length || 0) + 1}`,
        uploadedAt: new Date().toISOString(),
      };

      const categoryKey = categoryId as keyof KycDocuments;
      onChange({
        ...value,
        [categoryKey]: [...(value[categoryKey] || []), newDoc],
      });

      toast({
        title: "Document uploaded",
        description: `${DOCUMENT_CATEGORIES.find((c) => c.id === categoryId)?.label} added successfully`,
      });
    }
  };

  const handleRemoveDocument = (categoryId: string, index: number) => {
    const categoryKey = categoryId as keyof KycDocuments;
    const newDocs = [...(value[categoryKey] || [])];
    newDocs.splice(index, 1);
    onChange({
      ...value,
      [categoryKey]: newDocs,
    });
  };

  const getCategoryStatus = (categoryId: string, isRequired: boolean): "complete" | "pending" | "optional" => {
    const docs = value[categoryId as keyof KycDocuments] || [];
    if (docs.length > 0) return "complete";
    if (isRequired) return "pending";
    return "optional";
  };

  const getStatusBadge = (status: "complete" | "pending" | "optional") => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><Check className="h-3 w-3 mr-1" />Uploaded</Badge>;
      case "pending":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Required</Badge>;
      case "optional":
        return <Badge variant="secondary">Optional</Badge>;
    }
  };

  const isComplete = () => {
    return DOCUMENT_CATEGORIES
      .filter((cat) => cat.required)
      .every((cat) => (value[cat.id as keyof KycDocuments]?.length || 0) > 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">KYC Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload required documents for verification
          </p>
        </div>
        <Badge variant={isComplete() ? "default" : "secondary"}>
          {isComplete() ? (
            <><Check className="h-3 w-3 mr-1" />Ready for submission</>
          ) : (
            <>Upload required documents</>
          )}
        </Badge>
      </div>

      <div className="space-y-3">
        {DOCUMENT_CATEGORIES.map((category) => {
          const status = getCategoryStatus(category.id, category.required);
          const isExpanded = expandedCategories.includes(category.id);
          const docs = value[category.id as keyof KycDocuments] || [];
          const Icon = category.icon;

          return (
            <Collapsible
              key={category.id}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <Card className={status === "complete" ? "border-green-200 dark:border-green-800" : ""}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover-elevate rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${status === "complete" ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                          <Icon className={`h-5 w-5 ${status === "complete" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {category.label}
                            {docs.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {docs.length} file{docs.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-sm">{category.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Accepted Documents:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {category.documentTypes.map((type) => (
                          <label
                            key={type.value}
                            className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                              selectedTypes[category.id] === type.value
                                ? "bg-primary/10 border border-primary"
                                : "hover:bg-muted"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`docType-${category.id}`}
                              value={type.value}
                              checked={selectedTypes[category.id] === type.value}
                              onChange={() => setSelectedTypes((prev) => ({ ...prev, [category.id]: type.value }))}
                              className="mt-1"
                            />
                            <div>
                              <span className="text-sm font-medium">{type.label}</span>
                              {type.description && (
                                <p className="text-xs text-muted-foreground">{type.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {selectedTypes[category.id] ? (
                          <ObjectUploader
                            maxNumberOfFiles={3}
                            maxFileSize={10485760}
                            onGetUploadParameters={handleGetUploadParameters}
                            onComplete={(result) => handleDocumentUpload(category.id, result)}
                            accept={{
                              'image/*': ['.jpeg', '.jpg', '.png'],
                              'application/pdf': ['.pdf'],
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload {category.documentTypes.find(t => t.value === selectedTypes[category.id])?.label || "Document"}
                          </ObjectUploader>
                        ) : (
                          <Button variant="outline" disabled>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Document
                          </Button>
                        )}
                      </div>
                      {!selectedTypes[category.id] && (
                        <p className="text-sm text-muted-foreground">
                          Select a document type above, then upload your file
                        </p>
                      )}
                      {selectedTypes[category.id] && docs.length === 0 && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Click the button above to upload your {category.documentTypes.find(t => t.value === selectedTypes[category.id])?.label}
                        </p>
                      )}
                    </div>

                    {docs.length > 0 && (
                      <div className="space-y-2">
                        {docs.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{doc.fileName || `Document ${idx + 1}`}</p>
                                <p className="text-xs text-muted-foreground">
                                  {category.documentTypes.find((t) => t.value === doc.documentType)?.label || doc.documentType}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveDocument(category.id, idx)}
                              data-testid={`button-remove-${category.id}-doc-${idx}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

export const defaultKycDocuments: KycDocuments = {
  propertyOwnership: [],
  identityProof: [],
  businessLicense: [],
  noc: [],
  safetyCertificates: [],
};

export type { KycDocuments };
