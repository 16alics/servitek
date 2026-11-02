from pydantic import BaseModel, EmailStr
from typing import Optional,List,Any
from datetime import datetime
from models import EstadoServicioEnum
from sqlalchemy.orm import relationship
# --- USUARIOS ---
class UsuarioBase(BaseModel):
    email: EmailStr
    rol: str = "cliente"

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioResponse(UsuarioBase):
    id: int
    fecha_registro: datetime

    class Config:
        from_attributes = True
#cambia contraseña admin-cliente
class PasswordUpdateSchema(BaseModel):
    nueva_password: Optional[str] = None
    password: Optional[str] = None
    new_password: Optional[str] = None
# --- TOKENS (AUTH) ---
class Token(BaseModel):
    access_token: str
    token_type: str
    primer_ingreso: bool = False
    rol: Optional[str] = None

class TokenData(BaseModel):
    email: Optional[str] = None

# --- CLIENTES ---
class ClienteBase(BaseModel):
    nombre_completo: str
    documento_identidad: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass
class ClienteUpdate(BaseModel):
    nombre_completo: str
    telefono: str
    direccion: Optional[str] = None
class ClienteResponse(ClienteBase):
    id: int
    usuario_id: int
    class Config: from_attributes = True

# --- TECNICOS ---
class TecnicoBase(BaseModel):
    nombre_completo: str
    especialidad: Optional[str] = None

class TecnicoCreate(TecnicoBase):
    pass

class TecnicoResponse(TecnicoBase):
    id: int
    usuario_id: int
    activo: bool = True
    class Config: from_attributes = True
# --- RECEPCIÓN EN TIENDA ---
class RecepcionEquipoSchema(BaseModel):
    tecnico_id: Optional[int] = None
    costo_estimado: Optional[float] = None
# --- EQUIPOS ---
class EquipoBase(BaseModel):
    marca: str
    modelo: str
    numero_serie: Optional[str] = None
    accesorios: Optional[str] = None

class EquipoCreate(EquipoBase):
    cliente_id: int

# NUEVO: Esquema para cuando se solicita servicio desde el frontend (sin exigir cliente_id)
class EquipoSolicitud(EquipoBase):
    pass

class EquipoResponse(EquipoBase):
    id: int
    cliente_id: int
    class Config: from_attributes = True

# --- SERVICIOS ---
class ServicioBase(BaseModel):
    descripcion_falla: str
    costo_estimado: Optional[float] = None

class ServicioCreate(ServicioBase):
    equipo_id: int

class ServicioResponse(ServicioBase):
    id: int
    codigo_servicio: str
    equipo_id: int
    tecnico_id: Optional[int] = None
    estado: str
    fecha_ingreso: datetime
    
    class Config: from_attributes = True
# --- SERVICIO DIRECTO EN TIENDA (REGISTRO POR TRABAJADOR) ---
class ServicioDirectoSchema(BaseModel):
    cliente_id: int
    marca: str
    modelo: str
    numero_serie: Optional[str] = None
    accesorios: Optional[str] = None
    descripcion_falla: str
    tecnico_id: Optional[int] = None
    costo_estimado: Optional[float] = None
class SolicitudServicio(BaseModel):
    email: str
    falla: str
    equipo: EquipoSolicitud  # Usamos EquipoSolicitud en lugar de EquipoCreate
# --- DIAGNOSTICOS ---
class DiagnosticoBase(BaseModel):
    falla_encontrada: Optional[str] = None
    observaciones: Optional[str] = None

class DiagnosticoCreate(DiagnosticoBase):
    pass

class DiagnosticoResponse(DiagnosticoBase):
    id: int
    servicio_id: int
    fecha_diagnostico: datetime
    
    class Config:
        from_attributes = True
    
# --- NUEVO: RECEPCIÓN DE EQUIPO EN TIENDA ---
class RecepcionEquipoSchema(BaseModel):
    tecnico_id: Optional[int] = None
    costo_estimado: Optional[float] = None
# --- ESQUEMA PARA ASIGNAR TÉCNICO Y CAMBIAR ESTADO EN RECEPCIÓN ---
class RecepcionAsignarSchema(BaseModel):
    tecnico_id: int
    estado: str = "Recibido"
    marca: Optional[str] = None
    numero_serie: Optional[str] = None
    descripcion_falla: Optional[str] = None
    prioridad: Optional[str] = None
class DiagnosticoUpdateSchema(BaseModel):
    falla_encontrada: str
    actividades_realizadas: Optional[Any] = None
    observaciones: Optional[str] = ""
    costo_estimado: Optional[float] = 0.0
    repuestos: Optional[List[Any]] = []
    
class ActividadCreateSchema(BaseModel):
    descripcion: str
    costo: float

class ServicioEstadoUpdate(BaseModel):
    estado: EstadoServicioEnum

class RepuestoAsignarSchema(BaseModel):
    repuesto_id: int
    cantidad: int = 1
    
class TecnicoResponse(BaseModel):
    id: int
    nombre_completo: str
    email: str
    especialidad: Optional[str] = None
    activo: bool  # 👈 ¡Este campo debe estar aquí!

    class Config:
        from_attributes = True

class AsignarTecnicoSchema(BaseModel):
    tecnico_id: int
    
class GuardarDiagnosticoSchema(BaseModel):
    diagnostico: str
    costo_estimado: float
class RepuestoItemSchema(BaseModel):
    id: int
    cantidad: int
    costo: Optional[float] = 0.0

# 2. Después se define el esquema de actualización que usa al anterior
class DiagnosticoUpdateSchema(BaseModel):
    falla_encontrada: str
    observaciones: Optional[str] = None
    actividades_realizadas: Optional[str] = None
    costo_estimado: Optional[float] = None
    repuestos: Optional[List[RepuestoItemSchema]] = []