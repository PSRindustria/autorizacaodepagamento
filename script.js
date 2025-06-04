// Variáveis globais
let formValidated = false;

document.addEventListener("DOMContentLoaded", function () {
    // Máscaras
    inicializarMascaras();

    // Progresso
    document.querySelectorAll("input, textarea, select").forEach((campo) => {
        campo.addEventListener("blur", function () {
            validarCampo(this);
            atualizarProgressoFormulario();
        });
        campo.addEventListener("input", function () {
            this.classList.remove("input-error");
            atualizarProgressoFormulario();
        });
    });

    // Botão adicionar item
    document.getElementById("addRowBtn").addEventListener("click", adicionarLinhaTabela);

    // Botão limpar
    document.getElementById("limparFormBtn").addEventListener("click", limparFormulario);

    // Botão gerar PDF
    document.getElementById("generatePdfBtn").addEventListener("click", validarEGerarPDF);

    // Inicial
    document.querySelector(".form-container").classList.add("fade-in");
    atualizarProgressoFormulario();
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
    // Valor Total e Unitário
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

// Função para adicionar linhas à tabela de itens
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
    novaLinha.classList.add("fade-in");
    // Máscaras nos valores
    novaLinha.querySelectorAll('.valor-item').forEach(aplicarMascaraValor);
    // Remover item
    novaLinha.querySelector(".removerItemBtn").addEventListener("click", function () {
        novaLinha.remove();
        atualizarProgressoFormulario();
    });
    atualizarProgressoFormulario();
}

// Validação individual de campo
function validarCampo(campo) {
    const id = campo.id;
    const valor = campo.value.trim();
    const mensagemValidacao = document.getElementById(`${id}-validation`);
    let valido = true;

    campo.classList.remove("input-error", "input-success");
    if (mensagemValidacao) mensagemValidacao.textContent = "";

    // Adapte aqui os campos obrigatórios do seu formulário
    const obrigatorios = [
        "cnpjEmpresa", "empresa", "emailSolicitante", "solicitante", "departamento",
        "dataPagamento", "beneficiario", "cpfCnpjBeneficiario", "banco", "agencia", "conta", "tipoConta", "totalGeral"
    ];

    if (obrigatorios.includes(id) && !valor) {
        if (mensagemValidacao) mensagemValidacao.textContent = "Campo obrigatório";
        valido = false;
    }

    if (valido && id === "emailSolicitante" && valor && !/^[^@]+@[^@]+\.[^@]+$/.test(valor)) {
        if (mensagemValidacao) mensagemValidacao.textContent = "E-mail inválido";
        valido = false;
    }

    if (valido && id === "cnpjEmpresa" && valor.length < 18) {
        if (mensagemValidacao) mensagemValidacao.textContent = "CNPJ incompleto";
        valido = false;
    }

    if (valido && id === "totalGeral") {
        const valorNumerico = parseFloat(valor.replace(/\./g, "").replace(",", "."));
        if (isNaN(valorNumerico) || valorNumerico <= 0) {
            if (mensagemValidacao) mensagemValidacao.textContent = "Valor inválido";
            valido = false;
        }
    }

    if (!valido) campo.classList.add("input-error");
    else if (valor) campo.classList.add("input-success");

    return valido;
}

function validarFormulario() {
    const camposValidaveis = document.querySelectorAll("#autorizacaoForm input:not([type='checkbox']), #autorizacaoForm textarea, #autorizacaoForm select");
    let formValido = true;

    camposValidaveis.forEach((campo) => {
        const obrigatorios = [
            "cnpjEmpresa", "empresa", "emailSolicitante", "solicitante", "departamento",
            "dataPagamento", "beneficiario", "cpfCnpjBeneficiario", "banco", "agencia", "conta", "tipoConta", "totalGeral"
        ];
        if (obrigatorios.includes(campo.id) || campo.value.trim() !== "") {
            if (!validarCampo(campo)) {
                formValido = false;
            }
        }
    });

    // Forma de pagamento: ao menos um checkbox marcado
    const checkboxes = document.querySelectorAll("input[name='formaPagamento']:checked");
    const validacaoFormaPagamento = document.getElementById("formaPagamento-validation");
    if (checkboxes.length === 0) {
        if (validacaoFormaPagamento) validacaoFormaPagamento.textContent = "Selecione ao menos uma forma de pagamento";
        formValido = false;
    } else {
        if (validacaoFormaPagamento) validacaoFormaPagamento.textContent = "";
    }

    return formValido;
}

function atualizarProgressoFormulario() {
    const camposObrigatorios = [
        "cnpjEmpresa", "empresa", "emailSolicitante", "solicitante", "departamento",
        "dataPagamento", "beneficiario", "cpfCnpjBeneficiario", "banco", "agencia", "conta", "tipoConta", "totalGeral"
    ];
    let preenchidos = 0;
    const totalObrigatorios = camposObrigatorios.length + 1;

    camposObrigatorios.forEach(id => {
        const campo = document.getElementById(id);
        if (campo && campo.value.trim() !== "") preenchidos++;
    });

    if (document.querySelectorAll("input[name='formaPagamento']:checked").length > 0) preenchidos++;

    const progresso = (preenchidos / totalObrigatorios) * 100;
    document.getElementById("formProgress").style.width = `${Math.min(progresso, 100)}%`;
}

// Limpar formulário
function limparFormulario() {
    document.getElementById("autorizacaoForm").reset();
    document.querySelectorAll(".validation-message").forEach((msg) => { msg.textContent = ""; });
    document.querySelectorAll(".input-error, .input-success").forEach((campo) => {
        campo.classList.remove("input-error", "input-success");
    });
    document.getElementById("formProgress").style.width = "0%";
    // Limpa tabela de itens
    document.querySelector("#itensTable tbody").innerHTML = "";
    mostrarToast("Formulário limpo com sucesso", "success");
}

// Toast de feedback
function mostrarToast(mensagem, tipo = "success") {
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) {
        alert(mensagem);
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <i class="fas fa-info-circle toast-icon"></i>
        <span class="toast-message">${mensagem}</span>
        <div class="toast-progress"></div>
    `;
    toastContainer.appendChild(toast);
    toast.offsetHeight;
    toast.classList.add("show");
    const progressElement = toast.querySelector(".toast-progress");
    setTimeout(() => {
        if (progressElement) progressElement.style.width = "100%";
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        });
    }, 3000);
}

// Coleta de dados e chamada para gerar PDF
function validarEGerarPDF() {
    if (validarFormulario()) {
        // Aqui você pode chamar a função de geração de PDF, por enquanto apenas mostra os dados no console
        const dados = coletarDadosFormulario();
        console.log(dados);
        mostrarToast("Dados prontos para gerar PDF", "success");
        // Chame aqui a função de gerar o PDF
        // gerarPDF(dados);
        formValidated = true;
    } else {
        mostrarToast("Por favor, corrija os erros no formulário", "error");
        const primeiroErro = document.querySelector(".input-error");
        if (primeiroErro) primeiroErro.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

// Coleta todos os dados do formulário
function coletarDadosFormulario() {
    // Coleta checkboxes forma de pagamento
    const formasPagamento = Array.from(document.querySelectorAll("input[name='formaPagamento']:checked")).map(c => c.value);
    // Coleta itens da tabela
    const linhas = document.querySelectorAll("#itensTable tbody tr");
    const itens = Array.from(linhas).map(linha => ({
        codigo: linha.querySelector("input[name='itemCodigo[]']").value,
        descricao: linha.querySelector("input[name='itemDescricao[]']").value,
        quantidade: linha.querySelector("input[name='itemQuantidade[]']").value,
        valorUnitario: linha.querySelector("input[name='itemValorUnitario[]']").value,
        valorTotal: linha.querySelector("input[name='itemValorTotal[]']").value,
    }));

    return {
        cnpjEmpresa: document.getElementById("cnpjEmpresa").value,
        empresa: document.getElementById("empresa").value,
        emailSolicitante: document.getElementById("emailSolicitante").value,
        solicitante: document.getElementById("solicitante").value,
        departamento: document.getElementById("departamento").value,
        formasPagamento,
        dataPagamento: document.getElementById("dataPagamento").value,
        ordemCompra: document.getElementById("ordemCompra").value,
        centroCusto: document.getElementById("centroCusto").value,
        observacaoFinalidade: document.getElementById("observacaoFinalidade").value,
        itens,
        beneficiario: document.getElementById("beneficiario").value,
        cpfCnpjBeneficiario: document.getElementById("cpfCnpjBeneficiario").value,
        banco: document.getElementById("banco").value,
        agencia: document.getElementById("agencia").value,
        conta: document.getElementById("conta").value,
        tipoConta: document.getElementById("tipoConta").value,
        chavePix: document.getElementById("chavePix").value,
        totalGeral: document.getElementById("totalGeral").value,
    };
}
