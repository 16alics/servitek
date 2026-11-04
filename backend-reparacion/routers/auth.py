

import os
import random
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import func
import models, schemas, security
from database import get_db
from utils.email import enviar_correo_servicio
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
recovery_codes = {}

router = APIRouter(prefix="/auth", tags=["Autenticación"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password) 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/login-cliente", response_model=schemas.Token)
def login_cliente(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    
    if not usuario or not usuario.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    password_valida = False
    
    # 🔄 Autocorrección de contraseña
    if usuario.password_hash == form_data.password:
        usuario.password_hash = security.get_password_hash(form_data.password)
        db.commit()
        db.refresh(usuario)
        password_valida = True
    else:
        try:
            password_valida = security.verify_password(form_data.password, usuario.password_hash)
        except Exception:
            password_valida = False

    if not password_valida:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 🔒 1. PRIMERO VALIDAMOS EL ROL: Si la contraseña es correcta pero es técnico/admin
    if usuario.rol != "cliente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Esta sección es única para clientes."
        )

    # 🛡️ 2. LUEGO VALIDAMOS SI LA CUENTA ESTÁ ACTIVA
    if hasattr(usuario, 'activo') and not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta se encuentra inhabilitada. Contacta al administrador."
        )
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": usuario.email, "rol": usuario.rol}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "primer_ingreso": usuario.primer_ingreso,
        "rol": usuario.rol
    }

# Diccionario en memoria para códigos de recuperación
recovery_codes = {}

class RecuperarClaveSchema(BaseModel):
    email: str

class ResetRequest(BaseModel):
    email: str
    codigo: int
    nueva_password: str


@router.post("/recuperar-clave")
def recuperar_clave(datos: RecuperarClaveSchema, db: Session = Depends(get_db)):
    
    # 1. Búsqueda insensible a mayúsculas y espacios
    usuario = db.query(models.Usuario).filter(
        func.lower(models.Usuario.email) == datos.email.lower().strip()
    ).first()
    
    # 2. Validación obligatoria si el correo no está registrado (devuelve 404)
    if not usuario:
        raise HTTPException(
            status_code=404, 
            detail="El correo electrónico no se encuentra registrado."
        )
    
    # 3. Generar código de 6 dígitos
    codigo_recuperacion = random.randint(100000, 999999)
    
    # Guardar en memoria asociado al email original de la BD
    recovery_codes[usuario.email] = str(codigo_recuperacion)
    
    # 4. Estructura del correo profesional en HTML
    cuerpo_html = f"""
    <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">Servitek - Recuperación</h2>
        <p style="color: #475569; font-size: 14px;">Has solicitado restablecer tu contraseña en la plataforma.</p>
        <p style="color: #475569; font-size: 14px;">Tu código de verificación de 6 dígitos es:</p>
        <div style="background-color: #2563eb; color: white; font-size: 24px; font-weight: bold; text-align: center; padding: 12px; border-radius: 8px; letter-spacing: 4px; margin: 20px 0;">
            {codigo_recuperacion}
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Este código expira en 15 minutos. Si no solicitaste esto, puedes ignorar este mensaje.</p>
    </div>
    """
    
    try:
        # 5. Configuración y envío mediante la API HTTP de Brevo
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = os.getenv("BREVO_API_KEY")
        
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        
        sender = {"name": "Servitek Soporte", "email": "aliciacarranzasalazar16@gmail.com"}  
        to = [{"email": usuario.email}]  
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            sender=sender,
            to=to,
            subject="Código de Restablecimiento de Contraseña - Servitek",
            html_content=cuerpo_html
        )
        
        api_response = api_instance.send_transac_email(send_smtp_email)
        print("Correo enviado exitosamente con Brevo:", api_response)
        
        return {"mensaje": "Código de recuperación enviado con éxito"}
        
    except ApiException as e:
        print(f"Error al enviar correo con Brevo: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"No se pudo enviar el correo de recuperación. Detalle: {str(e)}"
        )
# CAMBIADO A /reset-clave para que coincida exactamente con tu frontend
@router.post("/reset-clave")
def reset_clave(req: ResetRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == req.email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="El correo electrónico no se encuentra registrado.")
    
    # Validar el código de recuperación guardado
    codigo_guardado = recovery_codes.get(req.email)
    if not codigo_guardado or codigo_guardado != str(req.codigo):
        raise HTTPException(status_code=400, detail="Código inválido o expirado")
    
    # Actualizar la contraseña encriptándola correctamente y limpiando el código usado
    usuario.password_hash = security.get_password_hash(req.nueva_password)
    db.commit()
    
    # Eliminar el código ya utilizado
    recovery_codes.pop(req.email, None)
    
    return {"message": "Contraseña actualizada exitosamente."}

class PrimerIngresoRequest(BaseModel):
    email: str
    nueva_password: str

@router.post("/cambiar-clave-primer-ingreso")
def cambiar_clave_primer_ingreso(req: PrimerIngresoRequest, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == req.email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    usuario.password_hash = security.get_password_hash(req.nueva_password)
    usuario.primer_ingreso = False
    db.commit()
    
    return {"mensaje": "Clave actualizada correctamente, ya puede ingresar al sistema."}

#logintrabajador
@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    
    if not usuario or not security.verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 🔒 Bloquear el acceso si el usuario se encuentra inactivo
    if hasattr(usuario, "activo") and not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta se encuentra inactiva. Contacta al administrador."
        )
    
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": usuario.email, "rol": usuario.rol}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "primer_ingreso": usuario.primer_ingreso}

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if user is None:
        raise credentials_exception
    return user