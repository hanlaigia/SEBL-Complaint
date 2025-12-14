# Complaint Dataset Generator Agent

An AI-powered tool that generates domain-specific complaint datasets for customer support systems. The agent uses Google Gemini 2.5 Flash to interactively gather business details and produce realistic complaint examples tailored to your industry.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Application Flow](#application-flow)
- [Setup & Installation](#setup--installation)
- [API Reference](#api-reference)
- [Usage Guide](#usage-guide)
- [Test Prompts](#test-prompts)

---

## Overview

This application helps businesses generate complaint datasets that can be used to:
- Train customer support AI models
- Build complaint classification systems
- Understand potential customer pain points
- Create test data for support ticket systems

### Key Features

- **Interactive Data Collection**: Chat-based interface to gather business details
- **Real-time Checklist**: Visual progress tracking of required information
- **AI-Powered Generation**: Uses Gemini 2.5 Flash for intelligent conversation and dataset creation
- **CSV Export**: Download generated datasets in standard CSV format
- **Single Session**: Fresh start on each page refresh (no persistent storage)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Chat UI     │  │ Checklist    │  │ Download Controls      │  │
│  │ Component   │  │ Sidebar      │  │                        │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘  │
│         │                │                       │               │
│         └────────────────┼───────────────────────┘               │
│                          │                                       │
│                          ▼                                       │
│               ┌──────────────────┐                               │
│               │   API Service    │                               │
│               │   (fetch calls)  │                               │
│               └────────┬─────────┘                               │
└────────────────────────┼────────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Session Manager                        │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │   │
│  │  │ Checklist   │  │ Conversation │  │ Dataset         │  │   │
│  │  │ Tracker     │  │ History      │  │ Generator       │  │   │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│               ┌──────────────────┐                               │
│               │  Gemini 2.5 Flash│                               │
│               │  (Google AI)     │                               │
│               └──────────────────┘                               │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Reference Tables (CSV)                       │   │
│  │  • Table 1: Four-tier Risk Classification Taxonomy        │   │
│  │  • Table 2: Risk Subcategory Patterns                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
layer1/
├── README.md                           # This documentation
├── TEST_PROMPTS.md                     # User test prompts
│
├── backend/                            # FastAPI backend
│   └── main.py                         # Backend server & agent logic
│
├── frontend/                           # React frontend
│   ├── package.json                    # Node.js dependencies
│   ├── vite.config.js                  # Vite configuration
│   ├── index.html                      # HTML entry point
│   └── src/
│       ├── main.jsx                    # React entry point
│       ├── App.jsx                     # Main application component
│       ├── App.css                     # Component styles
│       └── index.css                   # Global styles
│
└── data/                               # Reference data tables
    ├── table1_four-tier_risk_classification_taxonomy.csv
    ├── table2_risk_subcategory_taxonomy_with_universal_patterns.csv
    ├── table3_domain-specific_risk_classification_examples.csv
    ├── table3_example2.csv
    └── table3_example3.csv
```

### Root Project Files Used

| File | Purpose |
|------|---------|
| `/.venv/` | Python virtual environment (shared with main project) |
| `/requirements.txt` | Python packages including google-generativeai |
| `/.env` | Environment variables including GEMINI_API_KEY |

---

## Application Flow

### 1. Session Initialization

```
User Opens Page → Frontend Loads → Welcome Message Displayed
                                         ↓
                                  Empty Checklist Shown
```

### 2. Conversation Flow

```
User Sends Message
       ↓
Frontend → POST /chat → Backend
                           ↓
                    Create/Get Session
                           ↓
                    Build System Prompt
                    (includes Table 1 & 2)
                           ↓
                    Send to Gemini API
                           ↓
                    Parse Response
                    Extract Business Data
                           ↓
                    Update Checklist
                           ↓
       ←──────── Return Response ─────────
       ↓
Update UI (Chat + Checklist)
```

### 3. Data Collection Checklist

The agent collects the following information:

| Field | Required | Description |
|-------|----------|-------------|
| Industry | ✓ | Type of business (e.g., Finance, E-commerce) |
| Business Description | ✓ | What the business does |
| Target Customers | ✓ | Who the customers are |
| Main Products/Services | ✓ | Core offerings |
| Common Pain Points | ○ | Known customer issues |
| Industry Terminology | ○ | Domain-specific terms |

### 4. Dataset Generation Flow

```
Checklist Complete → "Generate" Button Enabled
                            ↓
User Clicks Generate → POST /generate/{session_id}
                            ↓
                     Build Generation Prompt
                     (Business Details + Tables)
                            ↓
                     Gemini Generates Dataset
                            ↓
                     Parse & Store CSV
                            ↓
       ←──────── Return Preview ──────────
       ↓
Show Preview + Enable Download Button
```

### 5. Dataset Download

```
User Clicks Download → GET /download/{session_id}
                            ↓
                     Stream CSV Content
                            ↓
                     Browser Downloads File
```

---

## Setup & Installation

### Prerequisites

- Python 3.9+ (uses root `.venv`)
- Node.js 18+
- Google AI API Key (Gemini)

### Step 1: Set up Python Environment (from project root)

```bash
# From project root directory
cd c:\Projects\SEBL-Finance-Complaint

# Create virtual environment (if not exists)
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables

Edit the `.env` file in the project root:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

### Step 3: Install Frontend Dependencies

```bash
cd layer1/frontend
npm install
```

### Step 4: Run the Application

**Terminal 1 - Backend:**
```bash
cd c:\Projects\SEBL-Finance-Complaint
.venv\Scripts\activate
python layer1/backend/main.py
# Server runs on http://localhost:8001
```

**Terminal 2 - Frontend:**
```bash
cd c:\Projects\SEBL-Finance-Complaint\layer1\frontend
npm run dev
# App runs on http://localhost:5174
```

Open http://localhost:5174 in your browser.

---

## API Reference

### Endpoints

#### `POST /chat`
Send a message to the agent.

**Request:**
```json
{
  "session_id": "optional-uuid",
  "message": "User message here"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "response": "Agent response text",
  "checklist": {
    "industry": {
      "collected": true,
      "value": "E-commerce",
      "description": "Industry/Domain Type"
    }
  },
  "is_ready_to_generate": false,
  "dataset_available": false
}
```

#### `POST /generate/{session_id}`
Generate the complaint dataset.

**Response:**
```json
{
  "success": true,
  "message": "Dataset generated successfully",
  "preview": "Risk Code,E-commerce\nER-01,\"...\"..."
}
```

#### `GET /download/{session_id}`
Download the generated CSV file.

#### `GET /session/{session_id}`
Get current session status.

#### `DELETE /session/{session_id}`
Delete a session.

---

## Usage Guide

### Typical Conversation Flow

1. **Start**: The agent greets you and asks about your industry
2. **Provide Details**: Answer the agent's questions about your business
3. **Watch Checklist**: See the sidebar update as information is collected
4. **Generate**: Once ready, click the "Generate Dataset" button
5. **Download**: Download your customized complaint dataset

### Tips

- Provide detailed, specific answers for better dataset quality
- Mention industry-specific terms and jargon
- Describe common customer issues if you know them
- You can provide multiple pieces of information in one message

---

## Generated Dataset Format

The output CSV follows this structure:

| Risk Code | [Industry Name] |
|-----------|-----------------|
| ER-01 | "Complaint example for External Risk - Market Competition" |
| ER-02 | "Complaint example for External Risk - Regulatory Changes" |
| ... | ... |
| SR-04 | "Complaint example for Strategic Risk - Customer Retention" |

Total: 20 rows (one for each risk subcategory)

---

## Technical Notes

### Session Management
- Sessions are stored in-memory
- All sessions are cleared when the server restarts
- Each browser refresh creates a new session

### Gemini Integration
- Uses `gemini-2.5-flash-preview-05-20` model
- System prompts include reference tables for context
- Responses are parsed for structured data extraction

### Error Handling
- API errors are displayed in the chat
- Session not found returns 404
- Incomplete data prevents generation

---

## License

This project is for internal use.
