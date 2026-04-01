"""
Notification service abstraction.

Default backend: SMTP (works with Gmail, Mailgun SMTP, etc.)
Swap backend via NOTIFICATION_BACKEND env var: "smtp" | "sendgrid" | "sns" | "none"
"""
import os
import sys
import smtplib
from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

# Allow running from project root
sys.path.insert(
    0,
    os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
    ),
)

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class BaseNotifier(ABC):
    @abstractmethod
    def send(
        self,
        recipient: str,
        subject: str,
        body_html: str,
        body_text: str,
    ) -> bool:
        pass


# ---------------------------------------------------------------------------
# SMTP
# ---------------------------------------------------------------------------

class SMTPNotifier(BaseNotifier):
    def send(
        self,
        recipient: str,
        subject: str,
        body_html: str,
        body_text: str,
    ) -> bool:
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning("SMTP credentials not configured — skipping email")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
            msg["To"] = recipient
            msg.attach(MIMEText(body_text, "plain", "utf-8"))
            msg.attach(MIMEText(body_html, "html", "utf-8"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(
                    settings.SMTP_FROM or settings.SMTP_USER,
                    [recipient],
                    msg.as_string(),
                )

            logger.info(f"Email sent → {recipient}: {subject}")
            return True
        except Exception as exc:
            logger.error(f"SMTP send failed → {recipient}: {exc}")
            return False


# ---------------------------------------------------------------------------
# SendGrid
# ---------------------------------------------------------------------------

class SendGridNotifier(BaseNotifier):
    def send(
        self,
        recipient: str,
        subject: str,
        body_html: str,
        body_text: str,
    ) -> bool:
        if not settings.SENDGRID_API_KEY:
            logger.warning("SendGrid API key not configured")
            return False

        try:
            import sendgrid  # type: ignore
            from sendgrid.helpers.mail import Mail  # type: ignore

            sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
            message = Mail(
                from_email=settings.SMTP_FROM or "noreply@jobsaggregator.com",
                to_emails=recipient,
                subject=subject,
                plain_text_content=body_text,
                html_content=body_html,
            )
            response = sg.client.mail.send.post(request_body=message.get())
            logger.info(
                f"SendGrid sent → {recipient} (status {response.status_code})"
            )
            return True
        except Exception as exc:
            logger.error(f"SendGrid failed → {recipient}: {exc}")
            return False


# ---------------------------------------------------------------------------
# AWS SNS  (plug-in placeholder — fully wired, just needs credentials)
# ---------------------------------------------------------------------------

class SNSNotifier(BaseNotifier):
    def send(
        self,
        recipient: str,
        subject: str,
        body_html: str,
        body_text: str,
    ) -> bool:
        try:
            import boto3  # type: ignore

            sns = boto3.client(
                "sns",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            sns.publish(
                TopicArn=settings.SNS_TOPIC_ARN,
                Subject=subject[:100],
                Message=body_text,
            )
            logger.info(f"SNS notification published for {recipient}")
            return True
        except Exception as exc:
            logger.error(f"SNS failed: {exc}")
            return False


# ---------------------------------------------------------------------------
# Log-only (development fallback)
# ---------------------------------------------------------------------------

class LogOnlyNotifier(BaseNotifier):
    def send(
        self,
        recipient: str,
        subject: str,
        body_html: str,
        body_text: str,
    ) -> bool:
        logger.info(f"[LOG_ONLY] To={recipient} | Subject={subject}")
        logger.debug(f"[LOG_ONLY] Body preview: {body_text[:200]}")
        return True


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_notifier() -> BaseNotifier:
    backend = settings.NOTIFICATION_BACKEND.lower()
    mapping = {
        "smtp": SMTPNotifier,
        "sendgrid": SendGridNotifier,
        "sns": SNSNotifier,
    }
    cls = mapping.get(backend, LogOnlyNotifier)
    return cls()


# ---------------------------------------------------------------------------
# Email builder
# ---------------------------------------------------------------------------

def build_job_alert_email(
    keywords: List[str],
    jobs: List[Dict[str, Any]],
) -> tuple:
    """Return (body_html, body_text) for a job alert email."""
    keyword_str = ", ".join(keywords)
    jobs_html = ""
    jobs_text = ""

    for job in jobs:
        title = job.get("title", "Unknown")
        company = job.get("company") or "Unknown"
        location = job.get("location") or "Remote"
        url = job.get("url", "#")
        date = str(job.get("date_posted") or job.get("created_at") or "")[:10]
        tags = job.get("tags") or []
        tag_badges = "".join(
            f'<span style="background:#e0e7ff;color:#4338ca;padding:2px 8px;'
            f'border-radius:9999px;font-size:11px;margin-right:4px;">{t}</span>'
            for t in tags[:5]
        )

        jobs_html += f"""
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:12px 0;background:#fff;">
          <h3 style="margin:0 0 6px;">
            <a href="{url}" style="color:#4f46e5;text-decoration:none;font-size:16px;">{title}</a>
          </h3>
          <p style="margin:0 0 4px;color:#4a5568;font-size:14px;">
            <strong>{company}</strong> &bull; {location}
          </p>
          {f'<p style="margin:0 0 8px;color:#718096;font-size:12px;">{date}</p>' if date else ''}
          <div>{tag_badges}</div>
        </div>
        """

        jobs_text += f"• {title}\n  {company} | {location}\n  {url}\n\n"

    body_html = f"""<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
             max-width:600px;margin:0 auto;padding:20px;background:#f7fafc;">
  <div style="background:#4f46e5;color:white;padding:28px 32px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:22px;">New Job Matches</h1>
    <p style="margin:8px 0 0;opacity:0.85;font-size:14px;">Keywords: {keyword_str}</p>
  </div>
  <div style="background:#f7fafc;padding:24px 32px;border-radius:0 0 12px 12px;
              border:1px solid #e2e8f0;border-top:none;">
    <p style="color:#374151;">{len(jobs)} new job(s) matched your alert:</p>
    {jobs_html}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;">
      You're receiving this because you subscribed to job alerts.<br>
      Reply to this email or visit the platform to manage your subscriptions.
    </p>
  </div>
</body>
</html>"""

    body_text = (
        f"New Job Matches for: {keyword_str}\n"
        f"{'=' * 40}\n\n"
        f"{jobs_text}"
        f"{'=' * 40}\n"
        f"Manage your subscription at the platform.\n"
    )

    return body_html, body_text


# ---------------------------------------------------------------------------
# Main notification runner (called by scheduler)
# ---------------------------------------------------------------------------

def notify_subscribers(db_session) -> int:
    """Send alerts to all active subscribers. Returns number of emails sent."""
    from datetime import datetime
    from app.services.job_service import (
        get_active_subscriptions,
        get_matching_jobs_for_subscription,
    )

    notifier = get_notifier()
    subscriptions = get_active_subscriptions(db_session)
    sent = 0

    for sub in subscriptions:
        try:
            jobs = get_matching_jobs_for_subscription(
                db_session, sub, since=sub.last_notified_at
            )
            if not jobs:
                continue

            keywords = sub.get_keywords()
            jobs_data = [j.to_dict() for j in jobs]
            body_html, body_text = build_job_alert_email(keywords, jobs_data)
            subject = (
                f"[Job Alert] {len(jobs)} new match(es) for: "
                f"{', '.join(keywords[:3])}"
            )

            ok = notifier.send(
                recipient=sub.email,
                subject=subject,
                body_html=body_html,
                body_text=body_text,
            )
            if ok:
                sub.last_notified_at = datetime.utcnow()
                db_session.commit()
                sent += 1

        except Exception as exc:
            logger.error(f"Failed to notify {sub.email}: {exc}", exc_info=True)

    return sent
