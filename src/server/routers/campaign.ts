import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

export const campaignRouter = router({
  list: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        status: z.enum(["DRAFT", "SCHEDULED", "RUNNING", "COMPLETED", "CANCELLED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.organizationId };
      if (input.status) where.status = input.status;

      return ctx.prisma.campaign.findMany({
        where,
        include: { template: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(200),
        type: z.enum(["BROADCAST", "REACTIVATION", "REMINDER", "FOLLOW_UP", "PROMOTIONAL"]),
        channel: z.enum(["WHATSAPP", "EMAIL", "SMS"]).default("WHATSAPP"),
        content: z.string().max(5000).optional(),
        templateId: z.string().optional(),
        audienceFilter: z.record(z.string(), z.any()).optional(),
        scheduledAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, ...data } = input;
      return ctx.prisma.campaign.create({
        data: {
          ...data,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          organizationId,
        },
      });
    }),

  // Templates
  templates: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.messageTemplate.findMany({
        where: { organizationId: ctx.organizationId, isActive: true },
        orderBy: { name: "asc" },
      });
    }),

  createTemplate: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
        channel: z.enum(["WHATSAPP", "EMAIL", "SMS"]).default("WHATSAPP"),
        headerType: z.string().max(200).optional(),
        headerContent: z.string().max(5000).optional(),
        footer: z.string().max(5000).optional(),
        buttons: z.array(z.object({ type: z.string(), title: z.string(), url: z.string().optional() })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, ...data } = input;
      return ctx.prisma.messageTemplate.create({
        data: { ...data, organizationId },
      });
    }),

  // Automations
  automations: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.automation.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
      });
    }),

  createAutomation: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(200),
        description: z.string().max(5000).optional(),
        trigger: z.enum([
          "NEW_PATIENT", "APPOINTMENT_BOOKED", "APPOINTMENT_COMPLETED",
          "APPOINTMENT_NO_SHOW", "APPOINTMENT_CANCELLED", "PAYMENT_RECEIVED",
          "INVOICE_OVERDUE", "PATIENT_INACTIVE", "MESSAGE_RECEIVED", "CUSTOM_DATE",
        ]),
        triggerConfig: z.record(z.string(), z.any()),
        actions: z.array(z.record(z.string(), z.any())),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, ...data } = input;
      return ctx.prisma.automation.create({
        data: { ...data, organizationId },
      });
    }),
});
