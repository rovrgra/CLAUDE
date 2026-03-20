import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

export const patientRouter = router({
  list: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        search: z.string().optional(),
        status: z.enum(["LEAD", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.organizationId };
      if (input.status) where.status = input.status;
      if (input.search) {
        where.OR = [
          { firstName: { contains: input.search, mode: "insensitive" } },
          { lastName: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
          { phone: { contains: input.search } },
        ];
      }

      const [patients, total] = await Promise.all([
        ctx.prisma.patient.findMany({
          where,
          include: { tags: { include: { tag: true } }, _count: { select: { appointments: true } } },
          orderBy: { updatedAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.prisma.patient.count({ where }),
      ]);

      return { patients, total, pages: Math.ceil(total / input.limit) };
    }),

  get: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.patient.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          tags: { include: { tag: true } },
          appointments: { orderBy: { startTime: "desc" }, take: 10 },
          invoices: { orderBy: { createdAt: "desc" }, take: 10 },
          conversations: { orderBy: { lastMessageAt: "desc" }, take: 5 },
          customFieldValues: { include: { customField: true } },
          documents: { orderBy: { createdAt: "desc" } },
        },
      });
    }),

  create: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        rut: z.string().optional(),
        dateOfBirth: z.string().datetime().optional(),
        gender: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
        dietaryRestrictions: z.string().optional(),
        medications: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, ...data } = input;
      return ctx.prisma.patient.create({
        data: {
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          organizationId,
        },
      });
    }),

  update: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        status: z.enum(["LEAD", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
        notes: z.string().optional(),
        dietaryRestrictions: z.string().optional(),
        medications: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId: _orgId, ...updateData } = input;
      void _orgId;
      return ctx.prisma.patient.update({ where: { id, organizationId: ctx.organizationId }, data: updateData });
    }),

  delete: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.patient.delete({ where: { id: input.id, organizationId: ctx.organizationId } });
    }),
});
