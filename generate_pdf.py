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
        return val if val is not None and str(val).strip() != "" else default
    except (KeyError, TypeError, IndexError):
        return default

def format_currency(value, include_symbol=True):
    """Formats a number or string like 1234.56 or '1234,56' to 'R$ 1.234,56' or '1.234,56'."""
    if value is None or value == "":
        return "R$ 0,00" if include_symbol else "0,00"
    try:
        # Convert string with comma decimal separator to float if needed
        if isinstance(value, str):
            # Remove thousand separators, replace comma decimal with dot
            numeric_value = float(value.replace(".", "").replace(",", "."))
        else:
            numeric_value = float(value)

        # Format as BRL currency
        formatted_value = f"{numeric_value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"R$ {formatted_value}" if include_symbol else formatted_value
    except (ValueError, TypeError):
        # Handle potential errors if conversion fails
        return "R$ 0,00" if include_symbol else "0,00"

def format_date(date_str):
    """Formats a date string 'YYYY-MM-DD' to 'DD/MM/YYYY'. Handles None or empty."""
    if not date_str:
        return "__/__/____"
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return "__/__/____"

def draw_bordered_cell(pdf, w, h, txt, border=0, ln=0, align='', fill=False, link='', border_color=(0, 0, 0), text_color=(0,0,0), font_style='', font_size=None):
    """Draws a cell with optional border color and text styling."""
    pdf.set_draw_color(*border_color)
    pdf.set_text_color(*text_color)
    original_font_size = pdf.font_size_pt
    original_style = pdf.font_style
    if font_size:
        pdf.set_font_size(font_size)
    if font_style:
        pdf.set_font(pdf.font_family, style=font_style)

    pdf.cell(w, h, txt, border=border, ln=ln, align=align, fill=fill, link=link)

    # Reset styles
    pdf.set_font(pdf.font_family, style=original_style) # Reset style
    pdf.set_font_size(original_font_size) # Reset size
    pdf.set_draw_color(0, 0, 0) # Reset border color
    pdf.set_text_color(0, 0, 0) # Reset text color

def draw_field_with_label_inside(pdf, label, value, x, y, w, h, label_font_size=6, value_font_size=8, label_style='', value_style='', border=1):
    """Draws a field with a small label inside at the top-left and the value below."""
    label_h = h * 0.4 # Height for the label part
    value_h = h * 0.6 # Height for the value part
    padding_x = 1
    padding_y = 0.5

    # Draw border
    pdf.rect(x, y, w, h, 'D')

    # Draw Label
    pdf.set_xy(x + padding_x, y + padding_y)
    pdf.set_font(pdf.font_family, style=label_style, size=label_font_size)
    pdf.cell(w - 2 * padding_x, label_h, label)

    # Draw Value
    pdf.set_xy(x + padding_x, y + label_h)
    pdf.set_font(pdf.font_family, style=value_style, size=value_font_size)
    pdf.cell(w - 2 * padding_x, value_h, str(value))

    # Reset font
    pdf.set_font(pdf.font_family, style='', size=pdf.font_size_pt)

def draw_multiline_field_with_label_inside(pdf, label, value, x, y, w, h, label_font_size=6, value_font_size=8, label_style='', value_style='', border=1):
    """Draws a multiline field with a small label inside at the top-left."""
    label_h = h * 0.2 # Smaller height for the label part
    value_h = h * 0.8 # More height for the value part
    padding_x = 1
    padding_y = 0.5

    # Draw border
    pdf.rect(x, y, w, h, 'D')

    # Draw Label
    pdf.set_xy(x + padding_x, y + padding_y)
    pdf.set_font(pdf.font_family, style=label_style, size=label_font_size)
    pdf.cell(w - 2 * padding_x, label_h, label)

    # Draw Value (Multiline)
    pdf.set_xy(x + padding_x, y + label_h + padding_y)
    pdf.set_font(pdf.font_family, style=value_style, size=value_font_size)
    pdf.multi_cell(w - 2 * padding_x, 3.5, str(value), border=0, align='L') # Adjust line height (3.5) if needed

    # Reset font
    pdf.set_font(pdf.font_family, style='', size=pdf.font_size_pt)

def draw_checkbox(pdf, x, y, size, label, checked=False, label_font_size=8):
    pdf.set_xy(x, y)
    pdf.rect(x, y, size, size, 'D') # Draw the box border
    if checked:
        # Draw an 'X' using current font (Helvetica)
        font_size_before = pdf.font_size_pt
        pdf.set_font(pdf.font_family, 'B', size * 1.8) # Make X bold and slightly larger
        pdf.text(x + size * 0.15, y + size * 0.8, 'X') # Position 'X' inside the box
        pdf.set_font(pdf.font_family, '', font_size_before) # Reset font size and style

    # Draw Label next to checkbox
    pdf.set_xy(x + size + 1.5, y + (size / 2) - (label_font_size / 2) * 0.35) # Adjust vertical alignment
    pdf.set_font_size(label_font_size)
    pdf.cell(0, 0, label)
    pdf.set_font_size(pdf.font_size_pt) # Reset font size

def draw_item_table(pdf, start_x, start_y, table_data, col_widths, row_height, header_height, page_height, margin):
    """Draws the item table with headers and handles page breaks, styled like the new form."""
    headers = ["CÓDIGO DO ITEM", "DESCRIÇÃO DO ITEM / SERVIÇO", "QTD", "V. UNITÁRIO", "V. TOTAL"]
    x_positions = [start_x]
    for width in col_widths[:-1]:
        x_positions.append(x_positions[-1] + width)
    content_width = sum(col_widths)
    current_y = start_y

    # --- Draw Header ---
    pdf.set_fill_color(230, 230, 230) # Light gray background from form
    pdf.set_draw_color(0, 0, 0) # Black border
    pdf.set_line_width(0.2)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(0, 0, 0)

    pdf.set_xy(start_x, current_y)
    for i, header in enumerate(headers):
        align = "C" # Center align headers
        pdf.multi_cell(col_widths[i], header_height, txt=header, border=1, align=align, fill=True)
        if i < len(headers) - 1:
            pdf.set_xy(x_positions[i+1], current_y)
    current_y += header_height

    # --- Draw Rows ---
    pdf.set_font("Helvetica", "", 8)
    pdf.set_fill_color(255, 255, 255)
    pdf.set_draw_color(150, 150, 150) # Lighter gray for row borders

    for row_index, row_data in enumerate(table_data):
        # Calculate max height needed for this row (due to multi-line description)
        pdf.set_xy(x_positions[1], current_y) # Position for description height calculation
        desc_lines = pdf.multi_cell(col_widths[1], 3.5, txt=get_data(row_data, "descricao"), border=0, align="L", split_only=True)
        current_row_height = max(row_height, len(desc_lines) * 3.5 + 2) # Min height is row_height

        if current_y + current_row_height > page_height - margin - 20: # Check page break (leave space for total)
            pdf.add_page()
            current_y = margin + 30 # Reset Y below header area on new page
            # Redraw header on new page
            pdf.set_fill_color(230, 230, 230)
            pdf.set_draw_color(0, 0, 0)
            pdf.set_font("Helvetica", "B", 7)
            pdf.set_text_color(0, 0, 0)
            pdf.set_xy(start_x, current_y)
            for i, header in enumerate(headers):
                align = "C"
                pdf.multi_cell(col_widths[i], header_height, txt=header, border=1, align=align, fill=True)
                if i < len(headers) - 1:
                    pdf.set_xy(x_positions[i+1], current_y)
            current_y += header_height
            pdf.set_font("Helvetica", "", 8)
            pdf.set_fill_color(255, 255, 255)
            pdf.set_draw_color(150, 150, 150)

        # Draw cell data
        cell_data = [
            get_data(row_data, "codigo"),
            get_data(row_data, "descricao"),
            get_data(row_data, "quantidade"),
            format_currency(get_data(row_data, "valorUnitario"), include_symbol=False),
            format_currency(get_data(row_data, "valorTotal"), include_symbol=False)
        ]

        pdf.set_xy(start_x, current_y)
        for i, cell_value in enumerate(cell_data):
            align = "L"
            if i == 2: align = "C" # Quantity centered
            if i > 2: align = "R" # Values right-aligned

            # Use multi_cell for description, cell for others
            text_y_offset = (current_row_height - 3.5 * len(desc_lines) if i == 1 else current_row_height - 3.5) / 2 # Center text vertically
            pdf.set_xy(x_positions[i] + 1, current_y + text_y_offset) # Padding + vertical centering

            if i == 1:
                 pdf.multi_cell(col_widths[i] - 2, 3.5, txt=str(cell_value), border=0, align=align)
            else:
                 pdf.cell(col_widths[i] - 2, 3.5, txt=str(cell_value), border=0, align=align)

            # Draw borders for the cell
            pdf.set_xy(x_positions[i], current_y)
            pdf.multi_cell(col_widths[i], current_row_height, txt="", border=1, align=align, fill=False)
            if i < len(headers) - 1:
                 pdf.set_xy(x_positions[i+1], current_y)

        current_y += current_row_height

    return current_y # Return the Y position after the table

def create_pdf(data, output_path, logo_path):
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=10)
    pdf.set_font("Helvetica", size=10)

    # --- Definições de Layout (Baseado no FOR_FIN_02_01) ---
    margin = 10
    page_width = pdf.w - 2 * margin
    page_height = pdf.h
    field_height = 8 # Default height for fields
    section_gap = 4
    col_gap = 5
    col_width = (page_width - col_gap) / 2

    current_y = margin

    # --- Cabeçalho --- (Based on FOR_FIN_02_01)
    # Logo
    logo_width = 45
    logo_height = 15 # Adjust based on logo aspect ratio
    if logo_path:
        try:
            pdf.image(logo_path, x=margin, y=current_y, w=logo_width)
        except Exception as e:
            print(f"Warning: Could not load logo image {logo_path}: {e}")
            pdf.set_xy(margin, current_y)
            pdf.cell(logo_width, logo_height, "[Logo]", border=1)

    # Título
    title_x = margin + logo_width + 5
    title_w = page_width - logo_width - 35 # Adjust width to leave space for version box
    pdf.set_xy(title_x, current_y + (logo_height / 2) - 5)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(title_w, 8, "FORMULÁRIO DE AUTORIZAÇÃO DE PAGAMENTO", border=0, align="C")

    # Caixa Código/Versão (similar ao exemplo)
    box_width = 30
    box_height = 10
    box_x = pdf.w - margin - box_width
    box_y = current_y + 2
    pdf.set_line_width(0.3)
    pdf.rect(box_x, box_y, box_width, box_height, "D")
    pdf.set_font("Helvetica", "", 7)
    pdf.set_xy(box_x, box_y + 1)
    pdf.cell(box_width, 4, "FOR_FIN_02_01", align="C", ln=1)
    pdf.set_x(box_x)
    pdf.cell(box_width, 4, "VERSÃO: 01", align="C", ln=1)

    current_y = max(current_y + logo_height, box_y + box_height) + section_gap + 2
    pdf.set_line_width(0.2) # Reset line width
    pdf.set_font_size(8) # Reset font size

    # --- Seção: Dados Gerais e Pagamento (Duas Colunas - Layout from FOR_FIN_02_01) ---
    col1_x = margin
    col2_x = margin + col_width + col_gap
    start_y_sec1 = current_y

    # Coluna 1: Dados Empresa & Solicitante
    field_w_col1 = col_width
    draw_field_with_label_inside(pdf, "CNPJ EMPRESA", get_data(data, "cnpjEmpresa"), col1_x, current_y, field_w_col1, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "EMPRESA", get_data(data, "empresa"), col1_x, current_y, field_w_col1, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "E-MAIL SOLICITANTE", get_data(data, "emailSolicitante"), col1_x, current_y, field_w_col1, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "SOLICITANTE", get_data(data, "solicitante"), col1_x, current_y, field_w_col1, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "DEPARTAMENTO", get_data(data, "departamento"), col1_x, current_y, field_w_col1, field_height)
    current_y += field_height + section_gap # Extra space before next group

    # Coluna 1: Pagamento (continuação)
    draw_field_with_label_inside(pdf, "DATA P/ PAGAMENTO", format_date(get_data(data, "dataPagamento")), col1_x, current_y, field_w_col1, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "ORDEM DE COMPRA", get_data(data, "ordemCompra"), col1_x, current_y, field_w_col1, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "CENTRO DE CUSTO", get_data(data, "centroCusto"), col1_x, current_y, field_w_col1, field_height)
    end_y_col1 = current_y + field_height

    # Coluna 2: Forma de Pagamento & Dados Bancários
    current_y = start_y_sec1
    field_w_col2 = col_width

    # Forma de Pagamento Box
    formas_pagamento = get_data(data, "formaPagamento", [])
    checkbox_size = 3.5
    checkbox_section_h = field_height * 2 # Allocate space for title + checkboxes
    pdf.rect(col2_x, current_y, field_w_col2, checkbox_section_h, 'D') # Box around section
    pdf.set_font("Helvetica", "", 6)
    pdf.set_xy(col2_x + 1, current_y + 0.5)
    pdf.cell(field_w_col2 - 2, 3, "FORMA DE PAGAMENTO")
    chk_y = current_y + 4 # Start checkboxes below label
    chk_x_start = col2_x + 5
    chk_spacing = 15 # Horizontal spacing
    draw_checkbox(pdf, chk_x_start, chk_y, checkbox_size, "PIX/TED", checked=("PIX/TED" in formas_pagamento))
    draw_checkbox(pdf, chk_x_start + chk_spacing * 2, chk_y, checkbox_size, "BOLETO", checked=("BOLETO" in formas_pagamento))
    draw_checkbox(pdf, chk_x_start + chk_spacing * 4, chk_y, checkbox_size, "PAGO ADIANTADO", checked=("PAGO ADIANTADO" in formas_pagamento))
    current_y += checkbox_section_h + section_gap # Update Y after section

    # Dados Bancários
    draw_field_with_label_inside(pdf, "BENEFICIÁRIO", get_data(data, "beneficiario"), col2_x, current_y, field_w_col2, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "CPF / CNPJ", get_data(data, "cpfCnpjBeneficiario"), col2_x, current_y, field_w_col2, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "BANCO", get_data(data, "banco"), col2_x, current_y, field_w_col2, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "AGÊNCIA", get_data(data, "agencia"), col2_x, current_y, field_w_col2, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "CONTA", get_data(data, "conta"), col2_x, current_y, field_w_col2, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "TIPO DE CONTA", get_data(data, "tipoConta"), col2_x, current_y, field_w_col2, field_height)
    current_y += field_height
    draw_field_with_label_inside(pdf, "CHAVE PIX", get_data(data, "chavePix"), col2_x, current_y, field_w_col2, field_height)
    end_y_col2 = current_y + field_height

    current_y = max(end_y_col1, end_y_col2) + section_gap
    pdf.set_y(current_y)

    # --- Seção: Observação / Finalidade ---
    obs_h = 20 # Height for the observation box
    draw_multiline_field_with_label_inside(pdf, "OBSERVAÇÃO DESCRITA NA ORDEM DE COMPRA / FINALIDADE", get_data(data, "observacaoFinalidade"), margin, current_y, page_width, obs_h)
    current_y += obs_h + section_gap

    # --- Seção: Tabela de Itens ---
    if current_y > page_height - margin - 60: # Check if enough space for table header + some rows + total
        pdf.add_page()
        current_y = margin + 30 # Reset Y below header area

    pdf.set_y(current_y)
    table_start_y = current_y
    # Col widths in mm (A4 width approx 210mm, page_width approx 190mm)
    table_col_widths = [30, 80, 15, 30, 35] # Sum = 190
    table_row_height = 6 # Base row height
    table_header_height = 5
    current_y = draw_item_table(pdf, margin, table_start_y, get_data(data, "itens", []), table_col_widths, table_row_height, table_header_height, page_height, margin)
    current_y += section_gap # Space after table

    # --- Seção: Total Geral ---
    total_section_height = 10 # Estimated height
    if current_y + total_section_height > page_height - margin:
        pdf.add_page()
        current_y = margin + 30 # Reset Y below header area

    pdf.set_y(current_y)
    total_label_w = page_width - 45 # Width for label
    total_value_w = 45 # Width for value
    total_x = margin + total_label_w

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_xy(margin, current_y)
    pdf.cell(total_label_w, total_section_height, "TOTAL GERAL:", border=0, align="R")

    pdf.set_xy(total_x, current_y)
    pdf.set_fill_color(230, 230, 230)
    pdf.set_draw_color(0,0,0)
    pdf.cell(total_value_w, total_section_height, format_currency(get_data(data, "totalGeral"), include_symbol=True), border=1, align="C", fill=True)
    current_y = pdf.get_y() + total_section_height

    # --- Finalizar e Salvar ---
    try:
        pdf.output(output_path, "F")
    except Exception as e:
        print(f"Error saving PDF to {output_path}: {e}", file=sys.stderr)
        sys.exit(1)

# --- Execução Principal ---
if __name__ == "__main__":
    # Verifica se um caminho de arquivo JSON foi passado como argumento
    if len(sys.argv) > 1:
        json_input_path = sys.argv[1]
    else:
        # Se nenhum argumento for passado, usa um caminho padrão
        json_input_path = "/home/ubuntu/dados_exemplo.json"

    # Define o caminho de saída padrão para o PDF
    output_pdf_path = "/home/ubuntu/autorizacao_pagamento_final.pdf"
    logo_file_path = "/home/ubuntu/logo.png"

    try:
        # Lê os dados do arquivo JSON
        with open(json_input_path, 'r', encoding='utf-8') as f:
            form_data = json.load(f)

        # Chama a função para criar o PDF
        create_pdf(form_data, output_pdf_path, logo_file_path)
        print(f"PDF final gerado com sucesso em: {output_pdf_path}")

    except FileNotFoundError:
        print(f"Erro: Arquivo JSON não encontrado em {json_input_path} ou logo não encontrado em {logo_file_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Erro: Falha ao decodificar o arquivo JSON em {json_input_path}", file=sys.stderr)
        sys.exit(1)
    except ImportError as e:
         print(f"Erro de importação: {e}. Certifique-se que a biblioteca FPDF2 está instalada e acessível.", file=sys.stderr)
         sys.exit(1)
    except Exception as e:
        print(f"Erro inesperado ao gerar o PDF: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
