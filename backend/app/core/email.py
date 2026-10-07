"""Envio de e-mails do PreçoMobi.

Sem serviço pago e sem SDK de terceiros: usa smtplib, que já vem no Python,
conversando direto com um servidor SMTP (por exemplo o do Gmail, gratuito).

Se app.core.config não tiver smtp_host configurado, send_welcome_email() não
faz nada — o cadastro do usuário continua funcionando normalmente. Isso é
proposital: o e-mail é um "extra", nunca pode derrubar o cadastro.
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger("precomobi.email")


def send_welcome_email(to_email: str, name: str) -> bool:
    """Envia o e-mail de boas-vindas. Devolve True se enviou, False se pulou/falhou.
    Nunca lança exceção — um problema no e-mail não pode impedir o cadastro."""
    settings = get_settings()
    if not settings.smtp_host:
        logger.info("SMTP não configurado; pulando e-mail de boas-vindas para %s", to_email)
        return False

    message = EmailMessage()
    message["Subject"] = "Bem-vindo(a) ao PreçoMobi!"
    message["From"] = settings.email_from
    message["To"] = to_email
    first_name = name.strip().split(" ")[0] if name.strip() else "tudo bem"
    message.set_content(
        f"Oi, {first_name}!\n\n"
        "Sua conta no PreçoMobi foi criada com sucesso. Agora você já pode montar listas de "
        "compras, comparar preços entre os mercados e contribuir com os preços que encontrar.\n\n"
        "Este é um projeto acadêmico, então os preços marcados como \"Dados de desenvolvimento\" "
        "são de teste, não valores reais de supermercado.\n\n"
        "— Equipe PreçoMobi"
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
        return True
    except Exception:
        logger.exception("Falha ao enviar e-mail de boas-vindas para %s", to_email)
        return False
