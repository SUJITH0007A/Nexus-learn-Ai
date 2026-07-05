from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import datetime
import uuid

from api.core.database import get_db
from api.models.schemas import User, UserSession, Notification
from api.core.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    decode_token
)

router = APIRouter()

# Pydantic Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    full_name: Optional[str] = None
    email: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    university: Optional[str] = None
    semester: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    preferences: Optional[str] = None
    learning_goals: Optional[str] = None

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed = get_password_hash(user_in.password)
    verification_token = str(uuid.uuid4())
    
    user = User(
        email=user_in.email,
        password_hash=hashed,
        full_name=user_in.full_name,
        verification_token=verification_token
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Automatically add initial notification
    welcome = Notification(
        user_id=user.id,
        type="achievement",
        title="Welcome to NexusLearn AI",
        message="Start uploading study guides, documents, or create an AI chat session!"
    )
    db.add(welcome)
    db.commit()
    
    access = create_access_token({"sub": user.email})
    refresh = create_refresh_token({"sub": user.email})
    
    # Save session
    session = UserSession(
        user_id=user.id,
        refresh_token=refresh,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
    )
    db.add(session)
    db.commit()
    
    return {
        "access_token": access,
        "refresh_token": refresh,
        "full_name": user.full_name,
        "email": user.email
    }

@router.post("/login", response_model=TokenResponse)
async def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    access = create_access_token({"sub": user.email})
    refresh = create_refresh_token({"sub": user.email})
    
    # Track session
    session = UserSession(
        user_id=user.id,
        refresh_token=refresh,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
    )
    db.add(session)
    db.commit()
    
    return {
        "access_token": access,
        "refresh_token": refresh,
        "full_name": user.full_name,
        "email": user.email
    }

@router.post("/oauth/google", response_model=TokenResponse)
async def google_oauth(payload: dict, db: Session = Depends(get_db)):
    """
    Mock Google OAuth endpoint that maps oauth profile data to local User record.
    """
    email = payload.get("email")
    name = payload.get("name", "")
    avatar = payload.get("picture", "")
    
    if not email:
        raise HTTPException(status_code=400, detail="Invalid Google profile details")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=name,
            avatar_url=avatar,
            is_verified=True # OAuth users are verified
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    access = create_access_token({"sub": user.email})
    refresh = create_refresh_token({"sub": user.email})
    
    session = UserSession(
        user_id=user.id,
        refresh_token=refresh,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
    )
    db.add(session)
    db.commit()
    
    return {
        "access_token": access,
        "refresh_token": refresh,
        "full_name": user.full_name,
        "email": user.email
    }

@router.post("/oauth/github", response_model=TokenResponse)
async def github_oauth(payload: dict, db: Session = Depends(get_db)):
    """
    Mock GitHub OAuth endpoint mapping github user metadata to local Database.
    """
    email = payload.get("email")
    name = payload.get("name", "")
    avatar = payload.get("avatar_url", "")
    
    if not email:
        raise HTTPException(status_code=400, detail="Invalid GitHub profile details")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=name,
            avatar_url=avatar,
            is_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    access = create_access_token({"sub": user.email})
    refresh = create_refresh_token({"sub": user.email})
    
    session = UserSession(
        user_id=user.id,
        refresh_token=refresh,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
    )
    db.add(session)
    db.commit()
    
    return {
        "access_token": access,
        "refresh_token": refresh,
        "full_name": user.full_name,
        "email": user.email
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: dict, db: Session = Depends(get_db)):
    refresh = payload.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=400, detail="Missing refresh token")
        
    decoded = decode_token(refresh)
    if decoded is None or decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    email = decoded.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    # Check if session exists in database
    session = db.query(UserSession).filter(UserSession.refresh_token == refresh).first()
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
        
    access = create_access_token({"sub": user.email})
    new_refresh = create_refresh_token({"sub": user.email})
    
    # Update session
    session.refresh_token = new_refresh
    session.expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    db.commit()
    
    return {
        "access_token": access,
        "refresh_token": new_refresh,
        "full_name": user.full_name,
        "email": user.email
    }

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "avatar_url": current_user.avatar_url,
        "university": current_user.university,
        "semester": current_user.semester,
        "bio": current_user.bio,
        "skills": current_user.skills,
        "preferences": current_user.preferences,
        "learning_goals": current_user.learning_goals,
        "xp": current_user.xp,
        "level": current_user.level,
        "credits": current_user.credits
    }

@router.put("/profile", response_model=dict)
async def update_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    for field, val in profile_in.dict(exclude_unset=True).items():
        setattr(current_user, field, val)
        
    db.commit()
    return {"message": "Profile updated successfully"}

@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Avoid user enumeration, return success anyway
        return {"message": "If the email exists, a reset link will be sent."}
    
    # In production, send a real email. Here we generate a mock reset link.
    token = str(uuid.uuid4())
    user.verification_token = f"reset_{token}"
    db.commit()
    return {
        "message": "Reset token generated successfully",
        "mock_link": f"/reset-password?token={token}"
    }

@router.post("/reset-password")
async def reset_password(reset: PasswordReset, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == f"reset_{reset.token}").first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user.password_hash = get_password_hash(reset.new_password)
    user.verification_token = None
    db.commit()
    return {"message": "Password has been reset successfully"}

@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
        
    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email verified successfully"}
