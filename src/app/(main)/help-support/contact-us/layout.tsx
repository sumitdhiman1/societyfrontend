import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5001";

    const res = await fetch(`${apiUrl}/pages/getpagebyslug/contact-us`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Contact Us SEO data: ${res.status}`);
    }

    const json = await res.json();
    const page = json?.data;
    const seo = page?.seo || {};

    const title = seo.title || "Contact Us | Society Web Solutions";
    const description =
      seo.description ||
      "Get in touch with our team. Whether you have a question about our services, pricing, or need technical assistance.";
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
    console.error("Error generating dynamic Contact Us metadata:", error);
    return {
      title: "Contact Us | Society Web Solutions",
      description: "Get in touch with our team.",
    };
  }
}

export default function ContactUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
