import Link from "next/link";

export function Hero() {
    return (
        <div className="flex flex-col gap-8 items-center text-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Gate8 Test Platform
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
                AI-powered test and quiz platform with advanced security features and LaTeX support
            </p>
            <div className="flex gap-4">
                <Link
                    href="/auth/sign-up"
                    className="px-6 py-3 bg-foreground text-background rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                    Get Started
                </Link>
                <Link
                    href="/auth/login"
                    className="px-6 py-3 border border-foreground/20 rounded-lg font-semibold hover:bg-foreground/5 transition-colors"
                >
                    Sign In
                </Link>
            </div>
        </div>
    );
}
