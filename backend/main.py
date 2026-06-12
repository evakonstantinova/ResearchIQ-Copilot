from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import fitz  # PyMuPDF
import os
import uuid

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="ResearchIQ Copilot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
     ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

papers = {}


class AskRequest(BaseModel):
    paper_id: str
    question: str


class SummaryRequest(BaseModel):
    paper_id: str


def extract_pdf_text(file_bytes: bytes) -> str:
    text = ""

    with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
        for page in pdf:
            text += page.get_text() + "\n"

    return text.strip()


def trim_text(text: str, max_chars: int = 45000) -> str:
    if len(text) <= max_chars:
        return text

    start = text[:18000]
    middle_start = len(text) // 2
    middle = text[middle_start:middle_start + 12000]
    end = text[-15000:]

    return start + "\n\n[...middle section...]\n\n" + middle + "\n\n[...ending section...]\n\n" + end


@app.get("/")
def home():
    return {"message": "ResearchIQ Copilot backend is running"}


@app.post("/upload-paper")
async def upload_paper(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    text = extract_pdf_text(file_bytes)

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from this PDF."
        )

    paper_id = str(uuid.uuid4())

    papers[paper_id] = {
        "filename": file.filename,
        "text": text
    }

    return {
        "paper_id": paper_id,
        "filename": file.filename,
        "characters_extracted": len(text),
        "message": "Paper uploaded and processed successfully."
    }


@app.post("/ask-paper")
async def ask_paper(request: AskRequest):
    if request.paper_id not in papers:
        raise HTTPException(status_code=404, detail="Paper not found.")

    paper_text = trim_text(papers[request.paper_id]["text"])

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """
You are ResearchIQ Copilot, an academic research assistant.

Answer questions ONLY using the uploaded research paper text.
If the answer is not clearly stated in the paper, say:
"Not clearly stated in the uploaded paper."

You can:
- explain the research aim
- explain methodology
- identify dataset/sample
- extract metrics
- create tables when asked
- summarize findings
- explain limitations
- identify research gaps
- compare sections of the paper

Do not invent citations, results, authors, datasets, journals, or statistics.
"""
            },
            {
                "role": "user",
                "content": f"""
Uploaded paper text:
{paper_text}

User question:
{request.question}
"""
            }
        ],
        temperature=0.2,
    )

    return {
        "answer": response.choices[0].message.content
    }


@app.post("/generate-summary")
async def generate_summary(request: SummaryRequest):
    if request.paper_id not in papers:
        raise HTTPException(status_code=404, detail="Paper not found.")

    paper_text = trim_text(papers[request.paper_id]["text"])

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """
You are ResearchIQ Copilot, an academic research assistant.

Create a clear structured summary of the uploaded research paper.
Use only information from the uploaded paper.
Do not invent missing details.

If something is missing, write "Not clearly stated."
"""
            },
            {
                "role": "user",
                "content": f"""
Create a structured research paper summary with these sections:

1. Paper Title
2. Research Aim
3. Research Problem
4. Dataset / Sample
5. Methodology
6. AI / Technical Model Used
7. Key Metrics
8. Key Results
9. Limitations
10. Research Gap
11. Clinical / Practical Relevance
12. Overall Summary

Paper text:
{paper_text}
"""
            }
        ],
        temperature=0.2,
    )

    return {
        "summary": response.choices[0].message.content
    }