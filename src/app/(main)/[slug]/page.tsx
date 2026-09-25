import { notFound, redirect } from "next/navigation";

const RESERVED_ROUTES = new Set([
  "dashboard",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "privacy-policy",
  "privacy",
  "terms",
  "services",
  "about-us",
  "about",
  "contact-us",
  "contact",
  "faq",
  "careers",
  "company",
  "blog",
  "calculator",
  "help-support",
  "legal",
  "newsletter",
  "search",
  "user-guides",
  "api",
  "admin",
  "cms",
  "client",
  "assets",
  "images",
  "uploads",
  "favicon.ico",
  "_next",
]);

interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params;
  if (!slug || RESERVED_ROUTES.has(slug.toLowerCase())) {
    notFound();
  }

  const apiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5001";
  const cleanApiUrl = apiUrl.replace(/\/+$/, "");

  let targetRedirect: string | null = null;

  try {
    const res = await fetch(
      `${cleanApiUrl}/request-analysis/slug/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
      },
    );

    if (res.ok) {
      const data = await res.json();
      const projectId = data?.data?._id || data?.data?.id;
      if (projectId) {
        targetRedirect = `/dashboard/my-analyses/${projectId}/details`;
      }
    }
  } catch {
    // Network or parse error -> fall through to notFound()
  }

  if (targetRedirect) {
    redirect(targetRedirect);
  }

  notFound();
}
