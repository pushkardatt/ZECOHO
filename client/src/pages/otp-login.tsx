import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Mail, Phone, ArrowLeft, Loader2, Shield } from "lucide-react";

type LoginStep = "input" | "otp";
type LoginMethod = "email" | "phone";

export default function OtpLogin() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(search);
  const initialMethod = urlParams.get("method") === "phone" ? "phone" : "email";

  const [step, setStep] = useState<LoginStep>("input");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(initialMethod);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const getContact = () => (loginMethod === "email" ? email : phone);

  const sendOtpMutation = useMutation({
    mutationFn: async (contact: string) => {
      const payload =
        loginMethod === "email" ? { email: contact } : { phone: contact };
      const response = await apiRequest("POST", "/api/auth/send-otp", payload);
      return response.json();
    },
    onSuccess: (data) => {
      setStep("otp");
      setCountdown(60);
      toast({
        title: "OTP Sent",
        description:
          loginMethod === "email"
            ? `We've sent a 6-digit code to ${data.email}`
            : `We've sent a 6-digit code to ${phone}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send OTP",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ contact, otp }: { contact: string; otp: string }) => {
      const payload =
        loginMethod === "email"
          ? { email: contact, otp }
          : { phone: contact, otp };
      const response = await apiRequest(
        "POST",
        "/api/auth/verify-otp",
        payload,
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to ZECOHO!",
        description: "You have successfully logged in.",
      });
      setLocation("/");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contact = getContact();
    if (!contact.trim()) return;
    sendOtpMutation.mutate(contact);
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
      verifyOtpMutation.mutate({ contact: getContact(), otp: newOtp.join("") });
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
      verifyOtpMutation.mutate({ contact: getContact(), otp: pastedData });
    }
  };

  const handleResendOtp = () => {
    if (countdown > 0) return;
    sendOtpMutation.mutate(getContact());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      <Card className="w-full max-w-md" data-testid="card-otp-login">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {step === "input" ? (
                loginMethod === "email" ? (
                  <Mail className="h-8 w-8 text-primary" />
                ) : (
                  <Phone className="h-8 w-8 text-primary" />
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
              ? loginMethod === "email"
                ? "Enter your email to receive a one-time password"
                : "Enter your phone number to receive a one-time password"
              : `We've sent a 6-digit code to ${loginMethod === "email" ? email : phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "input" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={loginMethod === "email" ? "default" : "outline"}
                  onClick={() => setLoginMethod("email")}
                  className="flex-1"
                  data-testid="button-method-email"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={loginMethod === "phone" ? "default" : "outline"}
                  onClick={() => setLoginMethod("phone")}
                  className="flex-1"
                  data-testid="button-method-phone"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Phone
                </Button>
              </div>

              {loginMethod === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    data-testid="input-email"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoFocus
                    data-testid="input-phone"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={sendOtpMutation.isPending || !getContact().trim()}
                data-testid="button-send-otp"
              >
                {sendOtpMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    {loginMethod === "email" ? (
                      <Mail className="h-4 w-4 mr-2" />
                    ) : (
                      <Phone className="h-4 w-4 mr-2" />
                    )}
                    Send OTP
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <Button
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
                  }}
                  data-testid="button-change-contact"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change {loginMethod === "email" ? "Email" : "Phone"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
