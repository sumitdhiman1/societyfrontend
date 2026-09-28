import { redirect, notFound } from 'next/navigation';

interface ShortLinkPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { slug } = await params;
  if (!slug) {
    console.warn(`[ShortLinkPage] Empty slug received in params -> notFound()`);
    notFound();
  }

  const apiUrl = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:5001'
  ).replace(/\/$/, '');

  console.log(`\n================== [ShortLinkPage] ==================`);
  console.log(`[ShortLinkPage] Target Slug: "${slug}"`);
  console.log(`[ShortLinkPage] Backend API URL: "${apiUrl}"`);

  // 1. Check if the slug matches an Analysis Project
  try {
    const analysisEndpoint = `${apiUrl}/request-analysis/projects/${encodeURIComponent(slug)}`;
    console.log(`[ShortLinkPage] [1/2] Fetching Analysis Project: ${analysisEndpoint}`);
    
    const res = await fetch(analysisEndpoint, {
      cache: 'no-store',
    });

    console.log(`[ShortLinkPage] Analysis Project response status: ${res.status} ${res.statusText}`);

    if (res.ok) {
      const json = await res.json();
      const analysis = json?.data;
      console.log(`[ShortLinkPage] Analysis matched! ID: ${analysis?._id}, Title: "${analysis?.title}", Slug: "${analysis?.slug}"`);
      if (analysis?._id) {
        console.log(`[ShortLinkPage] -> Redirecting to /dashboard/my-analyses/${analysis._id}/details`);
        console.log(`=====================================================\n`);
        redirect(`/dashboard/my-analyses/${analysis._id}/details`);
      }
    } else {
      const errorBody = await res.text().catch(() => '');
      console.warn(`[ShortLinkPage] Analysis lookup not found (${res.status}): ${errorBody}`);
    }
  } catch (error: any) {
    // If redirect was thrown, rethrow it so Next.js can perform the redirect
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error(`[ShortLinkPage] Error querying analysis project:`, error?.message || error);
  }

  // 2. Check if the slug matches a CMS Custom Page
  try {
    const pageEndpoint = `${apiUrl}/pages/getpagebyslug/${encodeURIComponent(slug)}`;
    console.log(`[ShortLinkPage] [2/2] Fetching CMS Custom Page: ${pageEndpoint}`);
    const pageRes = await fetch(pageEndpoint, {
      cache: 'no-store',
    });
    console.log(`[ShortLinkPage] CMS Page response status: ${pageRes.status} ${pageRes.statusText}`);
    if (pageRes.ok) {
      const pageJson = await pageRes.json();
      if (pageJson?.data) {
        console.log(`[ShortLinkPage] CMS Page matched: "${pageJson.data?.title || pageJson.data?.slug}"`);
        // If CMS page exists, could render or redirect
      }
    } else {
      console.warn(`[ShortLinkPage] CMS Page lookup returned ${pageRes.status}`);
    }
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error(`[ShortLinkPage] Error querying CMS page:`, error?.message || error);
  }

  console.warn(`[ShortLinkPage] No matching analysis or page found for slug: "${slug}". Triggering 404 notFound().`);
  console.log(`=====================================================\n`);
  notFound();
}
