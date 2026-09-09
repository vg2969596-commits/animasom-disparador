function limparTudo() {
  document.getElementById("listaDados").value = "";
  document.getElementById("cardFila").style.display = "none";
  document.getElementById("tabelaFila").innerHTML = "";
}

function processarLista() {
  const textoBruto = document.getElementById("listaDados").value.trim();
  const tabelaFila = document.getElementById("tabelaFila");
  const cardFila = document.getElementById("cardFila");
  const contadorLeads = document.getElementById("contadorLeads");

  if (!textoBruto) {
    alert("Por favor, cole os dados dos leads na caixa de texto!");
    return;
  }

  const linhas = textoBruto.split("\n");
  tabelaFila.innerHTML = "";
  let totalValidos = 0;

  linhas.forEach((linha, index) => {
    const linhaLimpa = linha.trim();
    if (!linhaLimpa) return;

    // Extrai o telefone de forma inteligente
    const matchTel = linhaLimpa.match(
      /(\(\d{2}\)\s?\d{4,5}-?\d{4}|\d{2}\s?\d{4,5}\-?\d{4}|\d{10,11})/,
    );
    if (!matchTel) return;

    const telefoneBruto = matchTel[0];
    const telLimpo = telefoneBruto.replace(/\D/g, "");
    if (telLimpo.length < 10) return;

    const partes = linhaLimpa.split(telefoneBruto);
    const responsavel = partes[0].trim();
    const nomeCrianca = partes[1] ? partes[1].trim() : "filho(a)";

    if (!responsavel) return;

    // Emojis em Unicode puro (Garante que apareçam coloridos sem corromper)
    const eFesta = "\uD83C\uDF89"; // 🎉
    const eOlhos = "\uD83E\uDD29"; // 🤩
    const eBolo = "\uD83C\uDF82"; // 🎂
    const ePresente = "\uD83C\uDF81"; // 🎁
    const eBrilho = "\u2728"; // ✨
    const eChat = "\uD83D\uDCAC"; // 💬
    const eCoracao = "\u2764\uFE0F"; // ❤️

    const mensagem =
      `${eFesta} *Oi, ${responsavel}! Aqui é da Animasom Rio Sul!* ${eOlhos}\n\n` +
      `Vimos que o aniversário do(a) *${nomeCrianca}* está chegando. Já estão planejando essa comemoração especial? ${eBolo}${eFesta}\n\n` +
      `${ePresente} Para celebrar a campanha, preparamos uma condição histórica: fechando a festa do(a) *${nomeCrianca}* agora, vocês ganham **30 dias de diária** + *5 Day Uses + 5% de CASHBACK em opcionais!* ${eOlhos}${eBrilho}\n\n` +
      `${eChat} O que acha de receber nossa proposta sem compromisso por aqui para conhecer os pacotes? ${eCoracao}`;

    const linkWpp = `https://wa.me/55${telLimpo}?text=${encodeURIComponent(mensagem)}`;

    // Cria o card visual interativo para cada lead na tela
    const leadDiv = document.createElement("div");
    leadDiv.className = "lead-item";
    leadDiv.innerHTML = `
            <div class="lead-info">
                <strong>${responsavel}</strong> (${telefoneBruto})<br>
                <span>Criança: ${nomeCrianca}</span>
            </div>
            <a href="${linkWpp}" target="_blank" class="btn-enviar" onclick="marcarEnviado(this)">
                💬 Enviar Mensagem
            </a>
        `;

    tabelaFila.appendChild(leadDiv);
    totalValidos++;
  });

  if (totalValidos > 0) {
    cardFila.style.display = "block";
    contadorLeads.innerText = totalValidos;
  } else {
    alert(
      "Nenhum lead válido foi encontrado. Verifique se o formato contém nome e telefone.",
    );
    cardFila.style.display = "none";
  }
}

function marcarEnviado(botao) {
  setTimeout(() => {
    botao.innerText = "✅ Enviado";
    botao.classList.add("enviado");
  }, 500);
}

git init