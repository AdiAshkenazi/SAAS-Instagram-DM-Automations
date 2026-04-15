import { onboardUser } from "@/actions/user";
import { redirect } from "next/navigation";

type Props = {};

async function Page({}: Props) {
  const user = await onboardUser();

  if (user.status === 200 || user.status === 201) {
    const email = (user.data as any)?.email ?? "";
    const slug = email.split("@")[0] || "user";
    return redirect(`/dashboard/${slug}`);
  }

  return redirect("/sign-in");
}

export default Page;
