import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL URL or fallback to SQLite locally
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nexuslearn.db")

# If SQLite is used, ensure we allow multithreading access
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Dependency to obtain database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
