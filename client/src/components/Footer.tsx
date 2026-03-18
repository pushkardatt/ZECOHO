import { Mail } from "lucide-react";
import {
  SiInstagram,
  SiYoutube,
  SiFacebook,
  SiLinkedin,
  SiX,
} from "react-icons/si";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export function Footer() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.userRole === "admin";

  if (location === "/messages" || location === "/owner/messages") {
    return null;
  }

  const socialLinks = [
    {
      href: "https://www.instagram.com/bookzecoho/",
      icon: SiInstagram,
      label: "Follow us on Instagram",
      testId: "link-social-instagram",
    },
    {
      href: "https://youtube.com/@zecoho",
      icon: SiYoutube,
      label: "Subscribe to our YouTube channel",
      testId: "link-social-youtube",
    },
    {
      href: "https://www.facebook.com/profile.php?id=61582193071341",
      icon: SiFacebook,
      label: "Follow us on Facebook",
      testId: "link-social-facebook",
    },
    {
      href: "https://linkedin.com/company/zecoho",
      icon: SiLinkedin,
      label: "Connect with us on LinkedIn",
      testId: "link-social-linkedin",
    },
    {
      href: "https://x.com/zecoho",
      icon: SiX,
      label: "Follow us on X (Twitter)",
      testId: "link-social-twitter",
    },
  ];

  return (
    <footer className="border-t bg-background mt-auto mb-16 md:mb-0">
      <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6">
        {/* Desktop: 3-column layout */}
        <div className="hidden md:flex items-center justify-between py-5 gap-4">
          {/* LEFT: Email */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <a
              href="mailto:support@zecoho.com"
              className="text-primary hover:underline font-medium whitespace-nowrap"
              data-testid="link-support-email"
            >
              support@zecoho.com
            </a>
          </div>

          {/* CENTER: Policy links */}
          <div className="flex items-center gap-x-3 text-sm flex-wrap justify-center">
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
              data-testid="link-footer-terms"
            >
              Terms & Conditions
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
              data-testid="link-footer-privacy"
            >
              Privacy Policy
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <Link
              href="/about-us"
              className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
              data-testid="link-footer-about"
            >
              About Us
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
              data-testid="link-footer-contact"
            >
              Contact Us
            </Link>
            {isAdmin && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <Link
                  href="/logo-gallery"
                  className="text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                  data-testid="link-footer-logo-gallery"
                >
                  Brand Assets
                </Link>
              </>
            )}
          </div>

          {/* RIGHT: Social icons */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {socialLinks.map((social) => (
              <a
                key={social.testId}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label={social.label}
                data-testid={social.testId}
              >
                <social.icon className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
        </div>

        {/* Mobile: Stacked center-aligned layout */}
        <div className="flex flex-col items-center gap-4 py-5 md:hidden">
          {/* Email */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            <a
              href="mailto:support@zecoho.com"
              className="text-primary hover:underline font-medium"
              data-testid="link-support-email-mobile"
            >
              support@zecoho.com
            </a>
          </div>

          {/* Policy links stacked */}
          <div className="flex flex-col items-center gap-2 text-xs">
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-primary transition-colors py-0.5"
              data-testid="link-footer-terms-mobile"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-primary transition-colors py-0.5"
              data-testid="link-footer-privacy-mobile"
            >
              Privacy Policy
            </Link>
            <Link
              href="/about-us"
              className="text-muted-foreground hover:text-primary transition-colors py-0.5"
              data-testid="link-footer-about-mobile"
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-primary transition-colors py-0.5"
              data-testid="link-footer-contact-mobile"
            >
              Contact Us
            </Link>
            {isAdmin && (
              <Link
                href="/logo-gallery"
                className="text-muted-foreground hover:text-primary transition-colors py-0.5"
                data-testid="link-footer-logo-gallery-mobile"
              >
                Brand Assets
              </Link>
            )}
          </div>

          {/* Social icons row */}
          <div className="flex items-center gap-5">
            {socialLinks.map((social) => (
              <a
                key={social.testId}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label={social.label}
                data-testid={`${social.testId}-mobile`}
              >
                <social.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Copyright - both desktop and mobile */}
        <div className="text-center text-xs text-muted-foreground/80 py-3 border-t border-border/50">
          &copy; {new Date().getFullYear()} ZECOHO. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
