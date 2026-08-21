import smtplib
import os
import html
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:

    @staticmethod
    def _get_smtp_config():
        host = getattr(settings, "SMTP_HOST", "smtp.gmail.com")
        port = int(getattr(settings, "SMTP_PORT", 587))
        user = getattr(settings, "SMTP_USER", "")
        password = getattr(settings, "SMTP_PASS", "")
        from_name = getattr(settings, "SMTP_FROM_NAME", "INTERNTRAC Placement Cell")
        return host, port, user, password, from_name

    @staticmethod
    def _validate_smtp_config(user: str, password: str) -> Optional[str]:
        """Return an error reason when SMTP is not usable, otherwise None."""
        if not user or not password:
            return "SMTP not configured. Set SMTP_USER and SMTP_PASS in .env"
        if user in ("your-email@gmail.com", "your-email"):
            return "SMTP not configured. Replace 'your-email@gmail.com' in .env with your real Gmail address."
        if password in ("your-16-char-app-password", "your-app-password"):
            return "SMTP not configured. Replace placeholder in .env with your Gmail App Password."
        return None

    # ── Shared HTML shell ────────────────────────────────────────────────────────

    @staticmethod
    def _wrap_email(header_title: str, header_subtitle: str, body_html: str) -> str:
        return f"""
        <html>
        <body style="margin:0;padding:0;background-color:#f4f4f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <div style="max-width:620px;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

            <!-- Header Banner -->
            <div style="background:linear-gradient(135deg,#4B1881 0%,#6B24AA 100%);padding:36px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px 0;font-weight:800;letter-spacing:0.5px;">
                {header_title}
              </h1>
              <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;text-transform:uppercase;letter-spacing:2px;">
                {header_subtitle}
              </p>
            </div>

            <!-- Body -->
            <div style="padding:36px 40px;">
              {body_html}
            </div>

            <!-- Footer -->
            <div style="background:#f7f5fc;padding:18px 40px;text-align:center;border-top:1px solid #e9d8fd;">
              <p style="font-size:11px;color:#a0aec0;margin:0;">
                This is an automated email sent by INTERNTRAC Platform. Do not reply to this address.
              </p>
            </div>
          </div>
        </body>
        </html>
        """

    @staticmethod
    def _summary_box(box_title: str, rows) -> str:
        row_html = ""
        for i, (label, value) in enumerate(rows):
            border = "" if i == 0 else "border-top:1px solid #e9d8fd;"
            row_html += f"""
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#718096;font-weight:600;width:120px;{border}">{label}</td>
                    <td style="padding:6px 0;font-size:13px;color:#1a202c;{border}">{value}</td>
                  </tr>"""
        return f"""
              <div style="background:#f9f5ff;border:1px solid #e9d8fd;border-radius:12px;padding:20px 24px;margin:0 0 28px 0;">
                <p style="font-size:12px;color:#6B46C1;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 14px 0;">
                  {box_title}
                </p>
                <table style="width:100%;border-collapse:collapse;">{row_html}
                </table>
              </div>"""

    @staticmethod
    def _greeting(student_name: str) -> str:
        return f"""
              <p style="font-size:15px;color:#1a202c;margin:0 0 20px 0;">
                Dear <strong>{html.escape(student_name)}</strong>,
              </p>"""

    @staticmethod
    def _signoff() -> str:
        return """
              <p style="font-size:14px;color:#4a5568;margin:24px 0 0 0;">
                Best regards,<br/>
                <strong style="color:#4B1881;">INTERNTRAC Placement Cell</strong>
              </p>"""

    # ── Low-level sender ─────────────────────────────────────────────────────────

    @staticmethod
    def _send_html_email(to_email: str, subject: str, html_body: str, pdf_path: Optional[str] = None) -> dict:
        host, port, user, password, from_name = EmailService._get_smtp_config()

        print(f"[EMAIL] SMTP config — host={host}, port={port}, user={user}, pass={'***' if password else '(empty)'}")

        config_error = EmailService._validate_smtp_config(user, password)
        if config_error:
            print(f"[EMAIL] {config_error}")
            return {"sent": False, "reason": config_error}

        msg = MIMEMultipart("mixed")
        msg["From"] = f"{from_name} <{user}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(html_body, "html", "utf-8"))

        if pdf_path and os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                attachment = MIMEApplication(f.read(), _subtype="pdf")
                filename = os.path.basename(pdf_path)
                attachment.add_header("Content-Disposition", "attachment", filename=filename)
                msg.attach(attachment)
        elif pdf_path:
            print(f"[EMAIL] Warning: PDF not found at {pdf_path}")

        try:
            print(f"[EMAIL] Connecting to {host}:{port}...")
            with smtplib.SMTP(host, port, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                print(f"[EMAIL] Logging in as {user}...")
                server.login(user, password.replace(" ", ""))
                print(f"[EMAIL] Sending email to {to_email}...")
                server.sendmail(user, [to_email], msg.as_string())

            print(f"[EMAIL] Email sent successfully to {to_email}")
            return {"sent": True}

        except smtplib.SMTPAuthenticationError as e:
            print(f"[EMAIL] SMTP AUTH FAILED: {e}")
            return {"sent": False, "reason": f"SMTP authentication failed. Your App Password may be wrong. Details: {e}"}
        except smtplib.SMTPConnectError as e:
            print(f"[EMAIL] SMTP CONNECT FAILED: {e}")
            return {"sent": False, "reason": f"Cannot connect to {host}:{port}. Details: {e}"}
        except TimeoutError:
            print(f"[EMAIL] SMTP TIMEOUT connecting to {host}:{port}")
            return {"sent": False, "reason": f"Connection to {host}:{port} timed out."}
        except Exception as e:
            print(f"[EMAIL] FAILED: {type(e).__name__}: {e}")
            return {"sent": False, "reason": str(e)}

    # ── Public email flows ───────────────────────────────────────────────────────

    @staticmethod
    def send_shortlist_email(
        to_email: str,
        student_name: str,
        company_name: str,
        internship_role: str,
        note: str = "",
    ) -> dict:
        company = html.escape(company_name)
        role = html.escape(internship_role)

        note_html = ""
        if note:
            note_html = f"""
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:0 0 24px 0;">
                <p style="font-size:12px;color:#b45309;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px 0;">
                  Message from the Recruiter
                </p>
                <p style="font-size:13px;color:#78350f;line-height:1.6;margin:0;">
                  {html.escape(note)}
                </p>
              </div>"""

        body = f"""
          {EmailService._greeting(student_name)}

          <p style="font-size:14px;color:#4a5568;line-height:1.7;margin:0 0 24px 0;">
            Great news! Your application for the position of
            <strong style="color:#4B1881;">{role}</strong> at
            <strong>{company}</strong> has been <strong style="color:#047857;">shortlisted</strong>.
            You have been selected to move forward to the next stage of the hiring process.
          </p>

          {note_html}

          {EmailService._summary_box("Shortlist Details", [
              ("Role", role),
              ("Company", company),
          ])}

          <p style="font-size:14px;color:#4a5568;line-height:1.7;margin:0 0 8px 0;">
            <strong>What happens next?</strong> The recruitment team will schedule your interview
            and share the details with you shortly. Keep an eye on your email and the
            INTERNTRAC dashboard for updates.
          </p>

          {EmailService._signoff()}
        """

        html_body = EmailService._wrap_email(company, "Application Shortlisted", body)

        print(f"[SHORTLIST] Sending shortlist email to {to_email}")
        return EmailService._send_html_email(
            to_email=to_email,
            subject=f"You're Shortlisted — {internship_role} at {company_name}",
            html_body=html_body,
        )

    @staticmethod
    def send_interview_email(
        to_email: str,
        student_name: str,
        company_name: str,
        internship_role: str,
        interview_date: str,
        interview_time: str,
        interview_duration: str = "30 minutes",
        interview_link: str = "",
        instructions: str = "",
    ) -> dict:
        company = html.escape(company_name)
        role = html.escape(internship_role)
        link = (interview_link or "").strip()

        link_row_value = (
            f'<a href="{html.escape(link, quote=True)}" target="_blank" style="color:#4B1881;font-weight:700;text-decoration:none;">{html.escape(link)}</a>'
            if link else "Will be shared separately"
        )

        instructions_html = ""
        rows = [
            ("Role", role),
            ("Company", company),
            ("Date", html.escape(str(interview_date))),
            ("Time", html.escape(str(interview_time))),
            ("Duration", html.escape(str(interview_duration or "30 minutes"))),
            ("Meeting Link", link_row_value),
        ]
        if instructions:
            rows.append(("Instructions", html.escape(instructions)))

        instructions_html = ""
        if instructions:
            instructions_html = f"""
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin:0 0 24px 0;">
                <p style="font-size:12px;color:#c2410c;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px 0;">
                  Interview Instructions
                </p>
                <p style="font-size:13px;color:#7c2d12;line-height:1.6;margin:0;">
                  {html.escape(instructions)}
                </p>
              </div>"""

        body = f"""
          {EmailService._greeting(student_name)}

          <p style="font-size:14px;color:#4a5568;line-height:1.7;margin:0 0 24px 0;">
            Congratulations! You have been shortlisted for the position of
            <strong style="color:#4B1881;">{role}</strong> at
            <strong>{company}</strong>, and your interview has been scheduled.
            Please find the details below.
          </p>

          {EmailService._summary_box("Interview Details", rows)}

          {instructions_html}

          <p style="font-size:13px;color:#718096;line-height:1.6;margin:0 0 8px 0;">
            We recommend joining the meeting 5–10 minutes early with a stable internet connection.
            Keep a copy of your resume handy. If you need to reschedule, please contact the
            placement cell or the company HR team as soon as possible.
          </p>

          {EmailService._signoff()}
        """

        html_body = EmailService._wrap_email(company, "Interview Invitation", body)

        print(f"[INTERVIEW] Sending interview email to {to_email}")
        return EmailService._send_html_email(
            to_email=to_email,
            subject=f"Interview Scheduled — {internship_role} at {company_name}",
            html_body=html_body,
        )

    @staticmethod
    def send_noc_email(
        to_email: str,
        student_name: str,
        institute_name: str,
        company_name: str,
        internship_role: str,
        duration: str,
        pdf_path: str,
    ) -> dict:
        institute = html.escape(institute_name)
        company = html.escape(company_name)
        role = html.escape(internship_role)

        body = f"""
          {EmailService._greeting(student_name)}

          <p style="font-size:14px;color:#4a5568;line-height:1.7;margin:0 0 24px 0;">
            Great news! Your <strong>No Objection Certificate (NOC)</strong> has been
            <strong style="color:#047857;">approved</strong> by
            <strong>{institute}</strong> for your internship at
            <strong>{company}</strong>.
          </p>

          <p style="font-size:14px;color:#4a5568;line-height:1.7;margin:0 0 28px 0;">
            The official <strong>NOC document</strong> is attached to this email as a PDF.
            You can also download it anytime from your INTERNTRAC dashboard.
          </p>

          {EmailService._summary_box("NOC Details", [
              ("Student", html.escape(student_name)),
              ("Institute", institute),
              ("Company", company),
              ("Role", role),
              ("Duration", html.escape(duration)),
          ])}

          <p style="font-size:13px;color:#718096;line-height:1.6;margin:0 0 8px 0;">
            Please keep a printed copy of this NOC for your records and share it with the
            host company if required. Contact your placement cell for any questions.
          </p>

          {EmailService._signoff()}
        """

        html_body = EmailService._wrap_email(institute, "NOC Approved", body)

        print(f"[NOC] Sending NOC approval email to {to_email}")
        return EmailService._send_html_email(
            to_email=to_email,
            subject=f"NOC Approved — {internship_role} at {company_name}",
            html_body=html_body,
            pdf_path=pdf_path,
        )

    @staticmethod
    def send_offer_letter_email(
        to_email: str,
        student_name: str,
        company_name: str,
        internship_role: str,
        duration: str,
        stipend: str,
        location: str,
        start_date: str,
        pdf_path: str,
    ) -> dict:
        company = html.escape(company_name)
        role = html.escape(internship_role)

        body = f"""
          {EmailService._greeting(student_name)}

          <p style="font-size:14px;color:#4a5568;line-height:1.7;margin:0 0 24px 0;">
            We are thrilled to inform you that you have been <strong>selected</strong> for the position of
            <strong style="color:#4B1881;">{role}</strong> at
            <strong>{company}</strong>. Congratulations on this achievement!
          </p>

          <p style="font-size:14px;color:#4a5568;line-height:1.7;margin:0 0 28px 0;">
            Please find the official <strong>Offer Letter</strong> attached to this email.
            Review the terms carefully and keep a copy for your records.
          </p>

          {EmailService._summary_box("Offer Summary", [
              ("Role", role),
              ("Duration", html.escape(duration)),
              ("Stipend", html.escape(stipend)),
              ("Location", html.escape(location)),
              ("Start Date", html.escape(start_date)),
          ])}

          <p style="font-size:13px;color:#718096;line-height:1.6;margin:0 0 8px 0;">
            If you have any questions regarding your offer, please reach out to the placement cell
            or the company HR team directly.
          </p>

          {EmailService._signoff()}
        """

        html_body = EmailService._wrap_email(company, "Offer of Internship", body)

        print(f"[OFFER] Sending offer letter email to {to_email}")
        return EmailService._send_html_email(
            to_email=to_email,
            subject=f"Congratulations! Offer Letter — {internship_role} at {company_name}",
            html_body=html_body,
            pdf_path=pdf_path,
        )


email_service = EmailService()
