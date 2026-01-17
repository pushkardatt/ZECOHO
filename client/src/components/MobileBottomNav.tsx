import { Link, useLocation } from "wouter";
import { Home, Search, Heart, User, Building } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function MobileBottomNav() {
  const [location] = useLocation();
  const { isAuthenticated, isOwner } = useAuth();

  const navItems = [
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
      href: isAuthenticated ? "/wishlist" : "/login?returnTo=/wishlist",
      icon: Heart,
      label: "Wishlist",
      active: location === "/wishlist",
    },
    ...(isOwner ? [{
      href: "/owner/dashboard",
      icon: Building,
      label: "Owner",
      active: location.startsWith("/owner"),
    }] : []),
    {
      href: isAuthenticated ? "/profile" : "/login",
      icon: User,
      label: isAuthenticated ? "Profile" : "Login",
      active: location === "/profile" || location === "/login",
    },
  ];

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
              className={`flex flex-col items-center justify-center flex-1 h-full px-3 py-2 transition-colors ${
                item.active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon className={`h-5 w-5 ${item.active ? "fill-current" : ""}`} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
