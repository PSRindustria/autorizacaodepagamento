// ========== SCRIPT PARA FORMULÁRIO DE ADIANTAMENTO À FORNECEDOR ==========

let pdfDoc = null;
let formValidated = false;

document.addEventListener("DOMContentLoaded", function () {
  // Data emissão auto
  const hoje = new Date();
  const dataFormatada = hoje.toISOString().split("T")[0];
  const campoDataEmissao = document.getElementById("dataEmissao");
  if (campoDataEmissao) campoDataEmissao.value = dataFormatada;

  atualizarDataLimite();

  if (document.getElementById("gerarPdfBtn"))
    document.getElementById("gerarPdfBtn").addEventListener("click", validarEGerarPDF);
  if (document.getElementById("closePdfPreview"))
    document.getElementById("closePdfPreview").addEventListener("click", fecharPreviewPDF);
  if (document.getElementById("downloadPdfBtn"))
    document.getElementById("downloadPdfBtn").addEventListener("click", downloadPDF);
  if (document.getElementById("limparFormBtn"))
    document.getElementById("limparFormBtn").addEventListener("click", limparFormulario);
  if (document.getElementById("addRowBtn"))
    document.getElementById("addRowBtn").addEventListener("click", adicionarLinhaTabela);

  if (campoDataEmissao)
    campoDataEmissao.addEventListener("change", atualizarDataLimite);

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

  const container = document.querySelector(".form-container");
  if (container) container.classList.add("fade-in");
});

function atualizarDataLimite() {
  try {
    const dataEmissaoStr = document.getElementById("dataEmissao")?.value;
    if (!dataEmissaoStr) return;
    const dataEmissao = new Date(dataEmissaoStr + "T00:00:00");
    if (isNaN(dataEmissao.getTime())) return;

    const dataLimite = new Date(dataEmissao);
    dataLimite.setDate(dataLimite.getDate() + 30);
    const dataLimiteFormatada = dataLimite.toISOString().split("T")[0];
    if (document.getElementById("dataLimitePrestacao"))
      document.getElementById("dataLimitePrestacao").value = dataLimiteFormatada;
  } catch (e) {
    if (document.getElementById("dataLimitePrestacao"))
      document.getElementById("dataLimitePrestacao").value = "";
  }
}

function atualizarCamposPagamento() {}

function aplicarMascaraValor(input) {
  if (!input) return;
  input.addEventListener("input", function (e) {
    let valor = e.target.value.replace(/\D/g, "");
    valor = (parseInt(valor, 10) / 100).toFixed(2) + "";
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    e.target.value = valor === "NaN" || valor === "0,00" ? "" : valor;
  });
}

function inicializarMascaras() {
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
  if (valorInput) aplicarMascaraValor(valorInput);

  document.querySelectorAll('.valor-adiantamento').forEach(aplicarMascaraValor);
}

function validarCampo(campo) {
  if (!campo) return false;
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
  if (document.getElementById("formProgress"))
    document.getElementById("formProgress").style.width = `${Math.min(progresso,100)}%`;
}

function adicionarLinhaTabela() {
  const tbody = document.querySelector("#adiantamentosTable tbody");
  if (!tbody) return;
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
  novaLinha.querySelectorAll('.valor-adiantamento').forEach(aplicarMascaraValor);
}

function limparFormulario() {
  if (document.getElementById("adiantamentoForm"))
    document.getElementById("adiantamentoForm").reset();

  const hoje = new Date();
  const dataFormatada = hoje.toISOString().split("T")[0];
  if (document.getElementById("dataEmissao"))
    document.getElementById("dataEmissao").value = dataFormatada;
  atualizarDataLimite();

  document.querySelectorAll(".validation-message").forEach((msg) => {
    msg.textContent = "";
  });

  document.querySelectorAll(".input-error, .input-success").forEach((campo) => {
    campo.classList.remove("input-error", "input-success");
  });

  if (document.getElementById("formProgress"))
    document.getElementById("formProgress").style.width = "0%";
  mostrarToast("Formulário limpo com sucesso", "success");
}

function mostrarToast(mensagem, tipo = "success") {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.style.position = "fixed";
    toastContainer.style.top = "20px";
    toastContainer.style.right = "20px";
    toastContainer.style.zIndex = "1000";
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<span>${mensagem}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.classList.add("show"); }, 10);
  setTimeout(() => { toast.classList.remove("show"); toast.remove(); }, 3000);
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
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// =============== GERADOR PDF AJUSTADO =================
async function gerarPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // --- Dados (pegando só se o campo existe!)
    function campo(id) {
      const el = document.getElementById(id);
      return el ? el.value : "";
    }
    const dados = {
      codigoFornecedor: campo("codigoFornecedor"),
      finalidade: campo("finalidade"),
      fornecedor: campo("fornecedor"),
      cnpjFornecedor: campo("cnpjFornecedor"),
      dataEmissao: campo("dataEmissao"),
      dataPagamento: campo("dataPagamento"),
      ordemCompra: campo("ordemCompra"),
      valor: campo("valor"),
      formaPagamento: (document.querySelector("input[name=\"formaPagamento\"]:checked")?.value || ""),
      beneficiario: campo("beneficiario"),
      cpfCnpj: campo("cpfCnpj"),
      banco: campo("banco"),
      solicitante: campo("solicitante"),
      agencia: campo("agencia"),
      conta: campo("conta"),
      departamento: campo("departamento"),
      tipoConta: campo("tipoConta"),
      chavePix: campo("chavePix"),
      dataLimitePrestacao: campo("dataLimitePrestacao"),
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

    // CABEÇALHO
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = margin;

    // Logo
    let logoBase64 = "";
    try {
      logoBase64 = await loadImageAsBase64("https://i.postimg.cc/v8nRpXB7/logo.png");
      doc.addImage(logoBase64, 'PNG', pageWidth - margin - 60, currentY, 60, 16);
    } catch (e) {}

    // Caixa de versão
    const boxWidth = 38, boxHeight = 10, logoWidth = 60;
    const boxX = pageWidth - margin - logoWidth - boxWidth - 3;
    const boxY = currentY;
    doc.setLineWidth(0.3);
    doc.setDrawColor(0);
    doc.rect(boxX, boxY, boxWidth, boxHeight);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("FOR_FIN_02_02", boxX + boxWidth / 2, boxY + 4, { align: "center" });
    doc.text("VERSÃO: 01", boxX + boxWidth / 2, boxY + 8, { align: "center" });

    // Título centralizado
    const tituloY = currentY + 16 + 10;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("FORMULÁRIO DE ADIANTAMENTO À FORNECEDOR", pageWidth / 2, tituloY, { align: "center" });

    // Linha horizontal grossa
    let afterTitleY = tituloY + 3;
    doc.setLineWidth(0.8);
    doc.line(margin, afterTitleY, pageWidth - margin, afterTitleY);
    currentY = afterTitleY + 5;

    // ...[restante dos campos, tabela, adiantamentos, igual você já tinha]...

    // --- Assinaturas lado a lado ---
    currentY += 18;
    const signatureLineLength = 55;
    const col1X = margin + (pageWidth - 2 * margin) * 0.13;
    const col2X = pageWidth - margin - (pageWidth - 2 * margin) * 0.13 - signatureLineLength;

    doc.setLineWidth(0.3);
    doc.line(col1X, currentY, col1X + signatureLineLength, currentY);
    doc.text("Solicitante", col1X + signatureLineLength / 2, currentY + 5, { align: "center" });
    doc.line(col2X, currentY, col2X + signatureLineLength, currentY);
    doc.text("Controladoria", col2X + signatureLineLength / 2, currentY + 5, { align: "center" });

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
        doc.save("Adiantamento.pdf");
        mostrarToast("PDF baixado com sucesso!", "success");
      }
    } catch (e) {
      mostrarToast("Erro ao gerar PDF: " + e.message, "error");
    }
  } catch (e) {
    mostrarToast("Erro ao gerar PDF: " + e.message, "error");
  }
}

// Fechar preview
function fecharPreviewPDF() {
  const modal = document.getElementById("pdfPreview");
  if (modal) modal.classList.remove("active");
  const pdfContainer = document.getElementById("pdfContainer");
  if(pdfContainer) pdfContainer.innerHTML = "";
}

// Download PDF
function downloadPDF() {
  if (pdfDoc) {
    const fornecedor = document.getElementById("fornecedor")?.value || "fornecedor";
    const dataEmissao = document.getElementById("dataEmissao")?.value || new Date().toISOString().split("T")[0];
    const fornecedorLimpo = fornecedor.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const nomeArquivo = `Adiantamento_${fornecedorLimpo}_${dataEmissao}.pdf`;
    try {
        pdfDoc.save(nomeArquivo);
        mostrarToast("PDF baixado com sucesso!", "success");
    } catch (e) {
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

    document.getElementById("closePdfPreview").addEventListener("click", fecharPreviewPDF);
    document.getElementById("downloadPdfBtn").addEventListener("click", downloadPDF);
}
