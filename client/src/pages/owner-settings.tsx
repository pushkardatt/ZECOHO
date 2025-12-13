import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import {
  User,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function OwnerSettings() {
  const { user } = useAuth();

  const getKycStatusBadge = () => {
    const status = user?.kycStatus || "not_started";
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: typeof CheckCircle }> = {
      verified: { variant: "default", label: "Verified", icon: CheckCircle },
      pending: { variant: "outline", label: "Pending", icon: Clock },
      rejected: { variant: "destructive", label: "Rejected", icon: AlertCircle },
      not_started: { variant: "secondary", label: "Not Started", icon: AlertCircle },
    };
    const config = statusConfig[status] || statusConfig.not_started;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const settingsItems = [
    {
      title: "Profile Settings",
      description: "Update your personal information and profile picture",
      icon: User,
      href: "/profile",
      action: "Edit Profile",
    },
    {
      title: "Notification Preferences",
      description: "Manage how you receive updates about bookings and messages",
      icon: Bell,
      href: "/profile",
      action: "Manage",
    },
    {
      title: "Verification Status",
      description: "Complete KYC verification to build trust with guests",
      icon: Shield,
      href: "/kyc",
      action: user?.kycStatus === "verified" ? "View Status" : "Complete KYC",
      badge: getKycStatusBadge(),
    },
    {
      title: "Help & Support",
      description: "Get help with your account or property listings",
      icon: HelpCircle,
      href: "#",
      action: "Get Help",
    },
  ];

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-settings">
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        <div className="grid gap-4">
          {settingsItems.map((item) => (
            <Card key={item.title} data-testid={`settings-card-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-md">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {item.title}
                        {item.badge}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {item.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={item.href}>
                  <Button variant="outline" className="w-full sm:w-auto" data-testid={`action-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    {item.action}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Actions here cannot be undone. Please proceed with caution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="border-destructive text-destructive" data-testid="deactivate-account">
              Deactivate Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
