import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Fix for "PrismaClient did not initialize yet" error
let prisma: PrismaClient;

if (typeof window === "undefined") {
  if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient({
      log: ["error"],
    });
  } else {
    if (!global.prisma) {
      global.prisma = new PrismaClient({
        log: ["query", "error", "warn"],
      });
    }
    prisma = global.prisma;
  }
}

// @ts-expect-error - Export for Next.js API routes
export { prisma };
