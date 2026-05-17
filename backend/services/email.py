"""Servicio de email via Brevo SMTP."""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from core.config import settings


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    if not settings.SMTP_PASSWORD:
        print(f"[email] SMTP no configurado, skipping send to {to}")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
    msg["To"] = to
    if text:
        msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to, msg.as_string())
        return True
    except Exception as e:
        print(f"[email] error: {e}")
        return False
