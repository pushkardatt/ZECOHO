import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Logo } from "@/components/Logo";
import { CheckCircle, Clock, MapPin, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const waitlistSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  message: z.string().optional(),
});

type WaitlistForm = z.infer<typeof waitlistSchema>;

export default function ComingSoon() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<WaitlistForm>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: WaitlistForm) =>
      apiRequest("POST", "/api/waitlist", data),
    onSuccess: async (res) => {
      const body = await res.json();
      setSubmitted(true);
      toast({ title: "You're on the list!", description: body.message });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 pointer-events-none" />

        <div className="relative z-10 w-full max-w-lg mx-auto px-6 py-16 flex flex-col items-center text-center gap-6">
          {/* Logo */}
          <div className="mb-2">
            <Logo />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
            <Clock className="h-3.5 w-3.5" />
            Coming Soon
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Zero commissions.
            <br />
            <span className="text-primary">Direct stays.</span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-md">
            ZECOHO is launching soon — a hotel booking platform that passes 100%
            of savings directly to you. No hidden fees. No intermediaries.
          </p>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground my-2">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-primary" />
              Zero commission
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              India-wide properties
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-primary" />
              Direct with hoteliers
            </div>
          </div>

          {/* Form card */}
          <div className="w-full bg-card border rounded-xl p-6 shadow-sm mt-2">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold">You're on the list!</h3>
                <p className="text-muted-foreground text-sm text-center">
                  We'll reach out as soon as we launch. Stay tuned!
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-1 text-left">
                  Get early access
                </h2>
                <p className="text-sm text-muted-foreground mb-5 text-left">
                  Be the first to know when we go live.
                </p>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your name"
                              data-testid="input-waitlist-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              data-testid="input-waitlist-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+91 98765 43210"
                              data-testid="input-waitlist-phone"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message (optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any questions or thoughts?"
                              className="resize-none"
                              rows={3}
                              data-testid="textarea-waitlist-message"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={mutation.isPending}
                      data-testid="button-waitlist-submit"
                    >
                      {mutation.isPending
                        ? "Submitting..."
                        : "Notify Me at Launch"}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </div>

          {/* Existing user login prompt */}
          <div className="w-full bg-muted/40 border rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-left">
              <p className="font-medium text-foreground">
                Already have an account?
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Existing members can log in to access the platform.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/login?returnTo=/home";
              }}
              data-testid="button-coming-soon-login"
            >
              Log In
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4 px-4">
        &copy; {new Date().getFullYear()} ZECOHO. All rights reserved.
      </div>
    </div>
  );
}
