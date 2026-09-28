import { redirect, notFound } from 'next/navigation';

interface ShortLinkPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

  // 1. Check if the slug matches an Analysis Project
  try {
    const res = await fetch(`${apiUrl}/request-analysis/projects/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      const analysis = json?.data;
      if (analysis?._id) {
        redirect(`/dashboard/my-analyses/${analysis._id}/details`);
      }
    }
  } catch (error: any) {
    // If redirect was thrown, rethrow it so Next.js can perform the redirect
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
  }

  // 2. Check if the slug matches a CMS Custom Page
  try {
    const pageRes = await fetch(`${apiUrl}/pages/getpagebyslug/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (pageRes.ok) {
      const pageJson = await pageRes.json();
      if (pageJson?.data) {
        // Page found - redirect or handle if appropriate
      }
    }
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
  }

  notFound();
  
}
