import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

export const tableRouter = router({
  list: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.table.findMany({
        where: { organizationId: ctx.organizationId, isActive: true },
        include: {
          orders: {
            where: { status: { in: ["RECEIVED", "CONFIRMED", "PREPARING", "READY", "DELIVERED"] } },
            include: { items: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { number: "asc" },
      });
    }),

  create: orgProcedure
    .input(z.object({
      organizationId: z.string(), number: z.number(),
      name: z.string().optional(), section: z.string().optional(),
      capacity: z.number().optional(), shape: z.string().optional(),
      posX: z.number().optional(), posY: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, ...data } = input;
      void _orgId;
      return ctx.prisma.table.create({ data: { organizationId: ctx.organizationId, ...data } });
    }),

  update: orgProcedure
    .input(z.object({
      organizationId: z.string(), id: z.string(),
      name: z.string().optional(), section: z.string().optional(),
      capacity: z.number().optional(), status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "BLOCKED"]).optional(),
      posX: z.number().optional(), posY: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, id, ...data } = input;
      void _orgId;
      return ctx.prisma.table.update({ where: { id }, data });
    }),

  updateStatus: orgProcedure
    .input(z.object({
      organizationId: z.string(), id: z.string(),
      status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "BLOCKED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.table.update({ where: { id: input.id }, data: { status: input.status } });
    }),

  delete: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.table.update({ where: { id: input.id }, data: { isActive: false } });
    }),
});
