import { NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/asaas";
import { isPaymentBypass } from "@/lib/payments";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;

    // Bypass de teste: confirma na hora, sem pagamento real.
    if (isPaymentBypass()) {
      return NextResponse.json({ paid: true, status: "BYPASS" });
    }

    const { paid, status } = await getPaymentStatus(orderId);
    return NextResponse.json({ paid, status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/pix/status]", msg);
    // 200 com paid:false para o polling continuar sem quebrar a UI.
    return NextResponse.json({ paid: false, status: "error" }, { status: 200 });
  }
}
