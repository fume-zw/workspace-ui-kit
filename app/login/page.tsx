import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // 認証済みなら middleware がこのページに来る前に転送先へリダイレクトする
  // （lib/supabase/middleware.ts）。ここでの supabase.auth.getUser() 呼び出しは
  // 常に「未ログイン」を再確認するだけの無駄な往復になるため、
  // middleware が付与する x-user-id ヘッダーの有無だけで判定する。
  const userId = (await headers()).get("x-user-id");

  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (userId) redirect(nextPath);

  return <LoginForm nextPath={nextPath} />;
}
