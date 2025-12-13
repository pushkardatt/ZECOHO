import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  User,
  Bell,
  Shield,
  HelpCircle,
} from "lucide-react";

export default function OwnerSettings() {
  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-settings">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="settings-profile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>
                Update your personal information and profile picture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/profile">
                <Button variant="outline" className="w-full" data-testid="go-to-profile">
                  Edit Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card data-testid="settings-notifications">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Manage how you receive booking and message alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled data-testid="manage-notifications">
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="settings-verification">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verification Status
              </CardTitle>
              <CardDescription>
                Complete KYC verification to build guest trust
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/kyc">
                <Button variant="outline" className="w-full" data-testid="go-to-kyc">
                  View KYC Status
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card data-testid="settings-help">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Help & Support
              </CardTitle>
              <CardDescription>
                Get help with your property listing and bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled data-testid="get-help">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}
