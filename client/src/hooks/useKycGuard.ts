import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./useAuth";

const ALLOWED_ROUTES_FOR_REJECTED = ["/owner/dashboard", "/owner/kyc"];

export function useKycGuard() {
  const { user, isOwner, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const isKycRejected = user?.kycStatus === "rejected";
  const isKycPending = user?.kycStatus === "pending";
  const isKycNotStarted = user?.kycStatus === "not_started";
  const isKycVerified = user?.kycStatus === "verified";

  useEffect(() => {
    if (isLoading) return;
    
    if (isOwner && isKycRejected) {
      const isAllowed = ALLOWED_ROUTES_FOR_REJECTED.some(
        (route) => location === route || location.startsWith(route + "?")
      );
      
      if (!isAllowed && location.startsWith("/owner")) {
        setLocation("/owner/dashboard?state=kyc_rejected");
      }
    }
  }, [isOwner, isKycRejected, location, isLoading, setLocation]);

  return {
    isKycRejected,
    isKycPending,
    isKycNotStarted,
    isKycVerified,
    shouldBlockAccess: isOwner && isKycRejected,
  };
}
