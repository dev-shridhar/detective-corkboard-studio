import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service for sending system emails (like verification codes).
    Operates with an SMTP server or logs to the console as a fallback.
    """

    @staticmethod
    def send_verification_email(email: str, code: str) -> None:
        """
        Send a verification code email in a retro theme (both plain text and HTML).
        Can be run in a FastAPI BackgroundTask to prevent blocking responses.
        """
        subject = f"[CLASSIFIED] Detective Corkboard Studio - Verification Code"
        
        # Plain text retro theme fallback
        body_text = f"""============================================================
              DETECTIVE CORKBOARD STUDIO
                     [CLASSIFIED]
============================================================

AGENT FILE VERIFICATION PROTOCOL

To complete your agent dossier registration and access the
corkboard studio, you must verify your identity.

Your 6-digit verification code is:

                     >>>  {code}  <<<

This code is active for 15 minutes. If it expires, you can
request a new code from the dossier screen.

------------------------------------------------------------
DECODE YOUR PATH. SOLVE THE CLUES.
============================================================
"""

        # HTML retro theme
        body_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      background-color: #1e1e1e;
      margin: 0;
      padding: 40px 20px;
      font-family: 'Courier New', Courier, monospace;
    }}
    .container {{
      max-width: 550px;
      margin: 0 auto;
      background-color: #f4ecd8;
      border: 3px double #8a7a5f;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }}
    .header {{
      border-bottom: 2px dashed #2c3e50;
      padding-bottom: 20px;
      margin-bottom: 30px;
      text-align: center;
    }}
    .stamp {{
      border: 3px solid #c0392b;
      color: #c0392b;
      font-size: 14px;
      font-weight: bold;
      padding: 4px 15px;
      display: inline-block;
      transform: rotate(-3deg);
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 15px;
    }}
    .title {{
      font-size: 22px;
      color: #2c3e50;
      font-weight: bold;
      margin: 0;
      letter-spacing: 1px;
    }}
    .content {{
      color: #2c3e50;
      line-height: 1.6;
      font-size: 14px;
    }}
    .case-info {{
      background: rgba(0,0,0,0.03);
      border: 1px solid rgba(0,0,0,0.1);
      padding: 15px;
      margin: 20px 0;
      border-radius: 2px;
    }}
    .code-box {{
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      border: 2px dashed #c0392b;
      background: rgba(192, 57, 43, 0.05);
    }}
    .code {{
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #c0392b;
    }}
    .footer {{
      border-top: 1px dashed #2c3e50;
      margin-top: 30px;
      padding-top: 20px;
      font-size: 11px;
      color: #7f8c8d;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="stamp">CLASSIFIED</div>
      <h1 class="title">DETECTIVE CORKBOARD STUDIO</h1>
    </div>
    <div class="content">
      <p><strong>ATTN: AGENT IN TRAINING</strong></p>
      <p>A new dossier has been initialized under your credentials. To activate your access to the investigation corkboard studio and trace your connections, you must verify your account with the transmission key below.</p>
      
      <div class="case-info">
        <strong>CASE FILE DETAILS:</strong><br>
        &bull; TARGET: <code>{email}</code><br>
        &bull; STATUS: PENDING ACTIVATION<br>
        &bull; PROTOCOL: SECURE VERIFICATION CODE
      </div>
      
      <div class="code-box">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; color: #7f8c8d;">Verification Key</div>
        <div class="code">{code}</div>
      </div>
      
      <p>This verification key is valid for exactly 15 minutes. If expired, you must request a new key from the main terminal.</p>
    </div>
    <div class="footer">
      DECODE YOUR PATH. SOLVE THE CLUES.<br>
      &copy; 1984 Detective Corkboard Studio. All rights reserved.
    </div>
  </div>
</body>
</html>
"""

        # Check if SMTP is configured
        if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            logger.info("=== EMAIL CONSOLE FALLBACK (SMTP Credentials Missing) ===")
            logger.info(f"To: {email}")
            logger.info(f"Subject: {subject}")
            logger.info(f"\n{body_text}")
            logger.info("==========================================================")
            # Print to stdout directly to make it extremely visible in local uvicorn console logs
            print("\n" + "="*60)
            print(f"SMTP NOT CONFIGURED. SENT VERIFICATION EMAIL TO: {email}")
            print(f"VERIFICATION CODE IS: {code}")
            print("="*60 + "\n")
            return

        try:
            # Build email message
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SMTP_FROM or settings.SMTP_USERNAME
            msg["To"] = email
            msg["Subject"] = subject

            # Attach plain text and HTML bodies
            msg.attach(MIMEText(body_text, "plain"))
            msg.attach(MIMEText(body_html, "html"))

            # Connect to SMTP server (supports SSL on 465, TLS/starttls otherwise)
            if settings.SMTP_PORT == 465:
                server_ctx = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
            else:
                server_ctx = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)

            with server_ctx as server:
                if settings.SMTP_PORT != 465:
                    server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info(f"Verification email successfully sent to {email}")
        except Exception as e:
            logger.error(f"Failed to send verification email to {email}: {e}", exc_info=True)
            # Re-raise to ensure diagnostic scripts or tasks can see the error
            raise e
