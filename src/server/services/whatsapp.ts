import prisma from "@/lib/prisma";
import { processIncomingMessage } from "./ai-agent";

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string; filename: string };
}

export async function sendWhatsAppMessage(
  phoneId: string,
  token: string,
  to: string,
  message: string
) {
  const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  const data = await response.json();
  return data;
}

export async function sendWhatsAppTemplate(
  phoneId: string,
  token: string,
  to: string,
  templateName: string,
  language: string,
  components?: any[]
) {
  const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    }),
  });

  return response.json();
}

export async function handleIncomingWebhook(body: any) {
  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value?.messages?.length) return;

  const phoneNumberId = value.metadata?.phone_number_id;
  const message: WhatsAppMessage = value.messages[0];
  const contact = value.contacts?.[0];

  // Find organization by WhatsApp phone ID
  const org = await prisma.organization.findFirst({
    where: { whatsappPhoneId: phoneNumberId },
  });

  if (!org) {
    console.error(`No organization found for phone ID: ${phoneNumberId}`);
    return;
  }

  // Find or create patient
  let patient = await prisma.patient.findFirst({
    where: { organizationId: org.id, phone: message.from },
  });

  if (!patient) {
    const name = contact?.profile?.name || "Desconocido";
    const nameParts = name.split(" ");
    patient = await prisma.patient.create({
      data: {
        organizationId: org.id,
        firstName: nameParts[0] || "Desconocido",
        lastName: nameParts.slice(1).join(" ") || "",
        phone: message.from,
        source: "whatsapp",
        status: "LEAD",
      },
    });
  }

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      organizationId: org.id,
      patientId: patient.id,
      channel: "WHATSAPP",
      status: { in: ["OPEN", "PENDING"] },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        organizationId: org.id,
        patientId: patient.id,
        channel: "WHATSAPP",
        channelId: message.from,
        status: "OPEN",
      },
    });
  }

  // Determine message type and content
  let content = "";
  let type: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" = "TEXT";
  let mediaUrl: string | undefined;

  switch (message.type) {
    case "text":
      content = message.text?.body || "";
      break;
    case "image":
      type = "IMAGE";
      content = message.image?.caption || "";
      mediaUrl = message.image?.id;
      break;
    case "audio":
      type = "AUDIO";
      mediaUrl = message.audio?.id;
      break;
    case "document":
      type = "DOCUMENT";
      content = message.document?.filename || "";
      mediaUrl = message.document?.id;
      break;
    default:
      content = `[${message.type}]`;
  }

  // Save inbound message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      sender: "PATIENT",
      type,
      content,
      mediaUrl,
      whatsappMsgId: message.id,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), status: "OPEN" },
  });

  // Generate AI response
  const aiMessage = await processIncomingMessage(org.id, conversation.id, content);

  // Send AI response via WhatsApp
  if (aiMessage?.content && org.whatsappToken) {
    const result = await sendWhatsAppMessage(
      org.whatsappPhoneId!,
      org.whatsappToken,
      message.from,
      aiMessage.content
    );

    if (result.messages?.[0]?.id) {
      await prisma.message.update({
        where: { id: aiMessage.id },
        data: { whatsappMsgId: result.messages[0].id, whatsappStatus: "sent" },
      });
    }
  }

  // Create notification
  await prisma.notification.create({
    data: {
      organizationId: org.id,
      type: "new_message",
      title: `Nuevo mensaje de ${patient.firstName} ${patient.lastName}`,
      body: content.substring(0, 100),
      data: { conversationId: conversation.id, patientId: patient.id },
    },
  });
}
