# -*- coding: utf-8 -*-
from fpdf import FPDF
import datetime

def format_currency(value_str):
    """Formata string tipo '1234,56' para 'R$ 1.234,56'."""
    if not value_str:
        return 'R$ 0,00'
    try:
        cleaned = ''.join(filter(lambda x: x.isdigit() or x == ',', str(value_str)))
        number = float(cleaned.replace(',', '.'))
        return f'R$ {number:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    except ValueError:
        return 'R$ 0,00'

def format_date(date_str):
    """Formata 'YYYY-MM-DD' para 'DD/MM/YYYY'."""
    if not date_str:
        return '__/__/____'
    try:
        return datetime.datetime.strptime(date_str, '%Y-%m-%d').strftime('%d/%m/%Y')
    except ValueError:
        return '__/__/____'

def create_pdf(data, output_path, image_path=None, logo_path=None):
    pdf = FPDF(unit='pt', format='A4')
    pdf.add_page()
    pdf.set_auto_page_break(auto=False, margin=0)
    pdf.set_margins(0, 0, 0)

    # Background/template
    if image_path:
        pdf.image(image_path, x=0, y=0, w=pdf.w, h=pdf.h)

    # Logo no cabeçalho
    if logo_path:
        pdf.image(logo_path, x=30, y=20, w=120, h=0)

    # Cabeçalho
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_xy(180, 28)
    pdf.cell(380, 18, "FORMULÁRIO DE AUTORIZAÇÃO DE PAGAMENTO", 0, 0, 'C')
    pdf.set_font('Helvetica', '', 10)
    pdf.set_xy(570, 35)
    pdf.cell(70, 12, "FOR_FIN_02_01", 0, 2, 'R')
    pdf.set_xy(570, 47)
    pdf.cell(70, 12, "VERSÃO: 01", 0, 2, 'R')

    y0 = 70  # Posição vertical inicial

    # ======= Dados Gerais da Empresa =======
    pdf.set_font('Helvetica', '', 10)
    pdf.set_xy(30, y0)
    pdf.cell(100, 14, "CNPJ:", 0, 0)
    pdf.cell(170, 14, data.get('cnpjEmpresa', ''), 0, 1)

    pdf.set_x(30)
    pdf.cell(100, 14, "EMPRESA:", 0, 0)
    pdf.cell(300, 14, data.get('empresa', ''), 0, 1)

    pdf.set_x(30)
    pdf.cell(100, 14, "E-MAIL:", 0, 0)
    pdf.cell(300, 14, data.get('emailSolicitante', ''), 0, 1)

    pdf.set_x(30)
    pdf.cell(100, 14, "SOLICITANTE:", 0, 0)
    pdf.cell(170, 14, data.get('solicitante', ''), 0, 1)

    pdf.set_x(30)
    pdf.cell(100, 14, "DEPARTAMENTO:", 0, 0)
    pdf.cell(170, 14, data.get('departamento', ''), 0, 1)

    # ======= Dados do Pagamento =======
    y1 = y0 + 85
    pdf.set_xy(320, y1)
    pdf.cell(120, 14, "FORMA DE PAGAMENTO:", 0, 0)
    pagamentos = ', '.join(data.get('formasPagamento', []))
    pdf.cell(200, 14, pagamentos, 0, 1)

    pdf.set_x(320)
    pdf.cell(120, 14, "DATA PARA PAGAMENTO:", 0, 0)
    pdf.cell(120, 14, format_date(data.get('dataPagamento')), 0, 1)

    pdf.set_x(320)
    pdf.cell(120, 14, "ORDEM DE COMPRA:", 0, 0)
    pdf.cell(120, 14, data.get('ordemCompra', ''), 0, 1)

    pdf.set_x(320)
    pdf.cell(120, 14, "CENTRO DE CUSTO:", 0, 0)
    pdf.cell(120, 14, data.get('centroCusto', ''), 0, 1)

    # ======= Observação / Finalidade =======
    y2 = y1 + 75
    pdf.set_xy(30, y2)
    pdf.multi_cell(550, 16, f"OBSERVAÇÃO/FINALIDADE: {data.get('observacaoFinalidade', '')}")

    # ======= Tabela de Itens =======
    y3 = y2 + 50
    pdf.set_xy(30, y3)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(65, 14, "CÓD.", 1, 0, 'C')
    pdf.cell(210, 14, "DESCRIÇÃO", 1, 0, 'C')
    pdf.cell(60, 14, "QTD.", 1, 0, 'C')
    pdf.cell(80, 14, "VALOR UN.", 1, 0, 'C')
    pdf.cell(85, 14, "VALOR TOTAL", 1, 1, 'C')
    pdf.set_font('Helvetica', '', 10)

    itens = data.get('itens', [])
    max_linhas = max(5, len(itens))  # Sempre mostrar pelo menos 5 linhas

    for i in range(max_linhas):
        if i < len(itens):
            item = itens[i]
            pdf.cell(65, 14, item.get('codigo', ''), 1, 0, 'C')
            pdf.cell(210, 14, item.get('descricao', ''), 1, 0, 'L')
            pdf.cell(60, 14, item.get('quantidade', ''), 1, 0, 'C')
            pdf.cell(80, 14, format_currency(item.get('valorUnitario', '')), 1, 0, 'R')
            pdf.cell(85, 14, format_currency(item.get('valorTotal', '')), 1, 1, 'R')
        else:
            pdf.cell(65, 14, '', 1, 0)
            pdf.cell(210, 14, '', 1, 0)
            pdf.cell(60, 14, '', 1, 0)
            pdf.cell(80, 14, '', 1, 0)
            pdf.cell(85, 14, '', 1, 1)

    # ======= Dados para Pagamento =======
    y4 = y3 + 14 * (max_linhas + 1) + 20
    pdf.set_xy(30, y4)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(100, 14, "BENEFICIÁRIO:", 0, 0)
    pdf.cell(170, 14, data.get('beneficiario', ''), 0, 1)
    pdf.set_x(30)
    pdf.cell(100, 14, "CPF / CNPJ:", 0, 0)
    pdf.cell(170, 14, data.get('cpfCnpjBeneficiario', ''), 0, 1)
    pdf.set_x(30)
    pdf.cell(100, 14, "BANCO:", 0, 0)
    pdf.cell(120, 14, data.get('banco', ''), 0, 1)
    pdf.set_x(30)
    pdf.cell(100, 14, "AGÊNCIA:", 0, 0)
    pdf.cell(120, 14, data.get('agencia', ''), 0, 1)
    pdf.set_x(30)
    pdf.cell(100, 14, "CONTA:", 0, 0)
    pdf.cell(120, 14, data.get('conta', ''), 0, 1)
    pdf.set_x(30)
    pdf.cell(100, 14, "TIPO DE CONTA:", 0, 0)
    pdf.cell(120, 14, data.get('tipoConta', ''), 0, 1)
    pdf.set_x(30)
    pdf.cell(100, 14, "CHAVE PIX:", 0, 0)
    pdf.cell(120, 14, data.get('chavePix', ''), 0, 1)

    # ======= Total Geral =======
    pdf.set_xy(400, y4 + 40)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(110, 18, "TOTAL GERAL:", 0, 0, 'R')
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(110, 18, format_currency(data.get('totalGeral', '')), 1, 1, 'R', fill=True)

    # ======= Assinatura (opcional) =======
    pdf.set_xy(30, pdf.h - 60)
    pdf.set_font('Helvetica', '', 10)
    pdf.cell(200, 10, "Assinatura do Solicitante:", 0, 2, 'L')
    pdf.line(30, pdf.h - 45, 220, pdf.h - 45)

    # Salva o PDF
    pdf.output(output_path)
    print(f"PDF gerado com sucesso: {output_path}")

# Exemplo de uso
if __name__ == '__main__':
    # Simulação de dados vindos do formulário JS
    sample_data = {
        'cnpjEmpresa': '12.345.678/0001-99',
        'empresa': 'EMPRESA MODELO S.A.',
        'emailSolicitante': 'usuario@empresa.com',
        'solicitante': 'Fulano de Tal',
        'departamento': 'Financeiro',
        'formasPagamento': ['PIX/TED', 'BOLETO'],
        'dataPagamento': '2025-06-15',
        'ordemCompra': 'OC-202501',
        'centroCusto': 'CC-001',
        'observacaoFinalidade': 'Pagamento de serviços de manutenção predial, conforme contrato 2025.',
        'itens': [
            {'codigo': '001', 'descricao': 'Serviço de Manutenção', 'quantidade': '2', 'valorUnitario': '1500,00', 'valorTotal': '3000,00'},
            {'codigo': '002', 'descricao': 'Material Elétrico', 'quantidade': '5', 'valorUnitario': '80,00', 'valorTotal': '400,00'}
        ],
        'beneficiario': 'EMPRESA MODELO S.A.',
        'cpfCnpjBeneficiario': '12.345.678/0001-99',
        'banco': 'BANCO X',
        'agencia': '1234',
        'conta': '56789-0',
        'tipoConta': 'Corrente',
        'chavePix': 'pix@empresa.com',
        'totalGeral': '3400,00'
    }
    # Passe o caminho da imagem de fundo e logo, se desejar, ou deixe None para PDF limpo
    create_pdf(sample_data, 'autorizacao_pagamento.pdf', image_path=None, logo_path=None)
