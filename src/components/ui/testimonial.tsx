"use client";

import React from "react";
import { QuoteIcon } from "./icons";
import { cn } from "@/lib/utils";

interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
  company?: string;
  className?: string;
}

export function Testimonial({
  quote,
  author,
  role,
  company,
  className,
}: TestimonialProps) {
  return (
    <div
      className={cn(
        "relative p-6 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 shadow-sm",
        className
      )}
    >
      <div className="absolute -top-3 left-6 bg-white dark:bg-neutral-950 p-1">
        <QuoteIcon className="h-5 w-5 text-neutral-400" />
      </div>
      <blockquote className="mt-2">
        <p className="text-neutral-700 dark:text-neutral-300 italic">{quote}</p>
        <footer className="mt-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-sm font-medium">
              {author.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{author}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {role}
                {company && ` @ ${company}`}
              </p>
            </div>
          </div>
        </footer>
      </blockquote>
    </div>
  );
}

export function TestimonialGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
  );
}
