"use client";
import { usePathname } from "next/navigation";
import { CoolFooter } from "./cool-footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  const isTestPage = pathname?.includes('https://g8-lemon.vercel.app/protected/test/');

  if (isTestPage) {
    return null;
  }

  return <CoolFooter />;
}
