# Complaint Priority Classification System

A two-layer AI-powered system for generating domain-specific risk classification datasets and prioritizing customer complaints.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                     React + Vite (Port 5174)                            │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │      Layer 1 Tab            │  │        Layer 2 Tab              │   │
│  │  Risk Classification Chat   │  │  Priority Classification        │   │
│  │  - Chat interface           │  │  - File upload                  │   │
│  │  - Dataset preview          │  │  - Progress tracking            │   │
│  │  - Feedback loop            │  │  - Results table                │   │
│  │  - CSV download             │  │  - CSV download                 │   │
│  └─────────────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                     │
│                     FastAPI (Port 8001)                                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │     /api/layer1             │  │      /api/layer2                │   │
│  │  - /chat                    │  │  - /upload                      │   │
│  │  - /generate/{id}           │  │  - /process/{id}                │   │
│  │  - /regenerate/{id}         │  │  - /progress/{id}               │   │
│  │  - /download/{id}           │  │  - /results/{id}                │   │
│  └─────────────────────────────┘  │  - /download/{id}               │   │
│                                   └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           GOOGLE GEMINI AI                              │
│                        (gemini-2.5-flash)                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Overview

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Layer 1     │     │  Risk Table   │     │   Layer 2     │
│               │     │   (Output)    │     │               │
│  Business     │────▶│  Risk Code    │────▶│  Complaints   │
│  Context      │     │  Impact Score │     │  CSV          │
│  (Chat)       │     │  Description  │     │  (Upload)     │
└───────────────┘     └───────────────┘     └───────────────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │   Priority    │
                                            │   Results     │
                                            │   (Output)    │
                                            └───────────────┘
```

---

## 🔵 Layer 1: Risk Classification Generator

### Purpose
Generate a domain-specific risk classification dataset tailored to your business context through an interactive chat conversation.

### Input
**User provides via chat:**
- Business type/industry
- Target customers/demographics
- Products/services offered
- Common pain points and complaints
- Industry-specific terminology

### Process
1. AI agent asks clarifying questions about the business
2. Collects information across 5 categories (tracked in sidebar):
   - ✓ Industry/Business Type
   - ✓ Target Customers
   - ✓ Products/Services
   - ✓ Common Pain Points
   - ✓ Industry Terminology
3. When all categories are complete, generates dataset
4. User can review and provide feedback for regeneration

### Output
**CSV file with 3 columns, 20 rows (one per risk subcategory):**

| Column | Description |
|--------|-------------|
| Risk Code | Subcategory code (e.g., ER-01, OR-03, FR-02) |
| Impact Score | 1-5 scale based on business impact |
| Description | Domain-specific risk name for the category |

**Example Output (Hotel Industry):**
```csv
Risk Code,Impact Score,Description
ER-01,3,Competitor Rate Undercutting
ER-02,4,Health & Safety Regulation Violations
ER-03,4,Room Photo Misrepresentation
OR-01,4,Housekeeping Quality Inconsistency
OR-03,5,Property Management System Downtime
FR-01,3,Dynamic Pricing Complaints
FR-03,5,Hidden Resort Fee Disputes
...
```

---

## 🟢 Layer 2: Complaint Priority Classification

### Purpose
Classify individual complaints against the risk table and calculate priority scores for actionable prioritization.

### Inputs
1. **Complaints CSV** - Single column with complaint text
2. **Risk Table CSV** - Output from Layer 1 (or custom risk table)

### Process
1. Upload both CSV files
2. For each complaint:
   - AI classifies against risk table to find best matching risk code
   - AI assigns scores (1-5) for each dimension:
     - **Impact**: How severely does this affect business/customer?
     - **Urgency**: How quickly does this need addressing?
     - **Frequency**: How often might this type occur?
     - **Controllability**: How much control does the org have?
3. Calculate priority score using formula
4. Assign priority level

### Priority Formula
```
Priority Score = (Impact × Urgency × Frequency) / Controllability
```

### Priority Levels
| Level | Score Range | Response Time |
|-------|-------------|---------------|
| **P1 - Critical** | ≥ 60 | Within 4 hours |
| **P2 - High** | 40 - 59 | Within 24 hours |
| **P3 - Medium** | 20 - 39 | Within 3 days |
| **P4 - Low** | < 20 | Within 7 days |

### Output
**CSV file with 9 columns:**

| Column | Description |
|--------|-------------|
| Complaint | Original complaint text |
| Risk Code | Matched risk subcategory code |
| Risk Description | Description from risk table |
| Impact Score | 1-5 (from Table 8) |
| Urgency Score | 1-5 (from Table 9) |
| Frequency Score | 1-5 (from Table 10) |
| Controllability Score | 1-5 (from Table 11) |
| Priority Score | Calculated PS value |
| Priority Level | P1/P2/P3/P4 classification |

---

## 📁 Reference Data Tables

Located in `app/backend/data/`:

### Table 1: Four-Tier Risk Classification Taxonomy
Defines the 4 main risk groups:
- **External (E)**: Market, regulatory, perception, economic risks
- **Operational (O)**: Process, system, service, staff risks
- **Financial (F)**: Pricing, payment, fees, value risks
- **Strategic (S)**: Product-market fit, features, competition, retention

### Table 2: Risk Subcategory Taxonomy
20 universal risk subcategories with codes:
```
External:    ER-01 to ER-05
Operational: OR-01 to OR-05
Financial:   FR-01 to FR-05
Strategic:   SR-01 to SR-04
```

### Tables 8-11: Scoring Scales

**Table 8 - Impact Scale:**
| Score | Level | Description |
|-------|-------|-------------|
| 5 | Critical | Threatens business continuity or major financial loss |
| 4 | High | Significant business disruption |
| 3 | Medium | Moderate business impact |
| 2 | Low | Minor business inconvenience |
| 1 | Minimal | Negligible business impact |

**Table 9 - Urgency Scale:**
| Score | Level | Description |
|-------|-------|-------------|
| 5 | Immediate | Requires instant action |
| 4 | Urgent | Requires quick action |
| 3 | Moderate | Requires timely action |
| 2 | Low | Can be scheduled |
| 1 | Minimal | No time pressure |

**Table 10 - Frequency Scale:**
| Score | Level | Description |
|-------|-------|-------------|
| 5 | Constant | Occurs daily or multiple times per day |
| 4 | Frequent | Occurs multiple times per week |
| 3 | Moderate | Occurs weekly |
| 2 | Occasional | Occurs monthly |
| 1 | Rare | Occurs less than monthly |

**Table 11 - Controllability Scale:**
| Score | Level | Description |
|-------|-------|-------------|
| 5 | Fully Controllable | Organization has complete control |
| 4 | Mostly Controllable | Organization has significant control |
| 3 | Moderately Controllable | Requires some external coordination |
| 2 | Limited Control | Significant external dependencies |
| 1 | Minimal Control | Beyond organizational control |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API Key

### Installation

1. **Clone and setup environment:**
```bash
cd app
python -m venv ../.venv
..\.venv\Scripts\activate  # Windows
pip install -r ../requirements.txt
```

2. **Create `.env` file in project root:**
```env
GEMINI_API_KEY=your_api_key_here
```

3. **Install frontend dependencies:**
```bash
cd frontend
npm install
```

### Running the Application

**Terminal 1 - Backend:**
```bash
cd app/backend
..\..\venv\Scripts\python -m uvicorn main:app --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd app/frontend
npm run dev
```

Access the app at: http://localhost:5174

---

## 📂 Project Structure

```
app/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── data/                # Reference tables
│   │   ├── table1_*.csv     # Risk taxonomy
│   │   ├── table2_*.csv     # Subcategories
│   │   ├── table8_*.csv     # Impact scale
│   │   ├── table9_*.csv     # Urgency scale
│   │   ├── table10_*.csv    # Frequency scale
│   │   ├── table11_*.csv    # Controllability scale
│   │   └── raw_data/        # Sample complaint datasets
│   ├── layer1/
│   │   ├── routes.py        # Layer 1 API endpoints
│   │   └── prompts.py       # AI prompts for generation
│   └── layer2/
│       ├── routes.py        # Layer 2 API endpoints
│       └── prompts.py       # AI prompts for classification
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Tab navigation
│   │   ├── Layer1.jsx       # Risk classification UI
│   │   ├── Layer2.jsx       # Priority classification UI
│   │   └── App.css          # Styles
│   ├── package.json
│   └── vite.config.js
├── test_prompts.md          # Sample test conversations
└── README.md                # This file
```

---

## 💡 Example Use Case: Hotel Industry

### Step 1: Generate Risk Table (Layer 1)
Chat with the AI about your hotel business:
```
"I manage a 4-star boutique hotel chain called Azure Stays..."
```

**Output:** Risk table with hotel-specific risks like:
- ER-03: Room Photo Misrepresentation
- OR-01: Housekeeping Quality Inconsistency
- FR-03: Hidden Resort Fee Disputes

### Step 2: Classify Complaints (Layer 2)
Upload:
- `hotel_reviews.csv` - Customer complaints
- `hotel_risk_table.csv` - Output from Step 1

**Output:** Priority-ranked complaints:
| Complaint | Risk Code | Priority |
|-----------|-----------|----------|
| "Room had bedbugs, ruined our vacation" | OR-01 | P1 - Critical |
| "WiFi was slow in the lobby" | OR-03 | P3 - Medium |
| "Minibar prices not clearly displayed" | FR-03 | P4 - Low |

---

## 🔧 API Reference

### Layer 1 Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/layer1/chat` | Send message, get AI response |
| POST | `/api/layer1/generate/{id}` | Generate dataset |
| POST | `/api/layer1/regenerate/{id}` | Regenerate with feedback |
| GET | `/api/layer1/download/{id}` | Download CSV |

### Layer 2 Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/layer2/upload` | Upload complaints & risk table |
| POST | `/api/layer2/process/{id}` | Start classification |
| GET | `/api/layer2/progress/{id}` | Get progress status |
| GET | `/api/layer2/results/{id}` | Get results JSON |
| GET | `/api/layer2/download/{id}` | Download CSV |

---

## 📝 License

MIT License
