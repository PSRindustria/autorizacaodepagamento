# -*- coding: utf-8 -*-
from fpdf import FPDF
import datetime
import json
import sys

# Helper function to safely get data
def get_data(data_dict, key, default=""): # Default to empty string
    # Handles nested keys like 'item.codigo'
    keys = key.split(".")
    val = data_dict
    try:
        for k in keys:
            if isinstance(val, list) and k.isdigit(): # Access list elements by index
                val = val[int(k)]
            else:
                val = val[k]
        # Return default if value is None or empty string after retrieval
        return val if val is not None and val != "" else default
    except (KeyError, TypeError, IndexError):
        return default

def format_currency(value_str, include_symbol=True):
    """Formats a number or string like 1234.56 or '1234,56' to 'R$ 1.234,56' or '1.234,56'."""
    if value_str is None or value_str == "":
        return "R$ 0,00" if include_symbol else "0,00"
    try:
        # Convert string with comma decimal separator to float
        if isinstance(value_str, str):
            numeric_value = float(value_str.replace(".", "").replace(",", "."))
        else:
            numeric_value = float(value_str)

        # Format as BRL currency
        formatted_value = f"{numeric_value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"R$ {formatted_value}" if include_symbol else formatted_value
    except (ValueError, TypeError):
        return "R$ 0,00" if include_symbol else "0,00"

def format_date(date_str):
    """Formats a date string 'YYYY-MM-DD' to 'DD/MM/YYYY'. Handles None or empty."""
    if not date_str:
        return "__/__/____"
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return "__/__/____"

def draw_table(pdf, start_x, start_y, table_data, col_widths, row_height, header_height, page_height, margin):
    """Draws the item table with headers and handles page breaks."""
    headers = ["CÓDIGO DO ITEM", "DESCRIÇÃO DO ITEM / SERVIÇO", "QTD", "V. UNITÁRIO", "V. TOTAL"]
    x_positions = [start_x]
    for width in col_widths[:-1]:
        x_positions.append(x_positions[-1] + width)
    content_width = sum(col_widths)
    current_y = start_y

    # Draw Header
    pdf.set_fill_color(240, 240, 240) # Light gray background
    pdf.set_draw_color(200, 200, 200)
    pdf.set_line_width(0.1)
    pdf.rect(start_x, current_y, content_width, header_height, "FD")
    pdf.set_font("Helvetica", "B", 7) # Smaller bold font for header
    pdf.set_text_color(0, 0, 0)
    for i, header in enumerate(headers):
        align = "L"
        if i == 2: align = "C" # Quantity centered
        if i > 2: align = "R" # Values right-aligned
        pdf.set_xy(x_positions[i] + 1, current_y + 1) # Padding
        # Removed ln=3 from multi_cell
        pdf.multi_cell(col_widths[i] - 2, header_height - 2, txt=header, border=0, align=align)
    current_y += header_height

    # Draw Rows
    pdf.set_font("Helvetica", "", 8)
    for row_index, row_data in enumerate(table_data):
        # Check for page break - leave space for footer sections
        if current_y + row_height > page_height - margin - 40:
            pdf.add_page()
            current_y = margin # Reset Y to top margin
            # Redraw header on new page
            pdf.set_fill_color(240, 240, 240)
            pdf.set_draw_color(200, 200, 200)
            pdf.rect(start_x, current_y, content_width, header_height, "FD")
            pdf.set_font("Helvetica", "B", 7)
            pdf.set_text_color(0, 0, 0)
            for i, header in enumerate(headers):
                align = "L"
                if i == 2: align = "C"
                if i > 2: align = "R"
                pdf.set_xy(x_positions[i] + 1, current_y + 1)
                # Removed ln=3 from multi_cell
                pdf.multi_cell(col_widths[i] - 2, header_height - 2, txt=header, border=0, align=align)
            current_y += header_height
            pdf.set_font("Helvetica", "", 8)

        # Calculate max height needed for this row (due to multi-line description)
        pdf.set_xy(x_positions[1] + 1, current_y + 1)
        desc_lines = pdf.multi_cell(col_widths[1] - 2, 3.5, txt=get_data(row_data, "descricao"), border=0, align="L", split_only=True)
        current_row_height = max(row_height, len(desc_lines) * 3.5 + 2) # Min height is row_height

        # Draw row borders
        pdf.set_draw_color(200, 200, 200)
        pdf.rect(start_x, current_y, content_width, current_row_height, "D")
        for x_pos in x_positions[1:]:
             pdf.line(x_pos, current_y, x_pos, current_y + current_row_height)

        # Draw cell data
        cell_data = [
            get_data(row_data, "codigo"),
            get_data(row_data, "descricao"),
            get_data(row_data, "quantidade"),
            format_currency(get_data(row_data, "valorUnitario"), include_symbol=False),
            format_currency(get_data(row_data, "valorTotal"), include_symbol=False)
        ]

        y_offset = (current_row_height - 3.5) / 2 # Center vertically roughly

        for i, cell_value in enumerate(cell_data):
            align = "L"
            x_pad = 1
            if i == 2: align = "C"
            if i > 2: align = "R"; x_pad = col_widths[i] - 1 # Right align padding

            pdf.set_xy(x_positions[i] + x_pad, current_y + 1)
            # Use multi_cell for description, cell for others
            if i == 1:
                 pdf.multi_cell(col_widths[i] - 2, 3.5, txt=str(cell_value), border=0, align=align)
            else:
                 pdf.cell(col_widths[i] - 2, current_row_height - 2, txt=str(cell_value), border=0, align=align)

        current_y += current_row_height

    return current_y # Return the Y position after the table

def create_pdf(data, output_path):
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=10)
    pdf.set_font("Helvetica", size=10)

    # --- Definições de Layout ---
    margin = 10
    page_width = pdf.w - 2 * margin
    page_height = pdf.h
    line_height = 5
    field_sep = 3
    section_title_size = 12
    base_font_size = 9
    small_font_size = 8
    label_color = (100, 100, 100)
    value_color = (0, 0, 0)
    line_color = (200, 200, 200)
    header_bg_color = (0, 86, 179) # Blue from CSS
    header_text_color = (255, 255, 255)

    current_y = margin

    # --- Cabeçalho ---
    header_height = 15
    pdf.set_fill_color(*header_bg_color)
    pdf.rect(margin, current_y, page_width, header_height, "F")
    pdf.set_font("Helvetica", "B", section_title_size)
    pdf.set_text_color(*header_text_color)
    pdf.set_xy(margin, current_y)
    pdf.cell(page_width, header_height, "FORMULÁRIO DE AUTORIZAÇÃO DE PAGAMENTO", border=0, align="C", ln=1)

    # Caixa Código/Versão (ajustada para canto superior direito)
    box_width = 25
    box_height = 8
    box_x = pdf.w - margin - box_width
    box_y = current_y + (header_height - box_height) / 2
    pdf.set_fill_color(255, 255, 255)
    pdf.set_draw_color(*header_bg_color)
    pdf.set_line_width(0.2)
    pdf.rect(box_x, box_y, box_width, box_height, "FD")
    pdf.set_font("Helvetica", "", 6)
    pdf.set_text_color(*header_bg_color)
    pdf.set_xy(box_x, box_y + 1)
    pdf.cell(box_width, 3, "FOR_FIN_02_01", align="C", ln=1)
    pdf.set_x(box_x)
    pdf.cell(box_width, 3, "VERSÃO: 01", align="C", ln=1)

    current_y += header_height + 5
    pdf.set_text_color(*value_color) # Reset text color
    pdf.set_font_size(base_font_size)

    # --- Seção: Dados Gerais e Pagamento ---
    pdf.set_font("Helvetica", "B", base_font_size)
    pdf.set_x(margin)
    pdf.cell(page_width, line_height, "DADOS GERAIS DA EMPRESA", border="B", ln=1)
    current_y += line_height + field_sep
    pdf.set_y(current_y)

    col1_x = margin
    col2_x = margin + page_width / 2 + 2
    col_width = page_width / 2 - 2
    start_y_sec1 = current_y

    # Coluna 1: Dados Empresa
    pdf.set_font("Helvetica", "B", small_font_size)
    pdf.set_text_color(*label_color)
    pdf.set_x(col1_x)
    pdf.cell(15, line_height, "CNPJ:")
    pdf.set_font("Helvetica", "", small_font_size)
    pdf.set_text_color(*value_color)
    pdf.cell(col_width - 15, line_height, get_data(data, "cnpjEmpresa"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(20, line_height, "EMPRESA:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 20, line_height, get_data(data, "empresa"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(18, line_height, "E-MAIL:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 18, line_height, get_data(data, "emailSolicitante"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(30, line_height, "SOLICITANTE:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 30, line_height, get_data(data, "solicitante"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(35, line_height, "DEPARTAMENTO:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 35, line_height, get_data(data, "departamento"), ln=1)
    end_y_col1 = current_y + line_height

    # Coluna 2: Dados Pagamento
    current_y = start_y_sec1
    pdf.set_y(current_y)
    pdf.set_font("Helvetica", "B", small_font_size)
    pdf.set_text_color(*label_color)
    pdf.set_x(col2_x)
    pdf.cell(col_width, line_height, "FORMA DE PAGAMENTO:", ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "", small_font_size)
    pdf.set_text_color(*value_color)
    formas_pagamento = get_data(data, "formaPagamento", [])
    checkbox_size = 2.5
    checkbox_spacing = 4
    chk_y = current_y
    pdf.set_x(col2_x + 2)
    pdf.rect(col2_x, chk_y, checkbox_size, checkbox_size, "D")
    if "PIX/TED" in formas_pagamento: pdf.text(col2_x + 0.5, chk_y + checkbox_size - 0.5, "X")
    pdf.cell(col_width - 2, line_height, "   PIX/TED", ln=1)
    chk_y += checkbox_spacing
    pdf.set_x(col2_x + 2)
    pdf.rect(col2_x, chk_y, checkbox_size, checkbox_size, "D")
    if "BOLETO" in formas_pagamento: pdf.text(col2_x + 0.5, chk_y + checkbox_size - 0.5, "X")
    pdf.cell(col_width - 2, line_height, "   BOLETO", ln=1)
    chk_y += checkbox_spacing
    pdf.set_x(col2_x + 2)
    pdf.rect(col2_x, chk_y, checkbox_size, checkbox_size, "D")
    if "PAGO ADIANTADO" in formas_pagamento: pdf.text(col2_x + 0.5, chk_y + checkbox_size - 0.5, "X")
    pdf.cell(col_width - 2, line_height, "   PAGO ADIANTADO", ln=1)
    current_y = chk_y + line_height # Update Y after checkboxes

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col2_x)
    pdf.cell(45, line_height, "DATA PARA PAGAMENTO:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 45, line_height, format_date(get_data(data, "dataPagamento")), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col2_x)
    pdf.cell(40, line_height, "ORDEM DE COMPRA:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 40, line_height, get_data(data, "ordemCompra"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col2_x)
    pdf.cell(38, line_height, "CENTRO DE CUSTO:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 38, line_height, get_data(data, "centroCusto"), ln=1)
    end_y_col2 = current_y + line_height

    current_y = max(end_y_col1, end_y_col2) + 2
    pdf.set_y(current_y)

    # --- Seção: Observação / Finalidade ---
    pdf.set_font("Helvetica", "B", base_font_size)
    pdf.set_x(margin)
    pdf.cell(page_width, line_height, "OBSERVAÇÃO DESCRITA NA ORDEM DE COMPRA / FINALIDADE", border="B", ln=1)
    current_y += line_height + field_sep
    pdf.set_y(current_y)

    pdf.set_font("Helvetica", "", small_font_size)
    pdf.set_x(margin)
    pdf.multi_cell(page_width, 3.5, txt=get_data(data, "observacaoFinalidade"), border=0, align="L")
    current_y = pdf.get_y() + 2

    # --- Seção: Tabela de Itens ---
    table_start_y = current_y
    # Col widths in mm (approx A4 width 190mm after margins)
    table_col_widths = [25, 75, 15, 30, 35] # Sum = 180 (adjust if needed)
    table_row_height = 5 # Base row height
    table_header_height = 6
    current_y = draw_table(pdf, margin, table_start_y, get_data(data, "itens", []), table_col_widths, table_row_height, table_header_height, page_height, margin)
    current_y += 5 # Space after table

    # --- Seção: Dados para Pagamento (Inferior) e Total ---
    # Check for page break before drawing this section
    bottom_section_height = 45 # Estimated height needed
    if current_y + bottom_section_height > page_height - margin:
        pdf.add_page()
        current_y = margin

    pdf.set_y(current_y)
    pdf.set_font("Helvetica", "B", base_font_size)
    pdf.set_x(margin)
    pdf.cell(page_width, line_height, "DADOS PARA PAGAMENTO", border="B", ln=1)
    current_y += line_height + field_sep
    pdf.set_y(current_y)

    start_y_sec3 = current_y

    # Coluna 1: Dados Bancários
    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(30, line_height, "BENEFICIÁRIO:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 30, line_height, get_data(data, "beneficiario"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(25, line_height, "CPF / CNPJ:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 25, line_height, get_data(data, "cpfCnpjBeneficiario"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(18, line_height, "BANCO:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 18, line_height, get_data(data, "banco"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(20, line_height, "AGÊNCIA:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 20, line_height, get_data(data, "agencia"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(18, line_height, "CONTA:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 18, line_height, get_data(data, "conta"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(32, line_height, "TIPO DE CONTA:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 32, line_height, get_data(data, "tipoConta"), ln=1)
    current_y += line_height

    pdf.set_font("Helvetica", "B", small_font_size); pdf.set_text_color(*label_color); pdf.set_x(col1_x)
    pdf.cell(25, line_height, "CHAVE PIX:")
    pdf.set_font("Helvetica", "", small_font_size); pdf.set_text_color(*value_color)
    pdf.cell(col_width - 25, line_height, get_data(data, "chavePix"), ln=1)
    end_y_col1_sec3 = current_y + line_height

    # Coluna 2: Total Geral
    current_y = start_y_sec3
    pdf.set_y(current_y)
    pdf.set_font("Helvetica", "B", base_font_size)
    pdf.set_text_color(*value_color)
    pdf.set_x(col2_x)
    pdf.cell(col_width, line_height * 2, "TOTAL GERAL", border=1, align="C", ln=1)
    current_y += line_height * 2

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_x(col2_x)
    pdf.cell(col_width, line_height * 3, format_currency(get_data(data, "totalGeral")), border=1, align="C", ln=1)
    end_y_col2_sec3 = current_y + line_height * 3

    current_y = max(end_y_col1_sec3, end_y_col2_sec3) + 5
    pdf.set_y(current_y)

    # --- Seção: Observações Gerais ---
    pdf.set_font("Helvetica", "B", base_font_size)
    pdf.set_x(margin)
    pdf.cell(page_width, line_height, "OBSERVAÇÕES GERAIS", border="B", ln=1)
    current_y += line_height + field_sep
    pdf.set_y(current_y)

    pdf.set_font("Helvetica", "", small_font_size)
    pdf.set_x(margin)
    pdf.multi_cell(page_width, 3.5, txt=get_data(data, "observacoesGerais"), border=1, align="L") # Removed fixed height h=20
    current_y = pdf.get_y() + 2

    # --- Seção: Assinaturas ---
    signature_y = pdf.h - margin - 20 # Position near bottom
    if current_y > signature_y - 10: # Add page if too close
        pdf.add_page()
        signature_y = pdf.h - margin - 20

    pdf.set_y(signature_y)
    pdf.set_font("Helvetica", "", small_font_size)
    sig_width = page_width / 3 - 5
    sig_x1 = margin
    sig_x2 = margin + sig_width + 7.5
    sig_x3 = margin + 2 * (sig_width + 7.5)

    pdf.set_x(sig_x1)
    pdf.cell(sig_width, line_height, "________________________________________", align="C", ln=1)
    pdf.set_x(sig_x1)
    pdf.cell(sig_width, line_height, "SOLICITANTE", align="C", ln=0)

    pdf.set_xy(sig_x2, signature_y)
    pdf.cell(sig_width, line_height, "________________________________________", align="C", ln=1)
    pdf.set_x(sig_x2)
    pdf.cell(sig_width, line_height, "APROVADOR", align="C", ln=0)

    pdf.set_xy(sig_x3, signature_y)
    pdf.cell(sig_width, line_height, "________________________________________", align="C", ln=1)
    pdf.set_x(sig_x3)
    pdf.cell(sig_width, line_height, "FINANCEIRO", align="C", ln=1)

    # --- Salvar PDF ---
    pdf.output(output_path)
    print(f"PDF gerado com sucesso em: {output_path}")

# --- Execução Principal ---
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Erro: Forneça o caminho do arquivo JSON como argumento.")
        print("Uso: python generate_pdf.py <caminho_para_seu_arquivo.json>")
        sys.exit(1)

    json_file_path = sys.argv[1]
    output_pdf_path = json_file_path.replace(".json", ".pdf")

    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            form_data = json.load(f)
    except FileNotFoundError:
        print(f"Erro: Arquivo JSON não encontrado em '{json_file_path}'")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Erro: Falha ao decodificar o arquivo JSON em '{json_file_path}'. Verifique o formato.")
        sys.exit(1)
    except Exception as e:
        print(f"Erro inesperado ao ler o arquivo JSON: {e}")
        sys.exit(1)

    try:
        create_pdf(form_data, output_pdf_path)
    except Exception as e:
        print(f"Erro inesperado ao gerar o PDF: {e}")
        sys.exit(1)

