import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const apiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5001";

    let res = await fetch(`${apiUrl}/pages/getpagebyslug/new-project`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      res = await fetch(`${apiUrl}/pages/getpagebyslug/projects/new`, {
        next: { revalidate: 60 },
      });
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch New Project SEO data: ${res.status}`);
    }

    const json = await res.json();
    const page = json?.data?.data || json?.data;
    const seo = page?.seo || {};

    const title =
      seo.title || "New Project | Society Web Solutions";
    const description =
      seo.description ||
      "Start a new project by browsing pre-created packages, using our custom price calculator, or requesting a custom quote.";
    const keywords = Array.isArray(seo.keywords)
      ? seo.keywords
      : typeof seo.keywords === "string"
      ? seo.keywords.split(",").map((k: string) => k.trim())
      : ["new project", "packages", "quote calculator", "custom quote"];
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
    console.error("Error generating dynamic New Project metadata:", error);
    return {
      title: "New Project | Society Web Solutions",
      description:
        "Start a new project by browsing pre-created packages, using our custom price calculator, or requesting a custom quote.",
    };
  }
}

export default function NewProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
