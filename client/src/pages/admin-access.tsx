import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AdminAccess() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [testAdminLoading, setTestAdminLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  const handlePromoteToAdmin = async () => {
    if (!email.trim()) {
      setMessage("Please enter an email address");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully promoted ${email} to admin!`);
        setEmail("");
        setTimeout(() => {
          setLocation("/admin/properties");
        }, 2000);
      } else {
        setMessage(`❌ ${data.message || "Failed to promote user"}`);
      }
    } catch (error) {
      setMessage("❌ Error promoting user");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAdminLogin = async () => {
    setTestAdminLoading(true);
    setTestMessage("");

    try {
      const response = await fetch("/api/test/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        setTestMessage("✅ Test admin session created! Redirecting to admin panel...");
        setTimeout(() => {
          setLocation("/admin/properties");
        }, 2000);
      } else {
        setTestMessage(`❌ ${data.message || "Failed to create test session"}`);
      }
    } catch (error) {
      setTestMessage("❌ Error creating test admin session");
      console.error(error);
    } finally {
      setTestAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2 text-center">Admin Access</h1>
        <p className="text-muted-foreground text-center mb-8">Choose an option to access the admin panel</p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Option A: Promote Real User */}
          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle>Option A: Promote User</CardTitle>
              <CardDescription>Promote your account to admin after login</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Email Address</p>
                <Input
                  type="email"
                  placeholder="your-email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-promote-email"
                />
              </div>
              <Button
                onClick={handlePromoteToAdmin}
                disabled={loading}
                className="w-full"
                data-testid="button-promote-admin"
              >
                {loading ? "Promoting..." : "Promote to Admin"}
              </Button>
              {message && (
                <p className={`text-sm ${message.includes("✅") ? "text-green-600" : "text-red-600"}`}>
                  {message}
                </p>
              )}
              <div className="bg-muted p-3 rounded text-xs space-y-2 text-muted-foreground">
                <p className="font-semibold">How to use:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Login with your Google/GitHub account</li>
                  <li>Return to this page</li>
                  <li>Enter your email and click "Promote to Admin"</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Option B: Test Admin Login */}
          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle>Option B: Test Admin</CardTitle>
              <CardDescription>Use test admin account (development only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-3 rounded text-sm space-y-2">
                <p className="font-semibold">Test Admin Account</p>
                <p className="text-muted-foreground">Email: admin@zecoho.com</p>
              </div>
              <Button
                onClick={handleTestAdminLogin}
                disabled={testAdminLoading}
                variant="outline"
                className="w-full"
                data-testid="button-test-admin-login"
              >
                {testAdminLoading ? "Logging in..." : "Test Admin Login"}
              </Button>
              {testMessage && (
                <p className={`text-sm ${testMessage.includes("✅") ? "text-green-600" : "text-red-600"}`}>
                  {testMessage}
                </p>
              )}
              <div className="bg-muted p-3 rounded text-xs space-y-2 text-muted-foreground">
                <p className="font-semibold">How to use:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click "Test Admin Login" button</li>
                  <li>You'll be instantly logged in as admin</li>
                  <li>Access the admin panel</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Admin Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Once you're an admin, you can:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✅ View all properties submitted by owners</li>
                <li>✅ Approve or reject property listings</li>
                <li>✅ Delete properties</li>
                <li>✅ Manage destinations</li>
              </ul>
            </div>
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="w-full"
              data-testid="button-back-home"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
