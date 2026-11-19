import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def style_table(table, header_bg="1E293B", alt_bg="F8FAFC"):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(table.rows):
        is_header = (i == 0)
        for cell in row.cells:
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell, 120, 120, 160, 160)
            if is_header:
                set_cell_background(cell, header_bg)
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.bold = True
                        r.font.color.rgb = RGBColor(255, 255, 255)
                        r.font.size = Pt(9.5)
            else:
                bg = alt_bg if i % 2 == 1 else "FFFFFF"
                set_cell_background(cell, bg)
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.size = Pt(9)

def build_sad():
    doc = docx.Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(4)
    run_title = p_title.add_run("Software Architecture and Design Specification (SAD)")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(30, 41, 59)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(18)
    run_sub = p_sub.add_run("PES EventFlow — PES University Campus Event Ticketing & Reservation Platform")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(12)
    run_sub.font.color.rgb = RGBColor(79, 70, 229)
    run_sub.font.bold = True

    # Metadata block
    meta_p = doc.add_paragraph()
    meta_p.paragraph_format.line_spacing = 1.2
    meta_runs = [
        ("Project: ", True), ("PES EventFlow (Campus Events & Ticketing System)\n", False),
        ("Version: ", True), ("1.0 (Production Release)\n", False),
        ("Lead Author: ", True), ("Jayanth Kumar P (SRN: PES1UG24CS199)\n", False),
        ("Institution: ", True), ("Department of Computer Science & Engineering, PES University\n", False),
        ("Date: ", True), ("19-November-2026\n", False),
        ("Status: ", True), ("Approved / Final Model Specification", False)
    ]
    for text, bold in meta_runs:
        r = meta_p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(10)
        r.font.bold = bold
        if bold:
            r.font.color.rgb = RGBColor(30, 41, 59)
        else:
            r.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_heading("Revision History", level=1)
    rev_table = doc.add_table(rows=3, cols=4)
    rev_headers = ["Version", "Date", "Author", "Change Summary"]
    for j, h in enumerate(rev_headers):
        rev_table.rows[0].cells[j].text = h
    rev_data = [
        ("0.1", "29-10-2026", "Jayanth Kumar P (PES1UG24CS199)", "Initial draft, component definitions, and layered architecture design"),
        ("1.0", "19-11-2026", "Jayanth Kumar P (PES1UG24CS199)", "Finalized ADRs, ACID reservation sequence diagrams, PCI-DSS tokenization, and UML diagrams")
    ]
    for i, row in enumerate(rev_data):
        for j, val in enumerate(row):
            rev_table.rows[i+1].cells[j].text = val
    style_table(rev_table)

    doc.add_heading("Approvals", level=1)
    app_table = doc.add_table(rows=3, cols=3)
    app_headers = ["Role", "Name", "Signature / Date"]
    for j, h in enumerate(app_headers):
        app_table.rows[0].cells[j].text = h
    app_data = [
        ("Software Engineering Faculty", "Course Coordinator, Dept of CSE", "Approved / 19-Nov-2026"),
        ("Lead Student Architect", "Jayanth Kumar P (PES1UG24CS199)", "Jayanth Kumar P / 19-Nov-2026")
    ]
    for i, row in enumerate(app_data):
        for j, val in enumerate(row):
            app_table.rows[i+1].cells[j].text = val
    style_table(app_table)

    # 1. Introduction
    doc.add_heading("1. Introduction", level=1)
    doc.add_heading("1.1 Purpose", level=2)
    doc.add_paragraph(
        "This Software Architecture and Design Specification (SAD) document specifies the comprehensive system architecture, "
        "component design, data persistence mechanisms, security safeguards, and interface contracts for PES EventFlow. "
        "It provides engineering teams, evaluators, and system maintainers with an authoritative blueprint of the system's "
        "structural decomposition, concurrency invariants, and quality-attribute realizations."
    )

    doc.add_heading("1.2 Scope", level=2)
    doc.add_paragraph(
        "PES EventFlow governs the end-to-end event lifecycle for PES University campus activities (fests like Aatmatrisha, "
        "Sanskriti, tech hackathons like Aura, and sports tournaments across RR and Electronic City campuses). The scope encompasses: "
        "(1) Student attendee ticket reservations with verified PES SRN validation and 10-minute ACID hold timers; "
        "(2) Event organizer operations including multi-tier seating allocation and RFC-4180 attendee manifest downloads; "
        "(3) Campus administrator oversight, moderation, and event suspension controls; and "
        "(4) PCI-DSS compliant checkout tokenization storing masked card format (**** **** **** 1234)."
    )

    doc.add_heading("1.3 Audience", level=2)
    doc.add_paragraph(
        "This document is intended for Software Engineering evaluators, faculty reviewers, full-stack engineers, QA test automation "
        "engineers, and campus club coordinators managing event admissions."
    )

    doc.add_heading("1.4 Definitions & Acronyms", level=2)
    def_table = doc.add_table(rows=6, cols=2)
    def_table.rows[0].cells[0].text = "Term / Acronym"
    def_table.rows[0].cells[1].text = "Definition"
    defs = [
        ("ACID", "Atomicity, Consistency, Isolation, Durability — database transaction invariants guaranteed by MongoDB replica set sessions."),
        ("PES SRN", "Student Registration Number (Format: PES[1|2]UG[YY][Branch][Roll], e.g., PES1UG24CS199)."),
        ("PCI-DSS", "Payment Card Industry Data Security Standard — mandates zero raw PAN storage; enforces tokenized/masked card references."),
        ("ADR", "Architecture Decision Record — captures significant architectural decisions, alternatives, and technical rationale."),
        ("RTM", "Requirements Traceability Matrix — links functional and non-functional requirements to implementation code and test suites.")
    ]
    for i, (k, v) in enumerate(defs):
        def_table.rows[i+1].cells[0].text = k
        def_table.rows[i+1].cells[1].text = v
    style_table(def_table)

    # 2. Document Overview
    doc.add_heading("2. Document Overview", level=1)
    doc.add_paragraph(
        "Section 3 details the architectural style, component diagrams, stakeholder concerns, and technology decisions. "
        "Section 4 elaborates low-level design specifications including sequence diagrams, API contracts, and error handling. "
        "Section 5 provides appendices, glossary, and traceability references."
    )

    # 3. Architecture
    doc.add_heading("3. Architecture", level=1)
    doc.add_heading("3.1 Goals & Constraints", level=2)
    doc.add_paragraph(
        "• Concurrency & Performance (NFR-01): Maintain sub-3-second response latency under 50 simultaneous student buyers during flash sales with zero overselling.\n"
        "• Security & Compliance (NFR-02): Full PCI-DSS compliance with zero plaintext card storage; only tokenized IDs and masked card numbers (**** **** **** 1234) persisted.\n"
        "• Transactional Integrity (NFR-03): Multi-document two-phase ACID transactions for all inventory decrement and payment confirmation operations.\n"
        "• Mobile Accessibility (NFR-04): 100% responsive fluid UI meeting WCAG touch targets (min 48px) and zero horizontal overflow on screens down to 320px.\n"
        "• Architectural Decoupling (NFR-05): Strict separation of payment providers, inventory locks, and user authorization middleware."
    )

    doc.add_heading("3.2 Stakeholders & Architectural Concerns", level=2)
    sh_table = doc.add_table(rows=5, cols=3)
    sh_headers = ["Stakeholder", "Primary Concern", "Architectural Response"]
    for j, h in enumerate(sh_headers):
        sh_table.rows[0].cells[j].text = h
    sh_data = [
        ("Student Attendees", "Fast booking, clear hold timers, ticket integrity", "10-minute ACID hold timer, verified SRN identity badge, QR pass receipt"),
        ("Club Event Hosts", "Zero overselling, accurate attendee rosters", "Real-time inventory decrement, RFC-4180 CSV manifest export with SRN & seating tiers"),
        ("Campus Dean / Admin", "Platform safety, dispute control, abuse prevention", "Role-based administrative suspension engine instantly voiding suspicious events/organizers"),
        ("Security Evaluators", "Data protection, payment safety, audit compliance", "Bcrypt-10 hashing, JWT authorization, pre-save PCI sanitization regex, tokenized checkout")
    ]
    for i, row in enumerate(sh_data):
        for j, val in enumerate(row):
            sh_table.rows[i+1].cells[j].text = val
    style_table(sh_table)

    doc.add_heading("3.3 Component (UML) Diagram", level=2)
    doc.add_paragraph("The architectural component decomposition of PES EventFlow is illustrated below:")
    
    img_path = r"C:\Users\vegit\Downloads\Event-Management-System\documents\component_diagram_uml.png"
    if os.path.exists(img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_img = p_img.add_run()
        run_img.add_picture(img_path, width=Inches(6.0))
        p_caption = doc.add_paragraph()
        p_caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_cap = p_caption.add_run("Figure 3.1: PES EventFlow Layered Component Architecture Diagram")
        r_cap.font.size = Pt(8.5)
        r_cap.font.italic = True
        r_cap.font.color.rgb = RGBColor(100, 116, 139)
    else:
        doc.add_paragraph("[UML Component Diagram: Client (React) -> Express API Gateway -> Controllers -> Domain Services -> MongoDB]")

    doc.add_heading("3.4 Component Descriptions", level=2)
    doc.add_paragraph(
        "1. Client Presentation Tier: Modern Single Page Application (React 18, Vite, React Router 6, CSS variables) "
        "delivering multi-step checkout wizard, live countdown timer, and role-based portals (Student, Organizer, Admin).\n"
        "2. API Gateway & Middleware Tier: Express 4.21 router handling JWT token verification, RBAC guards (auth.js, roleCheck.js), "
        "and request body validation schemas.\n"
        "3. Application Controller Tier: Coordinates business workflows for events, tickets, payments, and admin suspensions.\n"
        "4. Domain Services Tier: Contains isolated payment gateway adapters (PaymentService, MockINRGateway, StripeProvider) "
        "and ACID transaction wrapper (transactionService.js).\n"
        "5. Persistence Tier: MongoDB 7.0 multi-document database utilizing Mongoose 8.7 schemas with automated pre-save PCI filters "
        "and compound performance indexing."
    )

    doc.add_heading("3.5 Chosen Architecture Pattern and Rationale", level=2)
    doc.add_paragraph(
        "A Layered Model-View-Controller (MVC) with Service-Oriented Component Decoupling was chosen. "
        "Rationale: Microservices were rejected as they introduce distributed transaction latency (two-phase commit overhead over HTTP) "
        "which severely compromises flash-sale throughput. A clean modular monolith with atomic database session transactions achieves "
        "sub-300ms p95 latencies while preserving complete code separation across domains."
    )

    doc.add_heading("3.6 Technology Stack & Data Stores", level=2)
    tech_table = doc.add_table(rows=6, cols=3)
    tech_headers = ["Layer", "Technologies", "Justification"]
    for j, h in enumerate(tech_headers):
        tech_table.rows[0].cells[j].text = h
    tech_data = [
        ("Frontend", "React 18, Vite 5, Axios, React Router 6", "Sub-second build times, component modularity, fluid mobile UX"),
        ("Backend", "Node.js 22 LTS, Express.js 4.21, ES Modules", "Non-blocking event loop handles high-concurrency student flash sales"),
        ("Database", "MongoDB 7.0+ Replica Set, Mongoose 8.7", "ACID multi-document transactions, dynamic JSON schema flexibility"),
        ("Security", "JSON Web Tokens (JWT), Bcrypt.js (10 rounds)", "Stateless, tamper-proof session authorization and credential storage"),
        ("Testing", "Node.js Built-in Test Runner, Pytest, ReportLab", "Deterministic native test execution, 100% automated CI pass verification")
    ]
    for i, row in enumerate(tech_data):
        for j, val in enumerate(row):
            tech_table.rows[i+1].cells[j].text = val
    style_table(tech_table)

    doc.add_heading("3.7 Security Architecture & Threat Modeling (STRIDE)", level=2)
    stride_table = doc.add_table(rows=7, cols=3)
    stride_headers = ["Threat Category (STRIDE)", "Identified Vulnerability", "Implemented Architectural Countermeasure"]
    for j, h in enumerate(stride_headers):
        stride_table.rows[0].cells[j].text = h
    stride_data = [
        ("Spoofing", "Student impersonation or fraudulent identity claims", "Strict SRN format regex validation (PES[1|2]UG[YY]...) and verified email linking"),
        ("Tampering", "Altering ticket hold quantities or price parameters", "Server-authoritative pricing calculation; client requests validated against database tier pricing"),
        ("Repudiation", "Organizer denying attendee manifest or ticket refunds", "Audit logs linking transaction IDs, refund IDs, and timestamps in database"),
        ("Information Disclosure", "Exposing plaintext credit card PANs or CVVs", "PCI-DSS pre-save regex rejects raw card numbers; persists strictly '**** **** **** 1234'"),
        ("Denial of Service (DoS)", "Flash sale traffic saturating ticket booking", "Compound performance indexing on status/inventory; 10-minute auto-release timer for abandoned holds"),
        ("Elevation of Privilege", "Attendee accessing organizer manifest or admin controls", "RoleCheck middleware verifies role before route entry; returns HTTP 403 Forbidden on mismatch")
    ]
    for i, row in enumerate(stride_data):
        for j, val in enumerate(row):
            stride_table.rows[i+1].cells[j].text = val
    style_table(stride_table)

    # 4. Design
    doc.add_heading("4. Detailed Design", level=1)
    doc.add_heading("4.1 UML Sequence Diagrams (Core Workflows)", level=2)
    doc.add_paragraph("Flow 1: High-Concurrency Ticket Hold Reservation with 10-Minute Timer (FR-04, NFR-01, NFR-03)")
    doc.add_paragraph(
        "1. Attendee Client initiates: POST /api/tickets/hold { eventId, quantity: 1, tierName: 'Fast Pass' }\n"
        "2. Express Router executes protect middleware -> verifies JWT Bearer token.\n"
        "3. ticketController initiates withTransaction(session):\n"
        "   a. Queries Event by ID inside session with atomic lock.\n"
        "   b. Validates: availableTickets >= quantity (If 0, throws HTTP 400 'Sold Out').\n"
        "   c. Decrements Event.availableTickets by quantity atomically.\n"
        "   d. Creates Ticket document with status: 'held', holdExpiresAt: now + 10m.\n"
        "4. Commits MongoDB transaction session.\n"
        "5. Returns HTTP 201 Created { holdId, holdExpiresAt, secondsRemaining: 600 }.\n"
        "6. Frontend initiates visual countdown timer; if timer reaches 0, releases seat automatically."
    )

    doc.add_paragraph("Flow 2: Tokenized INR Payment Confirmation & Masked PAN Persistence (FR-06, NFR-02)")
    doc.add_paragraph(
        "1. Attendee Client submits payment: POST /api/tickets/:holdId/confirm { paymentMethod: 'credit_card', cardLast4: '1234' }\n"
        "2. ticketController runs withTransaction(session):\n"
        "   a. Verifies Ticket status is 'held' and holdExpiresAt > now.\n"
        "   b. Calls MockINRGateway tokenization service -> receives tok_pes_... token.\n"
        "   c. Creates Payment document in MongoDB: { transactionId: 'PAY-...', cardLast4: '1234', maskedCardNumber: '**** **** **** 1234', status: 'completed' }.\n"
        "   d. Pre-save hook scans document: confirms 0 unmasked 16-digit PANs exist.\n"
        "   e. Updates Ticket: status = 'confirmed', ticketId = 'TCK-...', links Payment ID.\n"
        "3. Commits transaction session.\n"
        "4. Returns HTTP 200 OK with digital QR pass and masked card receipt."
    )

    doc.add_heading("4.2 Key API Interface Specifications", level=2)
    api_table = doc.add_table(rows=4, cols=4)
    api_headers = ["Endpoint", "Method", "Auth Required", "Description & Response Status"]
    for j, h in enumerate(api_headers):
        api_table.rows[0].cells[j].text = h
    api_data = [
        ("/api/tickets/hold", "POST", "Private (Attendee)", "Atomically decrements seat stock and mints 10-minute hold ticket (201 Created / 400 Insufficient Stock)"),
        ("/api/tickets/:id/confirm", "POST", "Private (Attendee)", "Executes tokenized payment and confirms ticket with masked card number (200 OK / 410 Expired)"),
        ("/api/events/:id/manifest", "GET", "Private (Organizer/Admin)", "Exports RFC-4180 CSV roster of confirmed attendees with PES SRN and seating tier (200 OK / 403 Forbidden)")
    ]
    for i, row in enumerate(api_data):
        for j, val in enumerate(row):
            api_table.rows[i+1].cells[j].text = val
    style_table(api_table)

    # 5. Appendices
    doc.add_heading("5. Appendices & References", level=1)
    doc.add_paragraph(
        "• Standards: IEEE Std 1016-2009 (Software Design Descriptions), PCI-DSS v4.0 Requirement 3 (Protect Stored Cardholder Data).\n"
        "• Verification Tools: Node.js V8 Test Harness, ReportLab 4.2.5 PDF Generator, VS Code, Git.\n"
        "• Repository Links: Event Management System codebase: C:\\Users\\vegit\\Downloads\\Event-Management-System"
    )

    out_file1 = r"C:\Users\vegit\Downloads\Event-Management-System\SAD_Template.docx"
    out_file2 = r"C:\Users\vegit\Downloads\Event-Management-System\SAD_EventFlow.docx"
    doc.save(out_file1)
    doc.save(out_file2)
    print(f"Successfully generated SAD specifications to:\n  - {out_file1}\n  - {out_file2}")

if __name__ == "__main__":
    build_sad()
