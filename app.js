// --- ECOSSISTEMA VICTOR: mesmo Supabase já usado no "Corrida dos Leads" ---
// Serve para registrar cada disparo no log central (tabelas `eventos` e
// `disparos`), permitindo consolidar os resultados dos projetos em um único
// lugar (hub / planilha do Google Sheets sincronizada).
const SUPABASE_URL = "https://wpawajkguxvofpexhufn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4uAvBCGWXgPG_lyfyWeP0g_OyIivucf";
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

async function registrarDisparoNoEcossistema(lead) {
  if (!supabaseClient) return;

  try {
    await supabaseClient.from("disparos").insert([
      {
        responsavel: lead.responsavel,
        telefone: lead.telefoneBruto,
        nome_crianca: lead.nomeCrianca,
      },
    ]);

    await supabaseClient.from("eventos").insert([
      {
        projeto: "animasom-disparador",
        tipo: "disparo_enviado",
        quantidade: 1,
        responsavel: lead.responsavel,
        detalhes: { nome_crianca: lead.nomeCrianca },
      },
    ]);
  } catch (err) {
    // Falha ao registrar no ecossistema não deve travar o envio da mensagem.
    console.warn("Não foi possível registrar o disparo no ecossistema:", err);
  }
}

const CHAVE_FILA = "disparador_fila_leads";
const CHAVE_INDICE = "disparador_indice_atual";
const CHAVE_ENVIOS_HOJE = "disparador_envios_hoje";
const CHAVE_LIMITE_DIARIO = "disparador_limite_diario";
const CHAVE_INTERVALO = "disparador_intervalo_segundos";

const LIMITE_DIARIO_PADRAO = 35;
const INTERVALO_PADRAO_SEGUNDOS = 30;

let filaLeads = [];
let indiceAtual = 0;
let cooldownAtivo = null;

function limparTudo() {
  document.getElementById("listaDados").value = "";
  document.getElementById("cardFila").style.display = "none";
  document.getElementById("tabelaFila").innerHTML = "";
  document.getElementById("cardEnvioRapido").style.display = "none";
  filaLeads = [];
  indiceAtual = 0;
  pararCooldown();
  localStorage.removeItem(CHAVE_FILA);
  localStorage.removeItem(CHAVE_INDICE);
}

function montarMensagem(responsavel, nomeCrianca) {
  return (
    `Oi, ${responsavel}! Tudo bem? Aqui é da Animasom Rio Sul!\n\n` +
    `O aniversário do(a) *${nomeCrianca}* está chegando e nós preparamos uma surpresa especial para ajudar na comemoração!\n\n` +
    `Somente neste mês, fechando a festa do(a) *${nomeCrianca}*, você ganha *10% OFF em até 3x sem juros* e ainda leva o *Passaporte Animasom de 30 dias corridos* para aproveitar a unidade\n\n` +
    `E o melhor: fechando neste mês, você garante a condição e a festa pode ser realizada com toda tranquilidade até setembro de 2027, então dá tempo de planejar tudo sem correria.\n\n` +
    `O que acha de receber nossa proposta sem compromisso por aqui para conhecer os pacotes?`
  );
}

function processarLista() {
  const textoBruto = document.getElementById("listaDados").value.trim();
  const cardFila = document.getElementById("cardFila");
  const cardEnvioRapido = document.getElementById("cardEnvioRapido");
  const contadorLeads = document.getElementById("contadorLeads");

  if (!textoBruto) {
    alert("Por favor, cole os dados dos leads na caixa de texto!");
    return;
  }

  const linhas = textoBruto.split("\n");
  filaLeads = [];
  indiceAtual = 0;

  linhas.forEach((linha) => {
    const linhaLimpa = linha.trim();
    if (!linhaLimpa) return;

    // Extrai o telefone de forma inteligente
    const matchTel = linhaLimpa.match(
      /(\(\d{2}\)\s?\d{4,5}-?\d{4}|\d{2}\s?\d{4,5}\-?\d{4}|\d{10,11})/,
    );
    if (!matchTel) return;

    const telefoneBruto = matchTel[0];
    let telLimpo = telefoneBruto.replace(/\D/g, "");
    if (telLimpo.length < 10) return;

    // Se veio com o código do país (55) na frente (ex: 55 21 99999-9999),
    // remove pra não duplicar no link do WhatsApp.
    if (telLimpo.startsWith("55") && telLimpo.length > 11) {
      telLimpo = telLimpo.slice(2);
    }

    const partes = linhaLimpa.split(telefoneBruto);
    const responsavel = partes[0].trim();
    const nomeCrianca = partes[1] ? partes[1].trim() : "filho(a)";

    if (!responsavel) return;

    const mensagem = montarMensagem(responsavel, nomeCrianca);
    const linkWpp = `https://wa.me/55${telLimpo}?text=${encodeURIComponent(mensagem)}`;

    filaLeads.push({
      responsavel,
      telefoneBruto,
      nomeCrianca,
      linkWpp,
      enviado: false,
    });
  });

  if (filaLeads.length === 0) {
    alert(
      "Nenhum lead válido foi encontrado. Verifique se o formato contém nome e telefone.",
    );
    cardFila.style.display = "none";
    cardEnvioRapido.style.display = "none";
    return;
  }

  cardFila.style.display = "block";
  contadorLeads.innerText = filaLeads.length;
  cardEnvioRapido.style.display = "block";

  renderizarFila();
  renderizarPainelRapido();
  atualizarStatusEnviosHoje();
  salvarEstado();
}

// Desenha a lista completa na tela (usando texto puro, não HTML, por segurança)
function renderizarFila() {
  const tabelaFila = document.getElementById("tabelaFila");
  tabelaFila.innerHTML = "";

  filaLeads.forEach((lead, index) => {
    const leadDiv = document.createElement("div");
    leadDiv.className = "lead-item";
    leadDiv.id = `lead-${index}`;

    const infoDiv = document.createElement("div");
    infoDiv.className = "lead-info";

    const strong = document.createElement("strong");
    strong.textContent = lead.responsavel;
    infoDiv.appendChild(strong);
    infoDiv.append(` (${lead.telefoneBruto})`);
    infoDiv.appendChild(document.createElement("br"));

    const span = document.createElement("span");
    span.textContent = `Criança: ${lead.nomeCrianca}`;
    infoDiv.appendChild(span);

    const link = document.createElement("a");
    link.href = lead.linkWpp;
    link.target = "_blank";
    link.rel = "noopener";
    link.className = "btn-enviar";
    link.textContent = lead.enviado ? "✅ Enviado" : "💬 Enviar Mensagem";
    if (lead.enviado) link.classList.add("enviado");
    link.addEventListener("click", () => marcarEnviado(index));

    leadDiv.appendChild(infoDiv);
    leadDiv.appendChild(link);
    tabelaFila.appendChild(leadDiv);
  });
}

function marcarEnviado(index) {
  const lead = filaLeads[index];
  if (!lead || lead.enviado) return;
  lead.enviado = true;
  salvarEstado();
  registrarDisparoNoEcossistema(lead);

  setTimeout(() => {
    const leadDiv = document.getElementById(`lead-${index}`);
    const botao = leadDiv ? leadDiv.querySelector(".btn-enviar") : null;
    if (botao) {
      botao.textContent = "✅ Enviado";
      botao.classList.add("enviado");
    }
  }, 400);
}

function obterDataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function obterEnviosHoje() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_ENVIOS_HOJE) || "null");
  if (!dados || dados.data !== obterDataHoje()) {
    return { data: obterDataHoje(), contagem: 0 };
  }
  return dados;
}

function registrarEnvioHoje() {
  const dados = obterEnviosHoje();
  dados.contagem++;
  localStorage.setItem(CHAVE_ENVIOS_HOJE, JSON.stringify(dados));
  atualizarStatusEnviosHoje();
}

function obterLimiteDiario() {
  const salvo = parseInt(localStorage.getItem(CHAVE_LIMITE_DIARIO), 10);
  return salvo > 0 ? salvo : LIMITE_DIARIO_PADRAO;
}

function obterIntervaloSegundos() {
  const salvo = parseInt(localStorage.getItem(CHAVE_INTERVALO), 10);
  return salvo > 0 ? salvo : INTERVALO_PADRAO_SEGUNDOS;
}

function salvarConfigEnvio() {
  const inputLimite = document.getElementById("inputLimiteDiario");
  const inputIntervalo = document.getElementById("inputIntervalo");

  const limite = parseInt(inputLimite.value, 10);
  if (limite > 0) localStorage.setItem(CHAVE_LIMITE_DIARIO, String(limite));

  const intervalo = parseInt(inputIntervalo.value, 10);
  if (intervalo > 0) localStorage.setItem(CHAVE_INTERVALO, String(intervalo));

  atualizarStatusEnviosHoje();
}

function atualizarStatusEnviosHoje() {
  const { contagem } = obterEnviosHoje();
  const limite = obterLimiteDiario();

  const statusEl = document.getElementById("statusEnviosHoje");
  if (statusEl) {
    statusEl.textContent = `Enviados hoje: ${contagem} / ${limite}`;
  }

  const inputLimite = document.getElementById("inputLimiteDiario");
  if (inputLimite && document.activeElement !== inputLimite) {
    inputLimite.value = limite;
  }

  const inputIntervalo = document.getElementById("inputIntervalo");
  if (inputIntervalo && document.activeElement !== inputIntervalo) {
    inputIntervalo.value = obterIntervaloSegundos();
  }
}

function salvarEstado() {
  localStorage.setItem(CHAVE_FILA, JSON.stringify(filaLeads));
  localStorage.setItem(CHAVE_INDICE, String(indiceAtual));
}

function carregarEstado() {
  const filaSalva = localStorage.getItem(CHAVE_FILA);
  if (!filaSalva) return;

  try {
    const fila = JSON.parse(filaSalva);
    if (!Array.isArray(fila) || fila.length === 0) return;

    filaLeads = fila;
    indiceAtual = parseInt(localStorage.getItem(CHAVE_INDICE), 10) || 0;

    document.getElementById("cardFila").style.display = "block";
    document.getElementById("contadorLeads").innerText = filaLeads.length;
    document.getElementById("cardEnvioRapido").style.display = "block";

    renderizarFila();
    renderizarPainelRapido();
  } catch {
    localStorage.removeItem(CHAVE_FILA);
    localStorage.removeItem(CHAVE_INDICE);
  }
}

function renderizarPainelRapido() {
  const progressoTexto = document.getElementById("progressoTexto");
  const nomeEl = document.getElementById("leadAtualNome");
  const telEl = document.getElementById("leadAtualTelefone");
  const criancaEl = document.getElementById("leadAtualCrianca");
  const btn = document.getElementById("btnEnviarAtual");
  const total = filaLeads.length;

  if (indiceAtual >= total) {
    progressoTexto.textContent = `Todos os ${total} leads foram enviados! 🎉`;
    nomeEl.textContent = "";
    telEl.textContent = "";
    criancaEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "✅ Fila concluída";
    return;
  }

  const lead = filaLeads[indiceAtual];
  progressoTexto.textContent = `Lead ${indiceAtual + 1} de ${total}`;
  nomeEl.textContent = lead.responsavel;
  telEl.textContent = ` — ${lead.telefoneBruto}`;
  criancaEl.textContent = `Criança: ${lead.nomeCrianca}`;

  if (!cooldownAtivo) {
    btn.disabled = false;
    btn.textContent = "💬 Abrir WhatsApp e Avançar (Enter)";
  }
}

function enviarAtual() {
  if (indiceAtual >= filaLeads.length) return;
  if (cooldownAtivo) return;

  const { contagem } = obterEnviosHoje();
  const limite = obterLimiteDiario();
  if (contagem >= limite) {
    alert(
      `Limite diário de ${limite} envios atingido.\n\nIsso existe pra evitar que o WhatsApp bloqueie o número por spam. Volte amanhã pra continuar a fila (ela fica salva), ou aumente o limite acima por sua conta e risco.`,
    );
    return;
  }

  const lead = filaLeads[indiceAtual];
  window.open(lead.linkWpp, "_blank", "noopener");
  marcarEnviado(indiceAtual);
  registrarEnvioHoje();
  indiceAtual++;
  salvarEstado();
  renderizarPainelRapido();
  iniciarCooldown();
}

// Trava o botão por um tempo entre envios, pra evitar rajada de mensagens
// (padrão de envio muito rápido é um dos principais gatilhos de bloqueio do WhatsApp).
function iniciarCooldown() {
  if (indiceAtual >= filaLeads.length) return;

  const btn = document.getElementById("btnEnviarAtual");
  const base = obterIntervaloSegundos();
  const variacao = Math.floor(Math.random() * 11) - 5; // ±5s, pra não ficar robótico
  let restante = Math.max(5, base + variacao);

  btn.disabled = true;
  cooldownAtivo = setInterval(() => {
    btn.textContent = `⏳ Aguarde ${restante}s...`;
    restante--;

    if (restante < 0) {
      clearInterval(cooldownAtivo);
      cooldownAtivo = null;
      renderizarPainelRapido();
    }
  }, 1000);
}

function pararCooldown() {
  if (cooldownAtivo) {
    clearInterval(cooldownAtivo);
    cooldownAtivo = null;
  }
}

// Permite avançar apertando Enter, sem tirar a mão do teclado,
// desde que o foco não esteja na caixa de texto da lista.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (document.activeElement && document.activeElement.id === "listaDados") return;

  const cardEnvioRapido = document.getElementById("cardEnvioRapido");
  if (!cardEnvioRapido || cardEnvioRapido.style.display === "none") return;

  e.preventDefault();
  enviarAtual();
});

document.addEventListener("DOMContentLoaded", () => {
  carregarEstado();
  atualizarStatusEnviosHoje();
});
