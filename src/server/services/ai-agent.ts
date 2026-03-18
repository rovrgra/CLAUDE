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
  patientName: string;
  patientHistory: string;
  recentMessages: { role: "user" | "assistant"; content: string }[];
  services: { name: string; duration: number; price: number }[];
  availableSlots?: string[];
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
  const serviceList = context.services
    .map((s) => `- ${s.name}: ${s.duration} min, $${s.price}`)
    .join("\n");

  return `Eres ${config.agentName}, un asistente virtual ${config.personality} para una clínica dental.

REGLAS:
- Responde siempre en español (Chile/Latinoamérica)
- Sé conciso y profesional
- Puedes agendar citas, responder preguntas sobre servicios y precios
- Si no puedes resolver algo, indica que un humano se pondrá en contacto
- Nunca des diagnósticos médicos
- Usa formato amigable para WhatsApp (sin markdown complejo)

SERVICIOS DISPONIBLES:
${serviceList || "No hay servicios configurados aún."}

INFORMACIÓN DEL PACIENTE:
Nombre: ${context.patientName}
${context.patientHistory ? `Historial: ${context.patientHistory}` : ""}

${config.instructions ? `INSTRUCCIONES ADICIONALES:\n${config.instructions}` : ""}`;
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

  const services = await prisma.service.findMany({
    where: { organizationId, isActive: true },
  });

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
      patientName: conversation.patient
        ? `${conversation.patient.firstName} ${conversation.patient.lastName}`
        : "Paciente",
      patientHistory: conversation.patient?.medicalNotes || "",
      recentMessages,
      services: services.map((s) => ({
        name: s.name,
        duration: s.duration,
        price: Number(s.price),
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
