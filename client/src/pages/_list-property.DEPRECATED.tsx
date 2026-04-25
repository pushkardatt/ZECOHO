import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/queryClient";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
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
  receptionNumber: z.string().optional(),
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

  // No redirect — unauthenticated users see the landing section instead

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
      receptionNumber: "",
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
        window.location.href = "/login";
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
        window.location.href = "/login";
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
    } as any);
    setCurrentStep(3);
  };

  const onPropertyInfoSubmit = (data: PropertyInfoData) => {
    createPropertyMutation.mutate(data);
  };

  const selectedAmenities = propertyForm.watch("amenityIds") || [];

  const toggleAmenity = (amenityId: string) => {
    const current = selectedAmenities;
    if (current.includes(amenityId)) {
      propertyForm.setValue(
        "amenityIds",
        current.filter((id) => id !== amenityId),
      );
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

  // ── LANDING PAGE for unauthenticated visitors (SEO + conversion) ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-amber-50 via-background to-rose-50 dark:from-amber-950/20 dark:via-background dark:to-rose-950/20 py-20 px-4 md:px-6">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium mb-6">
              🏨 For Hotel Owners · 100% Free
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              List Your Hotel Free.{" "}
              <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
                Stop Paying OTA Commission.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4 max-w-3xl mx-auto">
              India's only hotel booking platform that charges{" "}
              <span className="font-bold text-foreground">
                0% commission — forever.
              </span>{" "}
              Direct bookings. Full revenue. No middlemen.
            </p>
            <p className="text-base text-muted-foreground mb-10 max-w-2xl mx-auto">
              MakeMyTrip, Booking.com and Goibibo take 15–25% of every booking
              you earn. On ZECOHO, that money stays with you — always.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                onClick={() => {
                  window.location.href = "/login";
                }}
                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-lg px-10 py-6 rounded-2xl shadow-xl group"
              >
                List Your Property Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              {[
                "No credit card required",
                "Go live in 5 minutes",
                "0% commission forever",
                "Free forever",
              ].map((text) => (
                <div key={text} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commission Comparison */}
        <div className="py-20 px-4 md:px-6 bg-background">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How Much Are You{" "}
                <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
                  Losing to OTAs?
                </span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Every booking on MakeMyTrip costs you real money
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* OTA */}
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-8">
                <div className="text-center mb-6">
                  <div className="text-rose-500 font-bold text-lg mb-1">
                    ❌ Other OTAs
                  </div>
                  <div className="text-sm text-muted-foreground">
                    MakeMyTrip, Booking.com, Goibibo
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      booking: "₹3,000/night booking",
                      you: "You get ₹2,400",
                      lost: "Lost ₹600",
                    },
                    {
                      booking: "₹5,000/night booking",
                      you: "You get ₹4,000",
                      lost: "Lost ₹1,000",
                    },
                    {
                      booking: "₹10,000/night booking",
                      you: "You get ₹8,000",
                      lost: "Lost ₹2,000",
                    },
                  ].map((row) => (
                    <div
                      key={row.booking}
                      className="flex items-center justify-between bg-white dark:bg-background rounded-xl p-4"
                    >
                      <div>
                        <div className="font-medium text-sm">{row.booking}</div>
                        <div className="text-muted-foreground text-sm">
                          {row.you}
                        </div>
                      </div>
                      <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-medium">
                        {row.lost}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* ZECOHO */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-400 rounded-3xl p-8 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                    ✓ ZECOHO Way
                  </span>
                </div>
                <div className="text-center mb-6">
                  <div className="text-emerald-600 font-bold text-lg mb-1">
                    ✅ ZECOHO
                  </div>
                  <div className="text-sm text-muted-foreground">
                    0% Commission · Always
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      booking: "₹3,000/night booking",
                      you: "You get ₹3,000",
                      saved: "Save ₹600",
                    },
                    {
                      booking: "₹5,000/night booking",
                      you: "You get ₹5,000",
                      saved: "Save ₹1,000",
                    },
                    {
                      booking: "₹10,000/night booking",
                      you: "You get ₹10,000",
                      saved: "Save ₹2,000",
                    },
                  ].map((row) => (
                    <div
                      key={row.booking}
                      className="flex items-center justify-between bg-white dark:bg-background rounded-xl p-4"
                    >
                      <div>
                        <div className="font-medium text-sm">{row.booking}</div>
                        <div className="text-emerald-600 text-sm font-semibold">
                          {row.you}
                        </div>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                        {row.saved}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-center">
              <Button
                size="lg"
                onClick={() => {
                  window.location.href = "/login";
                }}
                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold px-10 py-5 rounded-2xl shadow-lg group"
              >
                Start Keeping 100% Revenue
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="py-20 px-4 md:px-6 bg-muted/20">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Get Listed in 4 Simple Steps
              </h2>
              <p className="text-muted-foreground text-lg">
                From signup to first booking in under 24 hours
              </p>
            </div>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  title: "Create Free Account",
                  desc: "Sign up as a property owner — no credit card, takes 2 minutes.",
                },
                {
                  step: "2",
                  title: "Add Your Property",
                  desc: "Upload photos, set room types, pricing and availability.",
                },
                {
                  step: "3",
                  title: "Get Verified",
                  desc: "Our team verifies your listing within 24 hours.",
                },
                {
                  step: "4",
                  title: "Earn 100% Revenue",
                  desc: "Every rupee from bookings goes straight to you.",
                },
              ].map((item, i) => (
                <div key={item.step} className="relative text-center">
                  {i < 3 && (
                    <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-amber-300 to-rose-300" />
                  )}
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-rose-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg relative z-10">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-base mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="py-20 px-4 md:px-6 bg-background">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground">
                Everything hotel owners ask before listing
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  q: "Is listing my hotel on ZECOHO really free?",
                  a: "Yes — 100% free. No listing fee, no setup fee, no monthly charge, and zero commission on bookings. Ever.",
                },
                {
                  q: "How is ZECOHO different from MakeMyTrip or Booking.com?",
                  a: "OTAs charge 15–25% commission per booking. On ZECOHO you pay zero commission and guests contact you directly via call or WhatsApp.",
                },
                {
                  q: "How quickly can I list my property?",
                  a: "Most owners complete their full listing in under 10 minutes. Our team verifies it within 24 hours — then you're live.",
                },
                {
                  q: "What types of properties can I list?",
                  a: "Hotels, resorts, villas, homestays, farmhouses, lodges, apartments and hostels are all welcome on ZECOHO.",
                },
                {
                  q: "Will ZECOHO ever charge commission in the future?",
                  a: "No. Zero commission is our core promise. We are built specifically to be the OTA alternative — charging commission would defeat our entire purpose.",
                },
              ].map((faq, i) => (
                <div key={i} className="bg-muted/40 rounded-2xl p-6">
                  <h3 className="font-semibold text-base mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="py-20 px-4 md:px-6 bg-gradient-to-br from-amber-500 to-rose-500">
          <div className="container mx-auto max-w-3xl text-center text-white">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Stop Paying Commission?
            </h2>
            <p className="text-white/90 text-xl mb-10">
              Join hotel owners across India who have switched to ZECOHO and
              kept 100% of their booking revenue.
            </p>
            <Button
              size="lg"
              onClick={() => {
                window.location.href = "/login";
              }}
              className="bg-white text-amber-600 hover:bg-white/90 font-bold text-xl px-12 py-7 rounded-2xl shadow-2xl group"
            >
              List Your Property Free Today
              <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
            </Button>
            <p className="text-white/70 text-sm mt-4">
              No credit card · Free forever · Go live in 5 minutes
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── AUTHENTICATED OWNERS see the form below ──
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${currentStep >= 1 ? "bg-primary text-white" : "bg-muted"}`}
              >
                {currentStep > 1 ? <CheckCircle className="h-5 w-5" /> : "1"}
              </div>
              <span className="font-medium">Personal Details</span>
            </div>
            <div
              className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? "bg-primary" : "bg-muted"}`}
            />
            <div className="flex items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${currentStep >= 2 ? "bg-primary text-white" : "bg-muted"}`}
              >
                {currentStep > 2 ? <CheckCircle className="h-5 w-5" /> : "2"}
              </div>
              <span className="font-medium">KYC</span>
            </div>
            <div
              className={`flex-1 h-1 mx-4 ${currentStep >= 3 ? "bg-primary" : "bg-muted"}`}
            />
            <div className="flex items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${currentStep >= 3 ? "bg-primary text-white" : "bg-muted"}`}
              >
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
              <CardDescription>
                Let's start with your basic information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={personalForm.handleSubmit(onPersonalDetailsSubmit)}
                className="space-y-4"
              >
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
              <CardDescription>
                We need to verify your identity for security purposes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={kycForm.handleSubmit(onKYCSubmit)}
                className="space-y-4"
              >
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
                    onValueChange={(value) =>
                      kycForm.setValue("governmentIdType", value)
                    }
                  >
                    <SelectTrigger
                      id="governmentIdType"
                      data-testid="select-id-type"
                    >
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                      <SelectItem value="pan">PAN Card</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driving_license">
                        Driving License
                      </SelectItem>
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
              <form
                onSubmit={propertyForm.handleSubmit(onPropertyInfoSubmit)}
                className="space-y-4"
              >
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
                      onValueChange={(value) =>
                        propertyForm.setValue("propertyType", value)
                      }
                    >
                      <SelectTrigger
                        id="propertyType"
                        data-testid="select-property-type"
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="resort">Resort</SelectItem>
                        <SelectItem value="hostel">Hostel</SelectItem>
                        <SelectItem value="lodge">Lodge</SelectItem>
                        <SelectItem value="cottage">Cottage</SelectItem>
                        <SelectItem value="farmhouse">Farmhouse</SelectItem>
                        <SelectItem value="homestay">Homestay</SelectItem>
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

                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="receptionNumber">
                      Reception Number (Optional)
                    </Label>
                    <Input
                      id="receptionNumber"
                      type="tel"
                      placeholder="+91 98765 43210"
                      {...propertyForm.register("receptionNumber")}
                      data-testid="input-reception-number"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Contact number for guests to reach reception
                    </p>
                  </div>
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
                    {createPropertyMutation.isPending
                      ? "Submitting..."
                      : "Submit Property"}
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
