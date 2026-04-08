import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Award, Heart, Shield, Zap } from "lucide-react";
import type { AboutUs as AboutUsType } from "@shared/schema";
import { Helmet } from "react-helmet-async";

const STATIC_FALLBACK_CONTENT = `# About ZECOHO

## Our Mission

ZECOHO (ZERO COMMISSION Hotel) is revolutionizing the hospitality industry by eliminating commission fees and connecting guests directly with property owners. Our mission is to create a transparent, fair, and cost-effective booking experience for everyone.

## The Zero-Commission Model

Traditional hotel booking platforms charge property owners hefty commission fees ranging from 15% to 30% per booking. These costs are ultimately passed on to guests through higher room rates.

**ZECOHO is different:**
- **Zero Commission Fees** – Property owners keep 100% of their earnings
- **Lower Prices for Guests** – Savings are passed directly to you
- **Direct Communication** – Connect directly with property owners
- **Transparent Pricing** – No hidden fees or surprise charges

## Our Role as a Technology Intermediary

ZECOHO operates as a technology platform that facilitates direct bookings between guests and property owners. We are not a travel agent or tour operator. Our role is to:

- Provide a secure and reliable booking platform
- Facilitate communication between guests and owners
- Process secure payments and protect both parties
- Maintain quality standards through verified listings

## Benefits for Guests

- **Competitive Pricing** – Access better rates without commission markups
- **Direct Owner Communication** – Get authentic property information
- **Secure Booking Process** – Protected payments and verified properties
- **Trusted Reviews** – Read honest feedback from verified guests
- **Wide Selection** – Discover unique properties across India

## Benefits for Property Owners

- **Keep 100% of Your Earnings** – No commission fees ever
- **Direct Guest Relationships** – Build lasting customer connections
- **Flexible Management** – Full control over pricing and availability
- **Increased Visibility** – Reach travelers across India
- **Simple Onboarding** – Easy property listing and management

## Company Details

**ZECOHO Technologies Pvt. Ltd.**

We are a registered company committed to transforming the hospitality booking experience in India. Our platform is designed with both guests and property owners in mind, ensuring a seamless and trustworthy booking process.

For any queries, please visit our Contact Us page or reach out to our support team.

---

*ZECOHO – Where Zero Commission Meets Quality Hospitality*`;

export default function AboutUs() {
  const {
    data: aboutUs,
    isLoading,
    error,
  } = useQuery<AboutUsType>({
    queryKey: ["/api/about-us"],
  });

  const content = aboutUs?.content || STATIC_FALLBACK_CONTENT;
  const title = aboutUs?.title || "About ZECOHO";

  const features = [
    {
      icon: Building2,
      title: "Zero Commission",
      description: "Property owners keep 100% of their earnings",
    },
    {
      icon: Users,
      title: "Direct Connection",
      description: "Connect directly with property owners",
    },
    {
      icon: Award,
      title: "Quality Assured",
      description: "Verified listings and trusted reviews",
    },
    {
      icon: Heart,
      title: "Guest Focused",
      description: "Lower prices passed to travelers",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Safe payments and protected bookings",
    },
    {
      icon: Zap,
      title: "Easy Booking",
      description: "Simple, fast reservation process",
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>
          About ZECOHO — India's Zero Commission Hotel Booking Platform
        </title>
        <meta
          name="description"
          content="Learn how ZECOHO is disrupting India's hotel booking industry by eliminating OTA commissions and connecting guests directly with hotels. Zero commission. 100% savings passed to you."
        />
        <link rel="canonical" href="https://www.zecoho.com/about-us" />
      </Helmet>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            data-testid="text-about-title"
          >
            {title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Revolutionizing hotel bookings with zero commission fees
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <feature.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Card className="max-w-4xl mx-auto">
          <CardContent className="py-8 px-6 md:px-10">
            <div
              className="prose dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground"
              data-testid="text-about-content"
            >
              {content.split("\n").map((line, index) => {
                if (line.startsWith("# ")) {
                  return (
                    <h1 key={index} className="text-3xl font-bold mb-6">
                      {line.slice(2)}
                    </h1>
                  );
                }
                if (line.startsWith("## ")) {
                  return (
                    <h2
                      key={index}
                      className="text-2xl font-semibold mt-8 mb-4"
                    >
                      {line.slice(3)}
                    </h2>
                  );
                }
                if (line.startsWith("### ")) {
                  return (
                    <h3 key={index} className="text-xl font-semibold mt-6 mb-3">
                      {line.slice(4)}
                    </h3>
                  );
                }
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <p key={index} className="font-semibold my-2">
                      {line.slice(2, -2)}
                    </p>
                  );
                }
                if (line.startsWith("- **")) {
                  const match = line.match(/- \*\*(.+?)\*\* – (.+)/);
                  if (match) {
                    return (
                      <div key={index} className="flex items-start gap-2 my-2">
                        <span className="text-primary mt-1">•</span>
                        <p>
                          <strong className="text-foreground">
                            {match[1]}
                          </strong>{" "}
                          – {match[2]}
                        </p>
                      </div>
                    );
                  }
                }
                if (line.startsWith("- ")) {
                  return (
                    <div key={index} className="flex items-start gap-2 my-1">
                      <span className="text-primary mt-1">•</span>
                      <p>{line.slice(2)}</p>
                    </div>
                  );
                }
                if (line.startsWith("---")) {
                  return <hr key={index} className="my-8 border-border" />;
                }
                if (
                  line.startsWith("*") &&
                  line.endsWith("*") &&
                  !line.startsWith("**")
                ) {
                  return (
                    <p
                      key={index}
                      className="italic text-center text-muted-foreground my-4"
                    >
                      {line.slice(1, -1)}
                    </p>
                  );
                }
                if (line.trim() === "") {
                  return <div key={index} className="h-2" />;
                }
                return (
                  <p key={index} className="my-2">
                    {line}
                  </p>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Version info (subtle) */}
        {aboutUs && (
          <div className="text-center mt-8 text-xs text-muted-foreground">
            Last updated:{" "}
            {new Date(
              aboutUs.publishedAt || aboutUs.createdAt!,
            ).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
