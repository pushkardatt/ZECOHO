import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  KeyRound,
  Eye,
  EyeOff,
  Check,
  User,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  ChevronRight,
  History,
  Heart,
  Calendar,
  Bell,
  BellOff,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const preferencesFormSchema = insertUserPreferencesSchema.extend({
  userId: z.string(),
});

type PreferencesFormData = z.infer<typeof preferencesFormSchema>;

const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function Profile() {
  const { toast } = useToast();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    isAdmin,
    isOwner,
  } = useAuth();
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
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: preferences } = useQuery({
    queryKey: ["/api/user/preferences"],
    enabled: user?.userRole === "guest",
  });

  const { data: passwordStatus, isLoading: passwordStatusLoading } = useQuery<{
    hasPassword: boolean;
    email: string;
  }>({
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
          window.location.href = "/login";
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
          window.location.href = "/login";
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
    if (
      preferences &&
      typeof preferences === "object" &&
      "tripPurpose" in preferences
    ) {
      setValue("tripPurpose", preferences.tripPurpose || "");
      setValue("budgetMin", preferences.budgetMin || "0");
      setValue("budgetMax", preferences.budgetMax || "89000");
      setValue(
        "preferredPropertyTypes",
        preferences.preferredPropertyTypes || [],
      );
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
          window.location.href = "/login";
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
    return (
      (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U"
    );
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
      setValue(
        "preferredPropertyTypes",
        current.filter((t) => t !== type),
      );
    } else {
      setValue("preferredPropertyTypes", [...current, type]);
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Push notification settings
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    permission: pushPermission,
  } = usePushNotifications();

  const handleTogglePushNotifications = async () => {
    if (pushSubscribed) {
      const success = await unsubscribePush();
      if (success) {
        toast({
          title: "Notifications disabled",
          description: "You will no longer receive push notifications",
        });
      }
    } else {
      const success = await subscribePush();
      if (success) {
        toast({
          title: "Notifications enabled",
          description:
            "You will now receive push notifications for bookings and messages",
        });
      } else if (pushPermission === "denied") {
        toast({
          title: "Notifications blocked",
          description: "Please enable notifications in your browser settings",
          variant: "destructive",
        });
      }
    }
  };

  // Menu items for Airbnb-style profile menu
  const menuItems = [
    {
      icon: User,
      label: "View Profile",
      description: "See your profile details",
      onClick: () => {
        const profileSection = document.getElementById("profile-details");
        profileSection?.scrollIntoView({ behavior: "smooth" });
      },
      testId: "menu-view-profile",
    },
    {
      icon: Settings,
      label: "Account Settings",
      description: "Password and security",
      onClick: () => {
        const settingsSection = document.getElementById("account-settings");
        settingsSection?.scrollIntoView({ behavior: "smooth" });
      },
      testId: "menu-account-settings",
    },
    {
      icon: Heart,
      label: "Wishlist",
      href: "/wishlist",
      description: "Your saved properties",
      testId: "menu-wishlist",
    },
    {
      icon: Calendar,
      label: "My Bookings",
      href: "/my-bookings",
      description: "View your reservations",
      testId: "menu-bookings",
    },
    {
      icon: History,
      label: "Search History",
      href: "/search-history",
      description: "Your recent searches",
      testId: "menu-search-history",
    },
    {
      icon: HelpCircle,
      label: "Get Help",
      href: "/contact",
      description: "Contact support",
      testId: "menu-get-help",
    },
    {
      icon: Shield,
      label: "Privacy",
      href: "/privacy",
      description: "Privacy policy",
      testId: "menu-privacy",
    },
  ];

  // Notification toggle menu item - rendered separately for dynamic state
  const notificationMenuItem = pushSupported
    ? {
        icon: pushLoading ? Loader2 : pushSubscribed ? Bell : BellOff,
        label: pushSubscribed
          ? "Push Notifications On"
          : "Push Notifications Off",
        description: pushSubscribed
          ? "Tap to disable notifications"
          : "Tap to enable notifications",
        onClick: handleTogglePushNotifications,
        testId: "menu-push-notifications",
        isLoading: pushLoading,
        isActive: pushSubscribed,
      }
    : null;

  return (
    <div className="min-h-screen pb-16">
      <div className="container px-4 md:px-6 py-6 max-w-4xl mx-auto">
        {/* Profile Header - Airbnb style */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16 md:h-20 md:w-20">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              className="object-cover"
            />
            <AvatarFallback className="text-xl md:text-2xl">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-semibold">
              {user?.firstName
                ? `${user.firstName} ${user.lastName || ""}`.trim()
                : user?.email}
            </h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {isAdmin && (
                <Badge variant="default" className="text-xs">
                  Admin
                </Badge>
              )}
              {isOwner && (
                <Badge variant="secondary" className="text-xs">
                  Property Owner
                </Badge>
              )}
              {!isAdmin && !isOwner && (
                <Badge variant="outline" className="text-xs">
                  Guest
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quick Menu - Airbnb style */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="divide-y">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const content = (
                  <div className="flex items-center justify-between p-4 hover-elevate cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                );

                if (item.href) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      data-testid={item.testId}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={item.label}
                    onClick={item.onClick}
                    data-testid={item.testId}
                  >
                    {content}
                  </div>
                );
              })}

              {/* Push Notification Toggle */}
              {notificationMenuItem && (
                <div
                  className="flex items-center justify-between p-4 hover-elevate cursor-pointer"
                  onClick={
                    notificationMenuItem.isLoading
                      ? undefined
                      : notificationMenuItem.onClick
                  }
                  data-testid={notificationMenuItem.testId}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full ${notificationMenuItem.isActive ? "bg-primary/10" : "bg-muted"}`}
                    >
                      <notificationMenuItem.icon
                        className={`h-5 w-5 ${notificationMenuItem.isLoading ? "animate-spin" : ""} ${notificationMenuItem.isActive ? "text-primary" : "text-foreground"}`}
                      />
                    </div>
                    <div>
                      <p
                        className={`font-medium ${notificationMenuItem.isActive ? "text-primary" : ""}`}
                      >
                        {notificationMenuItem.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notificationMenuItem.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              {/* Logout Button */}
              <div
                className="flex items-center justify-between p-4 hover-elevate cursor-pointer"
                onClick={handleLogout}
                data-testid="menu-logout"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
                    <LogOut className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-destructive">Log out</p>
                    <p className="text-sm text-muted-foreground">
                      Sign out of your account
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details Section */}
        <div id="profile-details" className="scroll-mt-20">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" data-testid="tab-profile">
                Profile Details
              </TabsTrigger>
              {user?.userRole === "guest" && (
                <TabsTrigger value="preferences" data-testid="tab-preferences">
                  Preferences
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">
                        First name
                      </Label>
                      <p className="text-base font-medium">
                        {user?.firstName || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last name</Label>
                      <p className="text-base font-medium">
                        {user?.lastName || "Not provided"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="text-base font-medium">
                        {user?.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Settings Section */}
              <div id="account-settings" className="scroll-mt-20 space-y-6">
                {/* Set Password Section - Only show for OTP-only accounts */}
                {!passwordStatusLoading &&
                  passwordStatus &&
                  !passwordStatus.hasPassword &&
                  !passwordSet && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <KeyRound className="h-5 w-5 text-muted-foreground" />
                          <CardTitle>Set Password</CardTitle>
                        </div>
                        <CardDescription>
                          You logged in with OTP. Set a password to also be able
                          to log in with your email and password.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form
                          onSubmit={setPasswordForm.handleSubmit(onSetPassword)}
                          className="space-y-4"
                        >
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
                                {
                                  setPasswordForm.formState.errors.password
                                    .message
                                }
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                              Confirm Password
                            </Label>
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
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                                data-testid="button-toggle-confirm-password-visibility"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                            {setPasswordForm.formState.errors
                              .confirmPassword && (
                              <p className="text-sm text-destructive">
                                {
                                  setPasswordForm.formState.errors
                                    .confirmPassword.message
                                }
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
                            {setPasswordMutation.isPending
                              ? "Setting Password..."
                              : "Set Password"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                {/* Change Password Section - Only show for users who have a password */}
                {!passwordStatusLoading &&
                  passwordStatus &&
                  passwordStatus.hasPassword && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <KeyRound className="h-5 w-5 text-muted-foreground" />
                          <CardTitle>Change Password</CardTitle>
                        </div>
                        <CardDescription>
                          Update your account password. You'll need to enter
                          your current password first.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {passwordChanged ? (
                          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-200">
                                Password changed successfully!
                              </p>
                              <p className="text-sm text-green-700 dark:text-green-300">
                                Your password has been updated.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <form
                            onSubmit={changePasswordForm.handleSubmit(
                              onChangePassword,
                            )}
                            className="space-y-4"
                          >
                            <div className="space-y-2">
                              <Label htmlFor="currentPassword">
                                Current Password
                              </Label>
                              <div className="relative">
                                <Input
                                  id="currentPassword"
                                  type={
                                    showCurrentPassword ? "text" : "password"
                                  }
                                  placeholder="Enter your current password"
                                  {...changePasswordForm.register(
                                    "currentPassword",
                                  )}
                                  data-testid="input-current-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() =>
                                    setShowCurrentPassword(!showCurrentPassword)
                                  }
                                  data-testid="button-toggle-current-password"
                                >
                                  {showCurrentPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                              {changePasswordForm.formState.errors
                                .currentPassword && (
                                <p className="text-sm text-destructive">
                                  {
                                    changePasswordForm.formState.errors
                                      .currentPassword.message
                                  }
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
                                  {...changePasswordForm.register(
                                    "newPassword",
                                  )}
                                  data-testid="input-new-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() =>
                                    setShowNewPassword(!showNewPassword)
                                  }
                                  data-testid="button-toggle-new-password"
                                >
                                  {showNewPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                              {changePasswordForm.formState.errors
                                .newPassword && (
                                <p className="text-sm text-destructive">
                                  {
                                    changePasswordForm.formState.errors
                                      .newPassword.message
                                  }
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="confirmNewPassword">
                                Confirm New Password
                              </Label>
                              <div className="relative">
                                <Input
                                  id="confirmNewPassword"
                                  type={
                                    showConfirmNewPassword ? "text" : "password"
                                  }
                                  placeholder="Confirm your new password"
                                  {...changePasswordForm.register(
                                    "confirmPassword",
                                  )}
                                  data-testid="input-confirm-new-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() =>
                                    setShowConfirmNewPassword(
                                      !showConfirmNewPassword,
                                    )
                                  }
                                  data-testid="button-toggle-confirm-new-password"
                                >
                                  {showConfirmNewPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                              {changePasswordForm.formState.errors
                                .confirmPassword && (
                                <p className="text-sm text-destructive">
                                  {
                                    changePasswordForm.formState.errors
                                      .confirmPassword.message
                                  }
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
                              {changePasswordMutation.isPending
                                ? "Changing Password..."
                                : "Change Password"}
                            </Button>
                          </form>
                        )}
                      </CardContent>
                    </Card>
                  )}

              </div>
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
                          onValueChange={(value) =>
                            setValue("tripPurpose", value)
                          }
                        >
                          <SelectTrigger
                            id="tripPurpose"
                            data-testid="select-trip-purpose"
                          >
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
                              variant={
                                preferredPropertyTypes.includes(type.value)
                                  ? "default"
                                  : "outline"
                              }
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
                          {savePreferencesMutation.isPending
                            ? "Saving..."
                            : "Save preferences"}
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
    </div>
  );
}
