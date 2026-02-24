import { Link, useLocation } from "wouter";
import { Home, Search, Heart, User, Building, MessageCircle, CalendarCheck, Shield, Bell, LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useNotifications } from "@/hooks/useNotifications";

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
  const { isAuthenticated, isOwner, isAdmin } = useAuth();
  
  // Fetch unread message count for all authenticated users
  const { data: conversations = [] } = useQuery<ConversationWithUnread[]>({
    queryKey: ["/api/conversations"],
    enabled: !!isAuthenticated,
  });
  
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  
  const { unreadCount: notificationUnreadCount } = useNotifications();
  
  // Play sound when new messages arrive (mobile)
  useNotificationSound(totalUnreadCount, !!isAuthenticated, true);
  
  // Hide on property details pages (they have their own booking bar)
  const isPropertyDetailsPage = location.match(/^\/properties\/[^/]+$/);
  
  // Hide on messages page only when viewing a specific conversation (has conversationId in URL)
  const isMessagesPage = location === "/messages" || location === "/owner/messages";
  const urlParams = new URLSearchParams(window.location.search);
  const hasConversationOpen = urlParams.get('conversationId') !== null;
  
  if (isPropertyDetailsPage || (isMessagesPage && hasConversationOpen)) {
    return null;
  }

  // Different nav items for owners vs guests
  const notifBadge = isAuthenticated && notificationUnreadCount > 0
    ? (notificationUnreadCount > 9 ? "9+" : String(notificationUnreadCount))
    : undefined;

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
      badge: notifBadge,
    },
  ];

  // Hide Search tab when already on search page (to avoid redundancy with sticky search bar)
  const isOnSearchPage = location.startsWith("/search");

  const guestNavItems: NavItem[] = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      active: location === "/",
    },
    // Only show Search tab when not already on search page
    ...(isOnSearchPage ? [] : [{
      href: "/search",
      icon: Search,
      label: "Search",
      active: false,
    }]),
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
      badge: notifBadge,
    },
  ];

  // Admin nav items - Admin tab in bottom nav with Wishlist
  const adminNavItems: NavItem[] = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      active: location === "/",
    },
    {
      href: "/admin",
      icon: Shield,
      label: "Admin",
      active: location.startsWith("/admin"),
    },
    {
      href: "/messages",
      icon: MessageCircle,
      label: "Messages",
      active: location === "/messages",
      badge: totalUnreadCount > 0 ? (totalUnreadCount > 9 ? "9+" : String(totalUnreadCount)) : undefined,
    },
    {
      href: "/wishlist",
      icon: Heart,
      label: "Wishlist",
      active: location === "/wishlist",
    },
    {
      href: "/profile",
      icon: User,
      label: "Profile",
      active: location === "/profile",
      badge: notifBadge,
    },
  ];

  // Priority: Admin > Owner > Guest
  const navItems = isAdmin ? adminNavItems : (isOwner ? ownerNavItems : guestNavItems);

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="mobile-bottom-nav"
    >
      <div className="flex items-center justify-around h-12">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 py-1 transition-colors relative ${
                item.active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <div className="relative">
                <Icon className={`h-[18px] w-[18px] ${item.active ? "fill-current" : ""}`} />
                {item.badge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1.5 -right-2.5 h-3.5 min-w-3.5 flex items-center justify-center p-0 text-[9px] rounded-full"
                    data-testid="badge-unread-mobile"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
