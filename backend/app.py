from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os

from rag.pdf_reader import read_pdf, split_text
from rag.embedding import create_embeddings
from rag.vector_store import store_embeddings
from rag.chatbot import ask_question

from chat_history import (
    create_chat,
    add_message,
    get_all_chats,
    get_chat,
    set_uploaded_files
)

app = FastAPI(
    title="Lexora AI - Legal Research Assistant",
    description="AI-Powered Legal Case Research Assistant using RAG + Gemini",
    version="1.0.0"
)

# -------------------------------
# CORS
# -------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dashing-kitsune-c79a7a.netlify.app",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


class Question(BaseModel):
    question: str
    uploaded_files: list[str]
    chat_id: str


@app.get("/")
def home():
    return {
        "status": "Running",
        "project": "Lexora AI",
        "message": "AI-Powered Legal Research Assistant Backend is Running"
    }


# -----------------------------------
# Upload PDF
# -----------------------------------

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    try:

        file_path = os.path.join(UPLOAD_FOLDER, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = read_pdf(file_path)

        chunks = split_text(text)

        embeddings = create_embeddings(chunks)

        store_embeddings(
            chunks,
            embeddings,
            file.filename
        )

        return {
            "success": True,
            "message": "PDF uploaded successfully.",
            "filename": file.filename,
            "chunks": len(chunks)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# -----------------------------------
# Ask Question
# -----------------------------------

@app.post("/ask")
def ask(data: Question):
    try:

        # Save uploaded files inside this chat
        set_uploaded_files(
            data.chat_id,
            data.uploaded_files
        )

        answer = ask_question(
            data.question,
            uploaded_files=data.uploaded_files
        )

        add_message(
            data.chat_id,
            "user",
            data.question
        )

        add_message(
            data.chat_id,
            "assistant",
            answer
        )

        return {
            "success": True,
            "answer": answer
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# -----------------------------------
# Uploaded files
# -----------------------------------

@app.get("/uploaded-files")
def uploaded():
    return {
        "success": True
    }


# -----------------------------------
# Chat APIs
# -----------------------------------

@app.post("/new-chat")
def new_chat():

    chat_id = create_chat()

    return {
        "chat_id": chat_id
    }


@app.get("/chats")
def chats():

    return get_all_chats()


@app.get("/chat/{chat_id}")
def chat(chat_id: str):

    chat = get_chat(chat_id)

    return {
        "chat_id": chat["chat_id"],
        "title": chat["title"],
        "messages": chat["messages"],
        "uploaded_files": chat.get("uploaded_files", [])
    }