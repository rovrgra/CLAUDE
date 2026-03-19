import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const passwordHash = await hash("admin1234", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@restobot.cl" },
    update: {},
    create: {
      email: "admin@restobot.cl",
      name: "Carlos Soto",
      passwordHash,
    },
  });

  // Create organization (restaurant)
  const org = await prisma.organization.upsert({
    where: { slug: "la-brasa-chilena" },
    update: {},
    create: {
      name: "La Brasa Chilena",
      slug: "la-brasa-chilena",
      timezone: "America/Santiago",
      country: "CL",
      currency: "CLP",
      phone: "+56 2 2345 6789",
      email: "contacto@labrasachilena.cl",
      address: "Av. Providencia 1234, Santiago",
      businessType: "restaurant",
      aiAgentName: "BrasaBot",
      aiAgentPersonality: "cercano, amable y entusiasta con la comida",
      aiAgentInstructions: "Siempre sugiere los platos del día y el postre. Ofrece reservar mesa cuando pregunten por disponibilidad. Menciona que tenemos terraza y estacionamiento.",
      aiAutoReply: true,
    },
  });

  // Link user to org as owner
  await prisma.member.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: "OWNER",
    },
  });

  // Create menu items (as services)
  const menuItems = await Promise.all([
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Lomo a lo pobre", description: "Lomo vetado con papas fritas, cebolla caramelizada y huevos fritos",
        duration: 30, price: 14990, color: "#ef4444",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Pastel de choclo", description: "Pastel de choclo tradicional con pino de carne",
        duration: 25, price: 9990, color: "#f59e0b",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Ceviche mixto", description: "Pescado y camarones en limón con cebolla morada y cilantro",
        duration: 15, price: 11990, color: "#10b981",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Parrillada para 2", description: "Entraña, chorizo, pollo, ensaladas y papas",
        duration: 40, price: 29990, color: "#8b5cf6",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Empanadas de pino (3 unidades)", description: "Empanadas al horno con carne, huevo, aceituna y pasas",
        duration: 15, price: 5990, color: "#6366f1",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Ensalada César", description: "Lechuga romana, pollo grillado, crutones, parmesano y aderezo César",
        duration: 10, price: 7990, color: "#22c55e",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Pisco Sour", description: "Pisco, limón de pica, azúcar, clara de huevo y amargo de angostura",
        duration: 5, price: 5990, color: "#eab308",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Tres leches", description: "Bizcocho bañado en tres leches con merengue tostado",
        duration: 10, price: 5490, color: "#ec4899",
      },
    }),
  ]);

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { organizationId: org.id, name: "VIP", color: "#f59e0b" } }),
    prisma.tag.create({ data: { organizationId: org.id, name: "Delivery", color: "#8b5cf6" } }),
    prisma.tag.create({ data: { organizationId: org.id, name: "Empresa", color: "#10b981" } }),
  ]);

  // Create clients
  const clients = await Promise.all([
    prisma.patient.create({
      data: {
        organizationId: org.id, firstName: "María", lastName: "González",
        email: "maria@email.com", phone: "+56912345678",
        source: "whatsapp", status: "ACTIVE", score: 85,
        medicalNotes: "Prefiere mesa en terraza. Alérgica al maní.",
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id, firstName: "Juan", lastName: "Pérez",
        email: "juan@email.com", phone: "+56987654321",
        source: "whatsapp", status: "ACTIVE", score: 60,
        medicalNotes: "Cliente frecuente de delivery. Pide parrillada los viernes.",
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id, firstName: "Ana", lastName: "Silva",
        email: "ana@email.com", phone: "+56911112222",
        source: "whatsapp", status: "LEAD", score: 30,
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id, firstName: "Pedro", lastName: "Muñoz",
        phone: "+56933334444", source: "walk-in", status: "ACTIVE", score: 70,
        medicalNotes: "Viene con equipo de trabajo (8-10 personas). Reserva los jueves.",
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id, firstName: "Camila", lastName: "Torres",
        email: "camila@email.com", phone: "+56955556666",
        source: "whatsapp", status: "ACTIVE", score: 90,
      },
    }),
  ]);

  // Assign tags
  await prisma.patientTag.create({ data: { patientId: clients[4].id, tagId: tags[0].id } }); // Camila - VIP
  await prisma.patientTag.create({ data: { patientId: clients[1].id, tagId: tags[1].id } }); // Juan - Delivery
  await prisma.patientTag.create({ data: { patientId: clients[3].id, tagId: tags[2].id } }); // Pedro - Empresa

  // Create reservations (appointments)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(20, 0, 0, 0);

  await Promise.all([
    prisma.appointment.create({
      data: {
        organizationId: org.id, patientId: clients[0].id,
        title: "Mesa para 4 - Terraza", startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 120 * 60000), status: "CONFIRMED",
        notes: "Cumpleaños. Pedir torta.",
      },
    }),
    prisma.appointment.create({
      data: {
        organizationId: org.id, patientId: clients[3].id,
        title: "Mesa para 10 - Salón privado",
        startTime: new Date(tomorrow.getTime() + 60 * 60000),
        endTime: new Date(tomorrow.getTime() + 180 * 60000), status: "CONFIRMED",
        notes: "Cena de trabajo. Menú ejecutivo.",
      },
    }),
    prisma.appointment.create({
      data: {
        organizationId: org.id, patientId: clients[4].id,
        title: "Mesa para 2",
        startTime: new Date(tomorrow.getTime() - 60 * 60000),
        endTime: new Date(tomorrow.getTime() + 60 * 60000), status: "PENDING",
      },
    }),
  ]);

  // Create a sample conversation
  const conversation = await prisma.conversation.create({
    data: {
      organizationId: org.id, patientId: clients[2].id,
      channel: "WHATSAPP", channelId: "+56911112222",
      status: "OPEN", aiEnabled: true,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id, direction: "INBOUND", sender: "PATIENT",
        type: "TEXT", content: "Hola! Tienen mesa disponible para hoy en la noche? Somos 4",
        createdAt: new Date(now.getTime() - 3600000),
      },
      {
        conversationId: conversation.id, direction: "OUTBOUND", sender: "AI",
        type: "TEXT", aiGenerated: true, aiConfidence: 0.92,
        content: "¡Hola Ana! 🍽️ Sí, tenemos disponibilidad para 4 personas esta noche. ¿A qué hora les gustaría venir? Tenemos mesas a las 20:00 y 21:00. ¡Hoy nuestro plato del día es el Lomo a lo pobre! 🥩",
        createdAt: new Date(now.getTime() - 3500000),
      },
      {
        conversationId: conversation.id, direction: "INBOUND", sender: "PATIENT",
        type: "TEXT", content: "A las 20:30 se puede? Y tienen terraza?",
        createdAt: new Date(now.getTime() - 1800000),
      },
    ],
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(now.getTime() - 1800000) },
  });

  // Create documents for the knowledge base
  await prisma.document.create({
    data: {
      organizationId: org.id, name: "Carta completa", type: "menu",
      content: `CARTA - La Brasa Chilena

🥟 ENTRADAS
Empanadas de pino (3 unidades): $5.990
Ceviche mixto: $11.990
Tabla de quesos y fiambres: $12.990
Provoleta a la parrilla: $7.990

🥩 PLATOS DE FONDO
Lomo a lo pobre: $14.990
Pastel de choclo: $9.990
Parrillada para 2: $29.990
Costillar BBQ: $16.990
Salmón grillado: $15.990
Pollo al disco: $11.990

🥗 ENSALADAS
Ensalada César: $7.990
Ensalada chilena: $4.990
Ensalada mediterránea: $8.990

🍰 POSTRES
Tres leches: $5.490
Flan casero: $4.490
Volcán de chocolate: $6.990

🍹 BEBIDAS
Pisco Sour: $5.990
Limonada casera: $3.490
Cerveza artesanal: $4.990
Copa de vino (carta): desde $4.990
Bebida/Agua: $1.990

Todos los precios incluyen IVA.`,
    },
  });

  await prisma.document.create({
    data: {
      organizationId: org.id, name: "Info del restaurante", type: "faq",
      content: `INFORMACIÓN - La Brasa Chilena

📍 Ubicación: Av. Providencia 1234, Santiago. Metro Manuel Montt.

🕐 Horario:
- Lunes a jueves: 12:30 - 23:00
- Viernes y sábado: 12:30 - 00:00
- Domingo: 12:30 - 22:00

🅿️ Estacionamiento gratuito para clientes.

🌿 Terraza disponible (sujeto a clima y disponibilidad).

🚗 Delivery: Disponible por WhatsApp. Radio de 5 km. Pedido mínimo $15.000.
Tiempo estimado: 30-45 minutos.

💳 Medios de pago: Efectivo, tarjeta débito/crédito, transferencia.

👨‍👩‍👧‍👦 Salón privado: Capacidad 20 personas. Ideal para eventos y cenas de empresa. Consultar menú especial.

🎂 Cumpleaños: Torta de cortesía para reservas de 6+ personas (avisar al reservar).

🚫 Alergias: Informar al momento de pedir. Tenemos opciones sin gluten y vegetarianas.

📲 Reservas: Por WhatsApp o llamando al +56 2 2345 6789.`,
    },
  });

  // Create a sample order (invoice)
  await prisma.invoice.create({
    data: {
      organizationId: org.id, patientId: clients[1].id,
      number: "P-000001", status: "PAID",
      subtotal: 50970, tax: 9684, discount: 0, total: 60654,
      paidAt: new Date(now.getTime() - 86400000 * 2),
      items: {
        createMany: {
          data: [
            { serviceId: menuItems[3].id, description: "Parrillada para 2", quantity: 1, unitPrice: 29990, total: 29990 },
            { serviceId: menuItems[6].id, description: "Pisco Sour", quantity: 2, unitPrice: 5990, total: 11980 },
            { serviceId: menuItems[4].id, description: "Empanadas de pino (3)", quantity: 1, unitPrice: 5990, total: 5990 },
            { description: "Agua mineral", quantity: 2, unitPrice: 1990, total: 3980 },
          ],
        },
      },
      payments: {
        create: {
          patientId: clients[1].id, amount: 60654,
          method: "CARD", status: "COMPLETED",
        },
      },
    },
  });

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        organizationId: org.id, type: "new_message",
        title: "Nuevo mensaje de Ana Silva",
        body: "A las 20:30 se puede? Y tienen terraza?",
        data: {},
      },
      {
        organizationId: org.id, type: "new_reservation",
        title: "Nueva reserva confirmada",
        body: "María González - Mesa para 4, mañana 20:00 (Terraza)",
        isRead: true,
        data: {},
      },
    ],
  });

  console.log("Seed completed!");
  console.log("");
  console.log("Login credentials:");
  console.log("  Email: admin@restobot.cl");
  console.log("  Password: admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
