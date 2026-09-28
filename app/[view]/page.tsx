import { notFound } from "next/navigation";
import Khoj from "@/components/Khoj";
export default async function Page({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!["items", "board", "found", "recovery", "review"].includes(view))
    notFound();
  return <Khoj view={view} />;
}
