"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function UserButton({ afterSignOutUrl = "/" }: { afterSignOutUrl?: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSignOut = () => {
    // In a real app, this would sign the user out
    router.push(afterSignOutUrl);
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 text-sm font-medium"
      >
        U
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-white dark:bg-neutral-900 shadow-lg border border-neutral-200 dark:border-neutral-800 py-1 z-10">
          <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
            <p className="text-sm font-medium">Demo User</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">user@example.com</p>
          </div>
          <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Profile
          </Link>
          <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
