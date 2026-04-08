import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Home, Mail, RefreshCw } from "lucide-react";

export default function AuthError() {
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const errorMessage =
    params.get("error") || "An unexpected error occurred during login.";

  const handleRetry = () => {
    setLocation("/login");
  };

  const handleGoHome = () => {
    setLocation("/");
  };

  const handleContactSupport = () => {
    setLocation("/contact");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Login Error</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground" data-testid="text-error-message">
            {decodeURIComponent(errorMessage)}
          </p>
          <p className="text-sm text-muted-foreground">
            If this problem continues, please contact our support team for
            assistance.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={handleRetry}
            className="w-full"
            data-testid="button-retry-login"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="flex-1"
              data-testid="button-go-home"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button
              variant="outline"
              onClick={handleContactSupport}
              className="flex-1"
              data-testid="button-contact-support"
            >
              <Mail className="mr-2 h-4 w-4" />
              Support
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
