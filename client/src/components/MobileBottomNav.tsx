import { Link, useLocation } from "wouter";
import { Home, Search, Heart, User, Building, MessageCircle, CalendarCheck, LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

type ConversationWithUnread = { unreadCount: number };

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: string;
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const { isAuthenticated, isOwner } = useAuth();
  
  // Fetch unread message count for all authenticated users
  const { data: conversations = [] } = useQuery<ConversationWithUnread[]>({
    queryKey: ["/api/conversations"],
    enabled: !!isAuthenticated,
  });
  
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  
  // Hide on property details pages (they have their own booking bar)
  const isPropertyDetailsPage = location.match(/^\/properties\/[^/]+$/);
  if (isPropertyDetailsPage) {
    return null;
  }

  // Different nav items for owners vs guests
  const ownerNavItems: NavItem[] = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      active: location === "/",
    },
    {
      href: "/owner/dashboard",
      icon: Building,
      label: "Owner",
      active: location.startsWith("/owner") && location !== "/owner/messages",
    },
    {
      href: "/owner/messages",
      icon: MessageCircle,
      label: "Messages",
      active: location === "/owner/messages",
      badge: totalUnreadCount > 0 ? (totalUnreadCount > 9 ? "9+" : String(totalUnreadCount)) : undefined,
    },
    {
      href: "/owner/bookings",
      icon: CalendarCheck,
      label: "Bookings",
      active: location === "/owner/bookings",
    },
    {
      href: "/profile",
      icon: User,
      label: "Profile",
      active: location === "/profile",
    },
  ];

  const guestNavItems: NavItem[] = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      active: location === "/",
    },
    {
      href: "/search",
      icon: Search,
      label: "Search",
      active: location.startsWith("/search"),
    },
    {
      href: isAuthenticated ? "/messages" : "/login?returnTo=/messages",
      icon: MessageCircle,
      label: "Messages",
      active: location === "/messages",
      badge: isAuthenticated && totalUnreadCount > 0 ? (totalUnreadCount > 9 ? "9+" : String(totalUnreadCount)) : undefined,
    },
    {
      href: isAuthenticated ? "/wishlist" : "/login?returnTo=/wishlist",
      icon: Heart,
      label: "Wishlist",
      active: location === "/wishlist",
    },
    {
      href: isAuthenticated ? "/profile" : "/login",
      icon: User,
      label: isAuthenticated ? "Profile" : "Login",
      active: location === "/profile" || location === "/login",
    },
  ];

  const navItems = isOwner ? ownerNavItems : guestNavItems;

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full px-3 py-2 transition-colors relative ${
                item.active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${item.active ? "fill-current" : ""}`} />
                {item.badge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-3 h-4 min-w-4 flex items-center justify-center p-0 text-[10px] rounded-full"
                    data-testid="badge-unread-mobile"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
