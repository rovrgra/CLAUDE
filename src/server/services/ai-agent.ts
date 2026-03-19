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
  clientNotes: string;
  recentMessages: { role: "user" | "assistant"; content: string }[];
  menuItems: { name: string; price: number; description?: string }[];
  documents: { name: string; content: string }[];
}

export async function generateAiResponse(
  config: AiAgentConfig,
  context: ConversationContext
): Promise<{ content: string; toolsUsed: string[]; confidence: number }> {
  const systemPrompt = buildSystemPrompt(config, context);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: context.recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  return {
    content,
    toolsUsed: [],
    confidence: response.stop_reason === "end_turn" ? 0.9 : 0.7,
  };
}

function buildSystemPrompt(config: AiAgentConfig, context: ConversationContext): string {
  const menuList = context.menuItems
    .map((s) => `- ${s.name}: $${s.price.toLocaleString("es-CL")}${s.description ? ` (${s.description})` : ""}`)
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

CARTA / MENÚ:
${menuList || "No hay platos configurados aún."}

${docsContext ? `INFORMACIÓN ADICIONAL:\n${docsContext}` : ""}

CLIENTE:
Nombre: ${context.clientName}
${context.clientNotes ? `Notas: ${context.clientNotes}` : ""}

${config.instructions ? `INSTRUCCIONES DEL DUEÑO:\n${config.instructions}` : ""}`;
}

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

  const recentMessages = conversation.messages
    .reverse()
    .map((m) => ({
      role: (m.direction === "INBOUND" ? "user" : "assistant") as "user" | "assistant",
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
      clientNotes: conversation.patient?.medicalNotes || "",
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
