import { getPedidoPdf } from "@/lib/pedidos";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base64 = await getPedidoPdf(id);
  if (!base64) return new Response("PDF não disponível", { status: 404 });

  const buffer = Buffer.from(base64, "base64");
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="documento.pdf"',
    },
  });
}
