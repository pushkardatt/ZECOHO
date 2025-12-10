import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, MapPin, Calendar, Users, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { SearchHistory } from "@shared/schema";
import { format } from "date-fns";

export default function SearchHistoryPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSearchAgain = (search: SearchHistory) => {
    const params = new URLSearchParams();
    params.set("destination", search.destination);
    if (search.checkIn) params.set("checkIn", format(new Date(search.checkIn), "yyyy-MM-dd"));
    if (search.checkOut) params.set("checkOut", format(new Date(search.checkOut), "yyyy-MM-dd"));
    if (search.guests) params.set("guests", search.guests.toString());
    setLocation(`/search?${params.toString()}`);
  };

  // Fetch search history
  const { data: searchHistory = [], isLoading } = useQuery<SearchHistory[]>({
    queryKey: ["/api/search-history"],
  });

  // Mutation to delete search history
  const deleteHistoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/search-history/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete search history");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Search removed from history" });
      queryClient.invalidateQueries({ queryKey: ["/api/search-history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete search",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to create wishlist from search
  const createWishlistMutation = useMutation({
    mutationFn: async (searchData: SearchHistory) => {
      // For now, just show a message that this would create a wishlist
      // In a real app, this would create a saved search or a wishlist
      toast({
        title: "Wishlist feature coming soon!",
        description: `You can save searches for "${searchData.destination}" later`,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Search History</h1>
          <p className="text-muted-foreground mb-6">View and manage your recent searches</p>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Search History</h1>
        <p className="text-muted-foreground mb-6">View and manage your recent searches</p>

        {searchHistory.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No searches yet</h3>
              <p className="text-muted-foreground">Your search history will appear here when you start searching for destinations.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {searchHistory.map((search) => (
              <Card 
                key={search.id} 
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => handleSearchAgain(search)}
                data-testid={`card-search-history-${search.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">{search.destination}</CardTitle>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {search.checkIn && (
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            Check-in: {format(new Date(search.checkIn), "MMM dd, yyyy")}
                          </Badge>
                        )}
                        {search.checkOut && (
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            Check-out: {format(new Date(search.checkOut), "MMM dd, yyyy")}
                          </Badge>
                        )}
                        {search.guests && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {search.guests} {search.guests === 1 ? "Guest" : "Guests"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        onClick={() => handleSearchAgain(search)}
                        data-testid={`button-search-again-${search.id}`}
                      >
                        <Search className="h-4 w-4 mr-1" />
                        Search
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => createWishlistMutation.mutate(search)}
                        data-testid={`button-add-to-wishlist-${search.id}`}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Wishlist
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteHistoryMutation.mutate(search.id)}
                        disabled={deleteHistoryMutation.isPending}
                        data-testid={`button-delete-search-${search.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Searched {search.createdAt ? format(new Date(search.createdAt), "PPp") : "Recently"}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
