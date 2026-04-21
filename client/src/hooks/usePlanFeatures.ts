import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export interface PlanFeatures {
  bookingManagementEnabled: boolean;
  analyticsEnabled: boolean;
  priorityPlacement: boolean;
  additionalFeatures: string[];
  maxProperties: number;
  maxPhotosPerProperty: number;
}

const DEFAULT_FEATURES: PlanFeatures = {
  bookingManagementEnabled: false,
  analyticsEnabled: false,
  priorityPlacement: false,
  additionalFeatures: [],
  maxProperties: 0,
  maxPhotosPerProperty: 0,
};

export function usePlanFeatures() {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery<PlanFeatures>({
    queryKey: ["/api/owner/plan-features"],
    queryFn: () =>
      apiRequest("GET", "/api/owner/plan-features").then((r) => r.json()),
    enabled: !!user && isAuthenticated && (user as any).userRole === "owner",
    staleTime: 0,
  });

  return {
    features: data ?? DEFAULT_FEATURES,
    isLoading,
    hasActiveSubscription: !!(data && (data.bookingManagementEnabled || data.maxProperties > 0)),
  };
}
