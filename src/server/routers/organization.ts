import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

export const organizationRouter = router({
  get: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.organization.findUniqueOrThrow({
        where: { id: ctx.organizationId },
        include: { _count: { select: { patients: true, conversations: true, appointments: true } } },
      });
    }),

  update: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().optional(),
        timezone: z.string().optional(),
        businessType: z.string().optional(),
        businessHours: z.any().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        aiAgentName: z.string().optional(),
        aiAgentPersonality: z.string().optional(),
        aiAgentInstructions: z.string().optional(),
        aiAutoReply: z.boolean().optional(),
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
      const [patients, conversations, appointments, invoices] = await Promise.all([
        ctx.prisma.patient.count({ where: { organizationId: ctx.organizationId } }),
        ctx.prisma.conversation.count({
          where: { organizationId: ctx.organizationId, status: "OPEN" },
        }),
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
        openConversations: conversations,
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
        where: { id: input.id },
        data: { isRead: true },
      });
    }),

  recentActivity: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      const [recentAppointments, recentConversations, recentPatients] = await Promise.all([
        ctx.prisma.appointment.findMany({
          where: { organizationId: ctx.organizationId },
          include: { patient: { select: { firstName: true, lastName: true } }, service: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        ctx.prisma.conversation.findMany({
          where: { organizationId: ctx.organizationId },
          include: { patient: { select: { firstName: true, lastName: true } } },
          orderBy: { lastMessageAt: "desc" },
          take: 5,
        }),
        ctx.prisma.patient.findMany({
          where: { organizationId: ctx.organizationId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);
      return { recentAppointments, recentConversations, recentPatients };
    }),
});
