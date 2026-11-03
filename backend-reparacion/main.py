from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv  
import os
import cloudinary
import models
from database import engine
from routers import auth, usuarios, servicios, repuestos

load_dotenv()  

cloudinary.config(
    cloud_name="wii2owsr",
    api_key="885179181197423",
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "LRv7y5WSrpVS4c1mJWs2paDK6B4") 
)
# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Reparación de Laptops")
origins = [
    "https://servitek.onrender.com",
    "https://servitek-b3r2jfope-servitek1.vercel.app",
    "https://servitek.vercel.app", # Agrega otros subdominios si usas varios
    "http://localhost:3000",
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
   allow_origins=[*],
   allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluimos cada router correctamente
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(servicios.router)  # <--- Corregido: usamos servicios.router
app.include_router(repuestos.router)
os.makedirs("uploads", exist_ok=True)


@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de Reparación de Laptops"}