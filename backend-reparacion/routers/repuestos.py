from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter(prefix="/api/repuestos", tags=["Repuestos"])

@router.get("/")
def listar_repuestos(db: Session = Depends(get_db)):
    repuestos = db.query(models.Repuesto).all()
    return [
        {
            "id": r.id,
            "nombre": r.nombre,
            "descripcion": r.descripcion,
            "costo": r.costo,
            "stock": r.stock
        }
        for r in repuestos
    ]
@router.post("/")
def crear_repuesto(data: dict, db: Session = Depends(get_db)):
    nuevo_repuesto = models.Repuesto(
        nombre=data.get("nombre"),
        descripcion=data.get("descripcion"),
        costo=data.get("costo"),
        stock=data.get("stock")
    )
    db.add(nuevo_repuesto)
    db.commit()
    db.refresh(nuevo_repuesto)
    return nuevo_repuesto

@router.put("/{repuesto_id}/agregar-stock")
def sumar_stock(repuesto_id: int, data: dict, db: Session = Depends(get_db)):
    repuesto = db.query(models.Repuesto).filter(models.Repuesto.id == repuesto_id).first()
    if not repuesto:
        raise HTTPException(status_code=404, detail="Repuesto no encontrado")
    
    cantidad_a_sumar = int(data.get("cantidad", 0))
    repuesto.stock += cantidad_a_sumar
    db.commit()
    db.refresh(repuesto)
    return {"message": "Stock actualizado con éxito", "nuevo_stock": repuesto.stock}
@router.put("/{repuesto_id}")
def actualizar_repuesto(repuesto_id: int, data: dict, db: Session = Depends(get_db)):
    repuesto = db.query(models.Repuesto).filter(models.Repuesto.id == repuesto_id).first()
    if not repuesto:
        raise HTTPException(status_code=404, detail="Repuesto no encontrado")
    
    repuesto.nombre = data.get("nombre", repuesto.nombre)
    repuesto.descripcion = data.get("descripcion", repuesto.descripcion)
    repuesto.costo = data.get("costo", repuesto.costo)
    
    db.commit()
    db.refresh(repuesto)
    return {"message": "Repuesto actualizado con éxito", "repuesto": repuesto}

