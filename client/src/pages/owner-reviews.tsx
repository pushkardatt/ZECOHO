import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useKycGuard } from "@/hooks/useKycGuard";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Link } from "wouter";
import { Star, MessageSquare, Send, XCircle } from "lucide-react";

interface Review {
  id: number;
  propertyId: number;
  propertyTitle: string;
  guestId: string;
  guestName: string;
  guestImage?: string;
  rating: number;
  comment: string;
  ownerResponse?: string;
  createdAt: string;
}

export default function OwnerReviews() {
  const { toast } = useToast();
  const { isKycRejected } = useKycGuard();
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ["/api/owner/reviews"],
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, response }: { id: number; response: string }) => {
      return apiRequest("POST", `/api/owner/reviews/${id}/respond`, {
        response,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/reviews"] });
      setRespondingTo(null);
      setResponseText("");
      toast({
        title: "Response Posted",
        description: "Your response has been posted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post response.",
        variant: "destructive",
      });
    },
  });
  if (isKycRejected) {
    return (
      <OwnerLayout>
        <Alert
          variant="destructive"
          className="mb-6"
          data-testid="kyc-rejected-block"
        >
          <XCircle className="h-5 w-5" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>
              Your KYC has been rejected. Please fix your KYC to view reviews.
            </span>
            <Link href="/owner/kyc">
              <Button variant="destructive" size="sm" data-testid="btn-fix-kyc">
                Fix KYC & Resubmit
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </OwnerLayout>
    );
  }

  const handleRespond = (reviewId: number) => {
    if (!responseText.trim()) {
      toast({
        title: "Empty Response",
        description: "Please write a response.",
        variant: "destructive",
      });
      return;
    }
    respondMutation.mutate({ id: reviewId, response: responseText });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  const averageRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(
        1,
      )
    : "0.0";

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-reviews">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Guest Reviews</h2>
            <p className="text-sm text-muted-foreground">
              See what your guests are saying
            </p>
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold" data-testid="average-rating">
                {averageRating}
              </div>
              <div>
                {renderStars(parseFloat(averageRating))}
                <p className="text-sm text-muted-foreground mt-1">
                  {reviews?.length || 0} review
                  {reviews?.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} data-testid={`review-card-${review.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={review.guestImage}
                          alt={review.guestName}
                        />
                        <AvatarFallback>
                          {review.guestName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {review.guestName}
                          </span>
                          {renderStars(review.rating)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {review.propertyTitle} •{" "}
                          {format(new Date(review.createdAt), "dd MMM yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{review.rating}/5</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p
                    className="text-sm"
                    data-testid={`review-comment-${review.id}`}
                  >
                    {review.comment}
                  </p>

                  {review.ownerResponse && (
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm font-medium mb-1">Your Response:</p>
                      <p
                        className="text-sm text-muted-foreground"
                        data-testid={`owner-response-${review.id}`}
                      >
                        {review.ownerResponse}
                      </p>
                    </div>
                  )}

                  {!review.ownerResponse && (
                    <>
                      {respondingTo === review.id ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Write your response..."
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            rows={3}
                            data-testid={`response-textarea-${review.id}`}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRespond(review.id)}
                              disabled={respondMutation.isPending}
                              data-testid={`submit-response-${review.id}`}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Post Response
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRespondingTo(null);
                                setResponseText("");
                              }}
                              data-testid={`cancel-response-${review.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRespondingTo(review.id)}
                          data-testid={`respond-to-review-${review.id}`}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Respond to Review
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
              <p className="text-muted-foreground text-center">
                Reviews from your guests will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
