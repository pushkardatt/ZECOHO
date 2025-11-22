import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertPropertySchema, type Amenity } from "@shared/schema";
import { z } from "zod";
import hotelImage from "@assets/generated_images/modern_hotel_room.png";
import cabinImage from "@assets/generated_images/mountain_cabin_exterior.png";
import resortImage from "@assets/generated_images/beachfront_resort_view.png";

const formSchema = insertPropertySchema.extend({
  images: z.array(z.string()).min(1, "At least one image is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function AddProperty() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyType: "hotel",
      status: "draft",
      images: [],
      maxGuests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
    },
  });

  const propertyType = watch("propertyType");
  const images = watch("images") || [];

  const { data: amenities = [] } = useQuery<Amenity[]>({
    queryKey: ["/api/amenities"],
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/properties", {
        ...data,
        amenityIds: selectedAmenities,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property created successfully",
      });
      setLocation("/owner/properties");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createPropertyMutation.mutate(data);
  };

  const sampleImages = [hotelImage, cabinImage, resortImage];

  const addSampleImage = () => {
    const randomImage = sampleImages[Math.floor(Math.random() * sampleImages.length)];
    setValue("images", [...images, randomImage]);
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="container px-4 md:px-6 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Add new property</h1>
          <p className="text-muted-foreground">
            Step {step} of {totalSteps}
          </p>
          <div className="mt-4 flex gap-2">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Property title *</Label>
                    <Input
                      id="title"
                      {...register("title")}
                      placeholder="Beautiful villa with ocean view"
                      data-testid="input-title"
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="propertyType">Property type *</Label>
                    <Select
                      value={propertyType}
                      onValueChange={(value) => setValue("propertyType", value as any)}
                    >
                      <SelectTrigger data-testid="select-property-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="cabin">Cabin</SelectItem>
                        <SelectItem value="resort">Resort</SelectItem>
                        <SelectItem value="hostel">Hostel</SelectItem>
                        <SelectItem value="lodge">Lodge</SelectItem>
                        <SelectItem value="cottage">Cottage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="destination">Location *</Label>
                    <Input
                      id="destination"
                      {...register("destination")}
                      placeholder="Paris, France"
                      data-testid="input-destination"
                    />
                    {errors.destination && (
                      <p className="text-sm text-destructive mt-1">{errors.destination.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      {...register("description")}
                      placeholder="Describe your property..."
                      rows={5}
                      data-testid="textarea-description"
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="button" onClick={() => setStep(2)} data-testid="button-next-step">
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Property details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maxGuests">Max guests *</Label>
                      <Input
                        id="maxGuests"
                        type="number"
                        {...register("maxGuests", { valueAsNumber: true })}
                        min="1"
                        data-testid="input-max-guests"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bedrooms">Bedrooms *</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        {...register("bedrooms", { valueAsNumber: true })}
                        min="1"
                        data-testid="input-bedrooms"
                      />
                    </div>
                    <div>
                      <Label htmlFor="beds">Beds *</Label>
                      <Input
                        id="beds"
                        type="number"
                        {...register("beds", { valueAsNumber: true })}
                        min="1"
                        data-testid="input-beds"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bathrooms">Bathrooms *</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        {...register("bathrooms", { valueAsNumber: true })}
                        min="1"
                        data-testid="input-bathrooms"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pricePerNight">Price per night (USD) *</Label>
                    <Input
                      id="pricePerNight"
                      type="number"
                      {...register("pricePerNight")}
                      step="0.01"
                      min="0"
                      placeholder="100.00"
                      data-testid="input-price"
                    />
                    {errors.pricePerNight && (
                      <p className="text-sm text-destructive mt-1">{errors.pricePerNight.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="policies">House rules</Label>
                    <Textarea
                      id="policies"
                      {...register("policies")}
                      placeholder="Check-in after 3pm, No smoking, etc."
                      rows={3}
                      data-testid="textarea-policies"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select all amenities that your property offers
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {amenities.map((amenity) => (
                      <div key={amenity.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={amenity.id}
                          checked={selectedAmenities.includes(amenity.id)}
                          onCheckedChange={(checked) => {
                            setSelectedAmenities(
                              checked
                                ? [...selectedAmenities, amenity.id]
                                : selectedAmenities.filter((id) => id !== amenity.id)
                            );
                          }}
                          data-testid={`checkbox-amenity-${amenity.name.toLowerCase().replace(/\s+/g, '-')}`}
                        />
                        <label
                          htmlFor={amenity.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {amenity.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setStep(3)} data-testid="button-next-step-2">
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Photos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Property images *</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Add sample images to showcase your property
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addSampleImage}
                      className="mb-4"
                      data-testid="button-add-image"
                    >
                      Add sample image
                    </Button>
                    
                    {images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {images.map((img, idx) => (
                          <div key={idx} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                            <img src={img} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => setValue("images", images.filter((_, i) => i !== idx))}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors.images && (
                      <p className="text-sm text-destructive mt-1">{errors.images.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Publish</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={watch("status")}
                      onValueChange={(value) => setValue("status", value as any)}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Save as draft</SelectItem>
                        <SelectItem value="published">Publish now</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPropertyMutation.isPending}
                  data-testid="button-submit-property"
                >
                  {createPropertyMutation.isPending ? "Creating..." : "Create property"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
