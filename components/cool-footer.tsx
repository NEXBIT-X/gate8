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
           The G8 Mock Test Platform is an advanced online examination system specifically designed to support the students of Chennai Institute of Technology in preparing effectively for the GATE examination.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-yellow-500" />
              created by <span>NEXBIT</span>
            </div>
          </div>

          {/* Quick Links */}
         
          {/* Resources */}
          
        </div>

        {/* Divider */}
        <div className="border-t border-foreground/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span> G8 Mock Test Platform</span>
            </div>
          </div>


        </div>
      </div>
    </footer>
  );
}
