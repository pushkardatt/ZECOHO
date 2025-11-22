import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Home, CheckCircle } from "lucide-react";
import type { Property } from "@shared/schema";

const personalDetailsSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
});

const kycSchema = z.object({
  kycAddress: z.string().min(10, "Full address is required"),
  governmentIdType: z.string().min(1, "ID type is required"),
  governmentIdNumber: z.string().min(5, "ID number is required"),
});

const propertyInfoSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  propertyType: z.string().min(1, "Property type is required"),
  destination: z.string().min(1, "Destination is required"),
  address: z.string().min(5, "Address is required"),
  pricePerNight: z.string().min(1, "Price is required"),
  maxGuests: z.string().min(1, "Max guests is required"),
  images: z.string().url("Valid image URL required"),
  amenityIds: z.array(z.string()).min(1, "Select at least one amenity"),
});

type PersonalDetailsData = z.infer<typeof personalDetailsSchema>;
type KYCData = z.infer<typeof kycSchema>;
type PropertyInfoData = z.infer<typeof propertyInfoSchema>;

export default function ListProperty() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to list your property",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: amenities = [] } = useQuery<any[]>({
    queryKey: ["/api/amenities"],
  });

  const personalForm = useForm<PersonalDetailsData>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
    },
  });

  const kycForm = useForm<KYCData>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      kycAddress: user?.kycAddress || "",
      governmentIdType: user?.governmentIdType || "",
      governmentIdNumber: user?.governmentIdNumber || "",
    },
  });

  const propertyForm = useForm<PropertyInfoData>({
    resolver: zodResolver(propertyInfoSchema),
    defaultValues: {
      title: "",
      description: "",
      propertyType: "",
      destination: "",
      address: "",
      pricePerNight: "",
      maxGuests: "2",
      images: "",
      amenityIds: [],
    },
  });

  useEffect(() => {
    if (user) {
      personalForm.setValue("firstName", user.firstName || "");
      personalForm.setValue("lastName", user.lastName || "");
      personalForm.setValue("phone", user.phone || "");
      kycForm.setValue("kycAddress", user.kycAddress || "");
      kycForm.setValue("governmentIdType", user.governmentIdType || "");
      kycForm.setValue("governmentIdNumber", user.governmentIdNumber || "");
    }
  }, [user, personalForm, kycForm]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<PersonalDetailsData & KYCData>) => {
      return await apiRequest("PATCH", "/api/user/kyc", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update details",
        variant: "destructive",
      });
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: PropertyInfoData) => {
      const propertyData = {
        ...data,
        pricePerNight: parseFloat(data.pricePerNight).toString(),
        maxGuests: parseInt(data.maxGuests),
        images: [data.images],
        status: "pending",
      };
      return await apiRequest("POST", "/api/properties", propertyData);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your property has been submitted for review",
      });
      setTimeout(() => {
        setLocation("/owner-properties");
      }, 1500);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const onPersonalDetailsSubmit = async (data: PersonalDetailsData) => {
    // Just save personal details, don't change role yet
    await updateUserMutation.mutateAsync(data);
    setCurrentStep(2);
  };

  const onKYCSubmit = async (data: KYCData) => {
    // Collect all data from both step 1 and step 2, then promote to owner
    const personalData = {
      firstName: personalForm.getValues("firstName"),
      lastName: personalForm.getValues("lastName"),
      phone: personalForm.getValues("phone"),
    };
    
    // Send complete KYC data with role promotion
    await updateUserMutation.mutateAsync({
      ...personalData,
      ...data,
      userRole: "owner",
    });
    setCurrentStep(3);
  };

  const onPropertyInfoSubmit = (data: PropertyInfoData) => {
    createPropertyMutation.mutate(data);
  };

  const selectedAmenities = propertyForm.watch("amenityIds") || [];

  const toggleAmenity = (amenityId: string) => {
    const current = selectedAmenities;
    if (current.includes(amenityId)) {
      propertyForm.setValue("amenityIds", current.filter(id => id !== amenityId));
    } else {
      propertyForm.setValue("amenityIds", [...current, amenityId]);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
                {currentStep > 1 ? <CheckCircle className="h-5 w-5" /> : "1"}
              </div>
              <span className="font-medium">Personal Details</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className="flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
                {currentStep > 2 ? <CheckCircle className="h-5 w-5" /> : "2"}
              </div>
              <span className="font-medium">KYC</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            <div className="flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-muted'}`}>
                3
              </div>
              <span className="font-medium">Property Info</span>
            </div>
          </div>
        </div>

        {/* Step 1: Personal Details */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Let's start with your basic information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={personalForm.handleSubmit(onPersonalDetailsSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...personalForm.register("firstName")}
                    data-testid="input-first-name"
                  />
                  {personalForm.formState.errors.firstName && (
                    <p className="text-sm text-destructive mt-1">
                      {personalForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...personalForm.register("lastName")}
                    data-testid="input-last-name"
                  />
                  {personalForm.formState.errors.lastName && (
                    <p className="text-sm text-destructive mt-1">
                      {personalForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    {...personalForm.register("phone")}
                    data-testid="input-phone"
                  />
                  {personalForm.formState.errors.phone && (
                    <p className="text-sm text-destructive mt-1">
                      {personalForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    data-testid="button-next-step"
                  >
                    {updateUserMutation.isPending ? "Saving..." : "Next"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: KYC */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>KYC Verification</CardTitle>
              <CardDescription>We need to verify your identity for security purposes</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={kycForm.handleSubmit(onKYCSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="kycAddress">Full Address</Label>
                  <Textarea
                    id="kycAddress"
                    placeholder="Enter your complete address"
                    {...kycForm.register("kycAddress")}
                    data-testid="input-kyc-address"
                  />
                  {kycForm.formState.errors.kycAddress && (
                    <p className="text-sm text-destructive mt-1">
                      {kycForm.formState.errors.kycAddress.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="governmentIdType">Government ID Type</Label>
                  <Select
                    value={kycForm.watch("governmentIdType")}
                    onValueChange={(value) => kycForm.setValue("governmentIdType", value)}
                  >
                    <SelectTrigger id="governmentIdType" data-testid="select-id-type">
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                      <SelectItem value="pan">PAN Card</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driving_license">Driving License</SelectItem>
                      <SelectItem value="voter_id">Voter ID</SelectItem>
                    </SelectContent>
                  </Select>
                  {kycForm.formState.errors.governmentIdType && (
                    <p className="text-sm text-destructive mt-1">
                      {kycForm.formState.errors.governmentIdType.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="governmentIdNumber">ID Number</Label>
                  <Input
                    id="governmentIdNumber"
                    placeholder="Enter your ID number"
                    {...kycForm.register("governmentIdNumber")}
                    data-testid="input-id-number"
                  />
                  {kycForm.formState.errors.governmentIdNumber && (
                    <p className="text-sm text-destructive mt-1">
                      {kycForm.formState.errors.governmentIdNumber.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    data-testid="button-back"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    data-testid="button-next-kyc"
                  >
                    {updateUserMutation.isPending ? "Saving..." : "Next"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Property Information */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
              <CardDescription>Tell us about your property</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={propertyForm.handleSubmit(onPropertyInfoSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="title">Property Title</Label>
                  <Input
                    id="title"
                    placeholder="Beautiful Villa in Goa"
                    {...propertyForm.register("title")}
                    data-testid="input-property-title"
                  />
                  {propertyForm.formState.errors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {propertyForm.formState.errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your property"
                    {...propertyForm.register("description")}
                    data-testid="input-property-description"
                  />
                  {propertyForm.formState.errors.description && (
                    <p className="text-sm text-destructive mt-1">
                      {propertyForm.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="propertyType">Property Type</Label>
                    <Select
                      value={propertyForm.watch("propertyType")}
                      onValueChange={(value) => propertyForm.setValue("propertyType", value)}
                    >
                      <SelectTrigger id="propertyType" data-testid="select-property-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="cabin">Cabin</SelectItem>
                        <SelectItem value="resort">Resort</SelectItem>
                        <SelectItem value="hostel">Hostel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="maxGuests">Max Guests</Label>
                    <Input
                      id="maxGuests"
                      type="number"
                      min="1"
                      {...propertyForm.register("maxGuests")}
                      data-testid="input-max-guests"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    placeholder="Goa, India"
                    {...propertyForm.register("destination")}
                    data-testid="input-destination"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Full Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Complete property address"
                    {...propertyForm.register("address")}
                    data-testid="input-property-address"
                  />
                </div>

                <div>
                  <Label htmlFor="pricePerNight">Price per Night (INR)</Label>
                  <Input
                    id="pricePerNight"
                    type="number"
                    min="1"
                    step="100"
                    placeholder="5000"
                    {...propertyForm.register("pricePerNight")}
                    data-testid="input-price"
                  />
                </div>

                <div>
                  <Label htmlFor="images">Image URL</Label>
                  <Input
                    id="images"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    {...propertyForm.register("images")}
                    data-testid="input-image-url"
                  />
                </div>

                <div>
                  <Label>Amenities (Select all that apply)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {amenities.map((amenity: any) => (
                      <div key={amenity.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`amenity-${amenity.id}`}
                          checked={selectedAmenities.includes(amenity.id)}
                          onCheckedChange={() => toggleAmenity(amenity.id)}
                          data-testid={`checkbox-amenity-${amenity.name.toLowerCase()}`}
                        />
                        <Label
                          htmlFor={`amenity-${amenity.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {amenity.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {propertyForm.formState.errors.amenityIds && (
                    <p className="text-sm text-destructive mt-1">
                      {propertyForm.formState.errors.amenityIds.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    data-testid="button-back-property"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPropertyMutation.isPending}
                    data-testid="button-submit-property"
                  >
                    {createPropertyMutation.isPending ? "Submitting..." : "Submit Property"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
