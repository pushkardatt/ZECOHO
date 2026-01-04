import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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
          <h1 className="text-3xl font-bold mb-6" data-testid="text-terms-title">Terms & Conditions</h1>
          <p className="text-muted-foreground mb-6">Last updated: January 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using ZECOHO (the "Platform"), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our Platform.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p>ZECOHO is a ZERO COMMISSION hotel booking platform that connects guests directly with property owners. Our mission is to eliminate intermediary fees and pass 100% of savings to customers.</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Browse and search for properties across India</li>
              <li>Make direct bookings with property owners</li>
              <li>Communicate directly with hosts</li>
              <li>List properties as a verified owner</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
            <p>To access certain features of the Platform, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Property Listings</h2>
            <p>Property owners who list on ZECOHO agree to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Provide accurate property information and images</li>
              <li>Complete KYC verification before listing goes live</li>
              <li>Maintain updated availability and pricing</li>
              <li>Honor confirmed bookings</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Booking Terms</h2>
            <p>When making a booking through ZECOHO:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>All bookings are subject to property owner confirmation</li>
              <li>Payment terms are communicated during the booking process</li>
              <li>Cancellation policies vary by property and are displayed before booking</li>
              <li>Guests must provide valid identification at check-in</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Zero Commission Model</h2>
            <p>ZECOHO operates on a zero-commission model, meaning:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>No booking fees are charged to guests</li>
              <li>No commission is taken from property owners</li>
              <li>The price you see is the price you pay</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. User Conduct</h2>
            <p>Users agree not to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Use the Platform for any unlawful purpose</li>
              <li>Post false, misleading, or fraudulent content</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to the Platform</li>
              <li>Interfere with the proper functioning of the Platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Intellectual Property</h2>
            <p>All content on the Platform, including text, graphics, logos, and software, is the property of ZECOHO or its licensors and is protected by intellectual property laws.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p>ZECOHO acts as a platform connecting guests and property owners. We are not responsible for:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>The accuracy of property listings</li>
              <li>The conduct of property owners or guests</li>
              <li>Disputes between users</li>
              <li>Any damages arising from use of the Platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the modified Terms.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p className="mt-2">Email: support@zecoho.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}
