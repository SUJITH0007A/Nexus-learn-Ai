from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Table
from sqlalchemy.orm import relationship
import datetime
from api.core.database import Base

# Association Table for User achievements (Many-to-Many)
user_achievements = Table(
    'user_achievements',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('achievement_id', Integer, ForeignKey('achievements.id', ondelete='CASCADE'), primary_key=True),
    Column('unlocked_at', DateTime, default=datetime.datetime.utcnow)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True) # null for OAuth users
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    
    # Profile information
    university = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(String, nullable=True) # Comma-separated or JSON
    preferences = Column(Text, nullable=True) # JSON settings
    learning_goals = Column(Text, nullable=True) # JSON goals
    
    # Gamification
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    credits = Column(Integer, default=100) # AI credit tokens
    
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    folders = relationship("Folder", back_populates="user", cascade="all, delete-orphan")
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="user", cascade="all, delete-orphan")
    flashcards = relationship("Flashcard", back_populates="user", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    interviews = relationship("MockInterview", back_populates="user", cascade="all, delete-orphan")
    snippets = relationship("CodeSnippet", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("Achievement", secondary=user_achievements, back_populates="users")

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token = Column(String, unique=True, index=True, nullable=False)
    device_info = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="sessions")

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="folders")
    chats = relationship("Chat", back_populates="folder")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    size_bytes = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    is_indexed = Column(Boolean, default=False)
    is_starred = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="documents")
    quizzes = relationship("Quiz", back_populates="document")
    flashcards = relationship("Flashcard", back_populates="document")

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, default="New Conversation")
    is_pinned = Column(Boolean, default=False)
    model_name = Column(String, default="gpt-4o")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="chats")
    folder = relationship("Folder", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String, nullable=False) # "user" or "assistant"
    content = Column(Text, nullable=False)
    model_used = Column(String, nullable=True)
    reaction = Column(String, nullable=True) # "like", "dislike", or null
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    chat = relationship("Chat", back_populates="messages")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    score = Column(Float, default=0.0)
    accuracy = Column(Float, default=0.0)
    questions_json = Column(Text, nullable=False) # JSON list of questions, answers, choices
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="quizzes")
    document = relationship("Document", back_populates="quizzes")

class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    cards_json = Column(Text, nullable=False) # JSON list of front/back flashcards
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="flashcards")
    document = relationship("Document", back_populates="flashcards")

class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    schedule_json = Column(Text, nullable=False) # Calendar schedules & countdowns
    goals_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="study_plans")

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=False)
    badge_url = Column(String, nullable=True)
    xp_value = Column(Integer, default=50)

    users = relationship("User", secondary=user_achievements, back_populates="achievements")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False) # "reminder", "quiz", "doc_processed", "achievement"
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class MockInterview(Base):
    __tablename__ = "mock_interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    difficulty = Column(String, nullable=False) # "junior", "mid", "senior"
    interview_type = Column(String, nullable=False) # "technical", "coding", "behavioral"
    transcripts_json = Column(Text, nullable=True) # QA log of exchange
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    timer_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="interviews")

class CodeSnippet(Base):
    __tablename__ = "code_snippets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    language = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="snippets")
