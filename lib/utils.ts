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

/**
 * Parse user display name to extract full name and registration number
 * Display name format: "Full Name,RegNo" 
 * Returns object with fullName and regNo
 */
export function parseUserDisplayName(displayName: string | undefined): { fullName: string; regNo: string } {
  if (!displayName) {
    return { fullName: '', regNo: '' };
  }

  const parts = displayName.split(',');
  if (parts.length >= 2) {
    return {
      fullName: parts[0].trim(),
      regNo: parts[1].trim()
    };
  }

  // Fallback for old format (just reg no)
  return {
    fullName: '',
    regNo: displayName.trim()
  };
}

/**
 * Get user's full name from user metadata
 * Tries display_name first (new format), then falls back to full_name
 */
export function getUserFullName(userMetadata: any): string {
  if (userMetadata?.display_name) {
    const parsed = parseUserDisplayName(userMetadata.display_name);
    if (parsed.fullName) {
      return parsed.fullName;
    }
  }
  
  return userMetadata?.full_name || userMetadata?.name || '';
}

/**
 * Get user's registration number from user metadata
 * Tries display_name first (new format), then falls back to reg_no
 */
export function getUserRegNo(userMetadata: any): string {
  if (userMetadata?.display_name) {
    const parsed = parseUserDisplayName(userMetadata.display_name);
    if (parsed.regNo) {
      return parsed.regNo;
    }
  }
  
  return userMetadata?.reg_no || '';
}
