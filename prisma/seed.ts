import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const passwordHash = await hash("admin1234", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@dentalcrm.cl" },
    update: {},
    create: {
      email: "admin@dentalcrm.cl",
      name: "Dr. Carlos Soto",
      passwordHash,
    },
  });

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: "clinica-sonrisa" },
    update: {},
    create: {
      name: "Clínica Dental Sonrisa",
      slug: "clinica-sonrisa",
      timezone: "America/Santiago",
      country: "CL",
      currency: "CLP",
      phone: "+56 2 2345 6789",
      email: "contacto@clinicasonrisa.cl",
      address: "Av. Providencia 1234, Santiago",
      businessType: "dental_clinic",
      aiAgentName: "Sofía",
      aiAgentPersonality: "amable, profesional y empática",
      aiAgentInstructions: "Siempre ofrece agendar una cita cuando pregunten por precios. Menciona que tenemos estacionamiento gratuito y WiFi.",
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

  // Create services
  const services = await Promise.all([
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Limpieza dental", description: "Limpieza profesional completa",
        duration: 45, price: 35000, color: "#6366f1",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Blanqueamiento", description: "Blanqueamiento LED profesional",
        duration: 60, price: 120000, color: "#8b5cf6",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Extracción simple", description: "Extracción de pieza dental",
        duration: 30, price: 45000, color: "#ef4444",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Resina dental", description: "Restauración con resina compuesta",
        duration: 40, price: 55000, color: "#10b981",
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id, name: "Ortodoncia - control", description: "Control mensual de ortodoncia",
        duration: 20, price: 25000, color: "#f59e0b",
      },
    }),
  ]);

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { organizationId: org.id, name: "VIP", color: "#f59e0b" } }),
    prisma.tag.create({ data: { organizationId: org.id, name: "Ortodoncia", color: "#8b5cf6" } }),
    prisma.tag.create({ data: { organizationId: org.id, name: "Niños", color: "#10b981" } }),
  ]);

  // Create patients
  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        organizationId: org.id, firstName: "María", lastName: "González",
        email: "maria@email.com", phone: "+56912345678", rut: "12.345.678-9",
        source: "whatsapp", status: "ACTIVE", score: 85,
        medicalNotes: "Paciente con brackets desde enero 2024. Control mensual.",
        allergies: "Penicilina",
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id, firstName: "Juan", lastName: "Pérez",
        email: "juan@email.com", phone: "+56987654321", rut: "11.222.333-4",
        source: "website", status: "ACTIVE", score: 60,
        medicalNotes: "Necesita limpieza semestral. Último blanqueamiento hace 1 año.",
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id, firstName: "Ana", lastName: "Silva",
        email: "ana@email.com", phone: "+56911112222",
        source: "referral", status: "LEAD", score: 30,
      },
    }),
    prisma.patient.create({
      data: {
        organizationId: org.id, firstName: "Pedro", lastName: "Muñoz",
        phone: "+56933334444", source: "walk-in", status: "ACTIVE", score: 70,
        medications: "Ibuprofeno (ocasional)",
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
  await prisma.patientTag.create({ data: { patientId: patients[0].id, tagId: tags[1].id } }); // María - Ortodoncia
  await prisma.patientTag.create({ data: { patientId: patients[4].id, tagId: tags[0].id } }); // Camila - VIP

  // Create appointments
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  await Promise.all([
    prisma.appointment.create({
      data: {
        organizationId: org.id, patientId: patients[0].id, serviceId: services[4].id,
        title: "Control ortodoncia - María", startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 20 * 60000), status: "CONFIRMED",
      },
    }),
    prisma.appointment.create({
      data: {
        organizationId: org.id, patientId: patients[1].id, serviceId: services[0].id,
        title: "Limpieza dental - Juan",
        startTime: new Date(tomorrow.getTime() + 60 * 60000),
        endTime: new Date(tomorrow.getTime() + 105 * 60000), status: "CONFIRMED",
      },
    }),
    prisma.appointment.create({
      data: {
        organizationId: org.id, patientId: patients[3].id, serviceId: services[3].id,
        title: "Resina dental - Pedro",
        startTime: new Date(tomorrow.getTime() + 3 * 3600000),
        endTime: new Date(tomorrow.getTime() + 3 * 3600000 + 40 * 60000), status: "PENDING",
      },
    }),
  ]);

  // Create a sample conversation
  const conversation = await prisma.conversation.create({
    data: {
      organizationId: org.id, patientId: patients[2].id,
      channel: "WHATSAPP", channelId: "+56911112222",
      status: "OPEN", aiEnabled: true,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id, direction: "INBOUND", sender: "PATIENT",
        type: "TEXT", content: "Hola, me gustaría saber el precio de un blanqueamiento dental",
        createdAt: new Date(now.getTime() - 3600000),
      },
      {
        conversationId: conversation.id, direction: "OUTBOUND", sender: "AI",
        type: "TEXT", aiGenerated: true, aiConfidence: 0.92,
        content: "¡Hola Ana! 😊 Gracias por tu interés. Nuestro blanqueamiento LED profesional tiene un valor de $120.000 y dura aproximadamente 60 minutos. ¿Te gustaría agendar una hora? Tenemos disponibilidad esta semana.",
        createdAt: new Date(now.getTime() - 3500000),
      },
      {
        conversationId: conversation.id, direction: "INBOUND", sender: "PATIENT",
        type: "TEXT", content: "Sí, me gustaría agendar para el viernes si hay hora",
        createdAt: new Date(now.getTime() - 1800000),
      },
    ],
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(now.getTime() - 1800000) },
  });

  // Create a document for the knowledge base
  await prisma.document.create({
    data: {
      organizationId: org.id, name: "Precios y servicios", type: "price-list",
      content: `LISTA DE PRECIOS - Clínica Dental Sonrisa

Limpieza dental: $35.000 (45 min)
Blanqueamiento LED: $120.000 (60 min)
Extracción simple: $45.000 (30 min)
Resina dental: $55.000 (40 min)
Ortodoncia - control mensual: $25.000 (20 min)
Ortodoncia - instalación brackets: $450.000
Implante dental: $650.000
Corona de porcelana: $280.000
Endodoncia: $180.000

Todos los precios incluyen IVA.
Aceptamos: efectivo, tarjeta de débito/crédito, transferencia.
Convenios con Fonasa e Isapres.`,
    },
  });

  await prisma.document.create({
    data: {
      organizationId: org.id, name: "Preguntas frecuentes", type: "faq",
      content: `PREGUNTAS FRECUENTES

¿Cuál es el horario de atención?
Lunes a viernes: 9:00 - 19:00, Sábados: 9:00 - 14:00

¿Dónde están ubicados?
Av. Providencia 1234, Santiago. Metro Manuel Montt.

¿Tienen estacionamiento?
Sí, estacionamiento gratuito para pacientes.

¿Trabajan con Fonasa?
Sí, trabajamos con Fonasa e Isapres.

¿Cuánto dura un blanqueamiento?
Aproximadamente 60 minutos en una sola sesión.

¿Atienden urgencias?
Sí, atendemos urgencias dentales de lunes a sábado.

¿Puedo pagar en cuotas?
Sí, aceptamos hasta 12 cuotas sin interés con tarjeta de crédito.`,
    },
  });

  // Create a sample invoice
  await prisma.invoice.create({
    data: {
      organizationId: org.id, patientId: patients[1].id,
      number: "F-000001", status: "PAID",
      subtotal: 35000, tax: 6650, discount: 0, total: 41650,
      paidAt: new Date(now.getTime() - 86400000 * 7),
      items: {
        create: {
          serviceId: services[0].id, description: "Limpieza dental profesional",
          quantity: 1, unitPrice: 35000, total: 35000,
        },
      },
      payments: {
        create: {
          patientId: patients[1].id, amount: 41650,
          method: "CARD", status: "COMPLETED",
        },
      },
    },
  });

  console.log("Seed completed!");
  console.log("");
  console.log("Login credentials:");
  console.log("  Email: admin@dentalcrm.cl");
  console.log("  Password: admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
