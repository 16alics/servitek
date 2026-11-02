from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List,Optional
import models, schemas, security
from database import get_db
import random
import string
from utils.email import enviar_correo_servicio
from pydantic import BaseModel
from security import get_password_hash
from . import servicios
from passlib.context import CryptContext
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

    # 1. Generar contraseña temporal de 6 dígitos
    password_temporal = "".join(random.choices(string.digits, k=6))
    password_hash_encriptado = get_password_hash(password_temporal)

    # 2. Crear usuario
    nuevo_usuario = models.Usuario(
        email=email_cliente,
        password_hash=password_hash_encriptado,
        rol="cliente",
        primer_ingreso=True
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # 3. Crear cliente
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

    # 4. Enviar correo SMTP real con Gmail
    asunto = "¡Bienvenido a Servitek - Credenciales de Acceso!"
    cuerpo = f"""Hola {nombre},

Tu cuenta en Servitek ha sido creada exitosamente desde recepción.
Tus credenciales de acceso temporal son:

- Usuario (Email): {email_cliente}
- Contraseña temporal: {password_temporal}

Por favor, inicia sesión en la plataforma y cambia tu contraseña por seguridad."""

    enviar_correo_servicio(email_cliente, asunto, cuerpo)

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

    # Correo de bienvenida limpio (exclusivo para la web)
    asunto = "¡Bienvenido a Servitek!"
    cuerpo = f"""Hola {nombre},

Gracias por registrarte en Servitek. Nos alegra mucho tenerte con nosotros.
Ya puedes iniciar sesión con tu correo y contraseña para gestionar tus equipos y rastrear tus reparaciones.

Atentamente,
El equipo de Servitek"""

    try:
        enviar_correo_servicio(email_cliente, asunto, cuerpo)
    except Exception as e:
        print(f"Error al enviar correo de bienvenida: {e}")

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
        rol_limpio = payload.rol.lower()
        
        # 1. Crear el usuario en la tabla general de usuarios con su rol correspondiente ('tecnico', 'recepcionista', 'admin')
        nuevo_usuario = models.Usuario(
            email=payload.correo,
            password_hash=pwd_context.hash(payload.password),
            rol=rol_limpio,
            activo=True,
            primer_ingreso=True
        )
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)

        # 2. Si el rol requiere un registro en la tabla de técnicos, lo guardamos ahí
        # (Si es técnico o recepcionista y quieres que usen la misma tabla de personal/técnicos)
        if rol_limpio in ["tecnico", "recepcionista"]:
            nuevo_tecnico = models.Tecnico(
                usuario_id=nuevo_usuario.id,
                nombre_completo=payload.nombre,
                especialidad=payload.especialidad if payload.especialidad and payload.especialidad.strip() else rol_limpio
            )
            db.add(nuevo_tecnico)
            db.commit()

        return {"message": "Personal registrado con éxito", "usuario": nuevo_usuario}
        
    except Exception as e:
        db.rollback()
        print("ERROR EN BD:", str(e))
        raise HTTPException(status_code=500, detail=str(e))