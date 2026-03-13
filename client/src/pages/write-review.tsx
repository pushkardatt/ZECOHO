import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Star,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface ReviewDetails {
  booking: {
    id: string;
    bookingCode: string;
    checkIn: string;
    checkOut: string;
    status: string;
  };
  property: {
    id: string;
    title: string;
    images: string[];
    destination: string;
  };
}

function StarRating({
  rating,
  onRatingChange,
  label,
  size = "lg",
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
  label?: string;
  size?: "sm" | "lg";
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const starSize = size === "lg" ? "h-8 w-8" : "h-5 w-5";

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm text-muted-foreground">{label}</Label>
      )}
      <div className="flex gap-1" data-testid="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
            data-testid={`star-${star}`}
          >
            <Star
              className={`${starSize} transition-colors ${
                star <= (hoverRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WriteReview() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/property/:propertyId/review");
  const { toast } = useToast();

  const propertyId = params?.propertyId;
  const searchParams = new URLSearchParams(window.location.search);
  const bookingId = searchParams.get("bookingId");

  const [overallRating, setOverallRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [staffRating, setStaffRating] = useState(0);
  const [locationRating, setLocationRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const {
    data: reviewDetails,
    isLoading,
    error,
  } = useQuery<ReviewDetails>({
    queryKey: ["/api/bookings", bookingId, "review-details"],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/review-details`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.code || data.message || "Failed to load review details",
        );
      }
      return res.json();
    },
    enabled: !!bookingId && isAuthenticated,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: {
      propertyId: string;
      bookingId: string;
      rating: number;
      comment?: string;
    }) => {
      return apiRequest("POST", "/api/reviews", reviewData);
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId],
      });
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Submit Review",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      setLocation(`/login?returnUrl=${returnUrl}`);
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Review Link</h2>
            <p className="text-muted-foreground mb-4">
              This review link is no longer active.
            </p>
            <Button
              onClick={() => setLocation("/my-bookings")}
              data-testid="btn-go-to-bookings"
            >
              Go to My Bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as Error).message;
    const isAlreadyReviewed = errorMessage === "ALREADY_REVIEWED";

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            {isAlreadyReviewed ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Already Reviewed</h2>
                <p className="text-muted-foreground mb-4">
                  You've already reviewed this stay.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  Cannot Write Review
                </h2>
                <p className="text-muted-foreground mb-4">
                  {errorMessage === "NOT_COMPLETED"
                    ? "You can only review completed stays."
                    : "This review link is no longer active."}
                </p>
              </>
            )}
            <Button
              onClick={() =>
                setLocation(
                  reviewDetails?.property?.id
                    ? `/properties/${reviewDetails.property.id}`
                    : "/my-bookings",
                )
              }
              data-testid="btn-view-property"
            >
              {isAlreadyReviewed ? "View Property" : "Go to My Bookings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-4">
              Your review has been submitted successfully.
            </p>
            <Button
              onClick={() => setLocation(`/properties/${propertyId}`)}
              data-testid="btn-view-property-after"
            >
              View Property
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (overallRating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide an overall rating.",
        variant: "destructive",
      });
      return;
    }

    submitReviewMutation.mutate({
      propertyId: reviewDetails!.property.id,
      bookingId: reviewDetails!.booking.id,
      rating: overallRating,
      comment: comment.trim() || undefined,
    });
  };

  const propertyImage = reviewDetails?.property.images?.[0] || "";
  const checkInFormatted = reviewDetails?.booking.checkIn
    ? new Date(reviewDetails.booking.checkIn).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const checkOutFormatted = reviewDetails?.booking.checkOut
    ? new Date(reviewDetails.booking.checkOut).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation("/my-bookings")}
          className="mb-6"
          data-testid="btn-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Bookings
        </Button>

        <Card>
          <CardHeader>
            <div className="flex gap-4 items-start">
              {propertyImage && (
                <img
                  src={propertyImage}
                  alt={reviewDetails?.property.title}
                  className="w-20 h-20 object-cover rounded-md"
                />
              )}
              <div>
                <CardTitle
                  className="text-xl"
                  data-testid="text-property-title"
                >
                  {reviewDetails?.property.title}
                </CardTitle>
                <CardDescription>
                  {reviewDetails?.property.destination}
                  <br />
                  {checkInFormatted} - {checkOutFormatted}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">
                    Overall Rating *
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    How would you rate your overall experience?
                  </p>
                  <StarRating
                    rating={overallRating}
                    onRatingChange={setOverallRating}
                    size="lg"
                  />
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-medium mb-3 block">
                    Category Ratings (Optional)
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <StarRating
                      rating={cleanlinessRating}
                      onRatingChange={setCleanlinessRating}
                      label="Cleanliness"
                      size="sm"
                    />
                    <StarRating
                      rating={staffRating}
                      onRatingChange={setStaffRating}
                      label="Staff"
                      size="sm"
                    />
                    <StarRating
                      rating={locationRating}
                      onRatingChange={setLocationRating}
                      label="Location"
                      size="sm"
                    />
                    <StarRating
                      rating={valueRating}
                      onRatingChange={setValueRating}
                      label="Value for Money"
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment" className="text-base font-medium">
                  Your Review (Optional)
                </Label>
                <Textarea
                  id="comment"
                  placeholder="Share your experience with other travelers..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="resize-none"
                  data-testid="input-review-comment"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitReviewMutation.isPending || overallRating === 0}
                data-testid="btn-submit-review"
              >
                {submitReviewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
