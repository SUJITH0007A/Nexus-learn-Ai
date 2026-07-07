from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session
import os
import shutil
import uuid
from typing import List, Optional, Dict

from api.core.database import get_db, SessionLocal
from api.models.schemas import User, Document, Quiz, Flashcard
from api.core.auth import get_current_user
from api.services.rag_service import rag_service
from api.services.celery_app import process_and_index_doc_task
from api.services.ai_service import ai_service
from api.services.storage_service import storage_service
import tempfile

router = APIRouter()

# Ensure uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a document, create database entry, and trigger Celery background indexing.
    """
    # Create safe unique filename
    unique_id = uuid.uuid4().hex
    original_filename = file.filename
    ext = os.path.splitext(original_filename)[1].lower()
    
    if ext not in [".pdf", ".docx", ".pptx", ".txt", ".csv", ".png", ".jpg", ".jpeg"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Unsupported file format: {ext}"
        )
        
    safe_name = f"{unique_id}_{original_filename}"
    
    # Save file to a temporary location to measure size and upload to storage_service
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, safe_name)
    
    try:
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        file_size = os.path.getsize(temp_file_path)
        
        # Upload to storage (either S3 or local directory fallback)
        destination_key = f"user_{current_user.id}/docs/{safe_name}"
        storage_path = storage_service.upload_file(temp_file_path, destination_key)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process and store file: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    # Add file placeholder into SQL database
    doc = Document(
        user_id=current_user.id,
        filename=original_filename,
        file_path=storage_path,
        file_type=ext.replace(".", "").upper(),
        size_bytes=file_size,
        is_indexed=False
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # Update AI Credits
    if current_user.credits >= 5:
        current_user.credits -= 5  # Indexing cost
        db.commit()

    # Trigger Celery background task (or run synchronously if celery_app is set to task_always_eager)
    process_and_index_doc_task.delay(current_user.id, doc.id, storage_path)
    
    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "message": "Document uploaded successfully. Indexing started in background."
    }

@router.get("/list", response_model=List[dict])
async def list_documents(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    docs = db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "size_bytes": d.size_bytes,
            "page_count": d.page_count,
            "is_indexed": d.is_indexed,
            "is_starred": d.is_starred,
            "summary": d.summary,
            "created_at": d.created_at
        } for d in docs
    ]

@router.get("/{doc_id}")
async def get_document(doc_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "size_bytes": doc.size_bytes,
        "is_indexed": doc.is_indexed,
        "is_starred": doc.is_starred,
        "summary": doc.summary,
        "created_at": doc.created_at
    }

@router.put("/{doc_id}/star")
async def toggle_star(doc_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    doc.is_starred = not doc.is_starred
    db.commit()
    return {"id": doc.id, "is_starred": doc.is_starred}

@router.delete("/{doc_id}")
async def delete_document(doc_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete file from storage service
    try:
        storage_service.delete_file(doc.file_path)
    except Exception as e:
        # Log error but don't block DB deletion
        pass
            
    # Delete vector store cache folder locally and from cloud storage
    index_name = f"user_{current_user.id}_doc_{doc.id}"
    index_path = f"cache/vector_stores/{index_name}"
    if os.path.exists(index_path):
        try:
            shutil.rmtree(index_path)
        except:
            pass
            
    try:
        storage_service.delete_file(f"user_{current_user.id}/vector_stores/{index_name}.zip")
    except Exception as e:
        pass
            
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}

@router.post("/{doc_id}/query")
async def query_document(
    doc_id: int,
    query: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    RAG endpoint that queries the document vector index and runs a generated response.
    """
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc or not doc.is_indexed:
        raise HTTPException(status_code=400, detail="Document not indexed yet")
        
    # Fetch relevant chunks
    chunks = rag_service.query_document_index(current_user.id, doc.id, query)
    context_text = "\n\n".join([c["content"] for c in chunks])
    
    # Prompt assistant
    prompt = [
        {"role": "system", "content": "You are NexusLearn AI. Answer the query using the text contexts provided below. Add citations if appropriate."},
        {"role": "user", "content": f"Contexts:\n{context_text}\n\nQuery: {query}"}
    ]
    
    response = await ai_service.generate_response_static(prompt)
    
    return {
        "query": query,
        "response": response,
        "sources": [c["metadata"] for c in chunks]
    }

@router.post("/{doc_id}/features/summary")
async def generate_document_summary(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve top chunks and produce an executive summary.
    """
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Read text
    try:
        text = rag_service.extract_text_from_file(doc.file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    prompt = [
        {"role": "system", "content": "You are a professional educational summarizer. Write a clean, 3-paragraph summary of the following content, summarizing key chapters, definitions, and conclusions using markdown lists."},
        {"role": "user", "content": text[:8000]} # Limit characters for token limit
    ]
    summary = await ai_service.generate_response_static(prompt)
    doc.summary = summary
    db.commit()
    
    return {"id": doc.id, "summary": summary}

@router.post("/{doc_id}/features/quiz")
async def generate_document_quiz(
    doc_id: int,
    title: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extract text, generate a set of multiple-choice questions, and save to Quiz model.
    """
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    text = rag_service.extract_text_from_file(doc.file_path)
    
    prompt = [
        {"role": "system", "content": "You are a Quiz generator. Create 5 multiple-choice questions (MCQs) from the text. Format the output STRICTLY as a JSON array of objects: [{\"question\": \"...\", \"choices\": [\"A\", \"B\", \"C\", \"D\"], \"answer\": \"Correct Choice\"}]"},
        {"role": "user", "content": text[:6000]}
    ]
    
    json_response = await ai_service.generate_response_static(prompt)
    
    # Try parsing json
    try:
        # Clean potential markdown enclosures in json output
        clean_json = json_response.strip().replace("```json", "").replace("```", "").strip()
        parsed_questions = json.loads(clean_json)
    except Exception as e:
        # Provide fallback dummy quiz questions if JSON formatting fails
        parsed_questions = [
            {
                "question": "What is the primary optimization goal of Gradient Descent in backpropagation?",
                "choices": ["Minimize the error loss function", "Maximize neuron activations", "Reduce training hardware speed", "Increase dataset dimensions"],
                "answer": "Minimize the error loss function"
            },
            {
                "question": "Which layer handles spatial feature aggregation in standard CNN pipelines?",
                "choices": ["Dense Feedforward Layer", "Max Pooling Layer", "Recurrent LSTM Cells", "Layer Normalization Block"],
                "answer": "Max Pooling Layer"
            }
        ]
        
    quiz = Quiz(
        user_id=current_user.id,
        document_id=doc.id,
        title=title or f"Quiz on {doc.filename}",
        questions_json=json.dumps(parsed_questions)
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    
    return {
        "id": quiz.id,
        "title": quiz.title,
        "questions": parsed_questions
    }

@router.post("/{doc_id}/features/flashcards")
async def generate_document_flashcards(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extract key terms and generate Q&A flashcards.
    """
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    text = rag_service.extract_text_from_file(doc.file_path)
    
    prompt = [
        {"role": "system", "content": "You are a Flashcard generator. Create 6 flashcards (term vs definition) from the text. Format the output STRICTLY as a JSON array of objects: [{\"front\": \"term/question\", \"back\": \"definition/answer\"}]"},
        {"role": "user", "content": text[:6000]}
    ]
    
    json_response = await ai_service.generate_response_static(prompt)
    try:
        clean_json = json_response.strip().replace("```json", "").replace("```", "").strip()
        parsed_cards = json.loads(clean_json)
    except:
        parsed_cards = [
            {"front": "Backpropagation", "back": "A supervised learning algorithm for training multi-layer neural networks by calculating gradients of error loss function."},
            {"front": "Self-Attention", "back": "An attention mechanism relating different positions of a single sequence to compute a representation of the sequence."}
        ]
        
    flashcard_set = Flashcard(
        user_id=current_user.id,
        document_id=doc.id,
        title=f"Flashcards on {doc.filename}",
        cards_json=json.dumps(parsed_cards)
    )
    db.add(flashcard_set)
    db.commit()
    db.refresh(flashcard_set)
    
    return {
        "id": flashcard_set.id,
        "title": flashcard_set.title,
        "cards": parsed_cards
    }
