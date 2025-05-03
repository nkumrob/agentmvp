import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const analyticsRouter = createTRPCRouter({
  getByAgentId: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.analytics.findFirst({
        where: {
          agentId: input.agentId,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        queryCount: z.number().optional(),
        responseTime: z.number().optional(),
        satisfactionScore: z.number().optional(),
        contentGaps: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.analytics.create({
        data: {
          agentId: input.agentId,
          queryCount: input.queryCount || 0,
          responseTime: input.responseTime,
          satisfactionScore: input.satisfactionScore,
          contentGaps: input.contentGaps,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        queryCount: z.number().optional(),
        responseTime: z.number().optional(),
        satisfactionScore: z.number().optional(),
        contentGaps: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.analytics.update({
        where: {
          id: input.id,
        },
        data: {
          queryCount: input.queryCount,
          responseTime: input.responseTime,
          satisfactionScore: input.satisfactionScore,
          contentGaps: input.contentGaps,
        },
      });
    }),

  incrementQueryCount: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const analytics = await ctx.prisma.analytics.findFirst({
        where: {
          agentId: input.agentId,
        },
      });

      if (analytics) {
        return ctx.prisma.analytics.update({
          where: {
            id: analytics.id,
          },
          data: {
            queryCount: {
              increment: 1,
            },
          },
        });
      } else {
        return ctx.prisma.analytics.create({
          data: {
            agentId: input.agentId,
            queryCount: 1,
          },
        });
      }
    }),
});
