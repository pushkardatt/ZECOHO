// Referenced from blueprint:javascript_log_in_with_replit
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

// Helper function to check if a user has a specific role (checks both primary and additional roles)
export function userHasRole(user: User | null | undefined, role: string): boolean {
  if (!user) return false;
  if (user.userRole === role) return true;
  if (user.additionalRoles && Array.isArray(user.additionalRoles) && user.additionalRoles.includes(role)) return true;
  return false;
}

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Helper to check if user has a specific role
  const hasRole = (role: string): boolean => userHasRole(user, role);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    isAdmin: hasRole("admin"),
    isOwner: hasRole("owner"),
    refetch,
  };
}
