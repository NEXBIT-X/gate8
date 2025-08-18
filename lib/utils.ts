import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/**
 * Remove a domain suffix from an email address for display.
 * If the email does not end with the domain, returns the original email.
 */
export function stripDomain(email: string | undefined, domain = '@citchennai.net') {
  if (!email) return '';
  return email.endsWith(domain) ? email.slice(0, -domain.length) : email;
}
