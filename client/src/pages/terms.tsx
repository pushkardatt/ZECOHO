import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Policy } from "@shared/schema";
import { Helmet } from "react-helmet-async";

const DEFAULT_TERMS_CONTENT = `1. Acceptance of Terms

By accessing and using ZECOHO (the "Platform"), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our Platform.

2. Description of Service

ZECOHO is a ZERO COMMISSION hotel booking platform that connects guests directly with property owners. Our mission is to eliminate intermediary fees and pass 100% of savings to customers.

• Browse and search for properties across India
• Make direct bookings with property owners
• Communicate directly with hosts
• List properties as a verified owner

3. User Accounts

To access certain features of the Platform, you must create an account. You agree to:

• Provide accurate and complete information during registration
• Maintain the security of your account credentials
• Notify us immediately of any unauthorized access
• Accept responsibility for all activities under your account

4. Property Listings

Property owners who list on ZECOHO agree to:

• Provide accurate property information and images
• Complete KYC verification before listing goes live
• Maintain updated availability and pricing
• Honor confirmed bookings
• Comply with all applicable laws and regulations

5. Booking Terms

When making a booking through ZECOHO:

• All bookings are subject to property owner confirmation
• Payment terms are communicated during the booking process
• Cancellation policies vary by property and are displayed before booking
• Guests must provide valid identification at check-in

6. Zero Commission Model

ZECOHO operates on a zero-commission model, meaning:

• No booking fees are charged to guests
• No commission is taken from property owners
• The price you see is the price you pay

7. User Conduct

Users agree not to:

• Use the Platform for any unlawful purpose
• Post false, misleading, or fraudulent content
• Harass, abuse, or harm other users
• Attempt to gain unauthorized access to the Platform
• Interfere with the proper functioning of the Platform

8. Intellectual Property

All content on the Platform, including text, graphics, logos, and software, is the property of ZECOHO or its licensors and is protected by intellectual property laws.

9. Limitation of Liability

ZECOHO acts as a platform connecting guests and property owners. We are not responsible for:

• The accuracy of property listings
• The conduct of property owners or guests
• Disputes between users
• Any damages arising from use of the Platform

10. Changes to Terms

We reserve the right to modify these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the modified Terms.

11. Contact Us

If you have any questions about these Terms, please contact us at:
Email: support@zecoho.com`;

export default function Terms() {
  const { data: policy, isLoading } = useQuery<Policy>({
    queryKey: ["/api/policies/terms"],
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "January 2026";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const formatContent = (content: string) => {
    return content.split("\n").map((paragraph, index) => {
      if (!paragraph.trim()) return <br key={index} />;

      if (/^\d+\./.test(paragraph.trim())) {
        return (
          <h2 key={index} className="text-xl font-semibold mt-6 mb-3">
            {paragraph}
          </h2>
        );
      }

      if (paragraph.trim().startsWith("•")) {
        return (
          <li key={index} className="ml-6">
            {paragraph.replace("•", "").trim()}
          </li>
        );
      }

      return (
        <p key={index} className="mb-2">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Terms & Conditions | ZECOHO</title>
        <meta
          name="description"
          content="Read ZECOHO's terms and conditions. Learn about our zero commission model, booking policies, and user responsibilities on India's direct hotel booking platform."
        />
        <link rel="canonical" href="https://www.zecoho.com/terms" />
      </Helmet>
      <div className="container max-w-4xl px-4 py-8 md:py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="prose dark:prose-invert max-w-none">
            <h1
              className="text-3xl font-bold mb-6"
              data-testid="text-terms-title"
            >
              {policy?.title || "Terms & Conditions"}
            </h1>
            <p className="text-muted-foreground mb-6">
              Last updated: {formatDate(policy?.publishedAt || null)}
              {policy?.version && (
                <span className="ml-2">(Version {policy.version})</span>
              )}
            </p>

            <div className="space-y-1">
              {formatContent(policy?.content || DEFAULT_TERMS_CONTENT)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
