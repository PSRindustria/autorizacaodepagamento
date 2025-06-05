// Variáveis globais
let pdfDoc = null;
let formValidated = false;

// Função para inicializar o formulário
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("addRowBtn").addEventListener("click", adicionarLinhaTabela);
  document.getElementById("limparFormBtn").addEventListener("click", limparFormulario);
  document.getElementById("generatePdfBtn").addEventListener("click", validarEGerarPDF);

  document.querySelectorAll("input, textarea, select").forEach((campo) => {
    campo.addEventListener("blur", function () {
      validarCampo(this);
    });
    campo.addEventListener("input", function () {
      this.classList.remove("input-error");
    });
  });

  inicializarMascaras();

  if (!document.getElementById("toastContainer")) {
      const container = document.createElement("div");
      container.id = "toastContainer";
      document.body.appendChild(container);
  }

if (!document.getElementById("pdfPreview")) {
    const modal = document.createElement("div");
    modal.id = "pdfPreview";
    modal.className = "modal-overlay";
    modal.style.display = "none";
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
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5); display: none; justify-content: center; align-items: center; z-index: 999;
        }
        .modal-overlay.active {
            display: flex !important;
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
    `;
    document.head.appendChild(style);

    document.getElementById("closePdfPreview").addEventListener("click", fecharPreviewPDF);
    document.getElementById("downloadPdfBtn").addEventListener("click", downloadPDF);
}
});

// Máscara para valores e CNPJ/CPF
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

function adicionarLinhaTabela() {
  const tbody = document.querySelector("#itensTable tbody");
  if (tbody.rows.length >= 10) {
      mostrarToast("Máximo de 10 itens atingido.", "warning");
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

function limparFormulario() {
  document.getElementById("autorizacaoForm").reset();
  document.querySelectorAll(".validation-message").forEach((msg) => { msg.textContent = ""; });
  document.querySelectorAll(".input-error, .input-success").forEach((campo) => {
    campo.classList.remove("input-error", "input-success");
  });
  document.querySelector("#itensTable tbody").innerHTML = "";
  mostrarToast("Formulário limpo com sucesso", "success");
}

function mostrarToast(mensagem, tipo = "success") {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<span>${mensagem}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.classList.add("show"); }, 10);
  setTimeout(() => { toast.classList.remove("show"); toast.remove(); }, 3000);
}

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

function validarEGerarPDF() {
  if (validarFormulario()) {
    gerarPDF();
  } else {
    mostrarToast("Por favor, corrija os campos obrigatórios.", "error");
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

// =============== GERADOR PDF COMPLETO ===============
async function gerarPDF() {
  mostrarToast("Gerando PDF...", "info");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // --- Coleta dos Dados ---
  const dados = {
    cnpjEmpresa: document.getElementById("cnpjEmpresa").value,
    empresa: document.getElementById("empresa").value,
    emailSolicitante: document.getElementById("emailSolicitante").value,
    solicitante: document.getElementById("solicitante").value,
    departamento: document.getElementById("departamento").value,
    formasPagamento: Array.from(document.querySelectorAll("input[name='formaPagamento']:checked")).map(c => c.value),
    dataPagamento: document.getElementById("dataPagamento").value,
    ordemCompra: document.getElementById("ordemCompra").value,
    centroCusto: document.getElementById("centroCusto").value,
    observacaoFinalidade: document.getElementById("observacaoFinalidade").value,
    beneficiario: document.getElementById("beneficiario").value,
    cpfCnpjBeneficiario: document.getElementById("cpfCnpjBeneficiario").value,
    banco: document.getElementById("banco").value,
    agencia: document.getElementById("agencia").value,
    conta: document.getElementById("conta").value,
    tipoConta: document.getElementById("tipoConta").value,
    chavePix: document.getElementById("chavePix").value,
    totalGeral: document.getElementById("totalGeral").value,
    itens: [],
  };

  // Coletando itens
  const linhas = document.querySelectorAll("#itensTable tbody tr");
  linhas.forEach(linha => {
    const item = {
      codigo: linha.querySelector("input[name='itemCodigo[]']").value,
      descricao: linha.querySelector("input[name='itemDescricao[]']").value,
      quantidade: linha.querySelector("input[name='itemQuantidade[]']").value,
      valorUnitario: linha.querySelector("input[name='itemValorUnitario[]']").value,
      valorTotal: linha.querySelector("input[name='itemValorTotal[]']").value,
    };
    if (item.codigo || item.descricao || item.quantidade || item.valorUnitario || item.valorTotal) {
      dados.itens.push(item);
    }
  });

  // --- Cabeçalho visual igual ao PDF ---
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
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

  // Título e caixa de versão
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("FORMULÁRIO DE AUTORIZAÇÃO DE PAGAMENTO", pageWidth / 2, currentY + 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("FOR_FIN_02_01", pageWidth - margin, currentY + 2, { align: "right" });
  doc.text("VERSÃO: 01", pageWidth - margin, currentY + 6, { align: "right" });

  currentY += 14;
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // Dados Gerais da Empresa (esquerda)
  doc.setFont("helvetica", "bold"); doc.text("CNPJ:", margin, currentY + 4);
  doc.setFont("helvetica", "normal"); doc.text(dados.cnpjEmpresa, margin + 22, currentY + 4);

  doc.setFont("helvetica", "bold"); doc.text("EMPRESA:", margin, currentY + 9);
  doc.setFont("helvetica", "normal"); doc.text(dados.empresa, margin + 22, currentY + 9);

  doc.setFont("helvetica", "bold"); doc.text("E-MAIL:", margin, currentY + 14);
  doc.setFont("helvetica", "normal"); doc.text(dados.emailSolicitante, margin + 22, currentY + 14);

  doc.setFont("helvetica", "bold"); doc.text("SOLICITANTE:", margin, currentY + 19);
  doc.setFont("helvetica", "normal"); doc.text(dados.solicitante, margin + 22, currentY + 19);

  doc.setFont("helvetica", "bold"); doc.text("DEPARTAMENTO:", margin, currentY + 24);
  doc.setFont("helvetica", "normal"); doc.text(dados.departamento, margin + 30, currentY + 24);

  let direitaY = currentY;
  let direitaX = pageWidth / 2 + 2;

  doc.setFont("helvetica", "bold"); doc.text("FORMA DE PAGAMENTO:", direitaX, direitaY + 4);
  doc.setFont("helvetica", "normal");
  doc.text((dados.formasPagamento.join(" | ") || ""), direitaX + 40, direitaY + 4);

  doc.setFont("helvetica", "bold"); doc.text("DATA PARA PAGAMENTO:", direitaX, direitaY + 9);
  doc.setFont("helvetica", "normal"); doc.text(formatarData(dados.dataPagamento), direitaX + 40, direitaY + 9);

  doc.setFont("helvetica", "bold"); doc.text("ORDEM DE COMPRA:", direitaX, direitaY + 14);
  doc.setFont("helvetica", "normal"); doc.text(dados.ordemCompra, direitaX + 40, direitaY + 14);

  doc.setFont("helvetica", "bold"); doc.text("CENTRO DE CUSTO:", direitaX, direitaY + 19);
  doc.setFont("helvetica", "normal"); doc.text(dados.centroCusto, direitaX + 40, direitaY + 19);

  currentY += 28;
  // Observação/Finalidade
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVAÇÃO / FINALIDADE:", margin, currentY + 5);
  doc.setFont("helvetica", "normal");
  let finalidadeLines = doc.splitTextToSize(dados.observacaoFinalidade, pageWidth - margin * 2);
  doc.text(finalidadeLines, margin, currentY + 10);
  currentY += Math.max(14, finalidadeLines.length * 4 + 6);

  // --- Tabela Itens/Serviços ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ITENS / SERVIÇOS:", margin, currentY + 3);

  currentY += 6;

  doc.autoTable({
    startY: currentY,
    head: [['CÓDIGO', 'DESCRIÇÃO', 'QUANT.', 'V.UNIT.', 'V.TOTAL']],
    body: dados.itens.map(i => [
      i.codigo, i.descricao, i.quantidade, i.valorUnitario, i.valorTotal
    ]),
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [200, 200, 200] },
    theme: 'grid',
    styles: { font: "helvetica", fontSize: 8, cellPadding: 1.5 },
  });
  currentY = doc.lastAutoTable.finalY + 4;

  // Dados para pagamento
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DADOS PARA PAGAMENTO:", margin, currentY + 5);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("BENEFICIÁRIO:", margin, currentY + 10); doc.text(dados.beneficiario, margin + 25, currentY + 10);
  doc.text("CPF / CNPJ:", margin, currentY + 15); doc.text(dados.cpfCnpjBeneficiario, margin + 25, currentY + 15);
  doc.text("BANCO:", margin, currentY + 20); doc.text(dados.banco, margin + 25, currentY + 20);
  doc.text("AGÊNCIA:", margin, currentY + 25); doc.text(dados.agencia, margin + 25, currentY + 25);
  doc.text("CONTA:", margin, currentY + 30); doc.text(dados.conta, margin + 25, currentY + 30);
  doc.text("TIPO DE CONTA:", margin, currentY + 35); doc.text(dados.tipoConta, margin + 25, currentY + 35);
  doc.text("CHAVE PIX:", margin, currentY + 40); doc.text(dados.chavePix, margin + 25, currentY + 40);

  // Total geral
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL GERAL:", pageWidth - margin - 60, currentY + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("R$ " + (dados.totalGeral || "0,00"), pageWidth - margin - 20, currentY + 30);

  // --- Assinaturas
  let assinaturaY = currentY + 75;
  if (assinaturaY > 255) assinaturaY = 255;

  doc.setFont("helvetica", "normal");
  doc.setLineWidth(0.3);
  doc.line(margin + 10, assinaturaY, margin + 70, assinaturaY);
  doc.text("Solicitante", margin + 40, assinaturaY + 5, { align: "center" });

  doc.line(pageWidth - margin - 70, assinaturaY, pageWidth - margin - 10, assinaturaY);
  doc.text("Controladoria", pageWidth - margin - 40, assinaturaY + 5, { align: "center" });

  // --- Finalização
  pdfDoc = doc;

  try {
      const pdfData = doc.output("datauristring");
      const pdfContainer = document.getElementById("pdfContainer");
      if (pdfContainer) {
          pdfContainer.innerHTML = `<embed width="100%" height="100%" src="${pdfData}" type="application/pdf">`;
          // Mostra o modal centralizado na tela
          document.getElementById("pdfPreview").classList.add("active");
          document.getElementById("pdfPreview").style.display = "flex";
          mostrarToast("PDF gerado com sucesso!", "success");
      }
  } catch (e) {
      mostrarToast("Erro ao gerar preview do PDF.", "error");
  }
}

// Fechar preview
function fecharPreviewPDF() {
  const modal = document.getElementById("pdfPreview");
  if(modal){
    modal.classList.remove("active");
    modal.style.display = "none";
    const pdfContainer = document.getElementById("pdfContainer");
    if(pdfContainer) pdfContainer.innerHTML = "";
  }
}

// Download PDF
function downloadPDF() {
  if (pdfDoc) {
    const empresa = document.getElementById("empresa").value || "empresa";
    const data = new Date().toISOString().split("T")[0];
    const empresaLimpo = empresa.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const nomeArquivo = `AutorizacaoPagamento_${empresaLimpo}_${data}.pdf`;
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
