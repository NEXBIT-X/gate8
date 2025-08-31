"use client";

import { usePathname } from "next/navigation";
import { Logo } from "./logo";

export function ConditionalLogo() {
  const pathname = usePathname();
  
  // Detect if we're on a test page
  const isTestPage = pathname?.includes('/protected/test/') && pathname !== '/protected/test';

  return <Logo disabled={isTestPage} />;
}
