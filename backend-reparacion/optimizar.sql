-- 1. INDICES
CREATE INDEX IF NOT EXISTS idx_equipos_numero_serie ON equipos(numero_serie);
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios(estado);

-- 2. TRIGGER PARA HISTORIAL
CREATE OR REPLACE FUNCTION funcion_historial_estados()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO historial_estados (servicio_id, estado_anterior, estado_nuevo, fecha_cambio, observaciones)
        VALUES (NEW.id, OLD.estado, NEW.estado, CURRENT_TIMESTAMP, 'Actualización automática vía Trigger DB');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cambio_estado_servicio ON servicios;

CREATE TRIGGER trigger_cambio_estado_servicio
AFTER UPDATE OF estado ON servicios
FOR EACH ROW
EXECUTE FUNCTION funcion_historial_estados();

-- 3. VISTA PARA RASTREO PÚBLICO
CREATE OR REPLACE VIEW vista_rastreo_publico AS
SELECT 
    s.codigo_servicio,
    s.estado,
    s.descripcion_falla,
    s.fecha_ingreso,
    s.costo_estimado,
    e.marca,
    e.modelo,
    e.numero_serie,
    c.nombre_completo AS nombre_cliente,
    SUBSTRING(c.telefono, 1, LENGTH(c.telefono) - 4) || '****' AS telefono_ofuscado
FROM servicios s
JOIN equipos e ON s.equipo_id = e.id
JOIN clientes c ON e.cliente_id = c.id;
