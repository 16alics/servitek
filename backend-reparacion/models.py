from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Enum, Boolean,func
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

class RolEnum(str, enum.Enum):
    admin = "admin"
    cliente = "cliente"
    tecnico = "tecnico"
    recepcionista = "recepcionista"


class EstadoServicioEnum(str, enum.Enum):
    Pendiente = "Pendiente"
    Recibido = "Recibido"
    Diagnostico = "Diagnóstico"
    Esperando_aprobacion = "Esperando aprobación"  # <--- Debe tener la tilde y el espacio exacto
    En_reparacion = "En reparación"               # <--- Con espacio y tilde
    Listo_para_entrega = "Listo para entrega"     # <--- Con espacio
    Entregado = "Entregado"
    Cancelado = "Cancelado"
    
class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    rol = Column(Enum(RolEnum), default=RolEnum.cliente)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    primer_ingreso = Column(Boolean, default=True)
    activo = Column(Boolean, default=True)

class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True)
    nombre_completo = Column(String, nullable=False)
    documento_identidad = Column(String)
    telefono = Column(String)
    direccion = Column(String)
    
    usuario = relationship("Usuario")
    equipos = relationship("Equipo", back_populates="cliente")

class Tecnico(Base):
    __tablename__ = "tecnicos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True)
    nombre_completo = Column(String, nullable=False)
    especialidad = Column(String)
    
    usuario = relationship("Usuario")

class Equipo(Base):
    __tablename__ = "equipos"
    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    marca = Column(String, nullable=False)
    modelo = Column(String, nullable=False)
    numero_serie = Column(String)
    accesorios = Column(Text)
    
    cliente = relationship("Cliente", back_populates="equipos")
    servicios = relationship("Servicio", back_populates="equipo")


class Servicio(Base):
    __tablename__ = "servicios"
    id = Column(Integer, primary_key=True, index=True)
    codigo_servicio = Column(String, unique=True, index=True, nullable=False)
    equipo_id = Column(Integer, ForeignKey("equipos.id"))
    tecnico_id = Column(Integer, ForeignKey("tecnicos.id"), nullable=True)
    descripcion_falla = Column(Text, nullable=False)
    estado = Column(String, default="Pendiente", nullable=False)
    
    # 👈 ¡Añade estas dos líneas que faltaban en tu modelo!
    costo_estimado = Column(Float, nullable=True)
    costo_final = Column(Float, nullable=True)
    
    fecha_ingreso = Column(DateTime, default=datetime.utcnow)
    fecha_salida = Column(DateTime, nullable=True)
    
    equipo = relationship("Equipo", back_populates="servicios")
    tecnico = relationship("Tecnico")
    diagnostico = relationship("Diagnostico", back_populates="servicio", uselist=False)
    historial = relationship("HistorialEstado", back_populates="servicio")
    repuestos = relationship("ServicioRepuesto", back_populates="servicio")
class Diagnostico(Base):
    __tablename__ = "diagnosticos"
    id = Column(Integer, primary_key=True, index=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), unique=True)
    falla_encontrada = Column(Text)

    observaciones = Column(Text)
    fecha_diagnostico = Column(DateTime, default=datetime.utcnow)
    
    servicio = relationship("Servicio", back_populates="diagnostico")

class Repuesto(Base):
    __tablename__ = "repuestos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    descripcion = Column(Text)
    costo = Column(Float)
    stock = Column(Integer, default=0)

class ServicioRepuesto(Base):
    __tablename__ = "servicio_repuestos"
    __table_args__ = {'extend_existing': True} # 👈 Evita errores de redefinición
    
    id = Column(Integer, primary_key=True, index=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id"))
    repuesto_id = Column(Integer, ForeignKey("repuestos.id"))
    cantidad = Column(Integer, default=1)
    precio_unitario = Column(Float, nullable=True) # Incluimos el campo de precio de tu segunda versión
    
    # Relaciones obligatorias para el back_populates
    servicio = relationship("Servicio", back_populates="repuestos")
    repuesto = relationship("Repuesto")

class HistorialEstado(Base):
    __tablename__ = "historial_estados"
    id = Column(Integer, primary_key=True, index=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id"))
    estado_anterior = Column(String)
    estado_nuevo = Column(String, nullable=False)
    fecha_cambio = Column(DateTime, default=datetime.utcnow)
    observaciones = Column(Text)
    
    servicio = relationship("Servicio", back_populates="historial")

class ServicioActividad(Base):
    __tablename__ = "servicios_actividades"

    id = Column(Integer, primary_key=True, index=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id", ondelete="CASCADE"))
    descripcion = Column(Text, nullable=False)
    costo = Column(Float, nullable=False, default=0.0)

class ServicioFoto(Base):
    __tablename__ = "servicios_fotos"

    id = Column(Integer, primary_key=True, index=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id", ondelete="CASCADE"))
    url_foto = Column(Text, nullable=False)
    fecha_subida = Column(DateTime, server_default=func.now())
    
