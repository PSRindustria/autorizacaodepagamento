# -*- coding: utf-8 -*-
from fpdf import FPDF
import datetime
import json
import sys

# Helper function to safely get data
def get_data(data_dict, key, default="): # Default to empty string
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
        pdf.multi_cell(col_widths[i] - 2, header_height - 2, txt=header, border=0, align=align, ln=3)
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
                pdf.multi_cell(col_widths[i] - 2, header_height - 2, txt=header, border=0, align=align, ln=3)
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

    # Coluna 2: Total
    total_y = start_y_sec3 # Align total with start of this section
    pdf.set_y(total_y)
    pdf.set_x(col2_x)
    pdf.set_font("Helvetica", "B", base_font_size)
    pdf.set_text_color(*label_color)
    pdf.cell(col_width, line_height * 1.5, "TOTAL", align="R", ln=1)

    pdf.set_x(col2_x)
    pdf.set_font("Helvetica", "B", section_title_size) # Larger font for total value
    pdf.set_text_color(*value_color)
    pdf.cell(col_width, line_height * 1.5, format_currency(get_data(data, "valorTotalGeral")), align="R", ln=1)
    end_y_col2_sec3 = pdf.get_y()

    # --- Assinaturas (Placeholder) ---
    current_y = max(end_y_col1_sec3, end_y_col2_sec3) + 15
    if current_y + 20 > page_height - margin: # Check if signatures fit
        pdf.add_page()
        current_y = margin

    pdf.set_y(current_y)
    pdf.set_font("Helvetica", "", small_font_size)
    sig_width = page_width / 3 - margin / 2
    sig_y = current_y + 10 # Y position for the signature line itself

    # Solicitante
    pdf.set_x(margin)
    pdf.line(margin, sig_y, margin + sig_width, sig_y)
    pdf.set_x(margin)
    pdf.cell(sig_width, 5, get_data(data, "solicitante"), align="C", ln=1)
    pdf.set_x(margin)
    pdf.cell(sig_width, 5, "Solicitante", align="C", ln=2)

    # Aprovador 1 (Placeholder)
    sig_x_2 = margin + sig_width + margin
    pdf.set_y(current_y)
    pdf.line(sig_x_2, sig_y, sig_x_2 + sig_width, sig_y)
    pdf.set_xy(sig_x_2, sig_y + 1)
    pdf.cell(sig_width, 5, "_________________________", align="C", ln=1)
    pdf.set_x(sig_x_2)
    pdf.cell(sig_width, 5, "Aprovador", align="C", ln=2)

    # Aprovador 2 (Placeholder)
    sig_x_3 = sig_x_2 + sig_width + margin
    pdf.set_y(current_y)
    pdf.line(sig_x_3, sig_y, sig_x_3 + sig_width, sig_y)
    pdf.set_xy(sig_x_3, sig_y + 1)
    pdf.cell(sig_width, 5, "_________________________", align="C", ln=1)
    pdf.set_x(sig_x_3)
    pdf.cell(sig_width, 5, "Diretoria", align="C", ln=2)

    # Output PDF
    try:
        pdf.output(output_path)
        print(f"PDF gerado com sucesso: {output_path}")
    except Exception as e:
        print(f"Erro ao salvar o PDF: {e}")
        sys.exit(1)

# --- Main Execution --- #
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Erro: Forneça o caminho para o arquivo JSON de dados como argumento.")
        print("Uso: python generate_pdf.py dados_formulario.json [output_file.pdf]")
        # Use sample data for testing if no argument provided
        print("\nUsando dados de exemplo para teste...")
        sample_data = {
            "cnpjEmpresa": "11.222.333/0001-44",
            "empresa": "EMPRESA TESTE LTDA",
            "emailSolicitante": "teste@empresa.com",
            "solicitante": "Funcionário Teste",
            "departamento": "Financeiro",
            "formaPagamento": ["PIX/TED"],
            "dataPagamento": "2025-07-15",
            "ordemCompra": "OC-12345",
            "centroCusto": "CC-987",
            "observacaoFinalidade": "Pagamento referente à nota fiscal 123. Compra de material de escritório.",
            "itens": [
                {"codigo": "P001", "descricao": "Papel Sulfite A4 Resma 500 folhas", "quantidade": "10", "valorUnitario": "25,50", "valorTotal": 255.0},
                {"codigo": "C005", "descricao": "Caneta Esferográfica Azul BIC Cristal", "quantidade": "50", "valorUnitario": "1,20", "valorTotal": 60.0},
                {"codigo": "CL02", "descricao": "Clips Galvanizado nº 4/0 Caixa com 100 unidades", "quantidade": "5", "valorUnitario": "3,80", "valorTotal": 19.0}
            ],
            "beneficiario": "FORNECEDOR XYZ PAPELARIA",
            "cpfCnpjBeneficiario": "99.888.777/0001-66",
            "banco": "BANCO EXEMPLO",
            "agencia": "1234",
            "conta": "56789-0",
            "tipoConta": "Corrente",
            "chavePix": "financeiro@fornecedorxyz.com",
            "valorTotalGeral": 334.00
        }
        output_file = "/home/ubuntu/formulario_pagamento_exemplo.pdf"
        form_data = sample_data
    else:
        json_file_path = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else "/home/ubuntu/formulario_pagamento_gerado.pdf"
        try:
            with open(json_file_path, "r", encoding="utf-8") as f:
                form_data = json.load(f)
        except FileNotFoundError:
            print(f"Erro: Arquivo JSON não encontrado em '{json_file_path}'")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Erro ao decodificar o arquivo JSON: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Erro ao ler o arquivo JSON: {e}")
            sys.exit(1)

    create_pdf(form_data, output_file)

