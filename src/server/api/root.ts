import { createTRPCRouter } from './trpc';
import { agentRouter } from './routers/agent';
import { personaRouter } from './routers/persona';
import { dataSourceRouter } from './routers/dataSource';
import { chatRouter } from './routers/chat';
import { analyticsRouter } from './routers/analytics';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  agent: agentRouter,
  persona: personaRouter,
  dataSource: dataSourceRouter,
  chat: chatRouter,
  analytics: analyticsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
