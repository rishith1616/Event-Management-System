import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def update_sad():
    src = r"C:\Users\vegit\Downloads\original_templates\SAD_Template.docx"
    doc = docx.Document(src)
    
    # Text replacements in paragraphs
    replacements = {
        "Project: ATM System": "Project: PES EventFlow — Campus Event Management & Ticketing System",
        "Version: 1.0": "Version: 1.0",
        "Authors: Example Team": "Authors: Jayanth Kumar P (SRN: PES1UG24CS199)",
        "Date: 09-09-2025": "Date: 19-11-2026",
        "Status: Draft": "Status: Final / Approved",
        "Version | Date | Author | Change Summary": "Version | Date | Author | Change Summary\n1.0 | 19-11-2026 | Jayanth Kumar P (PES1UG24CS199) | Final Software Architecture and Design Specification for PES EventFlow",
        "Role | Name | Signature/Date": "Role | Name | Signature/Date\nCourse Coordinator | Faculty Evaluation Committee | Approved (19-11-2026)\nStudent Lead | Jayanth Kumar P (PES1UG24CS199) | Signed (19-11-2026)",
        "1.1 Purpose\nThis document specifies the architecture and design of the ATM System.": 
            "1.1 Purpose\nThis document specifies the software architecture and system design of PES EventFlow, the official campus event ticketing, hold reservation, and seating management platform for PES University.",
        "1.2 Scope\nCovers ATM user services: cash withdrawal, balance inquiry, and fund transfer.": 
            "1.2 Scope\nCovers attendee ticket reservations with verified PES SRN validation, 10-minute temporary ticket holds with visual countdown timers, tokenized INR payment processing, organizer event management with RFC-4180 attendee manifest downloads, and platform administrator content moderation.",
        "1.3 Audience\nDevelopers, QA engineers, security auditors, instructors, and maintenance teams.": 
            "1.3 Audience\nDevelopers, QA test automation engineers, security auditors, course instructors, and campus event coordinators.",
        "1.4 Definitions\nATM, PIN, ADR, PCI-DSS, TLS.": 
            "1.4 Definitions\nACID (Atomicity, Consistency, Isolation, Durability), PES SRN (Student Registration Number), ADR (Architecture Decision Record), PCI-DSS (Payment Card Industry Data Security Standard), JWT (JSON Web Token), TLS (Transport Layer Security).",
        "2.1 How to use this document\nProvides architectural deliverables including UML diagrams, ADRs, threat models, and API design.": 
            "2.1 How to use this document\nProvides architectural deliverables including UML component and sequence diagrams, ADRs, STRIDE threat models, and REST API design.",
        "2.2 Related Documents\nSRS, STP, RTM.": 
            "2.2 Related Documents\nSRS (Software Requirements Specification), STP (Software Test Plan), RTM (Requirements Traceability Matrix).",
        "3.1 Goals & Constraints\nGoals: secure, reliable, 99.9% availability. Constraints: PCI-DSS compliance, ATM hardware limits.": 
            "3.1 Goals & Constraints\nGoals: High concurrency (50 simultaneous buyers under 3 seconds), zero overselling, 99.9% uptime, strict PCI-DSS compliance (zero raw cardholder PANs stored; masked format **** **** **** 1234). Constraints: MongoDB replica set multi-document ACID transaction guarantees, web standards compatibility.",
        "3.2 Stakeholders & Concerns\nCustomers: security, availability\nBank Ops: maintainability\nRegulators: compliance\nDevelopers: modularity.": 
            "3.2 Stakeholders & Concerns\nStudent Attendees: fast booking, hold timer clarity, ticket integrity.\nClub Event Hosts: zero overselling, accurate attendee manifests with SRN.\nPlatform Admin: content moderation, event suspensions, audit safety.\nSecurity Evaluators: PCI-DSS compliance, encrypted token storage, RBAC authorization.",
        "- ATM UI: handles customer input/output.\n- Auth Service: validates PIN.\n- Transaction Processor: processes withdrawals, deposits, transfers.\n- Bank Server API: backend integration.\n- Database: account and transaction data storage.": 
            "- Client UI (React 18 / Vite): handles attendee booking wizard, live countdown timer, and organizer dashboards.\n- API Gateway & Auth Middleware: validates JWT bearer tokens and enforces role-based access control (attendee, organizer, admin).\n- Ticket & Hold Controller: manages 10-minute seat hold locks and inventory decrements.\n- Transaction Processor: executes multi-document two-phase commit ACID transactions via MongoDB sessions.\n- Payment Service (MockINRGateway / Stripe): tokenizes payments and sanitizes card numbers to masked format **** **** **** 1234.\n- Database (MongoDB 7.0): stores user credentials, events, tickets, and payments with compound performance indexes.",
        "Layered architecture chosen for clear separation of concerns. Microservices rejected as overly complex for ATM scale.": 
            "Layered Model-View-Controller (MVC) with Service-Oriented Component Decoupling. Rationale: Microservices were rejected due to distributed transaction latency and network overhead during rapid flash sales. A modular monolith using MongoDB replica set transactions guarantees zero overselling and sub-300ms p95 latencies.",
        "Java, Spring Boot APIs, MySQL DB, TLS encryption. ATM terminals use secure modules.": 
            "Frontend: React 18, Vite, React Router 6, CSS variables.\nBackend: Node.js 22 LTS, Express.js 4.21, ES Modules.\nDatabase: MongoDB 7.0 Community Edition with Mongoose 8.7.\nSecurity: JSON Web Tokens (JWT), Bcrypt.js (10 salt rounds), TLS 1.3 encryption.",
        "Risk: ATM downtime due to network failure → Mitigation: redundant connections.": 
            "Risk: Concurrency race condition on final available seat -> Mitigation: MongoDB multi-document ACID transactions with atomic inventory decrements.\nRisk: PCI-DSS non-compliance -> Mitigation: Pre-save regex rejects raw card numbers; persists strictly '**** **** **** 1234'.\nRisk: Abandoned checkout holds tying up inventory -> Mitigation: Automatic 10-minute hold expiration timer sweeps expired seats.",
        "R1 (PIN validation) → Auth Service\nR2 (Cash withdrawal) → Transaction Processor": 
            "FR-01 (Authentication & RBAC) -> Auth Middleware (auth.js, roleCheck.js)\nFR-02 (Multi-tier Events) -> Event Controller & Model (eventController.js, Event.js)\nFR-04 (10-Min Ticket Hold) -> Ticket Controller (ticketController.js, Ticket.js)\nFR-06 (Tokenized Payment) -> Payment Service (paymentController.js, Payment.js)\nFR-08 (Manifest Download) -> Event Controller (getAttendeeManifest)\nNFR-01 (Concurrency Load) -> Compound Performance Indexes & Atomic Locks\nNFR-02 (PCI-DSS Masking) -> Pre-save Security Regex Hook ('**** **** **** 1234')\nNFR-03 (ACID Transactions) -> Transaction Service (transactionService.js)",
        "Threat Modeling (STRIDE): Spoofing → chip validation; Tampering → secure boot; Info disclosure → TLS; DoS → rate limiting; Elevation of Privilege → RBAC.": 
            "Threat Modeling (STRIDE):\n- Spoofing -> PES SRN format regex validation (PES[1|2]UG...) and JWT identity tokens.\n- Tampering -> Server-authoritative ticket pricing validation; database ACID session locks.\n- Repudiation -> Comprehensive transaction and refund audit trails in MongoDB.\n- Information Disclosure -> PCI-DSS tokenization; zero raw card numbers stored (masked as **** **** **** 1234).\n- Denial of Service -> Compound indexing ({ status: 1, isSuspended: 1 }); 10-minute hold auto-release.\n- Elevation of Privilege -> RoleCheck middleware rejecting unauthorized roles with HTTP 403 Forbidden.",
        "ATM designed with layered modules for separation of concerns and easier maintenance.": 
            "PES EventFlow is designed with clean layered modules separating HTTP routing, controller orchestration, domain business services, and database persistence to ensure high maintainability and testability.",
        "Endpoint: /withdraw\nMethod: POST\nRequest: {cardId, pin, amount}\nResponse: {status, balance}\nErrors: 401 Invalid PIN, 402 Insufficient funds.": 
            "Endpoint: /api/tickets/hold\nMethod: POST\nRequest: { eventId: string, quantity: number, tierName: string, contactName: string, contactSrn: string, contactPhone: string }\nResponse: { success: true, holdId: string, holdExpiresAt: string, secondsRemaining: 600 }\nErrors: 400 Insufficient stock, 401 Unauthorized, 404 Event not found.\n\nEndpoint: /api/tickets/:id/confirm\nMethod: POST\nRequest: { paymentMethod: 'credit_card', cardLast4: '1234', maskedCardNumber: '**** **** **** 1234' }\nResponse: { success: true, ticket: { ticketId: 'TCK-...', status: 'confirmed', maskedCardNumber: '**** **** **** 1234' } }\nErrors: 400 Invalid status, 410 Hold expired, 403 Forbidden.\n\nEndpoint: /api/events/:id/manifest\nMethod: GET\nHeaders: Authorization: Bearer <token>\nResponse: RFC-4180 CSV file (Content-Type: text/csv) containing Ticket ID, Attendee Name, Attendee Email, PES SRN, Contact Phone, Ticket Tier, Seating Level, and Total Paid in INR.\nErrors: 403 Access denied (only event organizer or admin permitted), 404 Event not found.",
        "Standardized error messages. No sensitive info in logs. Monitoring includes transaction failure rate, ATM uptime.": 
            "Centralized error handling middleware formats all errors into consistent JSON responses. Sensitive fields (passwords, payment tokens) are strictly omitted from log streams. Monitoring tracks 50-buyer flash sale latencies, transaction success rates, and hold expiration counts.",
        "ATM UI with accessible font sizes, language selection, and voice assistance.": 
            "Mobile-first responsive interface adhering to WCAG 2.1 AA accessibility guidelines. Features min 48px touch targets, zero horizontal scrolling, clear visual countdown timer warning colors (yellow at 5m, red at 2m), and instant one-click demo credentials.",
        "Future enhancements: biometric authentication, QR-based mobile withdrawals.": 
            "Future enhancements: Native mobile app wrapper for gate scanners, biometric student face-match verification at campus turnstiles, and integration with PES University student ERP portal.",
        "5.1 Glossary: ATM, PIN, PCI-DSS, TLS, ADR.\n5.2 References: IEEE 42010, OWASP, NIST SP 800-160.\n5.3 Tools: PlantUML, draw.io, Swagger.": 
            "5.1 Glossary: ACID, PES SRN, PCI-DSS, JWT, REST, RTM, ADR, STRIDE.\n5.2 References: IEEE 42010 (Architecture Description), PCI-DSS v4.0 Requirement 3, OWASP Top 10.\n5.3 Tools: Node.js V8 Test Harness, React 18, Vite, MongoDB, Postman, Git."
    }
    
    for p in doc.paragraphs:
        txt = p.text.strip()
        if txt in replacements:
            p.text = replacements[txt]
        elif "<< Insert UML Component Diagram here>>" in p.text:
            p.text = ""
            img_path = r"C:\Users\vegit\Downloads\Event-Management-System\documents\component_diagram_uml.png"
            if os.path.exists(img_path):
                run = p.add_run()
                run.add_picture(img_path, width=Inches(5.5))
        elif "<< Insert Sequence Diagram here>>" in p.text:
            p.text = (
                "Flow 1: High-Concurrency Ticket Hold Reservation (FR-04, NFR-01, NFR-03)\n"
                "Client -> POST /api/tickets/hold -> AuthMiddleware (validates JWT) -> TicketController -> "
                "TransactionService (starts session) -> EventModel (checks stock >= qty, decrements stock) -> "
                "TicketModel (creates held ticket, expiresAt = now + 10m) -> TransactionService (commits) -> "
                "Client (201 Created, starts 10-min countdown timer).\n\n"
                "Flow 2: Tokenized Payment & Masked Receipt Generation (FR-06, NFR-02)\n"
                "Client -> POST /api/tickets/:id/confirm { cardLast4: '1234' } -> TicketController (validates hold active) -> "
                "PaymentService (tokenizes card) -> PaymentModel (pre-save regex verifies no raw PAN, saves '**** **** **** 1234') -> "
                "TicketModel (updates status to 'confirmed', mints TCK-ID) -> Client (200 OK with digital QR pass and masked receipt)."
            )

    dst1 = r"C:\Users\vegit\Downloads\Event-Management-System\SAD_Template.docx"
    dst2 = r"C:\Users\vegit\Downloads\Event-Management-System\SAD_EventFlow.docx"
    doc.save(dst1)
    doc.save(dst2)
    print(f"Updated SAD directly on original template: {dst1}")

if __name__ == "__main__":
    update_sad()
