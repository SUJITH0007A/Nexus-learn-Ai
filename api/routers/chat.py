from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json

from api.core.database import get_db
from api.models.schemas import User, Chat, Message, Folder
from api.core.auth import get_current_user
from api.services.ai_service import ai_service

router = APIRouter()

# Schemas
class ChatCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    folder_id: Optional[int] = None
    model_name: Optional[str] = "gpt-4o"

class ChatUpdate(BaseModel):
    title: Optional[str] = None
    folder_id: Optional[int] = None
    is_pinned: Optional[bool] = None

class MessageSend(BaseModel):
    content: str
    model_name: Optional[str] = "gpt-4o"

class ReactionUpdate(BaseModel):
    reaction: Optional[str] = None # "like", "dislike", or null

class FolderCreate(BaseModel):
    name: str

@router.get("/folders", response_model=List[dict])
async def list_folders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    folders = db.query(Folder).filter(Folder.user_id == current_user.id).all()
    return [{"id": f.id, "name": f.name} for f in folders]

@router.post("/folders", response_model=dict)
async def create_folder(folder_in: FolderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    folder = Folder(user_id=current_user.id, name=folder_in.name)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return {"id": folder.id, "name": folder.name}

@router.get("/sessions", response_model=List[dict])
async def list_chat_sessions(
    current_user: User = Depends(get_current_user), 
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Chat).filter(Chat.user_id == current_user.id)
    if folder_id is not None:
        query = query.filter(Chat.folder_id == folder_id)
        
    chats = query.order_by(Chat.created_at.desc()).all()
    return [
        {
            "id": c.id, 
            "title": c.title, 
            "is_pinned": c.is_pinned, 
            "model_name": c.model_name, 
            "folder_id": c.folder_id,
            "created_at": c.created_at
        } for c in chats
    ]

@router.post("/sessions", response_model=dict)
async def create_chat_session(chat_in: ChatCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = Chat(
        user_id=current_user.id,
        title=chat_in.title,
        folder_id=chat_in.folder_id,
        model_name=chat_in.model_name
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return {
        "id": chat.id,
        "title": chat.title,
        "is_pinned": chat.is_pinned,
        "model_name": chat.model_name,
        "folder_id": chat.folder_id
    }

@router.put("/sessions/{chat_id}", response_model=dict)
async def update_chat_session(
    chat_id: int, 
    chat_in: ChatUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    for field, val in chat_in.dict(exclude_unset=True).items():
        setattr(chat, field, val)
        
    db.commit()
    return {"message": "Chat updated successfully"}

@router.delete("/sessions/{chat_id}")
async def delete_chat_session(chat_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    db.delete(chat)
    db.commit()
    return {"message": "Chat deleted"}

@router.get("/sessions/{chat_id}/messages", response_model=List[dict])
async def list_chat_messages(chat_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()
    return [
        {
            "id": m.id,
            "sender": m.sender,
            "content": m.content,
            "model_used": m.model_used,
            "reaction": m.reaction,
            "created_at": m.created_at
        } for m in messages
    ]

@router.post("/sessions/{chat_id}/stream")
async def stream_chat_reply(
    chat_id: int,
    msg_in: MessageSend,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint that accepts user prompt and streams dynamic completions.
    """
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    # Update chat model name if requested
    if msg_in.model_name:
        chat.model_name = msg_in.model_name
        db.commit()
        
    # Append user message to database
    user_msg = Message(
        chat_id=chat.id,
        sender="user",
        content=msg_in.content,
        model_used=chat.model_name
    )
    db.add(user_msg)
    db.commit()
    
    # Charge 1 credit for AI interaction
    if current_user.credits > 0:
        current_user.credits -= 1
        current_user.xp += 10 # earn 10 XP per AI chat interaction
        # check level up
        if current_user.xp >= current_user.level * 100:
            current_user.level += 1
        db.commit()

    # Load recent conversation history (limit to last 10 messages for token savings)
    history = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.desc()).limit(10).all()
    history.reverse()
    
    formatted_history = []
    # System prompt
    formatted_history.append({
        "role": "system", 
        "content": "You are NexusLearn AI, a staff-engineered premium learning helper assistant. Answer study questions thoroughly using markdown formatting."
    })
    for m in history:
        role = "assistant" if m.sender == "assistant" else "user"
        formatted_history.append({"role": role, "content": m.content})

    async def completion_generator():
        collected_chunks = []
        async for chunk in ai_service.generate_response_stream(
            messages=formatted_history, 
            model_name=chat.model_name
        ):
            collected_chunks.append(chunk)
            yield f"data: {json.dumps({'content': chunk})}\n\n"
            
        # At the end of the stream, save full assistant message to DB
        assistant_content = "".join(collected_chunks)
        assistant_msg = Message(
            chat_id=chat.id,
            sender="assistant",
            content=assistant_content,
            model_used=chat.model_name
        )
        db_save = SessionLocal()
        db_save.add(assistant_msg)
        # also update chat title if it's the default 'New Conversation'
        chat_obj = db_save.query(Chat).filter(Chat.id == chat_id).first()
        if chat_obj and chat_obj.title == "New Conversation":
            chat_obj.title = msg_in.content[:30] + "..." if len(msg_in.content) > 30 else msg_in.content
        db_save.commit()
        db_save.close()
        
    return StreamingResponse(completion_generator(), media_type="text/event-stream")

@router.put("/messages/{message_id}/react", response_model=dict)
async def update_message_reaction(
    message_id: int,
    react_in: ReactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(Message).join(Chat).filter(Message.id == message_id, Chat.user_id == current_user.id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    msg.reaction = react_in.reaction
    db.commit()
    return {"message": "Reaction updated"}

@router.get("/sessions/{chat_id}/export")
async def export_chat_session(chat_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()
    export_data = {
        "title": chat.title,
        "model": chat.model_name,
        "created_at": str(chat.created_at),
        "history": [
            {
                "sender": m.sender,
                "content": m.content,
                "created_at": str(m.created_at)
            } for m in messages
        ]
    }
    return export_data

@router.get("/search")
async def search_conversations(
    q: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search conversation history content for query keywords.
    """
    messages = db.query(Message).join(Chat).filter(
        Chat.user_id == current_user.id,
        Message.content.like(f"%{q}%")
    ).all()
    return [
        {
            "chat_id": m.chat_id,
            "message_id": m.id,
            "chat_title": m.chat.title,
            "sender": m.sender,
            "snippet": m.content[:100] + "..." if len(m.content) > 100 else m.content,
            "created_at": m.created_at
        } for m in messages
    ]
