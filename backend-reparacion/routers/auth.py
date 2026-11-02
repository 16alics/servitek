from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from sqlalchemy.orm import Session
import models, schemas, security
from database import get_db
from utils.email import enviar_correo_servicio
from pydantic import BaseModel
from datetime import datetime, timedelta
import random
recovery_codes = {}
from passlib.context import CryptContext
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
def solicitar_recuperacion(datos: RecuperarClaveSchema, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == datos.email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="El correo electrónico no se encuentra registrado.")
    
    # Generar código de 6 dígitos
    codigo_recuperacion = random.randint(100000, 999999)
    
    # Guardar en memoria asociado al email
    recovery_codes[datos.email] = str(codigo_recuperacion)
    
    # Enviar correo simulado a la consola
    asunto = "Código de Restablecimiento de Contraseña - Servitek"
    cuerpo = f"""
    Has solicitado restablecer tu contraseña en Servitek.
    Tu código de verificación de 6 dígitos es: {codigo_recuperacion}
    Este código expira en 15 minutos.
    """
    enviar_correo_servicio(usuario.email, asunto, cuerpo)
    
    return {
        "message": "Se ha enviado un código de recuperación a su correo electrónico.",
        "codigo": codigo_recuperacion
    }

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