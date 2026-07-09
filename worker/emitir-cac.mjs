import { chromium } from "playwright";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execPromise = promisify(exec);
const URL = "https://servicos.pf.gov.br/epol-sinic-publico/";
const SOLVER_URL = "http://localhost:8765";
const SOLVER_SCRIPT = "c:/Users/ghost/lanhousedigital/src/lib/solver.py";

const HEADLESS = process.env.HEADLESS !== "false";

// Variável para rastrear o processo Python
let pythonProcess = null;

function launchOpts(proxy) {
  return {
    headless: HEADLESS,
    proxy: proxy ? { server: proxy } : undefined,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  };
}

async function aguardarCloudflare(page, timeout = 90000) {
  const fim = Date.now() + timeout;
  while (Date.now() < fim) {
    const titulo = await page.title().catch(() => "");
    if (titulo && !/um momento|just a moment/i.test(titulo)) return true;
    await page.waitForTimeout(1500);
  }
  return false;
}

function toBR(data) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [y, m, d] = data.split("-");
    return `${d}/${m}/${y}`;
  }
  return data;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

// VERIFICA SE O PYTHON ESTA RODANDO (apenas HTTP)
async function verificarPython() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${SOLVER_URL}/status`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    const data = await response.json();
    return data;
  } catch (error) {
    return { ready: false, navegador_pronto: false };
  }
}

// INICIA O PYTHON COMO PROCESSO SEPARADO (não espera stdout)
async function iniciarPython() {
  console.log("🚀 Iniciando solver.py como processo separado...");
  
  // Verifica se já existe um processo rodando
  if (pythonProcess && !pythonProcess.killed) {
    console.log("⚠️ Processo Python já está rodando");
    return true;
  }
  
  return new Promise((resolve, reject) => {
    // Spawna o processo Python (não exec, que espera terminar)
    pythonProcess = spawn('python3', [SOLVER_SCRIPT], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']  // stdin ignorado, stdout e stderr pipe
    });
    
    let started = false;
    
    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Python stdout]: ${data}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      console.log(`[Python]: ${msg.trim()}`);
      
      // Detecta quando o servidor está pronto
      if (msg.includes('Servidor HTTP rodando') || msg.includes('Navegador pronto para emitir')) {
        if (!started) {
          started = true;
          console.log("✅ Python iniciado e servidor rodando!");
          resolve(true);
        }
      }
      
      // Detecta se o navegador foi fechado
      if (msg.includes('Encerrando') || msg.includes('Tempo esgotado')) {
        console.log("⚠️ Python encerrou ou falhou");
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error(`❌ Erro ao iniciar Python: ${error.message}`);
      reject(error);
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`⚠️ Processo Python encerrado com código ${code}`);
      pythonProcess = null;
      if (!started) {
        reject(new Error(`Python encerrou com código ${code}`));
      }
    });
    
    // Timeout de 60 segundos para iniciar
    setTimeout(() => {
      if (!started) {
        console.log("⚠️ Timeout aguardando Python iniciar");
        resolve(false);
      }
    }, 60000);
  });
}

// AGUARDA O PYTHON FICAR PRONTO (polling no /status)
async function aguardarPythonPronto(timeout = 60000) {
  console.log("⏳ Aguardando Python ficar pronto...");
  const fim = Date.now() + timeout;
  
  while (Date.now() < fim) {
    const status = await verificarPython();
    
    if (status.navegador_pronto || status.ready) {
      console.log("✅ Python está pronto!");
      return true;
    }
    
    // Mostra progresso a cada 5 segundos
    const segundos = Math.round((timeout - (fim - Date.now())) / 1000);
    if (segundos % 5 === 0 && segundos > 0) {
      console.log(`   Aguardando... ${segundos}s`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log("❌ Timeout aguardando Python");
  return false;
}

// CHAMA O PYTHON PARA EMITIR (USANDO O NAVEGADOR QUE JA ESTA ABERTO)
async function emitirViaPython(dados) {
  try {
    const params = new URLSearchParams({
      cpf: dados.cpf || '',
      nome: dados.nome || '',
      nascimento: dados.nascimento || '',
      nomeMae: dados.nomeMae || '',
      nomePai: dados.nomePai || ''
    });
    
    console.log(`📤 Chamando ${SOLVER_URL}/emitir?${params}`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minutos
    
    const response = await fetch(`${SOLVER_URL}/emitir?${params}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    const result = await response.json();
    
    if (result.success && result.pdf) {
      console.log(`✅ PDF recebido: ${result.pdf.length / 2} bytes`);
      return Buffer.from(result.pdf, 'hex');
    } else {
      // Trata erros específicos
      const error = result.error || 'Falha ao emitir';
      
      if (error.includes('DADOS_DIVERGENTES')) {
        throw new Error(`DADOS_DIVERGENTES: ${error}`);
      } else if (error.includes('closed') || error.includes('Target')) {
        throw new Error(`NAVEGADOR_FECHADO: ${error}`);
      } else {
        throw new Error(`ERRO_EMISSAO: ${error}`);
      }
    }
  } catch (error) {
    if (error.message.startsWith('DADOS_DIVERGENTES') || 
        error.message.startsWith('NAVEGADOR_FECHADO') ||
        error.message.startsWith('ERRO_EMISSAO')) {
      throw error; // Re-lança erros já tratados
    }
    console.error("❌ Erro ao chamar Python:", error.message);
    throw error;
  }
}

// REINICIA O PYTHON SE NECESSÁRIO
async function reiniciarPython() {
  console.log("🔄 Reiniciando Python...");
  
  // Mata o processo atual se existir
  if (pythonProcess && !pythonProcess.killed) {
    pythonProcess.kill();
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Inicia novamente
  await iniciarPython();
  return await aguardarPythonPronto();
}

/**
 * Emite a Certidão de Antecedentes Criminais (CAC)
 * Versão com retry e reinicialização automática
 */
export async function emitirCac(dados, { proxy } = {}, tentativas = 3) {
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📝 Tentativa ${tentativa}/${tentativas}`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      // PRIMEIRO: verifica se o Python está rodando e pronto
      let status = await verificarPython();
      
      // Se não estiver pronto, tenta iniciar
      if (!status.navegador_pronto && !status.ready) {
        console.log("🔄 Python não está pronto. Iniciando...");
        await iniciarPython();
        await aguardarPythonPronto();
        
        // Verifica novamente
        status = await verificarPython();
      }
      
      // Se o navegador foi fechado, reinicia
      if (status.ready && !status.navegador_pronto) {
        console.log("⚠️ Navegador fechado. Reiniciando...");
        
        // Tenta reiniciar via API
        try {
          await fetch(`${SOLVER_URL}/reiniciar`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          status = await verificarPython();
        } catch {
          // Se falhar, reinicia o processo Python
          await reiniciarPython();
          status = await verificarPython();
        }
      }
      
      if (status.navegador_pronto) {
        console.log("✅ Usando Python para emitir (navegador já aberto)...");
        return await emitirViaPython(dados);
      }
      
      console.log("⚠️ Python não está com navegador pronto após tentativas");
      
    } catch (error) {
      console.error(`❌ Erro na tentativa ${tentativa}:`, error.message);
      
      // Se for erro de dados divergentes, não adianta retentar
      if (error.message.includes('DADOS_DIVERGENTES')) {
        throw error;
      }
      
      // Se for navegador fechado, tenta reiniciar
      if (error.message.includes('NAVEGADOR_FECHADO') || 
          error.message.includes('closed')) {
        console.log("🔄 Reiniciando Python devido a navegador fechado...");
        await reiniciarPython();
        continue;
      }
      
      // Se for a última tentativa, usa fallback
      if (tentativa === tentativas) {
        console.log("⚠️ Todas as tentativas esgotadas. Usando fallback local...");
        break;
      }
      
      // Aguarda antes de retentar
      console.log(`⏳ Aguardando ${5 * tentativa}s antes de retentar...`);
      await new Promise(resolve => setTimeout(resolve, 5000 * tentativa));
    }
  }
  
  // FALLBACK: usar Playwright local (ÚLTIMO RECURSO)
  console.log("⚠️ Fallback: usando Playwright local...");
  
  const browser = await chromium.launch(launchOpts(proxy));
  try {
    const ctx = await browser.newContext({
      locale: "pt-BR",
      acceptDownloads: true,
      viewport: { width: 1366, height: 900 },
    });
    const page = await ctx.newPage();
    
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    
    // Aguarda Cloudflare
    await page.waitForTimeout(3000);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(Math.random() * 300 + 300);
    await page.keyboard.press("Space");
    
    // Aguarda cf_clearance
    if (!(await aguardarCloudflare(page))) {
      throw new Error("Bloqueado pelo Cloudflare");
    }
    
    await page.waitForSelector('[formcontrolname="nome"]', { timeout: 30000 });
    await page.waitForTimeout(1000);

    const fill = async (locator, value) => {
      if (value == null || value === "") return;
      const el = locator.first();
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await el.click({ timeout: 8000 }).catch(() => {});
      await el.fill("");
      await el.type(String(value), { delay: 30 });
    };

    const cpf = dados.cpf ? String(dados.cpf).replace(/\D/g, "") : "";
    if (cpf) {
      await fill(page.locator('xpath=//label[normalize-space()="CPF"]/following::input[1]'), cpf);
    }
    await fill(page.locator('[formcontrolname="nome"]'), dados.nome);

    const dataLoc = page.locator("#p-card-dados-gerais pf-calendar input").first();
    await dataLoc.click().catch(() => {});
    await page.waitForTimeout(300);
    await dataLoc.click().catch(() => {});
    await dataLoc.pressSequentially(toBR(dados.nascimento), { delay: 90 });
    await dataLoc.press("Escape").catch(() => {});

    await fill(page.locator('[formcontrolname="nomeMae"]'), dados.nomeMae);
    await fill(page.locator('[formcontrolname="nomePai"]'), dados.nomePai);

    await page.waitForTimeout(1000);

    const botao = page.locator("#btn-emitir-cac");
    await botao.waitFor({ state: "visible", timeout: 10000 });
    
    const disabled = await botao.getAttribute("disabled");
    if (disabled) {
      const erros = await page.locator('.p-error, [role="alert"]').allInnerTexts().catch(() => []);
      const msg = erros.map(t => t.trim()).filter(Boolean).join(" | ");
      throw new Error(`VALIDACAO: Botão desabilitado${msg ? ' - ' + msg : ''}`);
    }

    let baixado = null;
    const onDownload = (d) => { baixado = d; };
    page.on("download", onDownload);
    ctx.on("page", (p) => p.on("download", onDownload));

    await botao.click();

    const limite = Date.now() + 90000;
    while (!baixado && Date.now() < limite) {
      await page.waitForTimeout(500);
    }
    
    if (baixado) {
      return await streamToBuffer(await baixado.createReadStream());
    }

    await page.waitForTimeout(1500);
    const textos = await page
      .locator('.p-toast-detail, .p-toast-summary, [role="alert"], .ui-messages-error, .alert-danger, .mensagem-erro')
      .allInnerTexts()
      .catch(() => []);
    const msg = textos.map((t) => t.trim()).filter(Boolean).join(" ");
    if (msg) throw new Error(`PF_VALIDACAO: ${msg}`);
    throw new Error("PDF do atestado não capturado");
  } finally {
    await browser.close();
  }
}

// Diagnóstico: verifica status do sistema
export async function inspectForm({ proxy } = {}) {
  const status = await verificarPython();
  
  if (status.navegador_pronto) {
    console.log("✅ Python está rodando com navegador pronto!");
    console.log(`   cf_clearance: ${status.cf_clearance?.substring(0, 30)}...`);
    return { message: "Python está pronto", status };
  }
  
  if (status.ready) {
    console.log("⚠️ Python rodando mas navegador não está pronto");
    console.log("   Tentando reiniciar...");
    await reiniciarPython();
    return { message: "Python reiniciado" };
  }
  
  console.log("🔄 Iniciando Python...");
  await iniciarPython();
  await aguardarPythonPronto();
  return { message: "Python iniciado" };
}