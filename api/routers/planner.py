from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json
import datetime

from api.core.database import get_db
from api.models.schemas import User, StudyPlan
from api.core.auth import get_current_user
from api.services.ai_service import ai_service

router = APIRouter()

class PlanCreate(BaseModel):
    title: str
    subjects: List[str]
    hours_per_day: int = 2
    target_exam_date: str # YYYY-MM-DD
    goals: Optional[str] = "Master core topics and solve quiz templates."

@router.get("/plans", response_model=List[dict])
async def list_plans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plans = db.query(StudyPlan).filter(StudyPlan.user_id == current_user.id).order_by(StudyPlan.created_at.desc()).all()
    
    formatted = []
    for p in plans:
        try:
            schedule = json.loads(p.schedule_json)
        except:
            schedule = []
        try:
            goals = json.loads(p.goals_json) if p.goals_json else {}
        except:
            goals = {}
            
        formatted.append({
            "id": p.id,
            "title": p.title,
            "schedule": schedule,
            "goals": goals,
            "created_at": p.created_at
        })
    return formatted

@router.post("/plans", response_model=dict)
async def create_study_plan(plan_in: PlanCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Calculate countdown
    try:
        exam_dt = datetime.datetime.strptime(plan_in.target_exam_date, "%Y-%m-%d")
        days_left = (exam_dt - datetime.datetime.utcnow()).days
    except:
        days_left = 30
        exam_dt = datetime.datetime.utcnow() + datetime.timedelta(days=30)
        
    # Query AI to build schedule
    prompt = [
        {"role": "system", "content": "You are a Study Planner AI. Create a detailed daily study schedule for exam preparation. Format output strictly as JSON array of objects representing days: [{\"day\": 1, \"topics\": [\"Topic A\", \"Topic B\"], \"time_allocation\": \"2 hours\"}]"},
        {"role": "user", "content": f"Subjects to cover: {', '.join(plan_in.subjects)}. Daily study limit: {plan_in.hours_per_day} hours. Target exam date in {days_left} days. Goals: {plan_in.goals}."}
    ]
    
    schedule_resp = await ai_service.generate_response_static(prompt)
    try:
        clean_json = schedule_resp.strip().replace("```json", "").replace("```", "").strip()
        parsed_schedule = json.loads(clean_json)
    except:
        # Fallback dummy plan schedule
        parsed_schedule = [
            {"day": 1, "topics": ["Introduction & Setup", "Basic equations review"], "time_allocation": f"{plan_in.hours_per_day} hours"},
            {"day": 2, "topics": ["Core concept breakdown", "Formulas practice"], "time_allocation": f"{plan_in.hours_per_day} hours"},
            {"day": 3, "topics": ["Intermediate level problems", "Self-testing quiz"], "time_allocation": f"{plan_in.hours_per_day} hours"}
        ]
        
    goals_data = {
        "target_date": plan_in.target_exam_date,
        "days_countdown": days_left if days_left > 0 else 0,
        "hours_per_day": plan_in.hours_per_day,
        "user_goals": plan_in.goals
    }
    
    plan = StudyPlan(
        user_id=current_user.id,
        title=plan_in.title,
        schedule_json=json.dumps(parsed_schedule),
        goals_json=json.dumps(goals_data)
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    return {
        "id": plan.id,
        "title": plan.title,
        "schedule": parsed_schedule,
        "goals": goals_data
    }

@router.delete("/plans/{plan_id}")
async def delete_study_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")
        
    db.delete(plan)
    db.commit()
    return {"message": "Study plan deleted successfully"}
