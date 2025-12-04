import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Building2, FileText, User, MapPin, Phone, Mail, Loader2, Upload, CheckCircle, Clock, XCircle, RefreshCw, AlertTriangle, Home, IdCard, Shield, Flame } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { INDIAN_STATES, INDIAN_CITIES } from "@/data/locations";
import { KycDocumentUploader, defaultKycDocuments, type KycDocuments } from "@/components/KycDocumentUploader";
import { useLocation } from "wouter";
import type { KycApplication, KycSectionId, KycRejectionDetails } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const SECTION_LABELS: Record<KycSectionId, { label: string; icon: any }> = {
  personal: { label: "Personal Information", icon: User },
  business: { label: "Business Information", icon: MapPin },
  propertyOwnership: { label: "Property Ownership Documents", icon: Home },
  identityProof: { label: "Identity Proof Documents", icon: IdCard },
  businessLicense: { label: "Business License Documents", icon: Building2 },
  noc: { label: "NOC Documents", icon: Shield },
  safetyCertificates: { label: "Safety Certificate Documents", icon: Flame },
};

const kycSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  
  // Business Information
  businessName: z.string().min(3, "Business name is required"),
  businessAddress: z.string().min(10, "Please provide complete business address"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(6, "Valid pincode is required"),
  gstNumber: z.string().optional(),
  panNumber: z.string().min(10, "Valid PAN number is required"),
});

type KYCFormData = z.infer<typeof kycSchema>;

export default function KYC() {
  const { toast } = useToast();
  const { user, refetch: refetchUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPincodeLookup, setIsPincodeLookup] = useState(false);
  const [kycDocuments, setKycDocuments] = useState<KycDocuments>(defaultKycDocuments);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch existing KYC application status
  const { data: kycApplication, refetch: refetchKyc, isLoading: isLoadingKyc } = useQuery<KycApplication>({
    queryKey: ["/api/kyc/status"],
    enabled: !!user,
  });

  // Handle refresh to check for updates
  const handleRefreshStatus = async () => {
    await refetchUser();
    await refetchKyc();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    toast({
      title: "Status Refreshed",
      description: "Checking for updates...",
    });
  };

  const form = useForm<KYCFormData>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      businessName: "",
      businessAddress: "",
      city: "",
      state: "",
      pincode: "",
      gstNumber: "",
      panNumber: "",
    },
  });

  // Pre-fill form when editing a rejected application
  useEffect(() => {
    if (kycApplication && isEditing) {
      form.reset({
        firstName: kycApplication.firstName || "",
        lastName: kycApplication.lastName || "",
        email: kycApplication.email || "",
        phone: kycApplication.phone || "",
        businessName: kycApplication.businessName || "",
        businessAddress: kycApplication.businessAddress || "",
        city: kycApplication.city || "",
        state: kycApplication.state || "",
        pincode: kycApplication.pincode || "",
        gstNumber: kycApplication.gstNumber || "",
        panNumber: kycApplication.panNumber || "",
      });
      // Pre-fill documents
      setKycDocuments({
        propertyOwnership: (kycApplication.propertyOwnershipDocs as any[]) || [],
        identityProof: (kycApplication.identityProofDocs as any[]) || [],
        businessLicense: (kycApplication.businessLicenseDocs as any[]) || [],
        noc: (kycApplication.nocDocs as any[]) || [],
        safetyCertificates: (kycApplication.safetyCertificateDocs as any[]) || [],
      });
    }
  }, [kycApplication, isEditing, form]);

  // PIN code lookup function
  const handlePincodeChange = async (pincode: string) => {
    // Only lookup if we have a 6-digit PIN code
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setIsPincodeLookup(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();
        
        if (data && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
          const postOffice = data[0].PostOffice[0];
          
          // Auto-populate city and state
          form.setValue("city", postOffice.District || "");
          form.setValue("state", postOffice.State || "");
          
          toast({
            title: "PIN Code Found!",
            description: `${postOffice.District}, ${postOffice.State}`,
          });
        } else {
          toast({
            title: "Invalid PIN Code",
            description: "Please enter a valid Indian PIN code or manually enter city and state.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("PIN code lookup error:", error);
        toast({
          title: "Lookup Failed",
          description: "Unable to fetch PIN code details. Please enter city and state manually.",
          variant: "destructive",
        });
      } finally {
        setIsPincodeLookup(false);
      }
    }
  };

  const submitKYC = useMutation({
    mutationFn: async (data: KYCFormData) => {
      const response = await apiRequest("POST", "/api/kyc/submit", {
        ...data,
        propertyOwnershipDocs: kycDocuments.propertyOwnership,
        identityProofDocs: kycDocuments.identityProof,
        businessLicenseDocs: kycDocuments.businessLicense,
        nocDocs: kycDocuments.noc,
        safetyCertificateDocs: kycDocuments.safetyCertificates,
      });
      return await response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "KYC Submitted Successfully!",
        description: "We'll review your application and get back to you within 2-3 business days.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Update rejected KYC application
  const updateKYC = useMutation({
    mutationFn: async (data: KYCFormData) => {
      const response = await apiRequest("PATCH", `/api/kyc/${kycApplication?.id}`, {
        ...data,
        propertyOwnershipDocs: kycDocuments.propertyOwnership,
        identityProofDocs: kycDocuments.identityProof,
        businessLicenseDocs: kycDocuments.businessLicense,
        nocDocs: kycDocuments.noc,
        safetyCertificateDocs: kycDocuments.safetyCertificates,
      });
      return await response.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/status"] });
      toast({
        title: "Application Updated!",
        description: "Your updated application has been resubmitted for review.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: KYCFormData) => {
    // Validate mandatory documents before submission
    const missingDocs: string[] = [];
    
    if (!kycDocuments.propertyOwnership || kycDocuments.propertyOwnership.length === 0) {
      missingDocs.push("Property Ownership Proof");
    }
    
    if (!kycDocuments.identityProof || kycDocuments.identityProof.length === 0) {
      missingDocs.push("Owner Identity Proof");
    }
    
    if (missingDocs.length > 0) {
      toast({
        title: "Required Documents Missing",
        description: `Please upload the following mandatory documents: ${missingDocs.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    // If editing a rejected application, update it
    if (isEditing && kycApplication?.id) {
      updateKYC.mutate(data);
    } else {
      submitKYC.mutate(data);
    }
  };

  // Loading state
  if (isLoadingKyc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your application status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending application status
  if (kycApplication?.status === "pending" && !isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl" data-testid="text-pending-title">Application Under Review</CardTitle>
            <CardDescription>
              Your KYC application is being reviewed by our team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-muted-foreground">
              <p className="mb-4">
                We're reviewing your application. You'll be notified once the review is complete.
              </p>
              <p className="mb-4">
                Expected review time: <strong>2-3 business days</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="flex-1"
                onClick={handleRefreshStatus}
                data-testid="button-refresh-status"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Status
              </Button>
              <Button 
                className="flex-1" 
                asChild
                data-testid="button-back-home"
              >
                <a href="/">Back to Home</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parse rejection details
  const rejectionDetails = useMemo(() => {
    if (kycApplication?.rejectionDetails) {
      return kycApplication.rejectionDetails as KycRejectionDetails;
    }
    return null;
  }, [kycApplication?.rejectionDetails]);

  const flaggedSections = useMemo(() => {
    if (!rejectionDetails?.sections) return new Set<KycSectionId>();
    return new Set(rejectionDetails.sections.map(s => s.sectionId));
  }, [rejectionDetails]);

  const hasTargetedRejection = flaggedSections.size > 0;

  // Rejected application status
  if (kycApplication?.status === "rejected" && !isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl" data-testid="text-rejected-title">Application Needs Updates</CardTitle>
            <CardDescription>
              {hasTargetedRejection 
                ? `${flaggedSections.size} section${flaggedSections.size > 1 ? 's' : ''} need${flaggedSections.size === 1 ? 's' : ''} your attention`
                : "Your KYC application requires some changes before it can be approved"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasTargetedRejection && rejectionDetails?.sections && (
              <div className="space-y-3">
                <p className="font-semibold text-sm text-muted-foreground">Sections requiring updates:</p>
                {rejectionDetails.sections.map((section) => {
                  const sectionInfo = SECTION_LABELS[section.sectionId];
                  const Icon = sectionInfo?.icon || AlertTriangle;
                  return (
                    <div 
                      key={section.sectionId}
                      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="font-medium text-red-800 dark:text-red-200">
                          {sectionInfo?.label || section.sectionId}
                        </span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300 ml-6">
                        {section.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            
            {kycApplication.reviewNotes && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1 text-sm">Additional Notes:</p>
                <p className="text-amber-700 dark:text-amber-300 text-sm" data-testid="text-rejection-reason">
                  {kycApplication.reviewNotes}
                </p>
              </div>
            )}
            
            <div className="text-center text-muted-foreground text-sm">
              <p>
                {hasTargetedRejection 
                  ? "Click below to update only the required sections. Your other information has been saved."
                  : "Please review the feedback above and update your application with the required changes."
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-application"
              >
                <FileText className="h-4 w-4 mr-2" />
                Fix & Resubmit
              </Button>
              <Button 
                variant="outline"
                className="flex-1" 
                asChild
                data-testid="button-back-home"
              >
                <a href="/">Back to Home</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verified status - redirect to home or show success
  if (kycApplication?.status === "verified" && !isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl" data-testid="text-verified-title">Already Verified!</CardTitle>
            <CardDescription>
              Your KYC has been approved. You can now list properties.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                asChild
                data-testid="button-list-property"
              >
                <a href="/list-property">List a Property</a>
              </Button>
              <Button 
                variant="outline"
                className="flex-1" 
                asChild
                data-testid="button-back-home"
              >
                <a href="/">Back to Home</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verification Submitted!</CardTitle>
            <CardDescription>
              Thank you for choosing ZECOHO as your property management platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-muted-foreground">
              <p className="mb-4">
                We've received your owner verification application and our team will review it carefully.
              </p>
              <p className="mb-4">
                You'll receive an email within <strong>2-3 business days</strong> regarding your verification status.
              </p>
              <p className="mb-2">
                <strong>Next Steps After Approval:</strong>
              </p>
              <ul className="text-sm text-left max-w-sm mx-auto space-y-1">
                <li>✓ Add unlimited property listings</li>
                <li>✓ Upload property images and videos</li>
                <li>✓ Set your own pricing</li>
                <li>✓ Connect directly with guests</li>
              </ul>
            </div>
            <Button 
              className="w-full" 
              asChild
              data-testid="button-back-home"
            >
              <a href="/">Back to Home</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {isEditing ? "Update Your Application" : "Become a Property Owner"}
          </h1>
          <p className="text-xl text-muted-foreground">
            {isEditing 
              ? "Make the required changes and resubmit for review"
              : "Get verified and start listing your properties at ZERO commission"
            }
          </p>
        </div>

        {isEditing && hasTargetedRejection && rejectionDetails?.sections && (
          <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 dark:text-red-200 mb-3">
                    Please update the following sections:
                  </p>
                  <div className="space-y-2">
                    {rejectionDetails.sections.map((section) => {
                      const sectionInfo = SECTION_LABELS[section.sectionId];
                      const Icon = sectionInfo?.icon || AlertTriangle;
                      return (
                        <div key={section.sectionId} className="flex items-start gap-2">
                          <Icon className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                          <div>
                            <span className="font-medium text-red-800 dark:text-red-200 text-sm">
                              {sectionInfo?.label || section.sectionId}:
                            </span>
                            <span className="text-red-700 dark:text-red-300 text-sm ml-1">
                              {section.message}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isEditing && kycApplication?.reviewNotes && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Additional Notes:</p>
                  <p className="text-amber-700 dark:text-amber-300 text-sm">{kycApplication.reviewNotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isEditing ? "Edit Your Application" : "Owner Identity Verification (KYC)"}
            </CardTitle>
            <CardDescription>
              {isEditing 
                ? "Review and update your information, then resubmit for approval."
                : "Complete your identity verification to become a verified property owner. After approval, you can list unlimited properties."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Personal Information */}
                {(!isEditing || !hasTargetedRejection || flaggedSections.has("personal")) && (
                  <div className={`space-y-4 ${isEditing && hasTargetedRejection && flaggedSections.has("personal") ? "p-4 border-2 border-red-300 dark:border-red-700 rounded-lg bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Personal Information</h3>
                      {isEditing && hasTargetedRejection && flaggedSections.has("personal") && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                          Needs update
                        </span>
                      )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} data-testid="input-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+91 9876543210" {...field} data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Business Address */}
                {(!isEditing || !hasTargetedRejection || flaggedSections.has("business")) && (
                <div className={`space-y-4 ${isEditing && hasTargetedRejection && flaggedSections.has("business") ? "p-4 border-2 border-red-300 dark:border-red-700 rounded-lg bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Business Address</h3>
                    {isEditing && hasTargetedRejection && flaggedSections.has("business") && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                        Needs update
                      </span>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="businessAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complete Business Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter your complete business address with landmarks" 
                            rows={3}
                            {...field} 
                            data-testid="input-business-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* PIN Code First - Auto-populates City & State */}
                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIN Code</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="Enter 6-digit PIN code (e.g., 400001)" 
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                handlePincodeChange(e.target.value);
                              }}
                              maxLength={6}
                              data-testid="input-pincode" 
                            />
                            {isPincodeLookup && (
                              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter PIN code to auto-fill city and state, or skip and enter manually
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* City Autocomplete with datalist */}
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Type city name..."
                              list="cities-list"
                              {...field}
                              data-testid="input-city"
                            />
                          </FormControl>
                          <datalist id="cities-list">
                            {INDIAN_CITIES.map((city) => (
                              <option key={city} value={city} />
                            ))}
                          </datalist>
                          <p className="text-xs text-muted-foreground mt-1">
                            Auto-filled from PIN code or type to search
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* State Autocomplete with datalist */}
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Type state name..."
                              list="states-list"
                              {...field}
                              data-testid="input-state"
                            />
                          </FormControl>
                          <datalist id="states-list">
                            {INDIAN_STATES.map((state) => (
                              <option key={state} value={state} />
                            ))}
                          </datalist>
                          <p className="text-xs text-muted-foreground mt-1">
                            Auto-filled from PIN code or type to search
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Business Information - inside same business section */}
                  <div className="space-y-4 pt-4 border-t border-muted">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Business Information</h3>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Grand Hotels Pvt Ltd" {...field} data-testid="input-business-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="panNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PAN Number</FormLabel>
                            <FormControl>
                              <Input placeholder="ABCDE1234F" {...field} data-testid="input-pan-number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="gstNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GST Number (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="22AAAAA0000A1Z5" {...field} data-testid="input-gst-number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Document Uploads - show if any document section is flagged or not in targeted rejection mode */}
                {(() => {
                  const documentSections: KycSectionId[] = ["propertyOwnership", "identityProof", "businessLicense", "noc", "safetyCertificates"];
                  const hasAnyDocumentFlagged = documentSections.some(s => flaggedSections.has(s));
                  const showDocuments = !isEditing || !hasTargetedRejection || hasAnyDocumentFlagged;
                  
                  if (!showDocuments) return null;
                  
                  return (
                    <div className={`space-y-4 ${isEditing && hasTargetedRejection && hasAnyDocumentFlagged ? "p-4 border-2 border-red-300 dark:border-red-700 rounded-lg bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Upload className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Document Uploads</h3>
                        {isEditing && hasTargetedRejection && hasAnyDocumentFlagged && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                            Needs update
                          </span>
                        )}
                      </div>
                      
                      <KycDocumentUploader 
                        value={kycDocuments}
                        onChange={setKycDocuments}
                        flaggedCategories={isEditing && hasTargetedRejection ? documentSections.filter(s => flaggedSections.has(s)) : undefined}
                      />
                    </div>
                  );
                })()}

                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={submitKYC.isPending || updateKYC.isPending}
                    data-testid="button-submit-kyc"
                  >
                    {(submitKYC.isPending || updateKYC.isPending) 
                      ? "Submitting..." 
                      : isEditing 
                        ? "Resubmit Application" 
                        : "Submit KYC Application"
                    }
                  </Button>
                  {isEditing ? (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      variant="outline"
                      asChild
                      data-testid="button-cancel"
                    >
                      <a href="/">Cancel</a>
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Your information is secure and will only be used for verification purposes.</p>
          <p className="mt-2">
            Questions? Contact us at <a href="mailto:support@zecoho.com" className="text-primary hover:underline">support@zecoho.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
