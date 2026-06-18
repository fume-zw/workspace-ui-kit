import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (user) redirect(nextPath);

  return <LoginForm nextPath={nextPath} />;
}
