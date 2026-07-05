from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json

from api.core.database import get_db
from api.models.schemas import User, MockInterview
from api.core.auth import get_current_user
from api.services.ai_service import ai_service

router = APIRouter()

class InterviewStart(BaseModel):
    title: str
    difficulty: str # "Junior", "Mid", "Senior"
    interview_type: str # "Technical", "Behavioral", "Coding"
    timer_seconds: Optional[int] = 1800

class AnswerSubmit(BaseModel):
    answer: str

@router.get("/history", response_model=List[dict])
async def list_interviews(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    interviews = db.query(MockInterview).filter(MockInterview.user_id == current_user.id).order_by(MockInterview.created_at.desc()).all()
    
    formatted = []
    for iv in interviews:
        try:
            transcripts = json.loads(iv.transcripts_json) if iv.transcripts_json else []
        except:
            transcripts = []
        formatted.append({
            "id": iv.id,
            "title": iv.title,
            "difficulty": iv.difficulty,
            "interview_type": iv.interview_type,
            "score": iv.score,
            "feedback": iv.feedback,
            "timer_seconds": iv.timer_seconds,
            "transcripts": transcripts,
            "created_at": iv.created_at
        })
    return formatted

@router.post("/start", response_model=dict)
async def start_mock_interview(
    iv_in: InterviewStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initialize a mock interview session and generate the first interview question.
    """
    # Let AI formulate the first question based on type and difficulty
    prompt = [
        {"role": "system", "content": "You are a senior tech lead interviewer. Generate the first interview question based on the user's details. Make it realistic, professional, and clear. Do not write anything else besides the question text."},
        {"role": "user", "content": f"Type: {iv_in.interview_type}, Difficulty: {iv_in.difficulty}, Title: {iv_in.title}."}
    ]
    
    first_question = await ai_service.generate_response_static(prompt)
    if not first_question.strip():
        first_question = "Welcome! Let's start the interview. Can you describe a challenging technical problem you solved, and your exact debugging steps?"
        
    transcripts = [
        {"role": "interviewer", "content": first_question}
    ]
    
    iv = MockInterview(
        user_id=current_user.id,
        title=iv_in.title,
        difficulty=iv_in.difficulty,
        interview_type=iv_in.interview_type,
        timer_seconds=iv_in.timer_seconds,
        transcripts_json=json.dumps(transcripts)
    )
    db.add(iv)
    db.commit()
    db.refresh(iv)
    
    return {
        "id": iv.id,
        "title": iv.title,
        "next_question": first_question,
        "transcripts": transcripts
    }

@router.post("/{iv_id}/answer", response_model=dict)
async def submit_answer(
    iv_id: int,
    ans_in: AnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit answer to current question.
    If rounds < 4: AI provides feedback on current answer and asks next question.
    If rounds >= 4: AI concludes the interview and provides final score/evaluation.
    """
    iv = db.query(MockInterview).filter(MockInterview.id == iv_id, MockInterview.user_id == current_user.id).first()
    if not iv:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    try:
        transcripts = json.loads(iv.transcripts_json) if iv.transcripts_json else []
    except:
        transcripts = []
        
    # Append user answer
    transcripts.append({"role": "candidate", "content": ans_in.answer})
    
    # Calculate round count of questions asked
    rounds = len([t for t in transcripts if t["role"] == "candidate"])
    
    if rounds < 3:
        # Generate next question
        prompt = [
            {"role": "system", "content": "You are a tech recruiter mock interviewer. Review the candidate's last answer, give a one-sentence micro-acknowledgment, and ask the next relevant question. Be precise. Yield only the interviewer's next question."},
            {"role": "user", "content": f"History:\n{json.dumps(transcripts)}\n\nGenerate next question:"}
        ]
        next_question = await ai_service.generate_response_static(prompt)
        transcripts.append({"role": "interviewer", "content": next_question})
        
        iv.transcripts_json = json.dumps(transcripts)
        db.commit()
        
        return {
            "status": "ongoing",
            "next_question": next_question,
            "transcripts": transcripts
        }
    else:
        # Conclude and evaluate
        prompt = [
            {"role": "system", "content": "You are a senior tech lead evaluator. Analyze the interview history and provide a final rating. Format your response strictly as JSON: {\"score\": 85, \"feedback\": \"Provide a summary of strength, weakness, and suggestions in markdown.\"} where score is an integer between 0 and 100."},
            {"role": "user", "content": f"Interview Session:\n{json.dumps(transcripts)}"}
        ]
        eval_resp = await ai_service.generate_response_static(prompt)
        try:
            clean_json = eval_resp.strip().replace("```json", "").replace("```", "").strip()
            parsed_eval = json.loads(clean_json)
            score = float(parsed_eval.get("score", 70.0))
            feedback = parsed_eval.get("feedback", "Good performance, continue practice.")
        except:
            score = 75.0
            feedback = "Interview finished. Strong responses in general, could expand on system design details."
            
        iv.score = score
        iv.feedback = feedback
        transcripts.append({"role": "system_evaluation", "score": score, "feedback": feedback})
        iv.transcripts_json = json.dumps(transcripts)
        
        # Award XP for completing interview
        current_user.xp += 150
        if current_user.xp >= current_user.level * 100:
            current_user.level += 1
            
        db.commit()
        
        return {
            "status": "concluded",
            "score": score,
            "feedback": feedback,
            "transcripts": transcripts
        }

@router.delete("/{iv_id}")
async def delete_interview(iv_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    iv = db.query(MockInterview).filter(MockInterview.id == iv_id, MockInterview.user_id == current_user.id).first()
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    db.delete(iv)
    db.commit()
    return {"message": "Interview session deleted"}
