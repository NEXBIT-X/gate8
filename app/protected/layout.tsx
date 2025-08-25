import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ConditionalFooter } from "@/components/conditional-footer";
import { ConditionalBreadcrumbs } from "@/components/conditional-breadcrumbs";
import { hasEnvVars } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";


export default function ProtectedLayout({ 
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-5 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 min-h-[64px] text-base">
          <div className="w-full max-w-6xl flex flex-col gap-1 p-5 px-7">
            <div className="flex justify-between items-center text-sm">
              <div className="flex gap-5 items-center font-semibold">
                <Logo />
              </div>
              {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            </div>
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-[16px] w-full max-w-6xl p-5 pt-0">
          <ConditionalBreadcrumbs />
          {children}
        </div>
        <ConditionalFooter />
      </div>
    </main>
  );
}
