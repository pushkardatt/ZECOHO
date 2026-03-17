import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { User, Phone, Mail, FileText } from "lucide-react";

const guestDetailsSchema = z.object({
  guestName: z.string().min(2, "Full name must be at least 2 characters"),
  guestMobile: z
    .string()
    .min(10, "Enter a valid 10-digit mobile number")
    .max(15),
  guestEmail: z.string().email("Enter a valid email address"),
  hasGst: z.boolean().default(false),
  gstNumber: z.string().optional(),
  specialRequests: z.string().optional(),
  adults: z.number().int().min(1),
  childrenCount: z.number().int().min(0),
});

export type GuestDetailsFormData = z.infer<typeof guestDetailsSchema>;

interface GuestDetailsFormProps {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  adults: number;
  children: number;
  onValidChange: (isValid: boolean, data: GuestDetailsFormData | null) => void;
}

export function GuestDetailsForm({
  user,
  adults,
  children,
  onValidChange,
}: GuestDetailsFormProps) {
  const [showGst, setShowGst] = useState(false);

  const form = useForm<GuestDetailsFormData>({
    resolver: zodResolver(guestDetailsSchema),
    defaultValues: {
      guestName:
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "",
      guestMobile: user?.phone?.replace(/^\+91\s?/, "") || "",
      guestEmail: user?.email || "",
      hasGst: false,
      gstNumber: "",
      specialRequests: "",
      adults: adults,
      childrenCount: children,
    },
    mode: "all",
  });

  useEffect(() => {
    form.setValue("adults", adults);
    form.setValue("childrenCount", children);
  }, [adults, children, form]);

  useEffect(() => {
    form.trigger(); // validate prefilled values on mount
    const subscription = form.watch(() => {
      const isValid = form.formState.isValid;
      if (isValid) {
        const values = form.getValues();
        onValidChange(true, values);
      } else {
        onValidChange(false, null);
      }
    });
    const isValid = form.formState.isValid;
    if (isValid) {
      onValidChange(true, form.getValues());
    }
    return () => subscription.unsubscribe();
  }, [form, onValidChange]);

  return (
    <Card className="p-4 space-y-4">
      <h3
        className="text-base font-semibold"
        data-testid="text-guest-details-title"
      >
        Traveller Details
      </h3>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="guestName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">
                  Full Name *
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...field}
                      placeholder="Enter your full name"
                      className="pl-10"
                      data-testid="input-guest-name"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestMobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">
                  Mobile Number *
                </FormLabel>
                <FormControl>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      +91
                    </span>
                    <Input
                      {...field}
                      placeholder="Enter mobile number"
                      className="pl-[4.5rem]"
                      type="tel"
                      maxLength={10}
                      data-testid="input-guest-mobile"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">
                  Email Address *
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...field}
                      placeholder="Enter email address"
                      className="pl-10"
                      type="email"
                      data-testid="input-guest-email"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="hasGst"
              checked={showGst}
              onCheckedChange={(checked) => {
                setShowGst(!!checked);
                form.setValue("hasGst", !!checked);
                if (!checked) {
                  form.setValue("gstNumber", "");
                }
              }}
              data-testid="checkbox-gst"
            />
            <Label htmlFor="hasGst" className="text-sm cursor-pointer">
              I have a GST number
            </Label>
          </div>

          {showGst && (
            <FormField
              control={form.control}
              name="gstNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">
                    GST Number
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="Enter GST number (e.g., 22AAAAA0000A1Z5)"
                        className="pl-10"
                        maxLength={15}
                        data-testid="input-gst-number"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="specialRequests"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">
                  Special Requests (optional)
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Any special requests? (e.g., early check-in, extra bed, dietary requirements)"
                    className="resize-none text-sm"
                    rows={3}
                    data-testid="input-special-requests"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4 text-sm text-muted-foreground">
            <span data-testid="text-guest-adults">
              {adults} Adult{adults !== 1 ? "s" : ""}
            </span>
            <span data-testid="text-guest-children">
              {children} Child{children !== 1 ? "ren" : ""}
            </span>
          </div>
        </form>
      </Form>
    </Card>
  );
}
