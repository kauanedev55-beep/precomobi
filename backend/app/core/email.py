"""E-mails transacionais gratuitos pela API HTTPS da Brevo (sem SMTP)."""
import json
import logging
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from app.core.config import get_settings

logger = logging.getLogger("precomobi.email")

def configured() -> bool:
    s = get_settings()
    return bool(s.brevo_api_key and s.email_from and "@" in s.email_from)

def _send(to: str, name: str, subject: str, body: str) -> bool:
    s = get_settings()
    if not configured():
        logger.error("Brevo não configurado: não foi possível enviar %s", subject)
        return False
    # EMAIL_FROM é o endereço verificado na Brevo; não inserir senhas no frontend.
    sender = s.email_from.rsplit("<", 1)[-1].rstrip("> ")
    payload = {"sender": {"name": "PreçoMobi", "email": sender},
               "to": [{"email": to, "name": name}], "subject": subject,
               "textContent": body}
    req = Request("https://api.brevo.com/v3/smtp/email", data=json.dumps(payload).encode(),
                  headers={"api-key": s.brevo_api_key, "Content-Type": "application/json", "accept": "application/json"}, method="POST")
    try:
        with urlopen(req, timeout=12) as response:
            return 200 <= response.status < 300
    except (HTTPError, URLError, TimeoutError):
        logger.exception("Erro ao enviar e-mail transacional")
        return False

def send_verification_email(email: str, name: str, token: str) -> bool:
    url = get_settings().frontend_url.rstrip("/") + "/confirmar-email?token=" + token
    return _send(email, name, "Confirme seu e-mail — PreçoMobi",
                 f"Olá, {name.split()[0]}!\n\nConfirme seu e-mail para ativar sua conta no PreçoMobi:\n{url}\n\nO link vale por 24 horas. Se você não criou esta conta, ignore esta mensagem.")

def send_welcome_email(email: str, name: str) -> bool:
    return _send(email, name, "Boas-vindas ao PreçoMobi!",
                 f"Olá, {name.split()[0]}!\n\nSeu e-mail foi confirmado. Agora você pode montar listas, comparar preços e encontrar rotas até os mercados.\n\nBoas compras!\nEquipe PreçoMobi")
