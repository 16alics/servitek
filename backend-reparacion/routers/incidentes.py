from fastapi import APIRouter, Depends, HTTPException,BackgroundTasks,Response
from sqlalchemy.orm import Session
import os
import traceback
from datetime import datetime, timedelta, timezone
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user
router = APIRouter(prefix="/api/incidentes", tags=["Gestión de Incidentes y Garantías"])

# Mapeo de tiempos SLA según la matriz de priorización[cite: 12]
SLA_HORAS = {
    "P1": 1,   # Garantía sin Costo (< 1 hora)[cite: 12]
    "P2": 4,   # Software / Portal Web (< 4 horas)[cite: 12]
    "P3": 8,   # Acceso y Cuentas (< 8 horas)[cite: 12]
    "P4": 24   # Trazabilidad y QR (< 24 horas)[cite: 12]
}

# 1. Buscar cliente por DNI y listar equipos entregados (Flujo Recepcionista Nivel 1)[cite: 11, 12]
@router.get("/recepcion/equipos-por-dni/{dni}")
def obtener_equipos_por_dni(dni: str, db: Session = Depends(get_db)):
    cliente = db.query(models.Usuario).filter(models.Usuario.dni == dni, models.Usuario.rol == "cliente").first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado con ese DNI")
    
    ordenes_entregadas = db.query(models.OrdenServicio).filter(
        models.OrdenServicio.cliente_id == cliente.id,
        models.OrdenServicio.estado == "Entregado"
    ).all()
    
    return {"cliente": {"id": cliente.id, "nombre": cliente.nombre, "dni": cliente.dni}, "equipos": ordenes_entregadas}



def _garantia_vigente(servicio: models.Servicio) -> bool:
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    if servicio.fecha_vencimiento_garantia is not None:
        return ahora <= servicio.fecha_vencimiento_garantia
    if servicio.fecha_salida is not None and servicio.garantia_dias and servicio.garantia_dias > 0:
        return ahora <= (servicio.fecha_salida + timedelta(days=servicio.garantia_dias))
    return False
@router.post("/", response_model=schemas.IncidenteResponse)
def registrar_incidente(
    datos: schemas.IncidenteCreate,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    id_objetivo = datos.servicio_id or datos.orden_id
    if not id_objetivo:
        raise HTTPException(
            status_code=422,
            detail="Falta el identificador del servicio u orden.",
        )

    servicio = db.query(models.Servicio).filter(models.Servicio.id == id_objetivo).first()
    if not servicio:
        raise HTTPException(
            status_code=404,
            detail=f"El servicio con ID '{id_objetivo}' no existe en la base de datos.",
        )

    vigente = _garantia_vigente(servicio)
    es_garantia_final = vigente if datos.es_garantia is None else (bool(datos.es_garantia) and vigente)

    if datos.es_garantia and not vigente:
        raise HTTPException(
            status_code=400,
            detail="El servicio no cuenta con garantía vigente.",
        )

    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    if es_garantia_final:
        prioridad_final = "P1"
        costo_cero_final = True
        sla_limite = ahora + timedelta(hours=1)  # SLA crítico < 1 hora para garantía sin costo[cite: 6]
    else:
        prioridad_final = datos.prioridad or "P3"
        costo_cero_final = False
        sla_limite = ahora + timedelta(hours=datos.sla_horas or 8)

    nuevo_incidente = models.Incidente(
        servicio_id=servicio.id,
        usuario_id=datos.usuario_id,
        descripcion=datos.descripcion,
        canal_reporte=datos.canal_reporte or "Web",
        categoria=datos.categoria or "Hardware",
        prioridad=prioridad_final,
        sla_limite=sla_limite,
        estado="Registrado",
        solucion_remota=bool(datos.solucion_remota),
        es_garantia=es_garantia_final,
        costo_cero=costo_cero_final,
    )

    db.add(nuevo_incidente)
    db.commit()
    db.refresh(nuevo_incidente)

    alerta_msg = f"Se registró el incidente #{nuevo_incidente.id} correctamente."
    response.headers["X-Alerta"] = alerta_msg
    print(f">>> [ALERTA] {alerta_msg} | servicio_id={nuevo_incidente.servicio_id} | prioridad={nuevo_incidente.prioridad}")

    print(">>> [DEBUG] Entrando al bloque de envío de correo en incidentes...")
    cliente = getattr(getattr(servicio, "equipo", None), "cliente", None)
    correo_destino = getattr(cliente, "email", None) or getattr(cliente, "correo", None)

    asunto = f"Incidente #{nuevo_incidente.id} Registrado - Orden {servicio.codigo_servicio}"
    cuerpo_html = f"""
    <div style="font-family: Arial, sans-serif; padding: 25px; background-color: #f8fafc; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0;">Incidente Registrado - Servitek 🛠️</h2>
        <p style="color: #475569; font-size: 14px;">Se registró correctamente el incidente <strong>#{nuevo_incidente.id}</strong> asociado a la orden <strong>{servicio.codigo_servicio}</strong>.</p>
        
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #cbd5e1;">
            <p style="margin: 5px 0; color: #334155; font-size: 13px;"><strong>Prioridad:</strong> {nuevo_incidente.prioridad}</p>
            <p style="margin: 5px 0; color: #334155; font-size: 13px;"><strong>Garantía:</strong> {"Sí (Costo cero)" if nuevo_incidente.es_garantia else "No"}</p>
            <p style="margin: 5px 0; color: #334155; font-size: 13px;"><strong>Descripción:</strong> {nuevo_incidente.descripcion}</p>
        </div>

        <p style="color: #475569; font-size: 14px;">Nuestro equipo dará seguimiento según la prioridad asignada.</p>
        
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Atentamente,<br>El equipo de Servitek</p>
    </div>
    """

    if correo_destino:
        try:
            import sib_api_v3_sdk
            from sib_api_v3_sdk.rest import ApiException

            api_key_val = os.getenv("BREVO_API_KEY")
            print(f">>> [DEBUG] BREVO_API_KEY presente?: {bool(api_key_val)}")

            configuration = sib_api_v3_sdk.Configuration()
            configuration.api_key["api-key"] = api_key_val

            api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
                sib_api_v3_sdk.ApiClient(configuration)
            )

            sender = {"name": "Servitek Soporte", "email": "aliciacarranzasalazar16@gmail.com"}
            to = [{"email": correo_destino}]

            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=to,
                sender=sender,
                subject=asunto,
                html_content=cuerpo_html,
            )

            print(">>> [DEBUG] Intentando enviar correo a través de la API de Brevo...")
            api_response = api_instance.send_transac_email(send_smtp_email)
            print(">>> [DEBUG] ¡Correo enviado con éxito! Respuesta:", api_response)
        except Exception as e:
            print(f"❌ [ERROR CRÍTICO BREVO] Falló el envío en incidentes: {str(e)}")
            traceback.print_exc()
    else:
        print("⚠️ [DEBUG] No se encontró correo del cliente en el servicio; se omite envío por Brevo.")

    return nuevo_incidente

@router.get("/", response_model=list[schemas.IncidenteResponse])
def listar_incidentes(db: Session = Depends(get_db)):
    return db.query(models.Incidente).all()

@router.put("/{incidente_id}/evaluar", response_model=schemas.IncidenteResponse)
def evaluar_incidente(incidente_id: int, decision: schemas.IncidenteResolver, db: Session = Depends(get_db)):
    incidente = db.query(models.Incidente).filter(models.Incidente.id == incidente_id).first()
    if not incidente:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")

    incidente.solucion_remota = decision.solucion_remota
    incidente.diagnostico_resolucion = decision.diagnostico_resolucion

    if decision.solucion_remota:
        # Camino SÍ: Solucionado Remotamente (First Contact Resolution)[cite: 11, 12]
        incidente.estado = "Solucionado Remotamente"
        incidente.fecha_cierre = datetime.now(timezone.utc)
        mensaje_cliente = f"✅ Tu incidencia en la orden #{incidente.orden_id} fue solucionada remotamente: {decision.diagnostico_resolucion}"
    else:
        # Camino NO: Generar Ticket de Garantía (Costo Cero) y pasar a Taller[cite: 12]
        incidente.estado = "En Taller (Garantía)"
        incidente.es_garantia = True
        incidente.costo_cero = True
        
        # Actualizamos o creamos el reingreso en la orden de servicio a costo cero
        orden = db.query(models.OrdenServicio).filter(models.OrdenServicio.id == incidente.orden_id).first()
        if orden:
            orden.estado = "En reparación"
            orden.es_garantia = True
            orden.costo_total = 0.0

        mensaje_cliente = f"🛠️ Se generó Ticket de Garantía (Costo Cero) para tu orden #{incidente.orden_id}. Tu equipo ingresó a taller."

    # Notificación directa al panel del cliente (campanita)[cite: 12]
    notif_cliente = models.Notificacion(
        usuario_id=incidente.usuario_id,
        rol_destino="cliente",
        mensaje=mensaje_cliente
    )
    db.add(notif_cliente)
    db.commit()
    db.refresh(incidente)
    return incidente

# 4. Cierre de Reparación en Taller y Notificación de Equipo Listo[cite: 11, 12]
@router.put("/{incidente_id}/finalizar-garantia", response_model=schemas.IncidenteResponse)
def finalizar_garantia_taller(incidente_id: int, resolucion: str, db: Session = Depends(get_db)):
    incidente = db.query(models.Incidente).filter(models.Incidente.id == incidente_id).first()
    if not incidente:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")

    incidente.estado = "Cerrado"
    incidente.diagnostico_resolucion = resolucion
    incidente.fecha_cierre = datetime.now(timezone.utc)

    orden = db.query(models.OrdenServicio).filter(models.OrdenServicio.id == incidente.orden_id).first()
    if orden:
        orden.estado = "Listo para entrega"

    notif_cliente = models.Notificacion(
        usuario_id=incidente.usuario_id,
        rol_destino="cliente",
        mensaje=f"🎉 Equipo listo para recoger (Garantía Costo Cero - Orden #{incidente.orden_id})."
    )
    db.add(notif_cliente)
    db.commit()
    db.refresh(incidente)
    return incidente

# 5. Encuesta de Satisfacción CSAT (Cliente)[cite: 14]
@router.post("/{incidente_id}/csat")
def registrar_csat(incidente_id: int, payload: schemas.IncidenteCSAT, db: Session = Depends(get_db)):
    incidente = db.query(models.Incidente).filter(models.Incidente.id == incidente_id).first()
    if not incidente:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    incidente.calificacion_csat = payload.calificacion_csat
    db.commit()
    return {"mensaje": "Gracias por calificar nuestro servicio de garantía"}

# 6. Dashboard de KPIs (Administrador / DevOps)[cite: 13, 14]
@router.get("/kpis")
def obtener_kpis(db: Session = Depends(get_db)):
    incidentes = db.query(models.Incidente).all()
    total = len(incidentes)
    if total == 0:
        return {"FCR": 0, "MTTR_horas": 0, "Cumplimiento_SLA": 100, "Tasa_Reingresos": 0, "CSAT": 5.0}

    remotos = sum(1 for i in incidentes if i.solucion_remota is True)
    fcr = round((remotos / total) * 100, 2)

    cerrados = [i for i in incidentes if i.fecha_cierre and i.fecha_creacion]
    mttr = round(sum((i.fecha_cierre - i.fecha_creacion).total_seconds() / 3600 for i in cerrados) / len(cerrados), 2) if cerrados else 0

    en_sla = sum(1 for i in cerrados if i.sla_limite and i.fecha_cierre <= i.sla_limite)
    cumplimiento_sla = round((en_sla / len(cerrados)) * 100, 2) if cerrados else 100

    total_ordenes = db.query(models.OrdenServicio).count() or 1
    tasa_reingresos = round((total / total_ordenes) * 100, 2)

    calificados = [i.calificacion_csat for i in incidentes if i.calificacion_csat is not None]
    csat = round(sum(calificados) / len(calificados), 2) if calificados else 0

    return {
        "FCR_porcentaje": fcr,               # Meta >= 75%[cite: 14]
        "MTTR_horas": mttr,                  # Meta < 4 horas[cite: 14]
        "Cumplimiento_SLA_porcentaje": cumplimiento_sla, # Meta >= 95%[cite: 14]
        "Tasa_Reingresos_porcentaje": tasa_reingresos,   # Meta < 5%[cite: 14]
        "CSAT_promedio": csat                # Meta >= 4.5 / 5.0[cite: 14]
    }