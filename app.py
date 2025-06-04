# -*- coding: utf-8 -*-
from flask import Flask, request, send_file, jsonify, render_template
import os
import uuid

# Import the function from your script
from generate_pdf import create_pdf

app = Flask(__name__)

# Define the directory where files are located and PDFs will be temporarily stored
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'temp_pdfs')
LOGO_PATH = os.path.join(BASE_DIR, 'logo.png') # Path to the downloaded logo

# Create the temporary PDF directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    # Serve the main HTML form page
    return render_template('index.html')

@app.route('/script.js')
def serve_js():
    return send_file(os.path.join(BASE_DIR, 'script.js'), mimetype='application/javascript')

@app.route('/styles.css')
def serve_css():
    # Serve the CSS file (assuming it exists or is created)
    css_path = os.path.join(BASE_DIR, 'styles.css')
    if not os.path.exists(css_path):
        # Create a dummy CSS if it doesn't exist to avoid 404
        with open(css_path, 'w') as f:
            f.write('/* Basic styles */ body { font-family: sans-serif; } .container { padding: 20px; }')
    return send_file(css_path, mimetype='text/css')

@app.route('/generate_pdf', methods=['POST'])
def handle_generate_pdf():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400

        # Generate a unique filename for the PDF
        pdf_filename = f"autorizacao_pagamento_{uuid.uuid4()}.pdf"
        output_pdf_path = os.path.join(UPLOAD_FOLDER, pdf_filename)

        # Call the PDF creation function from generate_pdf.py
        create_pdf(data, output_pdf_path, LOGO_PATH)

        # Check if the PDF was created
        if not os.path.exists(output_pdf_path):
             raise Exception("PDF file was not created by the script.")

        # Send the generated PDF back to the client
        return send_file(
            output_pdf_path,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"Autorizacao_Pagamento_{data.get('empresa', 'Empresa')}.pdf" # Use a relevant download name
        )

    except FileNotFoundError as e:
        print(f"Error: File not found - {e}")
        return jsonify({"error": f"Server configuration error: Required file not found ({e.filename})."}), 500
    except ImportError as e:
        print(f"Error: Import error - {e}")
        return jsonify({"error": "Server configuration error: Could not import PDF generation module."}), 500
    except Exception as e:
        print(f"Error generating PDF: {e}")
        # Provide a more generic error to the client for security
        return jsonify({"error": f"Failed to generate PDF. Details: {str(e)}"}), 500

if __name__ == '__main__':
    # Make sure generate_pdf.py is in the same directory or Python path
    # Ensure logo.png exists at LOGO_PATH
    if not os.path.exists(LOGO_PATH):
        print(f"ERROR: Logo file not found at {LOGO_PATH}")
        # Optionally, create a placeholder or exit
        # sys.exit(1)

    # Run the Flask app
    # Listen on 0.0.0.0 to be accessible externally if needed
    app.run(host='0.0.0.0', port=5000, debug=True) # Use a specific port, e.g., 5000

