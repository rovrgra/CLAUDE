import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

export const appointmentRouter = router({
  list: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
        patientId: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.organizationId };
      if (input.status) where.status = input.status;
      if (input.patientId) where.patientId = input.patientId;
      if (input.startDate || input.endDate) {
        where.startTime = {};
        if (input.startDate) where.startTime.gte = new Date(input.startDate);
        if (input.endDate) where.startTime.lte = new Date(input.endDate);
      }

      const [appointments, total] = await Promise.all([
        ctx.prisma.appointment.findMany({
          where,
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
            service: { select: { id: true, name: true, color: true, duration: true } },
          },
          orderBy: { startTime: "asc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.prisma.appointment.count({ where }),
      ]);

      return { appointments, total };
    }),

  create: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        patientId: z.string(),
        serviceId: z.string().optional(),
        title: z.string().min(1),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        notes: z.string().optional(),
        status: z.enum(["PENDING", "CONFIRMED"]).default("CONFIRMED"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, ...data } = input;
      const appointment = await ctx.prisma.appointment.create({
        data: {
          ...data,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          organizationId,
        },
      });

      // Update patient's nextAppointment
      await ctx.prisma.patient.update({
        where: { id: input.patientId },
        data: { nextAppointment: new Date(input.startTime) },
      });

      return appointment;
    }),

  update: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        title: z.string().optional(),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
        status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _, id, ...data } = input;
      void _;
      return ctx.prisma.appointment.update({
        where: { id },
        data: {
          ...data,
          startTime: data.startTime ? new Date(data.startTime) : undefined,
          endTime: data.endTime ? new Date(data.endTime) : undefined,
        },
      });
    }),

  delete: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.appointment.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),

  services: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.service.findMany({
        where: { organizationId: ctx.organizationId, isActive: true },
        orderBy: { name: "asc" },
      });
    }),

  createService: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        duration: z.number().min(5),
        price: z.number().min(0),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, ...data } = input;
      return ctx.prisma.service.create({
        data: { ...data, organizationId },
      });
    }),
});
