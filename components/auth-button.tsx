import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { stripDomain } from '@/lib/utils';
import { ThemeSwitcher } from "./theme-switcher";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {stripDomain(user.email)}!
      <div className="flex items-center gap-2">
        <LogoutButton />
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground" style={{ marginLeft: 'auto' }}>
          <ThemeSwitcher />
        </div>
      </div>
      </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
