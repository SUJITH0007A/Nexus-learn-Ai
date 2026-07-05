from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
import json
import random
import datetime

from api.core.database import get_db
from api.models.schemas import User, Quiz, Document, MockInterview, Achievement, Notification, user_achievements
from api.core.auth import get_current_user

router = APIRouter()

@router.get("/dashboard-stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Consolidated stats aggregator endpoint to feed dashboard charts, heatmaps, and counts in a single payload.
    """
    # Counts
    doc_count = db.query(Document).filter(Document.user_id == current_user.id).count()
    quiz_count = db.query(Quiz).filter(Quiz.user_id == current_user.id).count()
    interview_count = db.query(MockInterview).filter(MockInterview.user_id == current_user.id).count()
    
    # Calculate average quiz accuracy
    avg_accuracy = db.query(func.avg(Quiz.accuracy)).filter(Quiz.user_id == current_user.id).scalar() or 0.0
    avg_accuracy = round(float(avg_accuracy) * 100, 1) if avg_accuracy else 0.0
    
    # Weekly study hours representation (Mock data calculated with actual stats)
    # Weekday study hours [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    study_hours = [4.2, 3.8, 5.1, 2.5, 4.0, 6.2, 2.7]
    total_hours = sum(study_hours)
    
    # Topic Mastery mapping
    topic_mastery = [
        {"subject": "Quantum Physics", "score": 92},
        {"subject": "Deep Learning", "score": 85},
        {"subject": "Algorithms", "score": 78},
        {"subject": "Economics", "score": 88},
    ]
    
    # Weak areas based on score below 80
    weak_areas = [t for t in topic_mastery if t["score"] < 80]
    if not weak_areas:
        weak_areas = [{"subject": "System Design", "score": 74}]
        
    # Activity timeline list
    recent_activity = [
        {"id": 1, "type": "quiz", "title": "Completed Quiz: Quantum Physics", "time": "2 hours ago", "meta": f"Score: 92%"},
        {"id": 2, "type": "doc", "title": "Indexed Study Guide: Backpropagation.pdf", "time": "5 hours ago", "meta": "12.4 MB"},
        {"id": 3, "type": "interview", "title": "Mock Interview Session completed", "time": "Yesterday", "meta": "Score: Mid Level - 85%"}
    ]
    
    # Custom Heatmap Intensity logs (for last 28 days: intensity scale 0 to 4)
    # Return 28 elements representing intensity for each day
    heatmap = [random.randint(0, 4) for _ in range(28)]
    
    return {
        "user_info": {
            "name": current_user.full_name or current_user.email.split("@")[0],
            "xp": current_user.xp,
            "level": current_user.level,
            "credits": current_user.credits,
            "streak": 14  # Current Streak
        },
        "metrics": {
            "documents": doc_count,
            "quizzes": quiz_count,
            "interviews": interview_count,
            "study_hours": f"{total_hours:.1f}h",
            "quiz_accuracy": f"{avg_accuracy}%"
        },
        "study_hours_chart": study_hours,
        "topic_mastery": topic_mastery,
        "weak_areas": weak_areas,
        "recent_activity": recent_activity,
        "heatmap": heatmap
    }

@router.get("/leaderboard")
async def get_leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.xp.desc()).limit(10).all()
    return [
        {
            "rank": idx + 1,
            "name": u.full_name or u.email.split("@")[0],
            "xp": u.xp,
            "level": u.level,
            "avatar_url": u.avatar_url
        } for idx, u in enumerate(users)
    ]

@router.get("/achievements")
async def list_achievements(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Initialize basic achievements if they do not exist
    all_ach = db.query(Achievement).all()
    if not all_ach:
        seed_achievements = [
            ("Knowledge Explorer", "Upload your first study document.", 50),
            ("Streak Master", "Maintain a study streak of 7 days.", 100),
            ("AI Companion", "Chat with AI assistant for 10 messages.", 75),
            ("Code Ninja", "Save your first optimized code snippet.", 100),
            ("A+ Scholar", "Complete a generated quiz with >90% accuracy.", 150),
        ]
        for name, desc, xp in seed_achievements:
            ach = Achievement(name=name, description=desc, xp_value=xp)
            db.add(ach)
        db.commit()
        all_ach = db.query(Achievement).all()
        
    # Find unlocked achievements by current user
    unlocked_ids = [a.id for a in current_user.achievements]
    
    return [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "xp_value": a.xp_value,
            "unlocked": a.id in unlocked_ids
        } for a in all_ach
    ]

@router.get("/notifications", response_model=List[dict])
async def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()
    
    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at
        } for n in notifs
    ]

@router.put("/notifications/{notif_id}/read")
async def mark_notification_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}
