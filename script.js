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
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Logo centralizada
    const logoBase64 = await loadImageAsBase64("https://i.postimg.cc/v8nRpXB7/logo.png");
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 60;
    const logoHeight = 17;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(logoBase64, 'PNG', logoX, 8, logoWidth, logoHeight);

    // Cabeçalho
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("FORMULÁRIO DE AUTORIZAÇÃO DE PAGAMENTO", pageWidth / 2, 27, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("FOR_FIN_02_01", 170, 13);
    doc.text("VERSÃO: 01", 170, 17);
    doc.setLineWidth(0.3);
    doc.line(10, 32, 200, 32);

    // Dados principais
    let y = 38;
    function addField(label, value) {
        doc.setFont("helvetica", "bold");
        doc.text(label, 12, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(value || ""), 70, y);
        y += 6;
    }
    addField("CNPJ:", document.getElementById("cnpjEmpresa").value);
    addField("EMPRESA:", document.getElementById("empresa").value);
    addField("E-MAIL:", document.getElementById("emailSolicitante").value);
    addField("SOLICITANTE:", document.getElementById("solicitante").value);
    addField("DEPARTAMENTO:", document.getElementById("departamento").value);

    // Forma de pagamento
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("FORMA DE PAGAMENTO:", 12, y);
    doc.setFont("helvetica", "normal");
    let checkX = 60, checkY = y - 3, box = 4;
    const formas = [
        { id: "pgtoPixTed", label: "PIX/TED" },
        { id: "pgtoBoleto", label: "BOLETO" },
        { id: "pgtoAdiantado", label: "PAGO ADIANTADO" }
    ];
    formas.forEach((f, i) => {
        doc.rect(checkX + (i * 33), checkY, box, box);
        if (document.getElementById(f.id).checked) {
            doc.setFont("helvetica", "bold");
            doc.text("X", checkX + (i * 33) + 1.4, checkY + 3.2);
            doc.setFont("helvetica", "normal");
        }
        doc.text(f.label, checkX + (i * 33) + 6, checkY + 3);
    });
    y += 8;
    addField("DATA PARA PAGAMENTO:", document.getElementById("dataPagamento").value);
    addField("ORDEM DE COMPRA:", document.getElementById("ordemCompra").value);
    addField("CENTRO DE CUSTO:", document.getElementById("centroCusto").value);

    // Finalidade/Observação
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÃO / FINALIDADE:", 12, y);
    doc.setFont("helvetica", "normal");
    const obs = document.getElementById("observacaoFinalidade").value || "";
    doc.text(doc.splitTextToSize(obs, 120), 12, y + 6);
    y += 15;

    // Tabela Itens/Serviços (com jsPDF-AutoTable)
    doc.setFont("helvetica", "bold");
    doc.text("ITENS / SERVIÇOS:", 12, y);
    y += 4;
    doc.setFontSize(8);

    // Coleta itens da tabela
    const itens = Array.from(document.querySelectorAll("#itensTable tbody tr")).map(tr => [
        tr.querySelector("input[name='itemCodigo[]']").value,
        tr.querySelector("input[name='itemDescricao[]']").value,
        tr.querySelector("input[name='itemQuantidade[]']").value,
        tr.querySelector("input[name='itemValorUnitario[]']").value,
        tr.querySelector("input[name='itemValorTotal[]']").value
    ]);

    doc.autoTable({
        startY: y,
        head: [['CÓDIGO', 'DESCRIÇÃO', 'QUANT.', 'V.UNIT.', 'V.TOTAL']],
        body: itens,
        margin: { left: 12, right: 12 },
        headStyles: { fillColor: [200, 200, 200] },
        theme: 'grid',
        styles: { font: "helvetica", fontSize: 8, cellPadding: 1.5 },
    });
    y = doc.lastAutoTable.finalY + 6;

    // Dados para pagamento
    doc.setFont("helvetica", "bold");
    doc.text("DADOS PARA PAGAMENTO:", 12, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    addField("BENEFICIÁRIO:", document.getElementById("beneficiario").value);
    addField("CPF / CNPJ:", document.getElementById("cpfCnpjBeneficiario").value);
    addField("BANCO:", document.getElementById("banco").value);
    addField("AGÊNCIA:", document.getElementById("agencia").value);
    addField("CONTA:", document.getElementById("conta").value);
    addField("TIPO DE CONTA:", document.getElementById("tipoConta").value);
    addField("CHAVE PIX:", document.getElementById("chavePix").value);

    // Total Geral
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL GERAL:", 130, y);
    doc.setFont("helvetica", "normal");
    doc.text(document.getElementById("totalGeral").value, 160, y);

    // Assinatura
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.line(12, y, 70, y);
    doc.text("Solicitante", 12, y + 5);

    // Download automático, sem modal
    doc.save("autorizacao_pagamento.pdf");
    mostrarToast("PDF gerado com sucesso!", "success");
}
