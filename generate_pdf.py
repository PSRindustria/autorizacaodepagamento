from fpdf import FPDF
import datetime

def format_currency(value_str):
    if not value_str:
        return 'R$ 0,00'
    try:
        cleaned = ''.join(filter(lambda x: x.isdigit() or x == ',', str(value_str)))
        number = float(cleaned.replace(',', '.'))
        return f'R$ {number:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    except ValueError:
        return 'R$ 0,00'

def format_date(date_str):
    if not date_str:
        return '__/__/____'
    try:
        return datetime.datetime.strptime(date_str, '%Y-%m-%d').strftime('%d/%m/%Y')
    except ValueError:
        return '__/__/____'

def create_pdf(data, output_path, image_path=None, logo_path=None):
    # Adapte para o tamanho do seu formulário! (Exemplo: 862x1316 px)
    img_w_pt, img_h_pt = 862, 1316
    pdf = FPDF(unit='pt', format=(img_w_pt, img_h_pt))
    pdf.add_page()
    pdf.set_auto_page_break(auto=False, margin=0)

    # Fundo
    if image_path:
        pdf.image(image_path, x=0, y=0, w=img_w_pt, h=img_h_pt)

    # Cabeçalho e logo (opcional)
    if logo_path:
        pdf.image(logo_path, x=30, y=20, w=120, h=0)

    # Fonte
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.set_margins(0, 0, 0)

    # Mapeie os campos nos pontos do formulário. Ajuste conforme necessário!
    coords = {
        'cnpjEmpresa': (90, 78),
        'dataPagamento': (625, 78),
        'empresa': (90, 104),
        'pgtoPixTed': (285, 104),
        'ordemCompra': (625, 104),
        'emailSolicitante': (90, 129),
        'pgtoBoleto': (420, 130),
        'solicitante': (90, 154),
        'pgtoAdiantado': (555, 154),
        'departamento': (90, 180),
        'centroCusto': (625, 180),
        'observacaoFinalidade': (80, 250),
        # Tabela começa a partir de y=320, cada linha 25 px
        # Dados bancários
        'beneficiario': (160, 645),
        'cpfCnpjBeneficiario': (160, 673),
        'banco': (160, 699),
        'agencia': (160, 724),
        'conta': (160, 749),
        'tipoConta': (160, 775),
        'chavePix': (160, 800),
        # Total Geral
        'totalGeral': (610, 850),
        # Assinaturas
        'assinatura': (200, 900)
    }

    # Preencher campos simples
    def write_field(key, value):
        if key in coords:
            x, y = coords[key]
            pdf.set_xy(x, y)
            if key == 'observacaoFinalidade':
                pdf.multi_cell(650, 15, value, border=0, align='L')
            else:
                pdf.cell(0, 10, value, border=0, ln=0, align='L')

    write_field('cnpjEmpresa', data.get('cnpjEmpresa', ''))
    write_field('dataPagamento', format_date(data.get('dataPagamento')))
    write_field('empresa', data.get('empresa', ''))
    write_field('ordemCompra', data.get('ordemCompra', ''))
    write_field('emailSolicitante', data.get('emailSolicitante', ''))
    write_field('solicitante', data.get('solicitante', ''))
    write_field('departamento', data.get('departamento', ''))
    write_field('centroCusto', data.get('centroCusto', ''))
    write_field('observacaoFinalidade', data.get('observacaoFinalidade', ''))

    # Formas de pagamento: desenhe um "X" nos checkboxes
    formas = data.get('formasPagamento', [])
    pdf.set_font('Helvetica', 'B', 16)
    if 'PIX/TED' in formas:
        pdf.set_xy(275, 108)
        pdf.cell(10, 10, 'X', border=0, align='C')
    if 'BOLETO' in formas:
        pdf.set_xy(410, 134)
        pdf.cell(10, 10, 'X', border=0, align='C')
    if 'PAGO ADIANTADO' in formas:
        pdf.set_xy(545, 158)
        pdf.cell(10, 10, 'X', border=0, align='C')
    pdf.set_font('Helvetica', '', 10)

    # Tabela de Itens (ajuste as posições)
    itens = data.get('itens', [])
    start_y = 320
    row_height = 25
    for i, item in enumerate(itens):
        y = start_y + i * row_height
        pdf.set_xy(70, y)
        pdf.cell(60, 14, item.get('codigo', ''), 1, 0, 'C')
        pdf.set_xy(130, y)
        pdf.cell(240, 14, item.get('descricao', ''), 1, 0, 'L')
        pdf.set_xy(370, y)
        pdf.cell(60, 14, item.get('quantidade', ''), 1, 0, 'C')
        pdf.set_xy(430, y)
        pdf.cell(80, 14, format_currency(item.get('valorUnitario', '')), 1, 0, 'R')
        pdf.set_xy(510, y)
        pdf.cell(85, 14, format_currency(item.get('valorTotal', '')), 1, 0, 'R')

    # Dados bancários
    write_field('beneficiario', data.get('beneficiario', ''))
    write_field('cpfCnpjBeneficiario', data.get('cpfCnpjBeneficiario', ''))
    write_field('banco', data.get('banco', ''))
    write_field('agencia', data.get('agencia', ''))
    write_field('conta', data.get('conta', ''))
    write_field('tipoConta', data.get('tipoConta', ''))
    write_field('chavePix', data.get('chavePix', ''))
    write_field('totalGeral', format_currency(data.get('totalGeral', '')))

    # Assinatura do Solicitante
    pdf.set_xy(150, 920)
    pdf.cell(250, 15, f"Solicitante: {data.get('solicitante', '')}", border=0, align='L')

    # Salva PDF
    pdf.output(output_path)
    print(f'PDF gerado com sucesso: {output_path}')

# Exemplo de uso:
if __name__ == '__main__':
    # Simulação de dados vindos do HTML
    sample_data = {
        'cnpjEmpresa': '12.566.414/0001-61',
        'empresa': 'PSR INDUSTRIA DE ETIQUETAS E BOBINAS LTDA',
        'emailSolicitante': 'exemplo@psr.com.br',
        'solicitante': 'Fulano de Tal',
        'departamento': 'Financeiro',
        'formasPagamento': ['PIX/TED'],
        'dataPagamento': '2025-06-20',
        'ordemCompra': 'OC-12345',
        'centroCusto': 'CC-010',
        'observacaoFinalidade': 'Pagamento referente à prestação de serviços de TI.',
        'itens': [
            {'codigo': '001', 'descricao': 'Suporte técnico', 'quantidade': '1', 'valorUnitario': '800,00', 'valorTotal': '800,00'},
        ],
        'beneficiario': 'Fornecedor XYZ',
        'cpfCnpjBeneficiario': '44.777.123/0001-44',
        'banco': 'BANCO DO BRASIL',
        'agencia': '1234',
        'conta': '87654-3',
        'tipoConta': 'Corrente',
        'chavePix': 'chave@fornecedor.com',
        'totalGeral': '800,00'
    }
    # Ajuste o caminho da imagem de fundo (PNG/JPG do formulário em branco)
    create_pdf(sample_data, 'saida_autorizacao_pagamento.pdf', image_path='fundo_formulario.png')
