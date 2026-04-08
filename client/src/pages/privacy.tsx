import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Policy } from "@shared/schema";
import { Helmet } from "react-helmet-async";

const DEFAULT_PRIVACY_CONTENT = `1. Introduction

ZECOHO ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.

2. Information We Collect

Personal Information:
• Name, email address, and phone number
• Profile photo (optional)
• KYC documents for property owners (government ID, address proof)
• Payment information (processed securely by payment partners)

Usage Information:
• Search history and preferences
• Booking history and communications
• Device information and IP address
• Browser type and operating system

3. How We Use Your Information

We use your information to:
• Provide and maintain our Platform
• Process bookings and facilitate communication
• Verify property owner identity (KYC)
• Send booking confirmations and updates
• Improve our services and user experience
• Detect and prevent fraud
• Comply with legal obligations

4. Communication Preferences

With your consent, we may send you:
• Promotional emails about new features and offers
• Newsletter updates about travel and hospitality
• SMS notifications for booking updates

You can opt out of marketing communications at any time through your account settings or by contacting us.

5. Information Sharing

We share your information only in the following circumstances:
• With Property Owners/Guests: To facilitate bookings and communication
• Service Providers: Third parties who help us operate the Platform (hosting, email, analytics)
• Legal Requirements: When required by law or to protect our rights
• Business Transfers: In connection with any merger or acquisition

We do not sell your personal information to third parties.

6. Data Security

We implement appropriate security measures to protect your information, including:
• Encryption of sensitive data in transit and at rest
• Secure authentication mechanisms
• Regular security audits and updates
• Access controls and monitoring

7. Data Retention

We retain your information for as long as your account is active or as needed to provide services. After account deletion, we may retain certain information for legal compliance, dispute resolution, or fraud prevention.

8. Your Rights

You have the right to:
• Access your personal information
• Correct inaccurate data
• Request deletion of your data
• Object to processing of your data
• Download your data in a portable format
• Withdraw consent at any time

To exercise these rights, please contact us at privacy@zecoho.com.

9. Cookies and Tracking

We use cookies and similar technologies to:
• Keep you logged in
• Remember your preferences
• Analyze Platform usage
• Improve performance

You can control cookies through your browser settings.

10. Children's Privacy

Our Platform is not intended for children under 18. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.

11. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.

12. Contact Us

If you have questions about this Privacy Policy, please contact us:
Email: privacy@zecoho.com
Support: support@zecoho.com`;

export default function Privacy() {
  const { data: policy, isLoading } = useQuery<Policy>({
    queryKey: ["/api/policies/privacy"],
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

      if (paragraph.trim().endsWith(":") && paragraph.length < 60) {
        return (
          <h3 key={index} className="text-lg font-medium mt-4 mb-2">
            {paragraph}
          </h3>
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
        <title>Privacy Policy | ZECOHO</title>
        <meta
          name="description"
          content="ZECOHO's privacy policy. Learn how we collect, use, and protect your personal data on India's zero commission hotel booking platform."
        />
        <link rel="canonical" href="https://www.zecoho.com/privacy" />
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
              data-testid="text-privacy-title"
            >
              {policy?.title || "Privacy Policy"}
            </h1>
            <p className="text-muted-foreground mb-6">
              Last updated: {formatDate(policy?.publishedAt || null)}
              {policy?.version && (
                <span className="ml-2">(Version {policy.version})</span>
              )}
            </p>

            <div className="space-y-1">
              {formatContent(policy?.content || DEFAULT_PRIVACY_CONTENT)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
