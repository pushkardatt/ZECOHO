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
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ShieldCheck,
  Flame,
  Camera,
  Zap,
  FileCheck,
  CalendarDays,
  Ban,
  Settings2,
  Sparkles,
  Plus,
  Trash2,
  Star,
  ArrowUpDown,
  MessageSquare,
  Mail,
  Phone,
  FileX,
} from "lucide-react";
import { PriceCalendar } from "@/components/PriceCalendar";
import { INDIAN_STATES, INDIAN_CITIES } from "@/data/locations";
import type { KycSectionId, KycRejectionDetails } from "@shared/schema";
import { useEffect, useMemo, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";

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
  alternativePhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),

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
  // Check-in / Check-out times
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  // Cancellation Policy
  cancellationPolicyType: z.enum(["flexible", "moderate", "strict"]).optional(),
  freeCancellationHours: z.coerce.number().optional(),
  partialRefundPercent: z.coerce.number().optional(),
});

type CombinedFormData = z.infer<typeof combinedSchema>;

// Quick listing schema - simplified for Phase 1 (Soft onboarding)
const quickListingSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  alternativePhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
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
  const {
    user: rawUser,
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();
  const user = rawUser as any;

  // Owner agreement check for existing owners listing new property
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [showAgreementDialog, setShowAgreementDialog] = useState(false);

  const { data: ownerAgreementVersion } = useQuery<{ version: number | null }>({
    queryKey: ["/api/owner-agreement/version/current"],
    enabled: !!user,
  });

  const { data: ownerAgreement } = useQuery<any>({
    queryKey: ["/api/owner-agreement"],
    enabled: !!user, // Always fetch when user is logged in
  });

  const acceptAgreementMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/owner-agreement-consent", {});
    },
    onSuccess: () => {
      setAgreementAccepted(true);
      setShowAgreementDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Agreement Accepted",
        description: "You can now proceed with your listing.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record agreement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const u = user as any;
  const isExistingOwner = u?.kycStatus === "verified";
  const needsAgreementAcceptance = !!(
    isExistingOwner &&
    ownerAgreementVersion?.version !== null &&
    ownerAgreementVersion?.version !== undefined
  );
  useEffect(() => {
    if (needsAgreementAcceptance && !agreementAccepted) {
      setShowAgreementDialog(true);
    }
  }, [needsAgreementAcceptance, agreementAccepted]);

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
  // New 9-step flow: 1(personal)->2(KYC)->3(property+rooms)->4(pricing)->5(amenities)->6(availability)->7(status)->8(location)->9(photos)
  // KYC-verified users start at step 3
  const kycStepsCount = canSkipKycSteps ? 0 : 2;
  // totalSteps is always 11 (the last step number), regardless of whether KYC steps are skipped
  const totalSteps = 11;
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

  // Auto-draft: property ID created between step 3→4 to enable pricing/availability steps
  // In complete mode, initialize from the URL propertyId so step 4 renders immediately
  const [autoDraftPropertyId, setAutoDraftPropertyId] = useState<string | null>(
    () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("mode") === "complete") return params.get("propertyId");
      }
      return null;
    },
  );
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Step 4: Property Details (star rating, channel manager, contacts)
  const [wizardStarRating, setWizardStarRating] = useState<number | null>(null);
  const [wizardChannelManagerEnabled, setWizardChannelManagerEnabled] = useState(false);
  const [wizardChannelManagerName, setWizardChannelManagerName] = useState("");
  const [wizardChannelManagerNameCustom, setWizardChannelManagerNameCustom] = useState("");
  const [wizardContactEmail, setWizardContactEmail] = useState("");
  const [wizardContactPhone, setWizardContactPhone] = useState("");
  const [wizardWhatsappNumber, setWizardWhatsappNumber] = useState("");
  const [wizardReceptionNumber, setWizardReceptionNumber] = useState("");

  // Step 5: Policy (ID proof, hotel rules — check-in/out & cancellation stay in form)
  const [wizardLocalIdTypes, setWizardLocalIdTypes] = useState<string[]>([]);
  const [wizardForeignIdTypes, setWizardForeignIdTypes] = useState<string[]>([]);
  const [wizardPetsAllowed, setWizardPetsAllowed] = useState(false);
  const [wizardSmokingAllowed, setWizardSmokingAllowed] = useState(false);
  const [wizardLiquorAllowed, setWizardLiquorAllowed] = useState(false);
  const [wizardVisitorsAllowed, setWizardVisitorsAllowed] = useState(false);

  // Availability blocking state (for step 8)
  const [blockStartDate, setBlockStartDate] = useState("");
  const [blockEndDate, setBlockEndDate] = useState("");
  const [blockType, setBlockType] = useState<
    "temporary_hold" | "sold_out" | "maintenance"
  >("maintenance");
  const [isBlockingDates, setIsBlockingDates] = useState(false);
  const [blockedRanges, setBlockedRanges] = useState<
    Array<{ id: string; startDate: string; endDate: string; blockType: string }>
  >([]);
  const [isFetchingBlocks, setIsFetchingBlocks] = useState(false);

  const form = useForm<CombinedFormData>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
      alternativePhone: "",
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
      checkInTime: "",
      checkOutTime: "",
      cancellationPolicyType: "flexible" as const,
      freeCancellationHours: 24,
      partialRefundPercent: 50,
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
        alternativePhone:
          (existingKycApplication as any).alternativePhone || "",
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

      // Pre-fill step 4 (Property Details) fields
      const dp = draftProperty as any;
      if (dp.starRating) setWizardStarRating(dp.starRating);
      if (dp.channelManagerEnabled) setWizardChannelManagerEnabled(dp.channelManagerEnabled);
      if (dp.channelManagerName) setWizardChannelManagerName(dp.channelManagerName);
      if (dp.channelManagerNameCustom) setWizardChannelManagerNameCustom(dp.channelManagerNameCustom);
      if (dp.contactEmail) setWizardContactEmail(dp.contactEmail);
      if (dp.contactPhone) setWizardContactPhone(dp.contactPhone);
      if (dp.whatsappNumber) setWizardWhatsappNumber(dp.whatsappNumber);
      if (dp.receptionNumber) setWizardReceptionNumber(dp.receptionNumber);

      // Pre-fill step 5 (Policy) fields
      if (Array.isArray(dp.acceptedLocalIdTypes)) setWizardLocalIdTypes(dp.acceptedLocalIdTypes);
      if (Array.isArray(dp.acceptedForeignIdTypes)) setWizardForeignIdTypes(dp.acceptedForeignIdTypes);
      if (dp.petsAllowed !== undefined) setWizardPetsAllowed(dp.petsAllowed);
      if (dp.smokingAllowed !== undefined) setWizardSmokingAllowed(dp.smokingAllowed);
      if (dp.liquorAllowed !== undefined) setWizardLiquorAllowed(dp.liquorAllowed);
      if (dp.visitorsAllowed !== undefined) setWizardVisitorsAllowed(dp.visitorsAllowed);

      // Ensure autoDraftPropertyId is set for complete mode (handles auto-redirect case
      // where the URL didn't have propertyId when the component first mounted)
      if (draftProperty.id) {
        setAutoDraftPropertyId((prev) => prev || draftProperty.id);
      }

      // Fetch and pre-populate existing room types so step 3 passes validation
      if (draftProperty.id) {
        fetch(`/api/properties/${draftProperty.id}/rooms`)
          .then((r) => r.json())
          .then((rooms: any[]) => {
            if (Array.isArray(rooms) && rooms.length > 0) {
              setWizardRoomTypes(
                rooms.map((r) => ({
                  id: r.id,
                  name: r.name,
                  description: r.description || "",
                  basePrice: Number(r.basePrice) || 1000,
                  maxGuests: r.maxGuests || 2,
                  totalRooms: r.totalRooms || 1,
                  mealOptions: [],
                })),
              );
            }
          })
          .catch(() => {});
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
    if ((existingKycApplication as any).alternativePhone)
      form.setValue(
        "alternativePhone",
        (existingKycApplication as any).alternativePhone,
      );

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
        alternativePhone: data.alternativePhone || null,
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
          window.location.href = "/login";
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
          // Pass existing draft property ID if we auto-saved a draft during wizard
          existingPropertyId: autoDraftPropertyId || undefined,
          // KYC data
          kyc: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            alternativePhone: data.alternativePhone || null,
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
            checkInTime: data.checkInTime || undefined,
            checkOutTime: data.checkOutTime || undefined,
            cancellationPolicyType: data.cancellationPolicyType || "flexible",
            freeCancellationHours: data.freeCancellationHours ?? 24,
            partialRefundPercent: data.partialRefundPercent ?? 50,
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
          window.location.href = "/login";
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
    const finalStep = isQuickMode ? quickModeTotalSteps : totalSteps;
    if (step !== finalStep) {
      return;
    }
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
          window.location.href = "/login";
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

  // Auto-save draft property between step 3 and step 4 so pricing/availability steps have a propertyId
  const autoSaveDraft = async (): Promise<string | null> => {
    const data = form.getValues();
    if (!data.propertyTitle) return null;
    setIsAutoSaving(true);
    try {
      const response = await apiRequest("POST", "/api/owner/wizard-auto-save", {
        existingPropertyId: autoDraftPropertyId || undefined,
        property: {
          title: data.propertyTitle,
          description: data.description,
          propertyType: data.propertyType,
          propStreetAddress: data.propStreetAddress,
          propLocality: data.propLocality,
          propCity: data.propCity,
          propDistrict: data.propDistrict,
          propState: data.propState,
          propPincode: data.propPincode,
          checkInTime: data.checkInTime || "14:00",
          checkOutTime: data.checkOutTime || "11:00",
          coupleFriendly: data.coupleFriendly,
          localIdAllowed: data.localIdAllowed,
          foreignGuestsAllowed: data.foreignGuestsAllowed,
          hourlyBookingAllowed: data.hourlyBookingAllowed,
          cancellationPolicyType: data.cancellationPolicyType,
          freeCancellationHours: data.freeCancellationHours,
          partialRefundPercent: data.partialRefundPercent,
          bulkBookingEnabled: data.bulkBookingEnabled,
          bulkBookingMinRooms: data.bulkBookingMinRooms,
          bulkBookingDiscountPercent: data.bulkBookingDiscountPercent,
          policies: data.policies,
          // Step 4: Property Details
          starRating: wizardStarRating,
          channelManagerEnabled: wizardChannelManagerEnabled,
          channelManagerName: wizardChannelManagerEnabled ? wizardChannelManagerName : null,
          channelManagerNameCustom: wizardChannelManagerEnabled && wizardChannelManagerName === "Other" ? wizardChannelManagerNameCustom : null,
          contactEmail: wizardContactEmail || null,
          contactPhone: wizardContactPhone || null,
          whatsappNumber: wizardWhatsappNumber || null,
          receptionNumber: wizardReceptionNumber || null,
          // Step 5: Policy
          acceptedLocalIdTypes: wizardLocalIdTypes,
          acceptedForeignIdTypes: wizardForeignIdTypes,
          petsAllowed: wizardPetsAllowed,
          smokingAllowed: wizardSmokingAllowed,
          liquorAllowed: wizardLiquorAllowed,
          visitorsAllowed: wizardVisitorsAllowed,
        },
        roomTypes: wizardRoomTypes,
      });
      const result = await response.json();
      if (result.propertyId) {
        setAutoDraftPropertyId(result.propertyId);
        return result.propertyId;
      }
    } catch (e) {
      console.warn("Auto-save draft failed:", e);
    } finally {
      setIsAutoSaving(false);
    }
    return null;
  };

  // Fetch blocked dates when autoDraftPropertyId is available and user is on step 6
  const fetchBlockedDates = async (propertyId: string) => {
    setIsFetchingBlocks(true);
    try {
      const resp = await apiRequest(
        "GET",
        `/api/properties/${propertyId}/availability-overrides`,
      );
      const data = await resp.json();
      if (Array.isArray(data)) {
        setBlockedRanges(
          data.map((d: any) => ({
            id: d.id,
            startDate: d.startDate,
            endDate: d.endDate,
            blockType: d.blockType || "maintenance",
          })),
        );
      }
    } catch (e) {
      console.warn("Failed to fetch blocked dates:", e);
    } finally {
      setIsFetchingBlocks(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof CombinedFormData)[] = [];

    // Quick mode validation
    if (isQuickMode) {
      if (step === 1) {
        fieldsToValidate = [
          "firstName",
          "lastName",
          "email",
          "phone",
          "alternativePhone",
        ];
      }
      // Step 2 in quick mode validates property + photos (handled in submit)
    } else {
      // Full mode validation
      if (step === 1) {
        fieldsToValidate = ["firstName", "lastName", "email", "phone"];
      } else if (step === 2) {
        fieldsToValidate = [];
        // Validate mandatory documents before proceeding
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
          missingDocs.push("Owner Identity Proof (Aadhaar/PAN/Passport)");
        }
        if (missingDocs.length > 0) {
          toast({
            title: "Mandatory Documents Required",
            description: `Please upload: ${missingDocs.join(", ")}`,
            variant: "destructive",
          });
          return;
        }
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
        // Validate form fields first
        const isValid = await form.trigger(fieldsToValidate);
        if (!isValid) {
          setTimeout(() => scrollToFirstError(fieldsToValidate), 100);
          toast({
            title: "Please fill required fields",
            description: "Some fields need your attention before proceeding",
            variant: "destructive",
          });
          return;
        }
        // Auto-save draft to get a propertyId for pricing/availability steps
        toast({ title: "Saving your property details..." });
        await autoSaveDraft();
        setStep(step + 1);
        return;
      } else if (step === 4) {
        // Step 4: Property Details (star rating, channel manager, contacts) — optional
        fieldsToValidate = [];
        if (autoDraftPropertyId) await autoSaveDraft();
      } else if (step === 5) {
        // Step 5: Policy (check-in/out, cancellation, ID proof, hotel rules) — optional
        fieldsToValidate = [];
        if (autoDraftPropertyId) await autoSaveDraft();
      } else if (step === 6) {
        // Step 6: Day-wise Pricing — optional, no required fields
        fieldsToValidate = [];
      } else if (step === 7) {
        // Step 7: Cancellation + Amenities — optional
        fieldsToValidate = [];
        // Re-save draft with updated cancellation policy
        if (autoDraftPropertyId) {
          await autoSaveDraft();
        }
      } else if (step === 8) {
        // Step 8: Availability — optional
        fieldsToValidate = [];
      } else if (step === 9) {
        // Step 9: Setup summary — optional
        fieldsToValidate = [];
      } else if (step === 10) {
        // Step 10: Property Location - requires latitude and longitude
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
      }
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      const nextStepNum = step + 1;
      setStep(nextStepNum);
      // When entering availability step, load existing blocks
      if (nextStepNum === 8 && autoDraftPropertyId) {
        fetchBlockedDates(autoDraftPropertyId);
      }
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
        fieldsToValidate = [];
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
      } else if (s >= 4 && s <= 9) {
        // Steps 4-9 are optional (property details, policy, pricing, amenities, availability, summary)
        fieldsToValidate = [];
      } else if (s === 10) {
        // Step 10 is Property Location - requires latitude and longitude
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

  // Step titles for full mode (11 steps)
  const fullModeStepTitles = [
    { title: "Personal Information", icon: User },
    { title: "Business KYC", icon: FileText },
    { title: "Property & Room Types", icon: Home },
    { title: "Property Details", icon: Building2 },
    { title: "Policy", icon: Shield },
    { title: "Day-wise Pricing", icon: CalendarDays },
    { title: "Cancellation & Amenities", icon: XCircle },
    { title: "Availability", icon: Ban },
    { title: "Setup Summary", icon: Settings2 },
    { title: "Property Location", icon: MapPin },
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
                    <FormField
                      control={form.control}
                      name="alternativePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Alternative Number
                            <span className="text-xs text-muted-foreground font-normal">
                              (Optional)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Manager / Front Desk number"
                              inputMode="numeric"
                              maxLength={10}
                              {...field}
                              data-testid="input-alternative-phone-resubmit"
                              onChange={(e) => {
                                const val = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 10);
                                field.onChange(val);
                              }}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Add a manager or front-desk number for guest contact
                          </p>
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
                              <div className="relative">
                                <Input
                                  placeholder="22AAAAA0000A1Z5"
                                  {...field}
                                  maxLength={15}
                                  onChange={async (e) => {
                                    const val = e.target.value.toUpperCase();
                                    field.onChange(val);
                                    if (val.length === 15) {
                                      try {
                                        toast({
                                          title: "Looking up GST...",
                                          description:
                                            "Fetching business details",
                                        });
                                        gstincheck;
                                        const data = await res.json();
                                        if (data?.flag && data.data) {
                                          const d = data.data;
                                          const addr = d.pradr?.addr;
                                          if (addr) {
                                            form.setValue(
                                              "kycStreetAddress",
                                              [addr.bnm, addr.st]
                                                .filter(Boolean)
                                                .join(", ") ||
                                                form.getValues(
                                                  "kycStreetAddress",
                                                ),
                                            );
                                            form.setValue(
                                              "kycLocality",
                                              addr.loc ||
                                                form.getValues("kycLocality"),
                                            );
                                            form.setValue(
                                              "kycCity",
                                              addr.dst ||
                                                form.getValues("kycCity"),
                                            );
                                            form.setValue(
                                              "kycDistrict",
                                              addr.dst ||
                                                form.getValues("kycDistrict"),
                                            );
                                            form.setValue(
                                              "kycState",
                                              addr.stcd ||
                                                form.getValues("kycState"),
                                            );
                                            form.setValue(
                                              "kycPincode",
                                              addr.pncd ||
                                                form.getValues("kycPincode"),
                                            );
                                            toast({
                                              title: "GST Details Found!",
                                              description: `Business: ${d.tradeNam || d.lgnm}`,
                                            });
                                          }
                                        }
                                      } catch (err) {
                                        console.log("GST lookup failed", err);
                                      }
                                    }
                                  }}
                                  data-testid="input-gst-number"
                                />
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground mt-1">
                              Enter 15-digit GSTIN to auto-fill address details
                            </p>
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
    <>
      {/* Owner Agreement Dialog */}
      <Dialog open={showAgreementDialog} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Property Owner Agreement
            </DialogTitle>
            <DialogDescription>
              Please read and accept the Owner Agreement before listing a new
              property.
              {ownerAgreementVersion?.version != null && (
                <span className="ml-1 text-xs font-medium">
                  (Version {ownerAgreementVersion?.version})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-muted/30 text-sm max-h-64 overflow-y-auto">
            {ownerAgreement?.content ? (
              <div
                dangerouslySetInnerHTML={{ __html: ownerAgreement.content }}
              />
            ) : (
              <p className="text-muted-foreground">Loading agreement...</p>
            )}
          </div>
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
            <Checkbox
              id="agreement-check"
              checked={agreementAccepted}
              onCheckedChange={(checked) =>
                setAgreementAccepted(checked === true)
              }
            />
            <label
              htmlFor="agreement-check"
              className="text-sm cursor-pointer leading-relaxed"
            >
              I have read and agree to the ZECOHO Property Owner Agreement. I
              understand my responsibilities as a listed property owner.
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Cancel
            </Button>
            <Button
              onClick={() => acceptAgreementMutation.mutate()}
              disabled={!agreementAccepted || acceptAgreementMutation.isPending}
            >
              {acceptAgreementMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Accept & Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-muted/30 pb-16">
        <Helmet>
          <title>List Your Hotel Free — 0% Commission Forever | ZECOHO</title>
          <meta
            name="description"
            content="Join ZECOHO and list your hotel for free. Zero commission on every booking. Keep 100% of your revenue. Direct guest communication. India's fastest growing zero-commission hotel platform."
          />
          <meta
            property="og:title"
            content="List Your Hotel Free on ZECOHO — 0% Commission"
          />
          <meta
            property="og:description"
            content="No commission. No listing fee. Keep 100% of every booking. Join India's zero-commission hotel platform."
          />
          <link rel="canonical" href="https://www.zecoho.com/list-property" />
        </Helmet>
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
                    {false && i < stepTitles.length - 1 && (
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
                    <FormField
                      control={form.control}
                      name="alternativePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Alternative Number
                            <span className="text-xs text-muted-foreground font-normal">
                              (Optional)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Manager / Front Desk number"
                              inputMode="numeric"
                              maxLength={10}
                              {...field}
                              data-testid="input-alternative-phone"
                              onChange={(e) => {
                                const val = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 10);
                                field.onChange(val);
                              }}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Add a manager or front-desk number for guest contact
                          </p>
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
                                <SelectItem value="homestay">
                                  Homestay
                                </SelectItem>
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
                              form.setValue(
                                "propLocality",
                                addressData.locality,
                              );
                            if (addressData.city)
                              form.setValue("propCity", addressData.city);
                            if (addressData.district)
                              form.setValue(
                                "propDistrict",
                                addressData.district,
                              );
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

              {/* Step 2: KYC Documents (Full Mode Only) */}
              {!isQuickMode && step === 2 && (
                <div className="space-y-6">
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
                                <SelectItem value="homestay">
                                  Homestay
                                </SelectItem>
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
                                      handlePropertyPincodeChange(
                                        e.target.value,
                                      )
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
                                      if (
                                        state &&
                                        !form.getValues("propState")
                                      ) {
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
                                Tip: Mention unique features, nearby
                                attractions, and what makes your stay special
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

              {/* Step 4: Property Details (star rating, channel manager, contacts) */}
              {step === 4 && (
                <div className="space-y-6">
                  {/* Star Rating */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Property Identity
                      </CardTitle>
                      <CardDescription>Optional details to help guests find and trust your property</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Hotel Star Rating (optional)</Label>
                        <div className="flex items-center gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setWizardStarRating(wizardStarRating === n ? null : n)}
                              className="focus:outline-none"
                            >
                              <Star className={`h-7 w-7 transition-colors ${wizardStarRating !== null && n <= wizardStarRating ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"}`} />
                            </button>
                          ))}
                          {wizardStarRating !== null && (
                            <button type="button" onClick={() => setWizardStarRating(null)} className="ml-2 text-xs text-muted-foreground underline">clear</button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Channel Manager */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ArrowUpDown className="h-5 w-5" />
                        Channel Manager
                      </CardTitle>
                      <CardDescription>Are you using a channel manager to sync inventory across OTAs?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Using a channel manager?</Label>
                        <Switch
                          checked={wizardChannelManagerEnabled}
                          onCheckedChange={setWizardChannelManagerEnabled}
                          data-testid="wizard-switch-channel-manager"
                        />
                      </div>
                      {wizardChannelManagerEnabled && (
                        <div className="space-y-3 pt-1">
                          <div className="space-y-2">
                            <Label>Channel Manager</Label>
                            <Select value={wizardChannelManagerName} onValueChange={setWizardChannelManagerName}>
                              <SelectTrigger data-testid="wizard-select-cm-name">
                                <SelectValue placeholder="Select channel manager" />
                              </SelectTrigger>
                              <SelectContent>
                                {["SiteMinder","RateGain","eZee Absolute","STAAH","Cloudbeds","MakeMyTrip Connect","Other"].map((cm) => (
                                  <SelectItem key={cm} value={cm}>{cm}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {wizardChannelManagerName === "Other" && (
                            <div className="space-y-2">
                              <Label>Channel Manager Name</Label>
                              <Input
                                value={wizardChannelManagerNameCustom}
                                onChange={(e) => setWizardChannelManagerNameCustom(e.target.value)}
                                placeholder="Enter channel manager name"
                                data-testid="wizard-input-cm-custom"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Contact Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Contact Details
                      </CardTitle>
                      <CardDescription>
                        These are private — only shared with guests who have a confirmed booking on this property.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email ID</Label>
                          <Input type="email" value={wizardContactEmail} onChange={(e) => setWizardContactEmail(e.target.value)} placeholder="hotel@example.com" data-testid="wizard-input-contact-email" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Contact No.</Label>
                          <Input type="tel" value={wizardContactPhone} onChange={(e) => setWizardContactPhone(e.target.value)} placeholder="+91 98765 43210" data-testid="wizard-input-contact-phone" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> WhatsApp No.</Label>
                          <Input type="tel" value={wizardWhatsappNumber} onChange={(e) => setWizardWhatsappNumber(e.target.value)} placeholder="+91 98765 43210" data-testid="wizard-input-whatsapp" />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Reception No.</Label>
                          <Input type="tel" value={wizardReceptionNumber} onChange={(e) => setWizardReceptionNumber(e.target.value)} placeholder="+91 11 2345 6789" data-testid="wizard-input-reception" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 5: Policy */}
              {step === 5 && (
                <div className="space-y-6">
                  {/* Check-in & Check-out */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Check-in &amp; Check-out Times
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="checkInTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Check-in Time <span className="text-destructive">*</span></FormLabel>
                              <Select value={field.value || "14:00"} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger data-testid="wizard-select-checkin-time">
                                    <SelectValue placeholder="Select check-in time" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"].map((t) => (
                                    <SelectItem key={t} value={t}>{t} {parseInt(t) < 12 ? "AM" : "PM"}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="checkOutTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Check-out Time <span className="text-destructive">*</span></FormLabel>
                              <Select value={field.value || "11:00"} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger data-testid="wizard-select-checkout-time">
                                    <SelectValue placeholder="Select check-out time" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {["06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00"].map((t) => (
                                    <SelectItem key={t} value={t}>{t} {parseInt(t) < 12 ? "AM" : "PM"}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cancellation Policy */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileX className="h-5 w-5" />
                        Cancellation Policy
                      </CardTitle>
                      <CardDescription>Define how refunds work when guests cancel</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="cancellationPolicyType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Policy Type</FormLabel>
                            <Select value={field.value || "flexible"} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="wizard-select-policy-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="flexible">Free cancellation (Flexible)</SelectItem>
                                <SelectItem value="moderate">Partial refund (Moderate)</SelectItem>
                                <SelectItem value="strict">Non-refundable (Strict)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch("cancellationPolicyType") !== "strict" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="freeCancellationHours"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Free cancellation window (hours)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" max="168" {...field} data-testid="wizard-input-free-hours" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.watch("cancellationPolicyType") === "moderate" && (
                            <FormField
                              control={form.control}
                              name="partialRefundPercent"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Refund % within window</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="0" max="100" {...field} data-testid="wizard-input-refund-percent" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Acceptable ID Proof */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        Acceptable ID Proof
                      </CardTitle>
                      <CardDescription>Which ID types do you accept at check-in?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div>
                        <p className="text-sm font-medium mb-2">Local Guests</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {["Aadhaar","PAN","Passport","Voter ID","Driving License"].map((id) => (
                            <div key={id} className="flex items-center gap-2">
                              <Checkbox
                                id={`wizard-local-${id}`}
                                checked={wizardLocalIdTypes.includes(id)}
                                onCheckedChange={() => setWizardLocalIdTypes(wizardLocalIdTypes.includes(id) ? wizardLocalIdTypes.filter((x) => x !== id) : [...wizardLocalIdTypes, id])}
                                data-testid={`wizard-checkbox-local-${id}`}
                              />
                              <Label htmlFor={`wizard-local-${id}`} className="font-normal cursor-pointer">{id}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Foreign Guests</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {["Passport","Visa","OCI Card"].map((id) => (
                            <div key={id} className="flex items-center gap-2">
                              <Checkbox
                                id={`wizard-foreign-${id}`}
                                checked={wizardForeignIdTypes.includes(id)}
                                onCheckedChange={() => setWizardForeignIdTypes(wizardForeignIdTypes.includes(id) ? wizardForeignIdTypes.filter((x) => x !== id) : [...wizardForeignIdTypes, id])}
                                data-testid={`wizard-checkbox-foreign-${id}`}
                              />
                              <Label htmlFor={`wizard-foreign-${id}`} className="font-normal cursor-pointer">{id}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hotel Rules */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Hotel Rules
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {([
                          { label: "Couple-friendly", desc: "Allow unmarried couples to check in", value: form.watch("coupleFriendly") ?? true, onChange: (v: boolean) => form.setValue("coupleFriendly", v), testId: "wizard-switch-couple-friendly" },
                          { label: "Pets allowed", desc: "Guests may bring pets", value: wizardPetsAllowed, onChange: setWizardPetsAllowed, testId: "wizard-switch-pets" },
                          { label: "Smoking in room", desc: "Smoking permitted inside rooms", value: wizardSmokingAllowed, onChange: setWizardSmokingAllowed, testId: "wizard-switch-smoking" },
                          { label: "Liquor in room", desc: "Guests may consume liquor in room", value: wizardLiquorAllowed, onChange: setWizardLiquorAllowed, testId: "wizard-switch-liquor" },
                          { label: "Visitors allowed in room", desc: "Registered guests may bring visitors", value: wizardVisitorsAllowed, onChange: setWizardVisitorsAllowed, testId: "wizard-switch-visitors" },
                        ] as const).map(({ label, desc, value, onChange, testId }) => (
                          <div key={label} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <div>
                              <p className="text-sm font-medium">{label}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                            <Switch checked={value} onCheckedChange={onChange} data-testid={testId} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 6: Day-wise Pricing */}
              {step === 6 && (
                <div className="space-y-6">
                  {autoDraftPropertyId ? (
                    <>
                      <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            Day-wise Calendar Pricing
                          </CardTitle>
                          <CardDescription>
                            Set specific prices for dates and date ranges. Drag
                            to select multiple dates and apply pricing in bulk.
                            You can also set meal plan prices.
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      <PriceCalendar
                        propertyId={autoDraftPropertyId}
                        roomTypes={[]}
                      />
                    </>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">
                          Saving your property details to enable pricing
                          setup...
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 10: Property Location (Mandatory Geo-tagging) */}
              {step === 10 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Property Location
                      </CardTitle>
                      <CardDescription>
                        Set the exact location of your property. This is
                        required for your listing to be visible to guests.
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
                              form.setValue(
                                "propLocality",
                                addressData.locality,
                              );
                            if (addressData.city)
                              form.setValue("propCity", addressData.city);
                            if (addressData.district)
                              form.setValue(
                                "propDistrict",
                                addressData.district,
                              );
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

              {/* Step 7: Amenities & Additional Options */}
              {step === 7 && (
                <div className="space-y-6">
                  {/* Cancellation Policy Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <XCircle className="h-5 w-5" />
                        Cancellation Policy
                      </CardTitle>
                      <CardDescription>
                        Set how guests can cancel their bookings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="cancellationPolicyType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Policy Type *</FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {[
                                {
                                  value: "flexible",
                                  label: "Flexible",
                                  desc: "Full refund if cancelled before the free cancellation window",
                                },
                                {
                                  value: "moderate",
                                  label: "Moderate",
                                  desc: "Partial refund if cancelled within the window",
                                },
                                {
                                  value: "strict",
                                  label: "Strict",
                                  desc: "No refund if cancelled",
                                },
                              ].map((policy) => (
                                <div
                                  key={policy.value}
                                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${field.value === policy.value ? "border-primary bg-primary/5" : "border-border hover-elevate"}`}
                                  onClick={() => field.onChange(policy.value)}
                                  data-testid={`cancellation-policy-${policy.value}`}
                                >
                                  <p className="font-medium text-sm">
                                    {policy.label}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {policy.desc}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("cancellationPolicyType") !== "strict" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <FormField
                            control={form.control}
                            name="freeCancellationHours"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Free Cancellation Window (hours before
                                  check-in)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseInt(e.target.value) || 24,
                                      )
                                    }
                                    data-testid="input-free-cancellation-hours"
                                  />
                                </FormControl>
                                <p className="text-xs text-muted-foreground">
                                  Guests can cancel for free this many hours
                                  before check-in
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.watch("cancellationPolicyType") ===
                            "moderate" && (
                            <FormField
                              control={form.control}
                              name="partialRefundPercent"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Partial Refund (%)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="5"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          parseInt(e.target.value) || 50,
                                        )
                                      }
                                      data-testid="input-partial-refund-percent"
                                    />
                                  </FormControl>
                                  <p className="text-xs text-muted-foreground">
                                    Refund % when cancelled outside the free
                                    window
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

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
                                  Discount applies when booking this many rooms
                                  or more
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
                                placeholder="No smoking in rooms, No outside food, Quiet hours after 10pm, etc."
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
                        {showAllAmenities
                          ? "Show less"
                          : "Show more (optional)"}
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
                                a.category === category &&
                                a.name !== "Hot water",
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
                                              ? [
                                                  ...selectedAmenities,
                                                  amenity.id,
                                                ]
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

              {/* Step 8: Availability Blocking */}
              {step === 8 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Ban className="h-5 w-5" />
                        Block Unavailable Dates
                      </CardTitle>
                      <CardDescription>
                        Mark dates when your property won't be available — for
                        maintenance, personal use, or if already sold out
                        elsewhere. This step is optional and can be done later.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!autoDraftPropertyId ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                          <AlertTriangle className="h-8 w-8 text-amber-500" />
                          <p className="text-muted-foreground text-sm">
                            Property details must be saved first. Please go back
                            to step 3 and complete your property details.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <Label htmlFor="block-start">Start Date</Label>
                              <Input
                                id="block-start"
                                type="date"
                                value={blockStartDate}
                                onChange={(e) =>
                                  setBlockStartDate(e.target.value)
                                }
                                min={new Date().toISOString().split("T")[0]}
                                data-testid="input-block-start-date"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="block-end">End Date</Label>
                              <Input
                                id="block-end"
                                type="date"
                                value={blockEndDate}
                                onChange={(e) =>
                                  setBlockEndDate(e.target.value)
                                }
                                min={
                                  blockStartDate ||
                                  new Date().toISOString().split("T")[0]
                                }
                                data-testid="input-block-end-date"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Block Type</Label>
                              <Select
                                value={blockType}
                                onValueChange={(v: any) => setBlockType(v)}
                              >
                                <SelectTrigger data-testid="select-block-type">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="maintenance">
                                    Maintenance
                                  </SelectItem>
                                  <SelectItem value="sold_out">
                                    Sold Out Elsewhere
                                  </SelectItem>
                                  <SelectItem value="temporary_hold">
                                    Temporary Hold
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            type="button"
                            disabled={
                              !blockStartDate ||
                              !blockEndDate ||
                              isBlockingDates
                            }
                            onClick={async () => {
                              if (
                                !blockStartDate ||
                                !blockEndDate ||
                                !autoDraftPropertyId
                              )
                                return;
                              setIsBlockingDates(true);
                              try {
                                await apiRequest(
                                  "POST",
                                  `/api/properties/${autoDraftPropertyId}/availability-overrides`,
                                  {
                                    startDate: blockStartDate,
                                    endDate: blockEndDate,
                                    blockType,
                                  },
                                );
                                toast({ title: "Dates blocked successfully" });
                                setBlockStartDate("");
                                setBlockEndDate("");
                                fetchBlockedDates(autoDraftPropertyId);
                              } catch (e) {
                                toast({
                                  title: "Failed to block dates",
                                  variant: "destructive",
                                });
                              } finally {
                                setIsBlockingDates(false);
                              }
                            }}
                            data-testid="button-block-dates"
                          >
                            {isBlockingDates ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            Block Dates
                          </Button>

                          {isFetchingBlocks ? (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading blocked dates...
                            </div>
                          ) : blockedRanges.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                Currently Blocked Dates
                              </p>
                              {blockedRanges.map((range) => (
                                <div
                                  key={range.id}
                                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {range.startDate} → {range.endDate}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {range.blockType.replace(/_/g, " ")}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={async () => {
                                      try {
                                        await apiRequest(
                                          "DELETE",
                                          `/api/properties/${autoDraftPropertyId}/availability-overrides/${range.id}`,
                                        );
                                        setBlockedRanges((prev) =>
                                          prev.filter((r) => r.id !== range.id),
                                        );
                                        toast({ title: "Date block removed" });
                                      } catch (e) {
                                        toast({
                                          title: "Failed to remove block",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    data-testid={`button-remove-block-${range.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No dates blocked yet. Add blocks above or skip
                              this step.
                            </p>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 9: Setup Summary / Status */}
              {step === 9 && (
                <div className="space-y-6">
                  <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Sparkles className="h-5 w-5" />
                        Almost Done! Your Property Setup Summary
                      </CardTitle>
                      <CardDescription>
                        Review what you've set up. Next you'll pin your property
                        location and upload photos before submitting for review.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        {
                          label: "Property Name",
                          value: form.watch("propertyTitle"),
                          done: !!form.watch("propertyTitle"),
                        },
                        {
                          label: "Property Type",
                          value: form.watch("propertyType"),
                          done: !!form.watch("propertyType"),
                        },
                        {
                          label: "Room Types",
                          value: `${wizardRoomTypes.length} room type(s) configured`,
                          done: wizardRoomTypes.length > 0,
                        },
                        {
                          label: "Check-in Time",
                          value: form.watch("checkInTime") || "Not set",
                          done: !!form.watch("checkInTime"),
                        },
                        {
                          label: "Check-out Time",
                          value: form.watch("checkOutTime") || "Not set",
                          done: !!form.watch("checkOutTime"),
                        },
                        {
                          label: "Cancellation Policy",
                          value:
                            form.watch("cancellationPolicyType") || "flexible",
                          done: true,
                        },
                        {
                          label: "Day-wise Pricing",
                          value: autoDraftPropertyId
                            ? "Configured in pricing step"
                            : "Will be available after submission",
                          done: !!autoDraftPropertyId,
                        },
                        {
                          label: "Blocked Dates",
                          value:
                            blockedRanges.length > 0
                              ? `${blockedRanges.length} period(s) blocked`
                              : "None",
                          done: true,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {String(item.value)}
                            </p>
                          </div>
                          {item.done ? (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        What Happens Next
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        {
                          step: "Step 10",
                          desc: "Pin your property on the map for accurate location",
                        },
                        {
                          step: "Step 11",
                          desc: "Upload photos by category (Exterior, Rooms, Amenities, etc.)",
                        },
                        {
                          step: "Review",
                          desc: "Our team reviews your listing within 24 hours",
                        },
                        {
                          step: "Go Live",
                          desc: "Once approved, your property is visible to guests",
                        },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.step}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 11: Photos & Submit */}
              {step === 11 && (
                <div className="space-y-6">
                  {/* Photo Category Progress Summary */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Camera className="h-5 w-5 text-primary" />
                        Photo Upload Progress
                      </CardTitle>
                      <CardDescription>
                        Complete all categories for better visibility.
                        Properties with more photos get 3x more bookings!
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
                            • Once approved, your property will be live on
                            ZECOHO
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
                              <strong>Missing required photos:</strong> Please
                              add at least one photo in these categories:{" "}
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
                      quickSubmitMutation.isPending ||
                      getTotalImageCount() === 0
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
    </>
  );
}
