import { NextRequest, NextResponse } from "next/server";
import { services } from "@/lib/services";
import { createPixCharge } from "@/lib/asaas";
import { isPaymentBypass } from "@/lib/payments";

export async function POST(req: NextRequest) {
  try {
    const { serviceId, description } = await req.json();

    // Preço é autoritativo no servidor; nunca confiar no valor vindo do cliente.
    const svc = services.find((s) => s.id === serviceId);
    if (!svc || typeof svc.price !== "number") {
      return NextResponse.json({ error: "serviço inválido" }, { status: 400 });
    }

    // Bypass de teste: não cria cobrança real no Asaas.
    if (isPaymentBypass()) {
      return NextResponse.json({
        orderId: "bypass",
        payload: "PAGAMENTO DE TESTE (BYPASS ATIVO)",
        encodedImage: "",
        amount: svc.price,
      });
    }

    const charge = await createPixCharge({
      value: svc.price,
      description: description || svc.title,
    });

    return NextResponse.json({
      orderId: charge.paymentId,
      payload: charge.payload,
      encodedImage: charge.encodedImage,
      amount: svc.price,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/pix/create]", msg);
    return NextResponse.json({ error: "falha ao gerar PIX" }, { status: 500 });
  }
}
