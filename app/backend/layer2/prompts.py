"""
Layer 2 Prompts - Complaint Priority Classification

This module contains prompts for analyzing complaints and classifying their priority.
"""

import json


def get_classification_prompt(complaint: str, risk_table: list, table8: list, table9: list, table10: list, table11: list) -> str:
    """
    Generate a prompt for classifying a single complaint.
    
    Args:
        complaint: The complaint text to analyze
        risk_table: The risk classification table (output from Layer 1)
        table8: Impact scale
        table9: Urgency scale
        table10: Frequency scale
        table11: Controllability scale
        
    Returns:
        Formatted classification prompt string
    """
    risk_table_str = json.dumps(risk_table, indent=2)
    table8_str = json.dumps(table8, indent=2)
    table9_str = json.dumps(table9, indent=2)
    table10_str = json.dumps(table10, indent=2)
    table11_str = json.dumps(table11, indent=2)
    
    return f"""You are a complaint priority classification system. Analyze the following complaint and classify it according to the reference tables provided.

## Complaint to Analyze:
"{complaint}"

## Risk Classification Table (from business context):
{risk_table_str}

## Scoring Scales:

### Impact Scale (Table 8):
{table8_str}

### Urgency Scale (Table 9):
{table9_str}

### Frequency Scale (Table 10):
{table10_str}

### Controllability Scale (Table 11):
{table11_str}

## Task:
1. Identify which risk code from the Risk Classification Table best matches this complaint
2. Assign scores (1-5) for each dimension based on the complaint content:
   - Impact: How severely does this affect the business/customer?
   - Urgency: How quickly does this need to be addressed?
   - Frequency: How often might this type of complaint occur?
   - Controllability: How much control does the organization have to resolve this?

## Response Format:
Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{{
    "risk_code": "XX-00",
    "risk_description": "Brief description from the risk table",
    "impact_score": 0,
    "urgency_score": 0,
    "frequency_score": 0,
    "controllability_score": 0
}}

Important:
- All scores must be integers from 1 to 5
- risk_code must match one from the Risk Classification Table
- risk_description should be the Description from the matching risk code row
"""


SYSTEM_PROMPT = """You are a complaint classification AI. You analyze customer complaints and classify them according to risk categories and priority scoring dimensions. Always respond with valid JSON only."""
