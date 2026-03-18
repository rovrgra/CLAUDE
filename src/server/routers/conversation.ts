import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

export const conversationRouter = router({
  list: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        status: z.enum(["OPEN", "PENDING", "RESOLVED", "ARCHIVED"]).optional(),
        channel: z.enum(["WHATSAPP", "EMAIL", "SMS", "WEB_CHAT", "INSTAGRAM", "FACEBOOK"]).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.organizationId };
      if (input.status) where.status = input.status;
      if (input.channel) where.channel = input.channel;

      const [conversations, total] = await Promise.all([
        ctx.prisma.conversation.findMany({
          where,
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, avatar: true, phone: true } },
            assignedTo: { include: { user: { select: { name: true, avatar: true } } } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { lastMessageAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.prisma.conversation.count({ where }),
      ]);

      return { conversations, total };
    }),

  get: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.conversation.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          patient: true,
          assignedTo: { include: { user: { select: { name: true, avatar: true } } } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
    }),

  sendMessage: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        conversationId: z.string(),
        content: z.string().min(1),
        type: z.enum(["TEXT", "IMAGE", "AUDIO", "VIDEO", "DOCUMENT"]).default("TEXT"),
        mediaUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          direction: "OUTBOUND",
          sender: "AGENT",
          senderId: ctx.member.id,
          type: input.type,
          content: input.content,
          mediaUrl: input.mediaUrl,
        },
      });

      await ctx.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      });

      return message;
    }),

  updateStatus: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        status: z.enum(["OPEN", "PENDING", "RESOLVED", "ARCHIVED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.conversation.update({
        where: { id: input.id },
        data: {
          status: input.status,
          resolvedAt: input.status === "RESOLVED" ? new Date() : undefined,
        },
      });
    }),

  assign: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        memberId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.conversation.update({
        where: { id: input.id },
        data: { assignedToId: input.memberId, aiHandedOff: input.memberId !== null },
      });
    }),

  toggleAi: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        id: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.conversation.update({
        where: { id: input.id },
        data: { aiEnabled: input.enabled },
      });
    }),
});
