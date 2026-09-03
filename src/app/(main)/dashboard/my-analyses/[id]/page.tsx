import { redirect } from "next/navigation";

export default async function SingleAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/my-analyses/${id}/details`);
}
