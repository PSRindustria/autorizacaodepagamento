// Variáveis globais
let formValidated = false;
let itemCounter = 0; // Contador para IDs únicos de itens

// Função para inicializar o formulário
document.addEventListener("DOMContentLoaded", function () {
    const generatePdfBtn = document.getElementById("generatePdfBtn");
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener("click", validarEGerarPDF);
    } else {
        console.error("Botão Gerar PDF não encontrado!");
    }

    const limparFormBtn = document.getElementById("limparFormBtn");
    if (limparFormBtn) {
        limparFormBtn.addEventListener("click", limparFormulario);
    } else {
        console.error("Botão Limpar Formulário não encontrado!");
    }

    const addRowBtn = document.getElementById("addRowBtn");
    if (addRowBtn) {
        addRowBtn.addEventListener("click", adicionarLinhaTabela);
    } else {
        console.error("Botão Adicionar Item não encontrado!");
    }

    // Adiciona ouvintes para validação e atualização da barra de progresso
    const camposValidaveis = document.querySelectorAll("#autorizacaoForm input, #autorizacaoForm textarea, #autorizacaoForm select");
    camposValidaveis.forEach((campo) => {
        campo.addEventListener("blur", function () {
            validarCampo(this);
            atualizarProgressoFormulario();
        });
        campo.addEventListener("input", function () {
            // Remove erro ao digitar
            const validationMsg = document.getElementById(`${this.id}-validation`);
            if (validationMsg) validationMsg.textContent = "";
            this.classList.remove("input-error");

            // Atualiza total da linha se for campo de valor/quantidade na tabela
            if (this.closest("#itensTable tbody tr")) {
                calcularTotalLinha(this.closest("tr"));
            }
            atualizarProgressoFormulario();
        });
    });

    // Adiciona ouvinte para checkboxes de forma de pagamento
    document.querySelectorAll("input[name='formaPagamento']").forEach((checkbox) => {
        checkbox.addEventListener("change", atualizarProgressoFormulario);
    });

    // Inicializa máscaras e adiciona a primeira linha da tabela
    inicializarMascaras();
    adicionarLinhaTabela(); // Garante que começa com uma linha
    atualizarProgressoFormulario(); // Calcula progresso inicial

    // Aplica máscara ao campo Total Geral (agora editável)
    aplicarMascaraValor(document.getElementById("totalGeral"));

    // Efeito de fade-in
    document.querySelector(".form-container").classList.add("fade-in");
});

// Aplica máscara de valor monetário (BRL)
function aplicarMascaraValor(input) {
    if (!input) return;
    Inputmask("currency", {
        alias: "numeric",
        groupSeparator: ".",
        radixPoint: ",",
        digits: 2,
        autoGroup: true,
        prefix: "", // Prefixo R$ é visual, não no valor
        rightAlign: false,
        placeholder: "0,00",
        clearMaskOnLostFocus: false,
        removeMaskOnSubmit: true, // Remove máscara ao coletar dados
        unmaskAsNumber: true // Retorna como número
    }).mask(input);
}

// Aplica máscara de CNPJ
function aplicarMascaraCnpj(input) {
    if (!input) return;
    Inputmask("99.999.999/9999-99", {
        placeholder: "_",
        clearMaskOnLostFocus: false
    }).mask(input);
}

// Aplica máscara de CPF ou CNPJ
function aplicarMascaraCpfCnpj(input) {
    if (!input) return;
    Inputmask(["999.999.999-99", "99.999.999/9999-99"], {
        placeholder: "_",
        clearMaskOnLostFocus: false,
        keepStatic: true
    }).mask(input);
}

// Inicializa todas as máscaras necessárias
function inicializarMascaras() {
    aplicarMascaraCnpj(document.getElementById("cnpjEmpresa"));
    aplicarMascaraCpfCnpj(document.getElementById("cpfCnpjBeneficiario"));
    // Máscaras para a tabela são aplicadas ao adicionar linha
}

// Valida um campo individualmente e retorna true se válido, false caso contrário
function validarCampo(campo) {
    if (!campo) return true; // Se o campo não existe, considera válido
    const id = campo.id;
    const valor = campo.value.trim();
    const mensagemValidacao = document.getElementById(`${id}-validation`);
    let valido = true;

    campo.classList.remove("input-error", "input-success");
    if (mensagemValidacao) mensagemValidacao.textContent = "";

    // Lista de campos obrigatórios (ajustada para IDs corretos)
    const obrigatorios = [
        "cnpjEmpresa", "empresa", "emailSolicitante", "solicitante", "departamento",
        "dataPagamento", "observacaoFinalidade",
        "beneficiario", "cpfCnpjBeneficiario", "banco", "agencia", "conta", "tipoConta",
        "totalGeral"
    ];

    // Verifica campos obrigatórios
    if (obrigatorios.includes(id) && !valor) {
        if (mensagemValidacao) mensagemValidacao.textContent = "Campo obrigatório";
        valido = false;
    }

    // Validações específicas
    if (valido && id === "cnpjEmpresa" && valor && !Inputmask.isValid(valor, { mask: "99.999.999/9999-99" })) {
        if (mensagemValidacao) mensagemValidacao.textContent = "CNPJ inválido";
        valido = false;
    }

    if (valido && id === "cpfCnpjBeneficiario" && valor && !Inputmask.isValid(valor, { mask: ["999.999.999-99", "99.999.999/9999-99"] })) {
        if (mensagemValidacao) mensagemValidacao.textContent = "CPF/CNPJ inválido";
        valido = false;
    }

    if (valido && id === "emailSolicitante" && valor) {
        const emailRegex = /^[^
s@]+@[^
s@]+\.[^
s@]+$/;
        if (!emailRegex.test(valor)) {
            if (mensagemValidacao) mensagemValidacao.textContent = "E-mail inválido";
            valido = false;
        }
    }

    // Validação para campos da tabela (se necessário, adicionar aqui)
    if (campo.closest("#itensTable tbody tr")) {
        const row = campo.closest("tr");
        const codigo = row.querySelector("input[name='codigoItem[]']").value.trim();
        const descricao = row.querySelector("input[name='descricaoItem[]']").value.trim();
        const quantidade = row.querySelector("input[name='quantidade[]']").value.trim();
        const valorUnitario = row.querySelector("input[name='valorUnitario[]']").value.trim();

        // Exemplo: tornar descrição e valor unitário obrigatórios se a linha foi iniciada
        if ((codigo || descricao || quantidade || valorUnitario) && (!descricao || !valorUnitario || !quantidade)) {
             if (mensagemValidacao && (id.includes('descricaoItem') || id.includes('valorUnitario') || id.includes('quantidade'))) {
                 if (!valor) mensagemValidacao.textContent = "Obrigatório";
             }
             // Não marca como inválido globalmente, mas pode mostrar msg
        }
    }

    // Validação da forma de pagamento (pelo menos uma selecionada)
    if (id.startsWith("pgto")) { // Se a validação for acionada por um checkbox
        const checkboxes = document.querySelectorAll("input[name='formaPagamento']:checked");
        const msgFormaPgto = document.getElementById("formaPagamento-validation");
        if (checkboxes.length === 0) {
            if (msgFormaPgto) msgFormaPgto.textContent = "Selecione uma forma";
            valido = false; // Considera inválido se nenhum estiver marcado
        } else {
            if (msgFormaPgto) msgFormaPgto.textContent = ""; // Limpa msg se válido
        }
    }


    // Adiciona classe de erro/sucesso
    if (!valido) {
        campo.classList.add("input-error");
    } else if (valor) { // Adiciona sucesso apenas se houver valor e for válido
        campo.classList.add("input-success");
    }

    return valido;
}

// Valida todo o formulário
function validarFormulario() {
    let formValido = true;
    const campos = document.querySelectorAll("#autorizacaoForm input, #autorizacaoForm textarea, #autorizacaoForm select");
    campos.forEach((campo) => {
        // Chama validarCampo para cada um, mas acumula o resultado
        if (!validarCampo(campo)) {
            formValido = false;
        }
    });

    // Valida se pelo menos uma forma de pagamento foi selecionada
    const checkboxes = document.querySelectorAll("input[name='formaPagamento']:checked");
    const msgFormaPgto = document.getElementById("formaPagamento-validation");
    if (checkboxes.length === 0) {
        if (msgFormaPgto) msgFormaPgto.textContent = "Selecione uma forma";
        formValido = false;
    } else {
         if (msgFormaPgto) msgFormaPgto.textContent = "";
    }

    // Valida itens da tabela (pelo menos um item é obrigatório?) - Adapte conforme regra
    const tableBody = document.getElementById("itensTable").querySelector("tbody");
    const rows = tableBody.querySelectorAll("tr");
    if (rows.length === 0) {
        // Se nenhuma linha for adicionada, talvez não seja erro, depende da regra.
        // Se for obrigatório ter itens:
        // mostrarToast("Adicione pelo menos um item/serviço.", "error");
        // formValido = false;
    } else {
        rows.forEach(row => {
            const descricao = row.querySelector("input[name='descricaoItem[]']").value.trim();
            const quantidade = row.querySelector("input[name='quantidade[]']").value.trim();
            const valorUnitario = row.querySelector("input[name='valorUnitario[]']").value.trim();
            if (!descricao || !quantidade || !valorUnitario) {
                 // Marca os campos vazios como erro na linha específica
                 if (!descricao) validarCampo(row.querySelector("input[name='descricaoItem[]']"));
                 if (!quantidade) validarCampo(row.querySelector("input[name='quantidade[]']"));
                 if (!valorUnitario) validarCampo(row.querySelector("input[name='valorUnitario[]']"));
                 formValido = false; // Se qualquer linha iniciada tiver campos obrigatórios vazios
            }
        });
    }


    formValidated = formValido; // Atualiza estado global
    return formValido;
}

// Adiciona uma nova linha à tabela de itens/serviços
function adicionarLinhaTabela() {
    itemCounter++;
    const tableBody = document.getElementById("itensTable").querySelector("tbody");
    const newRow = tableBody.insertRow();
    newRow.innerHTML = `
        <td><input type="text" name="codigoItem[]" id="codigoItem-${itemCounter}" class="input-animated"></td>
        <td><input type="text" name="descricaoItem[]" id="descricaoItem-${itemCounter}" class="input-animated"></td>
        <td><input type="number" name="quantidade[]" id="quantidade-${itemCounter}" class="input-animated" min="1" value="1"></td>
        <td><input type="text" name="valorUnitario[]" id="valorUnitario-${itemCounter}" class="input-animated valor-monetario"></td>
        <td><input type="text" name="valorTotalItem[]" id="valorTotalItem-${itemCounter}" class="input-animated valor-monetario" readonly></td>
        <td><button type="button" class="remove-row-btn danger-button"><i class="fas fa-trash-alt"></i></button></td>
    `;

    // Aplica máscara aos campos de valor da nova linha
    const valorUnitarioInput = newRow.querySelector("input[name='valorUnitario[]']");
    const valorTotalInput = newRow.querySelector("input[name='valorTotalItem[]']");
    aplicarMascaraValor(valorUnitarioInput);
    aplicarMascaraValor(valorTotalInput); // Aplicar máscara, mesmo sendo readonly

    // Adiciona ouvintes de evento para a nova linha
    newRow.querySelectorAll("input").forEach(input => {
        input.addEventListener("blur", function () {
            validarCampo(this);
            atualizarProgressoFormulario();
        });
        input.addEventListener("input", function () {
             // Remove erro ao digitar
            const validationMsg = document.getElementById(`${this.id}-validation`);
            if (validationMsg) validationMsg.textContent = "";
            this.classList.remove("input-error");

            calcularTotalLinha(newRow);
            atualizarProgressoFormulario();
        });
    });

    // Adiciona ouvinte para o botão de remover linha
    newRow.querySelector(".remove-row-btn").addEventListener("click", function () {
        removerLinhaTabela(this);
        atualizarProgressoFormulario();
    });

    // Foca no primeiro campo da nova linha
    newRow.querySelector("input[name='codigoItem[]']").focus();
    atualizarProgressoFormulario(); // Recalcula progresso
}


// Remove uma linha da tabela
function removerLinhaTabela(button) {
    const row = button.closest("tr");
    row.remove();
    // Não recalcula mais o total geral automaticamente
    atualizarProgressoFormulario();
}

// Calcula o valor total de uma linha da tabela
function calcularTotalLinha(row) {
    const quantidadeInput = row.querySelector("input[name='quantidade[]']");
    const valorUnitarioInput = row.querySelector("input[name='valorUnitario[]']");
    const valorTotalInput = row.querySelector("input[name='valorTotalItem[]']");

    const quantidade = parseFloat(quantidadeInput.value) || 0;
    // Usa inputmask para obter o valor numérico desmascarado
    const valorUnitario = Inputmask.unmask(valorUnitarioInput.value, { alias: 'currency', unmaskAsNumber: true }) || 0;

    const valorTotal = quantidade * valorUnitario;

    // Usa inputmask para formatar e definir o valor total
    Inputmask.setValue(valorTotalInput, valorTotal.toFixed(2));
}


// Atualiza a barra de progresso do formulário
function atualizarProgressoFormulario() {
    const campos = document.querySelectorAll("#autorizacaoForm input, #autorizacaoForm textarea, #autorizacaoForm select");
    const camposObrigatorios = [
        "cnpjEmpresa", "empresa", "emailSolicitante", "solicitante", "departamento",
        "dataPagamento", "observacaoFinalidade",
        "beneficiario", "cpfCnpjBeneficiario", "banco", "agencia", "conta", "tipoConta",
        "totalGeral"
    ];
    let camposPreenchidos = 0;
    let totalCamposObrigatorios = camposObrigatorios.length;

    // Contagem de campos obrigatórios preenchidos
    camposObrigatorios.forEach(id => {
        const campo = document.getElementById(id);
        if (campo && campo.value.trim() !== "") {
            // Validação específica para select
            if (campo.tagName === "SELECT" && campo.value === "") {
                 // Não conta se for select e a opção vazia estiver selecionada
            } else {
                camposPreenchidos++;
            }
        }
    });

    // Verifica forma de pagamento
    const checkboxes = document.querySelectorAll("input[name='formaPagamento']:checked");
    totalCamposObrigatorios++; // Conta como 1 campo obrigatório
    if (checkboxes.length > 0) {
        camposPreenchidos++;
    }

    // Verifica itens da tabela (considera 1 item como obrigatório para progresso)
    const tableBody = document.getElementById("itensTable").querySelector("tbody");
    const tableRows = tableBody.rows.length;
    totalCamposObrigatorios++; // Conta a tabela como 1 campo obrigatório
    if (tableRows > 0) {
         // Verifica se a primeira linha tem dados essenciais
         const firstRow = tableBody.rows[0];
         const desc = firstRow.querySelector("input[name='descricaoItem[]']").value.trim();
         const qtd = firstRow.querySelector("input[name='quantidade[]']").value.trim();
         const val = firstRow.querySelector("input[name='valorUnitario[]']").value.trim();
         if (desc && qtd && val) {
            camposPreenchidos++;
         }
    }


    const progresso = totalCamposObrigatorios > 0 ? (camposPreenchidos / totalCamposObrigatorios) * 100 : 0;
    const progressBar = document.getElementById("formProgress");
    progressBar.style.width = `${progresso}%`;
    progressBar.textContent = `${Math.round(progresso)}%`; // Mostra percentual
}

// Limpa o formulário
function limparFormulario() {
    const form = document.getElementById("autorizacaoForm");
    form.reset(); // Reseta campos padrão

    // Limpa tabela, exceto cabeçalho
    const tableBody = document.getElementById("itensTable").querySelector("tbody");
    tableBody.innerHTML = "";
    adicionarLinhaTabela(); // Adiciona uma linha inicial limpa

    // Limpa mensagens de validação e classes de erro/sucesso
    document.querySelectorAll(".validation-message").forEach(msg => msg.textContent = "");
    document.querySelectorAll(".input-error, .input-success").forEach(el => el.classList.remove("input-error", "input-success"));

    // Reseta a barra de progresso
    atualizarProgressoFormulario();
    mostrarToast("Formulário limpo!", "info");
}

// Coleta os dados do formulário em formato JSON
function coletarDadosFormulario() {
    const form = document.getElementById("autorizacaoForm");
    const formData = new FormData(form);
    const data = {};

    // Coleta campos normais
    formData.forEach((value, key) => {
        // Tratamento especial para checkboxes de forma de pagamento
        if (key === "formaPagamento") {
            if (!data[key]) {
                data[key] = [];
            }
            data[key].push(value);
        } else if (key.endsWith("[]")) {
            // Ignora campos de array aqui, serão tratados separadamente
        } else {
             // Remove máscara de valores monetários antes de adicionar ao JSON
             const inputElement = form.querySelector(`[name="${key}"]`);
             if (inputElement && (inputElement.classList.contains('valor-monetario') || key === 'totalGeral')) { // Inclui totalGeral
                 data[key] = Inputmask.unmask(value, { alias: 'currency', unmaskAsNumber: true }) || 0;
             } else {
                 data[key] = value;
             }
        }
    });

     // Coleta dados da tabela
    data.itens = [];
    const tableBody = document.getElementById("itensTable").querySelector("tbody");
    const rows = tableBody.querySelectorAll("tr");
    rows.forEach(row => {
        const item = {
            codigo: row.querySelector("input[name='codigoItem[]']").value,
            descricao: row.querySelector("input[name='descricaoItem[]']").value,
            quantidade: parseInt(row.querySelector("input[name='quantidade[]']").value) || 0,
            // Remove máscara dos valores da tabela
            valorUnitario: Inputmask.unmask(row.querySelector("input[name='valorUnitario[]']").value, { alias: 'currency', unmaskAsNumber: true }) || 0,
            valorTotal: Inputmask.unmask(row.querySelector("input[name='valorTotalItem[]']").value, { alias: 'currency', unmaskAsNumber: true }) || 0
        };
         // Adiciona item apenas se tiver descrição ou código (evita linhas vazias)
        if (item.codigo || item.descricao) {
            data.itens.push(item);
        }
    });

    // Garante que o total geral seja numérico (já tratado no loop forEach)
    // data.totalGeral = Inputmask.unmask(document.getElementById("totalGeral").value, { alias: 'currency', unmaskAsNumber: true }) || 0;


    return data;
}


// Função principal para validar e gerar o PDF
async function validarEGerarPDF() {
    if (!validarFormulario()) {
        mostrarToast("Por favor, corrija os campos inválidos.", "error");
        // Foca no primeiro campo com erro
        const firstError = document.querySelector(".input-error");
        if (firstError) {
            firstError.focus();
        }
        return;
    }

    const dados = coletarDadosFormulario();

    // Mostra um feedback visual de carregamento
    const btn = document.getElementById("generatePdfBtn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
    btn.disabled = true;

    try {
        // Envia os dados para o backend Flask
        const response = await fetch("/generate_pdf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(dados),
        });

        if (!response.ok) {
            // Tenta ler a mensagem de erro do backend, se houver
            let errorMsg = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Ignora se não conseguir parsear o JSON do erro
            }
            throw new Error(errorMsg);
        }

        // Recebe o PDF como blob
        const blob = await response.blob();

        // Cria um link temporário para download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        // Define o nome do arquivo PDF
        const dataFormatada = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        a.download = `Autorizacao_Pagamento_${dados.empresa || 'Empresa'}_${dataFormatada}.pdf`;
        document.body.appendChild(a);
        a.click();

        // Limpa o URL do objeto
        window.URL.revokeObjectURL(url);
        a.remove();

        mostrarToast("PDF gerado com sucesso!", "success");

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        mostrarToast(`Erro ao gerar PDF: ${error.message}`, "error");
    } finally {
        // Restaura o botão
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}


// Função para exibir toasts (notificações)
function mostrarToast(mensagem, tipo = "info") {
    const toastContainer = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`; // info, success, error, warning

    let iconClass = "fas fa-info-circle";
    if (tipo === "success") iconClass = "fas fa-check-circle";
    if (tipo === "error") iconClass = "fas fa-times-circle";
    if (tipo === "warning") iconClass = "fas fa-exclamation-triangle";

    toast.innerHTML = `<i class="${iconClass}"></i> ${mensagem}`;
    toastContainer.appendChild(toast);

    // Adiciona classe para animação de entrada
    setTimeout(() => toast.classList.add("show"), 10);

    // Remove o toast após alguns segundos
    setTimeout(() => {
        toast.classList.remove("show");
        // Espera a animação de saída terminar antes de remover o elemento
        setTimeout(() => toast.remove(), 500);
    }, 5000); // Toast visível por 5 segundos
}

