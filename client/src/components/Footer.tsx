import { Mail } from "lucide-react";
import { SiInstagram, SiYoutube, SiFacebook, SiLinkedin, SiX } from "react-icons/si";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-background py-6 mt-auto">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col gap-4">
          {/* Policy Links Row */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
            <Link 
              href="/terms" 
              className="text-muted-foreground hover:text-primary transition-colors"
              data-testid="link-footer-terms"
            >
              Terms & Conditions
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link 
              href="/privacy" 
              className="text-muted-foreground hover:text-primary transition-colors"
              data-testid="link-footer-privacy"
            >
              Privacy Policy
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link 
              href="/about" 
              className="text-muted-foreground hover:text-primary transition-colors"
              data-testid="link-footer-about"
            >
              About Us
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link 
              href="/contact" 
              className="text-muted-foreground hover:text-primary transition-colors"
              data-testid="link-footer-contact"
            >
              Contact Us
            </Link>
          </div>

          {/* Main footer content */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>
                For more information, write to{" "}
                <a 
                  href="mailto:support@zecoho.com" 
                  className="text-primary hover:underline font-medium"
                  data-testid="link-support-email"
                >
                  support@zecoho.com
                </a>
              </span>
            </div>
            
            {/* Social Media Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com/zecoho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Follow us on Instagram"
                data-testid="link-social-instagram"
              >
                <SiInstagram className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com/@zecoho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Subscribe to our YouTube channel"
                data-testid="link-social-youtube"
              >
                <SiYoutube className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com/zecoho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Follow us on Facebook"
                data-testid="link-social-facebook"
              >
                <SiFacebook className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com/company/zecoho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Connect with us on LinkedIn"
                data-testid="link-social-linkedin"
              >
                <SiLinkedin className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/zecoho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Follow us on X (Twitter)"
                data-testid="link-social-twitter"
              >
                <SiX className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="text-center text-sm text-muted-foreground border-t pt-2">
            © {new Date().getFullYear()} ZECOHO. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
