import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5001";

    const res = await fetch(`${apiUrl}/pages/getpagebyslug/careers`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Careers SEO data: ${res.status}`);
    }

    const json = await res.json();
    const page = json?.data?.data || json?.data;
    const seo = page?.seo || {};

    const title =
      seo.title || "Careers at Society Web Solutions | Join Our Remote Team";
    const description =
      seo.description ||
      "Join our international team and help us build the future of Society Web Solutions. Explore open remote and on-site positions.";
    const keywords = Array.isArray(seo.keywords)
      ? seo.keywords
      : typeof seo.keywords === "string"
      ? seo.keywords.split(",").map((k: string) => k.trim())
      : undefined;
    const ogImage = seo.og_image || seo.ogImage;

    return {
      title,
      description,
      keywords,
      openGraph: {
        title,
        description,
        type: "website",
        images: ogImage ? [{ url: ogImage }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
    };
  } catch (error) {
    console.error("Error generating dynamic Careers metadata:", error);
    return {
      title: "Careers at Society Web Solutions | Join Our Remote Team",
      description:
        "Join our international team and help us build the future of Society Web Solutions. Explore open remote and on-site positions.",
    };
  }
}

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
