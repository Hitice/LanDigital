import asyncio
import random
import json
import sys
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import urllib.parse

PAGE_URL = "https://servicos.pf.gov.br/epol-sinic-publico/"

# Variáveis GLOBAIS para manter o navegador
playwright_instance = None
browser: Browser = None
page: Page = None
context: BrowserContext = None
cf_clearance = None
main_loop = None
is_emitting = False
navegador_pronto = False

def to_br(data):
    if not data:
        return data
    if len(data) == 10 and "/" in data:
        return data
    if len(data) == 10 and "-" in data:
        y, m, d = data.split("-")
        return f"{d}/{m}/{y}"
    if len(data) == 8 and data.isdigit():
        return f"{data[6:8]}/{data[4:6]}/{data[0:4]}"
    return data

async def verificar_navegador():
    """Verifica se o navegador ainda está vivo e a página acessível"""
    global page, browser, context, navegador_pronto
    
    if not page or not browser or not context:
        return False
    
    try:
        await page.evaluate("() => 1")
        return True
    except:
        print("⚠️ Navegador fechado ou página inacessível", file=sys.stderr)
        navegador_pronto = False
        return False

async def reiniciar_navegador():
    """Reinicia o navegador se foi fechado"""
    global browser, context, page, navegador_pronto, cf_clearance, playwright_instance
    
    print("🔄 Reiniciando navegador...", file=sys.stderr)
    
    try:
        if page:
            await page.close()
    except:
        pass
    try:
        if context:
            await context.close()
    except:
        pass
    try:
        if browser:
            await browser.close()
    except:
        pass
    
    navegador_pronto = False
    cf_clearance = None
    page = None
    context = None
    browser = None
    
    return await iniciar_navegador()

async def resolver_cloudflare():
    """
    Tenta múltiplas estratégias para resolver o Cloudflare Turnstile
    """
    global page, cf_clearance, context
    
    print("🔐 Tentando resolver Cloudflare Turnstile...", file=sys.stderr)
    
    # Aguarda o widget do Cloudflare aparecer
    await asyncio.sleep(2)
    
    # Salva screenshot inicial
    try:
        await page.screenshot(path="debug_cloudflare_inicio.png")
        print("📸 Screenshot inicial salva", file=sys.stderr)
    except:
        pass
    
    # ============================================
    # ESTRATÉGIA 1: Clicar no iframe e depois TAB+SPACE
    # ============================================
    print("📌 Estratégia 1: Clicar no iframe + TAB + SPACE...", file=sys.stderr)
    
    try:
        # Tenta encontrar o iframe do Turnstile
        turnstile_frame = page.frame_locator('iframe[src*="challenges.cloudflare.com"]')
        
        # Clica dentro do iframe para dar foco
        await turnstile_frame.locator('body').click()
        await asyncio.sleep(random.uniform(0.5, 1.0))
        
        # Agora TAB + SPACE
        await page.keyboard.press("Tab")
        await asyncio.sleep(random.uniform(0.3, 0.6))
        await page.keyboard.press("Space")
        
        print("   TAB + SPACE executado dentro do iframe", file=sys.stderr)
        
    except Exception as e:
        print(f"   ⚠️ Estratégia 1 falhou: {e}", file=sys.stderr)
        
        # Tenta clicar no checkbox diretamente
        try:
            print("   Tentando clicar no checkbox do Turnstile...", file=sys.stderr)
            
            # Localiza e clica no checkbox
            checkbox = page.locator('#challenge-stage .cb-i, .challenge-stage input[type="checkbox"]')
            await checkbox.click(timeout=5000)
            await asyncio.sleep(2)
            print("   Checkbox clicado", file=sys.stderr)
            
        except:
            print("   Checkbox não encontrado, tentando via iframe...", file=sys.stderr)
            
            # Tenta via iframe
            try:
                frames = page.frames
                for frame in frames:
                    if 'cloudflare' in frame.url.lower() or 'challenge' in frame.url.lower():
                        await frame.click('body')
                        await asyncio.sleep(0.5)
                        await page.keyboard.press("Tab")
                        await asyncio.sleep(0.3)
                        await page.keyboard.press("Space")
                        print("   TAB+SPACE em iframe encontrado", file=sys.stderr)
                        break
            except:
                pass
    
    # Aguarda o cookie
    print("⏳ Aguardando cf_clearance...", file=sys.stderr)
    
    for i in range(60):
        await asyncio.sleep(1)
        
        cookies = await context.cookies()
        for cookie in cookies:
            if cookie['name'] == 'cf_clearance':
                cf_clearance = cookie['value']
                print(f"✅ cf_clearance obtido! ({i+1}s)", file=sys.stderr)
                print(f"   Cookie: {cf_clearance[:50]}...", file=sys.stderr)
                return True
        
        if i % 10 == 0 and i > 0:
            print(f"   Aguardando... {i}s", file=sys.stderr)
            
            # Se passou 20s sem sucesso, tenta estratégia alternativa
            if i == 20:
                print("   🔄 Tentando estratégia alternativa...", file=sys.stderr)
                try:
                    # Recarrega e tenta de novo
                    await page.reload(wait_until="domcontentloaded")
                    await asyncio.sleep(3)
                    
                    # Tenta clicar no iframe novamente
                    await page.keyboard.press("Tab")
                    await asyncio.sleep(0.3)
                    await page.keyboard.press("Space")
                except:
                    pass
    
    print("❌ Tempo esgotado para Cloudflare", file=sys.stderr)
    return False

async def iniciar_navegador():
    """Inicia o navegador e resolve o Cloudflare"""
    global playwright_instance, browser, context, page, cf_clearance, navegador_pronto
    
    if not playwright_instance:
        playwright_instance = await async_playwright().start()
    
    browser = await playwright_instance.chromium.launch(
        headless=False,
        args=['--disable-blink-features=AutomationControlled']
    )
    
    context = await browser.new_context(
        viewport={'width': 1366, 'height': 900},
        locale='pt-BR',
        timezone_id='America/Sao_Paulo',
    )
    page = await context.new_page()
    
    print("📄 Acessando pagina...", file=sys.stderr)
    await page.goto(PAGE_URL, wait_until="domcontentloaded")
    
    # Aguarda página carregar
    await asyncio.sleep(3)
    
    # Resolve o Cloudflare
    if await resolver_cloudflare():
        # Aguarda formulário Angular
        try:
            await page.wait_for_selector(
                '[formcontrolname="nome"], input', 
                state="visible", 
                timeout=15000
            )
            print("✅ Formulário Angular carregado!", file=sys.stderr)
        except:
            print("⚠️ Formulário não detectado, mas continuando...", file=sys.stderr)
        
        # Salva HTML para debug
        try:
            conteudo = await page.content()
            with open("pagina_final.html", "w", encoding="utf-8") as f:
                f.write(conteudo)
            print("📁 HTML salvo em pagina_final.html", file=sys.stderr)
        except:
            pass
        
        # Screenshot
        try:
            await page.screenshot(path="navegador_pronto.png")
            print("📸 Screenshot salva em navegador_pronto.png", file=sys.stderr)
        except:
            pass
        
        navegador_pronto = True
        print("✅ Navegador pronto para emitir!", file=sys.stderr)
        return True
    
    print("❌ Falha ao resolver Cloudflare", file=sys.stderr)
    navegador_pronto = False
    return False

async def preencher(locator, valor):
    if not valor:
        return True
    try:
        el = locator.first
        await el.wait_for(state="visible", timeout=10000)
        await el.scroll_into_view_if_needed()
        await el.click(timeout=8000)
        await el.fill("")
        await el.type(str(valor), delay=30)
        await asyncio.sleep(0.2)
        return True
    except Exception as e:
        print(f"   ⚠️ Erro ao preencher: {e}", file=sys.stderr)
        return False

async def emitir_certidao(dados):
    """Emite usando o navegador que ja esta aberto"""
    global page, context, cf_clearance, is_emitting, navegador_pronto

    if is_emitting:
        raise Exception("Emissao em andamento. Aguarde.")
    
    is_emitting = True

    try:
        if not await verificar_navegador():
            print("❌ Navegador fechado. Tentando reiniciar...", file=sys.stderr)
            if not await reiniciar_navegador():
                raise Exception("Não foi possível reiniciar o navegador")
        
        if not cf_clearance:
            raise Exception("Cloudflare nao resolvido")

        print("\n" + "="*60, file=sys.stderr)
        print("Iniciando emissao...", file=sys.stderr)
        print(f"Dados: {json.dumps(dados, ensure_ascii=False)}", file=sys.stderr)
        print("="*60 + "\n", file=sys.stderr)

        current_url = page.url if page else ""
        if "epol-sinic-publico" not in current_url:
            await page.goto(PAGE_URL, wait_until="domcontentloaded")
        else:
            await page.reload(wait_until="domcontentloaded")

        await page.wait_for_selector('[formcontrolname="nome"]', timeout=30000)
        await asyncio.sleep(1)

        # CPF
        cpf = "".join(c for c in (dados.get("cpf") or "") if c.isdigit())
        if cpf:
            await preencher(page.locator('xpath=//label[normalize-space()="CPF"]/following::input[1]'), cpf)
            print(f"CPF: {cpf}", file=sys.stderr)

        # Nome
        nome = dados.get("nome", "")
        if nome:
            await preencher(page.locator('[formcontrolname="nome"]'), nome)
            print(f"Nome: {nome}", file=sys.stderr)

        # Data de nascimento
        nascimento = dados.get("nascimento", "")
        if nascimento:
            data_el = page.locator("#p-card-dados-gerais pf-calendar input").first
            await data_el.click()
            await asyncio.sleep(0.3)
            await data_el.click()
            await data_el.press_sequentially(to_br(nascimento), delay=90)
            await data_el.press("Escape")
            await asyncio.sleep(0.3)
            print(f"Data: {to_br(nascimento)}", file=sys.stderr)

        # Nome da Mae
        nome_mae = dados.get("nomeMae", "")
        if nome_mae:
            await preencher(page.locator('[formcontrolname="nomeMae"]'), nome_mae)
            print(f"Mae: {nome_mae}", file=sys.stderr)

        # Nome do Pai
        nome_pai = dados.get("nomePai", "")
        if nome_pai:
            await preencher(page.locator('[formcontrolname="nomePai"]'), nome_pai)
            print(f"Pai: {nome_pai}", file=sys.stderr)

        await asyncio.sleep(1)

        botao = page.locator("#btn-emitir-cac")
        await botao.wait_for(state="visible", timeout=10000)
        
        disabled = await botao.get_attribute("disabled")
        if disabled:
            try:
                erros = await page.locator('.p-error, [role="alert"], .ng-invalid').all_text_contents()
                msgs = [e.strip() for e in erros if e.strip()]
                if msgs:
                    print(f"❌ Erros de validação: {msgs}", file=sys.stderr)
            except:
                pass
            raise Exception("Botão desabilitado - campos obrigatórios não preenchidos ou inválidos")
        
        print("Botao encontrado, clicando...", file=sys.stderr)

        async with page.expect_download(timeout=90000) as download_info:
            await botao.click()
            print("Botao clicado, aguardando resposta...", file=sys.stderr)
            
            try:
                download = await download_info.value
                pdf_buffer = await download.read()
                print(f"PDF baixado: {len(pdf_buffer)} bytes", file=sys.stderr)
                return pdf_buffer
            except Exception as e:
                await asyncio.sleep(2)
                
                mensagens_erro = await page.locator(
                    '.p-toast-detail, .p-toast-summary, [role="alert"], '
                    '.ui-messages-error, .alert-danger, .mensagem-erro'
                ).all_text_contents()
                
                msgs = [m.strip() for m in mensagens_erro if m.strip()]
                
                if msgs:
                    erro_msg = " | ".join(msgs)
                    print(f"❌ PF retornou erro: {erro_msg}", file=sys.stderr)
                    
                    if "exatamente como nos documentos" in erro_msg:
                        raise Exception(f"DADOS_DIVERGENTES: {erro_msg}")
                    elif "não foi possível" in erro_msg.lower():
                        raise Exception(f"ERRO_PF: {erro_msg}")
                    else:
                        raise Exception(f"ERRO_VALIDACAO: {erro_msg}")
                else:
                    raise Exception(f"Download não iniciado")

    except Exception as e:
        error_str = str(e)
        print(f"❌ Erro na emissão: {error_str}", file=sys.stderr)
        
        if "closed" in error_str.lower() or "target" in error_str.lower():
            navegador_pronto = False
        
        raise
    finally:
        is_emitting = False


class SolverHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'ready': navegador_pronto and cf_clearance is not None,
                'cf_clearance': cf_clearance,
                'is_emitting': is_emitting,
                'navegador_pronto': navegador_pronto
            }).encode())
            return
        
        if parsed.path == '/emitir':
            params = urllib.parse.parse_qs(parsed.query)
            dados = {
                'cpf': params.get('cpf', [''])[0],
                'nome': params.get('nome', [''])[0],
                'nascimento': params.get('nascimento', [''])[0],
                'nomeMae': params.get('nomeMae', [''])[0],
                'nomePai': params.get('nomePai', [''])[0]
            }
            
            print(f"\n📨 Recebido /emitir: {dados}", file=sys.stderr)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            try:
                future = asyncio.run_coroutine_threadsafe(emitir_certidao(dados), main_loop)
                pdf = future.result(timeout=120)
                
                if pdf:
                    self.wfile.write(json.dumps({
                        'success': True,
                        'pdf': pdf.hex()
                    }).encode())
                else:
                    self.wfile.write(json.dumps({
                        'success': False,
                        'error': 'PDF vazio'
                    }).encode())
            except Exception as e:
                error_msg = str(e)
                print(f"❌ Erro: {error_msg}", file=sys.stderr)
                self.wfile.write(json.dumps({
                    'success': False,
                    'error': error_msg
                }).encode())
            return
        
        if parsed.path == '/reiniciar':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            try:
                future = asyncio.run_coroutine_threadsafe(reiniciar_navegador(), main_loop)
                sucesso = future.result(timeout=60)
                self.wfile.write(json.dumps({
                    'success': sucesso,
                    'message': 'Navegador reiniciado' if sucesso else 'Falha ao reiniciar'
                }).encode())
            except Exception as e:
                self.wfile.write(json.dumps({
                    'success': False,
                    'error': str(e)
                }).encode())
            return
        
        self.send_response(404)
        self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


def iniciar_servidor():
    server = HTTPServer(('localhost', 8765), SolverHandler)
    print("Servidor HTTP rodando em http://localhost:8765", file=sys.stderr)
    server.serve_forever()


async def main():
    global main_loop
    main_loop = asyncio.get_running_loop()

    thread = threading.Thread(target=iniciar_servidor, daemon=True)
    thread.start()

    await iniciar_navegador()

    while True:
        await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())