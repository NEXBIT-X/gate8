import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { CoolFooter } from "@/components/cool-footer";
import { hasEnvVars } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10">
          <div className="w-full max-w-6xl flex flex-col gap-1 p-3 px-5">
            <div className="flex justify-between items-center text-sm">
              <div className="flex gap-5 items-center font-semibold">
                <Logo />
              </div>
              {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            </div>
          
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 w-full max-w-6xl p-5">
            <Breadcrumbs className="pl-1" rootLabel="Dashboard" />
          {children}
        </div>

        <CoolFooter />
      </div>
    </main>
  );
}
