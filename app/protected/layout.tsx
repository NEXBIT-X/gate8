import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { CoolFooter } from "@/components/cool-footer";
import { hasEnvVars } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ThemeSwitcher } from "@/components/theme-switcher";


export default function ProtectedLayout({ 
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
<<<<<<< HEAD
       <div className="flex-1 w-full flex flex-col gap-5 items-center">
=======
  <div className="flex-1 w-full flex flex-col gap-5 items-center">
>>>>>>> 3bd33b875b9c08690c073615a31bd9ecbc469d5d
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
<<<<<<< HEAD
        <div className="flex-1 flex flex-col gap-[16px] w-full max-w-6xl p-5 pt-0">
=======
  <div className="flex-1 flex flex-col gap-[16px] w-full max-w-6xl p-5 pt-0">
>>>>>>> 3bd33b875b9c08690c073615a31bd9ecbc469d5d
          <Breadcrumbs className="pl-1 pt-3.5" rootLabel="Dashboard" />
          {children}
        </div>

        <CoolFooter />
      </div>
    </main>
  );
}
