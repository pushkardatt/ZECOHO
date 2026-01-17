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
import { Heart, User, LogOut, Menu, Building, MessageCircle, History, PlusCircle, Shield, Settings, FileText, MapPin, CheckCircle, Clock, XCircle, Globe, Check, LayoutDashboard, CalendarCheck, IndianRupee, Star, UserCircle, ArrowRightLeft, Phone, Handshake, Info, Calendar, Users, Package } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useKycGuard } from "@/hooks/useKycGuard";
import { useQuery } from "@tanstack/react-query";
import type { Conversation, KycApplication } from "@shared/schema";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
];

type ConversationWithUnread = Conversation & { unreadCount: number };

export function Header() {
  const { user, isAuthenticated, isAdmin, isOwner } = useAuth();
  const { hasRejectedKyc, isKycNotStarted, isKycPending, isKycVerified } = useKycGuard();
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("preferredLanguage") || "en";
    }
    return "en";
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem("preferredLanguage", selectedLanguage);
  }, [selectedLanguage]);

  const currentLanguage = languages.find(l => l.code === selectedLanguage) || languages[0];

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

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
      isScrolled 
        ? "bg-background/98 backdrop-blur-lg shadow-md border-border/50" 
        : "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    }`}>
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer group" data-testid="link-home">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg transition-opacity duration-200 group-hover:opacity-90" style={{ boxShadow: '0 10px 15px -3px hsl(var(--primary) / 0.2)' }}>
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-xl text-foreground tracking-tight">
                ZECOHO
              </span>
              <span className="font-bold text-base text-primary">.COM</span>
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 md:gap-2">
          {isAuthenticated ? (
            <>
              {user?.userRole === "guest" && (
                <>
                  <Link href="/wishlist">
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

                  <Link href="/search-history">
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
              {(isOwner || isKycRejected || isKycPending) && (
                <Link href="/owner/dashboard">
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

              {isAdmin && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant={location.startsWith("/admin") ? "secondary" : "ghost"}
                        size="sm"
                        className="font-medium text-sm"
                        data-testid="button-admin-menu"
                      >
                        <Shield className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Admin</span>
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
                </>
              )}

              <Link href={(isOwner || isKycRejected || isKycPending) ? "/owner/messages" : "/messages"}>
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
              ) : (
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
              )}

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
              <Link href="/login?returnTo=/list-property">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-sm font-medium"
                  data-testid="link-own-property"
                >
                  <Building className="h-4 w-4 md:mr-1" />
                  <span className="hidden sm:inline">Own a Property</span>
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

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-language-selector">
                <Globe className="h-4 w-4" />
                <span className="hidden md:inline text-sm">{currentLanguage.nativeName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className="flex items-center justify-between cursor-pointer"
                  data-testid={`language-option-${lang.code}`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{lang.nativeName}</span>
                    <span className="text-xs text-muted-foreground">{lang.name}</span>
                  </div>
                  {selectedLanguage === lang.code && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
