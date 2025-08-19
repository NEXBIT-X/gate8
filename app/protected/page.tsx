import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, TrendingUp, Users, Target, BookOpen, BarChart3 } from 'lucide-react';

const links = [
  { href: "/protected/dash", label: "Dash" },
  { href: "/protected/admin", label: "Admin" },
  { href: "/protected/admin/debug", label: "Debug" },
  { href: "/protected/admin/create", label: "Question Creation" },
  { href: "/protected/admin/ai-question-import", label: "AI Parser" },
];

export function TestLinks() {
  return (
    <nav
     className="flex flex-col"
    >
      {links.map(l => (
        <Link
          key={l.href}
          href={l.href}
          className="text-4xl text-ellipsis hover:text-violet-500"
          style={{ textDecoration: "none" }}
          prefetch={false}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export default async function ProtectedPage() {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Check if user is admin
  const allowedEmails = [
    "abhijeethvn2006@gmail.com",
    "pavan03062006@gmail.com", 
    "devash217@gmail.com",
    "b.lakshminarayanan2007@gmail.com"
  ];

  if (!allowedEmails.includes(user.email || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access this area. This section is restricted to administrators only.
          </p>
          <div className="space-y-4">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
            >
              Sign In with Different Account
            </Link>
            <div>
              <Link 
                href="/" 
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <TestLinks />;
}
