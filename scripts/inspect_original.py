import docx

def inspect(name):
    path = f"C:/Users/vegit/Downloads/original_templates/{name}"
    doc = docx.Document(path)
    print("=" * 60)
    print(name)
    print("=" * 60)
    for i, p in enumerate(doc.paragraphs):
        print(f"P{i:02d} [{p.style.name}] (align={p.alignment}): {p.text}")
    print(f"Total tables: {len(doc.tables)}")
    for ti, t in enumerate(doc.tables):
        print(f"\n--- TABLE {ti} ({len(t.rows)}x{len(t.columns)}) ---")
        for ri, r in enumerate(t.rows):
            print(f"R{ri}: " + " | ".join([c.text.strip().replace('\n', ' ') for c in r.cells]))

for name in ['SAD_Template.docx', 'SRS_Template for SE.docx', 'Test_Plan_Template for SE.docx']:
    inspect(name)
