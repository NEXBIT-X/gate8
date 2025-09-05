import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { ThemeSwitcher } from "./theme-switcher";
import { stripDomain, getUserFullName } from '@/lib/utils';
import { ProfileDropdown } from "./profile-dropdown";

export async function AuthButton() {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
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

  // Fetch user profile from the profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  // Get display name - prioritize profile table, then user metadata, then email
  let displayName = '';
  
  if (profile?.full_name) {
    displayName = profile.full_name;
  } else {
    // Fallback to user metadata
    const metadataName = getUserFullName(user.user_metadata);
    if (metadataName) {
      displayName = metadataName;
    } else {
      displayName = stripDomain(user.email);
    }
  }

  return (
    <div className="flex items-center gap-4">
      Hey, {displayName}!
      <div className="flex items-center gap-2">
        <ProfileDropdown displayName={displayName} />
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground" style={{ marginLeft: 'auto' }}>
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
}
