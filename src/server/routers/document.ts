import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

export const documentRouter = router({
  list: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        type: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.organizationId };
      if (input.type) where.type = input.type;

      return ctx.prisma.document.findMany({
        where,
        orderBy: { updatedAt: "desc" },
      });
    }),

  create: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        type: z.string(),
        content: z.string().min(1),
        fileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, ...data } = input;
      return ctx.prisma.document.create({
        data: { ...data, organizationId },
      });
    }),

  update: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        name: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _, id, ...data } = input;
      return ctx.prisma.document.update({ where: { id }, data });
    }),

  delete: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.document.delete({ where: { id: input.id } });
    }),
});
