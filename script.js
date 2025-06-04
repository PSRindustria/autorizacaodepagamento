// Variáveis globais
let pdfDoc = null; // Para armazenar o PDF gerado para download/preview
let formValidated = false;

// --- Funções Utilitárias ---

// Formata número para moeda BRL (ex: 1234.56 -> R$ 1.234,56)
function formatarMoeda(valor, incluirSimbolo = true) {
    if (valor === null || valor === undefined || valor === "") return incluirSimbolo ? "R$ 0,00" : "0,00";
    const numero = parseFloat(String(valor).replace(/\./g, "").replace(",", "."));
    if (isNaN(numero)) return incluirSimbolo ? "R$ 0,00" : "0,00";
    const formatado = numero.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return incluirSimbolo ? `R$ ${formatado}` : formatado;
}

// Converte string de moeda BRL para número (ex: R$ 1.234,56 -> 1234.56)
function desformatarMoeda(valorStr) {
    if (!valorStr) return 0;
    const numeroStr = String(valorStr).replace(/[^\d,]/g, "").replace(",", ".");
    const numero = parseFloat(numeroStr);
    return isNaN(numero) ? 0 : numero;
}

// Formata data YYYY-MM-DD para DD/MM/YYYY
function formatarData(dataStr) {
    if (!dataStr) return "__/__/____";
    try {
        const [ano, mes, dia] = dataStr.split("-");
        if (!ano || !mes || !dia || ano.length !== 4 || mes.length !== 2 || dia.length !== 2) return "__/__/____";
        return `${dia}/${mes}/${ano}`;
    } catch (e) {
        console.error("Erro ao formatar data:", e);
        return "__/__/____";
    }
}

// Aplica máscara de valor monetário a um input
function aplicarMascaraValor(input) {
    Inputmask("currency", {
        alias: "numeric",
        groupSeparator: ".",
        radixPoint: ",",
        digits: 2,
        autoGroup: true,
        prefix: "", // Prefixo R$ será visual, não no valor
        rightAlign: false,
        placeholder: "0,00",
        clearMaskOnLostFocus: false,
        removeMaskOnSubmit: true, // Remove máscara ao pegar valor
        onBeforeMask: function (value, opts) {
            if (value === "") return value;
            let v = value.replace(/[^\d]/g, "");
            v = (parseInt(v, 10) / 100).toFixed(2);
            return v;
        }
    }).mask(input);
}

// Aplica máscara de CNPJ
function aplicarMascaraCnpj(input) {
    Inputmask("99.999.999/9999-99", { clearMaskOnLostFocus: false }).mask(input);
}

// Aplica máscara de CPF ou CNPJ
function aplicarMascaraCpfCnpj(input) {
    Inputmask({ 
        mask: ["999.999.999-99", "99.999.999/9999-99"], 
        keepStatic: true, 
        clearMaskOnLostFocus: false 
    }).mask(input);
}

// Valida CNPJ (simplificado - apenas verifica formato)
function validarCNPJ(cnpj) {
    if (!cnpj) return false;
    const numeros = cnpj.replace(/\D/g, "");
    return numeros.length === 14;
}

// Valida CPF (simplificado - apenas verifica formato)
function validarCPF(cpf) {
    if (!cpf) return false;
    const numeros = cpf.replace(/\D/g, "");
    return numeros.length === 11;
}

// Valida CPF ou CNPJ
function validarCpfCnpj(cpfCnpj) {
    if (!cpfCnpj) return false;
    const numeros = cpfCnpj.replace(/\D/g, "");
    return numeros.length === 11 || numeros.length === 14;
}

// Carrega imagem como Base64 (para embutir no PDF)
// Removido - Não usaremos logo externo por enquanto
/*
function loadImageAsBase64(url) {
    // ... (código anterior)
}
*/

// --- Lógica da Tabela de Itens ---

// Adiciona uma nova linha à tabela de itens
function adicionarLinhaItem() {
    const tbody = document.querySelector("#itensTable tbody");
    const novaLinha = document.createElement("tr");
    novaLinha.classList.add("item-row");

    novaLinha.innerHTML = `
        <td><input type="text" name="itemCodigo[]" class="input-animated item-codigo"></td>
        <td><input type="text" name="itemDescricao[]" class="input-animated item-descricao"></td>
        <td><input type="number" name="itemQuantidade[]" class="input-animated item-quantidade" min="0" step="any" value="1"></td>
        <td><input type="text" name="itemValorUnitario[]" class="input-animated item-valor-unitario" placeholder="0,00"></td>
        <td><input type="text" name="itemValorTotal[]" class="input-animated item-valor-total" placeholder="0,00" readonly></td>
        <td><button type="button" class="delete-row-btn"><i class="fas fa-trash-alt"></i></button></td>
    `;

    tbody.appendChild(novaLinha);
    novaLinha.classList.add("fade-in");

    // Aplica máscara e listeners aos novos campos
    const valorUnitarioInput = novaLinha.querySelector(".item-valor-unitario");
    const quantidadeInput = novaLinha.querySelector(".item-quantidade");
    aplicarMascaraValor(valorUnitarioInput);

    valorUnitarioInput.addEventListener("input", () => calcularTotalLinha(novaLinha));
    quantidadeInput.addEventListener("input", () => calcularTotalLinha(novaLinha));
    novaLinha.querySelector(".delete-row-btn").addEventListener("click", () => removerLinhaItem(novaLinha));

    calcularTotalGeral(); // Recalcula total geral ao adicionar linha
    // mostrarToast("Nova linha de item adicionada", "success"); // Removido para não poluir
}

// Remove uma linha da tabela de itens
function removerLinhaItem(linha) {
    linha.classList.add("fade-out"); // Animação opcional
    setTimeout(() => {
        linha.remove();
        calcularTotalGeral(); // Recalcula total geral ao remover linha
        mostrarToast("Linha de item removida", "info");
    }, 300); // Tempo da animação
}

// Calcula o valor total para uma linha específica da tabela
function calcularTotalLinha(linha) {
    const quantidadeInput = linha.querySelector(".item-quantidade");
    const valorUnitarioInput = linha.querySelector(".item-valor-unitario");
    const valorTotalInput = linha.querySelector(".item-valor-total");

    const quantidade = parseFloat(quantidadeInput.value) || 0;
    // Usa removeMaskOnSubmit: true na máscara, então pega valor direto
    const valorUnitario = parseFloat(valorUnitarioInput.inputmask.unmaskedvalue()) || 0;

    const valorTotal = quantidade * valorUnitario;

    valorTotalInput.value = formatarMoeda(valorTotal, false); // Mostra só o número formatado
    calcularTotalGeral(); // Recalcula o total geral sempre que uma linha muda
}

// Calcula o valor total de todos os itens da tabela
function calcularTotalGeral() {
    const linhas = document.querySelectorAll("#itensTable tbody tr");
    let totalGeral = 0;

    linhas.forEach(linha => {
        const valorTotalInput = linha.querySelector(".item-valor-total");
        // O valor total da linha já está calculado, mas precisamos desformatar
        const valorTotalLinha = desformatarMoeda(valorTotalInput.value);
        totalGeral += valorTotalLinha;
    });

    const valorTotalItensInput = document.getElementById("valorTotalItens");
    valorTotalItensInput.value = formatarMoeda(totalGeral, false); // Mostra só o número formatado
    atualizarProgressoFormulario(); // Atualiza progresso ao mudar total
}

// --- Validação do Formulário ---

function validarCampo(campo) {
    const id = campo.id;
    let valor = campo.value.trim();
    // Remove máscara para validação se necessário (ex: CNPJ)
    if (campo.inputmask) {
        valor = campo.inputmask.unmaskedvalue();
    }
    const mensagemValidacao = document.getElementById(`${id}-validation`);
    let valido = true;
    let mensagemErro = "";

    campo.classList.remove("input-error", "input-success");
    if (mensagemValidacao) mensagemValidacao.textContent = "";

    // Lista de campos obrigatórios gerais
    const obrigatorios = [
        "cnpjEmpresa", "empresa", "emailSolicitante", "solicitante", "departamento",
        "dataPagamento", "observacaoFinalidade",
        "beneficiario", "cpfCnpjBeneficiario", "banco", "agencia", "conta", "tipoConta"
    ];

    if (obrigatorios.includes(id) && !valor) {
        mensagemErro = "Campo obrigatório";
        valido = false;
    }

    // Validações específicas
    if (valido && id === "cnpjEmpresa" && valor && !validarCNPJ(campo.value)) { // Usa valor com máscara para validação de formato completo
        mensagemErro = "CNPJ inválido";
        valido = false;
    }
    if (valido && id === "emailSolicitante" && valor && !/^[\w\.-]+@[\w\.-]+\.\w+$/.test(valor)) {
        mensagemErro = "E-mail inválido";
        valido = false;
    }
    if (valido && id === "cpfCnpjBeneficiario" && valor && !validarCpfCnpj(campo.value)) { // Usa valor com máscara
        mensagemErro = "CPF ou CNPJ inválido";
        valido = false;
    }

    if (!valido) {
        campo.classList.add("input-error");
        if (mensagemValidacao) mensagemValidacao.textContent = mensagemErro;
    } else if (valor) {
        campo.classList.add("input-success");
    }

    return valido;
}

function validarFormulario() {
    let formValido = true;

    // Validar campos de input, textarea, select
    const camposValidaveis = document.querySelectorAll(
        "#autorizacaoForm input:not([type=\"checkbox\"]):not([type=\"radio\"]):not([type=\"button\"]):not(.item-valor-total),
         #autorizacaoForm textarea,
         #autorizacaoForm select"
    );
    camposValidaveis.forEach((campo) => {
        // Só valida se for obrigatório ou se tiver valor preenchido
        const obrigatorios = [
            "cnpjEmpresa", "empresa", "emailSolicitante", "solicitante", "departamento",
            "dataPagamento", "observacaoFinalidade",
            "beneficiario", "cpfCnpjBeneficiario", "banco", "agencia", "conta", "tipoConta"
        ];
        // Valida campo obrigatório OU campo preenchido
        if (obrigatorios.includes(campo.id) || campo.value.trim() !== "") {
             if (!validarCampo(campo)) {
                 formValido = false;
             }
        }
    });

    // Validar forma de pagamento (checkbox)
    const formasPagamento = document.querySelectorAll("input[name=\"formaPagamento\"]:checked");
    const validacaoFormaPagamento = document.getElementById("formaPagamento-validation");
    const checkboxGroup = document.querySelector(".checkbox-group");
    if (formasPagamento.length === 0) {
        if (validacaoFormaPagamento) validacaoFormaPagamento.textContent = "Selecione ao menos uma forma de pagamento";
        if (checkboxGroup) checkboxGroup.classList.add("input-error");
        formValido = false;
    } else {
        if (validacaoFormaPagamento) validacaoFormaPagamento.textContent = "";
        if (checkboxGroup) checkboxGroup.classList.remove("input-error");
    }

    // Validar tabela de itens (pelo menos uma linha e valores válidos)
    const linhasItens = document.querySelectorAll("#itensTable tbody tr");
    if (linhasItens.length === 0) {
        mostrarToast("Adicione pelo menos um item/serviço à tabela.", "warning");
        formValido = false;
    } else {
        linhasItens.forEach((linha, index) => {
            const descInput = linha.querySelector(".item-descricao");
            const qtdInput = linha.querySelector(".item-quantidade");
            const valUnitInput = linha.querySelector(".item-valor-unitario");

            let linhaValida = true;

            if (!descInput.value.trim()) {
                descInput.classList.add("input-error");
                linhaValida = false;
            } else {
                descInput.classList.remove("input-error");
            }
            if (!qtdInput.value || parseFloat(qtdInput.value) <= 0) {
                qtdInput.classList.add("input-error");
                linhaValida = false;
            } else {
                qtdInput.classList.remove("input-error");
            }
            // Usa valor desmascarado para checar se é > 0
            if (!valUnitInput.value || !valUnitInput.inputmask || parseFloat(valUnitInput.inputmask.unmaskedvalue()) <= 0) {
                valUnitInput.classList.add("input-error");
                linhaValida = false;
            } else {
                valUnitInput.classList.remove("input-error");
            }

            if (!linhaValida) {
                 mostrarToast(`Verifique os dados do item ${index + 1} (descrição, qtd e valor unitário devem ser preenchidos e > 0).`, "error");
                 formValido = false;
            }
        });
    }

    formValidated = formValido; // Atualiza estado global
    return formValido;
}

// --- Progresso e Interação ---

function atualizarProgressoFormulario() {
    // Define quais campos contribuem para o progresso
    const camposParaProgresso = [
        "cnpjEmpresa", "empresa", "emailSolicitante", "solicitante", "departamento",
        "dataPagamento", "observacaoFinalidade",
        "beneficiario", "cpfCnpjBeneficiario", "banco", "agencia", "conta", "tipoConta"
    ];
    let preenchidos = 0;
    const totalCampos = camposParaProgresso.length + 2; // +1 para forma de pagamento, +1 para tabela ter itens válidos

    camposParaProgresso.forEach(id => {
        const campo = document.getElementById(id);
        if (campo && campo.value.trim() !== "") {
            preenchidos++;
        }
    });

    if (document.querySelectorAll("input[name=\"formaPagamento\"]:checked").length > 0) {
        preenchidos++;
    }

    // Considera progresso da tabela apenas se houver linhas e total > 0
    if (document.querySelectorAll("#itensTable tbody tr").length > 0 && desformatarMoeda(document.getElementById("valorTotalItens").value) > 0) {
        preenchidos++;
    }

    const progresso = (preenchidos / totalCampos) * 100;
    document.getElementById("formProgress").style.width = `${Math.min(progresso, 100)}%`;
}

function limparFormulario() {
    document.getElementById("autorizacaoForm").reset();

    // Limpar tabela de itens e adicionar uma linha nova
    const tbody = document.querySelector("#itensTable tbody");
    tbody.innerHTML = "";
    adicionarLinhaItem(); // Adiciona uma linha limpa
    calcularTotalGeral(); // Reseta o total

    // Limpar mensagens de validação e classes de erro/sucesso
    document.querySelectorAll(".validation-message").forEach((msg) => {
        msg.textContent = "";
    });
    document.querySelectorAll(".input-error, .input-success").forEach((campo) => {
        campo.classList.remove("input-error", "input-success");
    });
    document.querySelector(".checkbox-group")?.classList.remove("input-error");

    // Resetar barra de progresso
    document.getElementById("formProgress").style.width = "0%";
    formValidated = false;
    mostrarToast("Formulário limpo com sucesso", "success");
}

function mostrarToast(mensagem, tipo = "success") {
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) {
        console.warn("Elemento #toastContainer não encontrado.");
        alert(mensagem); // Fallback
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
    toast.offsetHeight; // Trigger reflow to enable animation
    toast.classList.add("show");

    const progressElement = toast.querySelector(".toast-progress");
    setTimeout(() => {
        if (progressElement) progressElement.style.width = "100%";
    }, 100); // Pequeno delay para iniciar a barra

    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }, 3000); // Duração do toast
}

// --- Geração e Manipulação do PDF ---

function validarEGerarPDF() {
    if (validarFormulario()) {
        gerarPDF(); // Chama a função de geração
    } else {
        mostrarToast("Por favor, corrija os erros no formulário antes de gerar o PDF.", "error");
        // Foca no primeiro campo com erro
        const primeiroErro = document.querySelector(".input-error, .checkbox-group.input-error");
        if (primeiroErro) {
            primeiroErro.scrollIntoView({ behavior: "smooth", block: "center" });
            if (primeiroErro.focus) primeiroErro.focus();
        }
    }
}

// Coleta todos os dados do formulário em um objeto, desmascarando valores
function coletarDadosFormulario() {
    const dados = {};
    const form = document.getElementById("autorizacaoForm");

    // Coleta campos simples
    const inputs = form.querySelectorAll("input:not([type=\"checkbox\"]):not([type=\"radio\"]):not([type=\"button\"]), textarea, select");
    inputs.forEach(input => {
        if (input.name && !input.closest("#itensTable")) { // Ignora inputs da tabela por enquanto
            dados[input.id] = input.inputmask ? input.inputmask.unmaskedvalue() : input.value;
        }
    });

    // Coleta checkboxes de forma de pagamento
    dados.formaPagamento = [];
    form.querySelectorAll("input[name=\"formaPagamento\"]:checked").forEach(chk => {
        dados.formaPagamento.push(chk.value);
    });

    // Coleta dados da tabela de itens
    dados.itens = [];
    const linhasItens = document.querySelectorAll("#itensTable tbody tr");
    linhasItens.forEach(linha => {
        const item = {
            codigo: linha.querySelector(".item-codigo").value,
            descricao: linha.querySelector(".item-descricao").value,
            quantidade: linha.querySelector(".item-quantidade").value,
            // Pega valor unitário desmascarado
            valorUnitario: linha.querySelector(".item-valor-unitario").inputmask ? linha.querySelector(".item-valor-unitario").inputmask.unmaskedvalue() : linha.querySelector(".item-valor-unitario").value,
            // Pega valor total desmascarado (já calculado)
            valorTotal: desformatarMoeda(linha.querySelector(".item-valor-total").value)
        };
        dados.itens.push(item);
    });

    // Adiciona o total geral desmascarado
    dados.valorTotalGeral = desformatarMoeda(document.getElementById("valorTotalItens").value);

    return dados;
}

// Função principal para gerar o PDF com layout do modelo
async function gerarPDF() {
    mostrarToast("Gerando PDF...", "info");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const dados = coletarDadosFormulario();
    console.log("Dados para PDF:", dados);

    // --- Definições de Layout ---
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;
    const smallFontSize = 8;
    const baseFontSize = 10;
    const titleFontSize = 14;
    const labelColor = [100, 100, 100]; // Cinza para labels
    const valueColor = [0, 0, 0]; // Preto para valores
    const lineColor = [200, 200, 200]; // Cinza claro para linhas
    const tableHeaderColor = [240, 240, 240]; // Fundo cinza claro para header da tabela
    const lineHeight = 5;
    const fieldSeparator = 3;

    // --- Cabeçalho (Estilo Original Adaptado) ---
    // Nota: O cabeçalho original tinha um gradiente, que é difícil de replicar perfeitamente em jsPDF.
    // Usaremos uma cor sólida ou uma aproximação.
    const headerHeight = 20;
    doc.setFillColor(0, 86, 179); // Azul primário da paleta CSS
    doc.rect(margin, currentY, contentWidth, headerHeight, 'F');
    doc.setFontSize(titleFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("FORMULÁRIO DE AUTORIZAÇÃO DE PAGAMENTO", pageWidth / 2, currentY + headerHeight / 2 + 3, { align: "center" });

    // Caixa de Código/Versão
    const boxWidth = 30;
    const boxHeight = 10;
    const boxX = pageWidth - margin - boxWidth;
    const boxY = currentY + (headerHeight - boxHeight) / 2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 86, 179);
    doc.rect(boxX, boxY, boxWidth, boxHeight, 'FD');
    doc.setFontSize(smallFontSize - 1);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 86, 179);
    doc.text("FOR_FIN_02_01", boxX + boxWidth / 2, boxY + 4, { align: "center" });
    doc.text("VERSÃO: 01", boxX + boxWidth / 2, boxY + 8, { align: "center" });

    currentY += headerHeight + 5;

    // --- Seção: Dados Gerais e Pagamento ---
    doc.setFontSize(baseFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text("DADOS GERAIS DA EMPRESA", margin, currentY);
    currentY += lineHeight;
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.line(margin, currentY, margin + contentWidth, currentY); // Linha separadora
    currentY += fieldSeparator;

    const col1X = margin;
    const col2X = margin + contentWidth / 2 + 5;
    const colWidth = contentWidth / 2 - 5;
    let startY_Sec1 = currentY;

    // Coluna 1: Dados Empresa
    doc.setFontSize(smallFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("CNPJ:", col1X, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.cnpjEmpresa || "", col1X + 15, currentY);
    currentY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("EMPRESA:", col1X, currentY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.empresa || "", col1X + 20, currentY);
    currentY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("E-MAIL:", col1X, currentY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.emailSolicitante || "", col1X + 18, currentY);
    currentY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("SOLICITANTE:", col1X, currentY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.solicitante || "", col1X + 30, currentY);
    currentY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("DEPARTAMENTO:", col1X, currentY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.departamento || "", col1X + 35, currentY);
    let endY_Col1 = currentY;

    // Coluna 2: Dados Pagamento
    currentY = startY_Sec1;
    doc.setFontSize(smallFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("FORMA DE PAGAMENTO:", col2X, currentY);
    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    const formas = dados.formaPagamento || [];
    const checkboxSize = 3;
    const checkboxSpacing = 4;
    let chkY = currentY;
    doc.rect(col2X, chkY, checkboxSize, checkboxSize); if (formas.includes("PIX/TED")) { doc.text("X", col2X + 0.5, chkY + 2.5); } doc.text("PIX/TED", col2X + checkboxSpacing, chkY + 2.5);
    chkY += checkboxSpacing;
    doc.rect(col2X, chkY, checkboxSize, checkboxSize); if (formas.includes("BOLETO")) { doc.text("X", col2X + 0.5, chkY + 2.5); } doc.text("BOLETO", col2X + checkboxSpacing, chkY + 2.5);
    chkY += checkboxSpacing;
    doc.rect(col2X, chkY, checkboxSize, checkboxSize); if (formas.includes("PAGO ADIANTADO")) { doc.text("X", col2X + 0.5, chkY + 2.5); } doc.text("PAGO ADIANTADO", col2X + checkboxSpacing, chkY + 2.5);
    currentY = chkY + lineHeight; // Atualiza Y após checkboxes

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("DATA PARA PAGAMENTO:", col2X, currentY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(formatarData(dados.dataPagamento) || "", col2X + 45, currentY);
    currentY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("ORDEM DE COMPRA:", col2X, currentY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.ordemCompra || "", col2X + 40, currentY);
    currentY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("CENTRO DE CUSTO:", col2X, currentY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.centroCusto || "", col2X + 38, currentY);
    let endY_Col2 = currentY;

    currentY = Math.max(endY_Col1, endY_Col2) + 5;

    // --- Seção: Observação / Finalidade ---
    doc.setFontSize(baseFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text("OBSERVAÇÃO DESCRITA NA ORDEM DE COMPRA / FINALIDADE", margin, currentY);
    currentY += lineHeight;
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += fieldSeparator;

    doc.setFontSize(smallFontSize);
    doc.setFont("helvetica", "normal");
    // Usar splitTextToSize para quebrar texto longo
    const obsLines = doc.splitTextToSize(dados.observacaoFinalidade || "", contentWidth);
    doc.text(obsLines, margin, currentY);
    currentY += obsLines.length * (lineHeight * 0.7) + 2; // Ajusta Y baseado no número de linhas

    // --- Seção: Tabela de Itens ---
    const tableStartY = currentY + 2;
    const tableHeaders = ["CÓDIGO DO ITEM", "DESCRIÇÃO DO ITEM / SERVIÇO", "QTD", "V. UNITÁRIO", "V. TOTAL"];
    // Larguras relativas (soma deve ser ~1)
    const tableColWidths = [0.12, 0.43, 0.10, 0.15, 0.20].map(w => w * contentWidth);
    const tableRowHeight = 6;
    const tableHeaderHeight = 7;

    // Função para desenhar a tabela (com auto page break)
    const drawTable = (startX, startY, headers, data, colWidths, rowH, headerH) => {
        let y = startY;
        const xPositions = [startX];
        for (let i = 0; i < colWidths.length - 1; i++) {
            xPositions.push(xPositions[i] + colWidths[i]);
        }

        // Desenhar Cabeçalho
        doc.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]);
        doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
        doc.setLineWidth(0.1);
        doc.rect(startX, y, contentWidth, headerH, 'FD');
        doc.setFontSize(smallFontSize - 1);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
        headers.forEach((header, i) => {
            doc.text(header, xPositions[i] + 2, y + headerH / 2 + 1.5, { align: (i > 1 ? 'right' : 'left'), maxWidth: colWidths[i] - 4 });
        });
        y += headerH;

        // Desenhar Linhas de Dados
        doc.setFontSize(smallFontSize);
        doc.setFont("helvetica", "normal");
        data.forEach((row, rowIndex) => {
            // Verificar Page Break
            if (y + rowH > pageHeight - margin - 25) { // Deixa espaço para dados bancários e total
                doc.addPage();
                y = margin; // Reinicia Y na nova página
                // Redesenhar cabeçalho na nova página
                doc.setFillColor(tableHeaderColor[0], tableHeaderColor[1], tableHeaderColor[2]);
                doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
                doc.rect(startX, y, contentWidth, headerH, 'FD');
                doc.setFontSize(smallFontSize - 1);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
                headers.forEach((header, i) => {
                    doc.text(header, xPositions[i] + 2, y + headerH / 2 + 1.5, { align: (i > 1 ? 'right' : 'left'), maxWidth: colWidths[i] - 4 });
                });
                y += headerH;
            }

            // Desenhar Células da Linha
            doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
            doc.setLineWidth(0.1);
            doc.rect(startX, y, contentWidth, rowH);

            const cellValues = [
                row.codigo || "",
                row.descricao || "",
                row.quantidade || "",
                formatarMoeda(row.valorUnitario, false) || "0,00",
                formatarMoeda(row.valorTotal, false) || "0,00"
            ];

            cellValues.forEach((value, i) => {
                let align = 'left';
                if (i === 2) align = 'center'; // Quantidade
                if (i > 2) align = 'right'; // Valores
                // Quebrar texto da descrição se for muito longo
                const textOptions = { align: align, maxWidth: colWidths[i] - 4 };
                const textContent = doc.splitTextToSize(String(value), colWidths[i] - 4);
                doc.text(textContent, xPositions[i] + 2, y + rowH / 2 + 1.5, textOptions);
            });
            y += rowH;
        });
        return y; // Retorna a posição Y final
    };

    currentY = drawTable(margin, tableStartY, tableHeaders, dados.itens, tableColWidths, tableRowHeight, tableHeaderHeight);
    currentY += 5; // Espaço após a tabela

    // --- Seção: Dados para Pagamento (Inferior) e Total ---
    // Verificar se há espaço suficiente, senão adicionar nova página
    const bottomSectionHeight = 50; // Estimativa da altura necessária
    if (currentY + bottomSectionHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
    }

    const bottomStartY = currentY;
    doc.setFontSize(baseFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text("DADOS PARA PAGAMENTO", margin, currentY);
    currentY += lineHeight;
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += fieldSeparator;

    // Coluna 1: Dados Bancários
    let bankY = currentY;
    doc.setFontSize(smallFontSize);
    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("BENEFICIÁRIO:", col1X, bankY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.beneficiario || "", col1X + 30, bankY);
    bankY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("CPF / CNPJ:", col1X, bankY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.cpfCnpjBeneficiario || "", col1X + 25, bankY);
    bankY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("BANCO:", col1X, bankY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.banco || "", col1X + 18, bankY);
    bankY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("AGÊNCIA:", col1X, bankY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.agencia || "", col1X + 20, bankY);
    bankY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("CONTA:", col1X, bankY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.conta || "", col1X + 18, bankY);
    bankY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("TIPO DE CONTA:", col1X, bankY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.tipoConta || "", col1X + 32, bankY);
    bankY += lineHeight;

    doc.setFont("helvetica", "bold"); doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("CHAVE PIX:", col1X, bankY);
    doc.setFont("helvetica", "normal"); doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(dados.chavePix || "", col1X + 25, bankY);

    // Coluna 2: Total
    const totalX = col2X + colWidth - 40; // Alinha à direita da coluna 2
    const totalY = bottomStartY + 5; // Posição Y do total
    doc.setFontSize(baseFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text("TOTAL", totalX, totalY, { align: 'right' });
    doc.setFontSize(titleFontSize); // Fonte maior para o valor total
    doc.setFont("helvetica", "bold");
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(formatarMoeda(dados.valorTotalGeral) || "R$ 0,00", totalX + 38, totalY, { align: 'right' });

    // --- Finalização ---
    mostrarToast("PDF gerado com sucesso!", "success");
    abrirPreviewPDF(doc); // Abre o modal com o PDF

} catch (error) {
    console.error("Erro detalhado ao gerar PDF:", error);
    mostrarToast(`Erro ao gerar PDF: ${error.message}`, "error");
}
}

// Abre o modal de preview com o PDF gerado
function abrirPreviewPDF(docInstance) {
    try {
        const pdfDataUri = docInstance.output("datauristring");
        document.getElementById("pdfPreviewFrame").src = pdfDataUri;
        document.getElementById("pdfPreviewModal").style.display = "block";
        pdfDoc = docInstance; // Armazena o objeto jsPDF para download
    } catch (e) {
        console.error("Erro ao gerar Data URI do PDF:", e);
        mostrarToast("Erro ao tentar exibir a pré-visualização do PDF.", "error");
    }
}

// Fecha o modal de preview
function fecharPreviewPDF() {
    document.getElementById("pdfPreviewModal").style.display = "none";
    document.getElementById("pdfPreviewFrame").src = ""; // Limpa o iframe
    pdfDoc = null;
}

// Faz o download do PDF armazenado
function downloadPDF() {
    if (pdfDoc) {
        try {
            // Gera nome do arquivo baseado na empresa e data
            const empresaNome = document.getElementById('empresa')?.value.replace(/[^a-zA-Z0-9]/g, '_') || 'Empresa';
            const dataHoje = new Date().toISOString().split('T')[0];
            const nomeArquivo = `Autorizacao_Pagamento_${empresaNome}_${dataHoje}.pdf`;
            pdfDoc.save(nomeArquivo);
            mostrarToast("Download do PDF iniciado.", "success");
        } catch (e) {
            console.error("Erro ao salvar PDF:", e);
            mostrarToast("Erro ao iniciar o download do PDF.", "error");
        }
    } else {
        mostrarToast("Nenhum PDF disponível para download. Gere o PDF primeiro.", "warning");
    }
}

// --- Inicialização ---
document.addEventListener("DOMContentLoaded", function () {
    // Adiciona listeners aos botões principais
    document.getElementById("gerarPdfBtn").addEventListener("click", validarEGerarPDF);
    document.getElementById("limparFormBtn").addEventListener("click", limparFormulario);
    document.getElementById("addRowBtn").addEventListener("click", adicionarLinhaItem);

    // Listeners do Modal (se existir)
    const closeModalBtn = document.getElementById("closePdfPreview");
    const downloadModalBtn = document.getElementById("downloadPdfBtn");
    if (closeModalBtn) closeModalBtn.addEventListener("click", fecharPreviewPDF);
    if (downloadModalBtn) downloadModalBtn.addEventListener("click", downloadPDF);

    // Adiciona listeners de validação e progresso aos campos
    const camposValidaveis = document.querySelectorAll(
        "#autorizacaoForm input:not([type=\"checkbox\"]):not([type=\"radio\"]):not([type=\"button\"]), 
         #autorizacaoForm textarea, 
         #autorizacaoForm select"
    );
    camposValidaveis.forEach((campo) => {
        campo.addEventListener("blur", () => {
            validarCampo(campo);
            atualizarProgressoFormulario();
        });
        campo.addEventListener("input", () => {
            // Remove erro ao digitar
            campo.classList.remove("input-error");
            const msg = document.getElementById(`${campo.id}-validation`);
            if (msg) msg.textContent = "";
            atualizarProgressoFormulario();
        });
    });

    // Listener para checkboxes de forma de pagamento
    document.querySelectorAll("input[name='formaPagamento']").forEach(chk => {
        chk.addEventListener("change", () => {
            const group = document.querySelector(".checkbox-group");
            const msg = document.getElementById("formaPagamento-validation");
            if (document.querySelectorAll("input[name='formaPagamento']:checked").length > 0) {
                group?.classList.remove("input-error");
                if (msg) msg.textContent = "";
            } // A validação de erro ocorre no submit
            atualizarProgressoFormulario();
        });
    });

    // Inicializa máscaras
    aplicarMascaraCnpj(document.getElementById("cnpjEmpresa"));
    aplicarMascaraCpfCnpj(document.getElementById("cpfCnpjBeneficiario"));
    // Aplicar máscara de valor aos campos relevantes que podem ser preenchidos inicialmente (se houver)
    // aplicarMascaraValor(document.getElementById('algumCampoDeValorInicial'));

    // Adiciona a primeira linha da tabela automaticamente
    adicionarLinhaItem();

    // Animação inicial
    document.querySelector(".form-container").classList.add("fade-in");

    // Atualiza progresso inicial
    atualizarProgressoFormulario();
});
