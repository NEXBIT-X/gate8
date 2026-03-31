"use client";
import { usePathname } from "next/navigation";
import CoolFooter from "./graphy-footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  const isTestPage = pathname?.includes('/test/');

  if (isTestPage) {
    return null;
  }

  return <CoolFooter />;
}
