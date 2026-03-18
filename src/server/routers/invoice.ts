import { z } from "zod";
import { router, orgProcedure } from "@/server/trpc";

export const invoiceRouter = router({
  list: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        status: z.enum(["DRAFT", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED", "REFUNDED"]).optional(),
        patientId: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { organizationId: ctx.organizationId };
      if (input.status) where.status = input.status;
      if (input.patientId) where.patientId = input.patientId;

      const [invoices, total] = await Promise.all([
        ctx.prisma.invoice.findMany({
          where,
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { items: true, payments: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.prisma.invoice.count({ where }),
      ]);

      return { invoices, total, pages: Math.ceil(total / input.limit) };
    }),

  get: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.invoice.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          patient: true,
          items: { include: { service: true } },
          payments: true,
        },
      });
    }),

  create: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        patientId: z.string(),
        items: z.array(
          z.object({
            serviceId: z.string().optional(),
            description: z.string(),
            quantity: z.number().min(1).default(1),
            unitPrice: z.number().min(0),
          })
        ),
        notes: z.string().optional(),
        dueDate: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const tax = subtotal * 0.19; // IVA Chile 19%
      const total = subtotal + tax;

      // Generate invoice number
      const count = await ctx.prisma.invoice.count({ where: { organizationId: ctx.organizationId } });
      const number = `F-${String(count + 1).padStart(6, "0")}`;

      return ctx.prisma.invoice.create({
        data: {
          organizationId: ctx.organizationId,
          patientId: input.patientId,
          number,
          subtotal,
          tax,
          total,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              serviceId: item.serviceId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });
    }),

  addPayment: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        invoiceId: z.string(),
        amount: z.number().min(0),
        method: z.enum(["CASH", "CARD", "TRANSFER", "STRIPE", "MERCADOPAGO", "OTHER"]),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findUniqueOrThrow({
        where: { id: input.invoiceId },
        include: { payments: true },
      });

      const totalPaid =
        invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + input.amount;

      const payment = await ctx.prisma.payment.create({
        data: {
          invoiceId: input.invoiceId,
          patientId: invoice.patientId,
          amount: input.amount,
          method: input.method,
          status: "COMPLETED",
          reference: input.reference,
          notes: input.notes,
        },
      });

      // Update invoice status
      const newStatus = totalPaid >= Number(invoice.total) ? "PAID" : "PARTIALLY_PAID";
      await ctx.prisma.invoice.update({
        where: { id: input.invoiceId },
        data: { status: newStatus, paidAt: newStatus === "PAID" ? new Date() : undefined },
      });

      // Update patient balance
      await ctx.prisma.patient.update({
        where: { id: invoice.patientId },
        data: { lifetimeValue: { increment: input.amount } },
      });

      return payment;
    }),
});
