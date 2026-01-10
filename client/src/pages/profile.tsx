import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { KeyRound, Eye, EyeOff, Check } from "lucide-react";

const preferencesFormSchema = insertUserPreferencesSchema.extend({
  userId: z.string(),
});

type PreferencesFormData = z.infer<typeof preferencesFormSchema>;

const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function Profile() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, isAdmin, isOwner } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

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

  const { data: passwordStatus, isLoading: passwordStatusLoading } = useQuery<{ hasPassword: boolean; email: string }>({
    queryKey: ["/api/auth/has-password"],
    enabled: isAuthenticated && !!user,
  });

  const setPasswordForm = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async (data: SetPasswordFormData) => {
      return await apiRequest("POST", "/api/auth/set-password", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/has-password"] });
      setPasswordSet(true);
      setPasswordForm.reset();
      toast({
        title: "Password set successfully",
        description: "You can now log in using your email and password.",
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
        description: error.message || "Failed to set password",
        variant: "destructive",
      });
    },
  });

  const onSetPassword = (data: SetPasswordFormData) => {
    setPasswordMutation.mutate(data);
  };

  const changePasswordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormData) => {
      return await apiRequest("POST", "/api/auth/change-password", data);
    },
    onSuccess: () => {
      setPasswordChanged(true);
      changePasswordForm.reset();
      toast({
        title: "Password changed successfully",
        description: "Your password has been updated.",
      });
      setTimeout(() => setPasswordChanged(false), 5000);
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
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const onChangePassword = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

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
      tripPurpose: "",
      budgetMin: "0",
      budgetMax: "89000",
      preferredPropertyTypes: [],
      preferredAmenities: [],
    },
  });

  const preferredPropertyTypes = watch("preferredPropertyTypes") || [];

  useEffect(() => {
    if (preferences && typeof preferences === 'object' && 'tripPurpose' in preferences) {
      setValue("tripPurpose", preferences.tripPurpose || "");
      setValue("budgetMin", preferences.budgetMin || "0");
      setValue("budgetMax", preferences.budgetMax || "89000");
      setValue("preferredPropertyTypes", preferences.preferredPropertyTypes || []);
      setValue("preferredAmenities", preferences.preferredAmenities || []);
    }
  }, [preferences, setValue]);

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
    { value: "resort", label: "Resorts" },
    { value: "hostel", label: "Hostels" },
    { value: "lodge", label: "Lodges" },
    { value: "farmhouse", label: "Farmhouses" },
    { value: "homestay", label: "Homestays" },
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
                    <div className="flex flex-wrap gap-2 mt-2">
                      {isAdmin && <Badge variant="default">Admin</Badge>}
                      {isOwner && <Badge variant="secondary">Property Owner</Badge>}
                      {!isAdmin && !isOwner && <Badge variant="outline">Guest</Badge>}
                    </div>
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

            {/* Set Password Section - Only show for OTP-only accounts */}
            {!passwordStatusLoading && passwordStatus && !passwordStatus.hasPassword && !passwordSet && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Set Password</CardTitle>
                  </div>
                  <CardDescription>
                    You logged in with OTP. Set a password to also be able to log in with your email and password.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={setPasswordForm.handleSubmit(onSetPassword)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...setPasswordForm.register("password")}
                          data-testid="input-set-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password-visibility"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {setPasswordForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {setPasswordForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          {...setPasswordForm.register("confirmPassword")}
                          data-testid="input-confirm-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          data-testid="button-toggle-confirm-password-visibility"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {setPasswordForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {setPasswordForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long.
                    </p>

                    <Button
                      type="submit"
                      disabled={setPasswordMutation.isPending}
                      data-testid="button-set-password-submit"
                    >
                      {setPasswordMutation.isPending ? "Setting Password..." : "Set Password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Change Password Section - Only show for users who have a password */}
            {!passwordStatusLoading && passwordStatus && passwordStatus.hasPassword && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Change Password</CardTitle>
                  </div>
                  <CardDescription>
                    Update your account password. You'll need to enter your current password first.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {passwordChanged ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">Password changed successfully!</p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Your password has been updated.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={changePasswordForm.handleSubmit(onChangePassword)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter your current password"
                            {...changePasswordForm.register("currentPassword")}
                            data-testid="input-current-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            data-testid="button-toggle-current-password"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        {changePasswordForm.formState.errors.currentPassword && (
                          <p className="text-sm text-destructive">
                            {changePasswordForm.formState.errors.currentPassword.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter your new password"
                            {...changePasswordForm.register("newPassword")}
                            data-testid="input-new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            data-testid="button-toggle-new-password"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        {changePasswordForm.formState.errors.newPassword && (
                          <p className="text-sm text-destructive">
                            {changePasswordForm.formState.errors.newPassword.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmNewPassword"
                            type={showConfirmNewPassword ? "text" : "password"}
                            placeholder="Confirm your new password"
                            {...changePasswordForm.register("confirmPassword")}
                            data-testid="input-confirm-new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                            data-testid="button-toggle-confirm-new-password"
                          >
                            {showConfirmNewPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        {changePasswordForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-destructive">
                            {changePasswordForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters long.
                      </p>

                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-change-password-submit"
                      >
                        {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Switch Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Want to login with a different account? You can sign in with a different email address or phone number.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = "/otp-login?method=email"}
                    data-testid="button-login-different-email"
                  >
                    Login with Different Email
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = "/otp-login?method=phone"}
                    data-testid="button-login-different-phone"
                  >
                    Login with Different Phone
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: This will sign you out of your current account.
                </p>
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
                        <Label htmlFor="budgetMin">Budget min (INR)</Label>
                        <Input
                          id="budgetMin"
                          type="number"
                          {...register("budgetMin")}
                          step="1000"
                          min="0"
                          data-testid="input-budget-min"
                        />
                      </div>
                      <div>
                        <Label htmlFor="budgetMax">Budget max (INR)</Label>
                        <Input
                          id="budgetMax"
                          type="number"
                          {...register("budgetMax")}
                          step="1000"
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
