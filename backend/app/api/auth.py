from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.api.deps import get_current_user
from app.core.email import configured, send_verification_email, send_welcome_email
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import User
from app.schemas.auth import TokenRead, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

class EmailRequest(BaseModel):
    email: str

class VerificationRequest(BaseModel):
    token: str

def issue_verification(user: User, db: Session, tasks: BackgroundTasks) -> None:
    token = token_urlsafe(32)
    user.verification_token_hash = sha256(token.encode()).hexdigest()
    user.verification_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    user.verification_sent_at = datetime.now(timezone.utc)
    db.commit()
    tasks.add_task(send_verification_email, user.email, user.name, token)

@router.post("/register", status_code=201)
def register(payload: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> dict:
    if not configured():
        raise HTTPException(503, detail="O cadastro por e-mail está temporariamente indisponível.")
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, detail="Já existe uma conta com este e-mail.")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), email_verified=False)
    db.add(user)
    db.flush()
    issue_verification(user, db, background_tasks)
    return {"message": "Cadastro criado. Confira seu e-mail para ativar a conta."}

@router.post("/verify")
def verify_email(payload: VerificationRequest, tasks: BackgroundTasks, db: Session = Depends(get_db)) -> dict:
    if len(payload.token) > 256 or len(payload.token) < 32:
        raise HTTPException(400, detail="Link de confirmação inválido.")
    token_hash = sha256(payload.token.encode()).hexdigest()
    user = db.scalar(select(User).where(User.verification_token_hash == token_hash))
    if not user or not user.verification_expires_at:
        raise HTTPException(400, detail="Link inválido ou já utilizado.")
    expires = user.verification_expires_at.replace(tzinfo=timezone.utc) if user.verification_expires_at.tzinfo is None else user.verification_expires_at
    if expires < datetime.now(timezone.utc):
        raise HTTPException(400, detail="Link expirado. Solicite outro e-mail de confirmação.")
    user.email_verified = True
    user.verification_token_hash = None
    user.verification_expires_at = None
    db.commit()
    tasks.add_task(send_welcome_email, user.email, user.name)
    return {"message": "E-mail confirmado! Você já pode entrar."}

@router.post("/resend-verification")
def resend(payload: EmailRequest, tasks: BackgroundTasks, db: Session = Depends(get_db)) -> dict:
    # Resposta genérica para evitar descoberta de contas existentes.
    message = {"message": "Se existir uma conta pendente, enviaremos outro link de confirmação."}
    if not configured():
        raise HTTPException(503, detail="Serviço de e-mail indisponível.")
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if not user or user.email_verified:
        return message
    if user.verification_sent_at:
        sent = user.verification_sent_at.replace(tzinfo=timezone.utc) if user.verification_sent_at.tzinfo is None else user.verification_sent_at
        if datetime.now(timezone.utc) - sent < timedelta(minutes=2):
            return message
    issue_verification(user, db, tasks)
    return message

@router.post("/login", response_model=TokenRead)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, detail="E-mail ou senha incorretos.")
    if not get_settings().demo_mode and (user.email == "demo@precomobi.local" or user.email.endswith("@demo.precomobi.local")):
        raise HTTPException(403, detail="Demonstração desativada.")
    if not user.email_verified:
        raise HTTPException(403, detail="Confirme seu e-mail antes de entrar. Confira sua caixa de entrada.")
    if not user.is_active:
        raise HTTPException(403, detail="Conta desativada.")
    return {"access_token": create_access_token(user.id), "user": user}

@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/demo-session", response_model=TokenRead)
def demo_session(db: Session = Depends(get_db)):
    if not get_settings().demo_mode:
        raise HTTPException(404, "Demonstração indisponível.")
    user = User(name="Visitante da demonstração", email=token_urlsafe(18) + "@demo.precomobi.local", password_hash=hash_password(token_urlsafe(32)), email_verified=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_access_token(user.id), "user": user}
