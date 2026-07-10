import { redirect } from "next/navigation";

// Legacy route — the collection page now hosts Get Objects as a tab.
export default async function Page({
  params,
}: {
  params: Promise<{ server: string; database: string; collectionName: string }>;
}) {
  const { server, database, collectionName } = await params;
  redirect(`/${server}/${database}/collections/${collectionName}?tab=objects`);
}
