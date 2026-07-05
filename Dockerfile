# Multi-stage Dockerfile for NexusLearn AI

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
ENV NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
RUN npm run build

# Stage 2: Setup Python Backend
FROM python:3.10-slim AS backend
WORKDIR /app/backend

# Install system dependencies (including Tesseract OCR)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    tesseract-ocr \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/

# Expose backend port
EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
