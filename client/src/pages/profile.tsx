import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertUserPreferencesSchema } from "@shared/schema";
import { z } from "zod";

const preferencesFormSchema = insertUserPreferencesSchema.extend({
  userId: z.string(),
});

type PreferencesFormData = z.infer<typeof preferencesFormSchema>;

export default function Profile() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: preferences } = useQuery({
    queryKey: ["/api/user/preferences"],
    enabled: user?.userRole === "guest",
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      userId: user?.id || "",
      tripPurpose: preferences?.tripPurpose || "",
      budgetMin: preferences?.budgetMin || "0",
      budgetMax: preferences?.budgetMax || "1000",
      preferredPropertyTypes: preferences?.preferredPropertyTypes || [],
      preferredAmenities: preferences?.preferredAmenities || [],
    },
  });

  const preferredPropertyTypes = watch("preferredPropertyTypes") || [];

  const savePreferencesMutation = useMutation({
    mutationFn: async (data: PreferencesFormData) => {
      return await apiRequest("POST", "/api/user/preferences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Success",
        description: "Preferences saved successfully",
      });
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
        description: "Failed to save preferences",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PreferencesFormData) => {
    savePreferencesMutation.mutate({ ...data, userId: user!.id });
  };

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  const propertyTypes = [
    { value: "hotel", label: "Hotels" },
    { value: "villa", label: "Villas" },
    { value: "apartment", label: "Apartments" },
    { value: "cabin", label: "Cabins" },
    { value: "resort", label: "Resorts" },
    { value: "hostel", label: "Hostels" },
  ];

  const togglePropertyType = (type: string) => {
    const current = preferredPropertyTypes;
    if (current.includes(type)) {
      setValue("preferredPropertyTypes", current.filter(t => t !== type));
    } else {
      setValue("preferredPropertyTypes", [...current, type]);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="container px-4 md:px-6 py-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-8">Profile & Settings</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
            {user?.userRole === "guest" && (
              <TabsTrigger value="preferences" data-testid="tab-preferences">Preferences</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
                    <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{user?.firstName || user?.email}</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                    <Badge variant="secondary" className="mt-2">
                      {user?.userRole === "guest" ? "Guest" : "Property Owner"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>First name</Label>
                    <p className="text-lg">{user?.firstName || "Not provided"}</p>
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <p className="text-lg">{user?.lastName || "Not provided"}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-lg">{user?.email || "Not provided"}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-4">
                    Account information is managed through your authentication provider
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {user?.userRole === "guest" && (
            <TabsContent value="preferences" className="space-y-6">
              <form onSubmit={handleSubmit(onSubmit)}>
                <Card>
                  <CardHeader>
                    <CardTitle>Travel preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="tripPurpose">Trip purpose</Label>
                      <Select
                        value={watch("tripPurpose") || ""}
                        onValueChange={(value) => setValue("tripPurpose", value)}
                      >
                        <SelectTrigger id="tripPurpose" data-testid="select-trip-purpose">
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leisure">Leisure</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="adventure">Adventure</SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Preferred property types</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {propertyTypes.map((type) => (
                          <Button
                            key={type.value}
                            type="button"
                            variant={preferredPropertyTypes.includes(type.value) ? "default" : "outline"}
                            onClick={() => togglePropertyType(type.value)}
                            className="justify-start"
                            data-testid={`button-pref-${type.value}`}
                          >
                            {type.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="budgetMin">Budget min (USD)</Label>
                        <Input
                          id="budgetMin"
                          type="number"
                          {...register("budgetMin")}
                          step="10"
                          min="0"
                          data-testid="input-budget-min"
                        />
                      </div>
                      <div>
                        <Label htmlFor="budgetMax">Budget max (USD)</Label>
                        <Input
                          id="budgetMax"
                          type="number"
                          {...register("budgetMax")}
                          step="10"
                          min="0"
                          data-testid="input-budget-max"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={savePreferencesMutation.isPending}
                        data-testid="button-save-preferences"
                      >
                        {savePreferencesMutation.isPending ? "Saving..." : "Save preferences"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
