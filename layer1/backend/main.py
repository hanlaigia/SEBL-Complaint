"""
Complaint Dataset Generator Agent Backend

This FastAPI backend powers an AI agent that helps generate domain-specific 
complaint datasets for customer support systems. It uses Google Gemini 2.5 Flash
to interactively gather business details and generate tailored complaint examples.

Architecture:
- FastAPI server with CORS enabled for React frontend
- Session-based conversation management (in-memory, resets on server restart)
- Google Gemini API integration for intelligent conversation and generation
- CSV generation and download capabilities
"""

import os
import sys
import json
import csv
import io
import uuid
import traceback
from typing import Optional
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

from prompts import get_system_prompt, get_generation_prompt, get_regeneration_prompt, SYSTEM_ACKNOWLEDGMENT

# Load environment variables from root .env
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Data directory for reference tables
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

app = FastAPI(
    title="Complaint Dataset Generator Agent",
    description="AI-powered agent for generating domain-specific complaint datasets",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage (resets on server restart)
sessions = {}

# Load reference tables
def load_table1():
    """Load the four-tier risk classification taxonomy"""
    with open(DATA_DIR / "table1_four-tier_risk_classification_taxonomy.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)

def load_table2():
    """Load the risk subcategory taxonomy with universal patterns"""
    with open(DATA_DIR / "table2_risk_subcategory_taxonomy_with_universal_patterns.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)

TABLE1 = load_table1()
TABLE2 = load_table2()


# Pydantic models
class MessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: str

class MessageResponse(BaseModel):
    session_id: str
    response: str
    checklist: dict
    is_ready_to_generate: bool
    dataset_available: bool

class RegenerateRequest(BaseModel):
    feedback: str

class Session:
    """Manages conversation state and data collection for a single user session"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at = datetime.now()
        self.conversation_history = []
        self.collected_data = {
            "industry": None,
            "business_description": None,
            "target_customers": None,
            "main_products_services": None,
            "common_pain_points": None,
            "specific_terminology": None
        }
        self.generated_dataset = None
        self.dataset_iterations = []  # Track all dataset versions
        self.feedback_history = []  # Track all feedback provided
        self.current_iteration = 0  # Counter for regenerations
        self.model = genai.GenerativeModel("gemini-2.5-flash")
    
    def get_checklist(self) -> dict:
        """Return the current status of data collection checklist"""
        return {
            "industry": {
                "collected": self.collected_data["industry"] is not None,
                "value": self.collected_data["industry"],
                "description": "Industry/Domain Type"
            },
            "business_description": {
                "collected": self.collected_data["business_description"] is not None,
                "value": self.collected_data["business_description"],
                "description": "Business Description"
            },
            "target_customers": {
                "collected": self.collected_data["target_customers"] is not None,
                "value": self.collected_data["target_customers"],
                "description": "Target Customer Profile"
            },
            "main_products_services": {
                "collected": self.collected_data["main_products_services"] is not None,
                "value": self.collected_data["main_products_services"],
                "description": "Main Products/Services"
            },
            "common_pain_points": {
                "collected": self.collected_data["common_pain_points"] is not None,
                "value": self.collected_data["common_pain_points"],
                "description": "Common Customer Pain Points"
            },
            "specific_terminology": {
                "collected": self.collected_data["specific_terminology"] is not None,
                "value": self.collected_data["specific_terminology"],
                "description": "Industry-Specific Terminology"
            }
        }
    
    def is_data_complete(self) -> bool:
        """Check if all required data has been collected"""
        required_fields = ["industry", "business_description", "target_customers", "main_products_services"]
        return all(self.collected_data.get(field) is not None for field in required_fields)

    async def process_message(self, user_message: str) -> str:
        """Process a user message and return the agent's response"""
        self.conversation_history.append({
            "role": "user",
            "parts": [user_message]
        })
        
        # Build the chat with system prompt and history
        system_prompt = get_system_prompt(TABLE1, TABLE2, self.get_checklist())
        chat = self.model.start_chat(history=[
            {"role": "user", "parts": [system_prompt]},
            {"role": "model", "parts": [SYSTEM_ACKNOWLEDGMENT]},
            *self.conversation_history[:-1]  # Previous history
        ])
        
        # Send the current message
        response = chat.send_message(user_message)
        response_text = response.text
        
        # Extract JSON data from response
        try:
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_str = response_text[json_start:json_end].strip()
                extracted = json.loads(json_str)
                
                # Update collected data
                if "extracted_data" in extracted:
                    for key, value in extracted["extracted_data"].items():
                        if value is not None and key in self.collected_data:
                            self.collected_data[key] = value
                
                # Remove JSON block from response for cleaner display
                response_text = response_text[:response_text.find("```json")].strip()
        except (json.JSONDecodeError, ValueError):
            pass
        
        self.conversation_history.append({
            "role": "model",
            "parts": [response_text]
        })
        
        return response_text

    async def generate_dataset(self) -> str:
        """Generate the complaint dataset based on collected information"""
        if not self.is_data_complete():
            return None
        
        generation_prompt = get_generation_prompt(self.collected_data, TABLE1, TABLE2)

        response = self.model.generate_content(generation_prompt)
        csv_content = response.text.strip()
        
        # Clean up the response if it contains markdown code blocks
        if "```csv" in csv_content:
            csv_content = csv_content.split("```csv")[1].split("```")[0].strip()
        elif "```" in csv_content:
            csv_content = csv_content.split("```")[1].split("```")[0].strip()
        
        self.generated_dataset = csv_content
        self.dataset_iterations.append({
            "iteration": self.current_iteration,
            "dataset": csv_content,
            "feedback": None,
            "timestamp": datetime.now().isoformat()
        })
        return csv_content

    async def regenerate_dataset(self, feedback: str) -> str:
        """Regenerate the dataset based on user feedback"""
        if not self.is_data_complete():
            return None
        
        # Store the previous dataset before regenerating
        previous_dataset = self.generated_dataset
        
        # Store the feedback
        self.feedback_history.append({
            "iteration": self.current_iteration,
            "feedback": feedback,
            "timestamp": datetime.now().isoformat()
        })
        
        # Increment iteration counter
        self.current_iteration += 1
        
        # Get regeneration prompt with feedback and previous dataset
        regeneration_prompt = get_regeneration_prompt(self.collected_data, TABLE1, TABLE2, feedback, previous_dataset)
        
        response = self.model.generate_content(regeneration_prompt)
        csv_content = response.text.strip()
        
        # Clean up the response if it contains markdown code blocks
        if "```csv" in csv_content:
            csv_content = csv_content.split("```csv")[1].split("```")[0].strip()
        elif "```" in csv_content:
            csv_content = csv_content.split("```")[1].split("```")[0].strip()
        
        self.generated_dataset = csv_content
        self.dataset_iterations.append({
            "iteration": self.current_iteration,
            "dataset": csv_content,
            "feedback": feedback,
            "timestamp": datetime.now().isoformat()
        })
        return csv_content


def get_or_create_session(session_id: Optional[str]) -> Session:
    """Get existing session or create new one"""
    if session_id and session_id in sessions:
        return sessions[session_id]
    
    new_id = str(uuid.uuid4())
    sessions[new_id] = Session(new_id)
    return sessions[new_id]


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Complaint Dataset Generator Agent"}


@app.post("/chat", response_model=MessageResponse)
async def chat(request: MessageRequest):
    """
    Main chat endpoint for conversation with the agent.
    
    - Creates a new session if session_id is not provided
    - Processes the user message and returns agent response
    - Includes checklist status and generation readiness
    """
    try:
        session = get_or_create_session(request.session_id)
        response = await session.process_message(request.message)
        
        return MessageResponse(
            session_id=session.session_id,
            response=response,
            checklist=session.get_checklist(),
            is_ready_to_generate=session.is_data_complete(),
            dataset_available=session.generated_dataset is not None
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate/{session_id}")
async def generate_dataset(session_id: str):
    """
    Generate the complaint dataset for a session.
    
    Requires all mandatory checklist items to be completed.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    if not session.is_data_complete():
        raise HTTPException(
            status_code=400, 
            detail="Not all required information has been collected. Please complete the checklist first."
        )
    
    try:
        dataset = await session.generate_dataset()
        return {
            "success": True,
            "message": "Dataset generated successfully",
            "dataset": dataset,
            "iteration": session.current_iteration
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/regenerate/{session_id}")
async def regenerate_dataset(session_id: str, request: RegenerateRequest):
    """
    Regenerate the complaint dataset based on user feedback.
    
    Takes the user's feedback on the previous dataset and generates
    a new version incorporating the feedback.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    if not session.generated_dataset:
        raise HTTPException(status_code=400, detail="No dataset has been generated yet. Generate a dataset first.")
    
    try:
        new_dataset = await session.regenerate_dataset(request.feedback)
        return {
            "success": True,
            "message": "Dataset regenerated based on feedback",
            "dataset": new_dataset,
            "iteration": session.current_iteration,
            "feedback_count": len(session.feedback_history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{session_id}")
async def download_dataset(session_id: str):
    """
    Download the generated dataset as a CSV file.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    if session.generated_dataset is None:
        raise HTTPException(status_code=400, detail="No dataset has been generated yet")
    
    # Create a streaming response with the CSV content
    output = io.StringIO()
    output.write(session.generated_dataset)
    output.seek(0)
    
    industry = session.collected_data.get("industry", "domain").replace(" ", "_").lower()
    filename = f"complaint_dataset_{industry}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/session/{session_id}")
async def get_session_status(session_id: str):
    """
    Get the current status of a session including checklist and dataset availability.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    return {
        "session_id": session.session_id,
        "created_at": session.created_at.isoformat(),
        "checklist": session.get_checklist(),
        "is_ready_to_generate": session.is_data_complete(),
        "dataset_available": session.generated_dataset is not None,
        "collected_data": session.collected_data
    }


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """
    Delete a session and all associated data.
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    del sessions[session_id]
    return {"success": True, "message": "Session deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
