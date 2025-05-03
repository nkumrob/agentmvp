import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const dataSourceRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dataSource.findMany({
        where: {
          agentId: input.agentId,
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dataSource.findUnique({
        where: {
          id: input.id,
        },
        include: {
          chunks: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        sourceType: z.string(),
        sourceUrl: z.string().optional(),
        content: z.string().optional(),
        agentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dataSource.create({
        data: {
          name: input.name,
          sourceType: input.sourceType,
          sourceUrl: input.sourceUrl,
          content: input.content,
          agentId: input.agentId,
          status: 'pending',
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        status: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dataSource.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          status: input.status,
          content: input.content,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dataSource.delete({
        where: {
          id: input.id,
        },
      });
    }),

  addChunk: protectedProcedure
    .input(
      z.object({
        dataSourceId: z.string(),
        content: z.string(),
        metadata: z.record(z.any()).optional(),
        embedding: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.chunk.create({
        data: {
          dataSourceId: input.dataSourceId,
          content: input.content,
          metadata: input.metadata,
          embedding: input.embedding,
        },
      });
    }),
});
