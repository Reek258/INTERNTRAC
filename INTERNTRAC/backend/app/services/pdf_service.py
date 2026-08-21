import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class PDFService:
    @staticmethod
    def generate_noc_pdf(
        output_path: str,
        student_name: str,
        institute_name: str,
        company_name: str,
        internship_role: str,
        duration: str
    ) -> str:
        """
        Generate a No Objection Certificate PDF.
        """
        # Ensure directories exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)
        styles = getSampleStyleSheet()
        story = []

        # Custom Styles
        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Heading1"],
            alignment=1, # Center
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#1A365D"),
            spaceAfter=20
        )
        
        body_style = ParagraphStyle(
            name="BodyStyle",
            parent=styles["Normal"],
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#2D3748"),
            spaceAfter=15
        )

        sub_style = ParagraphStyle(
            name="SubStyle",
            parent=styles["Normal"],
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#718096"),
            spaceAfter=15
        )

        # Header
        story.append(Paragraph(f"<b>{institute_name.upper()}</b>", title_style))
        story.append(Paragraph("OFFICE OF THE ACADEMIC DEAN / PLACEMENT CELL", ParagraphStyle("HeaderSub", parent=styles["Normal"], alignment=1, fontSize=10, textColor=colors.HexColor("#4A5568"))))
        story.append(Spacer(1, 20))
        
        # Divider Line
        d_table = Table([[""]], colWidths=[500])
        d_table.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,-1), 2, colors.HexColor("#1A365D")),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(d_table)
        story.append(Spacer(1, 25))

        # Title
        story.append(Paragraph("<b>NO OBJECTION CERTIFICATE</b>", ParagraphStyle("DocTitle", parent=styles["Normal"], alignment=1, fontSize=16, leading=20, textColor=colors.HexColor("#2C5282"))))
        story.append(Spacer(1, 20))

        # Body Content
        body_text = (
            f"This is to certify that <b>{student_name}</b> is a bona fide student of <b>{institute_name}</b>. "
            f"The institution has no objection to their participating in the internship program at <b>{company_name}</b> "
            f"for the role of <b>{internship_role}</b>. The duration of this engagement will be <b>{duration}</b>."
        )
        story.append(Paragraph(body_text, body_style))
        
        body_text_2 = (
            "During this period, the student is expected to adhere to all guidelines and safety criteria of the host company while "
            "complying with the academic code of conduct. Attendance records and progress feedback logs must be submitted weekly to "
            "their assigned faculty mentor."
        )
        story.append(Paragraph(body_text_2, body_style))
        story.append(Spacer(1, 40))

        # Signatures
        sig_data = [
            [
                Paragraph("<b>Prepared By:</b><br/>Placement Coordinator", sub_style),
                Paragraph("<b>Approved By:</b><br/>Dean of Student Affairs / Registrar", sub_style)
            ],
            [
                Spacer(1, 30),
                Spacer(1, 30)
            ],
            [
                Paragraph("________________________", sub_style),
                Paragraph("________________________", sub_style)
            ]
        ]
        
        sig_table = Table(sig_data, colWidths=[250, 250])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(sig_table)

        doc.build(story)
        return output_path

    @staticmethod
    def generate_completion_certificate(
        output_path: str,
        student_name: str,
        company_name: str,
        internship_role: str,
        duration: str
    ) -> str:
        """
        Generate an Internship Completion Certificate PDF.
        """
        # Ensure directories exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle(
            name="CertTitle",
            parent=styles["Heading1"],
            alignment=1,
            fontSize=26,
            leading=30,
            textColor=colors.HexColor("#2C5282"),
            spaceAfter=15
        )
        
        sub_title_style = ParagraphStyle(
            name="CertSub",
            parent=styles["Normal"],
            alignment=1,
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#4A5568"),
            spaceAfter=30
        )

        body_style = ParagraphStyle(
            name="CertBody",
            parent=styles["Normal"],
            alignment=1, # Centered body
            fontSize=12,
            leading=18,
            textColor=colors.HexColor("#2D3748"),
            spaceAfter=25
        )

        # Border Design Table
        story.append(Spacer(1, 20))
        story.append(Paragraph(f"<b>{company_name.upper()}</b>", ParagraphStyle("CompHeader", parent=styles["Heading2"], alignment=1, textColor=colors.HexColor("#1A365D"))))
        story.append(Spacer(1, 15))
        
        story.append(Paragraph("<b>CERTIFICATE OF COMPLETION</b>", title_style))
        story.append(Paragraph("This certificate is proudly presented to", sub_title_style))
        
        story.append(Paragraph(f"<font size=18><b>{student_name}</b></font>", ParagraphStyle("NameStyle", parent=styles["Normal"], alignment=1, textColor=colors.HexColor("#2B6CB0"))))
        story.append(Spacer(1, 15))

        cert_text = (
            f"for successfully completing their professional internship training at <b>{company_name}</b> "
            f"as a <b>{internship_role}</b>. The internship was completed over a period of <b>{duration}</b>."
        )
        story.append(Paragraph(cert_text, body_style))
        
        cert_text_2 = (
            "During their tenure, we found the candidate to be industrious, highly motivated, and professional. "
            "We wish them all the best in their future career endeavors."
        )
        story.append(Paragraph(cert_text_2, body_style))
        story.append(Spacer(1, 40))

        # Signatures
        sig_data = [
            [
                Paragraph("<b>Internship Supervisor</b>", ParagraphStyle("SigText", parent=styles["Normal"], alignment=1)),
                Paragraph("<b>HR Director</b>", ParagraphStyle("SigText2", parent=styles["Normal"], alignment=1))
            ],
            [
                Spacer(1, 25),
                Spacer(1, 25)
            ],
            [
                Paragraph("________________________", ParagraphStyle("Line1", parent=styles["Normal"], alignment=1, textColor=colors.HexColor("#A0AEC0"))),
                Paragraph("________________________", ParagraphStyle("Line2", parent=styles["Normal"], alignment=1, textColor=colors.HexColor("#A0AEC0")))
            ]
        ]
        
        sig_table = Table(sig_data, colWidths=[250, 250])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(sig_table)

        doc.build(story)
        return output_path

    @staticmethod
    def generate_offer_letter(
        output_path: str,
        student_name: str,
        company_name: str,
        internship_role: str,
        duration: str,
        stipend: str,
        location: str,
        start_date: str,
        description: str
    ) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle(
            name="OfferTitle", parent=styles["Heading1"], alignment=1,
            fontSize=24, leading=28, textColor=colors.HexColor("#1A365D"), spaceAfter=10
        )
        sub_style = ParagraphStyle(
            name="OfferSub", parent=styles["Normal"], alignment=1,
            fontSize=11, leading=15, textColor=colors.HexColor("#4A5568"), spaceAfter=30
        )
        body_style = ParagraphStyle(
            name="OfferBody", parent=styles["Normal"], fontSize=11,
            leading=17, textColor=colors.HexColor("#2D3748"), spaceAfter=12
        )
        bold_style = ParagraphStyle(
            name="OfferBold", parent=styles["Normal"], fontSize=11,
            leading=17, textColor=colors.HexColor("#1A202C"), spaceAfter=6
        )

        story.append(Paragraph(f"<b>{company_name.upper()}</b>", title_style))
        story.append(Paragraph("OFFER OF INTERNSHIP", sub_style))

        d_table = Table([[""]], colWidths=[500])
        d_table.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,-1), 2, colors.HexColor("#4B1881")),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(d_table)
        story.append(Spacer(1, 25))

        story.append(Paragraph(f"Date: {start_date}", body_style))
        story.append(Spacer(1, 10))

        story.append(Paragraph(f"Dear <b>{student_name}</b>,", body_style))
        story.append(Spacer(1, 10))

        intro = (
            f"We are pleased to offer you the position of <b>{internship_role}</b> at <b>{company_name}</b>. "
            f"Following a thorough evaluation of your profile, we are confident that your skills and academic background "
            f"make you an excellent fit for this role."
        )
        story.append(Paragraph(intro, body_style))
        story.append(Spacer(1, 10))

        story.append(Paragraph("<b>Terms of Engagement:</b>", bold_style))
        story.append(Spacer(1, 5))

        terms = [
            ["Role", internship_role],
            ["Duration", duration],
            ["Stipend", stipend],
            ["Location", location],
            ["Start Date", start_date],
        ]
        terms_table = Table(terms, colWidths=[140, 340])
        terms_table.setStyle(TableStyle([
            ('FONT', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor("#2D3748")),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor("#E2E8F0")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(terms_table)
        story.append(Spacer(1, 15))

        if description:
            story.append(Paragraph("<b>Role Description:</b>", bold_style))
            story.append(Paragraph(description, body_style))
            story.append(Spacer(1, 10))

        closing = (
            "During your internship, you are expected to adhere to the company's code of conduct, maintain "
            "confidentiality of proprietary information, and follow all guidelines set forth by your reporting manager. "
            "Your performance will be reviewed periodically, and a completion certificate will be issued upon "
            "successful completion of the internship tenure."
        )
        story.append(Paragraph(closing, body_style))
        story.append(Spacer(1, 10))

        story.append(Paragraph(
            "We look forward to welcoming you to the team and having a productive internship experience. "
            "Please confirm your acceptance by signing and returning a copy of this letter.",
            body_style
        ))
        story.append(Spacer(1, 40))

        sig_data = [
            [
                Paragraph(f"<b>{company_name}</b>", ParagraphStyle("OfferSig1", parent=styles["Normal"], alignment=1)),
                Paragraph("<b>Candidate Acceptance</b>", ParagraphStyle("OfferSig2", parent=styles["Normal"], alignment=1))
            ],
            [Spacer(1, 30), Spacer(1, 30)],
            [
                Paragraph("________________________", ParagraphStyle("OfferLine1", parent=styles["Normal"], alignment=1, textColor=colors.HexColor("#A0AEC0"))),
                Paragraph("________________________", ParagraphStyle("OfferLine2", parent=styles["Normal"], alignment=1, textColor=colors.HexColor("#A0AEC0")))
            ],
            [
                Paragraph("Authorized Signatory", ParagraphStyle("OfferSigSub1", parent=styles["Normal"], alignment=1, fontSize=9, textColor=colors.HexColor("#718096"))),
                Paragraph(f"{student_name}", ParagraphStyle("OfferSigSub2", parent=styles["Normal"], alignment=1, fontSize=9, textColor=colors.HexColor("#718096")))
            ]
        ]
        sig_table = Table(sig_data, colWidths=[250, 250])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(sig_table)

        doc.build(story)
        return output_path
