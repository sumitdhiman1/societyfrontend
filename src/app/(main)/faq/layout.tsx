import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5001";

    const res = await fetch(`${apiUrl}/pages/faq`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch FAQ SEO data: ${res.status}`);
    }

    const json = await res.json();
    const data = json?.data;
    const seo = data?.seo || {};

    const title = seo.title || "FAQ | Society Web Solutions";
    const description =
      seo.description ||
      "Find answers to frequently asked questions about Society Web Solutions, our services, and support.";
    const keywords = Array.isArray(seo.keywords)
      ? seo.keywords
      : typeof seo.keywords === "string"
      ? seo.keywords.split(",").map((k: string) => k.trim())
      : undefined;
    const ogImage = seo.ogImage || seo.og_image;

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
    console.error("Error generating dynamic FAQ metadata:", error);
    return {
      title: "FAQ | Society Web Solutions",
      description:
        "Find answers to frequently asked questions about Society Web Solutions, our services, and support.",
    };
  }
}

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
