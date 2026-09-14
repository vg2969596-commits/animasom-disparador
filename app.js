let filaLeads = [];
let indiceAtual = 0;

function limparTudo() {
  document.getElementById("listaDados").value = "";
  document.getElementById("cardFila").style.display = "none";
  document.getElementById("tabelaFila").innerHTML = "";
  document.getElementById("cardEnvioRapido").style.display = "none";
  filaLeads = [];
  indiceAtual = 0;
}

function montarMensagem(responsavel, nomeCrianca) {
  return (
    `*Oi, ${responsavel}! Aqui é da Animasom Rio Sul!*\n\n` +
    `Vimos que o aniversário do(a) *${nomeCrianca}* está chegando. Já estão planejando essa comemoração especial?\n\n` +
    `Para celebrar a campanha, preparamos uma condição histórica: fechando a festa do(a) *${nomeCrianca}* agora, vocês ganham **30 dias de diária** + *5 Day Uses + 5% de CASHBACK em opcionais!*\n\n` +
    `O que acha de receber nossa proposta sem compromisso por aqui para conhecer os pacotes?`
  );
}

function processarLista() {
  const textoBruto = document.getElementById("listaDados").value.trim();
  const tabelaFila = document.getElementById("tabelaFila");
  const cardFila = document.getElementById("cardFila");
  const cardEnvioRapido = document.getElementById("cardEnvioRapido");
  const contadorLeads = document.getElementById("contadorLeads");

  if (!textoBruto) {
    alert("Por favor, cole os dados dos leads na caixa de texto!");
    return;
  }

  const linhas = textoBruto.split("\n");
  tabelaFila.innerHTML = "";
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

  // Monta a lista completa na tela (usando texto puro, não HTML, por segurança)
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
    link.textContent = "💬 Enviar Mensagem";
    link.addEventListener("click", () => marcarEnviado(index));

    leadDiv.appendChild(infoDiv);
    leadDiv.appendChild(link);
    tabelaFila.appendChild(leadDiv);
  });

  cardFila.style.display = "block";
  contadorLeads.innerText = filaLeads.length;

  cardEnvioRapido.style.display = "block";
  renderizarPainelRapido();
}

function marcarEnviado(index) {
  const lead = filaLeads[index];
  if (!lead || lead.enviado) return;
  lead.enviado = true;

  setTimeout(() => {
    const leadDiv = document.getElementById(`lead-${index}`);
    const botao = leadDiv ? leadDiv.querySelector(".btn-enviar") : null;
    if (botao) {
      botao.textContent = "✅ Enviado";
      botao.classList.add("enviado");
    }
  }, 400);
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
  btn.disabled = false;
  btn.textContent = "💬 Abrir WhatsApp e Avançar (Enter)";
}

function enviarAtual() {
  if (indiceAtual >= filaLeads.length) return;
  const lead = filaLeads[indiceAtual];
  window.open(lead.linkWpp, "_blank", "noopener");
  marcarEnviado(indiceAtual);
  indiceAtual++;
  renderizarPainelRapido();
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
