import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const agentRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.agent.findMany({
      where: {
        userId: ctx.userId,
      },
      include: {
        persona: true,
      },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.agent.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          persona: true,
          dataSources: true,
          modelConfig: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        personaId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.agent.create({
        data: {
          name: input.name,
          description: input.description,
          userId: ctx.userId,
          personaId: input.personaId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        personaId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.agent.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          description: input.description,
          personaId: input.personaId,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.agent.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
