"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface ProfileDropdownProps {
  displayName: string;
}

export function ProfileDropdown({ displayName }: ProfileDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Check if user is currently in a test
  const isInTest = pathname.includes('/protected/test/') && !pathname.includes('/result');

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const goToProfile = () => {
    router.push("/protected/dash/profile");
  };

  // If in test, render a disabled button
  if (isInTest) {
    return (
      <Button 
        variant="outline" 
        className="flex items-center gap-2 opacity-50 cursor-not-allowed" 
        disabled
        title="Profile access is disabled during tests"
      >
        <User className="h-4 w-4" />
      </Button>
    );
  }

  // Normal dropdown when not in test
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={goToProfile} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
