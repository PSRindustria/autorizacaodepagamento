// Variáveis globais
let formValidated = false;

// Função para inicializar o formulário
document.addEventListener("DOMContentLoaded", function () {
    // Adiciona ouvintes de evento aos botões principais
    document.getElementById("exportJsonBtn").addEventListener("click", validarEExportarJSON);
    document.getElementById("limparFormBtn").addEventListener("click", limparFormulario);
    document.getElementById("addRowBtn").addEventListener("click", adicionarLinhaTabela);

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
            // Atualiza progresso e total da tabela se for campo de valor/quantidade
            if (this.closest("#itensTable")) {
                calcularTotalLinha(this.closest("tr"));
                calcularTotalGeral();
            }
            atualizarProgressoFormulario();
        });
    });

    // Adiciona ouvinte para checkboxes de forma de pagamento
    document.querySelectorAll("input[name=\"formaPagamento\"]").forEach((checkbox) => {
        checkbox.addEventListener("change", atualizarProgressoFormulario);
    });

    // Inicializa máscaras e adiciona a primeira linha da tabela
    inicializarMascaras();
    adicionarLinhaTabela(); // Começa com uma linha
    atualizarProgressoFormulario(); // Calcula progresso inicial

    // Efeito de fade-in
    document.querySelector(".form-container").classList.add("fade-in");
});

// Aplica máscara de valor monetário (BRL)
function aplicarMascaraValor(input) {
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
    Inputmask("99.999.999/9999-99", {
        placeholder: "_",
        clearMaskOnLostFocus: false
    }).mask(input);
}

// Aplica máscara de CPF ou CNPJ
function aplicarMascaraCpfCnpj(input) {
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

// Valida um campo individualmente
function validarCampo(campo) {
    const id = campo.id;
    const valor = campo.value.trim();
    const mensagemValidacao = document.getElementById(`${id}-validation`);
    let valido = true;

    campo.classList.remove("input-error", "input-success");
    if (mensagemValidacao) mensagemValidacao.textContent = "";

    // Lista de campos obrigatórios (ajustada para FOR_FIN_02_01)
    const obrigatorios = [
        "cnpjEmpresa", "empresa", "emailSolicitante", "solicitante", "departamento",
        "dataPagamento", "observacaoFinalidade",
        "beneficiario", "cpfCnpjBeneficiario", "banco", "agencia", "conta", "tipoConta"
        // Ordem de compra e Centro de custo são opcionais
        // Chave PIX é opcional
    ];

    // Verifica campos obrigatórios
    if (obrigatorios.includes(id) && !valor) {
        if (mensagemValidacao) mensagemValidacao.textContent = "Campo obrigatório";
        valido = false;
    }

    // Validações específicas
    if (valido && id === "cnpjEmpresa" && !Inputmask.isValid(valor, { mask: "99.999.999/9999-99" })) {
        if (mensagemValidacao) mensagemValidacao.textContent = "CNPJ inválido";
        valido = false;
    }

    if (valido && id === "cpfCnpjBeneficiario" && !Inputmask.isValid(valor, { mask: ["999.999.999-99", "99.999.999/9999-99"] })) {
        if (mensagemValidacao) mensagemValidacao.textContent = "CPF/CNPJ inválido";
        valido = false;
    }

    if (valido && id === "emailSolicitante") {
        const emailRegex = /^[^
(Content truncated due to length limit)

