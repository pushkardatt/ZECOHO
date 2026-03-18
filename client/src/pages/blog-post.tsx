import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Share2, BookOpen } from "lucide-react";

interface BlogPostContent {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  coverEmoji: string;
  content: string;
}

const blogContent: Record<string, BlogPostContent> = {
  "stop-paying-ota-commission": {
    slug: "stop-paying-ota-commission",
    title:
      "Why Hotel Owners Are Losing Lakhs to OTAs Every Year (And How to Stop It)",
    category: "For Hoteliers",
    readTime: "5 min read",
    date: "March 15, 2026",
    coverEmoji: "🏨",
    content: `
## The Hidden Cost of OTA Listings

If your hotel is listed on MakeMyTrip, Goibibo, or Booking.com, you're paying between 15% to 30% commission on every single booking. This might not sound like much, but let's do the math.

**Example: A 10-room hotel in Indore**
- Average room rate: ₹2,000/night
- Occupancy: 70% (7 rooms/night)
- Monthly revenue: ₹4,20,000
- OTA commission (20%): ₹84,000/month
- **Annual loss to OTAs: ₹10,08,000**

That's over **₹10 lakh every year** going to middlemen — money that could be reinvested in your property, staff, or your own pocket.

## Why Hotels Keep Paying It

Most hoteliers feel trapped. OTAs bring visibility and bookings, and switching feels risky. But the reality is:

1. **Guests increasingly search directly** — Google searches for "[hotel name] direct booking" are growing year over year
2. **OTAs don't own your guests** — the relationship is yours to build
3. **Direct booking guests are more loyal** — they tend to return and spend more

## The Zero Commission Alternative

ZECOHO was built specifically to solve this problem. By listing on ZECOHO:

- **You keep 100% of every booking**
- **Guests contact you directly** — via chat, call, or the platform
- **No middleman markup** — guests pay fair prices, you earn fair revenue
- **Free to list** — no upfront costs, no monthly fees

## How to Get Started

1. Go to zecoho.com/list-property
2. Create your free account
3. Add your property details and photos
4. Go live in under 10 minutes

The hospitality industry in India is worth ₹2.5 lakh crore. It's time hotel owners kept more of it.
    `,
  },
  "list-hotel-online-free": {
    slug: "list-hotel-online-free",
    title:
      "How to List Your Hotel Online for FREE and Start Getting Direct Bookings",
    category: "For Hoteliers",
    readTime: "7 min read",
    date: "March 10, 2026",
    coverEmoji: "📋",
    content: `
## Why Listing Online Is Non-Negotiable in 2026

Over 80% of hotel bookings in India now start with an online search. If your hotel isn't listed online, you're invisible to the majority of potential guests.

The good news? Getting listed doesn't have to cost you anything.

## Step-by-Step: List Your Hotel on ZECOHO for Free

### Step 1: Create Your Account
Visit zecoho.com and click "Own a Property" in the top navigation. Sign up with your email or Google account — it takes less than 2 minutes.

### Step 2: Add Your Property Details
Fill in your hotel's:
- Name and description
- Location (with map pin)
- Property type (hotel, guesthouse, resort, etc.)
- Amenities (WiFi, parking, restaurant, pool, etc.)

### Step 3: Set Up Room Types
Add each room type you offer with:
- Room name (Deluxe, Suite, Standard, etc.)
- Base price per night
- Maximum occupancy
- Photos

### Step 4: Upload Photos
Good photos are your #1 conversion tool. Add at least 5-10 high quality photos of:
- Exterior
- Lobby/reception
- Each room type
- Common areas
- Amenities

### Step 5: Set Your Availability
Block dates when rooms aren't available and set your booking rules.

### Step 6: Go Live
Submit for verification. ZECOHO reviews your listing within 24-48 hours and publishes it.

## What Happens After You Go Live

Once your hotel is listed, guests can:
- Find your property in search results
- View your rooms and pricing
- Book directly through the platform
- Contact you via chat or call

You receive booking notifications instantly and can manage everything from your owner dashboard.

## The Zero Commission Difference

Unlike OTAs that take 15-30% per booking, ZECOHO charges **zero commission**. Every rupee the guest pays comes directly to you.
    `,
  },
  "save-money-booking-hotels-india": {
    slug: "save-money-booking-hotels-india",
    title: "How to Save 15-25% on Every Hotel Booking in India",
    category: "For Travelers",
    readTime: "4 min read",
    date: "March 8, 2026",
    coverEmoji: "✈️",
    content: `
## Why Hotel Prices Are Higher on OTAs

When you book a hotel on MakeMyTrip or Booking.com, the price you see includes a markup to cover the platform's commission — typically 15-30%.

The hotel pays this commission, and in most cases, they price their rooms higher on OTAs to compensate. The result? You pay more than you need to.

## The Direct Booking Advantage

Booking directly with hotels — or through a zero-commission platform like ZECOHO — removes the middleman markup entirely.

**Real example:**
- Hotel room on MakeMyTrip: ₹3,500/night
- Same room on ZECOHO: ₹2,800/night
- **Savings: ₹700 per night (20%)**

For a 5-night trip, that's ₹3,500 in savings — enough for an extra night or two!

## How to Book on ZECOHO

1. Go to zecoho.com
2. Search your destination and dates
3. Browse verified hotels with real guest ratings
4. Select your room type
5. Book directly — no advance payment required
6. Pay at the hotel during check-in

## Additional Benefits

- **Direct contact with hotel** — chat or call the property before booking
- **No hidden fees** — the price you see is what you pay
- **Verified properties** — every hotel is reviewed by ZECOHO
- **Real guest reviews** — honest ratings from verified stays
- **Pay at hotel** — no advance payment or cancellation stress

## Start Saving Today

India has thousands of hotels that now offer better rates through direct booking platforms. Stop overpaying — search ZECOHO before your next trip.
    `,
  },
  "direct-hotel-bookings-vs-ota": {
    slug: "direct-hotel-bookings-vs-ota",
    title:
      "Direct Hotel Booking vs OTA: What Every Indian Traveler Should Know",
    category: "For Travelers",
    readTime: "6 min read",
    date: "March 5, 2026",
    coverEmoji: "⚖️",
    content: `
## The Great Hotel Booking Debate

Should you book your hotel through MakeMyTrip, Goibibo, or Booking.com? Or should you book directly? Let's break it down honestly.

## OTA Booking: Pros and Cons

**Pros:**
- Large selection of properties in one place
- Easy price comparison
- Rewards points programs
- Familiar interface

**Cons:**
- Higher prices (commission markup)
- No direct relationship with hotel
- Customer service issues go through middleman
- Cancellation policies controlled by platform

## Direct Booking: Pros and Cons

**Pros:**
- Lower prices (no commission markup)
- Direct communication with hotel
- More flexible negotiation possible
- Better customer service

**Cons:**
- Need to visit multiple hotel websites
- No centralized comparison

## The ZECOHO Solution

ZECOHO combines the best of both worlds:
- **One platform** to search multiple verified hotels
- **Zero commission** so prices are lower
- **Direct contact** with hotel owners
- **Verified properties** with real guest reviews

## Price Comparison: Real Numbers

| Platform | Room Rate | Commission | Guest Pays |
|----------|-----------|------------|------------|
| MakeMyTrip | ₹2,500 | 20% markup | ₹3,000 |
| Booking.com | ₹2,500 | 18% markup | ₹2,950 |
| ZECOHO | ₹2,500 | 0% | ₹2,500 |

**Savings per night: ₹450-500**

## Our Recommendation

For travel within India, always check ZECOHO first. The savings are real and the experience is better for both you and the hotel owner.
    `,
  },
  "increase-hotel-bookings-tier2-cities": {
    slug: "increase-hotel-bookings-tier2-cities",
    title:
      "How Small Hotels in Tier 2 Cities Can Compete with Big OTA-Listed Properties",
    category: "For Hoteliers",
    readTime: "8 min read",
    date: "March 1, 2026",
    coverEmoji: "📈",
    content: `
## The Tier 2 City Hotel Challenge

Running a hotel in Indore, Varanasi, Jaipur, Coimbatore, or Bhopal comes with unique challenges. You're competing with large chains that have massive marketing budgets and OTA visibility.

But here's the thing: **you have advantages they don't.**

## Your Unfair Advantages as a Small Hotel

1. **Personal service** — guests get direct attention, not a corporate check-in experience
2. **Local knowledge** — you know the city, the food, the hidden gems
3. **Flexibility** — you can negotiate, customize, and accommodate requests chains can't
4. **Price** — without the overhead of a chain, you can offer better value

## Strategy 1: Get Listed on Zero-Commission Platforms

The single biggest thing you can do is stop paying OTA commission and redirect that 15-30% into better guest experiences and competitive pricing.

On ZECOHO, you list for free and keep 100% of every booking. That extra margin lets you:
- Offer lower prices than chain hotels
- Include breakfast or amenities that chains charge extra for
- Invest in better photos and room upgrades

## Strategy 2: Build Your Google Presence

- Create a Google My Business profile
- Ask every guest to leave a Google review
- Upload fresh photos monthly
- Post weekly updates about your property

## Strategy 3: Target the Right Guests

Tier 2 cities attract specific traveler types:
- Business travelers on tight budgets
- Pilgrims and religious tourists
- Weekend getaway travelers from nearby metros
- Government officials on TA

Each segment has different needs. Position your hotel clearly for 1-2 segments and dominate those.

## Strategy 4: Direct Booking Incentives

Offer guests who book directly (via ZECOHO or your own number):
- Free early check-in when available
- Complimentary chai/coffee
- Local area guide and tips
- Room upgrade if available

These cost almost nothing but create loyal repeat guests.

## The Bottom Line

Small hotels in Tier 2 cities that embrace direct booking platforms and personal service will outperform OTA-dependent competitors. Start with a free listing on ZECOHO today.
    `,
  },
  "zero-commission-hotel-platform-india": {
    slug: "zero-commission-hotel-platform-india",
    title:
      "ZECOHO: India's First Zero Commission Hotel Booking Platform Explained",
    category: "About ZECOHO",
    readTime: "5 min read",
    date: "February 25, 2026",
    coverEmoji: "🚀",
    content: `
## What is ZECOHO?

ZECOHO (Zero Commission Hotels) is India's first hotel booking platform that charges absolutely zero commission to hotel owners on bookings made through the platform.

Founded with a simple mission: **make hotel bookings fairer for everyone.**

## The Problem We're Solving

India's online hotel booking market is dominated by OTAs (Online Travel Agencies) that charge hotels 15-30% commission on every booking. This creates a lose-lose situation:

- **Hotels lose** 15-30% of their revenue to middlemen
- **Travelers pay more** because hotels inflate prices to cover commission costs
- **Only OTAs win**

## How ZECOHO Works

**For Hotel Owners:**
1. List your property for free
2. Receive booking requests directly
3. Accept or decline based on availability
4. Guest pays you directly at check-in
5. You keep 100% of the booking amount

**For Travelers:**
1. Search hotels by destination and dates
2. Browse verified properties with real reviews
3. Book your preferred room
4. Contact the hotel directly if needed
5. Pay at the hotel — no advance payment required

## What Makes ZECOHO Different

| Feature | OTAs | ZECOHO |
|---------|------|--------|
| Commission | 15-30% | 0% |
| Listing cost | Free-Paid | Free |
| Direct contact | ❌ | ✅ |
| Advance payment | Required | Not required |
| Verified properties | Sometimes | Always |

## Our Vision

We believe the future of hotel bookings is direct. Travelers and hotel owners should be able to connect without a costly middleman taking a cut of every transaction.

ZECOHO is building India's largest network of zero-commission hotels — one verified property at a time.

**Join us. List your hotel free at zecoho.com**
    `,
  },
};

const categoryColors: Record<string, string> = {
  "For Hoteliers":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "For Travelers":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "About ZECOHO":
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function renderContent(content: string) {
  const lines = content.trim().split("\n");
  const elements: JSX.Element[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={key++} className="h-2" />);
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-2xl font-bold mt-8 mb-3">
          {trimmed.slice(3)}
        </h2>,
      );
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-xl font-semibold mt-6 mb-2">
          {trimmed.slice(4)}
        </h3>,
      );
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      elements.push(
        <p key={key++} className="font-bold my-2">
          {trimmed.slice(2, -2)}
        </p>,
      );
    } else if (trimmed.startsWith("- ")) {
      elements.push(
        <li key={key++} className="ml-6 list-disc text-muted-foreground my-1">
          {trimmed.slice(2)}
        </li>,
      );
    } else if (trimmed.startsWith("| ")) {
      // Skip table rows — render as styled div
      elements.push(
        <div
          key={key++}
          className="font-mono text-sm bg-muted/50 px-4 py-1 rounded"
        >
          {trimmed}
        </div>,
      );
    } else if (trimmed.match(/^\d+\. /)) {
      elements.push(
        <li
          key={key++}
          className="ml-6 list-decimal text-muted-foreground my-1"
        >
          {trimmed.replace(/^\d+\. /, "")}
        </li>,
      );
    } else {
      elements.push(
        <p key={key++} className="text-muted-foreground leading-relaxed my-2">
          {trimmed}
        </p>,
      );
    }
  }
  return elements;
}

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const post = blogContent[params.slug];

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Button onClick={() => setLocation("/blog")}>Back to Blog</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/blog")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Button>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-b">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <Badge className={`${categoryColors[post.category]} mb-4`}>
            {post.category}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> {post.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {post.readTime}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
              }}
              className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
      </div>

      {/* Cover */}
      <div className="bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center py-16">
        <span className="text-9xl">{post.coverEmoji}</span>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="prose max-w-none">{renderContent(post.content)}</div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-center text-white">
          {post.category === "For Hoteliers" ||
          post.category === "About ZECOHO" ? (
            <>
              <h2 className="text-xl font-bold mb-2">
                Ready to List Your Hotel for Free?
              </h2>
              <p className="mb-4 opacity-90 text-sm">
                Join ZECOHO and start getting direct bookings with zero
                commission.
              </p>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setLocation("/list-property")}
                className="font-semibold"
              >
                List Your Hotel Free →
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-2">
                Ready to Save on Your Next Hotel?
              </h2>
              <p className="mb-4 opacity-90 text-sm">
                Search verified hotels with zero commission pricing on ZECOHO.
              </p>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setLocation("/search")}
                className="font-semibold"
              >
                Search Hotels →
              </Button>
            </>
          )}
        </div>

        {/* Back to blog */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => setLocation("/blog")}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" /> Read More Articles
          </Button>
        </div>
      </div>
    </div>
  );
}
