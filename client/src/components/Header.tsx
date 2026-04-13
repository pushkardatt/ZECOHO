import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  User,
  LogOut,
  Menu,
  Building,
  MessageCircle,
  History,
  PlusCircle,
  Shield,
  Settings,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Check,
  LayoutDashboard,
  CalendarCheck,
  IndianRupee,
  Star,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useKycGuard } from "@/hooks/useKycGuard";
import { useQuery } from "@tanstack/react-query";
import type { Conversation, KycApplication } from "@shared/schema";

type ConversationWithUnread = Conversation & { unreadCount: number };

export function Header() {
  const { user, isAuthenticated, isAdmin, isOwner } = useAuth();
  const { hasRejectedKyc, isKycNotStarted, isKycPending, isKycVerified } =
    useKycGuard();
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: conversations = [] } = useQuery<ConversationWithUnread[]>({
    queryKey: ["/api/conversations"],
    enabled: !!isAuthenticated,
  });

  // Fetch user's KYC application status
  const { data: kycApplication } = useQuery<KycApplication>({
    queryKey: ["/api/kyc/status"],
    enabled: !!isAuthenticated && user?.userRole === "guest",
  });

  const totalUnreadCount = conversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0,
  );

  // Play sound when new messages arrive
  useNotificationSound(totalUnreadCount, !!isAuthenticated, true);

  // Check if KYC is rejected - from either user.kycStatus OR kycApplication.status
  const isKycRejected = hasRejectedKyc || kycApplication?.status === "rejected";

  // All users go to the same List Property flow
  const getListPropertyLink = () => {
    return "/list-property";
  };

  const getKycStatusBadge = () => {
    if (!kycApplication) return null;

    switch (kycApplication.status) {
      case "verified":
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            KYC Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            KYC Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            KYC Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getInitials = () => {
    if (!user) return "G";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (
      (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U"
    );
  };

  // Hide header on mobile when viewing a message conversation
  const isMessagesPage =
    location === "/messages" || location === "/owner/messages";
  const urlParams = new URLSearchParams(window.location.search);
  const hasConversationOpen = urlParams.get("conversationId") !== null;
  const hideOnMobile = isMessagesPage && hasConversationOpen;

  return (
    <header
      className={`fixed md:sticky top-0 left-0 right-0 z-50 w-full border-b transition-all duration-300 ${hideOnMobile ? "hidden md:block" : ""} ${
        isScrolled
          ? "bg-white shadow-md border-border/50"
          : "bg-white border-border"
      }`}
    >
      <div className="w-full max-w-screen-2xl mx-auto flex h-14 items-center justify-between px-3 md:px-6 overflow-hidden">
        <Link href="/">
          <div
            className="flex items-center cursor-pointer group flex-shrink-0 transition-opacity duration-200 group-hover:opacity-90"
            data-testid="link-home"
          >
            <Logo />
          </div>
        </Link>

        <nav className="flex items-center gap-1 md:gap-2">
          {isAuthenticated ? (
            <>
              {user?.userRole === "guest" && (
                <>
                  {/* Wishlist - hidden on mobile (moved to bottom nav) except on property detail pages */}
                  <Link
                    href="/wishlist"
                    className={
                      !location.match(/^\/properties\/[^/]+$/)
                        ? "hidden md:block"
                        : ""
                    }
                  >
                    <Button
                      variant={location === "/wishlist" ? "secondary" : "ghost"}
                      size="sm"
                      className="font-medium text-sm"
                      data-testid="link-wishlist"
                    >
                      <Heart className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">Wishlist</span>
                    </Button>
                  </Link>

                  {/* Search History - desktop only */}
                  <Link href="/search-history" className="hidden md:block">
                    <Button
                      variant={
                        location === "/search-history" ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="font-medium text-sm"
                      data-testid="link-search-history"
                    >
                      <History className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">History</span>
                    </Button>
                  </Link>
                </>
              )}

              {/* Show Owner Portal for owners OR users who have engaged with KYC (pending/rejected) */}
              {(isOwner || isKycRejected || isKycPending) && (
                <Link
                  href="/owner/dashboard"
                  className={
                    isOwner && !location.match(/^\/properties\/[^/]+$/)
                      ? "hidden md:block"
                      : ""
                  }
                >
                  <Button
                    variant={
                      location.startsWith("/owner") ? "secondary" : "ghost"
                    }
                    size="sm"
                    className="font-medium text-sm"
                    data-testid="button-owner-portal"
                  >
                    <Building className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Owner Portal</span>
                  </Button>
                </Link>
              )}

              {/* Admin button - links directly to Admin Panel hub (same flow as mobile) */}
              {isAdmin && (
                <Link href="/admin" className="hidden md:block">
                  <Button
                    variant={
                      location.startsWith("/admin") ? "secondary" : "ghost"
                    }
                    size="sm"
                    className="font-medium text-sm"
                    data-testid="button-admin-menu"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    <span>Admin Panel</span>
                  </Button>
                </Link>
              )}

              {/* Messages - hidden on mobile for all users (moved to bottom nav) except on property detail pages where bottom nav is hidden */}
              <Link
                href={
                  isOwner || isKycRejected || isKycPending
                    ? "/owner/messages"
                    : "/messages"
                }
                className={
                  !location.match(/^\/properties\/[^/]+$/)
                    ? "hidden md:block"
                    : ""
                }
              >
                <Button
                  variant={
                    location === "/messages" || location === "/owner/messages"
                      ? "secondary"
                      : "ghost"
                  }
                  size="sm"
                  className="relative font-medium text-sm"
                  data-testid="link-messages"
                >
                  <MessageCircle className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Messages</span>
                  {totalUnreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs rounded-full"
                      data-testid="badge-unread-count"
                    >
                      {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* Show KYC status badge for guests who have submitted */}
              {user?.userRole === "guest" && getKycStatusBadge() && (
                <div className="hidden md:flex">{getKycStatusBadge()}</div>
              )}

              {isKycRejected ? (
                <Link href="/owner/kyc">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="font-semibold text-sm"
                    data-testid="button-fix-kyc"
                  >
                    <XCircle className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Fix KYC</span>
                    <span className="md:hidden">Fix KYC</span>
                  </Button>
                </Link>
              ) : isOwner && !isKycVerified ? (
                <Link href="/owner/kyc">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="font-semibold text-sm"
                    data-testid="button-complete-kyc"
                  >
                    <FileText className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Complete KYC</span>
                    <span className="md:hidden">KYC</span>
                  </Button>
                </Link>
              ) : isOwner && isKycVerified ? null : location === "/" &&
                !isAdmin ? (
                <Link href={getListPropertyLink()}>
                  <Button
                    size="sm"
                    className="font-semibold text-sm bg-primary text-primary-foreground border-0"
                    style={{
                      boxShadow: "0 4px 6px -1px hsl(var(--primary) / 0.25)",
                    }}
                    data-testid="button-list-property"
                  >
                    <PlusCircle className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">
                      List Your Property FREE
                    </span>
                    <span className="md:hidden">List FREE</span>
                  </Button>
                </Link>
              ) : null}

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user?.profileImageUrl || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold">
                      {user?.firstName || user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild data-testid="link-profile">
                    <Link href="/profile">
                      <User className="h-4 w-4 mr-2" />
                      Profile & Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild data-testid="link-my-bookings">
                    <Link href="/my-bookings">
                      <CalendarCheck className="h-4 w-4 mr-2" />
                      My Bookings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a
                      href="/api/logout"
                      className="cursor-pointer"
                      data-testid="link-logout"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/login?returnTo=/list-property"
                className="hidden sm:block"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm font-medium"
                  data-testid="link-own-property"
                >
                  <Building className="h-4 w-4 mr-1" />
                  <span>Own a Property</span>
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="sm" data-testid="button-login">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" data-testid="button-signup">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
