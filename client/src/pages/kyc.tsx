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
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, FileText, User, MapPin, Phone, Mail } from "lucide-react";
import { useState } from "react";

const kycSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  
  // Property Information
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  propertyType: z.string().min(1, "Please select a property type"),
  propertyAddress: z.string().min(10, "Please provide complete address"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(6, "Valid pincode is required"),
  
  // Business Information
  businessName: z.string().min(3, "Business name is required"),
  gstNumber: z.string().optional(),
  panNumber: z.string().min(10, "Valid PAN number is required"),
  
  // Additional Information
  numberOfRooms: z.string().min(1, "Number of rooms is required"),
  description: z.string().min(50, "Please provide at least 50 characters description"),
});

type KYCFormData = z.infer<typeof kycSchema>;

export default function KYC() {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<KYCFormData>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      propertyName: "",
      propertyType: "",
      propertyAddress: "",
      city: "",
      state: "",
      pincode: "",
      businessName: "",
      gstNumber: "",
      panNumber: "",
      numberOfRooms: "",
      description: "",
    },
  });

  const submitKYC = useMutation({
    mutationFn: async (data: KYCFormData) => {
      return await apiRequest("/api/kyc/submit", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
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
            <CardTitle className="text-2xl">Application Submitted!</CardTitle>
            <CardDescription>
              Thank you for choosing ZECOHO to list your property
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-muted-foreground">
              <p className="mb-4">
                We've received your KYC application and our team will review it carefully.
              </p>
              <p className="mb-4">
                You'll receive an email within <strong>2-3 business days</strong> with the next steps.
              </p>
              <p className="text-sm">
                If you have any questions, feel free to contact our support team.
              </p>
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
          <h1 className="text-4xl font-bold mb-2">List Your Hotel on ZECOHO</h1>
          <p className="text-xl text-muted-foreground">
            Join our platform and reach thousands of travelers at ZERO commission
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Property Owner Verification (KYC)
            </CardTitle>
            <CardDescription>
              Please fill in the details below. All fields are required for verification.
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

                {/* Property Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Property Information</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="propertyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Grand Palace Hotel" {...field} data-testid="input-property-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-property-type">
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hotel">Hotel</SelectItem>
                            <SelectItem value="resort">Resort</SelectItem>
                            <SelectItem value="villa">Villa</SelectItem>
                            <SelectItem value="guesthouse">Guest House</SelectItem>
                            <SelectItem value="apartment">Apartment</SelectItem>
                            <SelectItem value="homestay">Homestay</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="propertyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Complete address with landmarks" 
                            {...field} 
                            data-testid="input-property-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Mumbai" {...field} data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="Maharashtra" {...field} data-testid="input-state" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pincode</FormLabel>
                          <FormControl>
                            <Input placeholder="400001" {...field} data-testid="input-pincode" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="numberOfRooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Rooms</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="20" {...field} data-testid="input-number-of-rooms" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about your property, amenities, and what makes it special..."
                            rows={4}
                            {...field} 
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
