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
import { Building2, FileText, User, MapPin, Phone, Mail, Loader2, Upload, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { INDIAN_STATES, INDIAN_CITIES } from "@/data/locations";
import { KycDocumentUploader, defaultKycDocuments, type KycDocuments } from "@/components/KycDocumentUploader";
import { useLocation } from "wouter";
import type { KycApplication } from "@shared/schema";

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

  // Fetch existing KYC application status
  const { data: kycApplication, refetch: refetchKyc } = useQuery<KycApplication>({
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
    
    submitKYC.mutate(data);
  };

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
          <h1 className="text-4xl font-bold mb-2">Become a Property Owner</h1>
          <p className="text-xl text-muted-foreground">
            Get verified and start listing your properties at ZERO commission
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Owner Identity Verification (KYC)
            </CardTitle>
            <CardDescription>
              Complete your identity verification to become a verified property owner. After approval, you can list unlimited properties.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Personal Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Personal Information</h3>
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

                {/* Business Address */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Business Address</h3>
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

                </div>

                {/* Business Information */}
                <div className="space-y-4">
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

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Upload className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Document Uploads</h3>
                  </div>
                  
                  <KycDocumentUploader 
                    value={kycDocuments}
                    onChange={setKycDocuments}
                  />
                </div>

                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={submitKYC.isPending}
                    data-testid="button-submit-kyc"
                  >
                    {submitKYC.isPending ? "Submitting..." : "Submit KYC Application"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    asChild
                    data-testid="button-cancel"
                  >
                    <a href="/">Cancel</a>
                  </Button>
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
