import { z } from "zod";
import { hash } from "bcryptjs";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        organizationName: z.string().min(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw new Error("Email already registered");

      const passwordHash = await hash(input.password, 12);
      const slug = input.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const user = await ctx.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          members: {
            create: {
              role: "OWNER",
              organization: {
                create: {
                  name: input.organizationName,
                  slug: `${slug}-${Date.now().toString(36)}`,
                },
              },
            },
          },
        },
        include: { members: { include: { organization: true } } },
      });

      return { user: { id: user.id, email: user.email, name: user.name } };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      include: {
        members: {
          where: { isActive: true },
          include: { organization: { select: { id: true, name: true, slug: true, plan: true } } },
        },
      },
    });
    return user;
  }),
});
