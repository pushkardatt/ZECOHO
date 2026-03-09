import { useQuery } from "@tanstack/react-query";

interface SiteSettingsData {
  logoUrl?: string | null;
  logoAlt?: string | null;
}

function useSiteSettings() {
  return useQuery<SiteSettingsData>({
    queryKey: ["/api/site-settings"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function Logo({ className = "" }: { className?: string }) {
  const { data: siteSettings } = useSiteSettings();
  const logoUrl = siteSettings?.logoUrl;
  const logoAlt = siteSettings?.logoAlt || "ZECOHO";

  if (logoUrl) {
    return (
      <div className={`flex items-center shrink-0 ${className}`}>
        <img
          src={logoUrl}
          alt={logoAlt}
          style={{ height: "36px", width: "auto", maxWidth: "180px", objectFit: "contain", display: "block" }}
          data-testid="img-site-logo"
        />
      </div>
    );
  }

  return (
    <div className={`logo font-bold text-xl px-4 py-2 rounded-xl flex items-center ${className}`}>
      <span>ZECOH</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-[1em] h-[1em] ml-[0.02em]"
        aria-hidden="true"
      >
        <path
          d="M 18.36 5.64 A 9 9 0 1 0 20.5 10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    </div>
  );
}

export function LogoText({ className = "" }: { className?: string }) {
  const { data: siteSettings } = useSiteSettings();
  const logoUrl = siteSettings?.logoUrl;
  const logoAlt = siteSettings?.logoAlt || "ZECOHO";

  if (logoUrl) {
    return (
      <span className={`flex items-center shrink-0 ${className}`}>
        <img
          src={logoUrl}
          alt={logoAlt}
          style={{ height: "28px", width: "auto", maxWidth: "160px", objectFit: "contain", display: "block" }}
          data-testid="img-site-logo-text"
        />
      </span>
    );
  }

  return (
    <span className={`flex items-center ${className}`}>
      <span>ZECOH</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-[1em] h-[1em] ml-[0.02em] inline-block"
        aria-hidden="true"
      >
        <path
          d="M 18.36 5.64 A 9 9 0 1 0 20.5 10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    </span>
  );
}
