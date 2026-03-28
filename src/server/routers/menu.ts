import { z } from "zod";
import { router, orgProcedure, publicProcedure } from "@/server/trpc";

export const menuRouter = router({
  // --- Categories ---
  categories: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx }) => {
      return ctx.prisma.menuCategory.findMany({
        where: { organizationId: ctx.organizationId },
        include: { items: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      });
    }),

  createCategory: orgProcedure
    .input(z.object({
      organizationId: z.string(),
      name: z.string(), description: z.string().optional(),
      image: z.string().optional(), sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, ...data } = input;
      void _orgId;
      return ctx.prisma.menuCategory.create({ data: { organizationId: ctx.organizationId, ...data } });
    }),

  updateCategory: orgProcedure
    .input(z.object({
      organizationId: z.string(), id: z.string(),
      name: z.string().optional(), description: z.string().optional(),
      image: z.string().optional(), sortOrder: z.number().optional(), isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, id, ...data } = input;
      void _orgId;
      return ctx.prisma.menuCategory.update({ where: { id, organizationId: ctx.organizationId }, data });
    }),

  deleteCategory: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.menuCategory.delete({ where: { id: input.id, organizationId: ctx.organizationId } });
    }),

  // --- Menu Items ---
  items: orgProcedure
    .input(z.object({ organizationId: z.string(), categoryId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.menuItem.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        },
        include: { category: true, modifierGroups: { include: { modifiers: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      });
    }),

  createItem: orgProcedure
    .input(z.object({
      organizationId: z.string(), categoryId: z.string(),
      name: z.string(), description: z.string().optional(), image: z.string().optional(),
      price: z.number(), comparePrice: z.number().optional(),
      preparationTime: z.number().optional(), calories: z.number().optional(),
      isFeatured: z.boolean().optional(), sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, ...data } = input;
      void _orgId;
      return ctx.prisma.menuItem.create({ data: { organizationId: ctx.organizationId, ...data } });
    }),

  updateItem: orgProcedure
    .input(z.object({
      organizationId: z.string(), id: z.string(),
      name: z.string().optional(), description: z.string().optional(),
      price: z.number().optional(), comparePrice: z.number().optional(),
      isActive: z.boolean().optional(), isAvailable: z.boolean().optional(),
      isFeatured: z.boolean().optional(), preparationTime: z.number().optional(),
      sortOrder: z.number().optional(), image: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId: _orgId, id, ...data } = input;
      void _orgId;
      return ctx.prisma.menuItem.update({ where: { id, organizationId: ctx.organizationId }, data });
    }),

  toggleAvailability: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.menuItem.findUniqueOrThrow({ where: { id: input.id, organizationId: ctx.organizationId } });
      return ctx.prisma.menuItem.update({ where: { id: input.id, organizationId: ctx.organizationId }, data: { isAvailable: !item.isAvailable } });
    }),

  deleteItem: orgProcedure
    .input(z.object({ organizationId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.menuItem.delete({ where: { id: input.id, organizationId: ctx.organizationId } });
    }),

  // --- Public menu (for QR ordering) ---
  publicMenu: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUniqueOrThrow({
        where: { slug: input.slug },
        select: { id: true, name: true, logo: true, address: true, phone: true, businessHours: true },
      });

      const categories = await ctx.prisma.menuCategory.findMany({
        where: { organizationId: org.id, isActive: true },
        include: {
          items: {
            where: { isActive: true },
            include: { modifierGroups: { include: { modifiers: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } } },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      return { organization: org, categories };
    }),
});
