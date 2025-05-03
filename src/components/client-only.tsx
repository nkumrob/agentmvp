"use client";

import { useEffect, useState, ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders its children on the client side
 * This prevents hydration errors by ensuring the component is only rendered in the browser
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  // Set hasMounted to true on client-side only
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // If we're still in SSR (not mounted yet), render the fallback
  if (!hasMounted) {
    return <>{fallback}</>;
  }

  // Client-side, render the children
  return <>{children}</>;
}
