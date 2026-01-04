import { useQuery } from "@tanstack/react-query";
import { FileCheck, Calendar, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { OwnerAgreement } from "@shared/schema";

export default function OwnerAgreementPage() {
  const { data: agreement, isLoading, error } = useQuery<OwnerAgreement>({
    queryKey: ["/api/owner-agreement"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-10 w-96 mb-4" />
          <Skeleton className="h-6 w-48 mb-8" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-amber-600 dark:text-amber-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-amber-800 dark:text-amber-200">
                Owner Agreement Not Available
              </h2>
              <p className="text-amber-700 dark:text-amber-300">
                The Property Owner Agreement has not been published yet. Please check back later.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <FileCheck className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-agreement-title">
                {agreement.title}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="secondary" data-testid="badge-version">
                  Version {agreement.version}
                </Badge>
                {agreement.publishedAt && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Effective from {new Date(agreement.publishedAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="py-8 px-6 md:px-8">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed"
              data-testid="text-agreement-content"
            >
              {agreement.content}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            This agreement governs the relationship between ZECOHO and property owners/hoteliers.
          </p>
          <p className="mt-2">
            For questions about this agreement, please contact us at{" "}
            <a href="mailto:owners@zecoho.com" className="text-primary hover:underline">
              owners@zecoho.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
