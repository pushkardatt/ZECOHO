// Referenced from blueprint:javascript_log_in_with_replit
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

// Helper function to check if a user has a specific role (single role only from userRole field)
export function userHasRole(user: User | null | undefined, role: string): boolean {
  if (!user) return false;
  return user.userRole === role;
}

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchInterval: 5000, // More frequent refresh to catch role changes quickly
    staleTime: 0, // Always refetch to ensure fresh role data
  });

  // Helper to check if user has a specific role (single role only)
  const hasRole = (role: string): boolean => userHasRole(user, role);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    isAdmin: user?.userRole === "admin",
    isOwner: user?.userRole === "owner",
    refetch,
  };
}
