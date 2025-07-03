from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os
from pathlib import Path
from dotenv import load_dotenv
from typing import List
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi import status
import requests
import random

# Explicitly load .env from the Webapp directory
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    def get_env(key, default=None):
        val = os.getenv(key, default)
        if val is None:
            raise ValueError(f"Missing required environment variable: {key}")
        return val.replace("'", "")
    return psycopg2.connect(
        host=get_env('PG_HOST'),
        database=get_env('PG_DATABASE'),
        user=get_env('PG_USER'),
        password=get_env('PG_PASSWORD'),
        port=int(os.getenv('PG_PORT', 5432)),
        sslmode=os.getenv('PG_SSLMODE', 'require'),
        channel_binding=os.getenv('PG_CHANNELBINDING', 'require')
    )

@app.get("/api/complaints")
def get_complaints():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        SELECT "Complaint ID", "Product", "Sub-product", "Issue", "Sub-issue", "Consumer complaint narrative"
        FROM public.test
    ''')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    complaints = [
        {
            "id": row[0],
            "product": row[1],
            "sub_product": row[2],
            "issue": row[3],
            "sub_issue": row[4],
            "complaint": row[5],
        }
        for row in rows
    ]
    return complaints

@app.get("/api/options")
def get_options():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        SELECT DISTINCT "Product", "Sub-product", "Issue", "Sub-issue"
        FROM public.test
    ''')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    # Build unique sets for each dropdown
    products = set()
    sub_products = set()
    issues = set()
    sub_issues = set()
    for row in rows:
        if row[0]: products.add(row[0])
        if row[1]: sub_products.add(row[1])
        if row[2]: issues.add(row[2])
        if row[3]: sub_issues.add(row[3])
    return {
        "products": sorted(products),
        "sub_products": sorted(sub_products),
        "issues": sorted(issues),
        "sub_issues": sorted(sub_issues)
    }

@app.post("/api/save")
async def save_ai_response(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid request body"})
    id = data.get('id')
    ai_response = data.get('AI_Response')
    ai_issuegroup = data.get('AI_IssueGroup')
    priority = data.get('Priority')
    product = data.get('Product')
    sub_product = data.get('SubProduct')
    issue = data.get('Issue')
    sub_issue = data.get('SubIssue')
    complaint = data.get('Complaint')
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if id:
            # Update existing row
            cur.execute('''
                UPDATE public.test
                SET "AI_Response"=%s, "AI_IssueGroup"=%s, "Priority"=%s
                WHERE "Complaint ID"=%s
            ''', (ai_response, ai_issuegroup, priority, id))
            conn.commit()
            cur.close()
            conn.close()
            return {"success": True}
        else:
            # Generate a unique 7-digit Complaint ID
            cur.execute('SELECT "Complaint ID" FROM public.test')
            existing_ids = set(row[0] for row in cur.fetchall())
            max_attempts = 10
            for _ in range(max_attempts):
                new_id = random.randint(1000000, 9999999)
                if new_id not in existing_ids:
                    break
            else:
                cur.close()
                conn.close()
                return JSONResponse(status_code=500, content={"error": "Failed to generate unique Complaint ID"})
            # Insert new row with correct DB column names
            cur.execute('''
                INSERT INTO public.test ("Complaint ID", "Product", "Sub-product", "Issue", "Sub-issue", "Consumer complaint narrative", "AI_Response", "AI_IssueGroup", "Priority")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (new_id, product, sub_product, issue, sub_issue, complaint, ai_response, ai_issuegroup, priority))
            conn.commit()
            cur.close()
            conn.close()
            return {"success": True, "id": new_id}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/webhook")
async def proxy_to_n8n(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid request body"})
    # Forward the request to n8n
    n8n_url = "https://n8n.leminhnguyen.com/webhook/362992b9-556d-4a7b-9775-ae81a017f206"
    try:
        resp = requests.post(n8n_url, json=data, timeout=30)
        try:
            return JSONResponse(status_code=resp.status_code, content=resp.json())
        except Exception:
            return resp.text, resp.status_code
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
