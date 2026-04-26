import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function PropertySubmitted() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <Helmet>
        <title>Application Submitted | ZECOHO</title>
      </Helmet>

      <Card>
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900/40 p-4">
              <CheckCircle2
                className="h-16 w-16 text-green-600 dark:text-green-400"
                data-testid="icon-success"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h1
              className="text-2xl font-bold"
              data-testid="text-submitted-heading"
            >
              Application Submitted!
            </h1>
            <p
              className="text-muted-foreground"
              data-testid="text-submitted-subheading"
            >
              Your property is under review.
            </p>
          </div>

          <div className="text-left bg-muted/50 rounded-lg p-5 space-y-3">
            <h2 className="font-semibold text-sm">What happens next?</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>Our team will review your listing (2–3 business days).</li>
              <li>You'll receive an email when your property is approved.</li>
              <li>Once approved, your property goes live on ZECOHO.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-center pt-2">
            <Button
              onClick={() => setLocation("/owner/dashboard")}
              data-testid="button-go-dashboard"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/owner/choose-mode")}
              data-testid="button-list-another"
            >
              List Another Property
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
