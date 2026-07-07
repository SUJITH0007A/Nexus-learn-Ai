import os
import sys

# Add parent directory of 'api' and 'api' directory itself to python path to resolve all import patterns
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.core.database import engine, Base
from api.routers import auth, chat, document, planner, interview, codelab, gamification, admin

# Create SQL databases/tables on application start
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NexusLearn AI API", version="1.0.0")

origins = [
    "http://localhost:3000",
    "http://localhost:3000/",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint (handles GET and HEAD for cloud health checks)
@app.api_route("/", methods=["GET", "HEAD"])
async def read_root():
    return {"message": "Welcome to the NexusLearn AI Premium SaaS API!"}

# Register SaaS Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(document.router, prefix="/api/documents", tags=["Document Vault"])
app.include_router(planner.router, prefix="/api/planner", tags=["Study Planner"])
app.include_router(interview.router, prefix="/api/interview", tags=["Interview Prep"])
app.include_router(codelab.router, prefix="/api/codelab", tags=["Code Lab"])
app.include_router(gamification.router, prefix="/api/analytics", tags=["Gamification & Analytics"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin Panel"])

# Legacy / simple fallback routers (disabled to prevent legacy package conflicts)
# app.include_router(interaction.router, prefix="/api/interaction", tags=["Legacy Interaction"])
# app.include_router(rag.router, prefix="/api/rag", tags=["Legacy RAG"])
# app.include_router(web_search.router, prefix="/api/web-search", tags=["Legacy Web Search"])

