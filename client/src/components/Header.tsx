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
import { Home, Heart, User, LogOut, Menu, Building, MessageCircle, History, PlusCircle, Shield, Settings, FileText, MapPin, CheckCircle, Clock, XCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Conversation, KycApplication } from "@shared/schema";

type ConversationWithUnread = Conversation & { unreadCount: number };

export function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <span className="font-bold text-xl">ZECOHO</span>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {user?.userRole === "owner" && (
                <Badge variant="secondary" className="hidden md:flex">
                  Owner Dashboard
                </Badge>
              )}
              
              {user?.userRole === "admin" && (
                <Badge variant="default" className="hidden md:flex">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin Panel
                </Badge>
              )}
              
              <Link href="/">
                <Button 
                  variant={location === "/" ? "secondary" : "ghost"}
                  size="sm"
                  className="hidden md:flex"
                  data-testid="link-nav-home"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>

              {user?.userRole === "guest" && (
                <>
                  <Link href="/wishlist">
                    <Button 
                      variant={location === "/wishlist" ? "secondary" : "ghost"}
                      size="sm"
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
                      data-testid="link-search-history"
                    >
                      <History className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">History</span>
                    </Button>
                  </Link>
                </>
              )}

              {user?.userRole === "owner" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant={location.startsWith("/owner") ? "secondary" : "ghost"}
                      size="sm"
                      data-testid="button-owner-menu"
                    >
                      <Building className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">My Properties</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Property Management
                      </p>
                      <p className="text-xs text-muted-foreground">Manage your listings</p>
                    </div>
                    <DropdownMenuSeparator />
                    <Link href="/owner/properties">
                      <DropdownMenuItem data-testid="link-owner-properties">
                        <Building className="h-4 w-4 mr-2" />
                        View My Properties
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {user?.userRole === "admin" && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant={location.startsWith("/admin") ? "secondary" : "ghost"}
                        size="sm"
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
                      <Link href="/admin/properties">
                        <DropdownMenuItem data-testid="link-admin-properties">
                          <Building className="h-4 w-4 mr-2" />
                          Manage Properties
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/admin/kyc">
                        <DropdownMenuItem data-testid="link-admin-kyc">
                          <FileText className="h-4 w-4 mr-2" />
                          KYC Applications
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/admin/destinations">
                        <DropdownMenuItem data-testid="link-admin-destinations">
                          <MapPin className="h-4 w-4 mr-2" />
                          Manage Destinations
                        </DropdownMenuItem>
                      </Link>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              <Link href="/messages">
                <Button 
                  variant={location === "/messages" ? "secondary" : "ghost"}
                  size="sm"
                  className="relative"
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

              <Link href={getListPropertyLink()}>
                <Button 
                  variant="default"
                  size="sm"
                  data-testid="button-list-property"
                >
                  <PlusCircle className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">List Your Property</span>
                  <span className="md:hidden">List Property</span>
                </Button>
              </Link>

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
                  <Link href="/profile">
                    <DropdownMenuItem data-testid="link-profile">
                      <User className="h-4 w-4 mr-2" />
                      Profile & Settings
                    </DropdownMenuItem>
                  </Link>
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
            <Button asChild data-testid="button-login">
              <a href="/api/login">Log in / Sign up</a>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
