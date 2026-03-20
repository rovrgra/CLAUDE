import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

const staffRoles = z.enum([
  "MANAGER", "CHEF", "COOK", "WAITER", "BARTENDER", "CASHIER", "HOST", "DELIVERY", "CLEANER",
]);

export const staffRouter = router({
  // List staff, filter by role and isActive
  list: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      role: staffRoles.optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.organizationId };
      if (input.role) where.role = input.role;
      if (input.isActive !== undefined) where.isActive = input.isActive;

      return ctx.prisma.staff.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
      });
    }),

  // Get single staff with shifts
  get: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.staff.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          shifts: {
            orderBy: { date: "desc" },
            take: 30,
          },
        },
      });
    }),

  // Create staff member
  create: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      rut: z.string().optional(),
      avatar: z.string().optional(),
      role: staffRoles.default("WAITER"),
      pin: z.string().max(4).optional(),
      salary: z.number().optional(),
      salaryType: z.enum(["monthly", "hourly"]).optional(),
      hiredAt: z.string().optional(), // ISO date
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, hiredAt, ...data } = input;
      void _orgId;

      return ctx.prisma.staff.create({
        data: {
          organizationId: ctx.organizationId,
          ...data,
          ...(hiredAt ? { hiredAt: new Date(hiredAt) } : {}),
        },
      });
    }),

  // Update staff member
  update: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      id: z.string(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
      rut: z.string().optional().nullable(),
      avatar: z.string().optional().nullable(),
      role: staffRoles.optional(),
      pin: z.string().max(4).optional().nullable(),
      isActive: z.boolean().optional(),
      salary: z.number().optional().nullable(),
      salaryType: z.enum(["monthly", "hourly"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, id, ...data } = input;
      void _orgId;

      return ctx.prisma.staff.update({
        where: { id },
        data,
      });
    }),

  // Soft-delete: set isActive=false, terminatedAt
  deactivate: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.staff.update({
        where: { id: input.id },
        data: {
          isActive: false,
          terminatedAt: new Date(),
        },
      });
    }),

  // Record a shift
  addShift: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      staffId: z.string(),
      date: z.string(), // ISO date
      startTime: z.string(), // ISO datetime
      endTime: z.string().optional(), // ISO datetime
      breakMinutes: z.number().default(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.shift.create({
        data: {
          staffId: input.staffId,
          organizationId: ctx.organizationId,
          date: new Date(input.date),
          startTime: new Date(input.startTime),
          endTime: input.endTime ? new Date(input.endTime) : undefined,
          breakMinutes: input.breakMinutes,
          notes: input.notes,
        },
        include: { staff: true },
      });
    }),

  // Get today's scheduled shifts
  todayShifts: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 86400000);

      return ctx.prisma.shift.findMany({
        where: {
          organizationId: ctx.organizationId,
          date: { gte: today, lt: tomorrow },
        },
        include: { staff: true },
        orderBy: { startTime: "asc" },
      });
    }),
});
