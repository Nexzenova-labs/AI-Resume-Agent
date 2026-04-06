# 🚀 AI Resume Agent

## 🧠 Overview

AI Resume Agent is a full-stack AI-powered platform that helps users:

* Build resumes using guided forms
* Customize resumes using a Canva-like editor
* Analyze resumes against Job Descriptions (ATS scoring)
* Generate multiple resumes tailored to job links
* Practice interviews with AI (text + voice-ready)
* Track job applications and resume versions

---

## 🏗 Architecture

### Frontend

* Next.js (React)
* Tailwind CSS
* Framer Motion (animations)
* Konva.js (drag & drop editor)

### Backend

* FastAPI (Python)
* Celery + Redis (background tasks)

### AI / NLP

* OpenAI API (optional)
* Open-source LLM (Llama / Qwen / Mixtral)
* spaCy (NLP)
* ChromaDB (vector DB)

### Database

* PostgreSQL (default)
* Optional: Supabase

---

## 🔐 Modes

### Guest Mode (Temporary)

* No login required
* Data deleted after session
* No saved resumes or history

### User Mode (Persistent)

* Saves resumes
* ATS reports
* Interview history

---

## ✨ Features

### 1. Resume Builder

* Form-based input
* AI suggestions (skills/tools)
* Template selection
* Resume generation

### 2. Resume Editor

* Drag & drop sections
* Text styling (bold, size, font)
* Layout customization

### 3. ATS Analyzer

* Upload JD or paste job links
* Auto-scrape JDs
* Score + suggestions

### 4. Multi Resume Generator

* Generate resume per JD
* Auto rename files

### 5. AI Interview

* Text-based (default)
* Voice-ready
* Difficulty levels
* Scoring + feedback

---

## ⚙️ Setup (Local)

### Requirements

* Node.js
* Python 3.10+
* Docker
* Redis

---

### Install frontend

```bash
cd frontend
npm install
npm run dev
```

---

### Install backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

### Run with Docker

```bash
docker-compose up --build
```

---

## 🔑 Config

All secrets go into:

```
docs/project_config.md
```

---

## 🧪 Testing

```bash
pytest
```

---

## 🚀 Deployment

* Frontend → Vercel
* Backend → AWS / Railway / Render
* DB → Supabase / PostgreSQL

---

## 📂 Project Structure

* frontend/
* backend/
* agents/
* ai/
* docs/

---

## 🤝 Contribution

Follow agent-based architecture.

---

## 📌 Notes

* Respect user privacy
* Guest mode = no storage
* Modular AI system
