from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# La URL de la base de datos
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://neondb_owner:npg_7hsVFfOp3SHA@ep-proud-leaf-b4ikgh4h-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Las variables de JWT van por separado
SECRET_KEY = "servitek_clave_secreta_jwt_2026"
ALGORITHM = "HS256"

# AGREGA AQUÍ pool_pre_ping=True
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True, 
    pool_recycle=3600
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()