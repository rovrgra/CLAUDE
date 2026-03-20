import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";

const anthropic = new Anthropic();

interface AiAgentConfig {
  organizationId: string;
  agentName: string;
  personality: string;
  instructions?: string;
  businessType: string;
}

interface ConversationContext {
  clientName: string;
  clientPhone: string;
  clientNotes: string;
  recentMessages: { role: "user" | "assistant"; content: string }[];
  menuItems: { name: string; price: number; description?: string }[];
  documents: { name: string; content: string }[];
}

// ==================== TOOL DEFINITIONS ====================

const tools: Anthropic.Messages.Tool[] = [
  {
    name: "create_order",
    description:
      "Crea un nuevo pedido cuando el cliente confirma su selección. Usa esta herramienta solo después de que el cliente haya confirmado los items y el tipo de pedido.",
    input_schema: {
      type: "object" as const,
      properties: {
        customerName: { type: "string", description: "Nombre del cliente" },
        customerPhone: {
          type: "string",
          description: "Teléfono del cliente",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nombre del plato" },
              quantity: { type: "number", description: "Cantidad" },
              unitPrice: { type: "number", description: "Precio unitario" },
            },
            required: ["name", "quantity", "unitPrice"],
          },
          description: "Lista de items del pedido",
        },
        type: {
          type: "string",
          enum: ["DELIVERY", "TAKEAWAY"],
          description: "Tipo de pedido: DELIVERY o TAKEAWAY (para llevar)",
        },
        deliveryAddress: {
          type: "string",
          description: "Dirección de entrega (solo para DELIVERY)",
        },
        notes: {
          type: "string",
          description: "Notas adicionales del pedido",
        },
      },
      required: ["customerName", "items", "type"],
    },
  },
  {
    name: "create_reservation",
    description:
      "Crea una reserva para un cliente. Usa esta herramienta cuando el cliente confirma fecha, hora y cantidad de personas.",
    input_schema: {
      type: "object" as const,
      properties: {
        customerName: { type: "string", description: "Nombre del cliente" },
        date: {
          type: "string",
          description: "Fecha en formato ISO (YYYY-MM-DD)",
        },
        time: { type: "string", description: "Hora en formato HH:mm" },
        guests: { type: "number", description: "Cantidad de personas" },
        notes: { type: "string", description: "Notas adicionales" },
      },
      required: ["customerName", "date", "time", "guests"],
    },
  },
  {
    name: "check_menu",
    description:
      "Consulta los platos disponibles del menú con precios. Usa esta herramienta cuando el cliente pregunta por la carta, menú, platos o precios.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "check_availability",
    description:
      "Consulta la disponibilidad de reservas para una fecha específica. Muestra los horarios disponibles y ocupados.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Fecha en formato ISO (YYYY-MM-DD)",
        },
      },
      required: ["date"],
    },
  },
];

// ==================== TOOL EXECUTION ====================

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface CreateOrderInput {
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  type: "DELIVERY" | "TAKEAWAY";
  deliveryAddress?: string;
  notes?: string;
}

interface CreateReservationInput {
  customerName: string;
  date: string;
  time: string;
  guests: number;
  notes?: string;
}

interface CheckAvailabilityInput {
  date: string;
}

async function executeCreateOrder(
  organizationId: string,
  input: CreateOrderInput
): Promise<string> {
  const subtotal = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const tax = 0;
  const total = subtotal + tax;

  // Get next order number for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const orderCount = await prisma.order.count({
    where: {
      organizationId,
      createdAt: { gte: today, lte: todayEnd },
    },
  });

  const order = await prisma.order.create({
    data: {
      organizationId,
      number: orderCount + 1,
      type: input.type === "DELIVERY" ? "DELIVERY" : "TAKEAWAY",
      status: "RECEIVED",
      source: "WHATSAPP",
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      deliveryAddress: input.deliveryAddress,
      deliveryNotes: input.notes,
      subtotal,
      tax,
      total,
      items: {
        create: input.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { items: true },
  });

  // Create notification for the restaurant
  await prisma.notification.create({
    data: {
      organizationId,
      type: "new_order",
      title: `Nuevo pedido #${order.number} vía WhatsApp`,
      body: `${input.customerName} - ${input.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")} - Total: $${total.toLocaleString("es-CL")}`,
      data: { orderId: order.id, source: "WHATSAPP" },
    },
  });

  const itemsList = order.items
    .map(
      (i) =>
        `${i.quantity}x ${i.name} - $${Number(i.total).toLocaleString("es-CL")}`
    )
    .join("\n");

  return JSON.stringify({
    success: true,
    orderId: order.id,
    orderNumber: order.number,
    items: itemsList,
    subtotal,
    total,
    type: order.type,
    message: `Pedido #${order.number} creado exitosamente`,
  });
}

async function executeCreateReservation(
  organizationId: string,
  input: CreateReservationInput
): Promise<string> {
  // Parse date and time
  const [hours, minutes] = input.time.split(":").map(Number);
  const startTime = new Date(input.date);
  startTime.setHours(hours, minutes, 0, 0);

  // Default reservation duration: 2 hours
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 2);

  // Check for conflicts
  const conflictingAppointments = await prisma.appointment.count({
    where: {
      organizationId,
      status: { in: ["CONFIRMED", "PENDING"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  // Find or create patient for the reservation
  let patient = await prisma.patient.findFirst({
    where: {
      organizationId,
      firstName: input.customerName.split(" ")[0],
      lastName: input.customerName.split(" ").slice(1).join(" ") || "-",
    },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        organizationId,
        firstName: input.customerName.split(" ")[0],
        lastName: input.customerName.split(" ").slice(1).join(" ") || "-",
        source: "whatsapp",
      },
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      organizationId,
      patientId: patient.id,
      title: `Reserva - ${input.customerName} (${input.guests} personas)`,
      startTime,
      endTime,
      status: "CONFIRMED",
      notes: input.notes || null,
      bookedByAi: true,
    },
  });

  // Create notification
  await prisma.notification.create({
    data: {
      organizationId,
      type: "new_reservation",
      title: `Nueva reserva vía WhatsApp`,
      body: `${input.customerName} - ${input.guests} personas - ${startTime.toLocaleDateString("es-CL")} a las ${input.time}`,
      data: { appointmentId: appointment.id, source: "WHATSAPP" },
    },
  });

  return JSON.stringify({
    success: true,
    appointmentId: appointment.id,
    customerName: input.customerName,
    date: startTime.toLocaleDateString("es-CL"),
    time: input.time,
    guests: input.guests,
    existingReservations: conflictingAppointments,
    message: `Reserva confirmada para ${input.customerName}, ${input.guests} personas el ${startTime.toLocaleDateString("es-CL")} a las ${input.time}`,
  });
}

async function executeCheckMenu(organizationId: string): Promise<string> {
  const menuItems = await prisma.menuItem.findMany({
    where: {
      organizationId,
      isActive: true,
      isAvailable: true,
    },
    include: {
      category: { select: { name: true } },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  if (menuItems.length === 0) {
    return JSON.stringify({
      success: true,
      items: [],
      message: "No hay platos disponibles en este momento.",
    });
  }

  // Group by category
  const grouped: Record<
    string,
    { name: string; price: number; description?: string | null }[]
  > = {};
  for (const item of menuItems) {
    const cat = item.category.name;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({
      name: item.name,
      price: Number(item.price),
      description: item.description,
    });
  }

  return JSON.stringify({
    success: true,
    menu: grouped,
    totalItems: menuItems.length,
  });
}

async function executeCheckAvailability(
  organizationId: string,
  input: CheckAvailabilityInput
): Promise<string> {
  const date = new Date(input.date);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      status: { in: ["CONFIRMED", "PENDING"] },
      startTime: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { startTime: "asc" },
  });

  // Restaurant typical hours: 12:00 - 22:00, slots every 30 min
  const slots: { time: string; available: boolean }[] = [];
  for (let h = 12; h <= 21; h++) {
    for (const m of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(h, m, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotEnd.getHours() + 2);

      const conflict = existingAppointments.some((appt) => {
        return appt.startTime < slotEnd && appt.endTime > slotStart;
      });

      slots.push({
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        available: !conflict,
      });
    }
  }

  const availableSlots = slots.filter((s) => s.available);
  const occupiedSlots = slots.filter((s) => !s.available);

  return JSON.stringify({
    success: true,
    date: date.toLocaleDateString("es-CL"),
    totalReservations: existingAppointments.length,
    availableSlots: availableSlots.map((s) => s.time),
    occupiedSlots: occupiedSlots.map((s) => s.time),
    message:
      availableSlots.length > 0
        ? `Hay ${availableSlots.length} horarios disponibles para el ${date.toLocaleDateString("es-CL")}.`
        : `No hay disponibilidad para el ${date.toLocaleDateString("es-CL")}.`,
  });
}

async function executeTool(
  toolName: string,
  toolInput: unknown,
  organizationId: string
): Promise<string> {
  try {
    switch (toolName) {
      case "create_order":
        return await executeCreateOrder(
          organizationId,
          toolInput as CreateOrderInput
        );
      case "create_reservation":
        return await executeCreateReservation(
          organizationId,
          toolInput as CreateReservationInput
        );
      case "check_menu":
        return await executeCheckMenu(organizationId);
      case "check_availability":
        return await executeCheckAvailability(
          organizationId,
          toolInput as CheckAvailabilityInput
        );
      default:
        return JSON.stringify({
          success: false,
          error: `Herramienta desconocida: ${toolName}`,
        });
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return JSON.stringify({
      success: false,
      error: `Error al ejecutar ${toolName}: ${error instanceof Error ? error.message : "Error desconocido"}`,
    });
  }
}

// ==================== SYSTEM PROMPT ====================

function buildSystemPrompt(
  config: AiAgentConfig,
  context: ConversationContext
): string {
  const menuList = context.menuItems
    .map(
      (s) =>
        `- ${s.name}: $${s.price.toLocaleString("es-CL")}${s.description ? ` (${s.description})` : ""}`
    )
    .join("\n");

  const docsContext = context.documents
    .map((d) => `--- ${d.name} ---\n${d.content}`)
    .join("\n\n");

  return `Eres ${config.agentName}, un asistente virtual ${config.personality} para un restaurante.

REGLAS:
- Responde siempre en español (Chile/Latinoamérica)
- Sé amable, cercano y conciso
- Puedes tomar pedidos, hacer reservas, responder sobre la carta y precios
- Confirma siempre el pedido antes de finalizar (repite items y total)
- Si preguntan por delivery, confirma dirección y tiempo estimado
- Si no puedes resolver algo, indica que un encargado se pondrá en contacto
- Usa formato amigable para WhatsApp (sin markdown complejo, usa emojis moderadamente)
- Para reservas pregunta: fecha, hora, cantidad de personas y nombre

HERRAMIENTAS:
- Usa "check_menu" cuando pregunten por la carta, menú, platos o precios
- Usa "check_availability" cuando pregunten por disponibilidad de reservas para una fecha
- Usa "create_order" SOLO cuando el cliente haya CONFIRMADO todos los items y el tipo de pedido
- Usa "create_reservation" SOLO cuando tengas fecha, hora, personas y nombre confirmados

CARTA / MENÚ:
${menuList || "No hay platos configurados aún. Usa check_menu para verificar."}

${docsContext ? `INFORMACIÓN ADICIONAL:\n${docsContext}` : ""}

CLIENTE:
Nombre: ${context.clientName}
Teléfono: ${context.clientPhone || "No disponible"}
${context.clientNotes ? `Notas: ${context.clientNotes}` : ""}

${config.instructions ? `INSTRUCCIONES DEL DUEÑO:\n${config.instructions}` : ""}`;
}

// ==================== MAIN AGENT FUNCTION ====================

export async function generateAiResponse(
  config: AiAgentConfig,
  context: ConversationContext
): Promise<{ content: string; toolsUsed: string[]; confidence: number }> {
  const systemPrompt = buildSystemPrompt(config, context);
  const toolsUsed: string[] = [];

  // Build initial messages from conversation context
  const messages: Anthropic.Messages.MessageParam[] =
    context.recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

  // Tool use loop: keep calling Claude until we get a final text response
  const MAX_TOOL_ROUNDS = 5;
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    // If stop reason is "end_turn", extract text and return
    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find(
        (block): block is Anthropic.Messages.TextBlock => block.type === "text"
      );
      return {
        content: textBlock?.text || "",
        toolsUsed,
        confidence: 0.9,
      };
    }

    // If stop reason is "tool_use", process each tool call
    if (response.stop_reason === "tool_use") {
      // Add the assistant's response (with tool_use blocks) to messages
      messages.push({
        role: "assistant",
        content: response.content,
      });

      // Execute each tool call and collect results
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          toolsUsed.push(block.name);
          const result = await executeTool(
            block.name,
            block.input,
            config.organizationId
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Add tool results as a user message
      messages.push({
        role: "user",
        content: toolResults,
      });

      // Continue the loop to get Claude's next response
      continue;
    }

    // Fallback: extract any text from the response
    const textBlock = response.content.find(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text"
    );
    if (textBlock) {
      return {
        content: textBlock.text,
        toolsUsed,
        confidence: 0.7,
      };
    }
  }

  // If we exhausted max rounds, return what we have
  return {
    content:
      "Lo siento, hubo un problema procesando tu solicitud. Un encargado se pondrá en contacto contigo pronto.",
    toolsUsed,
    confidence: 0.3,
  };
}

// ==================== PROCESS INCOMING MESSAGE ====================

export async function processIncomingMessage(
  organizationId: string,
  conversationId: string,
  _messageContent: string
) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });

  if (!org.aiAutoReply) return null;

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      patient: true,
      messages: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!conversation.aiEnabled || conversation.aiHandedOff) return null;

  const [services, documents] = await Promise.all([
    prisma.service.findMany({
      where: { organizationId, isActive: true },
    }),
    prisma.document.findMany({
      where: { organizationId },
      select: { name: true, content: true },
    }),
  ]);

  const recentMessages = conversation.messages.reverse().map((m) => ({
    role: (m.direction === "INBOUND" ? "user" : "assistant") as
      | "user"
      | "assistant",
    content: m.content || "",
  }));

  const result = await generateAiResponse(
    {
      organizationId,
      agentName: org.aiAgentName,
      personality: org.aiAgentPersonality,
      instructions: org.aiAgentInstructions || undefined,
      businessType: org.businessType,
    },
    {
      clientName: conversation.patient
        ? `${conversation.patient.firstName} ${conversation.patient.lastName}`
        : "Cliente",
      clientPhone: conversation.patient?.phone || conversation.channelId || "",
      clientNotes: conversation.patient?.notes || "",
      recentMessages,
      menuItems: services.map((s) => ({
        name: s.name,
        price: Number(s.price),
        description: s.description || undefined,
      })),
      documents: documents.map((d) => ({
        name: d.name,
        content: d.content,
      })),
    }
  );

  // Save AI message
  const aiMessage = await prisma.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      sender: "AI",
      type: "TEXT",
      content: result.content,
      aiGenerated: true,
      aiConfidence: result.confidence,
      aiToolsUsed: result.toolsUsed,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  return aiMessage;
}
