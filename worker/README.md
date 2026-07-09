# Worker de emissão (RPA Playwright)

Serviço separado que automatiza a emissão da Certidão de Antecedentes Criminais (CAC)
no portal público da Polícia Federal e devolve o PDF. Roda um navegador headless,
então **não** roda no Next serverless; precisa de container/VM.

## Rodar local (testar a automação antes de tudo)

```bash
cd worker
npm install
npm start          # sobe em http://localhost:8080
```

Testar a emissão:

```bash
curl -X POST http://localhost:8080/emitir-cac \
  -H "Content-Type: application/json" \
  -d '{"nome":"Fulano de Tal","nascimento":"1988-06-12","cpf":"00000000000","nomeMae":"Maria de Tal"}' \
  --output atestado.pdf
```

Abra o `atestado.pdf`. Se vier vazio/erro, rode com `headless: false` em `emitir-cac.mjs`
para ver o navegador e ajustar os seletores (é o passo normal de 1ª execução do RPA).

## Processar a fila de pedidos (fluxo do operador)

Quando o cliente paga no site, um pedido fica `pending` no banco. Para processar:

1. Suba o worker com as variáveis abaixo (HEADLESS=false).
2. Abra `http://localhost:8080/processar`.
3. Para cada pedido, abre uma janela; você clica no "Confirme que é humano" do Cloudflare.
4. O worker emite, sobe o PDF e marca o pedido como pronto. O cliente baixa na página dele.

## Variáveis de ambiente

- `WORKER_TOKEN`: token compartilhado com o app Next (o MESMO do `.env.local` do app).
- `APP_URL`: URL do app Next (ex: `http://localhost:3000` em dev, ou a URL de produção).
- `PROXY_URL`: proxy residencial BR (opcional), só se a PF bloquear o IP.
- `HEADLESS`: `false` para janela visível (necessário para você clicar o Cloudflare).
- `PORT`: porta (default 8080).

Exemplo (PowerShell):
```powershell
$env:HEADLESS="false"; $env:WORKER_TOKEN="troque-este-token"; $env:APP_URL="http://localhost:3000"; npm start
```

## Deploy (Google Cloud Run, recomendado)

```bash
cd worker
gcloud run deploy lanhouse-worker \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars WORKER_TOKEN=<seu-token>,PROXY_URL=<opcional>
```

Cloud Run em `southamerica-east1` já dá um IP no Brasil, o que ajuda a não ser
bloqueado pela PF. A URL gerada vira o `WORKER_URL` no `.env.local` do app Next.
