import { Mail } from "lucide-react";
import { SiInstagram, SiYoutube, SiFacebook, SiLinkedin, SiX } from "react-icons/si";
import { Link, useLocation } from "wouter";

export function Footer() {
  const [location] = useLocation();
  
  // Hide footer on messages pages
  if (location === "/messages" || location === "/owner/messages") {
    return null;
  }
  
  return (
    <footer className="border-t bg-background py-4 md:py-6 mt-auto mb-16 md:mb-0">
      <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6">
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Policy Links - Compact on mobile */}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs md:text-sm">
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
          </div>

          {/* Email - Single line */}
          <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <a 
              href="mailto:support@zecoho.com" 
              className="text-primary hover:underline font-medium whitespace-nowrap"
              data-testid="link-support-email"
            >
              support@zecoho.com
            </a>
          </div>
          
          {/* Social Media Links */}
          <div className="flex items-center justify-center gap-5">
            <a
              href="https://instagram.com/zecoho"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Follow us on Instagram"
              data-testid="link-social-instagram"
            >
              <SiInstagram className="h-4 w-4 md:h-5 md:w-5" />
            </a>
            <a
              href="https://youtube.com/@zecoho"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Subscribe to our YouTube channel"
              data-testid="link-social-youtube"
            >
              <SiYoutube className="h-4 w-4 md:h-5 md:w-5" />
            </a>
            <a
              href="https://facebook.com/zecoho"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Follow us on Facebook"
              data-testid="link-social-facebook"
            >
              <SiFacebook className="h-4 w-4 md:h-5 md:w-5" />
            </a>
            <a
              href="https://linkedin.com/company/zecoho"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Connect with us on LinkedIn"
              data-testid="link-social-linkedin"
            >
              <SiLinkedin className="h-4 w-4 md:h-5 md:w-5" />
            </a>
            <a
              href="https://x.com/zecoho"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Follow us on X (Twitter)"
              data-testid="link-social-twitter"
            >
              <SiX className="h-4 w-4 md:h-5 md:w-5" />
            </a>
          </div>
          
          {/* Copyright */}
          <div className="text-center text-xs text-muted-foreground/80 pt-2 border-t border-border/50">
            © {new Date().getFullYear()} ZECOHO. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
