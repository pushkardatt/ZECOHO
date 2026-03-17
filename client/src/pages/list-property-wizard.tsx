import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  type Amenity,
  type CategorizedPropertyImages,
  type KycApplication,
} from "@shared/schema";
import { AddressInput, type AddressDetails } from "@/components/AddressInput";
import { CitySearchInput } from "@/components/CitySearchInput";
import {
  PropertyImageUploader,
  getImagesArrayFromCategorized,
  defaultCategorizedImages,
} from "@/components/PropertyImageUploader";
import {
  RoomTypeBuilder,
  type WizardRoomType,
} from "@/components/RoomTypeBuilder";
import {
  KycDocumentUploader,
  defaultKycDocuments,
  type KycDocuments,
} from "@/components/KycDocumentUploader";
import {
  PropertyLocationPicker,
  type AddressData,
} from "@/components/PropertyLocationPicker";
import {
  Loader2,
  Building2,
  User,
  Users,
  MapPin,
  FileText,
  Home,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  XCircle,
  Clock,
  AlertTriangle,
  IdCard,
  Shield,
  Flame,
  Camera,
  Zap,
  FileCheck,
} from "lucide-react";
import { INDIAN_STATES, INDIAN_CITIES } from "@/data/locations";
import type { KycSectionId, KycRejectionDetails } from "@shared/schema";
import { useEffect, useMemo, useRef, useCallback } from "react";

const WIZARD_STORAGE_KEY = "zecoho_list_property_wizard_draft";

const SECTION_LABELS: Record<KycSectionId, { label: string; icon: any }> = {
  personal: { label: "Personal Information", icon: User },
  business: { label: "Business Information", icon: MapPin },
  propertyOwnership: { label: "Property Ownership Documents", icon: Home },
  identityProof: { label: "Identity Proof Documents", icon: IdCard },
  businessLicense: { label: "Business License Documents", icon: Building2 },
  noc: { label: "NOC Documents", icon: Shield },
  safetyCertificates: { label: "Safety Certificate Documents", icon: Flame },
};

const PRICE_GUIDANCE: Record<
  string,
  { min: number; max: number; avg: number }
> = {
  hotel: { min: 800, max: 5000, avg: 2500 },
  villa: { min: 5000, max: 25000, avg: 12000 },
  apartment: { min: 1500, max: 8000, avg: 3500 },
  resort: { min: 4000, max: 20000, avg: 10000 },
  hostel: { min: 300, max: 1500, avg: 700 },
  lodge: { min: 600, max: 3000, avg: 1500 },
  cottage: { min: 2000, max: 10000, avg: 5000 },
  farmhouse: { min: 3000, max: 15000, avg: 7000 },
  homestay: { min: 1000, max: 5000, avg: 2500 },
};

function PriceGuidanceWidget({
  propertyType,
  city,
}: {
  propertyType: string;
  city?: string;
}) {
  const guidance = PRICE_GUIDANCE[propertyType];
  if (!guidance) return null;

  const avgPosition =
    ((guidance.avg - guidance.min) / (guidance.max - guidance.min)) * 100;
  const locationText = city
    ? `${propertyType}s in ${city}`
    : `${propertyType}s`;

  return (
    <div
      className="mt-2 p-3 bg-muted/50 rounded-md border"
      data-testid="widget-price-guidance"
    >
      <p
        className="text-xs font-medium text-muted-foreground mb-1"
        data-testid="text-price-guidance-label"
      >
        Typical prices for {locationText}:
      </p>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground whitespace-nowrap">
          ₹{guidance.min.toLocaleString()}
        </span>
        <div className="flex-1 h-1.5 bg-muted rounded-full relative">
          <div
            className="absolute w-2 h-2 bg-primary rounded-full -top-0.5"
            style={{ left: `${avgPosition}%`, transform: "translateX(-50%)" }}
            title={`Average: ₹${guidance.avg.toLocaleString()}`}
          />
        </div>
        <span className="text-muted-foreground whitespace-nowrap">
          ₹{guidance.max.toLocaleString()}
        </span>
      </div>
      <p
        className="text-xs text-center text-muted-foreground mt-1"
        data-testid="text-price-guidance-avg"
      >
        Average: ₹{guidance.avg.toLocaleString()}/night
      </p>
    </div>
  );
}

const combinedSchema = z.object({
  // KYC Personal Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),

  // KYC Business Information - Detailed Address
  businessName: z.string().min(3, "Business name is required"),
  kycFlatNo: z.string().optional(),
  kycHouseNo: z.string().optional(),
  kycStreetAddress: z.string().min(5, "Street address is required"),
  kycLandmark: z.string().optional(),
  kycLocality: z.string().min(2, "Locality/Area is required"),
  kycCity: z.string().min(2, "City is required"),
  kycDistrict: z.string().min(2, "District is required"),
  kycState: z.string().min(2, "State is required"),
  kycPincode: z.string().min(6, "Valid 6-digit PIN code is required"),
  gstNumber: z.string().optional(),
  panNumber: z
    .string()
    .min(10, "PAN number must be 10 characters")
    .max(10, "PAN number must be 10 characters"),

  // Property Information
  propertyTitle: z
    .string()
    .min(5, "Property title must be at least 5 characters"),
  propertyType: z.enum([
    "hotel",
    "villa",
    "apartment",
    "resort",
    "hostel",
    "lodge",
    "cottage",
    "farmhouse",
    "homestay",
  ]),
  description: z.string().min(20, "Description must be at least 20 characters"),
  destination: z.string().min(2, "Destination is required"),

  // Property - Detailed Address (same structure as KYC)
  propFlatNo: z.string().optional(),
  propHouseNo: z.string().optional(),
  propStreetAddress: z.string().min(5, "Street address is required"),
  propLandmark: z.string().optional(),
  propLocality: z.string().min(2, "Locality/Area is required"),
  propCity: z.string().min(2, "City is required"),
  propDistrict: z.string().min(2, "District is required"),
  propState: z.string().min(2, "State is required"),
  propPincode: z.string().min(6, "Valid 6-digit PIN code is required"),

  // Base price is now optional - pricing comes from room types
  pricePerNight: z.coerce.number().optional(),
  // Occupancy-based pricing (optional - legacy support)
  singleOccupancyPrice: z.coerce.number().optional(),
  doubleOccupancyPrice: z.coerce.number().optional(),
  tripleOccupancyPrice: z.coerce.number().optional(),
  // Bulk booking options
  bulkBookingEnabled: z.boolean().optional(),
  bulkBookingMinRooms: z.coerce.number().min(2).optional(),
  bulkBookingDiscountPercent: z.coerce.number().min(0).max(50).optional(),

  // These are now optional - managed via room types
  maxGuests: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  beds: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  policies: z.string().optional(),
  // Guest Policies
  localIdAllowed: z.boolean().optional(),
  hourlyBookingAllowed: z.boolean().optional(),
  foreignGuestsAllowed: z.boolean().optional(),
  coupleFriendly: z.boolean().optional(),
});

type CombinedFormData = z.infer<typeof combinedSchema>;

// Quick listing schema - simplified for Phase 1 (Soft onboarding)
const quickListingSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  propertyTitle: z
    .string()
    .min(5, "Property title must be at least 5 characters"),
  propertyType: z.enum([
    "hotel",
    "villa",
    "apartment",
    "resort",
    "hostel",
    "lodge",
    "cottage",
    "farmhouse",
    "homestay",
  ]),
  propCity: z.string().min(2, "City is required"),
  propState: z.string().optional(),
  propDistrict: z.string().optional(),
  pricePerNight: z.coerce.number().min(100, "Price must be at least ₹100"),
});

type QuickListingFormData = z.infer<typeof quickListingSchema>;
type ListingMode = "quick" | "full" | "complete";

export default function ListPropertyWizard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Check for existing KYC application
  const { data: existingKycApplication, isLoading: isLoadingKyc } =
    useQuery<KycApplication>({
      queryKey: ["/api/kyc/status"],
      enabled: !!user,
      retry: false,
    });

  // Determine if this is a KYC resubmission (rejected application)
  const isKycResubmission = existingKycApplication?.status === "rejected";

  // Determine if user has verified or pending KYC (skip KYC steps for both)
  const isKycVerified = existingKycApplication?.status === "verified";
  const isKycPending = existingKycApplication?.status === "pending";
  const canSkipKycSteps = isKycVerified || isKycPending;

  // For verified/pending users, we skip steps 1 and 2 (KYC steps)
  // Steps for verified/pending users: 3 (property info) -> 4 (location) -> 5 (amenities) -> 6 (photos)
  // Steps for new/rejected users: 1 (personal) -> 2 (business/docs) -> 3 (property) -> 4 (location) -> 5 (amenities) -> 6 (photos)
  const kycStepsCount = canSkipKycSteps ? 0 : 2;
  // totalSteps is always 6 (the last step number), regardless of whether KYC steps are skipped
  const totalSteps = 6;
  const firstStep = canSkipKycSteps ? 3 : 1;

  const [step, setStep] = useState(firstStep);

  // Listing mode: "quick" for Phase 1 (soft onboarding), "full" for full KYC flow, "complete" for completing draft listing
  // null means mode selection screen should be shown
  // Check URL params for mode (from choose-listing-mode redirect)
  const getInitialMode = (): ListingMode | null => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get("mode");
      if (
        modeParam === "quick" ||
        modeParam === "full" ||
        modeParam === "complete"
      ) {
        return modeParam as ListingMode;
      }
    }
    return null;
  };
  const getPropertyIdFromUrl = (): string | null => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("propertyId");
    }
    return null;
  };
  const [listingMode, setListingMode] = useState<ListingMode | null>(
    getInitialMode,
  );
  const [existingPropertyId] = useState<string | null>(getPropertyIdFromUrl);

  // Quick mode has only 2 steps: 1. Basic Info, 2. Property + Photos
  const isQuickMode = listingMode === "quick";
  const isCompleteMode = listingMode === "complete";
  const quickModeTotalSteps = 2;

  // Fetch draft property when in "complete" mode OR when mode is null (to detect existing drafts)
  const { data: draftProperty, isLoading: isLoadingDraft } = useQuery<any>({
    queryKey: ["/api/owner/draft-property"],
    enabled: (isCompleteMode || listingMode === null) && !!user,
    retry: false,
  });

  // Auto-redirect to complete mode if user has a draft property but no mode selected
  useEffect(() => {
    if (
      listingMode === null &&
      !isLoadingDraft &&
      draftProperty &&
      draftProperty.id
    ) {
      // Update state directly since wouter's setLocation doesn't remount the component
      setListingMode("complete");
      setLocation(
        `/list-property?mode=complete&propertyId=${draftProperty.id}`,
      );
    }
  }, [listingMode, isLoadingDraft, draftProperty, setLocation]);

  // Parse rejection details
  const rejectionDetails = useMemo(() => {
    if (existingKycApplication?.rejectionDetails) {
      return existingKycApplication.rejectionDetails as KycRejectionDetails;
    }
    return null;
  }, [existingKycApplication?.rejectionDetails]);

  // Get flagged sections from rejection
  const flaggedSections = useMemo(() => {
    if (!rejectionDetails?.sections) return new Set<KycSectionId>();
    return new Set(rejectionDetails.sections.map((s) => s.sectionId));
  }, [rejectionDetails]);

  const hasTargetedRejection = flaggedSections.size > 0;

  // Get flagged document categories for the uploader
  const flaggedDocumentCategories = useMemo(() => {
    const docSections: KycSectionId[] = [
      "propertyOwnership",
      "identityProof",
      "businessLicense",
      "noc",
      "safetyCertificates",
    ];
    return docSections.filter((s) => flaggedSections.has(s));
  }, [flaggedSections]);

  // KYC state
  const [isPincodeLookup, setIsPincodeLookup] = useState(false);
  const [kycDocuments, setKycDocuments] =
    useState<KycDocuments>(defaultKycDocuments);

  // Property state
  const [isPropertyPincodeLookup, setIsPropertyPincodeLookup] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [videos, setVideos] = useState<string[]>([]);
  const [categorizedImages, setCategorizedImages] =
    useState<CategorizedPropertyImages>(defaultCategorizedImages);
  const [propertyAddress, setPropertyAddress] = useState<AddressDetails>({
    fullAddress: "",
  });
  const [wizardRoomTypes, setWizardRoomTypes] = useState<WizardRoomType[]>([]);

  // Geo-tagging state (mandatory for property location)
  const [propertyLatitude, setPropertyLatitude] = useState<number | null>(null);
  const [propertyLongitude, setPropertyLongitude] = useState<number | null>(
    null,
  );
  const [geoSource, setGeoSource] = useState<
    "manual_pin" | "current_location" | null
  >(null);

  const form = useForm<CombinedFormData>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
      businessName: "",
      kycFlatNo: "",
      kycHouseNo: "",
      kycStreetAddress: "",
      kycLandmark: "",
      kycLocality: "",
      kycCity: "",
      kycDistrict: "",
      kycState: "",
      kycPincode: "",
      gstNumber: "",
      panNumber: "",
      propertyTitle: "",
      propertyType: "hotel",
      description: "",
      destination: "",
      propFlatNo: "",
      propHouseNo: "",
      propStreetAddress: "",
      propLandmark: "",
      propLocality: "",
      propCity: "",
      propDistrict: "",
      propState: "",
      propPincode: "",
      pricePerNight: 1000,
      singleOccupancyPrice: undefined,
      doubleOccupancyPrice: undefined,
      tripleOccupancyPrice: undefined,
      bulkBookingEnabled: false,
      bulkBookingMinRooms: 5,
      bulkBookingDiscountPercent: 10,
      maxGuests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      policies: "",
      localIdAllowed: true,
      hourlyBookingAllowed: false,
      foreignGuestsAllowed: true,
      coupleFriendly: true,
    },
  });

  const { data: amenities = [] } = useQuery<Amenity[]>({
    queryKey: ["/api/amenities"],
  });

  // Initialize step based on KYC status when data loads
  const hasInitializedStep = useRef(false);
  useEffect(() => {
    if (!isLoadingKyc && !hasInitializedStep.current) {
      hasInitializedStep.current = true;
      if (canSkipKycSteps) {
        setStep(3); // Start at property details for verified/pending users
      }
    }
  }, [isLoadingKyc, canSkipKycSteps]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Helper to scroll to first error field when validation fails
  const scrollToFirstError = useCallback(
    (fieldsToValidate: (keyof CombinedFormData)[]) => {
      const errors = form.formState.errors;
      for (const field of fieldsToValidate) {
        if (errors[field]) {
          // Try to find and focus the element
          const element =
            document.querySelector(`[name="${field}"]`) ||
            document.querySelector(`#${field}`) ||
            document.querySelector(`[data-field="${field}"]`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            if (
              element instanceof HTMLElement &&
              typeof element.focus === "function"
            ) {
              setTimeout(() => element.focus(), 300);
            }
          }
          break; // Only scroll to first error
        }
      }
    },
    [form.formState.errors],
  );

  // Pre-fill form with existing KYC data for resubmission
  useEffect(() => {
    if (isKycResubmission && existingKycApplication) {
      form.reset({
        firstName: existingKycApplication.firstName || "",
        lastName: existingKycApplication.lastName || "",
        email: existingKycApplication.email || "",
        phone: existingKycApplication.phone || "",
        businessName: existingKycApplication.businessName || "",
        kycFlatNo: existingKycApplication.flatNo || "",
        kycHouseNo: existingKycApplication.houseNo || "",
        kycStreetAddress: existingKycApplication.streetAddress || "",
        kycLandmark: existingKycApplication.landmark || "",
        kycLocality: existingKycApplication.locality || "",
        kycCity: existingKycApplication.city || "",
        kycDistrict: existingKycApplication.district || "",
        kycState: existingKycApplication.state || "",
        kycPincode: existingKycApplication.pincode || "",
        gstNumber: existingKycApplication.gstNumber || "",
        panNumber: existingKycApplication.panNumber || "",
        // Property fields keep defaults
        propertyTitle: "",
        propertyType: "hotel",
        description: "",
        destination: "",
        propFlatNo: "",
        propHouseNo: "",
        propStreetAddress: "",
        propLandmark: "",
        propLocality: "",
        propCity: "",
        propDistrict: "",
        propState: "",
        propPincode: "",
        pricePerNight: 1000,
        maxGuests: 2,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        policies: "",
      });
      // Pre-fill documents
      setKycDocuments({
        propertyOwnership:
          (existingKycApplication.propertyOwnershipDocs as any[]) || [],
        identityProof:
          (existingKycApplication.identityProofDocs as any[]) || [],
        businessLicense:
          (existingKycApplication.businessLicenseDocs as any[]) || [],
        noc: (existingKycApplication.nocDocs as any[]) || [],
        safetyCertificates:
          (existingKycApplication.safetyCertificateDocs as any[]) || [],
      });
    }
  }, [isKycResubmission, existingKycApplication, form]);

  // Pre-fill form with draft property data when in "complete" mode
  const hasLoadedDraftProperty = useRef(false);
  useEffect(() => {
    if (isCompleteMode && draftProperty && !hasLoadedDraftProperty.current) {
      hasLoadedDraftProperty.current = true;

      // Pre-fill property data from draft
      form.setValue("propertyTitle", draftProperty.title || "");
      form.setValue("propertyType", draftProperty.propertyType || "hotel");
      form.setValue("description", draftProperty.description || "");
      form.setValue(
        "destination",
        draftProperty.destination || draftProperty.propCity || "",
      );
      form.setValue("propCity", draftProperty.propCity || "");
      form.setValue("propState", draftProperty.propState || "");
      form.setValue("propDistrict", draftProperty.propDistrict || "");
      form.setValue("propStreetAddress", draftProperty.propStreetAddress || "");
      form.setValue("propLocality", draftProperty.propLocality || "");
      form.setValue("propPincode", draftProperty.propPincode || "");
      form.setValue("propFlatNo", draftProperty.propFlatNo || "");
      form.setValue("propHouseNo", draftProperty.propHouseNo || "");
      form.setValue("propLandmark", draftProperty.propLandmark || "");
      form.setValue(
        "pricePerNight",
        Number(draftProperty.pricePerNight) || 1000,
      );
      form.setValue("maxGuests", draftProperty.maxGuests || 2);
      form.setValue("bedrooms", draftProperty.bedrooms || 1);
      form.setValue("beds", draftProperty.beds || 1);
      form.setValue("bathrooms", draftProperty.bathrooms || 1);
      form.setValue("policies", draftProperty.policies || "");

      // Pre-fill user info including phone from user record
      if (user) {
        form.setValue("firstName", user.firstName || "");
        form.setValue("lastName", user.lastName || "");
        form.setValue("email", user.email || "");
        // Pre-fill phone from user record (captured during quick listing)
        if ((user as any).phone) {
          form.setValue("phone", (user as any).phone);
        }
      }

      // Pre-fill images from draft property
      if (draftProperty.categorizedImages) {
        setCategorizedImages(draftProperty.categorizedImages);
      } else if (
        draftProperty.images &&
        Array.isArray(draftProperty.images) &&
        draftProperty.images.length > 0
      ) {
        // Convert flat images array to categorized format
        setCategorizedImages({
          ...defaultCategorizedImages,
          exterior: draftProperty.images.map((url: string) => ({
            url,
            caption: "",
          })),
        });
      }

      // Pre-fill amenities if available
      if (draftProperty.amenityIds && Array.isArray(draftProperty.amenityIds)) {
        setSelectedAmenities(draftProperty.amenityIds.map(String));
      }

      toast({
        title: "Continuing your listing",
        description:
          "Your previously saved information has been loaded. You can edit any details or add more documents.",
      });
    }
  }, [isCompleteMode, draftProperty, form, user, toast]);

  // Separate effect to pre-fill KYC data when available (handles race condition with draft property)
  const hasLoadedKycForCompleteMode = useRef(false);
  useEffect(() => {
    // Only run for complete mode when KYC data is available and hasn't been loaded yet
    if (
      !isCompleteMode ||
      !existingKycApplication ||
      hasLoadedKycForCompleteMode.current
    )
      return;
    // Don't run for rejected KYC (that's handled separately)
    if (existingKycApplication.status === "rejected") return;

    hasLoadedKycForCompleteMode.current = true;

    // Pre-fill business info from existing KYC application
    if (existingKycApplication.businessName)
      form.setValue("businessName", existingKycApplication.businessName);
    if (existingKycApplication.flatNo)
      form.setValue("kycFlatNo", existingKycApplication.flatNo);
    if (existingKycApplication.houseNo)
      form.setValue("kycHouseNo", existingKycApplication.houseNo);
    if (existingKycApplication.streetAddress)
      form.setValue("kycStreetAddress", existingKycApplication.streetAddress);
    if (existingKycApplication.landmark)
      form.setValue("kycLandmark", existingKycApplication.landmark);
    if (existingKycApplication.locality)
      form.setValue("kycLocality", existingKycApplication.locality);
    if (existingKycApplication.city)
      form.setValue("kycCity", existingKycApplication.city);
    if (existingKycApplication.district)
      form.setValue("kycDistrict", existingKycApplication.district);
    if (existingKycApplication.state)
      form.setValue("kycState", existingKycApplication.state);
    if (existingKycApplication.pincode)
      form.setValue("kycPincode", existingKycApplication.pincode);
    if (existingKycApplication.gstNumber)
      form.setValue("gstNumber", existingKycApplication.gstNumber);
    if (existingKycApplication.panNumber)
      form.setValue("panNumber", existingKycApplication.panNumber);
    if (existingKycApplication.phone)
      form.setValue("phone", existingKycApplication.phone);

    // Pre-fill documents from existing KYC application
    const existingDocs = {
      propertyOwnership:
        (existingKycApplication.propertyOwnershipDocs as any[]) || [],
      identityProof: (existingKycApplication.identityProofDocs as any[]) || [],
      businessLicense:
        (existingKycApplication.businessLicenseDocs as any[]) || [],
      noc: (existingKycApplication.nocDocs as any[]) || [],
      safetyCertificates:
        (existingKycApplication.safetyCertificateDocs as any[]) || [],
    };
    // Only set documents if there are any
    const hasExistingDocs = Object.values(existingDocs).some(
      (arr) => arr.length > 0,
    );
    if (hasExistingDocs) {
      setKycDocuments(existingDocs);
    }
  }, [isCompleteMode, existingKycApplication, form]);

  // Helper function to clear wizard draft from localStorage
  const clearWizardDraft = useCallback(() => {
    try {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear wizard draft:", error);
    }
  }, []);

  // Auto-save state management
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedDraft = useRef(false);
  const lastSavedDataRef = useRef<string>("");
  const [formChangeCounter, setFormChangeCounter] = useState(0);

  // Subscribe to form changes to trigger auto-save
  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = form.watch(() => {
      // Increment counter to trigger the save effect
      setFormChangeCounter((prev) => prev + 1);
    });

    return () => subscription.unsubscribe();
  }, [form, isAuthenticated]);

  // Save wizard data to localStorage with debounce - only when authenticated
  useEffect(() => {
    // Don't save if not authenticated
    if (!isAuthenticated) return;
    // Don't save if we haven't finished initial loading
    if (!hasLoadedDraft.current) return;
    // Don't save for KYC resubmission (they already have existing data)
    if (isKycResubmission) return;

    // Get current form values
    const currentFormValues = form.getValues();

    // Create the data object to save
    const draftData = {
      formValues: currentFormValues,
      categorizedImages,
      kycDocuments,
      selectedAmenities,
      videos,
      propertyAddress,
      step,
      savedAt: new Date().toISOString(),
    };

    // Serialize and compare to avoid unnecessary saves
    const serialized = JSON.stringify(draftData);
    if (serialized === lastSavedDataRef.current) return;

    // Debounce saving to avoid too many writes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(WIZARD_STORAGE_KEY, serialized);
        lastSavedDataRef.current = serialized;
      } catch (error) {
        console.error("Failed to save wizard draft:", error);
      }
    }, 1000); // Save after 1 second of no changes

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    isAuthenticated,
    categorizedImages,
    kycDocuments,
    selectedAmenities,
    videos,
    propertyAddress,
    step,
    isKycResubmission,
    form,
    formChangeCounter,
  ]);

  // Load saved draft data on mount - only when authenticated
  useEffect(() => {
    // Don't load if not authenticated
    if (!isAuthenticated) return;
    if (hasLoadedDraft.current) return;
    // Don't load draft for KYC resubmission (they have existing data)
    if (isKycResubmission) {
      hasLoadedDraft.current = true;
      return;
    }

    try {
      const savedDraft = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (!savedDraft) {
        hasLoadedDraft.current = true;
        return;
      }

      // Safely parse JSON with error handling
      let draftData: any;
      try {
        draftData = JSON.parse(savedDraft);
      } catch (parseError) {
        console.error(
          "Failed to parse wizard draft, clearing corrupted data:",
          parseError,
        );
        clearWizardDraft();
        hasLoadedDraft.current = true;
        return;
      }

      // Validate the parsed data structure
      if (!draftData || typeof draftData !== "object" || !draftData.savedAt) {
        console.error("Invalid wizard draft structure, clearing");
        clearWizardDraft();
        hasLoadedDraft.current = true;
        return;
      }

      // Check if draft is not too old (7 days max)
      const savedAt = new Date(draftData.savedAt);
      if (isNaN(savedAt.getTime())) {
        console.error("Invalid savedAt date in wizard draft, clearing");
        clearWizardDraft();
        hasLoadedDraft.current = true;
        return;
      }

      const now = new Date();
      const daysDiff =
        (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff >= 7) {
        // Draft is too old, clear it
        clearWizardDraft();
        hasLoadedDraft.current = true;
        return;
      }

      // Restore form values (preserve user's email from current session)
      if (draftData.formValues && typeof draftData.formValues === "object") {
        const restoredValues = {
          ...draftData.formValues,
          email: user?.email || draftData.formValues.email,
          firstName: user?.firstName || draftData.formValues.firstName,
          lastName: user?.lastName || draftData.formValues.lastName,
        };
        form.reset(restoredValues);
      }

      // Restore additional state with type checking
      if (
        draftData.categorizedImages &&
        typeof draftData.categorizedImages === "object"
      ) {
        setCategorizedImages(draftData.categorizedImages);
      }
      if (
        draftData.kycDocuments &&
        typeof draftData.kycDocuments === "object"
      ) {
        setKycDocuments(draftData.kycDocuments);
      }
      if (Array.isArray(draftData.selectedAmenities)) {
        setSelectedAmenities(draftData.selectedAmenities);
      }
      if (Array.isArray(draftData.videos)) {
        setVideos(draftData.videos);
      }
      if (
        draftData.propertyAddress &&
        typeof draftData.propertyAddress === "object"
      ) {
        setPropertyAddress(draftData.propertyAddress);
      }
      // Restore step if it's valid for current user's KYC status
      if (
        typeof draftData.step === "number" &&
        draftData.step >= firstStep &&
        draftData.step <= totalSteps
      ) {
        setStep(draftData.step);
      }

      toast({
        title: "Draft Restored",
        description: "Your previously saved progress has been restored.",
      });
    } catch (error) {
      console.error("Failed to load wizard draft:", error);
      // Clear corrupted data to prevent future errors
      clearWizardDraft();
    }

    hasLoadedDraft.current = true;
  }, [
    isAuthenticated,
    form,
    user,
    isKycResubmission,
    firstStep,
    totalSteps,
    clearWizardDraft,
    toast,
  ]);

  // KYC PIN code lookup
  const handleKycPincodeChange = async (pincode: string) => {
    form.setValue("kycPincode", pincode);
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setIsPincodeLookup(true);
      try {
        const response = await fetch(
          `https://api.postalpincode.in/pincode/${pincode}`,
        );
        const data = await response.json();
        if (
          data &&
          data[0]?.Status === "Success" &&
          data[0]?.PostOffice?.length > 0
        ) {
          const postOffice = data[0].PostOffice[0];
          form.setValue("kycCity", postOffice.District || "");
          form.setValue("kycDistrict", postOffice.District || "");
          form.setValue("kycState", postOffice.State || "");
          form.setValue("kycLocality", postOffice.Name || "");
          toast({
            title: "PIN Code Found!",
            description: `${postOffice.Name}, ${postOffice.District}, ${postOffice.State}`,
          });
        } else {
          toast({
            title: "Invalid PIN Code",
            description: "Please enter a valid Indian PIN code.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Lookup Failed",
          description: "Please enter city and state manually.",
          variant: "destructive",
        });
      } finally {
        setIsPincodeLookup(false);
      }
    }
  };

  // Property PIN code lookup
  const handlePropertyPincodeChange = async (pincode: string) => {
    form.setValue("propPincode", pincode);
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setIsPropertyPincodeLookup(true);
      try {
        const response = await fetch(
          `https://api.postalpincode.in/pincode/${pincode}`,
        );
        const data = await response.json();
        if (
          data &&
          data[0]?.Status === "Success" &&
          data[0]?.PostOffice?.length > 0
        ) {
          const postOffice = data[0].PostOffice[0];
          form.setValue("propCity", postOffice.District || "");
          form.setValue("propDistrict", postOffice.District || "");
          form.setValue("propState", postOffice.State || "");
          form.setValue("propLocality", postOffice.Name || "");
          form.setValue("destination", postOffice.District || "");
          toast({
            title: "PIN Code Found!",
            description: `${postOffice.Name}, ${postOffice.District}, ${postOffice.State}`,
          });
        } else {
          toast({
            title: "Invalid PIN Code",
            description: "Please enter a valid Indian PIN code.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Lookup Failed",
          description: "Please enter city and state manually.",
          variant: "destructive",
        });
      } finally {
        setIsPropertyPincodeLookup(false);
      }
    }
  };

  const getTotalImageCount = () => {
    return Object.values(categorizedImages).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0,
    );
  };

  // Photo category completion tracking
  const getPhotoCategoryStats = () => {
    const categories = [
      { id: "exterior", label: "Exterior", minRecommended: 3, required: true },
      {
        id: "reception",
        label: "Reception & Lobby",
        minRecommended: 2,
        required: false,
      },
      { id: "room", label: "Room Photos", minRecommended: 5, required: true },
      { id: "bathroom", label: "Bathroom", minRecommended: 2, required: true },
      {
        id: "amenities",
        label: "Amenities",
        minRecommended: 3,
        required: false,
      },
      {
        id: "food",
        label: "Food & Dining",
        minRecommended: 2,
        required: false,
      },
    ];

    return categories.map((cat) => ({
      ...cat,
      count: (categorizedImages as any)[cat.id]?.length || 0,
      isComplete:
        ((categorizedImages as any)[cat.id]?.length || 0) >= cat.minRecommended,
      hasAny: ((categorizedImages as any)[cat.id]?.length || 0) > 0,
    }));
  };

  const getIncompleteRequiredCategories = () => {
    return getPhotoCategoryStats().filter((cat) => cat.required && !cat.hasAny);
  };

  const getCompletedCategoriesCount = () => {
    return getPhotoCategoryStats().filter((cat) => cat.hasAny).length;
  };

  // KYC-only resubmission mutation for rejected applications
  const kycResubmitMutation = useMutation({
    mutationFn: async (data: CombinedFormData) => {
      // For KYC resubmission, validate documents based on what was flagged
      if (hasTargetedRejection) {
        // Only validate flagged document sections
        const missingDocs: string[] = [];
        if (
          flaggedSections.has("propertyOwnership") &&
          (!kycDocuments.propertyOwnership ||
            kycDocuments.propertyOwnership.length === 0)
        ) {
          missingDocs.push("Property Ownership Proof");
        }
        if (
          flaggedSections.has("identityProof") &&
          (!kycDocuments.identityProof ||
            kycDocuments.identityProof.length === 0)
        ) {
          missingDocs.push("Owner Identity Proof");
        }
        if (missingDocs.length > 0) {
          throw new Error(
            `Missing mandatory documents: ${missingDocs.join(", ")}`,
          );
        }
      } else {
        // No targeted rejection - validate all mandatory docs
        const missingDocs: string[] = [];
        if (
          !kycDocuments.propertyOwnership ||
          kycDocuments.propertyOwnership.length === 0
        ) {
          missingDocs.push("Property Ownership Proof");
        }
        if (
          !kycDocuments.identityProof ||
          kycDocuments.identityProof.length === 0
        ) {
          missingDocs.push("Owner Identity Proof");
        }
        if (missingDocs.length > 0) {
          throw new Error(
            `Missing mandatory documents: ${missingDocs.join(", ")}`,
          );
        }
      }

      // Submit KYC only (uses the /api/kyc/submit endpoint which now handles resubmission)
      const response = await apiRequest("POST", "/api/kyc/submit", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        businessName: data.businessName,
        flatNo: data.kycFlatNo,
        houseNo: data.kycHouseNo,
        streetAddress: data.kycStreetAddress,
        landmark: data.kycLandmark,
        locality: data.kycLocality,
        city: data.kycCity,
        district: data.kycDistrict,
        state: data.kycState,
        pincode: data.kycPincode,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        propertyOwnershipDocs: kycDocuments.propertyOwnership,
        identityProofDocs: kycDocuments.identityProof,
        businessLicenseDocs: kycDocuments.businessLicense,
        nocDocs: kycDocuments.noc,
        safetyCertificateDocs: kycDocuments.safetyCertificates,
      });
      return await response.json();
    },
    onSuccess: () => {
      clearWizardDraft(); // Clear saved draft on successful submission
      toast({
        title: "KYC Resubmission Successful!",
        description:
          "Your updated KYC information has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/status"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Resubmission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: CombinedFormData) => {
      // Validate mandatory KYC documents
      const missingDocs: string[] = [];
      if (
        !kycDocuments.propertyOwnership ||
        kycDocuments.propertyOwnership.length === 0
      ) {
        missingDocs.push("Property Ownership Proof");
      }
      if (
        !kycDocuments.identityProof ||
        kycDocuments.identityProof.length === 0
      ) {
        missingDocs.push("Owner Identity Proof");
      }
      if (missingDocs.length > 0) {
        throw new Error(
          `Missing mandatory documents: ${missingDocs.join(", ")}`,
        );
      }

      // Validate property images
      const allImages = getImagesArrayFromCategorized(categorizedImages);
      if (allImages.length === 0) {
        throw new Error("Please upload at least one property image");
      }

      // Calculate fallback pricing from room types if no base price set
      const basePrice =
        data.pricePerNight ||
        (wizardRoomTypes.length > 0 ? wizardRoomTypes[0].basePrice : 1000);
      const maxGuests =
        data.maxGuests ||
        (wizardRoomTypes.length > 0
          ? Math.max(...wizardRoomTypes.map((rt) => rt.maxGuests))
          : 2);

      // Submit combined KYC + Property
      const response = await apiRequest(
        "POST",
        "/api/kyc/submit-with-property",
        {
          // KYC data
          kyc: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            businessName: data.businessName,
            flatNo: data.kycFlatNo,
            houseNo: data.kycHouseNo,
            streetAddress: data.kycStreetAddress,
            landmark: data.kycLandmark,
            locality: data.kycLocality,
            city: data.kycCity,
            district: data.kycDistrict,
            state: data.kycState,
            pincode: data.kycPincode,
            gstNumber: data.gstNumber,
            panNumber: data.panNumber,
            propertyOwnershipDocs: kycDocuments.propertyOwnership,
            identityProofDocs: kycDocuments.identityProof,
            businessLicenseDocs: kycDocuments.businessLicense,
            nocDocs: kycDocuments.noc,
            safetyCertificateDocs: kycDocuments.safetyCertificates,
          },
          // Property data
          property: {
            title: data.propertyTitle,
            propertyType: data.propertyType,
            description: data.description,
            destination: data.destination || data.propCity,
            propFlatNo: data.propFlatNo,
            propHouseNo: data.propHouseNo,
            propStreetAddress: data.propStreetAddress,
            propLandmark: data.propLandmark,
            propLocality: data.propLocality,
            propCity: data.propCity,
            propDistrict: data.propDistrict,
            propState: data.propState,
            propPincode: data.propPincode,
            latitude: propertyLatitude,
            longitude: propertyLongitude,
            geoVerified: !!(propertyLatitude && propertyLongitude),
            geoSource: geoSource,
            pricePerNight: basePrice,
            singleOccupancyPrice: data.singleOccupancyPrice || null,
            doubleOccupancyPrice: data.doubleOccupancyPrice || null,
            tripleOccupancyPrice: data.tripleOccupancyPrice || null,
            bulkBookingEnabled: data.bulkBookingEnabled || false,
            bulkBookingMinRooms: data.bulkBookingMinRooms || 5,
            bulkBookingDiscountPercent: data.bulkBookingDiscountPercent || 10,
            maxGuests: maxGuests,
            bedrooms: data.bedrooms || 1,
            beds: data.beds || 1,
            bathrooms: data.bathrooms || 1,
            policies: data.policies,
            localIdAllowed: data.localIdAllowed ?? true,
            hourlyBookingAllowed: data.hourlyBookingAllowed ?? false,
            foreignGuestsAllowed: data.foreignGuestsAllowed ?? true,
            coupleFriendly: data.coupleFriendly ?? true,
            images: allImages,
            categorizedImages: categorizedImages,
            videos: videos,
            amenityIds: selectedAmenities,
          },
          // Room types to create after property
          roomTypes: wizardRoomTypes.map((rt) => ({
            name: rt.name,
            description: rt.description,
            basePrice: rt.basePrice,
            maxGuests: rt.maxGuests,
            totalRooms: rt.totalRooms,
            mealOptions: rt.mealOptions.map((mo) => ({
              name: mo.name,
              inclusions: mo.inclusions,
              priceAdjustment: mo.priceAdjustment,
            })),
          })),
        },
      );
      return await response.json();
    },
    onSuccess: () => {
      clearWizardDraft(); // Clear saved draft on successful submission
      toast({
        title: "Application Submitted Successfully!",
        description:
          "Your KYC and property listing have been submitted for review. You'll be notified once approved.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CombinedFormData) => {
    submitMutation.mutate(data);
  };

  // Quick listing mutation - Phase 1 (soft onboarding, creates draft property)
  const quickSubmitMutation = useMutation({
    mutationFn: async (data: CombinedFormData) => {
      // Validate minimum required images for quick listing
      const allImages = getImagesArrayFromCategorized(categorizedImages);
      if (allImages.length === 0) {
        throw new Error("Please upload at least one property image");
      }

      // Validate geo coordinates
      if (!propertyLatitude || !propertyLongitude) {
        throw new Error("Please set your property location on the map");
      }

      // Submit as draft property
      const response = await apiRequest(
        "POST",
        "/api/properties/create-draft",
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          propertyTitle: data.propertyTitle,
          propertyType: data.propertyType,
          propCity: data.propCity,
          propState: data.propState || "",
          propDistrict: data.propDistrict || "",
          pricePerNight: data.pricePerNight,
          images: allImages,
          categorizedImages: categorizedImages,
          latitude: propertyLatitude,
          longitude: propertyLongitude,
          geoVerified: true,
          geoSource: geoSource || "manual_pin",
        },
      );
      return await response.json();
    },
    onSuccess: () => {
      clearWizardDraft();
      toast({
        title: "Property Draft Created!",
        description:
          "Your property listing has been saved as a draft. Complete KYC verification to publish it.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/properties/my-properties"],
      });
      setLocation("/owner/dashboard");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onQuickSubmit = async () => {
    const formData = form.getValues();

    // Validate using quick listing schema (not the full combined schema)
    const quickData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      propertyTitle: formData.propertyTitle,
      propertyType: formData.propertyType,
      propCity: formData.propCity,
      propState: formData.propState,
      propDistrict: formData.propDistrict,
      pricePerNight: formData.pricePerNight,
    };

    const result = quickListingSchema.safeParse(quickData);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: "Please fill required fields",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    // Check images
    const allImages = getImagesArrayFromCategorized(categorizedImages);
    if (allImages.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least one property photo",
        variant: "destructive",
      });
      return;
    }

    // Check location
    if (!propertyLatitude || !propertyLongitude) {
      toast({
        title: "Location Required",
        description: "Please set your property location on the map",
        variant: "destructive",
      });
      return;
    }

    quickSubmitMutation.mutate(formData);
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof CombinedFormData)[] = [];

    // Quick mode validation
    if (isQuickMode) {
      if (step === 1) {
        fieldsToValidate = ["firstName", "lastName", "email", "phone"];
      }
      // Step 2 in quick mode validates property + photos (handled in submit)
    } else {
      // Full mode validation
      if (step === 1) {
        fieldsToValidate = ["firstName", "lastName", "email", "phone"];
      } else if (step === 2) {
        fieldsToValidate = [
          "businessName",
          "kycStreetAddress",
          "kycLocality",
          "kycCity",
          "kycDistrict",
          "kycState",
          "kycPincode",
          "panNumber",
        ];
      } else if (step === 3) {
        fieldsToValidate = [
          "propertyTitle",
          "propertyType",
          "description",
          "propStreetAddress",
          "propLocality",
          "propCity",
          "propDistrict",
          "propState",
          "propPincode",
        ];
        // Also validate that at least one room type is added
        if (wizardRoomTypes.length === 0) {
          toast({
            title: "Room Types Required",
            description:
              "Please add at least one room type with pricing before proceeding.",
            variant: "destructive",
          });
          return;
        }
      } else if (step === 4) {
        // Step 4 is Property Location - requires latitude and longitude
        if (!propertyLatitude || !propertyLongitude) {
          toast({
            title: "Property Location Required",
            description:
              "Please set the exact location of your property to continue.",
            variant: "destructive",
          });
          return;
        }
        fieldsToValidate = [];
      } else if (step === 5) {
        // Step 5 is Amenities - optional, no required fields
        fieldsToValidate = [];
      }
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    } else {
      // Scroll to first error field and show toast
      setTimeout(() => scrollToFirstError(fieldsToValidate), 100);
      toast({
        title: "Please fill required fields",
        description: "Some fields need your attention before proceeding",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => setStep(step - 1);

  // Navigate directly to a step by clicking on header
  const goToStep = async (targetStep: number) => {
    if (targetStep === step) return; // Already on this step

    // Can always go back to previous completed steps
    if (targetStep < step) {
      setStep(targetStep);
      return;
    }

    // Going forward - validate ALL steps from 1 up to targetStep-1
    for (let s = 1; s < targetStep; s++) {
      let fieldsToValidate: (keyof CombinedFormData)[] = [];

      if (s === 1) {
        fieldsToValidate = ["firstName", "lastName", "email", "phone"];
      } else if (s === 2) {
        fieldsToValidate = [
          "businessName",
          "kycStreetAddress",
          "kycLocality",
          "kycCity",
          "kycDistrict",
          "kycState",
          "kycPincode",
          "panNumber",
        ];
      } else if (s === 3) {
        fieldsToValidate = [
          "propertyTitle",
          "propertyType",
          "description",
          "propStreetAddress",
          "propLocality",
          "propCity",
          "propDistrict",
          "propState",
          "propPincode",
        ];
        // Also validate that at least one room type is added
        if (wizardRoomTypes.length === 0) {
          setStep(s);
          toast({
            title: "Room Types Required",
            description:
              "Please add at least one room type with pricing before proceeding.",
            variant: "destructive",
          });
          return;
        }
      } else if (s === 4) {
        // Step 4 is Property Location - requires latitude and longitude
        if (!propertyLatitude || !propertyLongitude) {
          setStep(s);
          toast({
            title: "Property Location Required",
            description:
              "Please set the exact location of your property to continue.",
            variant: "destructive",
          });
          return;
        }
        fieldsToValidate = [];
      } else if (s === 5) {
        // Step 5 is Amenities - optional, no required fields
        fieldsToValidate = [];
      }

      const isValid = await form.trigger(fieldsToValidate);
      if (!isValid) {
        setStep(s); // Stop at the first invalid step
        // Scroll to first error after step change
        setTimeout(() => scrollToFirstError(fieldsToValidate), 100);
        toast({
          title: "Please complete this step",
          description: "Fill in all required fields before proceeding",
          variant: "destructive",
        });
        return;
      }
    }

    setStep(targetStep);
  };

  // Step titles for full mode
  const fullModeStepTitles = [
    { title: "Personal Information", icon: User },
    { title: "Business & KYC Documents", icon: FileText },
    { title: "Property Details & Room Types", icon: Home },
    { title: "Property Location", icon: MapPin },
    { title: "Amenities & Extras", icon: Building2 },
    { title: "Photos & Submit", icon: CheckCircle },
  ];

  // Step titles for quick mode
  const quickModeStepTitles = [
    { title: "Basic Information", icon: User },
    { title: "Property & Photos", icon: Camera },
  ];

  const stepTitles = isQuickMode ? quickModeStepTitles : fullModeStepTitles;

  // Handle KYC Resubmission mode - dedicated simple UI for rejected applications
  const handleKycResubmit = () => {
    const data = form.getValues();
    kycResubmitMutation.mutate(data);
  };

  // Show loading state while checking authentication - MUST BE FIRST
  if (isAuthLoading || isLoadingKyc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              List Your Property on ZECOHO (Free)
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Login or create an account to continue
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Join our ZERO commission platform and start getting direct
              bookings today.
            </p>
            <Button
              className="w-full"
              onClick={() => setLocation("/login")}
              data-testid="button-login-to-list"
            >
              Continue to Get Bookings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/")}
              data-testid="button-back-home"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mode selection screen - show for new users who haven't selected a mode yet
  // Skip mode selection for: verified/pending KYC users, KYC resubmission
  if (listingMode === null && !canSkipKycSteps && !isKycResubmission) {
    // Show loading while checking for existing draft property
    if (isLoadingDraft) {
      return (
        <div
          className="min-h-screen bg-background flex items-center justify-center"
          data-testid="loading-draft-check"
        >
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }

    // If user has a draft property, show loading while redirecting (handled by useEffect)
    if (draftProperty && draftProperty.id) {
      return (
        <div
          className="min-h-screen bg-background flex items-center justify-center"
          data-testid="redirecting-to-complete"
        >
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Continuing your listing...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-muted/30 pb-16">
        <div className="container px-4 md:px-6 py-8 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-3">List Your Property</h1>
            <p className="text-muted-foreground text-lg">
              Choose how you'd like to get started
            </p>
          </div>

          <div className="grid md:grid-cols-1 gap-6">
            <Card
              className="hover-elevate cursor-pointer border-2 hover:border-primary transition-colors"
              onClick={() => {
                setListingMode("full");
                setStep(1);
              }}
            >
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">Complete Application</CardTitle>
                <CardDescription className="text-base">
                  Full verification for immediate publishing
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <Button className="w-full">Start Full Application</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // If user has rejected KYC with targeted sections, show resubmission-only view
  if (isKycResubmission && hasTargetedRejection) {
    return (
      <div className="min-h-screen bg-muted/30 pb-16">
        <div className="container px-4 md:px-6 py-8 max-w-3xl mx-auto">
          {/* Header for Resubmission */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-semibold">
                Update Your KYC Application
              </h1>
            </div>
            <p className="text-muted-foreground">
              Your previous application was returned for updates. Please review
              and update the sections highlighted below.
            </p>
          </div>

          {/* Overall rejection reason if provided */}
          {existingKycApplication?.reviewNotes && (
            <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <XCircle className="h-5 w-5" />
                  Admin Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  {existingKycApplication.reviewNotes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Flagged Sections Summary */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Sections Requiring Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rejectionDetails?.sections?.map((section) => {
                  const sectionInfo = SECTION_LABELS[section.sectionId];
                  const Icon = sectionInfo?.icon || AlertTriangle;
                  return (
                    <div
                      key={section.sectionId}
                      className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900"
                    >
                      <Icon className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">
                          {sectionInfo?.label || section.sectionId}
                        </p>
                        {section.message && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {section.message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleKycResubmit();
              }}
            >
              {/* Conditionally render only flagged sections */}

              {/* Personal Information Section */}
              {flaggedSections.has("personal") && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                      <span className="ml-auto text-xs font-normal px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 rounded-full">
                        Needs Update
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John"
                                {...field}
                                data-testid="input-first-name"
                              />
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
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Doe"
                                {...field}
                                data-testid="input-last-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                              data-testid="input-email"
                            />
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
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+91 98765 43210"
                              {...field}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Business Information Section */}
              {flaggedSections.has("business") && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Business Information
                      <span className="ml-auto text-xs font-normal px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 rounded-full">
                        Needs Update
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your Hotel or Business Name"
                              {...field}
                              data-testid="input-business-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Detailed Address Fields */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="kycFlatNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flat / Apartment No.</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., A-101" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="kycHouseNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>House / Building No.</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="kycStreetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Street name / Road name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="kycLandmark"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Landmark (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Near Metro Station"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="kycLocality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Locality / Area *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Connaught Place"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="kycPincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PIN Code *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="6-digit PIN"
                              {...field}
                              onChange={(e) =>
                                handleKycPincodeChange(e.target.value)
                              }
                              data-testid="input-kyc-pincode"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="kycCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="City"
                                {...field}
                                data-testid="input-kyc-city"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="kycDistrict"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>District *</FormLabel>
                            <FormControl>
                              <Input placeholder="District" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="kycState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="State"
                              {...field}
                              data-testid="input-kyc-state"
                            />
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
                            <FormLabel>PAN Number *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ABCDE1234F"
                                maxLength={10}
                                {...field}
                                data-testid="input-pan-number"
                              />
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
                              <Input
                                placeholder="22AAAAA0000A1Z5"
                                {...field}
                                data-testid="input-gst-number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Document Sections - show only flagged document categories */}
              {flaggedDocumentCategories.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      KYC Documents
                      <span className="ml-auto text-xs font-normal px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 rounded-full">
                        Needs Update
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Please upload the required documents for the flagged
                      categories below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <KycDocumentUploader
                      value={kycDocuments}
                      onChange={setKycDocuments}
                      flaggedCategories={flaggedDocumentCategories}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Submit Button */}
              <div className="flex justify-between items-center mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                  data-testid="button-cancel-resubmit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={kycResubmitMutation.isPending}
                  data-testid="button-submit-resubmit"
                >
                  {kycResubmitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Resubmit Application
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      <div className="container px-4 md:px-6 py-8 max-w-4xl mx-auto">
        {/* Header - minimal to save space */}

        {/* Progress Steps - Clickable Headers */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {stepTitles.map((s, i) => {
              const Icon = s.icon;
              const stepNumber = i + 1;
              const isActive = stepNumber === step;
              const isCompleted = stepNumber < step;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToStep(stepNumber)}
                  className="flex flex-col items-center flex-1 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg p-1"
                  data-testid={`step-nav-${stepNumber}`}
                  aria-label={`Go to step ${stepNumber}: ${s.title}${isCompleted ? " (completed)" : isActive ? " (current)" : ""}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs text-center hidden md:block transition-colors ${
                      isActive
                        ? "font-medium text-foreground"
                        : isCompleted
                          ? "text-primary group-hover:text-primary/80"
                          : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {s.title}
                  </span>
                  {i < stepTitles.length - 1 && (
                    <div
                      className={`hidden md:block absolute h-0.5 w-full ${isCompleted ? "bg-primary" : "bg-muted"}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div
            className="mt-4 flex gap-1"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={stepTitles.length}
          >
            {stepTitles.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToStep(i + 1)}
                className={`h-1.5 flex-1 rounded-full cursor-pointer transition-all hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary ${i < step ? "bg-primary" : "bg-muted"}`}
                data-testid={`progress-bar-${i + 1}`}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
              />
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Personal Information */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    {isCompleteMode
                      ? "Your details are pre-filled from your previous submission. You can edit any information below."
                      : "Tell us about yourself as the property owner"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              {...field}
                              data-testid="input-first-name"
                            />
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
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              {...field}
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            {...field}
                            data-testid="input-email"
                          />
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
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+91 98765 43210"
                            {...field}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Quick Mode Step 2: Property Basics + Photos */}
            {isQuickMode && step === 2 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Property Basics
                    </CardTitle>
                    <CardDescription>
                      Tell us about your property
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="propertyTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Sunrise Beach Resort"
                              {...field}
                              data-testid="input-quick-property-title"
                            />
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
                          <FormLabel>Property Type *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-quick-property-type">
                                <SelectValue placeholder="Select property type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hotel">Hotel</SelectItem>
                              <SelectItem value="villa">Villa</SelectItem>
                              <SelectItem value="apartment">
                                Apartment
                              </SelectItem>
                              <SelectItem value="resort">Resort</SelectItem>
                              <SelectItem value="hostel">Hostel</SelectItem>
                              <SelectItem value="lodge">Lodge</SelectItem>
                              <SelectItem value="cottage">Cottage</SelectItem>
                              <SelectItem value="farmhouse">
                                Farmhouse
                              </SelectItem>
                              <SelectItem value="homestay">Homestay</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="propCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <CitySearchInput
                              value={field.value}
                              onChange={(city, state, district) => {
                                form.setValue("propCity", city);
                                if (state) form.setValue("propState", state);
                                if (district)
                                  form.setValue("propDistrict", district);
                              }}
                              placeholder="Search for any city in India"
                              data-testid="input-quick-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pricePerNight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per Night (₹) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1500"
                              {...field}
                              data-testid="input-quick-price"
                            />
                          </FormControl>
                          <p
                            className="text-xs text-muted-foreground"
                            data-testid="text-price-helper"
                          >
                            Minimum ₹100 per night
                          </p>
                          <PriceGuidanceWidget
                            propertyType={form.watch("propertyType")}
                            city={form.watch("propCity")}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Property Photos
                    </CardTitle>
                    <CardDescription>
                      Add at least one photo of your property
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PropertyImageUploader
                      value={categorizedImages}
                      onChange={setCategorizedImages}
                    />
                    {getTotalImageCount() === 0 && (
                      <p className="text-sm text-destructive mt-2">
                        Please upload at least one photo
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Property Location
                    </CardTitle>
                    <CardDescription>
                      Set your property's exact location on the map
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PropertyLocationPicker
                      latitude={propertyLatitude}
                      longitude={propertyLongitude}
                      onLocationChange={(lat, lng, source, addressData) => {
                        setPropertyLatitude(lat);
                        setPropertyLongitude(lng);
                        setGeoSource(source || null);
                        if (addressData) {
                          if (addressData.streetAddress)
                            form.setValue(
                              "propStreetAddress",
                              addressData.streetAddress,
                            );
                          if (addressData.locality)
                            form.setValue("propLocality", addressData.locality);
                          if (addressData.city)
                            form.setValue("propCity", addressData.city);
                          if (addressData.district)
                            form.setValue("propDistrict", addressData.district);
                          if (addressData.state)
                            form.setValue("propState", addressData.state);
                          if (addressData.pincode)
                            form.setValue("propPincode", addressData.pincode);
                          if (addressData.fullAddress) {
                            setPropertyAddress((prev) => ({
                              ...prev,
                              fullAddress: addressData.fullAddress,
                            }));
                          }
                        }
                      }}
                    />
                    {(!propertyLatitude || !propertyLongitude) && (
                      <p className="text-sm text-destructive mt-2">
                        Please set your property location on the map
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Business & KYC Documents (Full Mode Only) */}
            {!isQuickMode && step === 2 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Business Information
                    </CardTitle>
                    <CardDescription>
                      {isCompleteMode && existingKycApplication
                        ? "Your business details are pre-filled. You can edit any information or add more documents below."
                        : "Your business details for verification"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your Hotel or Business Name"
                              {...field}
                              data-testid="input-business-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Detailed Address Fields */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="kycFlatNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flat / Apartment No.</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., A-101"
                                {...field}
                                data-testid="input-kyc-flat"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="kycHouseNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>House / Building No.</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 123"
                                {...field}
                                data-testid="input-kyc-house"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="kycStreetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Street name / Road name"
                              {...field}
                              data-testid="input-kyc-street"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="kycLandmark"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Landmark (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Near Metro Station"
                                {...field}
                                data-testid="input-kyc-landmark"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="kycLocality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Locality / Area *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Connaught Place"
                                {...field}
                                data-testid="input-kyc-locality"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="kycPincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PIN Code *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Enter 6-digit PIN code"
                                {...field}
                                onChange={(e) =>
                                  handleKycPincodeChange(e.target.value)
                                }
                                maxLength={6}
                                data-testid="input-kyc-pincode"
                              />
                              {isPincodeLookup && (
                                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Enter PIN code to auto-fill location details
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="kycCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="City"
                                list="kyc-cities"
                                {...field}
                                data-testid="input-kyc-city"
                              />
                            </FormControl>
                            <datalist id="kyc-cities">
                              {INDIAN_CITIES.map((city) => (
                                <option key={city} value={city} />
                              ))}
                            </datalist>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="kycDistrict"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>District *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="District"
                                {...field}
                                data-testid="input-kyc-district"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="kycState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="State"
                              list="kyc-states"
                              {...field}
                              data-testid="input-kyc-state"
                            />
                          </FormControl>
                          <datalist id="kyc-states">
                            {INDIAN_STATES.map((state) => (
                              <option key={state} value={state} />
                            ))}
                          </datalist>
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
                            <FormLabel>PAN Number *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ABCDE1234F"
                                maxLength={10}
                                {...field}
                                data-testid="input-pan"
                              />
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
                              <Input
                                placeholder="22AAAAA0000A1Z5"
                                {...field}
                                data-testid="input-gst"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <KycDocumentUploader
                  value={kycDocuments}
                  onChange={setKycDocuments}
                />
              </div>
            )}

            {/* Step 3: Property Details */}
            {step === 3 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Property Details
                    </CardTitle>
                    <CardDescription>
                      Tell us about the property you want to list
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="propertyTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Title *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Beautiful Villa with Ocean View"
                              {...field}
                              data-testid="input-property-title"
                            />
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
                          <FormLabel>Property Type *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-property-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hotel">Hotel</SelectItem>
                              <SelectItem value="villa">Villa</SelectItem>
                              <SelectItem value="apartment">
                                Apartment
                              </SelectItem>
                              <SelectItem value="resort">Resort</SelectItem>
                              <SelectItem value="hostel">Hostel</SelectItem>
                              <SelectItem value="lodge">Lodge</SelectItem>
                              <SelectItem value="cottage">Cottage</SelectItem>
                              <SelectItem value="farmhouse">
                                Farmhouse
                              </SelectItem>
                              <SelectItem value="homestay">Homestay</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <Label className="text-base font-medium">
                            Property Location *
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Complete address details for the property
                          </p>
                        </div>
                        {form.watch("kycPincode") && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              // Copy all KYC address fields to property fields
                              form.setValue(
                                "propFlatNo",
                                form.getValues("kycFlatNo"),
                              );
                              form.setValue(
                                "propHouseNo",
                                form.getValues("kycHouseNo"),
                              );
                              form.setValue(
                                "propStreetAddress",
                                form.getValues("kycStreetAddress"),
                              );
                              form.setValue(
                                "propLandmark",
                                form.getValues("kycLandmark"),
                              );
                              form.setValue(
                                "propLocality",
                                form.getValues("kycLocality"),
                              );
                              form.setValue(
                                "propCity",
                                form.getValues("kycCity"),
                              );
                              form.setValue(
                                "propDistrict",
                                form.getValues("kycDistrict"),
                              );
                              form.setValue(
                                "propState",
                                form.getValues("kycState"),
                              );
                              form.setValue(
                                "propPincode",
                                form.getValues("kycPincode"),
                              );
                              form.setValue(
                                "destination",
                                form.getValues("kycCity"),
                              );

                              toast({
                                title: "Address copied",
                                description:
                                  "All business address details applied to property location",
                              });
                            }}
                            data-testid="button-same-as-business"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Same as business address
                          </Button>
                        )}
                      </div>

                      {/* Detailed Property Address Fields - same as Business section */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <FormField
                          control={form.control}
                          name="propFlatNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Flat / Apartment No.</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., A-101"
                                  {...field}
                                  data-testid="input-prop-flat"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="propHouseNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>House / Building No.</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., 123"
                                  {...field}
                                  data-testid="input-prop-house"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="propStreetAddress"
                        render={({ field }) => (
                          <FormItem className="mb-4">
                            <FormLabel>Street Address *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Street name / Road name"
                                {...field}
                                data-testid="input-prop-street"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <FormField
                          control={form.control}
                          name="propLandmark"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Landmark (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Near Metro Station"
                                  {...field}
                                  data-testid="input-prop-landmark"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="propLocality"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Locality / Area *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Connaught Place"
                                  {...field}
                                  data-testid="input-prop-locality"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="propPincode"
                        render={({ field }) => (
                          <FormItem className="mb-4">
                            <FormLabel>PIN Code *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="Enter 6-digit PIN code"
                                  {...field}
                                  onChange={(e) =>
                                    handlePropertyPincodeChange(e.target.value)
                                  }
                                  maxLength={6}
                                  data-testid="input-property-pincode"
                                />
                                {isPropertyPincodeLookup && (
                                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Enter PIN code to auto-fill location details
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <FormField
                          control={form.control}
                          name="propCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <FormControl>
                                <CitySearchInput
                                  value={field.value}
                                  onChange={(city, state, district) => {
                                    field.onChange(city);
                                    form.setValue("destination", city);
                                    if (state && !form.getValues("propState")) {
                                      form.setValue("propState", state);
                                    }
                                    if (
                                      district &&
                                      !form.getValues("propDistrict")
                                    ) {
                                      form.setValue("propDistrict", district);
                                    }
                                  }}
                                  placeholder="Search any Indian city..."
                                  testId="input-property-city"
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Search for any city in India including small
                                towns
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="propDistrict"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>District *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="District"
                                  {...field}
                                  data-testid="input-prop-district"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="propState"
                        render={({ field }) => (
                          <FormItem className="mb-4">
                            <FormLabel>State *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="State"
                                list="property-states"
                                {...field}
                                data-testid="input-property-state"
                              />
                            </FormControl>
                            <datalist id="property-states">
                              {INDIAN_STATES.map((state) => (
                                <option key={state} value={state} />
                              ))}
                            </datalist>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Hidden field for destination */}
                      <FormField
                        control={form.control}
                        name="destination"
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your property..."
                              rows={5}
                              maxLength={500}
                              {...field}
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <div className="flex items-center justify-between mt-1.5">
                            <p
                              className="text-xs text-muted-foreground"
                              data-testid="text-description-helper"
                            >
                              Tip: Mention unique features, nearby attractions,
                              and what makes your stay special
                            </p>
                            <span
                              className={`text-xs ${(field.value?.length || 0) > 450 ? "text-orange-500" : "text-muted-foreground"}`}
                              data-testid="text-description-counter"
                            >
                              {field.value?.length || 0}/500
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Guest Policies */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Guest Policies
                    </CardTitle>
                    <CardDescription>
                      Define who can book your property and booking options
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="coupleFriendly"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Couple Friendly
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Allow unmarried couples to check in
                              </p>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-couple-friendly"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="localIdAllowed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Local ID Allowed
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Accept guests with local ID proof
                              </p>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-local-id"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="foreignGuestsAllowed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Foreign Guests Allowed
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Accept international guests with passport
                              </p>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-foreign-guests"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hourlyBookingAllowed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Hourly Booking
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Allow guests to book by the hour
                              </p>
                            </div>
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-hourly-booking"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Room Types & Pricing */}
                <RoomTypeBuilder
                  value={wizardRoomTypes}
                  onChange={setWizardRoomTypes}
                  propertyType={form.watch("propertyType")}
                />
              </div>
            )}

            {/* Step 4: Property Location (Mandatory Geo-tagging) */}
            {step === 4 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Property Location
                    </CardTitle>
                    <CardDescription>
                      Set the exact location of your property. This is required
                      for your listing to be visible to guests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PropertyLocationPicker
                      latitude={propertyLatitude}
                      longitude={propertyLongitude}
                      onLocationChange={(lat, lng, source, addressData) => {
                        setPropertyLatitude(lat);
                        setPropertyLongitude(lng);
                        setGeoSource(source);
                        if (addressData) {
                          if (addressData.streetAddress)
                            form.setValue(
                              "propStreetAddress",
                              addressData.streetAddress,
                            );
                          if (addressData.locality)
                            form.setValue("propLocality", addressData.locality);
                          if (addressData.city)
                            form.setValue("propCity", addressData.city);
                          if (addressData.district)
                            form.setValue("propDistrict", addressData.district);
                          if (addressData.state)
                            form.setValue("propState", addressData.state);
                          if (addressData.pincode)
                            form.setValue("propPincode", addressData.pincode);
                          if (addressData.fullAddress) {
                            setPropertyAddress((prev) => ({
                              ...prev,
                              fullAddress: addressData.fullAddress,
                            }));
                          }
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Amenities & Additional Options */}
            {step === 5 && (
              <div className="space-y-6">
                {/* Bulk Booking Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Bulk Booking Options
                    </CardTitle>
                    <CardDescription>
                      Offer discounts for large group bookings (optional)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="bulkBookingEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Enable Bulk Booking Discounts
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Attract corporate clients and group travelers
                            </p>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-bulk-booking"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("bulkBookingEnabled") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <FormField
                          control={form.control}
                          name="bulkBookingMinRooms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Minimum Rooms for Bulk Discount
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="2"
                                  step="1"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 5,
                                    )
                                  }
                                  data-testid="input-bulk-min-rooms"
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Discount applies when booking this many rooms or
                                more
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bulkBookingDiscountPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Percentage (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="50"
                                  step="1"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 10,
                                    )
                                  }
                                  data-testid="input-bulk-discount"
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Maximum 50% discount allowed
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>House Rules & Policies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="policies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>House Rules (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Check-in after 3pm, No smoking, etc."
                              rows={3}
                              {...field}
                              data-testid="textarea-policies"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Amenities</CardTitle>
                    <CardDescription>
                      Select the essential amenities your property offers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Essential amenities */}
                    <div>
                      <p className="text-sm font-medium mb-3">
                        Essential Amenities
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {amenities
                          .filter(
                            (a) =>
                              a.category === "essential" ||
                              a.name === "Hot water",
                          )
                          .map((amenity) => (
                            <div
                              key={amenity.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={amenity.id}
                                checked={selectedAmenities.includes(amenity.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedAmenities(
                                    checked
                                      ? [...selectedAmenities, amenity.id]
                                      : selectedAmenities.filter(
                                          (id) => id !== amenity.id,
                                        ),
                                  );
                                }}
                                data-testid={`checkbox-amenity-${amenity.name.toLowerCase().replace(/\s+/g, "-")}`}
                              />
                              <label
                                htmlFor={amenity.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {amenity.name}
                              </label>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Show more toggle */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllAmenities(!showAllAmenities)}
                      className="w-full"
                      data-testid="button-show-more-amenities"
                    >
                      {showAllAmenities ? "Show less" : "Show more (optional)"}
                      <ArrowRight
                        className={`ml-2 h-4 w-4 transition-transform ${showAllAmenities ? "rotate-90" : ""}`}
                      />
                    </Button>

                    {/* Additional amenities */}
                    {showAllAmenities && (
                      <div className="space-y-4 pt-2 border-t">
                        {[
                          "bathroom",
                          "safety",
                          "services",
                          "outdoor",
                          "family",
                          "food",
                          "entertainment",
                          "accessibility",
                          "work",
                        ].map((category) => {
                          const categoryAmenities = amenities.filter(
                            (a) =>
                              a.category === category && a.name !== "Hot water",
                          );
                          if (categoryAmenities.length === 0) return null;
                          return (
                            <div key={category}>
                              <p className="text-sm font-medium mb-2 capitalize text-muted-foreground">
                                {category}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {categoryAmenities.map((amenity) => (
                                  <div
                                    key={amenity.id}
                                    className="flex items-center space-x-2"
                                  >
                                    <Checkbox
                                      id={amenity.id}
                                      checked={selectedAmenities.includes(
                                        amenity.id,
                                      )}
                                      onCheckedChange={(checked) => {
                                        setSelectedAmenities(
                                          checked
                                            ? [...selectedAmenities, amenity.id]
                                            : selectedAmenities.filter(
                                                (id) => id !== amenity.id,
                                              ),
                                        );
                                      }}
                                      data-testid={`checkbox-amenity-${amenity.name.toLowerCase().replace(/\s+/g, "-")}`}
                                    />
                                    <label
                                      htmlFor={amenity.id}
                                      className="text-sm cursor-pointer"
                                    >
                                      {amenity.name}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 6: Photos & Submit */}
            {step === 6 && (
              <div className="space-y-6">
                {/* Photo Category Progress Summary */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Camera className="h-5 w-5 text-primary" />
                      Photo Upload Progress
                    </CardTitle>
                    <CardDescription>
                      Complete all categories for better visibility. Properties
                      with more photos get 3x more bookings!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {getPhotoCategoryStats().map((cat) => (
                        <div
                          key={cat.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border ${
                            cat.hasAny
                              ? cat.isComplete
                                ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                                : "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
                              : cat.required
                                ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                                : "bg-muted/50 border-muted"
                          }`}
                        >
                          {cat.hasAny ? (
                            cat.isComplete ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                            )
                          ) : cat.required ? (
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-medium truncate ${
                                cat.hasAny
                                  ? ""
                                  : cat.required
                                    ? "text-red-700 dark:text-red-400"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {cat.label}
                              {cat.required && !cat.hasAny && " *"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cat.count}/{cat.minRecommended} photos
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {getCompletedCategoriesCount() < 6 && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Tip:</strong> Upload photos in all
                            categories to increase your property's appeal.
                            {getIncompleteRequiredCategories().length > 0 && (
                              <span className="block mt-1">
                                <strong className="text-red-600 dark:text-red-400">
                                  Required:
                                </strong>{" "}
                                {getIncompleteRequiredCategories()
                                  .map((c) => c.label)
                                  .join(", ")}
                              </span>
                            )}
                          </span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <PropertyImageUploader
                  value={categorizedImages}
                  onChange={setCategorizedImages}
                  onVideosChange={setVideos}
                  videos={videos}
                />

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Review & Submit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        What happens next?
                      </h4>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>
                          • Your KYC and property listing will be reviewed
                          together
                        </li>
                        <li>
                          • Admin will approve or reject within 2-3 business
                          days
                        </li>
                        <li>
                          • Once approved, your property will be live on ZECOHO
                        </li>
                        <li>• You'll be notified via email when approved</li>
                      </ul>
                    </div>

                    {getTotalImageCount() === 0 && (
                      <p className="text-sm text-destructive">
                        Please upload at least one property image
                      </p>
                    )}

                    {getIncompleteRequiredCategories().length > 0 &&
                      getTotalImageCount() > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>Missing required photos:</strong> Please add
                            at least one photo in these categories:{" "}
                            {getIncompleteRequiredCategories()
                              .map((c) => c.label)
                              .join(", ")}
                          </p>
                        </div>
                      )}

                    {(!kycDocuments.propertyOwnership?.length ||
                      !kycDocuments.identityProof?.length) && (
                      <p className="text-sm text-destructive">
                        Please upload mandatory KYC documents (Property
                        Ownership Proof and Identity Proof) in Step 2
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  data-testid="button-prev-step"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              ) : isQuickMode ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setListingMode(null)}
                  data-testid="button-change-mode"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change Mode
                </Button>
              ) : (
                <div />
              )}

              {/* Quick Mode Step 2: Submit Button */}
              {isQuickMode && step === quickModeTotalSteps ? (
                <Button
                  type="button"
                  onClick={onQuickSubmit}
                  disabled={
                    quickSubmitMutation.isPending || getTotalImageCount() === 0
                  }
                  data-testid="button-quick-submit"
                >
                  {quickSubmitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Draft...
                    </>
                  ) : getTotalImageCount() === 0 ? (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Add Photos First
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Create Draft Listing
                    </>
                  )}
                </Button>
              ) : step < (isQuickMode ? quickModeTotalSteps : totalSteps) ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  data-testid="button-next-step"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={
                    submitMutation.isPending ||
                    getTotalImageCount() === 0 ||
                    getIncompleteRequiredCategories().length > 0
                  }
                  data-testid="button-submit-application"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : getIncompleteRequiredCategories().length > 0 ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Complete Required Photos
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
