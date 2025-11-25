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
import { Home, Heart, User, LogOut, Menu, Building, MessageCircle, History, PlusCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Conversation } from "@shared/schema";

type ConversationWithUnread = Conversation & { unreadCount: number };

export function Header() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  const { data: conversations = [] } = useQuery<ConversationWithUnread[]>({
    queryKey: ["/api/conversations"],
    enabled: !!isAuthenticated,
  });

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

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
                <Link href="/owner/properties">
                  <Button 
                    variant={location.startsWith("/owner") ? "secondary" : "ghost"}
                    size="sm"
                    data-testid="link-owner-properties"
                  >
                    <Building className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">My Properties</span>
                  </Button>
                </Link>
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

              <Link href="/kyc">
                <Button 
                  variant="default"
                  size="sm"
                  data-testid="button-list-hotel"
                >
                  <PlusCircle className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">List Your Hotel</span>
                  <span className="md:hidden">List Hotel</span>
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
