import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5001";

    const res = await fetch(`${apiUrl}/pages/getpagebyslug/about-us`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch About Us SEO data: ${res.status}`);
    }

    const json = await res.json();
    const page = json?.data?.data || json?.data;
    const seo = page?.seo || {};

    const title = seo.title || "About Us | Society Web Solutions";
    const description =
      seo.description ||
      "Learn more about Society Web Solutions, our mission, our team, and our dedication to crafting high-performance digital experiences.";
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
    console.error("Error generating dynamic About Us metadata:", error);
    return {
      title: "About Us | Society Web Solutions",
      description:
        "Learn more about Society Web Solutions, our mission, our team, and our dedication to crafting high-performance digital experiences.",
    };
  }
}

export default function AboutUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
