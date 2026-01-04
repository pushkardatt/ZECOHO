import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mail, MapPin, Building2, Shield, Users, Briefcase, Save, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ContactSettings } from "@shared/schema";

const contactSettingsSchema = z.object({
  customerSupportEmail: z.string().email().optional().or(z.literal("")),
  customerSupportPhone: z.string().optional(),
  customerSupportHours: z.string().optional(),
  ownerSupportEmail: z.string().email().optional().or(z.literal("")),
  ownerSupportPhone: z.string().optional(),
  grievanceOfficerName: z.string().optional(),
  grievanceOfficerEmail: z.string().email().optional().or(z.literal("")),
  grievanceOfficerPhone: z.string().optional(),
  grievanceOfficerAddress: z.string().optional(),
  privacyEmail: z.string().email().optional().or(z.literal("")),
  dataProtectionOfficerName: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal("")),
  businessPhone: z.string().optional(),
  registeredOfficeName: z.string().optional(),
  registeredOfficeAddress: z.string().optional(),
  registeredOfficeCity: z.string().optional(),
  registeredOfficeState: z.string().optional(),
  registeredOfficePincode: z.string().optional(),
  registeredOfficeCountry: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
});

type ContactSettingsFormData = z.infer<typeof contactSettingsSchema>;

export default function AdminContactSettings() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<ContactSettingsFormData>({
    resolver: zodResolver(contactSettingsSchema),
    defaultValues: {
      customerSupportEmail: "",
      customerSupportPhone: "",
      customerSupportHours: "",
      ownerSupportEmail: "",
      ownerSupportPhone: "",
      grievanceOfficerName: "",
      grievanceOfficerEmail: "",
      grievanceOfficerPhone: "",
      grievanceOfficerAddress: "",
      privacyEmail: "",
      dataProtectionOfficerName: "",
      businessEmail: "",
      businessPhone: "",
      registeredOfficeName: "",
      registeredOfficeAddress: "",
      registeredOfficeCity: "",
      registeredOfficeState: "",
      registeredOfficePincode: "",
      registeredOfficeCountry: "",
      companyRegistrationNumber: "",
    },
  });

  const { data: settings, isLoading } = useQuery<ContactSettings>({
    queryKey: ["/api/contact-settings"],
    enabled: user?.userRole === "admin",
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ContactSettingsFormData) => {
      return apiRequest("PATCH", "/api/admin/contact-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-settings"] });
      toast({ title: "Success", description: "Contact settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.userRole !== "admin") {
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

  if (settings && !form.formState.isDirty) {
    const formValues = {
      customerSupportEmail: settings.customerSupportEmail || "",
      customerSupportPhone: settings.customerSupportPhone || "",
      customerSupportHours: settings.customerSupportHours || "",
      ownerSupportEmail: settings.ownerSupportEmail || "",
      ownerSupportPhone: settings.ownerSupportPhone || "",
      grievanceOfficerName: settings.grievanceOfficerName || "",
      grievanceOfficerEmail: settings.grievanceOfficerEmail || "",
      grievanceOfficerPhone: settings.grievanceOfficerPhone || "",
      grievanceOfficerAddress: settings.grievanceOfficerAddress || "",
      privacyEmail: settings.privacyEmail || "",
      dataProtectionOfficerName: settings.dataProtectionOfficerName || "",
      businessEmail: settings.businessEmail || "",
      businessPhone: settings.businessPhone || "",
      registeredOfficeName: settings.registeredOfficeName || "",
      registeredOfficeAddress: settings.registeredOfficeAddress || "",
      registeredOfficeCity: settings.registeredOfficeCity || "",
      registeredOfficeState: settings.registeredOfficeState || "",
      registeredOfficePincode: settings.registeredOfficePincode || "",
      registeredOfficeCountry: settings.registeredOfficeCountry || "",
      companyRegistrationNumber: settings.companyRegistrationNumber || "",
    };
    form.reset(formValues);
  }

  const onSubmit = (data: ContactSettingsFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Contact Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage contact information displayed on the Contact Us page
            </p>
          </div>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateMutation.isPending || !form.formState.isDirty}
            data-testid="button-save-settings"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            These settings control the contact information displayed on your public Contact Us page. 
            The Grievance Redressal Officer section is required under Indian IT Act 2000 and Consumer Protection Rules 2021.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Customer Support
                </CardTitle>
                <CardDescription>
                  Contact details for guest queries, bookings, and general support
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerSupportEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="support@zecoho.com" {...field} data-testid="input-support-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerSupportPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 1234 567890" {...field} data-testid="input-support-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="customerSupportHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Hours</FormLabel>
                      <FormControl>
                        <Input placeholder="Mon-Sat, 9:00 AM - 6:00 PM IST" {...field} data-testid="input-support-hours" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Property Owner Support
                </CardTitle>
                <CardDescription>
                  Dedicated support for hoteliers and property owners
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ownerSupportEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="partners@zecoho.com" {...field} data-testid="input-owner-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ownerSupportPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 1234 567891" {...field} data-testid="input-owner-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Grievance Redressal Officer
                </CardTitle>
                <CardDescription>
                  Required under Indian IT Act 2000 and Consumer Protection (E-Commerce) Rules, 2020
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="grievanceOfficerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Officer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full Name" {...field} data-testid="input-grievance-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grievanceOfficerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="grievance@zecoho.com" {...field} data-testid="input-grievance-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="grievanceOfficerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 1234 567892" {...field} data-testid="input-grievance-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="grievanceOfficerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Full address of the Grievance Officer" 
                          {...field} 
                          data-testid="input-grievance-address"
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Complaints will be acknowledged within 48 hours and resolved within 1 month as per the IT Act.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Privacy & Data Protection
                </CardTitle>
                <CardDescription>
                  Contact for data privacy inquiries, GDPR/data deletion requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="privacyEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="privacy@zecoho.com" {...field} data-testid="input-privacy-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dataProtectionOfficerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Protection Officer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full Name" {...field} data-testid="input-dpo-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Business & Partnerships
                </CardTitle>
                <CardDescription>
                  Contact for business partnerships, press, and media inquiries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="business@zecoho.com" {...field} data-testid="input-business-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 1234 567894" {...field} data-testid="input-business-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Registered Office
                </CardTitle>
                <CardDescription>
                  Company's registered office address and registration details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="registeredOfficeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="ZECOHO Hospitality Pvt. Ltd." {...field} data-testid="input-company-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="registeredOfficeAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Street address, building name, floor" 
                          {...field} 
                          data-testid="input-office-address"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="registeredOfficeCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Mumbai" {...field} data-testid="input-office-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registeredOfficeState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="Maharashtra" {...field} data-testid="input-office-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registeredOfficePincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input placeholder="400001" {...field} data-testid="input-office-pincode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="registeredOfficeCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="India" {...field} data-testid="input-office-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator className="my-4" />
                <FormField
                  control={form.control}
                  name="companyRegistrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CIN (Corporate Identification Number)</FormLabel>
                      <FormControl>
                        <Input placeholder="U55101MH2024PTC123456" {...field} data-testid="input-cin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateMutation.isPending || !form.formState.isDirty}
                data-testid="button-submit-form"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
