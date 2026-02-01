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
import { Heart, User, LogOut, Menu, Building, MessageCircle, History, PlusCircle, Shield, Settings, FileText, MapPin, CheckCircle, Clock, XCircle, Check, LayoutDashboard, CalendarCheck, IndianRupee, Star, UserCircle, ArrowRightLeft, Phone, Handshake, Info, Calendar, Users, Package, Bell } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useKycGuard } from "@/hooks/useKycGuard";
import { useQuery } from "@tanstack/react-query";
import type { Conversation, KycApplication } from "@shared/schema";

type ConversationWithUnread = Conversation & { unreadCount: number };

export function Header() {
  const { user, isAuthenticated, isAdmin, isOwner } = useAuth();
  const { hasRejectedKyc, isKycNotStarted, isKycPending, isKycVerified } = useKycGuard();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
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

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  // Play sound when new notifications or messages arrive
  useNotificationSound(unreadCount, !!isAuthenticated, true);
  useNotificationSound(totalUnreadCount, !!isAuthenticated, true);

  // Check if KYC is rejected - from either user.kycStatus OR kycApplication.status
  // This handles cases where user.kycStatus wasn't synced with the application status
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
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  // Hide header on mobile when viewing a message conversation
  const isMessagesPage = location === "/messages" || location === "/owner/messages";
  const urlParams = new URLSearchParams(window.location.search);
  const hasConversationOpen = urlParams.get('conversationId') !== null;
  const hideOnMobile = isMessagesPage && hasConversationOpen;

  return (
    <header className={`fixed md:sticky top-0 left-0 right-0 z-50 w-full border-b transition-all duration-300 ${hideOnMobile ? 'hidden md:block' : ''} ${
      isScrolled 
        ? "bg-background/98 backdrop-blur-lg shadow-md border-border/50" 
        : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    }`}>
      <div className="w-full max-w-screen-2xl mx-auto flex h-20 items-center justify-between px-4 md:px-6 overflow-hidden">
        <Link href="/">
          <div className="flex items-center cursor-pointer group flex-shrink-0 transition-opacity duration-200 group-hover:opacity-90" data-testid="link-home">
            <Logo />
          </div>
        </Link>

        <nav className="flex items-center gap-1 md:gap-2">
          {isAuthenticated ? (
            <>
              {user?.userRole === "guest" && (
                <>
                  {/* Wishlist - hidden on mobile (moved to bottom nav) except on property detail pages */}
                  <Link href="/wishlist" className={!location.match(/^\/properties\/[^/]+$/) ? "hidden md:block" : ""}>
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
                      variant={location === "/search-history" ? "secondary" : "ghost"}
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
              {/* Hidden on mobile for owners except on property detail pages where bottom nav is hidden */}
              {(isOwner || isKycRejected || isKycPending) && (
                <Link href="/owner/dashboard" className={isOwner && !location.match(/^\/properties\/[^/]+$/) ? "hidden md:block" : ""}>
                  <Button 
                    variant={location.startsWith("/owner") ? "secondary" : "ghost"}
                    size="sm"
                    className="font-medium text-sm"
                    data-testid="button-owner-portal"
                  >
                    <Building className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Owner Portal</span>
                  </Button>
                </Link>
              )}
              

              {/* Admin dropdown - hidden on mobile (moved to bottom nav) */}
              {isAdmin && (
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant={location.startsWith("/admin") ? "secondary" : "ghost"}
                        size="sm"
                        className="font-medium text-sm"
                        data-testid="button-admin-menu"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        <span>Admin</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin Panel
                        </p>
                        <p className="text-xs text-muted-foreground">Manage platform content</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild data-testid="link-admin-properties">
                        <Link href="/admin/properties">
                          <Building className="h-4 w-4 mr-2" />
                          Manage Properties
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild data-testid="link-admin-kyc">
                        <Link href="/admin/kyc">
                          <FileText className="h-4 w-4 mr-2" />
                          KYC Applications
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild data-testid="link-admin-destinations">
                        <Link href="/admin/destinations">
                          <MapPin className="h-4 w-4 mr-2" />
                          Manage Destinations
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild data-testid="link-admin-policies">
                        <Link href="/admin/policies">
                          <FileText className="h-4 w-4 mr-2" />
                          Policies & Terms
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild data-testid="link-admin-contact-settings">
                        <Link href="/admin/contact-settings">
                          <Phone className="h-4 w-4 mr-2" />
                          Contact Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild data-testid="link-admin-owner-agreements">
                        <Link href="/admin/owner-agreements">
                          <Handshake className="h-4 w-4 mr-2" />
                          Owner Agreements
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild data-testid="link-admin-about-us">
                        <Link href="/admin/about-us">
                          <Info className="h-4 w-4 mr-2" />
                          About Us Page
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild data-testid="link-admin-bookings">
                        <Link href="/admin/bookings">
                          <Calendar className="h-4 w-4 mr-2" />
                          Booking Management
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild data-testid="link-admin-owners">
                        <Link href="/admin/owners">
                          <Users className="h-4 w-4 mr-2" />
                          Owner Compliance
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild data-testid="link-admin-inventory">
                        <Link href="/admin/inventory">
                          <Package className="h-4 w-4 mr-2" />
                          Inventory Health
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild data-testid="link-admin-users">
                        <Link href="/admin/users">
                          <User className="h-4 w-4 mr-2" />
                          User Management
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild data-testid="link-admin-support">
                        <Link href="/admin/support">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Support Inbox
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Messages - hidden on mobile for all users (moved to bottom nav) except on property detail pages where bottom nav is hidden */}
              <Link 
                href={(isOwner || isKycRejected || isKycPending) ? "/owner/messages" : "/messages"}
                className={!location.match(/^\/properties\/[^/]+$/) ? "hidden md:block" : ""}
              >
                <Button 
                  variant={location === "/messages" || location === "/owner/messages" ? "secondary" : "ghost"}
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
                      {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* Show KYC status badge for guests who have submitted */}
              {user?.userRole === "guest" && getKycStatusBadge() && (
                <div className="hidden md:flex">
                  {getKycStatusBadge()}
                </div>
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
              ) : isOwner && isKycVerified ? (
                null
              ) : location === "/" && !isAdmin ? (
                <Link href={getListPropertyLink()}>
                  <Button 
                    size="sm"
                    className="font-semibold text-sm bg-primary text-primary-foreground border-0"
                    style={{ boxShadow: '0 4px 6px -1px hsl(var(--primary) / 0.25)' }}
                    data-testid="button-list-property"
                  >
                    <PlusCircle className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">List Your Property FREE</span>
                    <span className="md:hidden">List FREE</span>
                  </Button>
                </Link>
              ) : null}

              {/* Owner Context Indicator - shows when user is in owner mode */}
              {isOwner && location.startsWith("/owner") && (
                <Badge 
                  variant="secondary" 
                  className="hidden md:flex items-center gap-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                  data-testid="badge-owner-mode"
                >
                  <Building className="h-3 w-3" />
                  Owner Mode
                </Badge>
              )}

              {/* Role Switcher for Owners */}
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1.5"
                      data-testid="button-role-switcher"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      <span className="hidden md:inline text-sm">Switch Mode</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Switch Mode
                      </p>
                      <p className="text-xs text-muted-foreground">Toggle between customer and owner views</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer" data-testid="switch-customer-mode">
                      <Link href="/">
                        <UserCircle className="h-4 w-4 mr-2" />
                        <div className="flex flex-col">
                          <span className="font-medium">Customer Mode</span>
                          <span className="text-xs text-muted-foreground">Browse & book properties</span>
                        </div>
                        {!location.startsWith("/owner") && (
                          <Check className="h-4 w-4 ml-auto text-primary" />
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer" data-testid="switch-owner-mode">
                      <Link href="/owner/dashboard">
                        <Building className="h-4 w-4 mr-2" />
                        <div className="flex flex-col">
                          <span className="font-medium">Owner Mode</span>
                          <span className="text-xs text-muted-foreground">Manage your property</span>
                        </div>
                        {location.startsWith("/owner") && (
                          <Check className="h-4 w-4 ml-auto text-primary" />
                        )}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Notification Bell */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-sm font-semibold">Notifications</p>
                    {unreadCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-7"
                        onClick={() => markAllAsRead()}
                        data-testid="button-mark-all-read"
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-6 text-center text-muted-foreground text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notification) => (
                        <DropdownMenuItem 
                          key={notification.id}
                          className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.isRead ? "bg-muted/50" : ""}`}
                          onClick={() => {
                            if (!notification.isRead) {
                              markAsRead(notification.id);
                            }
                            if (notification.entityType === "booking" && notification.entityId) {
                              window.location.href = `/my-bookings?highlight=${notification.entityId}`;
                            } else if (notification.entityType === "conversation" && notification.entityId) {
                              window.location.href = `/messages/${notification.entityId}`;
                            } else if (notification.entityType === "property" && notification.entityId) {
                              window.location.href = `/owner/properties`;
                            }
                          }}
                          data-testid={`notification-item-${notification.id}`}
                        >
                          <div className="flex items-start gap-2 w-full">
                            {!notification.isRead && (
                              <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{notification.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : ""}
                              </p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold">{user?.firstName || user?.email}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
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
                    <a href="/api/logout" className="cursor-pointer" data-testid="link-logout">
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2 md:gap-3">
              <Link href="/login?returnTo=/list-property" className="hidden sm:block">
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
