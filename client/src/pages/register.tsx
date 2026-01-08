import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserPlus, ArrowLeft, Loader2, Shield, Eye, EyeOff, Mail } from "lucide-react";

type RegisterStep = "form" | "otp";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<RegisterStep>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [allPoliciesAccepted, setAllPoliciesAccepted] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const registerMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; password: string; termsAccepted: boolean; privacyAccepted: boolean; consentCommunication: boolean }) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      setStep("otp");
      setCountdown(60);
      toast({
        title: "Verification Required",
        description: `We've sent a 6-digit code to ${data.email}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const response = await apiRequest("POST", "/api/auth/register/verify", { email, otp });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome to ZECOHO!",
        description: "Your account has been created successfully.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      });
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/send-otp", { email });
      return response.json();
    },
    onSuccess: () => {
      setCountdown(60);
      toast({
        title: "OTP Sent",
        description: `We've sent a new code to ${email}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend OTP",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    if (!allPoliciesAccepted) {
      toast({
        title: "Acceptance Required",
        description: "Please accept all policies and communications to continue",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({ 
      firstName: firstName.trim(), 
      lastName: lastName.trim(), 
      email: email.trim(), 
      password,
      termsAccepted: true,
      privacyAccepted: true,
      consentCommunication: true
    });
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit) && newOtp.join("").length === 6) {
      verifyOtpMutation.mutate({ email, otp: newOtp.join("") });
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      verifyOtpMutation.mutate({ email, otp: pastedData });
    }
  };

  const handleResendOtp = () => {
    if (countdown > 0) return;
    resendOtpMutation.mutate(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      <Card className="w-full max-w-md" data-testid="card-register">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {step === "form" ? (
                <UserPlus className="h-8 w-8 text-primary" />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl">
            {step === "form" ? "Create Your Account" : "Verify Your Email"}
          </CardTitle>
          <CardDescription>
            {step === "form" 
              ? "Join ZECOHO and start booking hotels with zero commission"
              : `We've sent a 6-digit code to ${email}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoFocus
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                  <Checkbox
                    id="all-policies"
                    checked={allPoliciesAccepted}
                    onCheckedChange={(checked) => setAllPoliciesAccepted(checked === true)}
                    className="mt-0.5"
                    data-testid="checkbox-all-policies"
                  />
                  <div className="space-y-2">
                    <label 
                      htmlFor="all-policies" 
                      className="text-sm font-medium leading-tight cursor-pointer flex items-center gap-1"
                    >
                      I accept all policies and communications
                      <span className="text-destructive">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      By checking this box, you agree to:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                      <li>
                        <Link 
                          href="/terms" 
                          className="text-primary hover:underline"
                          target="_blank"
                          data-testid="link-terms"
                        >
                          Terms & Conditions
                        </Link>
                        {" "}- governing the use of ZECOHO
                      </li>
                      <li>
                        <Link 
                          href="/privacy" 
                          className="text-primary hover:underline"
                          target="_blank"
                          data-testid="link-privacy"
                        >
                          Privacy Policy
                        </Link>
                        {" "}- how we collect and protect your data
                      </li>
                      <li>
                        Promotional communications - receive updates, offers, and travel tips
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      You can unsubscribe from promotional emails anytime.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={registerMutation.isPending || !allPoliciesAccepted}
                data-testid="button-register"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
              
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium" data-testid="link-login">
                    Sign in
                  </Link>
                </p>
              </div>

              <div className="text-center">
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
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
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
                    disabled={verifyOtpMutation.isPending}
                    autoFocus={index === 0}
                    data-testid={`input-otp-${index}`}
                  />
                ))}
              </div>

              {verifyOtpMutation.isPending && (
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
                      disabled={resendOtpMutation.isPending}
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
                    setStep("form");
                    setOtp(["", "", "", "", "", ""]);
                  }}
                  data-testid="button-change-email"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change Email
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
