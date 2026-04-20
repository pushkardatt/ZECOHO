import { useState, useRef, useEffect } from "react";
import { useLocation, Link, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Mail,
  Lock,
  ArrowLeft,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  UserPlus,
} from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

type LoginStep = "input" | "otp";
type LoginMethod = "password" | "otp";

// Password login is disabled in development to allow OIDC testing
const isDevMode = import.meta.env.MODE === "development";

// Google Sign-in handler (outside component for cleanliness)
async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  const response = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Google sign-in failed");
  }
  return response.json();
}
export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(search);
  // In development, always default to OTP; in production, respect URL param
  const initialMethod = isDevMode
    ? "otp"
    : urlParams.get("method") === "otp"
      ? "otp"
      : "password";
  const returnTo = urlParams.get("returnTo") || "/";

  const [step, setStep] = useState<LoginStep>("input");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(initialMethod);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [showNotRegisteredDialog, setShowNotRegisteredDialog] = useState(false);
  const [unregisteredEmail, setUnregisteredEmail] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const passwordLoginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await fetch("/api/auth/login/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const result = await response.json();

      if (response.status === 403 && result.requiresVerification) {
        return { requiresVerification: true, email: result.email };
      }

      if (!response.ok) {
        const err = new Error(result.message || "Invalid email or password");
        (err as any).userNotFound = !!result.userNotFound;
        throw err;
      }

      return result;
    },
    onSuccess: (data) => {
      if (data.requiresVerification) {
        setPendingVerificationEmail(data.email);
        setStep("otp");
        setCountdown(60);
        toast({
          title: "Email Not Verified",
          description: `We've sent a verification code to ${data.email}`,
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        let attempts = 0;
        const checkAuth = async () => {
          attempts++;
          try {
            const resp = await fetch("/api/auth/user", {
              credentials: "include",
            });
            if (resp.ok) {
              window.location.href = "/";
            } else if (attempts < 10) {
              setTimeout(checkAuth, 500);
            } else {
              window.location.href = "/";
            }
          } catch {
            window.location.href = "/";
          }
        };
        setTimeout(checkAuth, 300);
      }
    },
    onError: (error: any) => {
      if (error.userNotFound) {
        setUnregisteredEmail(email.trim());
        setShowNotRegisteredDialog(true);
        return;
      }
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (emailAddr: string) => {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddr }),
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) {
        const err = new Error(result.message || "Please try again");
        (err as any).userNotFound = !!result.userNotFound;
        throw err;
      }
      return result;
    },
    onSuccess: (data) => {
      setStep("otp");
      setCountdown(60);
      toast({
        title: "OTP Sent",
        description: `We've sent a 6-digit code to ${data.email}`,
      });
    },
    onError: (error: any) => {
      if (error.userNotFound) {
        setUnregisteredEmail(email.trim());
        setShowNotRegisteredDialog(true);
        return;
      }
      toast({
        title: "Failed to send OTP",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-otp", {
        email,
        otp,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to ZECOHO!",
        description: "You have successfully logged in.",
      });
      // Poll until session is confirmed active before redirecting
      let attempts = 0;
      const checkAuth = async () => {
        attempts++;
        try {
          const resp = await fetch("/api/auth/user", {
            credentials: "include",
          });
          if (resp.ok) {
            // Session confirmed — safe to redirect
            window.location.href = "/";
          } else if (attempts < 8) {
            // Session not ready yet — retry
            setTimeout(checkAuth, 500);
          } else {
            // Max retries — redirect anyway
            window.location.href = "/";
          }
        } catch {
          window.location.href = "/";
        }
      };
      setTimeout(checkAuth, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      });
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    },
  });

  const verifyRegistrationOtpMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const response = await apiRequest("POST", "/api/auth/register/verify", {
        email,
        otp,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to ZECOHO!",
        description: "Your email has been verified.",
      });
      let attempts = 0;
      const checkAuth = async () => {
        attempts++;
        try {
          const resp = await fetch("/api/auth/user", {
            credentials: "include",
          });
          if (resp.ok) {
            window.location.href = "/";
          } else if (attempts < 8) {
            setTimeout(checkAuth, 500);
          } else {
            window.location.href = "/";
          }
        } catch {
          window.location.href = "/";
        }
      };
      setTimeout(checkAuth, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      });
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    passwordLoginMutation.mutate({ email: email.trim(), password });
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    sendOtpMutation.mutate(email.trim());
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit) && newOtp.join("").length === 6) {
      const targetEmail = pendingVerificationEmail || email;
      if (pendingVerificationEmail) {
        verifyRegistrationOtpMutation.mutate({
          email: targetEmail,
          otp: newOtp.join(""),
        });
      } else {
        verifyOtpMutation.mutate({ email: targetEmail, otp: newOtp.join("") });
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      const targetEmail = pendingVerificationEmail || email;
      if (pendingVerificationEmail) {
        verifyRegistrationOtpMutation.mutate({
          email: targetEmail,
          otp: pastedData,
        });
      } else {
        verifyOtpMutation.mutate({ email: targetEmail, otp: pastedData });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Welcome to ZECOHO!",
        description: "Signed in with Google.",
      });
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Google Sign-in Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };
  const handleResendOtp = () => {
    if (countdown > 0) return;
    const targetEmail = pendingVerificationEmail || email;
    sendOtpMutation.mutate(targetEmail);
  };

  const isVerifyingPending =
    verifyOtpMutation.isPending || verifyRegistrationOtpMutation.isPending;

  return (
    <>
      {/* Not-registered email dialog */}
      <Dialog
        open={showNotRegisteredDialog}
        onOpenChange={setShowNotRegisteredDialog}
      >
        <DialogContent data-testid="dialog-not-registered">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Email Not Registered
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-1">
              <span className="font-medium text-foreground">
                {unregisteredEmail}
              </span>{" "}
              is not linked to any ZECOHO account.
              <br />
              <br />
              Create an account to access the platform and start booking stays.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowNotRegisteredDialog(false)}
              data-testid="button-not-registered-cancel"
            >
              Try another email
            </Button>
            <Button
              onClick={() => {
                setShowNotRegisteredDialog(false);
                setLocation("/register");
              }}
              data-testid="button-not-registered-create"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
        <Card className="w-full max-w-md" data-testid="card-login">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {step === "input" ? (
                  loginMethod === "password" ? (
                    <Lock className="h-8 w-8 text-primary" />
                  ) : (
                    <Mail className="h-8 w-8 text-primary" />
                  )
                ) : (
                  <Shield className="h-8 w-8 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {step === "input" ? "Login to ZECOHO" : "Enter Verification Code"}
            </CardTitle>
            <CardDescription>
              {step === "input"
                ? "Choose your preferred login method"
                : `We've sent a 6-digit code to ${pendingVerificationEmail || email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "input" ? (
              <Tabs
                value={loginMethod}
                onValueChange={(v) => setLoginMethod(v as LoginMethod)}
                className="w-full"
              >
                {!isDevMode && (
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="password" data-testid="tab-password">
                      <Lock className="h-4 w-4 mr-2" />
                      Password
                    </TabsTrigger>
                    <TabsTrigger value="otp" data-testid="tab-otp">
                      <Mail className="h-4 w-4 mr-2" />
                      OTP
                    </TabsTrigger>
                  </TabsList>
                )}

                <TabsContent value="password">
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-password">Email Address</Label>
                      <Input
                        id="email-password"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        data-testid="input-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pr-10"
                          data-testid="input-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        passwordLoginMutation.isPending ||
                        !email.trim() ||
                        !password
                      }
                      data-testid="button-login"
                    >
                      {passwordLoginMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>

                    <div className="text-center">
                      <Link
                        href="/forgot-password"
                        className="text-sm text-muted-foreground hover:text-primary hover:underline"
                        data-testid="link-forgot-password"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="otp">
                  <form onSubmit={handleOtpSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-otp">Email Address</Label>
                      <Input
                        id="email-otp"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        data-testid="input-email-otp"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={sendOtpMutation.isPending || !email.trim()}
                      data-testid="button-send-otp"
                    >
                      {sendOtpMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send OTP
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                {/* Google Sign-in */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4 gap-2"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                </div>

                <div className="mt-6 text-center space-y-4">
                  <p className="text-xs text-muted-foreground px-2 leading-relaxed">
                    By proceeding, you agree to ZECOHO's{" "}
                    <a
                      href="/terms"
                      className="text-primary underline hover:no-underline"
                    >
                      Terms & Conditions
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      className="text-primary underline hover:no-underline"
                    >
                      Privacy Policy
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link
                      href="/register"
                      className="text-primary hover:underline font-medium"
                      data-testid="link-register"
                    >
                      Create one
                    </Link>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setLocation("/")}
                    data-testid="button-back-home"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </div>
              </Tabs>
            ) : (
              <div className="space-y-6">
                <div
                  className="flex justify-center gap-2"
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold"
                      disabled={isVerifyingPending}
                      autoFocus={index === 0}
                      data-testid={`input-otp-${index}`}
                    />
                  ))}
                </div>

                {isVerifyingPending && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </div>
                )}

                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the code?{" "}
                    {countdown > 0 ? (
                      <span>Resend in {countdown}s</span>
                    ) : (
                      <button
                        onClick={handleResendOtp}
                        disabled={sendOtpMutation.isPending}
                        className="text-primary hover:underline font-medium"
                        data-testid="button-resend-otp"
                      >
                        Resend OTP
                      </button>
                    )}
                  </p>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep("input");
                      setOtp(["", "", "", "", "", ""]);
                      setPendingVerificationEmail("");
                    }}
                    data-testid="button-change-email"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                  <p className="text-xs text-center text-muted-foreground px-2 mt-2 leading-relaxed">
                    By proceeding, you agree to ZECOHO's{" "}
                    <a
                      href="/terms"
                      className="text-primary underline hover:no-underline"
                    >
                      Terms & Conditions
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      className="text-primary underline hover:no-underline"
                    >
                      Privacy Policy
                    </a>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
