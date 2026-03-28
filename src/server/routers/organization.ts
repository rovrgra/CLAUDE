import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

export const organizationRouter = router({
  get: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.organization.findUniqueOrThrow({
        where: { id: ctx.organizationId },
        include: { _count: { select: { patients: true, appointments: true } } },
      });
    }),

  update: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().max(200).optional(),
        timezone: z.string().max(200).optional(),
        businessType: z.string().max(200).optional(),
        businessHours: z.record(z.string(), z.object({ start: z.string(), end: z.string() })).optional(),
        phone: z.string().max(200).optional(),
        email: z.string().email().optional(),
        website: z.string().max(200).optional(),
        address: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, ...data } = input;
      return ctx.prisma.organization.update({
        where: { id: organizationId },
        data,
      });
    }),

  stats: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [patients, appointments, invoices] = await Promise.all([
        ctx.prisma.patient.count({ where: { organizationId: ctx.organizationId } }),
        ctx.prisma.appointment.count({
          where: {
            organizationId: ctx.organizationId,
            startTime: { gte: new Date() },
            status: { in: ["CONFIRMED", "PENDING"] },
          },
        }),
        ctx.prisma.invoice.aggregate({
          where: { organizationId: ctx.organizationId, status: "PAID" },
          _sum: { total: true },
        }),
      ]);

      return {
        totalPatients: patients,
        upcomingAppointments: appointments,
        totalRevenue: invoices._sum.total ?? 0,
      };
    }),

  notifications: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.notification.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }),

  markNotificationRead: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.update({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { isRead: true },
      });
    }),

  recentActivity: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [recentAppointments, recentPatients] = await Promise.all([
        ctx.prisma.appointment.findMany({
          where: { organizationId: ctx.organizationId },
          include: { patient: { select: { firstName: true, lastName: true } }, service: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        ctx.prisma.patient.findMany({
          where: { organizationId: ctx.organizationId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);
      return { recentAppointments, recentPatients };
    }),
});
