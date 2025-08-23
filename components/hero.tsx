import Link from "next/link";
import Logo from "@/components/logo";
export function Hero() {
  return (
    <>
    <section className="flex flex-col mb-24 items-center gap-10 py-16 text-center">
      <div className="flex items-center gap-3">
        <Logo />        
      </div>

      <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">
        Mock Test Platform For Gate Exam 
      </h1>

      <p className="text-lg md:text-xl text-foreground/80 max-w-2xl">
        The G8 Mock Test Platform is an advanced online examination system specifically designed to support the students of Chennai Institute of Technology in preparing effectively for the GATE examination.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        <Link
          href="/protected/dash"
          className="px-6 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
        >
          Proceed!
        </Link>
        
      </div>



    </section>
    </>
  );
}
