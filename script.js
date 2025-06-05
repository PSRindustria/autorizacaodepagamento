// ========== SCRIPT PARA FORMULÁRIO DE AUTORIZAÇÃO DE PAGAMENTO ==========

document.addEventListener("DOMContentLoaded", function () {
    inicializarMascaras();

    // Eventos dos botões
    document.getElementById("addRowBtn").addEventListener("click", adicionarLinhaTabela);
    document.getElementById("limparFormBtn").addEventListener("click", limparFormulario);
    document.getElementById("generatePdfBtn").addEventListener("click", validarEGerarPDF);

    // Validação em tempo real
    document.querySelectorAll("input, textarea, select").forEach((campo) => {
        campo.addEventListener("blur", function () {
            validarCampo(this);
        });
        campo.addEventListener("input", function () {
            this.classList.remove("input-error");
        });
    });
});

function inicializarMascaras() {
    // CNPJ Empresa
    let cnpjInput = document.getElementById("cnpjEmpresa");
    if (cnpjInput) {
        cnpjInput.addEventListener("input", function (e) {
            let valor = e.target.value.replace(/\D/g, "").slice(0, 14);
            if (valor.length > 12)
                valor = valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
            else if (valor.length > 8)
                valor = valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
            else if (valor.length > 5)
                valor = valor.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
            else if (valor.length > 2)
                valor = valor.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
            e.target.value = valor;
        });
    }
    // CPF/CNPJ Beneficiário
    let cpfCnpjInput = document.getElementById("cpfCnpjBeneficiario");
    if (cpfCnpjInput) {
        cpfCnpjInput.addEventListener("input", function (e) {
            let valor = e.target.value.replace(/\D/g, "");
            if (valor.length <= 11) {
                valor = valor.substring(0, 11);
                if (valor.length > 9) valor = valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})$/, "$1.$2.$3-$4");
                else if (valor.length > 6) valor = valor.replace(/^(\d{3})(\d{3})(\d{0,3})$/, "$1.$2.$3");
                else if (valor.length > 3) valor = valor.replace(/^(\d{3})(\d{0,3})$/, "$1.$2");
            } else {
                valor = valor.substring(0, 14);
                if (valor.length > 12)
                    valor = valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
                else if (valor.length > 8)
                    valor = valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
                else if (valor.length > 5)
                    valor = valor.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
                else if (valor.length > 2)
                    valor = valor.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
            }
            e.target.value = valor;
        });
    }
    // Valores
    aplicarMascaraValor(document.getElementById("totalGeral"));
}

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

// Adiciona linha de item
function adicionarLinhaTabela() {
    const tbody = document.querySelector("#itensTable tbody");
    if (tbody.rows.length >= 20) {
        mostrarToast("Máximo de 20 itens atingido.", "warning");
        return;
    }
    const novaLinha = document.createElement("tr");
    novaLinha.innerHTML = `
        <td><input type="text" name="itemCodigo[]" class="input-animated"></td>
        <td><input type="text" name="itemDescricao[]" class="input-animated"></td>
        <td><input type="number" name="itemQuantidade[]" class="input-animated" min="1"></td>
        <td><input type="text" name="itemValorUnitario[]" class="input-animated valor-item"></td>
        <td><input type="text" name="itemValorTotal[]" class="input-animated valor-item"></td>
        <td><button type="button" class="secondary-button removerItemBtn"><i class="fas fa-trash"></i></button></td>
    `;
    tbody.appendChild(novaLinha);
    novaLinha.querySelectorAll('.valor-item').forEach(aplicarMascaraValor);
    novaLinha.querySelector(".removerItemBtn").addEventListener("click", function () {
        novaLinha.remove();
    });
}

// Limpa o formulário
function limparFormulario() {
    document.getElementById("autorizacaoForm").reset();
    document.querySelectorAll(".validation-message").forEach((msg) => { msg.textContent = ""; });
    document.querySelectorAll(".input-error, .input-success").forEach((campo) => {
        campo.classList.remove("input-error", "input-success");
    });
    document.querySelector("#itensTable tbody").innerHTML = "";
    mostrarToast("Formulário limpo com sucesso", "success");
}

// Toasts
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

// Validação simples (pode aprimorar conforme necessidade)
function validarCampo(campo) {
    const id = campo.id;
    const valor = campo.value.trim();
    const obrigatorios = [
        "cnpjEmpresa", "empresa", "emailSolicitante", "solicitante", "departamento",
        "dataPagamento", "beneficiario", "cpfCnpjBeneficiario", "banco", "agencia", "conta", "tipoConta", "totalGeral"
    ];
    if (obrigatorios.includes(id) && !valor) {
        campo.classList.add("input-error");
        return false;
    } else {
        campo.classList.remove("input-error");
        return true;
    }
}

// Validação de todos os campos obrigatórios antes de gerar o PDF
function validarFormulario() {
    let ok = true;
    document.querySelectorAll("input, textarea, select").forEach((campo) => {
        if (!validarCampo(campo)) ok = false;
    });
    // Pelo menos uma forma de pagamento
    const checked = Array.from(document.querySelectorAll("input[name='formaPagamento']:checked"));
    if (checked.length === 0) {
        mostrarToast("Selecione pelo menos uma forma de pagamento", "error");
        ok = false;
    }
    return ok;
}

// Validação + Geração do PDF
function validarEGerarPDF() {
    if (validarFormulario()) {
        gerarPDF();
    } else {
        mostrarToast("Por favor, corrija os campos obrigatórios.", "error");
    }
}

// Utilitário: carrega logo como base64
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

// Função principal de geração de PDF (download automático)
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

  // === CABEÇALHO: Igual referência ===
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin;

  // Logo grande alinhada à direita
  const logoUrl = "https://i.postimg.cc/v8nRpXB7/logo.png";
  const logoWidth = 60;  // Mesmo tamanho da referência
  const logoHeight = 16;
  const logoX = pageWidth - margin - logoWidth;
  const logoY = currentY;
  const logoBase64 = await loadImageAsBase64(logoUrl);
  doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);

  // Caixa de versão (acima do título)
  const boxWidth = 38;
  const boxHeight = 10;
  const boxX = logoX - boxWidth - 3;
  const boxY = logoY;
  doc.setLineWidth(0.3);
  doc.setDrawColor(0);
  doc.rect(boxX, boxY, boxWidth, boxHeight);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("FOR_FIN_02_02", boxX + boxWidth / 2, boxY + 4, { align: "center" });
  doc.text("VERSÃO: 01", boxX + boxWidth / 2, boxY + 8, { align: "center" });

  // Título centralizado
  const tituloY = logoY + logoHeight + 10;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("FORMULÁRIO DE ADIANTAMENTO À FORNECEDOR", pageWidth / 2, tituloY, { align: "center" });

  // Linha horizontal grossa
  let afterTitleY = tituloY + 3;
  doc.setLineWidth(0.8);
  doc.line(margin, afterTitleY, pageWidth - margin, afterTitleY);
  currentY = afterTitleY + 5;

  // --- Colunas, campos, tabela e adiantamentos (igual modelo acima) ---
  // ... [MANTENHA O RESTO DO SEU SCRIPT COMO JÁ ESTÁ] ...
  // Use o mesmo padrão para os campos, adiantamentos e campos de dados de pagamento.

  // [AQUI vem toda a lógica de campos, tabela e estrutura do PDF, igual já estava no seu último script]

  // --- Assinaturas lado a lado ---
  currentY += 18;
  const signatureLineLength = 55;
  const col1X = margin + contentWidth * 0.13;
  const col2X = pageWidth - margin - contentWidth * 0.13 - signatureLineLength;

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
          console.error("Elemento #pdfContainer não encontrado.");
          mostrarToast("Erro ao exibir preview do PDF.", "error");
          downloadPDF();
      }
  } catch (e) {
      console.error("Erro ao gerar Data URI do PDF:", e);
      mostrarToast("Erro ao gerar preview do PDF.", "error");
  }
}
