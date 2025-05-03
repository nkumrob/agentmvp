import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const chatRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.chat.findMany({
        where: {
          agentId: input.agentId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.chat.findUnique({
        where: {
          id: input.id,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        agentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.chat.create({
        data: {
          title: input.title || 'New Chat',
          agentId: input.agentId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.chat.update({
        where: {
          id: input.id,
        },
        data: {
          title: input.title,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.chat.delete({
        where: {
          id: input.id,
        },
      });
    }),

  addMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        content: z.string(),
        role: z.string(),
        citations: z.record(z.any()).array().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.message.create({
        data: {
          chatId: input.chatId,
          content: input.content,
          role: input.role,
          citations: input.citations,
        },
      });
    }),
});
