"use client";
import { usePathname } from "next/navigation";
import { Breadcrumbs } from "./breadcrumbs";

export function ConditionalBreadcrumbs() {
  const pathname = usePathname();
  const isTestPage = pathname?.includes('https://g8-lemon.vercel.app/protected/test/');

  if (isTestPage) {
    return null;
  }

  return <Breadcrumbs className="pl-1 pt-3.5" rootLabel="Dashboard" />;
}
