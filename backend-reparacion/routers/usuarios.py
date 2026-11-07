from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List,Optional
import models, schemas, security
from database import get_db
import random
import string
import os
import bcrypt

def get_password_hash(password: str) -> str:
    # 1. Codificar a bytes y truncar estrictamente a 72 bytes por límite de bcrypt
    password_bytes = password.encode('utf-8')[:72]
    # 2. Generar el salt y hashear directamente
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode('utf-8')[:72]
    return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
from utils.email import enviar_correo_servicio
from pydantic import BaseModel
from security import get_password_hash
from . import servicios
from passlib.context import CryptContext

import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
# --- ÚNICA DECLARACIÓN DE ROUTER PARA TODO EL ARCHIVO ---
router = APIRouter(prefix="/api/usuarios", tags=["Gestión de Usuarios"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
class RolSchema(BaseModel):
    rol: str

class EstadoSchema(BaseModel):
    activo: bool

class PasswordSchema(BaseModel):
    password: str = None
    nueva_password: str = None
    new_password: str = None


# -------------------------------------------------------------------------
# 1. GESTIÓN GENERAL DE USUARIOS
# -------------------------------------------------------------------------

@router.get("/")
def listar_usuarios(db: Session = Depends(get_db)):
    try:
        # Hacemos outerjoin con técnicos y clientes
        resultados = db.query(
            models.Usuario, 
            models.Tecnico.nombre_completo.label("nombre_tecnico"),
            models.Cliente.nombre_completo.label("nombre_cliente")
        ).outerjoin(
            models.Tecnico, models.Usuario.id == models.Tecnico.usuario_id
        ).outerjoin(
            models.Cliente, models.Usuario.id == models.Cliente.usuario_id
        ).all()
        
        lista_final = []
        for usuario, nombre_tecnico, nombre_cliente in resultados:
            # Obtenemos el valor real del rol de forma segura sin importar cómo lo devuelva SQLAlchemy
            rol_raw = usuario.rol
            rol_str = rol_raw.value.lower() if hasattr(rol_raw, "value") else str(rol_raw).lower()
            if "." in rol_str:
                rol_str = rol_str.split(".")[-1]

            nombre_final = "Sin nombre"
            
            # Filtramos según el rol real extraído
            if rol_str in ["tecnico", "recepcionista", "administrador", "admin"]:
                if nombre_tecnico and nombre_tecnico.strip():
                    nombre_final = nombre_tecnico.strip()
                else:
                    nombre_final = "Administrador" if "admin" in rol_str else "Sin nombre"
                    
            elif rol_str == "cliente":
                if nombre_cliente and nombre_cliente.strip():
                    nombre_final = nombre_cliente.strip()
                else:
                    nombre_final = "Cliente"
            else:
                nombre_final = "Sin nombre"

            lista_final.append({
                "id": usuario.id,
                "email": usuario.email,
                "correo": usuario.email,
                "rol": rol_str,
                "activo": usuario.activo,
                "nombre": nombre_final,
                "nombre_completo": nombre_final
            })
            
        return lista_final
        
    except Exception as e:
        print("ERROR EN LISTAR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/{usuario_id}/rol")
def cambiar_rol(usuario_id: int, data: RolSchema, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    usuario.rol = data.rol
    db.commit()
    return {"mensaje": "Rol actualizado con éxito"}


@router.put("/{usuario_id}/estado")
def cambiar_estado(usuario_id: int, data: EstadoSchema, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    usuario.activo = data.activo
    db.commit()
    return {"mensaje": "Estado actualizado con éxito"}


@router.put("/{usuario_id}/password")
def restablecer_password(usuario_id: int, data: PasswordSchema, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    password_a_usar = data.nueva_password or data.password or data.new_password
    if not password_a_usar:
        raise HTTPException(status_code=400, detail="No se proporcionó una contraseña válida.")

    usuario.password_hash = security.get_password_hash(password_a_usar)
    usuario.primer_ingreso = True  
    db.commit()
    db.refresh(usuario)
    
    return {"mensaje": "Contraseña restablecida con éxito"}


# -------------------------------------------------------------------------
# 2. CLIENTES (Aquí es donde responde /api/usuarios/clientes)
# -------------------------------------------------------------------------

@router.get("/clientes", response_model=List[schemas.ClienteResponse])
def get_clientes(db: Session = Depends(get_db)):
    return db.query(models.Cliente).all()


@router.get("/clientes/detallado")
def get_clientes_detallado(db: Session = Depends(get_db)):
    clientes = db.query(models.Cliente).all()
    res = []
    for c in clientes:
        equipos_data = []
        for eq in c.equipos:
            servs = [{"codigo": s.codigo_servicio, "estado": s.estado} for s in eq.servicios]
            equipos_data.append({
                "marca": eq.marca,
                "modelo": eq.modelo,
                "servicios": servs
            })
        res.append({
            "id": c.id,
            "nombre_completo": c.nombre_completo,
            "documento_identidad": c.documento_identidad,
            "telefono": c.telefono,
            "direccion": c.direccion,
            "email": c.usuario.email,
            "equipos": equipos_data
        })
    return res


@router.get("/clientes/dni/{dni}")
def buscar_cliente_dni(dni: str, db: Session = Depends(get_db)):
    c = db.query(models.Cliente).filter(models.Cliente.documento_identidad == dni).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
    equipos_data = []
    for eq in c.equipos:
        servs = [{"codigo": s.codigo_servicio, "estado": s.estado} for s in eq.servicios]
        equipos_data.append({
            "id": eq.id,
            "marca": eq.marca,
            "modelo": eq.modelo,
            "numero_serie": eq.numero_serie,
            "servicios": servs
        })
    return {
        "id": c.id,
        "nombre_completo": c.nombre_completo,
        "documento_identidad": c.documento_identidad,
        "telefono": c.telefono,
        "direccion": c.direccion,
        "email": c.usuario.email,
        "equipos": equipos_data
    }


@router.post("/cliente")
def crear_cliente_recepcion(payload: dict, db: Session = Depends(get_db)):
    datos_usuario = payload.get("usuario", {})
    datos_cliente = payload.get("cliente", {})
    
    email_cliente = datos_usuario.get("email")
    dni = datos_cliente.get("documento_identidad")
    nombre = datos_cliente.get("nombre_completo")
    telefono = datos_cliente.get("telefono")
    direccion = datos_cliente.get("direccion", "Sin dirección")

    # Validar si ya existe el DNI
    existe = db.query(models.Cliente).filter(models.Cliente.documento_identidad == dni).first()
    if existe:
        raise HTTPException(status_code=400, detail="El cliente ya está registrado con este DNI")

    # Validar si ya existe el correo
    existe_email = db.query(models.Usuario).filter(models.Usuario.email == email_cliente).first()
    if existe_email:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    # Generar contraseña temporal de 6 dígitos
    password_temporal = "".join(random.choices(string.digits, k=6))
    password_hash_encriptado = get_password_hash(password_temporal)

    # 1. Crear usuario
    nuevo_usuario = models.Usuario(
        email=email_cliente,
        password_hash=password_hash_encriptado,
        rol="cliente",
        primer_ingreso=True
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # 2. Crear cliente
    nuevo_cliente = models.Cliente(
        usuario_id=nuevo_usuario.id,
        nombre_completo=nombre,
        documento_identidad=dni,
        telefono=telefono,
        direccion=direccion
    )
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)

    # 3. 📧 Enviar correo profesional mediante la API de Brevo
    asunto = "¡Bienvenido a Servitek - Credenciales de Acceso!"
    cuerpo_html = f"""
    <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">¡Bienvenido a Servitek! 🛠️</h2>
        <p style="color: #475569; font-size: 14px;">Hola <strong>{nombre}</strong>,</p>
        <p style="color: #475569; font-size: 14px;">Tu cuenta en Servitek ha sido creada exitosamente desde recepción. A continuación, tus credenciales de acceso temporal:</p>
        
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #cbd5e1;">
            <p style="margin: 5px 0; color: #334155; font-size: 13px;"><strong>Usuario (Email):</strong> {email_cliente}</p>
            <p style="margin: 5px 0; color: #334155; font-size: 13px;"><strong>Contraseña temporal:</strong> <span style="font-family: monospace; font-size: 16px; color: #2563eb; font-weight: bold;">{password_temporal}</span></p>
        </div>

        <p style="color: #475569; font-size: 14px;">Por favor, inicia sesión en la plataforma y cambia tu contraseña por seguridad.</p>
        
        <div style="margin: 25px 0; text-align: center;">
            <a href="https://servitek.vercel.app/login" style="background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Iniciar Sesión</a>
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Atentamente,<br>El equipo de Servitek</p>
    </div>
    """

    try:
        import sib_api_v3_sdk
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = os.getenv("BREVO_API_KEY")

        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        sender = {"name": "Servitek Soporte", "email": "aliciacarranzasalazar16@gmail.com"}
        to = [{"email": email_cliente}]
        
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=to,
            sender=sender,
            subject=asunto,
            html_content=cuerpo_html
        )
        api_instance.send_transac_email(send_smtp_email)
        print("✅ CORREO ENVIADO EXITOSAMENTE CON BREVO DESDE RECEPCIÓN")
    except Exception as e:
        print(f"❌ Error al enviar correo con Brevo desde recepción: {e}")
        import traceback
        traceback.print_exc()

    return {
        "id": nuevo_cliente.id,
        "nombre": nuevo_cliente.nombre_completo,
        "dni": nuevo_cliente.documento_identidad,
        "telefono": nuevo_cliente.telefono,
        "email": email_cliente,
        "temp_password": password_temporal,
        "message": "Cliente registrado y credenciales enviadas por correo exitosamente."
    }
@router.get("/perfil/{email}")
def obtener_perfil_cliente(email: str, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    cliente = db.query(models.Cliente).filter(models.Cliente.usuario_id == usuario.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")
    
    return {
        "nombre_completo": cliente.nombre_completo,
        "telefono": cliente.telefono,
        "direccion": cliente.direccion or ""
    }


@router.put("/perfil/{email}")
def actualizar_perfil_cliente(email: str, datos: schemas.ClienteUpdate, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    cliente = db.query(models.Cliente).filter(models.Cliente.usuario_id == usuario.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")
    
    cliente.nombre_completo = datos.nombre_completo
    cliente.telefono = datos.telefono
    cliente.direccion = datos.direccion
    db.commit()
    
    return {"message": "Perfil actualizado exitosamente"}


# -------------------------------------------------------------------------
# 3. TÉCNICOS
# -------------------------------------------------------------------------

@router.get("/tecnicos")
def listar_tecnicos(db: Session = Depends(get_db)):
    tecnicos = db.query(models.Tecnico).join(models.Usuario).filter(
        ~models.Tecnico.especialidad.ilike("%recepcion%")
    ).all()
    return [
        {
            "id": t.id,  
            "usuario_id": t.usuario_id, 
            "nombre": t.nombre_completo, 
            "especialidad": t.especialidad,
            "activo": t.usuario.activo 
        }
        for t in tecnicos
    ]

@router.put("/tecnico/{id}/inhabilitar")
def inhabilitar_tecnico(id: int, db: Session = Depends(get_db)):
    servicios.cambiar_estado_tecnico(db, id, activo=False)
    return {"mensaje": "Técnico inhabilitado correctamente"}

@router.put("/tecnico/{id}/activar")
def activar_tecnico(id: int, db: Session = Depends(get_db)):
    servicios.cambiar_estado_tecnico(db, id, activo=True)
    return {"mensaje": "Técnico activado correctamente"}

@router.post("/tecnico", response_model=schemas.TecnicoResponse)
def crear_tecnico(usuario: schemas.UsuarioCreate, tecnico: schemas.TecnicoCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    hashed_password = security.get_password_hash(usuario.password)
    nuevo_usuario = models.Usuario(email=usuario.email, password_hash=hashed_password, rol="tecnico")
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    nuevo_tecnico = models.Tecnico(
        usuario_id=nuevo_usuario.id,
        nombre_completo=tecnico.nombre_completo,
        especialidad=tecnico.especialidad
    )
    db.add(nuevo_tecnico)
    db.commit()
    db.refresh(nuevo_tecnico)
    
    return {
        "id": nuevo_tecnico.id,
        "nombre_completo": nuevo_tecnico.nombre_completo,
        "especialidad": nuevo_tecnico.especialidad,
        "email": usuario.email,  # o desde donde lo guardes
        "activo": True
    }


@router.put("/tecnico/{tecnico_id}")
def actualizar_tecnico(tecnico_id: int, tecnico_data: dict, db: Session = Depends(get_db)):
    tecnico = db.query(models.Tecnico).filter(models.Tecnico.id == tecnico_id).first()
    if not tecnico:
        raise HTTPException(status_code=404, detail="Técnico no encontrado")
        
    if "nombre_completo" in tecnico_data:
        tecnico.nombre_completo = tecnico_data["nombre_completo"]
    if "especialidad" in tecnico_data:
        tecnico.especialidad = tecnico_data["especialidad"]
        
    db.commit()
    db.refresh(tecnico)
    return {"mensaje": "Técnico actualizado con éxito", "tecnico": tecnico}


@router.delete("/tecnico/{tecnico_id}")
def eliminar_tecnico(tecnico_id: int, db: Session = Depends(get_db)):
    tecnico = db.query(models.Tecnico).filter(models.Tecnico.id == tecnico_id).first()
    if not tecnico:
        raise HTTPException(status_code=404, detail="Técnico no encontrado")
    
    usuario = db.query(models.Usuario).filter(models.Usuario.id == tecnico.usuario_id).first()
    if usuario:
        usuario.activo = False
        db.commit()
        return {"mensaje": "Técnico inhabilitado correctamente"}
    else:
        raise HTTPException(status_code=404, detail="Usuario del técnico no encontrado")
    
@router.post("/registrar")
def registrar_cliente_web(payload: dict, db: Session = Depends(get_db)):
    datos_usuario = payload.get("usuario", {})
    datos_cliente = payload.get("cliente", {})
    
    email_cliente = datos_usuario.get("email")
    password_plana = datos_usuario.get("password") # Contraseña que el cliente tipeó en la web
    rol = datos_usuario.get("rol", "cliente")
    
    dni = datos_cliente.get("documento_identidad")
    nombre = datos_cliente.get("nombre_completo")
    telefono = datos_cliente.get("telefono")
    direccion = datos_cliente.get("direccion", "")

    # Validaciones de duplicados...
    existe_dni = db.query(models.Cliente).filter(models.Cliente.documento_identidad == dni).first()
    if existe_dni:
        raise HTTPException(status_code=400, detail="El cliente ya está registrado con este DNI")

    existe_email = db.query(models.Usuario).filter(models.Usuario.email == email_cliente).first()
    if existe_email:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Hashear la contraseña de la web
    hashed_password = security.get_password_hash(password_plana)

    # Crear usuario
    nuevo_usuario = models.Usuario(
        email=email_cliente,
        password_hash=hashed_password,
        rol=rol,
        primer_ingreso=False
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # Crear cliente
    nuevo_cliente = models.Cliente(
        usuario_id=nuevo_usuario.id,
        nombre_completo=nombre,
        documento_identidad=dni,
        telefono=telefono,
        direccion=direccion
    )
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)

    # 📧 CORREO DE BIENVENIDA PROFESIONAL VÍA API DE BREVO
    print("--- INICIANDO PROCESO DE ENVÍO DE CORREO DE BIENVENIDA (WEB) ---")
    asunto = "¡Bienvenido a Servitek!"
    cuerpo_html = f"""
    <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">¡Bienvenido a Servitek! 🚀</h2>
        <p style="color: #475569; font-size: 14px;">Hola <strong>{nombre}</strong>,</p>
        <p style="color: #475569; font-size: 14px;">Gracias por registrarte en Servitek. Nos alegra mucho tenerte con nosotros.</p>
        <p style="color: #475569; font-size: 14px;">Ya puedes iniciar sesión con tu correo y contraseña para gestionar tus equipos y rastrear tus reparaciones en tiempo real.</p>
        <div style="margin: 25px 0; text-align: center;">
            <a href="https://servitek.vercel.app/login" style="background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Iniciar Sesión</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Atentamente,<br>El equipo de Servitek</p>
    </div>
    """
    try:
        import sib_api_v3_sdk
        from sib_api_v3_sdk.rest import ApiException

        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = os.getenv("BREVO_API_KEY")

        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        
        sender = {"name": "Servitek Soporte", "email": "aliciacarranzasalazar16@gmail.com"}
        to = [{"email": email_cliente}]
        
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=to,
            sender=sender,
            subject=asunto,
            html_content=cuerpo_html
        )

        api_response = api_instance.send_transac_email(send_smtp_email)
        print("✅ CORREO DE BIENVENIDA ENVIADO CON ÉXITO:", api_response)
    except Exception as e:
        print("❌ ERROR CRÍTICO AL ENVIAR CORREO CON BREVO:")
        import traceback
        traceback.print_exc()

    return {
        "mensaje": "Usuario registrado exitosamente",
        "email": email_cliente
    }
class UsuarioGeneralCreate(BaseModel):
    nombre: str
    correo: str
    password: str
    rol: str  # Recibirá "admin", "recepcionista" o "tecnico"
    especialidad: Optional[str] = None # Opcional si es técnico
 
def hash_password(password: str):
    return pwd_context.hash(password)        
@router.post("/")
def registrar_usuario_general(payload: UsuarioGeneralCreate, db: Session = Depends(get_db)):
    try:
        # Normalización estricta del rol para evitar conflictos con el ENUM de Postgres
        rol_raw = payload.rol.lower().strip()
        if "tecnico" in rol_raw or "técnico" in rol_raw:
            rol_limpio = "tecnico"
        elif "recepcion" in rol_raw:
            rol_limpio = "recepcionista"
        elif "admin" in rol_raw:
            rol_limpio = "admin"
        else:
            rol_limpio = rol_raw
        
        # Validar si el correo ya está registrado
        correo_existente = db.query(models.Usuario).filter(models.Usuario.email == payload.correo).first()
        if correo_existente:
            raise HTTPException(
                status_code=400, 
                detail="El correo electrónico ya se encuentra registrado en el sistema."
            )

        # Truncar contraseña a 72 bytes por seguridad de bcrypt
        password_segura = payload.password[:72] if payload.password else "Temporal123"

        # Crear el usuario
        nuevo_usuario = models.Usuario(
            email=payload.correo,
            password_hash=get_password_hash(password_segura),
            rol=rol_limpio, # 👈 Usamos el rol ya normalizado ("tecnico", "recepcionista", o "admin")
            activo=True,
            primer_ingreso=True
        )
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)

        if rol_limpio in ["tecnico", "recepcionista"]:
            nuevo_tecnico = models.Tecnico(
                usuario_id=nuevo_usuario.id,
                nombre_completo=payload.nombre,
                especialidad=payload.especialidad if payload.especialidad and payload.especialidad.strip() else rol_limpio
            )
            db.add(nuevo_tecnico)
            db.commit()

        return {"message": "Personal registrado con éxito", "usuario": nuevo_usuario}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        print("ERROR EN BD:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/admin/reset-password-automatico/{usuario_id}")
def resetear_password_automatico(
    usuario_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.Usuario = Depends(security.get_current_user)
):
    # Validar que el usuario autenticado sea administrador
    if getattr(current_user, 'rol', None) != 'admin':
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")

    # 1. Verificar que el usuario exista
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 2. Generar una contraseña temporal aleatoria y segura de 8 caracteres
    caracteres = string.ascii_letters + string.digits
    password_temporal = ''.join(random.choice(caracteres) for _ in range(8))

    # 3. Hashear la clave temporal y activar la bandera de primer ingreso obligatoria
    usuario.password_hash = security.get_password_hash(password_temporal)
    usuario.primer_ingreso = True 
    db.commit()

    # 4. Enviar el correo de credenciales temporales vía Brevo
    email_destino = usuario.email
    asunto = "Restablecimiento de Credenciales - Servitek"
    cuerpo_html = f"""
    <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">Restablecimiento de Credenciales 🔑</h2>
        <p style="color: #475569; font-size: 14px;">Hola,</p>
        <p style="color: #475569; font-size: 14px;">Un administrador ha generado una nueva contraseña temporal para tu cuenta en Servitek.</p>
        <div style="background-color: #e2e8f0; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 18px; font-weight: bold; color: #1e293b; letter-spacing: 2px;">{password_temporal}</span>
        </div>
        <p style="color: #475569; font-size: 14px;">Por medidas de seguridad institucionales, al iniciar sesión se te pedirá cambiar esta contraseña obligatoriamente por una nueva (con doble validación).</p>
        <div style="margin: 25px 0; text-align: center;">
            <a href="https://servitek.vercel.app/login" style="background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Ir a Servitek</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Atentamente,<br>El equipo de Servitek</p>
    </div>
    """

    try:
        import os
        import sib_api_v3_sdk
        
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = os.getenv("BREVO_API_KEY")
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        
        sender = {"name": "Servitek Seguridad", "email": "aliciacarranzasalazar16@gmail.com"}
        to = [{"email": email_destino}]
        
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=to,
            sender=sender,
            subject=asunto,
            html_content=cuerpo_html
        )
        api_instance.send_transac_email(send_smtp_email)
        print("✅ Clave temporal enviada con éxito a:", email_destino)
    except Exception as e:
        print("❌ Error al enviar correo automático de reseteo:", e)
        raise HTTPException(status_code=500, detail="Error al enviar el correo con la clave temporal")

    return {"mensaje": f"Clave temporal generada y enviada exitosamente a {email_destino}"}