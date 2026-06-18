"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath = "/" }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        window.location.href = nextPath;
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (err) throw err;
      setMessage(
        "登録用のメールを送信しました。メール内のリンクを開くか、確認メールをオフにしている場合はそのままログインできます。",
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b">
          <CardTitle className="text-xl">タスク管理ワークスペース</CardTitle>
          <CardDescription>メールとパスワードでログイン</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 flex rounded-lg border border-border bg-muted/40 p-1">
            {(
              [
                ["signin", "ログイン"],
                ["signup", "新規登録"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "min-h-9 flex-1 rounded-md text-sm font-medium transition-colors",
                  mode === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {error && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
                {message}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "処理中…" : mode === "signin" ? "ログイン" : "登録する"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
