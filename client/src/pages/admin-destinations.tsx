import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Plus, Pencil, Trash2, Sparkles, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Destination } from "@shared/schema";

const destinationFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  shortDescription: z.string().min(10, "Short description must be at least 10 characters"),
  detailedInsight: z.string().optional(),
  highlights: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL"),
  bestSeason: z.string().optional(),
  isFeatured: z.boolean().default(false),
});

type DestinationFormValues = z.infer<typeof destinationFormSchema>;

export default function AdminDestinations() {
  const { user, isAdmin, isOwner } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [destinationToDelete, setDestinationToDelete] = useState<string | null>(null);

  // Check if user is owner or admin (either role can manage destinations)
  if (!isAdmin && !isOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You need admin or owner privileges to manage destinations.
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { data: destinations = [], isLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const form = useForm<DestinationFormValues>({
    resolver: zodResolver(destinationFormSchema),
    defaultValues: {
      name: "",
      state: "",
      shortDescription: "",
      detailedInsight: "",
      highlights: "",
      imageUrl: "",
      bestSeason: "",
      isFeatured: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DestinationFormValues) => {
      const payload = {
        ...data,
        highlights: data.highlights ? data.highlights.split("\n").filter(Boolean) : [],
      };
      return apiRequest("POST", "/api/destinations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/destinations/featured"] });
      toast({ title: "Success", description: "Destination created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DestinationFormValues & { id: string }) => {
      const { id, ...rest } = data;
      const payload = {
        ...rest,
        highlights: rest.highlights ? rest.highlights.split("\n").filter(Boolean) : [],
      };
      return apiRequest("PATCH", `/api/destinations/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/destinations/featured"] });
      toast({ title: "Success", description: "Destination updated successfully" });
      setIsDialogOpen(false);
      setEditingDestination(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/destinations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/destinations/featured"] });
      toast({ title: "Success", description: "Destination deleted successfully" });
      setDeleteDialogOpen(false);
      setDestinationToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (destination?: Destination) => {
    if (destination) {
      setEditingDestination(destination);
      form.reset({
        name: destination.name,
        state: destination.state,
        shortDescription: destination.shortDescription,
        detailedInsight: destination.detailedInsight || "",
        highlights: destination.highlights?.join("\n") || "",
        imageUrl: destination.imageUrl,
        bestSeason: destination.bestSeason || "",
        isFeatured: destination.isFeatured,
      });
    } else {
      setEditingDestination(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDestination(null);
    form.reset();
  };

  const handleSubmit = (data: DestinationFormValues) => {
    if (editingDestination) {
      updateMutation.mutate({ ...data, id: editingDestination.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    setDestinationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (destinationToDelete) {
      deleteMutation.mutate(destinationToDelete);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container px-4 md:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">Manage Destinations</h1>
              <p className="text-muted-foreground">
                Add, edit, and feature destinations across India
              </p>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              data-testid="button-add-destination"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Destination
            </Button>
          </div>
        </div>
      </div>

      {/* Destinations Grid */}
      <div className="container px-4 md:px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-[16/9]" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : destinations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((destination) => (
              <Card key={destination.id} data-testid={`card-destination-${destination.id}`}>
                <div
                  className="h-48 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${destination.imageUrl})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute top-3 right-3">
                    {destination.isFeatured && (
                      <Badge variant="secondary" className="bg-yellow-500/90 text-white border-0">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {destination.name}
                    </h3>
                    <div className="flex items-center gap-1 text-white/90 text-sm">
                      <MapPin className="h-3 w-3" />
                      <span>{destination.state}</span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {destination.shortDescription}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(destination)}
                      data-testid={`button-edit-${destination.id}`}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(destination.id)}
                      data-testid={`button-delete-${destination.id}`}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground mb-6">
              No destinations yet. Add your first destination to get started!
            </p>
            <Button onClick={() => handleOpenDialog()} data-testid="button-add-first">
              <Plus className="h-4 w-4 mr-2" />
              Add Destination
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDestination ? "Edit Destination" : "Add New Destination"}
            </DialogTitle>
            <DialogDescription>
              {editingDestination
                ? "Update the destination details below."
                : "Add a new destination to showcase on the platform."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Goa" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Goa" {...field} data-testid="input-state" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of the destination..."
                        {...field}
                        data-testid="input-short-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="detailedInsight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Insight (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="More detailed information about the destination..."
                        {...field}
                        data-testid="input-detailed-insight"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="highlights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Highlights (Optional, one per line)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Beautiful beaches&#10;Water sports&#10;Vibrant nightlife"
                        {...field}
                        data-testid="input-highlights"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://images.unsplash.com/..."
                        {...field}
                        data-testid="input-image-url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bestSeason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Best Season to Visit (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., October to March"
                        {...field}
                        data-testid="input-best-season"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Featured Destination</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Show this destination on the homepage
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-featured"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingDestination
                    ? "Update Destination"
                    : "Add Destination"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Destination</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this destination? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
