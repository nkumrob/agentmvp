import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <h1 className="text-2xl font-bold">Agennt</h1>
            </Link>
            <span className="text-sm bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
              Beta
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-6">Analytics Dashboard</h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
            This is a placeholder for the analytics dashboard feature page. The actual content will be implemented soon.
          </p>
          <div className="flex flex-col space-y-4 items-center">
            <Link href="/features">
              <Button variant="outline">Back to Features</Button>
            </Link>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 px-4">
        <div className="container mx-auto text-center text-sm text-neutral-600 dark:text-neutral-400">
          &copy; {new Date().getFullYear()} Agennt. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
