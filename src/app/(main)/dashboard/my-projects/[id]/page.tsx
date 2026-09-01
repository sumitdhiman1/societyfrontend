import { redirect } from "next/navigation";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  redirect(`/dashboard/my-projects/${resolvedParams.id}/details`);
}
