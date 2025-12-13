import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Review {
  id: string;
  rating: number;
  comment: string;
  ownerResponse?: string;
  createdAt: string;
  guest: { firstName: string; lastName: string; profileImageUrl?: string };
  property?: { title: string };
}

export default function OwnerReviews() {
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ["/api/owner/reviews"],
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-reviews">
        <div>
          <h2 className="text-2xl font-bold">Guest Reviews</h2>
          <p className="text-muted-foreground">See what guests are saying about your properties</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} data-testid={`review-card-${review.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.guest.profileImageUrl} alt={review.guest.firstName} />
                      <AvatarFallback>
                        {review.guest.firstName?.[0]}{review.guest.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" data-testid={`reviewer-name-${review.id}`}>
                          {review.guest.firstName} {review.guest.lastName}
                        </span>
                        {renderStars(review.rating)}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(review.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                      {review.property && (
                        <p className="text-sm text-muted-foreground mt-1">
                          About: {review.property.title}
                        </p>
                      )}
                      <p className="mt-2" data-testid={`review-comment-${review.id}`}>
                        {review.comment}
                      </p>
                      {review.ownerResponse && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Your response:</p>
                          <p className="text-sm">{review.ownerResponse}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No reviews yet</h3>
                <p className="mt-2 text-muted-foreground">
                  Reviews from guests will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
