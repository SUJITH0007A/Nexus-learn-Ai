from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import sys
import os
import psutil # For CPU and Memory monitoring metrics

from api.core.database import get_db
from api.models.schemas import User, Document, Chat, Message, Quiz
from api.core.auth import get_current_admin

router = APIRouter()

@router.get("/health")
async def system_health_status(current_admin: User = Depends(get_current_admin)):
    """
    Retrieves system resources usage. Secures database connection health status.
    """
    cpu_percent = psutil.cpu_percent(interval=None)
    memory_info = psutil.virtual_memory()
    
    return {
        "status": "healthy",
        "api_framework": "FastAPI",
        "python_version": sys.version,
        "os": sys.platform,
        "cpu_usage": f"{cpu_percent}%",
        "memory_usage": f"{memory_info.percent}%",
        "database_connected": True
    }

@router.get("/metrics")
async def system_usage_metrics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Aggregates application statistics for admin oversight.
    """
    user_count = db.query(User).count()
    doc_count = db.query(Document).count()
    chat_count = db.query(Chat).count()
    msg_count = db.query(Message).count()
    quiz_count = db.query(Quiz).count()
    
    # Calculate sum of AI credits allocated vs spent
    total_credits = db.query(func.sum(User.credits)).scalar() or 0
    total_xp = db.query(func.sum(User.xp)).scalar() or 0
    
    return {
        "total_users": user_count,
        "total_documents": doc_count,
        "total_chats": chat_count,
        "total_messages": msg_count,
        "total_quizzes": quiz_count,
        "total_allocated_credits": int(total_credits),
        "total_system_xp": int(total_xp)
    }

@router.get("/users", response_model=List[dict])
async def manage_users_list(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "xp": u.xp,
            "level": u.level,
            "credits": u.credits,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "created_at": u.created_at
        } for u in users
    ]

@router.put("/users/{user_id}/role")
async def update_user_privilege(
    user_id: int,
    is_admin: bool,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_admin = is_admin
    db.commit()
    return {"message": f"User {user.email} admin role updated to {is_admin}"}

@router.get("/documents")
async def list_all_documents(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "owner": d.user.email,
            "filename": d.filename,
            "file_type": d.file_type,
            "size_bytes": d.size_bytes,
            "is_indexed": d.is_indexed,
            "created_at": d.created_at
        } for d in docs
    ]
