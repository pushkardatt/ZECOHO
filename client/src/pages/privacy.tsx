import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl px-4 py-8 md:py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-6" data-testid="text-privacy-title">Privacy Policy</h1>
          <p className="text-muted-foreground mb-6">Last updated: January 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p>ZECOHO ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name, email address, and phone number</li>
              <li>Profile photo (optional)</li>
              <li>KYC documents for property owners (government ID, address proof)</li>
              <li>Payment information (processed securely by payment partners)</li>
            </ul>
            
            <h3 className="text-lg font-medium mt-4 mb-2">Usage Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Search history and preferences</li>
              <li>Booking history and communications</li>
              <li>Device information and IP address</li>
              <li>Browser type and operating system</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Provide and maintain our Platform</li>
              <li>Process bookings and facilitate communication</li>
              <li>Verify property owner identity (KYC)</li>
              <li>Send booking confirmations and updates</li>
              <li>Improve our services and user experience</li>
              <li>Detect and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Communication Preferences</h2>
            <p>With your consent, we may send you:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Promotional emails about new features and offers</li>
              <li>Newsletter updates about travel and hospitality</li>
              <li>SMS notifications for booking updates</li>
            </ul>
            <p className="mt-4">You can opt out of marketing communications at any time through your account settings or by contacting us.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Information Sharing</h2>
            <p>We share your information only in the following circumstances:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>With Property Owners/Guests:</strong> To facilitate bookings and communication</li>
              <li><strong>Service Providers:</strong> Third parties who help us operate the Platform (hosting, email, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with any merger or acquisition</li>
            </ul>
            <p className="mt-4">We do not sell your personal information to third parties.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Data Security</h2>
            <p>We implement appropriate security measures to protect your information, including:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Encryption of sensitive data in transit and at rest</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and monitoring</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
            <p>We retain your information for as long as your account is active or as needed to provide services. After account deletion, we may retain certain information for legal compliance, dispute resolution, or fraud prevention.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Download your data in a portable format</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-4">To exercise these rights, please contact us at privacy@zecoho.com.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze Platform usage</li>
              <li>Improve performance</li>
            </ul>
            <p className="mt-4">You can control cookies through your browser settings.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Children's Privacy</h2>
            <p>Our Platform is not intended for children under 18. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us:</p>
            <ul className="list-none mt-4 space-y-2">
              <li>Email: privacy@zecoho.com</li>
              <li>Support: support@zecoho.com</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
