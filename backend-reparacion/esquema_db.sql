CREATE TABLE repuestos (
	id SERIAL NOT NULL, 
	nombre VARCHAR NOT NULL, 
	descripcion TEXT, 
	costo FLOAT, 
	stock INTEGER, 
	PRIMARY KEY (id)
);

CREATE TABLE usuarios (
	id SERIAL NOT NULL, 
	email VARCHAR NOT NULL, 
	password_hash VARCHAR NOT NULL, 
	rol rolenum, 
	fecha_registro TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE TABLE clientes (
	id SERIAL NOT NULL, 
	usuario_id INTEGER,  
	documento_identidad VARCHAR, 
	telefono VARCHAR, 
	direccion VARCHAR, 
	PRIMARY KEY (id), 
	UNIQUE (usuario_id), 
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
);

CREATE TABLE tecnicos (
	id SERIAL NOT NULL, 
	usuario_id INTEGER, 
	nombre_completo VARCHAR NOT NULL, 
	especialidad VARCHAR, 
	PRIMARY KEY (id), 
	UNIQUE (usuario_id), 
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
);

CREATE TABLE equipos (
	id SERIAL NOT NULL, 
	cliente_id INTEGER, 
	marca VARCHAR NOT NULL, 
	modelo VARCHAR NOT NULL, 
	numero_serie VARCHAR, 
	accesorios TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id)
);

CREATE TABLE servicios (
	id SERIAL NOT NULL, 
	codigo_servicio VARCHAR NOT NULL, 
	equipo_id INTEGER, 
	tecnico_id INTEGER, 
	descripcion_falla TEXT NOT NULL, 
	estado estadoservicioenum, 
	costo_estimado FLOAT, 
	costo_final FLOAT, 
	fecha_ingreso TIMESTAMP WITHOUT TIME ZONE, 
	fecha_salida TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(equipo_id) REFERENCES equipos (id), 
	FOREIGN KEY(tecnico_id) REFERENCES tecnicos (id)
);

CREATE TABLE diagnosticos (
	id SERIAL NOT NULL, 
	servicio_id INTEGER, 
	falla_encontrada TEXT, 
	actividades_realizadas TEXT, 
	observaciones TEXT, 
	fecha_diagnostico TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (servicio_id), 
	FOREIGN KEY(servicio_id) REFERENCES servicios (id)
);

CREATE TABLE historial_estados (
	id SERIAL NOT NULL, 
	servicio_id INTEGER, 
	estado_anterior VARCHAR, 
	estado_nuevo VARCHAR NOT NULL, 
	fecha_cambio TIMESTAMP WITHOUT TIME ZONE, 
	observaciones TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(servicio_id) REFERENCES servicios (id)
);

CREATE TABLE servicio_repuestos (
	id SERIAL NOT NULL, 
	servicio_id INTEGER, 
	repuesto_id INTEGER, 
	cantidad INTEGER, 
	precio_unitario FLOAT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(servicio_id) REFERENCES servicios (id), 
	FOREIGN KEY(repuesto_id) REFERENCES repuestos (id)
);

