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
              GATE Mock Test Platform is an advanced online examination system designed for students and educators preparing for the GATE exam. 
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>NEXBIT</span>
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
          
        </div>

        {/* Divider */}
        <div className="border-t border-foreground/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>© {currentYear} GATE Mock Test Platform</span>
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


        </div>
      </div>
    </footer>
  );
}
