import Link from "next/link";

export function Hero() {
  return (
    <>
    <section className="flex flex-col items-center gap-10 py-16 text-center">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xl">
          G8
        </div>
        <span className="text-3xl font-semibold tracking-tight">Mock Tests</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">
        Practice. Analyze. Ace the GATE.
      </h1>

      <p className="text-lg md:text-xl text-foreground/80 max-w-2xl">
        High–quality GATE style mock tests, smart analytics, and performance tracking
        to help you focus on what matters.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        <Link
          href="/protected/dash"
          className="px-6 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
        >
          Start Practicing
        </Link>
        <Link
          href="/syllabus"
            className="px-6 py-3 rounded-md border border-foreground/20 hover:border-foreground/40 font-medium transition"
        >
          View Syllabus
        </Link>
      </div>

      <div className="w-full max-w-3xl mt-12">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent rounded" />
      </div>
    </section>
    </>
  );
}
