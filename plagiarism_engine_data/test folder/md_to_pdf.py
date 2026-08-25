# =============================================================================
#  Secure-FEPRH: Markdown → PDF Converter (Google Colab Version)
# =============================================================================
#
#  HOW TO USE:
#  1. Open Google Colab: https://colab.research.google.com
#  2. Create a new notebook
#  3. Copy this ENTIRE script into a single code cell
#  4. Click Run (▶) — it will:
#       a) Install all dependencies automatically
#       b) Ask you to upload the MD file
#       c) Convert it to a beautifully styled PDF with rendered diagrams
#       d) Auto-download the PDF to your machine
# =============================================================================

# ─── Step 1: Install Dependencies ────────────────────────────────────────────
import subprocess, sys

print("=" * 60)
print("  📦 Installing dependencies...")
print("=" * 60)

subprocess.check_call([sys.executable, "-m", "pip", "install", "-q",
                       "markdown", "Pygments", "playwright", "nest_asyncio"])
subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
subprocess.check_call([sys.executable, "-m", "playwright", "install-deps", "chromium"])

print("✅ All dependencies installed!\n")


# ─── Step 2: Upload MD File ─────────────────────────────────────────────────
import re, os, markdown

from google.colab import files as colab_files
print("📄 Please upload your Markdown file (.md):")
uploaded = colab_files.upload()
md_filename = list(uploaded.keys())[0]
print(f"✅ Uploaded: {md_filename}\n")

with open(md_filename, 'r', encoding='utf-8') as f:
    md_content = f.read()

print(f"📏 File size: {len(md_content):,} characters")
print(f"📏 File lines: {md_content.count(chr(10)):,} lines")


# ─── Step 3: Convert & Generate PDF ─────────────────────────────────────────

# -- Helper Functions --

def convert_github_alerts(text):
    alert_config = {
        'NOTE':      ('ℹ️',  '#1f6feb', '#388bfd1a'),
        'TIP':       ('💡',  '#238636', '#2ea0431a'),
        'IMPORTANT': ('❗',  '#8957e5', '#8957e51a'),
        'WARNING':   ('⚠️',  '#d29922', '#d299221a'),
        'CAUTION':   ('🔴',  '#da3633', '#da36331a'),
    }
    def _replace(match):
        atype = match.group(1).upper()
        raw = match.group(2).strip()
        lines = [re.sub(r'^>\s?', '', l) for l in raw.split('\n')]
        body = markdown.markdown('\n'.join(lines), extensions=['tables', 'fenced_code'])
        icon, border, bg = alert_config.get(atype, ('ℹ️', '#1f6feb', '#388bfd1a'))
        return (
            f'<div style="border-left:4px solid {border};background:{bg};'
            f'padding:14px 18px;margin:18px 0;border-radius:8px;">'
            f'<p style="font-weight:700;color:{border};margin:0 0 8px 0;'
            f'font-size:11pt;">{icon} {atype}</p>'
            f'{body}</div>'
        )
    return re.sub(
        r'> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:>.*\n?)*)',
        _replace, text, flags=re.IGNORECASE
    )

def convert_mermaid_blocks(text):
    def _replace(match):
        code = match.group(1).strip()
        return f'\n<div class="mermaid">\n{code}\n</div>\n'
    return re.sub(r'```mermaid\n(.*?)```', _replace, text, flags=re.DOTALL)

def convert_math_blocks(text):
    return re.sub(
        r'\$\$(.*?)\$\$',
        r'<div class="math-display">$$\1$$</div>',
        text, flags=re.DOTALL
    )

def fix_mermaid_syntax(text):
    return text.replace('statediagram-v2', 'stateDiagram-v2')


# -- CSS --

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
    --bg: #ffffff; --text: #1a1a2e; --text-sec: #4a4a6a;
    --heading: #0f0f23; --accent: #2563eb; --border: #e2e8f0;
    --code-bg: #f1f5f9; --tbl-hdr: #1e293b; --tbl-stripe: #f8fafc;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 11pt; line-height: 1.75; color: var(--text);
    background: var(--bg); max-width: 100%; padding: 0 10px;
}

h1 {
    font-size: 24pt; font-weight: 900; color: var(--heading);
    margin: 38px 0 8px; padding-bottom: 10px;
    border-bottom: 3px solid var(--accent); page-break-after: avoid;
}
h2 {
    font-size: 17pt; font-weight: 700; color: var(--heading);
    margin: 30px 0 8px; padding-bottom: 6px;
    border-bottom: 2px solid var(--border); page-break-after: avoid;
}
h3 {
    font-size: 13pt; font-weight: 600; color: var(--accent);
    margin: 22px 0 6px; page-break-after: avoid;
}
h4 {
    font-size: 11.5pt; font-weight: 600; color: var(--text);
    margin: 16px 0 4px; page-break-after: avoid;
}

p  { margin: 8px 0; text-align: justify; }
a  { color: var(--accent); text-decoration: none; }
ul, ol { margin: 8px 0 8px 24px; }
li { margin: 4px 0; }
strong { font-weight: 700; color: var(--heading); }
hr { border: none; border-top: 2px solid var(--border); margin: 30px 0; }

blockquote {
    border-left: 4px solid var(--accent);
    padding: 8px 16px; margin: 12px 0;
    background: #f0f4ff; border-radius: 0 6px 6px 0;
}

table {
    width: 100%; border-collapse: collapse; margin: 16px 0;
    font-size: 10pt; border-radius: 8px; overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08); page-break-inside: avoid;
}
thead th {
    background: var(--tbl-hdr); color: #fff; font-weight: 600;
    text-align: left; padding: 10px 14px; font-size: 9.5pt;
    text-transform: uppercase; letter-spacing: .5px;
}
tbody td {
    padding: 8px 14px; border-bottom: 1px solid var(--border);
    vertical-align: top;
}
tbody tr:nth-child(even) { background: var(--tbl-stripe); }

code {
    font-family: 'JetBrains Mono', monospace; font-size: 9.5pt;
    background: var(--code-bg); padding: 2px 6px; border-radius: 4px;
    border: 1px solid var(--border);
}
pre {
    background: #1e293b; color: #e2e8f0;
    padding: 16px 20px; border-radius: 8px; overflow-x: auto;
    margin: 12px 0; font-size: 9.5pt; line-height: 1.5;
    page-break-inside: avoid;
}
pre code {
    background: none; border: none; padding: 0;
    color: inherit; font-size: inherit;
}

.mermaid {
    text-align: center; margin: 20px auto; padding: 16px;
    background: #fafbfc; border: 1px solid var(--border);
    border-radius: 10px; page-break-inside: avoid; overflow: visible;
}

.math-display {
    text-align: center; margin: 14px 0;
    font-size: 12pt; page-break-inside: avoid;
}

body > h1:first-of-type {
    font-size: 28pt; text-align: center; border-bottom: none;
    margin-top: 80px; color: var(--accent);
}
body > h2:first-of-type {
    text-align: center; border-bottom: none;
    color: var(--text-sec); font-weight: 400; font-size: 14pt;
    margin-bottom: 4px;
}
body > h3:first-of-type {
    text-align: center; color: var(--text-sec);
    font-weight: 400; font-size: 11pt; margin-bottom: 50px;
}

@media print {
    body { padding: 0; }
    h1 { page-break-before: always; }
    h1:first-of-type { page-break-before: avoid; }
    table, pre, .mermaid { page-break-inside: avoid; }
    h2, h3, h4 { page-break-after: avoid; }
}
"""


# -- Build HTML --

print("\n🔄 Converting Markdown to HTML...")
content = md_content
content = fix_mermaid_syntax(content)
content = convert_github_alerts(content)
content = convert_math_blocks(content)
content = convert_mermaid_blocks(content)

html_body = markdown.markdown(content, extensions=[
    'tables', 'fenced_code', 'codehilite', 'toc', 'attr_list', 'md_in_html',
], extension_configs={
    'codehilite': {'css_class': 'highlight', 'guess_lang': False}
})

full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Secure-FEPRH Master Technical Reference</title>
<style>{CSS}</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
mermaid.initialize({{
    startOnLoad: true,
    theme: 'base',
    themeVariables: {{
        primaryColor: '#dbeafe',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#2563eb',
        lineColor: '#64748b',
        secondaryColor: '#f0fdf4',
        tertiaryColor: '#fefce8',
        fontSize: '14px'
    }},
    flowchart: {{ curve: 'basis', useMaxWidth: true }},
    securityLevel: 'loose'
}});
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
</head>
<body>
{html_body}
</body>
</html>"""

html_path = '/content/Secure_FEPRH_Master_Reference.html'
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(full_html)
print(f"✅ HTML generated: {html_path}")


# -- Render to PDF using Playwright ASYNC API (required for Colab) --

print("\n🖨️  Rendering PDF via Playwright (Chromium)...")
print("   ⏳ Waiting for Mermaid diagrams & MathJax to render...")

import asyncio
import nest_asyncio
nest_asyncio.apply()  # Allow nested async loops inside Colab/Jupyter

from playwright.async_api import async_playwright

pdf_path = '/content/Secure_FEPRH_Master_Reference.pdf'

async def generate_pdf():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(f'file://{html_path}', wait_until='networkidle')

        # Wait for Mermaid + MathJax to finish rendering
        await page.wait_for_timeout(6000)

        await page.pdf(
            path=pdf_path,
            format='A4',
            print_background=True,
            margin={
                'top': '20mm',
                'bottom': '22mm',
                'left': '18mm',
                'right': '18mm',
            },
            display_header_footer=True,
            header_template='<span></span>',
            footer_template='''
                <div style="font-size:9px;color:#94a3b8;width:100%;
                            text-align:center;padding:0 40px;">
                    <span>Secure-FEPRH — Master Technical Reference</span>
                    <span style="float:right;">
                        Page <span class="pageNumber"></span>
                        of <span class="totalPages"></span>
                    </span>
                </div>
            ''',
        )
        await browser.close()

asyncio.get_event_loop().run_until_complete(generate_pdf())

file_size_kb = os.path.getsize(pdf_path) / 1024
print(f"\n✅ PDF generated successfully!")
print(f"   📄 Path:  {pdf_path}")
print(f"   📏 Size:  {file_size_kb:.1f} KB")


# ─── Auto-Download ───────────────────────────────────────────────────────────

print("\n📥 Downloading PDF to your machine...")
colab_files.download(pdf_path)

print("\n" + "=" * 60)
print("  🎉 Done! Check your Downloads folder.")
print("=" * 60)
