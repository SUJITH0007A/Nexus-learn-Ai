import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Redis URL configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "nexuslearn_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Configuration updates
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_always_eager=os.getenv("CELERY_ALWAYS_EAGER", "True") == "True"  # Default True for easy development, run sync
)

# Background tasks definitions
@celery_app.task(name="process_and_index_doc_task")
def process_and_index_doc_task(user_id: int, document_id: int, file_path: str):
    """
    Background worker task to extract, split, and embed documents.
    """
    from api.services.rag_service import rag_service
    from api.core.database import SessionLocal
    from api.models.schemas import Document, Notification
    
    db = SessionLocal()
    try:
        # Index document
        indexing_result = rag_service.process_and_index_document(user_id, document_id, file_path)
        
        # Update database document status
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.is_indexed = True
            doc.summary = indexing_result["preview_summary"]
            doc.size_bytes = os.path.getsize(file_path)
            db.commit()
            
        # Create user notification
        notif = Notification(
            user_id=user_id,
            type="doc_processed",
            title="Document Processed",
            message=f"Your file '{os.path.basename(file_path)}' is fully indexed and ready for AI query."
        )
        db.add(notif)
        db.commit()
        return f"Document {document_id} processed successfully."
    except Exception as e:
        db.rollback()
        # Create error notification
        notif = Notification(
            user_id=user_id,
            type="reminder",
            title="Processing Failed",
            message=f"Failed to process '{os.path.basename(file_path)}': {str(e)}"
        )
        db.add(notif)
        db.commit()
        raise e
    finally:
        db.close()
