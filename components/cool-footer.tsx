import { Github, Twitter, Linkedin, Mail, Zap, Heart } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "./theme-switcher";
import Logo from "./logo";
export function CoolFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-foreground/10 bg-background/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Logo/>
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              Advanced examination platform built with Next.js, Supabase, and modern web technologies. 
              Empowering students and educators with seamless testing experiences.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Built with cutting-edge technology</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/protected/dash" className="hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-foreground transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/auth/sign-up" className="hover:text-foreground transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/protected/debug" className="hover:text-foreground transition-colors">
                  System Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Built With</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a 
                  href="https://nextjs.org/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Next.js 
                </a>
              </li>
              <li>
                <a 
                  href="https://supabase.com/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Supabase 
                </a>
              </li>
              <li>
                <a 
                  href="https://tailwindcss.com/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Tailwind CSS
                </a>
              </li>
              <li>
                <a 
                  href="https://ui.shadcn.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  shadcn/ui
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-foreground/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>© {currentYear} G8 Exam System. Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span>by NEXBIT</span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <Github className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <Twitter className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <Linkedin className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </a>
              <a
                href="mailto:contact@g8exam.com"
                className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <Mail className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </a>
            </div>
          </div>

          {/* Tech Stack Badge */}
          <div className="mt-6 pt-4 border-t border-foreground/10">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-1 rounded-full bg-muted/50">Next.js 15</span>
              <span className="px-2 py-1 rounded-full bg-muted/50">React 19</span>
              <span className="px-2 py-1 rounded-full bg-muted/50">TypeScript</span>
              <span className="px-2 py-1 rounded-full bg-muted/50">Supabase</span>
              <span className="px-2 py-1 rounded-full bg-muted/50">Tailwind CSS</span>
              <span className="px-2 py-1 rounded-full bg-muted/50">Lucide Icons</span>
             <ThemeSwitcher/>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
