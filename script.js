// Variáveis globais
let pdfDoc = null;
let formValidated = false;

// Função para inicializar o formulário
document.addEventListener("DOMContentLoaded", function () {
  const hoje = new Date();
  const dataFormatada = hoje.toISOString().split("T")[0];
  document.getElementById("dataEmissao").value = dataFormatada;

  atualizarDataLimite();

  document.getElementById("gerarPdfBtn").addEventListener("click", validarEGerarPDF);
  document.getElementById("closePdfPreview").addEventListener("click", fecharPreviewPDF);
  document.getElementById("downloadPdfBtn").addEventListener("click", downloadPDF);
  document.getElementById("limparFormBtn").addEventListener("click", limparFormulario);
  document.getElementById("addRowBtn").addEventListener("click", adicionarLinhaTabela);

  document.getElementById("dataEmissao").addEventListener("change", atualizarDataLimite);

  document.querySelectorAll("input[name=\"formaPagamento\"]").forEach((radio) => {
    radio.addEventListener("change", atualizarCamposPagamento);
  });

  const camposValidaveis = document.querySelectorAll("input, textarea, select");
  camposValidaveis.forEach((campo) => {
    campo.addEventListener("blur", function () {
      validarCampo(this);
      atualizarProgressoFormulario();
    });
    campo.addEventListener("input", function () {
      this.classList.remove("input-error");
      atualizarProgressoFormulario();
    });
  });

  inicializarMascaras();

  document.querySelector(".form-container").classList.add("fade-in");
});

function atualizarDataLimite() {
  try {
    const dataEmissaoStr = document.getElementById("dataEmissao").value;
    if (!dataEmissaoStr) return;
    const dataEmissao = new Date(dataEmissaoStr + "T00:00:00");
    if (isNaN(dataEmissao.getTime())) return;

    const dataLimite = new Date(dataEmissao);
    dataLimite.setDate(dataLimite.getDate() + 30);
    const dataLimiteFormatada = dataLimite.toISOString().split("T")[0];
    document.getElementById("dataLimitePrestacao").value = dataLimiteFormatada;
  } catch (e) {
    console.error("Erro ao atualizar data limite:", e);
    document.getElementById("dataLimitePrestacao").value = "";
  }
}

function atualizarCamposPagamento() {}

function aplicarMascaraValor(input) {
  input.addEventListener("input", function (e) {
    let valor = e.target.value.replace(/\D/g, "");
    valor = (parseInt(valor, 10) / 100).toFixed(2) + "";
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    e.target.value = valor === "NaN" || valor === "0,00" ? "" : valor;
  });
}

function inicializarMascaras() {
  // CNPJ e CPF/CNPJ - MANTÉM SUA LÓGICA ORIGINAL
  const cnpjInput = document.getElementById("cnpjFornecedor");
  if (cnpjInput) {
    cnpjInput.addEventListener("input", function (e) {
      let valor = e.target.value.replace(/\D/g, "");
      valor = valor.substring(0, 14);
      if (valor.length > 12) {
        valor = valor.replace(
          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
          "$1.$2.$3/$4-$5"
        );
      } else if (valor.length > 8) {
        valor = valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
      } else if (valor.length > 5) {
        valor = valor.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
      } else if (valor.length > 2) {
        valor = valor.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
      }
      e.target.value = valor;
    });
  }

  const cpfCnpjInput = document.getElementById("cpfCnpj");
  if (cpfCnpjInput) {
    cpfCnpjInput.addEventListener("input", function (e) {
      let valor = e.target.value.replace(/\D/g, "");
      if (valor.length <= 11) {
        valor = valor.substring(0, 11);
        if (valor.length > 9) {
          valor = valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})$/, "$1.$2.$3-$4");
        } else if (valor.length > 6) {
          valor = valor.replace(/^(\d{3})(\d{3})(\d{0,3})$/, "$1.$2.$3");
        } else if (valor.length > 3) {
          valor = valor.replace(/^(\d{3})(\d{0,3})$/, "$1.$2");
        }
      } else {
        valor = valor.substring(0, 14);
        if (valor.length > 12) {
          valor = valor.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            "$1.$2.$3/$4-$5"
          );
        } else if (valor.length > 8) {
          valor = valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
        } else if (valor.length > 5) {
          valor = valor.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
        } else if (valor.length > 2) {
          valor = valor.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
        }
      }
      e.target.value = valor;
    });
  }

  // Campo principal de valor
  const valorInput = document.getElementById("valor");
  if (valorInput) {
    aplicarMascaraValor(valorInput);
  }

  // Máscara nos campos de adiantamentos já existentes
  document.querySelectorAll('.valor-adiantamento').forEach(aplicarMascaraValor);
}

function validarCampo(campo) {
  const id = campo.id;
  const valor = campo.value.trim();
  const mensagemValidacao = document.getElementById(`${id}-validation`);
  let valido = true;

  campo.classList.remove("input-error", "input-success");
  if (mensagemValidacao) mensagemValidacao.textContent = "";

  const obrigatorios = [
    "codigoFornecedor",
    "fornecedor",
    "cnpjFornecedor",
    "dataEmissao",
    "valor",
    "solicitante",
    "departamento",
  ];

  if (obrigatorios.includes(id) && !valor) {
    if (mensagemValidacao) mensagemValidacao.textContent = "Campo obrigatório";
    valido = false;
  }

  if (valido && id === "cnpjFornecedor" && !validarCNPJ(valor)) {
    if (mensagemValidacao) mensagemValidacao.textContent = "CNPJ inválido";
    valido = false;
  }

  if (valido && id === "valor") {
    const valorNumerico = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
        if (mensagemValidacao) mensagemValidacao.textContent = "Valor inválido";
        valido = false;
    }
  }

  if (!valido) {
    campo.classList.add("input-error");
  } else if (valor) {
    campo.classList.add("input-success");
  }

  return valido;
}

function validarCNPJ(cnpj) {
  const numeros = cnpj.replace(/\D/g, "");
  return numeros.length === 14;
}

function validarFormulario() {
  const camposValidaveis = document.querySelectorAll(
    "#adiantamentoForm input:not([type=\"radio\"]), #adiantamentoForm textarea, #adiantamentoForm select"
  );
  let formValido = true;

  camposValidaveis.forEach((campo) => {
    const obrigatorios = [
      "codigoFornecedor",
      "fornecedor",
      "cnpjFornecedor",
      "dataEmissao",
      "valor",
      "solicitante",
      "departamento",
    ];
    if (obrigatorios.includes(campo.id) || campo.value.trim() !== "") {
         if (!validarCampo(campo)) {
            formValido = false;
         }
    }
  });

  const formaPagamento = document.querySelector(
    "input[name=\"formaPagamento\"]:checked"
  );
  const validacaoFormaPagamento = document.getElementById(
    "formaPagamento-validation"
  );
  if (!formaPagamento) {
    if (validacaoFormaPagamento) validacaoFormaPagamento.textContent = "Selecione uma forma de pagamento";
    formValido = false;
  } else {
    if (validacaoFormaPagamento) validacaoFormaPagamento.textContent = "";
  }

  return formValido;
}

function atualizarProgressoFormulario() {
  const camposObrigatorios = [
    "codigoFornecedor",
    "fornecedor",
    "cnpjFornecedor",
    "dataEmissao",
    "valor",
    "solicitante",
    "departamento",
  ];
  let preenchidos = 0;
  const totalObrigatorios = camposObrigatorios.length + 1;

  camposObrigatorios.forEach(id => {
      const campo = document.getElementById(id);
      if(campo && campo.value.trim() !== "") {
          preenchidos++;
      }
  });

  if (document.querySelector("input[name=\"formaPagamento\"]:checked")) {
      preenchidos++;
  }

  const progresso = (preenchidos / totalObrigatorios) * 100;
  document.getElementById("formProgress").style.width = `${Math.min(
    progresso,
    100
  )}%`;
}

function adicionarLinhaTabela() {
  const tbody = document.querySelector("#adiantamentosTable tbody");
  if (tbody.rows.length >= 10) {
      mostrarToast("Máximo de 10 linhas de adiantamento atingido.", "warning");
      return;
  }
  const novaLinha = document.createElement("tr");

  novaLinha.innerHTML = `
        <td><input type="text" name="adiantamentoOC[]" class="input-animated"></td>
        <td><input type="date" name="adiantamentoData[]" class="input-animated"></td>
        <td>
            <div class="input-prefix">
                <span>R$</span>
                <input type="text" name="adiantamentoValor[]" class="input-animated valor-adiantamento" placeholder="0,00">
            </div>
        </td>
    `;

  tbody.appendChild(novaLinha);
  novaLinha.classList.add("fade-in");
  mostrarToast("Nova linha adicionada", "success");

  // Inicializa máscara no novo campo
  novaLinha.querySelectorAll('.valor-adiantamento').forEach(aplicarMascaraValor);
}

function limparFormulario() {
  document.getElementById("adiantamentoForm").reset();

  const hoje = new Date();
  const dataFormatada = hoje.toISOString().split("T")[0];
  document.getElementById("dataEmissao").value = dataFormatada;
  atualizarDataLimite();

  document.querySelectorAll(".validation-message").forEach((msg) => {
    msg.textContent = "";
  });

  document.querySelectorAll(".input-error, .input-success").forEach((campo) => {
    campo.classList.remove("input-error", "input-success");
  });

  document.getElementById("formProgress").style.width = "0%";
  mostrarToast("Formulário limpo com sucesso", "success");
}

function mostrarToast(mensagem, tipo = "success") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
      console.warn("Elemento #toastContainer não encontrado para exibir a notificação.");
      alert(mensagem);
      return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;

  const iconClass = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle"
  }[tipo] || "fa-info-circle";

  toast.innerHTML = `
      <i class="fas ${iconClass} toast-icon"></i>
      <span class="toast-message">${mensagem}</span>
      <div class="toast-progress"></div>
  `;

  toastContainer.appendChild(toast);
  toast.offsetHeight;
  toast.classList.add("show");

  const progressElement = toast.querySelector(".toast-progress");
  setTimeout(() => {
      if(progressElement) progressElement.style.width = "100%";
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
  }, 3000);
}

function validarEGerarPDF() {
  if (validarFormulario()) {
    gerarPDF();
    formValidated = true;
  } else {
    mostrarToast("Por favor, corrija os erros no formulário", "error");
    const primeiroErro = document.querySelector(".input-error");
    if (primeiroErro) {
      primeiroErro.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === "") return "R$ 0,00";
  const numero = parseFloat(String(valor).replace(/\./g, "").replace(",", "."));
  if (isNaN(numero)) return "R$ 0,00";
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(dataStr) {
  if (!dataStr) return "__/__/____";
  try {
    const data = new Date(dataStr + "T00:00:00");
    if (isNaN(data.getTime())) return "__/__/____";
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return "__/__/____";
  }
}

function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// =============== GERADOR PDF COMPLETO ===============
async function gerarPDF() {
  mostrarToast("Gerando PDF...", "info");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // --- Coleta dos Dados ---
  const dados = {
    codigoFornecedor: document.getElementById("codigoFornecedor").value,
    finalidade: document.getElementById("finalidade").value,
    fornecedor: document.getElementById("fornecedor").value,
    cnpjFornecedor: document.getElementById("cnpjFornecedor").value,
    dataEmissao: document.getElementById("dataEmissao").value,
    dataPagamento: document.getElementById("dataPagamento").value,
    ordemCompra: document.getElementById("ordemCompra").value,
    valor: document.getElementById("valor").value,
    formaPagamento: document.querySelector("input[name=\"formaPagamento\"]:checked")?.value || "",
    beneficiario: document.getElementById("beneficiario").value,
    cpfCnpj: document.getElementById("cpfCnpj").value,
    banco: document.getElementById("banco").value,
    solicitante: document.getElementById("solicitante").value,
    agencia: document.getElementById("agencia").value,
    conta: document.getElementById("conta").value,
    departamento: document.getElementById("departamento").value,
    tipoConta: document.getElementById("tipoConta").value,
    chavePix: document.getElementById("chavePix").value,
    dataLimitePrestacao: document.getElementById("dataLimitePrestacao").value,
    adiantamentos: [],
  };

  const linhasTabela = document.querySelectorAll("#adiantamentosTable tbody tr");
  linhasTabela.forEach((linha) => {
    const ocInput = linha.querySelector("input[name=\"adiantamentoOC[]\"]");
    const dataInput = linha.querySelector("input[name=\"adiantamentoData[]\"]");
    const valorInput = linha.querySelector("input[name=\"adiantamentoValor[]\"]");
    const oc = ocInput ? ocInput.value : "";
    const data = dataInput ? dataInput.value : "";
    const valorRaw = valorInput ? valorInput.value : "";
    if (oc || data || valorRaw) {
        const valorFormatado = formatarMoeda(valorRaw);
        dados.adiantamentos.push({
            ordemCompra: oc,
            dataLimite: data,
            valor: valorFormatado
        });
    }
  });

  // === CABEÇALHO AJUSTADO ===
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  // Logo centralizada
  const logoUrl = "https://i.postimg.cc/v8nRpXB7/logo.png";
  const logoWidth = 175;  // ajuste se preferir menor
  const logoHeight = 16;
  const logoX = pageWidth - margin - logoWidth;
  const logoY = currentY;
  const logoBase64 = await loadImageAsBase64(logoUrl);
  doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
  currentY += logoHeight + 5;

  // Título + Caixa de Versão
  const tituloY = currentY + 7;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("FORMULÁRIO DE ADIANTAMENTO À FORNECEDOR", pageWidth / 2, tituloY, { align: "center" });
  doc.setFont("helvetica", "normal");

  const boxWidth = 40;
  const boxHeight = 10;
  const boxX = pageWidth - margin - boxWidth;
  const boxY = tituloY - 7;
  doc.setLineWidth(0.3);
  doc.setDrawColor(0);
  doc.rect(boxX, boxY, boxWidth, boxHeight);
  doc.setFontSize(8);
  doc.text("FOR_FIN_02_02", boxX + boxWidth / 2, boxY + 4, { align: "center" });
  doc.text("VERSÃO: 01", boxX + boxWidth / 2, boxY + 8, { align: "center" });

  currentY = boxY + boxHeight + 7;

  // Linha horizontal
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // === CAMPOS ESTRUTURADOS (layout 2 colunas) ===

  const col1X = margin;
  const colWidth = contentWidth * 0.55;
  const col2X = margin + colWidth + 5;
  const col2Width = contentWidth - colWidth - 5;
  const fieldHeight = 7;
  const labelOffset = 2;
  const valueOffsetY = 5;
  const lineOffset = 0.5;
  let yCol1 = currentY;
  let yCol2 = currentY;

  doc.setFontSize(8);

  function drawField(x, y, w, label, value) {
    doc.setFont("helvetica", "bold");
    doc.text(label, x, y + labelOffset);
    doc.setFont("helvetica", "normal");
    doc.setLineWidth(0.2);
    doc.line(x, y + fieldHeight - lineOffset, x + w, y + fieldHeight - lineOffset);
    if (value) {
      doc.text(String(value), x + 2, y + valueOffsetY);
    }
    return y + fieldHeight + 3;
  }

  function drawBoxField(x, y, w, h, label, value, maxLines = 1) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(label, x, y - 2);
      doc.setFont("helvetica", "normal");
      doc.rect(x, y, w, h);
      if (value) {
          const lines = doc.splitTextToSize(String(value), w - 4);
          doc.text(lines.slice(0, maxLines), x + 2, y + 4);
      }
      return y + h + 5;
  }

  yCol1 = drawField(col1X, yCol1, colWidth, "CÓDIGO FORNECEDOR:", dados.codigoFornecedor);
  yCol1 = drawField(col1X, yCol1, colWidth, "FORNECEDOR:", dados.fornecedor);
  yCol1 = drawField(col1X, yCol1, colWidth, "CNPJ FORNECEDOR:", dados.cnpjFornecedor);
  yCol1 = drawField(col1X, yCol1, colWidth, "DATA DE EMISSÃO:", formatarData(dados.dataEmissao));
  yCol1 = drawField(col1X, yCol1, colWidth, "DATA PARA PAGAMENTO:", formatarData(dados.dataPagamento));
  yCol1 = drawField(col1X, yCol1, colWidth, "ORDEM DE COMPRA:", dados.ordemCompra);

  // Campo Valor (com R$)
  doc.setFont("helvetica", "bold");
  doc.text("VALOR:", col1X, yCol1 + labelOffset);
  doc.setFont("helvetica", "normal");
  doc.line(col1X, yCol1 + fieldHeight - lineOffset, col1X + colWidth, yCol1 + fieldHeight - lineOffset);
  doc.text("R$", col1X + 2, yCol1 + valueOffsetY);
  doc.text(formatarMoeda(dados.valor).replace("R$","").trim(), col1X + 8, yCol1 + valueOffsetY);
  yCol1 += fieldHeight + 3;

  // Forma de Pagamento
  doc.setFont("helvetica", "bold");
  doc.text("FORMA DE PAGAMENTO:", col1X, yCol1 + labelOffset);
  doc.setFont("helvetica", "normal");
  const checkX1 = col1X + 45;
  const checkY = yCol1 - 1;
  const checkSize = 4;
  doc.rect(checkX1, checkY, checkSize, checkSize);
  doc.text("PIX/TED", checkX1 + checkSize + 2, checkY + checkSize - 1);
  const checkX2 = checkX1 + 30;
  doc.rect(checkX2, checkY, checkSize, checkSize);
  doc.text("BOLETO", checkX2 + checkSize + 2, checkY + checkSize - 1);
  if (dados.formaPagamento === "PIX/TED") {
  doc.setFont("helvetica", "bold");
  doc.text("X", checkX1 + 1.4, checkY + checkSize - 0.8);
  doc.setFont("helvetica", "normal");
} else if (dados.formaPagamento === "BOLETO") {
  doc.setFont("helvetica", "bold");
  doc.text("X", checkX2 + 1.4, checkY + checkSize - 0.8);
  doc.setFont("helvetica", "normal");
}
  yCol1 += fieldHeight + 3;

  yCol1 = drawField(col1X, yCol1, colWidth, "SOLICITANTE:", dados.solicitante);
  yCol1 = drawField(col1X, yCol1, colWidth, "DEPARTAMENTO:", dados.departamento);
  yCol1 = drawField(col1X, yCol1, colWidth, "DATA LIMITE PARA PRESTAÇÃO DE CONTAS:", formatarData(dados.dataLimitePrestacao));

  // Coluna 2
  const finalidadeHeight = 30;
  yCol2 = drawBoxField(col2X, yCol2, col2Width, finalidadeHeight, "FINALIDADE:", dados.finalidade, 5);

  // Caixa Dados para Pagamento
  const dadosPgtoY = yCol2;
  const dadosPgtoHeight = 45;
  doc.rect(col2X, dadosPgtoY, col2Width, dadosPgtoHeight);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS PARA PAGAMENTO:", col2X + 2, dadosPgtoY + 4);
  doc.setFont("helvetica", "normal");
  let yDados = dadosPgtoY + 8;
  const fieldWidthDados = col2Width - 4;
  const labelIndentDados = col2X + 2;
  const valueIndentDados = col2X + 25;

  function drawDadosField(y, label, value) {
      doc.setFontSize(7);
      doc.text(label, labelIndentDados, y + 3);
      doc.line(valueIndentDados - 2, y + 4, col2X + col2Width - 2, y + 4);
      if(value) doc.text(String(value), valueIndentDados, y + 3);
      return y + 5;
  }

  yDados = drawDadosField(yDados, "BENEFICIÁRIO:", dados.beneficiario);
  yDados = drawDadosField(yDados, "CPF / CNPJ:", dados.cpfCnpj);
  yDados = drawDadosField(yDados, "BANCO:", dados.banco);
  yDados = drawDadosField(yDados, "AGÊNCIA:", dados.agencia);
  yDados = drawDadosField(yDados, "CONTA:", dados.conta);
  yDados = drawDadosField(yDados, "TIPO DE CONTA:", dados.tipoConta);
  yDados = drawDadosField(yDados, "CHAVE PIX:", dados.chavePix);
  yCol2 = dadosPgtoY + dadosPgtoHeight + 5;

  // --- Seção Adiantamentos em Aberto ---
  currentY = Math.max(yCol1, yCol2) + 5;
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("ADIANTAMENTOS EM ABERTO", pageWidth / 2, currentY, { align: "center" });
  doc.setFont("helvetica", "normal");
  currentY += 8;

  // Tabela Adiantamentos
  const tableColWidths = [contentWidth * 0.4, contentWidth * 0.4, contentWidth * 0.2];
  const tableHeaders = ["ORDEM DE COMPRA", "DATA LIMITE PRESTAÇÃO DE CONTAS", "VALOR EM ABERTO"];
  const tableRowHeight = 6;
  const tableHeaderY = currentY;
  let tableX = margin;

  // Cabeçalho
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  for (let i = 0; i < tableHeaders.length; i++) {
    doc.rect(tableX, tableHeaderY, tableColWidths[i], tableRowHeight);
    doc.text(tableHeaders[i], tableX + 2, tableHeaderY + 4);
    tableX += tableColWidths[i];
  }
  currentY += tableRowHeight;

  // Linhas da Tabela (mínimo 4 linhas)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const numRowsToDraw = Math.max(4, dados.adiantamentos.length);
  for (let i = 0; i < numRowsToDraw; i++) {
    tableX = margin;
    const adiantamento = dados.adiantamentos[i];
    for (let j = 0; j < tableColWidths.length; j++) {
      doc.rect(tableX, currentY, tableColWidths[j], tableRowHeight);
      let cellValue = "";
      if (adiantamento) {
          if (j === 0) cellValue = adiantamento.ordemCompra;
          else if (j === 1) cellValue = formatarData(adiantamento.dataLimite);
          else if (j === 2) cellValue = adiantamento.valor;
      }
      doc.text(String(cellValue), tableX + 2, currentY + 4);
      tableX += tableColWidths[j];
    }
    currentY += tableRowHeight;
  }

  // --- Assinaturas ---
  currentY += 15;
  const signatureY = Math.min(currentY, doc.internal.pageSize.getHeight() - 30);
  const signatureLineLength = 60;
  const signatureCol1X = margin + contentWidth * 0.15;
  const signatureCol2X = pageWidth - margin - contentWidth * 0.15 - signatureLineLength;

  doc.setLineWidth(0.3);
  doc.line(signatureCol1X, signatureY, signatureCol1X + signatureLineLength, signatureY);
  doc.text("Solicitante", signatureCol1X + signatureLineLength / 2, signatureY + 4, { align: "center" });
  doc.line(signatureCol2X, signatureY, signatureCol2X + signatureLineLength, signatureY);
  doc.text("Controladoria", signatureCol2X + signatureLineLength / 2, signatureY + 4, { align: "center" });

  // --- Finalização ---
  pdfDoc = doc;

  try {
      const pdfData = doc.output("datauristring");
      const pdfContainer = document.getElementById("pdfContainer");
      if (pdfContainer) {
          pdfContainer.innerHTML = `<embed width="100%" height="100%" src="${pdfData}" type="application/pdf">`;
          document.getElementById("pdfPreview").classList.add("active");
          mostrarToast("PDF gerado com sucesso!", "success");
      } else {
          console.error("Elemento #pdfContainer não encontrado.");
          mostrarToast("Erro ao exibir preview do PDF.", "error");
          downloadPDF();
      }
  } catch (e) {
      console.error("Erro ao gerar Data URI do PDF:", e);
      mostrarToast("Erro ao gerar preview do PDF.", "error");
  }
}

// Fechar preview
function fecharPreviewPDF() {
  document.getElementById("pdfPreview").classList.remove("active");
  const pdfContainer = document.getElementById("pdfContainer");
  if(pdfContainer) pdfContainer.innerHTML = "";
}

// Download PDF
function downloadPDF() {
  if (pdfDoc) {
    const fornecedor = document.getElementById("fornecedor").value || "fornecedor";
    const dataEmissao = document.getElementById("dataEmissao").value || new Date().toISOString().split("T")[0];
    const fornecedorLimpo = fornecedor.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const nomeArquivo = `Adiantamento_${fornecedorLimpo}_${dataEmissao}.pdf`;
    try {
        pdfDoc.save(nomeArquivo);
        mostrarToast("PDF baixado com sucesso!", "success");
    } catch (e) {
        console.error("Erro ao salvar PDF:", e);
        mostrarToast("Erro ao baixar o PDF.", "error");
    }
  } else {
      mostrarToast("Nenhum PDF gerado para baixar.", "warning");
  }
}

// Toast e modal
if (!document.getElementById("toastContainer")) {
    const container = document.createElement("div");
    container.id = "toastContainer";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "1000";
    document.body.appendChild(container);
}

if (!document.getElementById("pdfPreview")) {
    const modal = document.createElement("div");
    modal.id = "pdfPreview";
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-content" style="width: 80%; height: 80%; background: white; padding: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); position: relative;">
            <button id="closePdfPreview" style="position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 25px; text-align: center;">×</button>
            <div id="pdfContainer" style="width: 100%; height: calc(100% - 40px); margin-top: 30px;"></div>
            <button id="downloadPdfBtn" style="position: absolute; bottom: 10px; right: 10px; padding: 8px 15px; background-color: #0056b3; color: white; border: none; border-radius: 4px; cursor: pointer;">Baixar PDF</button>
        </div>
    `;
    document.body.appendChild(modal);

    const style = document.createElement('style');
    style.textContent = `
        .modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none; justify-content: center; align-items: center; z-index: 999;
        }
        .modal-overlay.active {
            display: flex;
        }
        .toast {
            background-color: #333;
            color: #fff;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 4px;
            min-width: 250px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.5s ease-in-out;
            position: relative;
            overflow: hidden;
        }
        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }
        .toast.success { background-color: #28a745; }
        .toast.error { background-color: #dc3545; }
        .toast.warning { background-color: #ffc107; color: #333; }
        .toast.info { background-color: #17a2b8; }
        .toast-icon { margin-right: 10px; }
        .toast-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 4px;
            width: 0;
            background-color: rgba(255,255,255,0.7);
            transition: width 3s linear;
        }
    `;
    document.head.appendChild(style);

    document.getElementById("closePdfPreview").addEventListener("click", fecharPreviewPDF);
    document.getElementById("downloadPdfBtn").addEventListener("click", downloadPDF);
}
