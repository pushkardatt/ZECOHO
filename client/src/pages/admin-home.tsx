import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  CalendarCheck,
  UserCog,
  Package,
  HeadphonesIcon,
  FileCheck,
  MapPin,
  FileText,
  Handshake,
  Info,
  Phone,
  ChevronRight,
} from "lucide-react";

const adminSections = [
  {
    title: "Properties",
    description: "Review and manage property listings",
    icon: Building2,
    href: "/admin/properties",
    testId: "admin-nav-properties",
  },
  {
    title: "Bookings",
    description: "Manage all bookings",
    icon: CalendarCheck,
    href: "/admin/bookings",
    testId: "admin-nav-bookings",
  },
  {
    title: "Users",
    description: "Manage user accounts",
    icon: Users,
    href: "/admin/users",
    testId: "admin-nav-users",
  },
  {
    title: "Owners",
    description: "Owner compliance & management",
    icon: UserCog,
    href: "/admin/owners",
    testId: "admin-nav-owners",
  },
  {
    title: "Inventory",
    description: "Monitor room availability",
    icon: Package,
    href: "/admin/inventory",
    testId: "admin-nav-inventory",
  },
  {
    title: "Support",
    description: "Customer support inbox",
    icon: HeadphonesIcon,
    href: "/admin/support",
    testId: "admin-nav-support",
  },
  {
    title: "KYC Verification",
    description: "Review KYC documents",
    icon: FileCheck,
    href: "/admin/kyc",
    testId: "admin-nav-kyc",
  },
  {
    title: "Destinations",
    description: "Manage destinations",
    icon: MapPin,
    href: "/admin/destinations",
    testId: "admin-nav-destinations",
  },
  {
    title: "Policies",
    description: "Terms & privacy policies",
    icon: FileText,
    href: "/admin/policies",
    testId: "admin-nav-policies",
  },
  {
    title: "Owner Agreements",
    description: "Manage owner agreements",
    icon: Handshake,
    href: "/admin/owner-agreements",
    testId: "admin-nav-agreements",
  },
  {
    title: "About Us",
    description: "Edit about us page",
    icon: Info,
    href: "/admin/about-us",
    testId: "admin-nav-about",
  },
  {
    title: "Contact Settings",
    description: "Manage contact information",
    icon: Phone,
    href: "/admin/contact-settings",
    testId: "admin-nav-contact",
  },
];

export default function AdminHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user is admin
  if (user?.userRole !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            You need admin privileges to access this panel.
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-1">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Manage your platform
        </p>

        <div className="space-y-3">
          {adminSections.map((section) => (
            <Card
              key={section.href}
              className="hover-elevate cursor-pointer"
              onClick={() => setLocation(section.href)}
              data-testid={section.testId}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{section.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {section.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
