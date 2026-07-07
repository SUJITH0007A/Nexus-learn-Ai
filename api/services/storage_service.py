import os
import shutil
import tempfile
import zipfile
import logging
from typing import Union, BinaryIO
import boto3
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("storage_service")

# Storage Configurations
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_REGION_NAME = os.getenv("S3_REGION_NAME", "auto")

# Check if S3 is configured
USE_S3 = all([S3_ENDPOINT_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME])

if USE_S3:
    logger.info("Using S3-compatible cloud storage for file uploads.")
    s3_client = boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=S3_ACCESS_KEY_ID,
        aws_secret_access_key=S3_SECRET_ACCESS_KEY,
        region_name=S3_REGION_NAME,
        config=Config(signature_version="s3v4")
    )
else:
    logger.warning("S3 credentials not fully configured. Falling back to local filesystem storage.")
    s3_client = None

LOCAL_UPLOAD_DIR = os.getenv("UPLOAD_DIRECTORY", "uploads")
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)


class StorageService:
    def is_cloud_enabled(self) -> bool:
        return USE_S3

    def upload_file(self, file_source: Union[str, BinaryIO], destination_key: str) -> str:
        """
        Uploads a local file or binary file object to Cloud Storage (or saves locally if offline).
        Returns the path/key where it was saved.
        """
        destination_key = destination_key.replace("\\", "/") # Normalize path separators
        
        if USE_S3:
            try:
                if isinstance(file_source, str):
                    s3_client.upload_file(file_source, S3_BUCKET_NAME, destination_key)
                else:
                    # Seek to start just in case
                    file_source.seek(0)
                    s3_client.upload_fileobj(file_source, S3_BUCKET_NAME, destination_key)
                logger.info(f"Successfully uploaded {destination_key} to cloud storage.")
                return destination_key
            except Exception as e:
                logger.error(f"Failed to upload file to cloud storage: {str(e)}")
                raise e
        else:
            # Local fallback
            local_path = os.path.join(LOCAL_UPLOAD_DIR, os.path.basename(destination_key))
            if isinstance(file_source, str):
                if file_source != local_path:
                    shutil.copy2(file_source, local_path)
            else:
                file_source.seek(0)
                with open(local_path, "wb") as f:
                    shutil.copyfileobj(file_source, f)
            logger.info(f"Successfully saved {local_path} locally.")
            return local_path

    def download_file(self, object_key: str, local_destination_path: str) -> str:
        """
        Downloads an object from Cloud Storage to a local file path.
        """
        object_key = object_key.replace("\\", "/")
        
        if USE_S3:
            try:
                os.makedirs(os.path.dirname(local_destination_path), exist_ok=True)
                s3_client.download_file(S3_BUCKET_NAME, object_key, local_destination_path)
                logger.info(f"Downloaded cloud file {object_key} to {local_destination_path}.")
                return local_destination_path
            except Exception as e:
                logger.error(f"Failed to download cloud file {object_key}: {str(e)}")
                raise e
        else:
            # Local fallback
            if os.path.exists(object_key):
                if object_key != local_destination_path:
                    os.makedirs(os.path.dirname(local_destination_path), exist_ok=True)
                    shutil.copy2(object_key, local_destination_path)
                return local_destination_path
            
            # Check in uploads dir if only filename is provided
            fallback_path = os.path.join(LOCAL_UPLOAD_DIR, os.path.basename(object_key))
            if os.path.exists(fallback_path):
                if fallback_path != local_destination_path:
                    os.makedirs(os.path.dirname(local_destination_path), exist_ok=True)
                    shutil.copy2(fallback_path, local_destination_path)
                return local_destination_path
                
            raise FileNotFoundError(f"Local file not found at {object_key} or {fallback_path}")

    def upload_directory_as_zip(self, local_dir_path: str, destination_key: str) -> str:
        """
        Zips a directory and uploads it to cloud storage.
        """
        destination_key = destination_key.replace("\\", "/")
        if not destination_key.endswith(".zip"):
            destination_key += ".zip"
            
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_zip:
            tmp_zip_path = tmp_zip.name
            
        try:
            # Create zip
            with zipfile.ZipFile(tmp_zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for root, _, files in os.walk(local_dir_path):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, local_dir_path)
                        zipf.write(full_path, rel_path)
            
            # Upload zip
            self.upload_file(tmp_zip_path, destination_key)
            return destination_key
        finally:
            if os.path.exists(tmp_zip_path):
                os.remove(tmp_zip_path)

    def download_and_extract_zip(self, object_key: str, local_destination_dir: str):
        """
        Downloads a zip file from cloud storage and extracts it to a local directory.
        """
        object_key = object_key.replace("\\", "/")
        if not object_key.endswith(".zip"):
            object_key += ".zip"

        # Check local fallback first
        if not USE_S3:
            local_zip_path = os.path.join(LOCAL_UPLOAD_DIR, os.path.basename(object_key))
            if os.path.exists(local_zip_path):
                os.makedirs(local_destination_dir, exist_ok=True)
                with zipfile.ZipFile(local_zip_path, "r") as zipf:
                    zipf.extractall(local_destination_dir)
                return
            
            # If directory itself exists locally in vector stores path, we can just load it directly.
            # No zip extraction needed.
            return

        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_zip:
            tmp_zip_path = tmp_zip.name

        try:
            self.download_file(object_key, tmp_zip_path)
            os.makedirs(local_destination_dir, exist_ok=True)
            with zipfile.ZipFile(tmp_zip_path, "r") as zipf:
                zipf.extractall(local_destination_dir)
            logger.info(f"Successfully extracted {object_key} to {local_destination_dir}.")
        except Exception as e:
            logger.error(f"Failed to extract zip file {object_key}: {str(e)}")
            raise e
        finally:
            if os.path.exists(tmp_zip_path):
                os.remove(tmp_zip_path)

    def delete_file(self, object_key: str):
        """
        Deletes a file from storage.
        """
        object_key = object_key.replace("\\", "/")
        if USE_S3:
            try:
                s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=object_key)
                logger.info(f"Deleted {object_key} from cloud storage.")
            except Exception as e:
                logger.error(f"Failed to delete cloud file {object_key}: {str(e)}")
        else:
            if os.path.exists(object_key):
                os.remove(object_key)
            else:
                fallback_path = os.path.join(LOCAL_UPLOAD_DIR, os.path.basename(object_key))
                if os.path.exists(fallback_path):
                    os.remove(fallback_path)


storage_service = StorageService()
