import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const personaRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.persona.findMany();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.persona.findUnique({
        where: {
          id: input.id,
        },
        include: {
          examples: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        toneRules: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.persona.create({
        data: {
          name: input.name,
          description: input.description,
          toneRules: input.toneRules,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        toneRules: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.persona.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          description: input.description,
          toneRules: input.toneRules,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.persona.delete({
        where: {
          id: input.id,
        },
      });
    }),

  addExample: protectedProcedure
    .input(
      z.object({
        personaId: z.string(),
        prompt: z.string(),
        response: z.string(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.example.create({
        data: {
          personaId: input.personaId,
          prompt: input.prompt,
          response: input.response,
          tags: input.tags || [],
        },
      });
    }),

  deleteExample: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.example.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
