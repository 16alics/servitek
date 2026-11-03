from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, selectinload,joinedload
from sqlalchemy import text,func, String,cast,Cast
from typing import List, Optional
from datetime import datetime, date, time
import random
import string
import os

import resend
# Puedes inicializarla directamente o con os.getenv
resend.api_key = os.getenv("RESEND_API_KEY")
import traceback
import models
from utils.email import enviar_correo_servicio
import schemas
import shutil
import os
import cloudinary.uploader
from schemas import DiagnosticoUpdateSchema
from database import get_db
from passlib.context import CryptContext
from pydantic import BaseModel
from security import get_current_user

class SolicitudServicio(BaseModel):
    email: str
    equipo: schemas.EquipoBase
    falla: str

# 👇 Declara el router una sola vez aquí
router = APIRouter(prefix="/api/servicios", tags=["servicios"])
# Configuración local de encriptación para evitar importaciones circulares
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str):
    return pwd_context.hash(password)
# --- 1. SOLICITAR SERVICIO ---
@router.post("/solicitar")
def solicitar_servicio_web(payload: schemas.SolicitudServicio, db: Session = Depends(get_db)):
    # 1. Buscar el usuario
    usuario = db.query(models.Usuario).filter(models.Usuario.email == payload.email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    # 2. Buscar el perfil de cliente
    cliente = db.query(models.Cliente).filter(models.Cliente.usuario_id == usuario.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Perfil de cliente no encontrado")
    
    # --- VALIDACIÓN: Límite de 2 solicitudes por día ---
    hoy_inicio = datetime.combine(date.today(), time.min)
    hoy_fin = datetime.combine(date.today(), time.max)
    
    solicitudes_hoy = db.query(models.Servicio)\
        .join(models.Equipo)\
        .filter(
            models.Equipo.cliente_id == cliente.id,
            models.Servicio.fecha_ingreso >= hoy_inicio,
            models.Servicio.fecha_ingreso <= hoy_fin
        ).count()
        
    if solicitudes_hoy >= 2:
        raise HTTPException(
            status_code=400, 
            detail="Has alcanzado el límite de 2 solicitudes web por hoy. Por favor, acérquese al establecimiento para ayudarle con sus pedidos adicionales."
        )

    try:
        # 1. Registrar el equipo
        nuevo_equipo = models.Equipo(
            cliente_id=cliente.id,
            marca=payload.equipo.marca,
            modelo=payload.equipo.modelo,
            numero_serie=payload.equipo.numero_serie,
            accesorios=payload.equipo.accesorios
        )
        db.add(nuevo_equipo)
        db.commit()
        db.refresh(nuevo_equipo)
        
        # 2. Registrar el servicio vinculado al equipo recién creado con los 20.00 de tarifa base
        nuevo_servicio = models.Servicio(
            codigo_servicio=f"OT-{int(datetime.now().timestamp()) % 10000:04d}",
            equipo_id=nuevo_equipo.id,
            descripcion_falla=payload.falla,
            estado="Pendiente",
            costo_estimado=20.00  # <--- Tarifa base fija de revisión asignada automáticamente
        )
        db.add(nuevo_servicio)
        db.commit()
        db.refresh(nuevo_servicio)
        
        # 3. Registrar el estado inicial en la tabla historial_estados
        historial_inicial = models.HistorialEstado(
            servicio_id=nuevo_servicio.id,
            estado_anterior=None,  # No hay estado anterior porque el ticket acaba de nacer
            estado_nuevo="Pendiente",
            fecha_cambio=datetime.now(),
            observaciones="Cliente registró el equipo exitosamente desde la web."
        )
        db.add(historial_inicial)
        db.commit()
        
        return {"mensaje": "Servicio registrado con éxito", "codigo_servicio": nuevo_servicio.codigo_servicio}

    except Exception as e:
        db.rollback()
        print(f"ERROR DETALLADO: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al registrar: {str(e)}")
        # ... (resto de tu código para registrar el servicio)   # ... resto de tu código de registro de servicio
@router.post("/directo")
def registrar_servicio_directo(
    payload: schemas.ServicioDirectoSchema, 
    db: Session = Depends(get_db)
):
    try:
        # 1. Asegurar valores limpios para el equipo
        nuevo_equipo = models.Equipo(
            cliente_id=int(payload.cliente_id),
            marca=str(payload.marca or "Genérico"),
            modelo=str(payload.modelo or "Genérico"),
            numero_serie=str(payload.numero_serie or ""),
            accesorios=str(payload.accesorios or "")
        )
        db.add(nuevo_equipo)
        db.commit()
        db.refresh(nuevo_equipo)
        
        # 2. Generar código de orden único
        codigo_unico = f"OT-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
        
        # 3. Crear el servicio usando un estado válido del Enum de la base de datos
        nuevo_servicio = models.Servicio(
            codigo_servicio=codigo_unico,
            equipo_id=nuevo_equipo.id,
            descripcion_falla=str(payload.descripcion_falla or "Sin descripción"),
            tecnico_id=int(payload.tecnico_id) if payload.tecnico_id else None,
            costo_estimado=float(payload.costo_estimado or 20.0),
            estado="Diagnostico"  # 👈 Valor exacto compatible con el Enum de Neon
        )
        db.add(nuevo_servicio)
        db.commit()
        db.refresh(nuevo_servicio)
        # 4. Registrar el estado inicial en la tabla historial_estados
        historial_inicial = models.HistorialEstado(
            servicio_id=nuevo_servicio.id,
            estado_anterior=None,  # No hay estado previo porque se está creando la orden aquí
            estado_nuevo="Diagnostico",
            observaciones="Orden creada/verificada directamente en recepción con técnico asignado."
        )
        db.add(historial_inicial)
        db.commit()
        
        return {
            "message": "Orden creada con éxito",
            "codigo_servicio": codigo_unico, # 👈 Clave plana lista para el frontend
            "servicio": {
                "id": nuevo_servicio.id,
                "codigo_servicio": nuevo_servicio.codigo_servicio,
                "estado": nuevo_servicio.estado,
                "costo_estimado": nuevo_servicio.costo_estimado
            }
        }
    except Exception as e:
        db.rollback()
        print(f"Error detallado en servicio directo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno al registrar la orden: {str(e)}")
# (Mantén el resto de tus endpoints aquí abajo: estadísticas, rastreo, etc.)
@router.get("/estadisticas/admin")
def get_estadisticas_admin(db: Session = Depends(get_db)):
    servicios = db.query(models.Servicio).all()
    
    # 1. Servicios por estado
    estado_counts = {}
    for s in servicios:
        st = s.estado.value if hasattr(s.estado, 'value') else str(s.estado)
        estado_counts[st] = estado_counts.get(st, 0) + 1
        
    # 2. Ingresos Totales (Costos finales de reparados/entregados)
    ingresos_totales = sum([s.costo_estimado or 0.0 for s in servicios if (s.estado.value if hasattr(s.estado, 'value') else str(s.estado)) in ['Reparado', 'Listo para entrega', 'Entregado']])
    
    # 3. Productividad (por tecnico)
    tecnicos = db.query(models.Tecnico).all()
    productividad = {}
    for t in tecnicos:
        asignados = [s for s in servicios if s.tecnico_id == t.id]
        completados = [s for s in asignados if (s.estado.value if hasattr(s.estado, 'value') else str(s.estado)) in ['Reparado', 'Listo para entrega', 'Entregado']]
        productividad[t.nombre_completo] = {
            "asignados": len(asignados),
            "completados": len(completados)
        }
        
    # 4. Trazabilidad
    trazabilidad = []
    for s in servicios:
        trazabilidad.append({
            "fecha": s.fecha_ingreso.strftime("%d/%m/%Y"),
            "codigo": s.codigo_servicio,
            "cliente": s.equipo.cliente.nombre_completo if s.equipo and s.equipo.cliente else "Desconocido",
            "tecnico": s.tecnico.nombre_completo if s.tecnico else "Sin Asignar",
            "estado": s.estado.value if hasattr(s.estado, 'value') else str(s.estado),
            "costo": s.costo_estimado or 0.0
        })

    return {
        "servicios_por_estado": estado_counts,
        "ingresos_totales": ingresos_totales,
        "productividad_tecnicos": productividad,
        "trazabilidad": trazabilidad
    }

# 2. Obtener servicios (para Admin o Técnico)
@router.get("/")
def listar_servicios(estado: str = None, db: Session = Depends(get_db)):
    try:
        # Consulta SQL robusta con todos los campos necesarios y JOINs completos
        sql_query = """
            SELECT 
                s.id AS orden_id,
                s.codigo_servicio,
                s.estado,
                s.descripcion_falla,
                s.fecha_ingreso,
                s.tecnico_id,
                s.costo_estimado,
                s.costo_final,
                e.marca,
                e.modelo,
                c.nombre_completo AS cliente_nombre,
                c.documento_identidad AS cliente_dni,
                u.email AS cliente_correo
            FROM servicios s
            LEFT JOIN equipos e ON s.equipo_id = e.id
            LEFT JOIN clientes c ON e.cliente_id = c.id
            LEFT JOIN usuarios u ON c.usuario_id = u.id
        """
        
        params = {}
        if estado and estado.strip():
            sql_query += " WHERE LOWER(TRIM(s.estado)) = LOWER(TRIM(:estado))"
            params["estado"] = estado.strip()
            
        result = db.execute(text(sql_query), params)
        rows = result.fetchall()
        
        resultado = []
        for row in rows:
            row_dict = row._asdict() if hasattr(row, "_asdict") else dict(row._mapping)
            estado_val = str(row_dict.get("estado") or "recibido")
            
            resultado.append({
                "id": row_dict.get("orden_id"),
                "codigo": row_dict.get("codigo_servicio") or f"OT-{row_dict.get('orden_id')}",
                "estado": estado_val,
                "tipo_equipo": "Equipo",
                "marca_modelo": f"{row_dict.get('marca') or ''} {row_dict.get('modelo') or ''}".strip() or "Sin modelo",
                "descripcion_falla": row_dict.get("descripcion_falla") or "Sin especificar",
                "fecha_ingreso": str(row_dict.get("fecha_ingreso") or ""),
                "tecnico_id": row_dict.get("tecnico_id"),
                "costo_estimado": row_dict.get("costo_estimado") or 0.0,
                "costo_final": row_dict.get("costo_final"),
                "cliente_nombre": row_dict.get("cliente_nombre") or "Sin nombre",
                "cliente_dni": row_dict.get("cliente_dni") or "",
                "cliente_correo": row_dict.get("cliente_correo") or "No registrado",
                "diagnostico": None,
                "equipo": {
                    "marca": row_dict.get("marca") or "N/A",
                    "modelo": row_dict.get("modelo") or "N/A",
                    "cliente_nombre": row_dict.get("cliente_nombre") or "N/A"
                }
            })
            
        return resultado
    except Exception as e:
        print("ERROR CRITICO EN LISTAR SERVICIOS:", str(e))
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")
# 3. Obtener servicios por cliente (para panel cliente)
@router.get("/cliente/{email}")
def obtener_servicios_cliente(email: str, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not usuario:
        return []
        
    cliente = db.query(models.Cliente).filter(models.Cliente.usuario_id == usuario.id).first()
    if not cliente:
        return []
    
    equipos = cliente.equipos
    resultado = []
    for eq in equipos:
        for s in eq.servicios:
            # Conversión segura del ENUM a texto plano
            estado_str = s.estado.value if hasattr(s.estado, "value") else str(s.estado)
            
            # 1. Consultar actividades asociadas a este servicio
            actividades_db = db.query(models.ServicioActividad).filter(models.ServicioActividad.servicio_id == s.id).all()
            lista_actividades = [{"descripcion": act.descripcion, "costo": act.costo or 0} for act in actividades_db]
            
            # 2. Consultar repuestos asociados a este servicio
            repuestos_db = db.query(models.ServicioRepuesto).filter(models.ServicioRepuesto.servicio_id == s.id).all()
            lista_repuestos = []
            for r in repuestos_db:
                r_info = db.query(models.Repuesto).filter(models.Repuesto.id == r.repuesto_id).first()
                lista_repuestos.append({
                    "descripcion": r_info.nombre if r_info else "Repuesto",
                    "cantidad": r.cantidad or 1,
                    "costo": r.precio_unitario or 0
                })
            
            resultado.append({
                "id": s.id,
                "codigo": s.codigo_servicio,
                "estado": estado_str,
                "descripcion_falla": s.descripcion_falla,
                "fecha_ingreso": s.fecha_ingreso,
                "costo_estimado": s.costo_estimado or 0,  # O s.costo si tu columna se llama así
                "costo_final": s.costo_final or 0,
                # Objeto estructurado del equipo
                "equipo": {
                    "marca": eq.marca,
                    "modelo": eq.modelo,
                    "numero_serie": eq.numero_serie or "No especificado",
                    "accesorios": eq.accesorios or "Ninguno"
                },
                "actividades": lista_actividades,
                "repuestos": lista_repuestos
            })
    return resultado


class AsignarTecnico(BaseModel):
    tecnico_id: int | None = None

@router.put("/{servicio_id}/asignar")
def asignar_tecnico(servicio_id: int, payload: schemas.RecepcionAsignarSchema, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
    # Asigna el técnico y actualiza el estado a "Recibido" automáticamente
    servicio.tecnico_id = payload.tecnico_id
    servicio.estado = payload.estado
    
    # Opcional: actualiza los datos si el recepcionista los editó en el formulario
    if payload.descripcion_falla:
        servicio.descripcion_falla = payload.descripcion_falla

    db.commit()
    db.refresh(servicio)
    
    return {"mensaje": "Técnico asignado y estado actualizado a Recibido exitosamente"}
# 4. Actualizar estado y diagnóstico por el técnico
@router.put("/{servicio_id}")
def actualizar_servicio(servicio_id: int, estado: str, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    servicio.estado = estado
    db.commit()
    return {"mensaje": "Estado actualizado"}


@router.get("/rastreo/{codigo}")
def rastrear_servicio_publico(codigo: str, db: Session = Depends(get_db)):
    # Consultamos directamente la tabla servicios utilizando text() con mapeo de diccionarios
    query = text("SELECT codigo_servicio, estado, descripcion_falla, fecha_ingreso FROM servicios WHERE codigo_servicio = :codigo")
    result = db.execute(query, {"codigo": codigo}).mappings().fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Código de servicio no encontrado")
    
    return {
        "codigo_servicio": result.get("codigo_servicio"),
        "estado": result.get("estado"),
        "descripcion_falla": result.get("descripcion_falla"),
        "fecha_ingreso": result.get("fecha_ingreso"),
        "nombre_cliente": "Cliente de Servitek" # Omitimos relaciones complejas y mostramos un texto genérico o lo que necesites
    }

@router.put("/{id}/cancelar")
def cancelar_servicio(id: int, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
    estados_permitidos = ["Pendiente", "Diagnostico", "recibido", "diagnostico"]
    
    if str(servicio.estado) not in estados_permitidos and servicio.estado not in [models.EstadoServicioEnum.Recibido, models.EstadoServicioEnum.Diagnostico]:
        raise HTTPException(status_code=400, detail="No es posible anular el ticket en este estado.")
        
    # 1. Guardar el estado anterior antes de modificarlo
    estado_anterior = str(servicio.estado)
    
    # 2. Actualizar el estado del servicio
    servicio.estado = "Cancelado" 

    # 3. Registrar el cambio en la tabla historial_estados
    nuevo_historial = models.HistorialEstado(
        servicio_id=servicio.id,
        estado_anterior=estado_anterior,
        estado_nuevo="Cancelado",
        observaciones="El cliente anuló el ticket de servicio."
    )
    db.add(nuevo_historial)

    # 4. Confirmar los cambios en la base de datos
    db.commit()
    db.refresh(servicio)
    
    return {"mensaje": "Servicio cancelado exitosamente"}
# --- 5. BUSCAR EQUIPOS PENDIENTES POR DNI PARA RECEPCIÓN ---
@router.get("/recepcion/pendientes/{dni}")
def obtener_pendientes_por_dni(dni: str, db: Session = Depends(get_db)):
    # Buscar equipos y servicios asociados al documento de identidad cuyo estado sea Pendiente
    equipos_pendientes = db.query(models.Servicio)\
        .join(models.Equipo)\
        .join(models.Cliente)\
        .filter(
            models.Cliente.documento_identidad == dni,
            models.Servicio.estado == "Pendiente"
        ).all()
        
    resultado = []
    for s in equipos_pendientes:
        resultado.append({
            "id": s.id,
            "codigo": s.codigo_servicio,
            "estado": s.estado.value if hasattr(s.estado, 'value') else str(s.estado),
            "descripcion_falla": s.descripcion_falla,
            "fecha_ingreso": s.fecha_ingreso,
            "marca": s.equipo.marca if s.equipo else "",
            "modelo": s.equipo.modelo if s.equipo else "",
            "numero_serie": s.equipo.numero_serie if s.equipo else "",
            "accesorios": s.equipo.accesorios if s.equipo else ""
        })
        
    return resultado
# --- BUSCAR CLIENTE POR DOCUMENTO PARA RECEPCIÓN ---
@router.get("/clientes/buscar/{documento}")
def buscar_cliente_por_documento(documento: str, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.documento_identidad == documento).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return {
        "id": cliente.id,
        "nombre": cliente.nombre_completo,
        "dni": cliente.documento_identidad,
        "telefono": cliente.telefono,
        "email": cliente.usuario.email if cliente.usuario else ""
    }
    
@router.post("/clientes/")
def crear_cliente_recepcion(payload: schemas.ClienteCreate, db: Session = Depends(get_db)):
    existe = db.query(models.Cliente).filter(models.Cliente.documento_identidad == payload.documento_identidad).first()
    if existe:
        raise HTTPException(status_code=400, detail="El cliente ya está registrado con este DNI")
    
    # 1. Generar una contraseña temporal automática (6 dígitos aleatorios)
    password_temporal = "".join(random.choices(string.digits, k=6))
    password_hash_encriptado = get_password_hash(password_temporal)

    # 2. Crear el usuario asociado
    email_cliente = payload.email if hasattr(payload, 'email') and payload.email else f"{payload.documento_identidad}@servitek.com"
    
    nuevo_usuario = models.Usuario(
        email=email_cliente,
        password_hash=password_hash_encriptado,
        rol="cliente",
        primer_ingreso=True
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # 3. Crear el perfil del cliente
    nuevo_cliente = models.Cliente(
        usuario_id=nuevo_usuario.id,
        nombre_completo=payload.nombre_completo,
        documento_identidad=payload.documento_identidad,
        telefono=payload.telefono,
        direccion=payload.direccion if hasattr(payload, 'direccion') else ""
    )
    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)

    # 4. 📧 ENVÍO DE CORREO PROFESIONAL VÍA API HTTP DE RESEND (Compatible con Vercel)
    asunto = "¡Bienvenido a Servitek - Credenciales de Acceso!"
    cuerpo_html = f"""
    <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">¡Bienvenido a Servitek! 🛠️</h2>
        <p style="color: #475569; font-size: 14px;">Hola <strong>{payload.nombre_completo}</strong>,</p>
        <p style="color: #475569; font-size: 14px;">Tu cuenta en Servitek ha sido creada exitosamente desde recepción. A continuación, tus credenciales de acceso temporal:</p>
        
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #cbd5e1;">
            <p style="margin: 5px 0; color: #334155; font-size: 13px;"><strong>Usuario (Email):</strong> {email_cliente}</p>
            <p style="margin: 5px 0; color: #334155; font-size: 13px;"><strong>Contraseña temporal:</strong> <span style="font-family: monospace; font-size: 16px; color: #2563eb; font-weight: bold;">{password_temporal}</span></p>
        </div>

        <p style="color: #475569; font-size: 14px;">Por favor, inicia sesión en la plataforma y cambia tu contraseña por seguridad.</p>
        
        <div style="margin: 25px 0; text-align: center;">
            <a href="https://servitek.com/login" style="background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Iniciar Sesión</a>
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Atentamente,<br>El equipo de Servitek</p>
    </div>
    """

    try:
        resend.api_key = os.getenv("RESEND_API_KEY", "re_tu_api_key_aqui")
        params = {
            "from": "Servitek <onboarding@resend.dev>",
            "to": [email_cliente],
            "subject": asunto,
            "html": cuerpo_html,
        }
        resend.Emails.send(params)
    except Exception as e:
        print(f"Error al enviar correo con Resend en recepción: {e}")

    return {
        "id": nuevo_cliente.id,
        "nombre": nuevo_cliente.nombre_completo,
        "dni": nuevo_cliente.documento_identidad,
        "telefono": nuevo_cliente.telefono,
        "email": email_cliente,
        "temp_password": password_temporal,
        "message": "Cliente registrado y credenciales enviadas por correo exitosamente."
    }
   
class EstadoUpdateRequest(BaseModel):
    estado: str
    
@router.put("/{servicio_id}/estado")
def actualizar_estado_servicio(servicio_id: int, datos: EstadoUpdateRequest, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    try:
        # 1. Capturar el estado anterior antes de modificarlo
        estado_anterior = str(servicio.estado)
        nuevo_estado = datos.estado

        # 2. Actualizar el estado del servicio
        servicio.estado = nuevo_estado

        estado_lower = nuevo_estado.lower().strip()
        if "entregado" in estado_lower or "finalizado" in estado_lower:
            if hasattr(servicio, "fecha_salida") and not servicio.fecha_salida:
                servicio.fecha_salida = datetime.utcnow()
                
        # 3. Registrar el cambio en la tabla de historial para la línea de tiempo
        nuevo_historial = models.HistorialEstado(
            servicio_id=servicio_id,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            observaciones=f"Actualización manual de estado a: {nuevo_estado}"
        )
        db.add(nuevo_historial)
        db.commit()
        db.refresh(servicio)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error en base de datos: {str(e)}")
    return {
        "mensaje": "Estado actualizado correctamente", 
        "estado": str(servicio.estado),
        "servicio": servicio  # O mapearlo explícitamente si usas schemas de Pydantic
    }


# 👇 Y LUEGO LO USAS EN TU ENDPOINT QUE RECIBE EL PUT
@router.put("/{servicio_id}/diagnostico")
def actualizar_diagnostico(
    servicio_id: int, 
    datos: DiagnosticoUpdateSchema,
    db: Session = Depends(get_db)
):
    print("--- DATOS RECIBIDOS EN DIAGNÓSTICO ---")
    print(f"Servicio ID: {servicio_id}")
    print(f"Observaciones: {datos.observaciones}")
    print(f"Repuestos recibidos: {datos.repuestos}")

    # 1. Verificar que el servicio exista
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    # 2. Buscar si ya existe un diagnóstico para este servicio
    diagnostico = db.query(models.Diagnostico).filter(models.Diagnostico.servicio_id == servicio_id).first()
    if not diagnostico:
        diagnostico = models.Diagnostico(servicio_id=servicio_id)
        db.add(diagnostico)

    # 3. Actualizar campos del diagnóstico de forma directa y limpia
    diagnostico.falla_encontrada = datos.falla_encontrada
    diagnostico.observaciones = datos.observaciones or ""

    if hasattr(diagnostico, 'actividades_realizadas') and datos.actividades_realizadas is not None:
        diagnostico.actividades_realizadas = datos.actividades_realizadas

    # 4. Actualizar costos y gestionar el cambio de estado a "Esperando aprobacion"
    if datos.costo_estimado is not None:
        servicio.costo_estimado = datos.costo_estimado
        servicio.costo_final = datos.costo_estimado

    # Capturamos el estado actual antes de cambiarlo para el historial
    estado_anterior = str(servicio.estado)
    nuevo_estado = "Esperando aprobacion"

    # Actualizamos el servicio al nuevo estado de espera de aprobación del cliente
    if servicio.estado != nuevo_estado:
        servicio.estado = nuevo_estado
        
        # 6. Registrar el cambio de estado en el historial solo si cambió
        nuevo_historial = models.HistorialEstado(
            servicio_id=servicio_id,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            observaciones=f"Diagnóstico registrado. Costo estimado: S/. {servicio.costo_estimado}"
        )
        db.add(nuevo_historial)
    # 5. Procesar los repuestos asignados de forma limpia y segura
    if datos.repuestos:
        print(f"Cantidad de repuestos a procesar: {len(datos.repuestos)}")
        for item in datos.repuestos:
            # Soporte dual: si llega como diccionario o como objeto Pydantic
            if isinstance(item, dict):
                rep_id = item.get("id")
                cantidad = item.get("cantidad", 1)
                costo_item = item.get("costo", 0)
            else:
                rep_id = getattr(item, "id", None)
                cantidad = getattr(item, "cantidad", 1)
                costo_item = getattr(item, "costo", 0)

            print(f"Procesando repuesto ID: {rep_id}, Cantidad: {cantidad}, Costo: {costo_item}")

            repuesto = db.query(models.Repuesto).filter(models.Repuesto.id == rep_id).first()
            if not repuesto:
                raise HTTPException(status_code=404, detail=f"Repuesto ID {rep_id} no encontrado en el inventario")

            if repuesto.stock < cantidad:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para: {repuesto.nombre or repuesto.id}")

            # Descontar stock del inventario
            repuesto.stock -= cantidad

            # Determinar el precio unitario de forma robusta
            precio_final = float(costo_item if costo_item and costo_item > 0 else (repuesto.precio or repuesto.costo or 0.0))

            # Registrar en la tabla intermedia (servicio_repuestos)
            nuevo_repuesto_servicio = models.ServicioRepuesto(
                servicio_id=servicio_id,
                repuesto_id=rep_id,
                cantidad=int(cantidad),
                precio_unitario=precio_final
            )
            db.add(nuevo_repuesto_servicio)
    else:
        print("⚠️ ATENCIÓN: 'datos.repuestos' llegó vacío o como None.")
    db.commit()
    db.refresh(servicio)
    db.refresh(diagnostico)

    return {
        "message": "Diagnóstico y repuestos procesados con éxito",
        "servicio_id": servicio.id,
        "estado": servicio.estado
    }
@router.post("/{servicio_id}/repuestos")
def asignar_repuesto_servicio(servicio_id: int, payload: schemas.RepuestoAsignarSchema, db: Session = Depends(get_db)):
    # 1. Verificar que el servicio exista
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
    # 2. Buscar el repuesto en el inventario
    repuesto = db.query(models.Repuesto).filter(models.Repuesto.id == payload.repuesto_id).first()
    if not repuesto:
        raise HTTPException(status_code=404, detail="Repuesto no encontrado")
        
    # 3. Validar si hay stock suficiente
    if repuesto.stock < payload.cantidad:
        raise HTTPException(status_code=400, detail="Stock insuficiente en el inventario")
        
    # 4. DESCONTAR EL STOCK
    repuesto.stock -= payload.cantidad

    # 5. Registrar el repuesto en el servicio
    nuevo_repuesto_servicio = models.ServicioRepuesto(
        servicio_id=servicio_id,
        repuesto_id=payload.repuesto_id,
        cantidad=payload.cantidad,
        precio_unitario=repuesto.precio if hasattr(repuesto, 'precio') else 0.0 # Opcional si guardas el precio unitario
    )
    db.add(nuevo_repuesto_servicio)
    db.commit()
    db.refresh(nuevo_repuesto_servicio)
    
    return nuevo_repuesto_servicio
@router.get("/{servicio_id}")
def obtener_servicio_por_id(servicio_id: int, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return servicio

@router.get("/{servicio_id}/actividades")
def listar_actividades(servicio_id: int, db: Session = Depends(get_db)):
    # Verificar que el servicio exista
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    actividades = db.query(models.ServicioActividad).filter(models.ServicioActividad.servicio_id == servicio_id).all()
    return actividades
# --- RUTA GET PARA OBTENER LAS ACTIVIDADES DE UN SERVICIO ---
@router.post("/{servicio_id}/actividades")
def agregar_actividad(
    servicio_id: int, 
    actividad: schemas.ActividadCreateSchema,  
    db: Session = Depends(get_db)
):
    # 1. Verificar que el servicio exista
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
    # 2. Crear y guardar la nueva actividad
    nueva_actividad = models.ServicioActividad(
        servicio_id=servicio_id,
        descripcion=actividad.descripcion,
        costo=actividad.costo
    )
    db.add(nueva_actividad)
    db.commit()
    db.refresh(nueva_actividad)
    
    return nueva_actividad
# --- 2. SUBIR Y REGISTRAR FOTO DE EVIDENCIA ---
@router.post("/{servicio_id}/fotos")
async def subir_foto(servicio_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    try:
        # Leemos los bytes del archivo enviado por el frontend
        contents = await file.read()
        
        # Subimos los bytes directamente a Cloudinary
        upload_result = cloudinary.uploader.upload(contents)
        url_publica = upload_result.get("secure_url")
        
        if not url_publica:
            raise HTTPException(status_code=500, detail="Error al subir la imagen a Cloudinary")

        # Guardamos la URL web en la base de datos Neon
        nueva_foto = models.ServicioFoto(
            servicio_id=servicio_id,
            url_foto=url_publica
        )
        db.add(nueva_foto)
        db.commit()
        db.refresh(nueva_foto)
        
        return {"message": "Foto subida correctamente", "url": url_publica}
        
    except Exception as e:
        db.rollback()
        print(f"Error detallado al subir foto: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/{servicio_id}/fotos")
async def listar_fotos_servicio(servicio_id: int, db: Session = Depends(get_db)):
    try:
        query = text("SELECT id, servicio_id, url_foto, fecha_subida FROM servicios_fotos WHERE servicio_id = :sid")
        fotos = db.execute(query, {"sid": servicio_id}).fetchall()
        
        resultado = [
            {
                "id": row.id,
                "servicio_id": row.servicio_id,
                "url_foto": row.url_foto,  # Asegúrate de que tu frontend lea esta clave ('url_foto' o 'url')
                "fecha_subida": str(row.fecha_subida)
            } 
            for row in fotos
        ]
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.delete("/actividades/{actividad_id}")
def eliminar_actividad(actividad_id: int, db: Session = Depends(get_db)):
    actividad = db.query(models.ServicioActividad).filter(models.ServicioActividad.id == actividad_id).first()
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    
    db.delete(actividad)
    db.commit()
    return {"message": "Actividad eliminada con éxito"}

@router.put("/{servicio_id}/rechazar")
def rechazar_servicio(servicio_id: int, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    # El cliente rechaza: el estado pasa a cancelado y el costo final se fija en la tarifa de revisión (20.0)
    servicio.estado = "Cancelado"  # O el valor correspondiente de tu enum
    servicio.costo_final = 20.0    # Tarifa base de revisión
    
    db.commit()
    db.refresh(servicio)
    
    return {"mensaje": "Cotización rechazada. Se aplicó la tarifa de revisión de S/. 20.00", "servicio": servicio}
@router.get("/mis-servicios")
def obtener_servicios_cliente(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    servicios = db.query(models.Servicio).filter(models.Servicio.usuario_id == current_user.id).all()
    
    resultado = []
    for s in servicios:
        # 1. Consultar actividades
        actividades_db = db.query(models.ServicioActividad).filter(models.ServicioActividad.servicio_id == s.id).all()
        lista_actividades = [{"descripcion": act.descripcion, "costo": act.costo or 0} for act in actividades_db]
        
        # 2. Consultar repuestos
        repuestos_db = db.query(models.ServicioRepuesto).filter(models.ServicioRepuesto.servicio_id == s.id).all()
        lista_repuestos = []
        for rep in repuestos_db:
            r_info = db.query(models.Repuesto).filter(models.Repuesto.id == rep.repuesto_id).first()
            nombre_repuesto = r_info.nombre if r_info else "Repuesto general"
            lista_repuestos.append({
                "descripcion": nombre_repuesto,
                "cantidad": rep.cantidad or 1,
                "costo": rep.precio_unitario or 0
            })

        # 3. Consultar equipo
        equipo_info = db.query(models.Equipo).filter(models.Equipo.id == s.equipo_id).first() if s.equipo_id else None

        # 4. Agregar al resultado con sus respectivas llaves
        resultado.append({
            "id": s.id,
            "codigo": s.codigo_servicio,
            "estado": s.estado,
            "descripcion_falla": s.descripcion_falla,
            "costo_estimado": s.costo_estimado or 0,
            "costo_final": s.costo_final or 0,
            "equipo": {
                "marca": equipo_info.marca if equipo_info else "No especificada",
                "modelo": equipo_info.modelo if equipo_info else "No especificado",
                "numero_serie": equipo_info.numero_serie if equipo_info else "No especificado",
                "accesorios": equipo_info.accesorios if equipo_info else "Ninguno"
            },
            "actividades": lista_actividades,
            "repuestos": lista_repuestos
        })
        
    return resultado  # 👈 Asegúrate de que esto esté fuera del for

# 1. Endpoint para OBTENER los repuestos asignados a un servicio (El que faltaba)
@router.get("/{servicio_id}/repuestos")
def listar_repuestos_servicio(servicio_id: int, db: Session = Depends(get_db)):
    # 1. Buscamos el servicio asegurándonos de cargar su relación
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    
    # 2. Mapeamos los repuestos desde la relación bidireccional
    resultado = []
    for sr in servicio.repuestos:
        if sr.repuesto:
            resultado.append({
                "id": sr.repuesto.id,
                "nombre": sr.repuesto.nombre,
                "cantidad": sr.cantidad,
                "precio_unitario": sr.precio_unitario
            })
    return resultado




@router.get("/{servicio_id}/diagnostico")
def obtener_diagnostico(servicio_id: int, db: Session = Depends(get_db)):
    diagnostico = db.query(models.Diagnostico).filter(models.Diagnostico.servicio_id == servicio_id).first()
    
    if not diagnostico:
        return {"falla_encontrada": "", "observaciones": ""}
        
    return diagnostico


def cambiar_estado_tecnico(db: Session, tecnico_id: int, activo: bool):
    # 1. Busca al técnico en su tabla
    tecnico = db.query(models.Tecnico).filter(models.Tecnico.id == tecnico_id).first()
    
    if not tecnico:
        raise HTTPException(status_code=404, detail="Técnico no encontrado")
    
    # 2. Actualiza el campo 'activo' en el usuario vinculado
    # Opción A (si tienes la relación configurada en SQLAlchemy como relationship):
    if tecnico.usuario:
        tecnico.usuario.activo = activo
    else:
        # Opción B (buscando directamente por el usuario_id del técnico):
        usuario = db.query(models.Usuario).filter(models.Usuario.id == tecnico.usuario_id).first()
        if usuario:
            usuario.activo = activo
        else:
            raise HTTPException(status_code=404, detail="Usuario asociado no encontrado")
    
    # 3. Guarda los cambios de forma persistente en Neon Tech
    db.commit()
    db.refresh(tecnico)
    
    return {"mensaje": "Estado actualizado correctamente"}

@router.put("/{id}/asignar-tecnico")
def asignar_tecnico_y_diagnostico(
    id: int, 
    payload: schemas.AsignarTecnicoSchema, # Aquí recibes el tecnico_id
    db: Session = Depends(get_db)
):
    # 1. Buscar el servicio existente
    servicio = db.query(models.Servicio).filter(models.Servicio.id == id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
    # 2. Guardar el estado actual como "estado_anterior" (que será "Pendiente")
    estado_anterior = str(servicio.estado)
    nuevo_estado = "Diagnostico"
    
    # 3. Actualizar los campos
    servicio.tecnico_id = payload.tecnico_id
    servicio.estado = nuevo_estado
    
    db.commit()
    db.refresh(servicio)
    
    # 4. Registrar el movimiento en el historial
    historial_cambio = models.HistorialEstado(
        servicio_id=servicio.id,
        estado_anterior=estado_anterior,  # Guardará "Pendiente"
        estado_nuevo=nuevo_estado,        # Guardará "Diagnostico"
        observaciones="Recepcionista validó los datos del cliente web y asignó un técnico."
    )
    db.add(historial_cambio)
    db.commit()
    
    return {"message": "Servicio validado correctamente", "servicio": servicio}



# 2. Endpoint para actualizar el estado del servicio (Cerrar y Entregar)
@router.put("/{servicio_id}/estado")
def actualizar_estado_servicio(servicio_id: int, body: dict, db: Session = Depends(get_db)):
    try:
        nuevo_estado = body.get("estado")
        servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
        
        if not servicio:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
            
        servicio.estado = nuevo_estado
        db.commit()
        db.refresh(servicio)
        
        return {"mensaje": "Estado actualizado con éxito", "estado": servicio.estado}
    except Exception as e:
        db.rollback()
        print("ERROR AL ACTUALIZAR ESTADO:", str(e))
        raise HTTPException(status_code=500, detail=str(e))