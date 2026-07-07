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
    from api.services.storage_service import storage_service
    import tempfile
    
    db = SessionLocal()
    temp_local_file = None
    try:
        # Determine if file_path is remote and download it if necessary
        if storage_service.is_cloud_enabled():
            temp_dir = tempfile.gettempdir()
            filename = os.path.basename(file_path)
            temp_local_file = os.path.join(temp_dir, filename)
            storage_service.download_file(file_path, temp_local_file)
            local_processing_path = temp_local_file
        else:
            local_processing_path = file_path

        # Index document locally
        indexing_result = rag_service.process_and_index_document(user_id, document_id, local_processing_path)
        
        # If cloud storage is enabled, zip and upload the generated FAISS index to the cloud
        if storage_service.is_cloud_enabled():
            index_name = indexing_result["index_name"]
            local_index_path = os.path.join("cache/vector_stores", index_name)
            destination_zip_key = f"user_{user_id}/vector_stores/{index_name}.zip"
            storage_service.upload_directory_as_zip(local_index_path, destination_zip_key)

        # Update database document status
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.is_indexed = True
            doc.summary = indexing_result["preview_summary"]
            if os.path.exists(local_processing_path):
                doc.size_bytes = os.path.getsize(local_processing_path)
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
        # Cleanup temp file
        if temp_local_file and os.path.exists(temp_local_file):
            try:
                os.remove(temp_local_file)
            except:
                pass
