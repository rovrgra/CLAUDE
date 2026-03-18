import { NextRequest, NextResponse } from "next/server";
import { handleIncomingWebhook } from "@/server/services/whatsapp";

// WhatsApp webhook verification
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Handle incoming messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await handleIncomingWebhook(body);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ status: "ok" }); // Always return 200 to WhatsApp
  }
}
