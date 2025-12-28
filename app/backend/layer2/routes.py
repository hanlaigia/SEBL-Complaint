"""
Layer 2 - Complaint Priority Classification

This module processes uploaded complaint datasets and classifies each complaint
based on risk codes and priority scoring (Impact, Urgency, Frequency, Controllability).

Priority Score Formula: PS = (Impact × Urgency × Frequency) / Controllability

Priority Levels:
- Critical (P1): PS ≥ 60 → Immediate action (within 4 hours)
- High (P2): 40 ≤ PS < 60 → Action within 24 hours
- Medium (P3): 20 ≤ PS < 40 → Action within 3 days
- Low (P4): PS < 20 → Routine handling (within 7 days)
"""

import os
import io
import csv
import json
import uuid
import hashlib
import asyncio
from typing import Optional
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

from .prompts import get_classification_prompt, SYSTEM_PROMPT

# Load environment variables
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Data directory for reference tables
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Create router for Layer 2
router = APIRouter()

# In-memory storage for sessions and cache
sessions = {}
classification_cache = {}  # Cache for complaint classifications


def load_csv_table(filename: str) -> list:
    """Load a CSV table from the data directory"""
    with open(DATA_DIR / filename, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


# Load reference tables
TABLE8 = load_csv_table("table8_impact_scale.csv")
TABLE9 = load_csv_table("table9_urgency_scale.csv")
TABLE10 = load_csv_table("table10_frequency_scale.csv")
TABLE11 = load_csv_table("table11_controllability_scale.csv")


class ProcessingSession:
    """Manages a complaint processing session"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at = datetime.now()
        self.complaints = []
        self.risk_table = []
        self.results = []
        self.status = "pending"  # pending, processing, completed, error
        self.total_rows = 0
        self.processed_rows = 0
        self.start_time = None
        self.end_time = None
        self.error_message = None
        self.model = genai.GenerativeModel("gemini-2.5-flash")
    
    def get_progress(self) -> dict:
        """Get current processing progress"""
        elapsed = 0
        if self.start_time:
            end = self.end_time or datetime.now()
            elapsed = (end - self.start_time).total_seconds()
        
        return {
            "status": self.status,
            "total_rows": self.total_rows,
            "processed_rows": self.processed_rows,
            "elapsed_seconds": round(elapsed, 1),
            "error_message": self.error_message
        }
    
    def get_cache_key(self, complaint: str) -> str:
        """Generate a cache key for a complaint"""
        # Include risk table hash to invalidate cache when table changes
        risk_table_str = json.dumps(self.risk_table, sort_keys=True)
        combined = f"{complaint}|{risk_table_str}"
        return hashlib.md5(combined.encode()).hexdigest()
    
    async def classify_complaint(self, complaint: str) -> dict:
        """Classify a single complaint using LLM with caching"""
        cache_key = self.get_cache_key(complaint)
        
        # Check cache first
        if cache_key in classification_cache:
            return classification_cache[cache_key]
        
        # Generate classification using LLM
        prompt = get_classification_prompt(
            complaint, 
            self.risk_table, 
            TABLE8, TABLE9, TABLE10, TABLE11
        )
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean up response if wrapped in markdown
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            result = json.loads(response_text)
            
            # Validate and ensure all scores are integers 1-5
            result["impact_score"] = max(1, min(5, int(result.get("impact_score", 3))))
            result["urgency_score"] = max(1, min(5, int(result.get("urgency_score", 3))))
            result["frequency_score"] = max(1, min(5, int(result.get("frequency_score", 3))))
            result["controllability_score"] = max(1, min(5, int(result.get("controllability_score", 3))))
            
            # Cache the result
            classification_cache[cache_key] = result
            
            return result
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            # Return default values on error
            return {
                "risk_code": "ER-03",
                "risk_description": "Unable to classify",
                "impact_score": 3,
                "urgency_score": 3,
                "frequency_score": 3,
                "controllability_score": 3
            }
    
    def calculate_priority(self, impact: int, urgency: int, frequency: int, controllability: int) -> tuple:
        """Calculate priority score and level"""
        # PS = (Impact × Urgency × Frequency) / Controllability
        priority_score = (impact * urgency * frequency) / controllability
        priority_score = round(priority_score, 2)
        
        # Determine priority level
        if priority_score >= 60:
            priority_level = "P1 - Critical"
        elif priority_score >= 40:
            priority_level = "P2 - High"
        elif priority_score >= 20:
            priority_level = "P3 - Medium"
        else:
            priority_level = "P4 - Low"
        
        return priority_score, priority_level
    
    async def process_complaints(self):
        """Process all complaints in the session"""
        self.status = "processing"
        self.start_time = datetime.now()
        self.results = []
        
        try:
            for i, complaint in enumerate(self.complaints):
                # Classify the complaint
                classification = await self.classify_complaint(complaint)
                
                # Calculate priority
                priority_score, priority_level = self.calculate_priority(
                    classification["impact_score"],
                    classification["urgency_score"],
                    classification["frequency_score"],
                    classification["controllability_score"]
                )
                
                # Build result row
                result = {
                    "complaint": complaint,
                    "risk_code": classification["risk_code"],
                    "risk_description": classification["risk_description"],
                    "impact_score": classification["impact_score"],
                    "urgency_score": classification["urgency_score"],
                    "frequency_score": classification["frequency_score"],
                    "controllability_score": classification["controllability_score"],
                    "priority_score": priority_score,
                    "priority_level": priority_level
                }
                
                self.results.append(result)
                self.processed_rows = i + 1
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.1)
            
            self.status = "completed"
            self.end_time = datetime.now()
            
        except Exception as e:
            self.status = "error"
            self.error_message = str(e)
            self.end_time = datetime.now()
    
    async def reprocess_with_feedback(self, feedback: str):
        """Reprocess complaints with user feedback guidance"""
        self.status = "processing"
        self.start_time = datetime.now()
        self.results = []
        
        # Build feedback context for the prompt
        feedback_context = f"\nUser Feedback: {feedback}\n"
        feedback_context += "Please use this feedback to adjust your scoring and classifications when re-analyzing the complaints."
        
        try:
            for i, complaint in enumerate(self.complaints):
                # Classify with feedback context
                cache_key = self.get_cache_key(complaint)
                
                # Clear cache for this complaint so it gets reclassified
                if cache_key in classification_cache:
                    del classification_cache[cache_key]
                
                # Generate classification using LLM with feedback
                prompt = get_classification_prompt(
                    complaint, 
                    self.risk_table, 
                    TABLE8, TABLE9, TABLE10, TABLE11
                ) + feedback_context
                
                try:
                    response = self.model.generate_content(prompt)
                    response_text = response.text.strip()
                    
                    # Clean up response if wrapped in markdown
                    if response_text.startswith("```json"):
                        response_text = response_text[7:]
                    if response_text.startswith("```"):
                        response_text = response_text[3:]
                    if response_text.endswith("```"):
                        response_text = response_text[:-3]
                    response_text = response_text.strip()
                    
                    result = json.loads(response_text)
                    
                    # Validate and ensure all scores are integers 1-5
                    result["impact_score"] = max(1, min(5, int(result.get("impact_score", 3))))
                    result["urgency_score"] = max(1, min(5, int(result.get("urgency_score", 3))))
                    result["frequency_score"] = max(1, min(5, int(result.get("frequency_score", 3))))
                    result["controllability_score"] = max(1, min(5, int(result.get("controllability_score", 3))))
                    
                except (json.JSONDecodeError, KeyError, ValueError) as e:
                    result = {
                        "risk_code": "ER-03",
                        "risk_description": "Unable to classify",
                        "impact_score": 3,
                        "urgency_score": 3,
                        "frequency_score": 3,
                        "controllability_score": 3
                    }
                
                # Calculate priority
                priority_score, priority_level = self.calculate_priority(
                    result["impact_score"],
                    result["urgency_score"],
                    result["frequency_score"],
                    result["controllability_score"]
                )
                
                # Build result row
                result_row = {
                    "complaint": complaint,
                    "risk_code": result["risk_code"],
                    "risk_description": result["risk_description"],
                    "impact_score": result["impact_score"],
                    "urgency_score": result["urgency_score"],
                    "frequency_score": result["frequency_score"],
                    "controllability_score": result["controllability_score"],
                    "priority_score": priority_score,
                    "priority_level": priority_level
                }
                
                self.results.append(result_row)
                self.processed_rows = i + 1
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.1)
            
            self.status = "completed"
            self.end_time = datetime.now()
            
        except Exception as e:
            self.status = "error"
            self.error_message = str(e)
            self.end_time = datetime.now()


# Pydantic models
class UploadResponse(BaseModel):
    session_id: str
    complaints_count: int
    risk_table_loaded: bool
    message: str


class ProgressResponse(BaseModel):
    status: str
    total_rows: int
    processed_rows: int
    elapsed_seconds: float
    error_message: Optional[str] = None


class RegenerateRequest(BaseModel):
    feedback: str


@router.get("/")
async def layer2_root():
    """Layer 2 health check"""
    return {
        "layer": 2,
        "status": "active",
        "service": "Complaint Priority Classification"
    }


@router.post("/upload", response_model=UploadResponse)
async def upload_files(
    complaints_file: UploadFile = File(...),
    risk_table_file: UploadFile = File(...)
):
    """
    Upload complaints CSV and risk table CSV for processing.
    
    - complaints_file: CSV with single column containing complaints
    - risk_table_file: CSV from Layer 1 output (Risk Code, Impact Score, Description)
    """
    # Create new session
    session_id = str(uuid.uuid4())
    session = ProcessingSession(session_id)
    
    try:
        # Parse complaints CSV
        complaints_content = await complaints_file.read()
        complaints_text = complaints_content.decode("utf-8")
        complaints_reader = csv.reader(io.StringIO(complaints_text))
        
        # Skip header if present and extract complaints
        rows = list(complaints_reader)
        if rows:
            # Check if first row looks like a header (common header names)
            first_row = rows[0][0].lower().strip() if rows[0] else ""
            header_keywords = [
                "complaint", "text", "message", "review", "comment", 
                "feedback", "description", "content", "negative", "issue",
                "problem", "concern", "note", "remark", "observation"
            ]
            # Skip first row if it contains any header keyword or is very short (likely a label)
            if any(keyword in first_row for keyword in header_keywords) or (len(first_row) < 30 and not any(c.isdigit() for c in first_row)):
                rows = rows[1:]
            
            session.complaints = [row[0].strip() for row in rows if row and row[0].strip()]
        
        session.total_rows = len(session.complaints)
        
        # Parse risk table CSV
        risk_content = await risk_table_file.read()
        risk_text = risk_content.decode("utf-8")
        risk_reader = csv.DictReader(io.StringIO(risk_text))
        session.risk_table = list(risk_reader)
        
        # Store session
        sessions[session_id] = session
        
        return UploadResponse(
            session_id=session_id,
            complaints_count=session.total_rows,
            risk_table_loaded=len(session.risk_table) > 0,
            message=f"Successfully uploaded {session.total_rows} complaints and risk table with {len(session.risk_table)} entries"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing files: {str(e)}")


@router.post("/process/{session_id}")
async def start_processing(session_id: str, background_tasks: BackgroundTasks):
    """
    Start processing complaints for a session.
    Processing runs in the background - poll /progress/{session_id} for status.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    if session.status == "processing":
        raise HTTPException(status_code=400, detail="Processing already in progress")
    
    if not session.complaints:
        raise HTTPException(status_code=400, detail="No complaints to process")
    
    if not session.risk_table:
        raise HTTPException(status_code=400, detail="No risk table loaded")
    
    # Start background processing
    background_tasks.add_task(session.process_complaints)
    
    return {
        "message": "Processing started",
        "session_id": session_id,
        "total_rows": session.total_rows
    }


@router.get("/progress/{session_id}", response_model=ProgressResponse)
async def get_progress(session_id: str):
    """Get processing progress for a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    progress = session.get_progress()
    
    return ProgressResponse(**progress)


@router.get("/results/{session_id}")
async def get_results(session_id: str):
    """Get processing results for a completed session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    if session.status != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Processing not complete. Current status: {session.status}"
        )
    
    return {
        "session_id": session_id,
        "total_processed": len(session.results),
        "results": session.results,
        "processing_time_seconds": round((session.end_time - session.start_time).total_seconds(), 1)
    }


@router.get("/download/{session_id}")
async def download_results(session_id: str):
    """Download processing results as CSV"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    if session.status != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Processing not complete. Current status: {session.status}"
        )
    
    # Build CSV content
    output = io.StringIO()
    fieldnames = [
        "Complaint", "Risk Code", "Risk Description", 
        "Impact Score", "Urgency Score", "Frequency Score", "Controllability Score",
        "Priority Score", "Priority Level"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for result in session.results:
        writer.writerow({
            "Complaint": result["complaint"],
            "Risk Code": result["risk_code"],
            "Risk Description": result["risk_description"],
            "Impact Score": result["impact_score"],
            "Urgency Score": result["urgency_score"],
            "Frequency Score": result["frequency_score"],
            "Controllability Score": result["controllability_score"],
            "Priority Score": result["priority_score"],
            "Priority Level": result["priority_level"]
        })
    
    output.seek(0)
    filename = f"priority_classification_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and its data"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    del sessions[session_id]
    return {"success": True, "message": "Session deleted"}


@router.post("/regenerate/{session_id}")
async def regenerate_results(session_id: str, request: RegenerateRequest, background_tasks: BackgroundTasks):
    """
    Regenerate classification results based on user feedback.
    Reprocesses all complaints with feedback guidance.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    if not session.results:
        raise HTTPException(status_code=400, detail="No results to regenerate")
    
    if not request.feedback.strip():
        raise HTTPException(status_code=400, detail="Please provide feedback")
    
    # Start background reprocessing
    background_tasks.add_task(session.reprocess_with_feedback, request.feedback)
    
    return {
        "message": "Regenerating results with feedback",
        "session_id": session_id,
        "feedback": request.feedback
    }


@router.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    return {
        "cached_classifications": len(classification_cache),
        "active_sessions": len(sessions)
    }


@router.delete("/cache/clear")
async def clear_cache():
    """Clear the classification cache"""
    classification_cache.clear()
    return {"success": True, "message": "Cache cleared"}
