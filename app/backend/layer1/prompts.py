"""
Prompts for the Complaint Dataset Generator Agent

This module contains all prompt templates used by the AI agent for:
1. System prompts for conversation/data gathering
2. Dataset generation prompts
"""

import json


def get_system_prompt(table1: list, table2: list, table8: list, checklist: dict) -> str:
    """
    Generate the system prompt for the Gemini model during conversation.
    
    Args:
        table1: The four-tier risk classification taxonomy data
        table2: The risk subcategory taxonomy with universal patterns
        table8: The impact scale taxonomy
        checklist: Current data collection status dict
        
    Returns:
        Formatted system prompt string
    """
    table1_str = json.dumps(table1, indent=2)
    table2_str = json.dumps(table2, indent=2)
    table8_str = json.dumps(table8, indent=2)
    
    checklist_status = []
    for key, value in checklist.items():
        status = "✓" if value["collected"] else "○"
        checklist_status.append(f"  {status} {value['description']}: {value['value'] or 'Not collected'}")
    
    return f"""You are an AI assistant helping to generate domain-specific risk classification datasets for businesses.

Your task is to gather information about the user's business through natural conversation, then generate a risk classification dataset with impact scores and detailed descriptions.

## Reference Classification Taxonomy (Table 1):
{table1_str}

## Risk Subcategory Patterns (Table 2):
{table2_str}

## Impact Scale (Table 8):
{table8_str}

## Current Data Collection Status:
{chr(10).join(checklist_status)}

## Your Goals:
1. Engage in friendly, professional conversation to gather business details
2. Ask targeted questions to fill in missing checklist items
3. Be concise and focused - avoid overwhelming the user
4. Once you have enough information (at minimum: industry, business description, target customers, main products/services), inform the user you're ready to generate the dataset
5. If the user asks to generate before all required data is collected, politely ask for the missing information

## Important Guidelines:
- Ask one or two questions at a time, not all at once
- Acknowledge and confirm information the user provides
- Use natural, conversational language
- If the user provides multiple pieces of information at once, extract and confirm all of them
- Be helpful and encouraging throughout the process

## Response Format:
Always respond naturally in conversation. When extracting information, internally track what you've learned but respond conversationally.

At the end of your response, include a JSON block with extracted data (if any new data was collected):
```json
{{
    "extracted_data": {{
        "industry": "value or null",
        "business_description": "value or null",
        "target_customers": "value or null",
        "main_products_services": "value or null",
        "common_pain_points": "value or null",
        "specific_terminology": "value or null"
    }},
    "ready_to_generate": true/false
}}
```
Only include fields that were newly mentioned in this message. Use null for fields not mentioned.
"""


def get_generation_prompt(collected_data: dict, table1: list, table2: list, table8: list) -> str:
    """
    Generate the prompt for dataset generation.
    
    Args:
        collected_data: Dictionary containing all collected business information
        table1: The four-tier risk classification taxonomy data
        table2: The risk subcategory taxonomy with universal patterns
        table8: The impact scale taxonomy
        
    Returns:
        Formatted generation prompt string
    """
    table1_str = json.dumps(table1, indent=2)
    table2_str = json.dumps(table2, indent=2)
    table8_str = json.dumps(table8, indent=2)
    
    return f"""Based on the following business information, generate a domain-specific risk classification dataset in CSV format.

## Business Information:
- Industry: {collected_data['industry']}
- Description: {collected_data['business_description']}
- Target Customers: {collected_data['target_customers']}
- Products/Services: {collected_data['main_products_services']}
- Common Pain Points: {collected_data['common_pain_points'] or 'Not specified'}
- Industry Terminology: {collected_data['specific_terminology'] or 'Not specified'}

## Reference Tables:
Table 1 (Risk Categories):
{table1_str}

Table 2 (Subcategories with patterns):
{table2_str}

Table 8 (Impact Scale):
{table8_str}

## Task:
Generate a CSV dataset with the following format:
- Column 1: Risk Code (matching the subcategory codes from Table 2: ER-01, ER-02, ..., SR-04)
- Column 2: Impact Score (1-5 based on Table 8, considering the severity in the context of {collected_data['industry']})
- Column 3: Description (the name of this risk, adapted to the business context - based on the Subcategory Name from Table 2)

Generate exactly 20 rows (one for each subcategory code from Table 2), with:
1. Risk codes matching Table 2 subcategories
2. Impact scores (1-5) appropriate for {collected_data['industry']} based on how severely each risk would affect this specific business
3. Risk names (in the Description column) that:
   - Are based on the Subcategory Name from Table 2
   - Are adapted/customized for {collected_data['industry']} context
   - Are concise (2-5 words)

Output ONLY the CSV content, starting with the header row. Each description should be in quotes.
Example format:
Risk Code,Impact Score,Description
ER-01,4,"Market Competition"
"""


# System message for chat initialization
SYSTEM_ACKNOWLEDGMENT = "I understand. I'll help gather information about the user's business and generate a complaint dataset. I'll ask questions conversationally and track the checklist progress."


def get_regeneration_prompt(collected_data: dict, table1: list, table2: list, table8: list, feedback: str, previous_dataset: str) -> str:
    """
    Generate a prompt for dataset regeneration based on user feedback.
    
    Args:
        collected_data: Dictionary containing all collected business information
        table1: The four-tier risk classification taxonomy data
        table2: The risk subcategory taxonomy with universal patterns
        table8: The impact scale taxonomy
        feedback: User's feedback on the previous dataset
        previous_dataset: The previously generated dataset CSV content
        
    Returns:
        Formatted regeneration prompt string
    """
    table1_str = json.dumps(table1, indent=2)
    table2_str = json.dumps(table2, indent=2)
    table8_str = json.dumps(table8, indent=2)
    
    return f"""Based on the following business information and user feedback, regenerate a domain-specific risk classification dataset in CSV format.

## Business Information:
- Industry: {collected_data['industry']}
- Description: {collected_data['business_description']}
- Target Customers: {collected_data['target_customers']}
- Products/Services: {collected_data['main_products_services']}
- Common Pain Points: {collected_data['common_pain_points'] or 'Not specified'}
- Industry Terminology: {collected_data['specific_terminology'] or 'Not specified'}

## Previous Dataset (to be improved):
```csv
{previous_dataset}
```

## User Feedback on Previous Dataset:
{feedback}

## Reference Tables:
Table 1 (Risk Categories):
{table1_str}

Table 2 (Subcategories with patterns):
{table2_str}

Table 8 (Impact Scale):
{table8_str}

## Task:
Regenerate a CSV dataset with the following format, taking into account the user feedback and improving upon the previous dataset:
- Column 1: Risk Code (matching the subcategory codes from Table 2: ER-01, ER-02, ..., SR-04)
- Column 2: Impact Score (1-5 based on Table 8, considering the severity in the context of {collected_data['industry']})
- Column 3: Description (the name of this risk, adapted to the business context - based on the Subcategory Name from Table 2)

Generate exactly 20 rows (one for each subcategory code from Table 2), with:
1. Risk codes matching Table 2 subcategories
2. Impact scores (1-5) appropriate for {collected_data['industry']} based on how severely each risk would affect this specific business
3. Risk names (in the Description column) that:
   - Are based on the Subcategory Name from Table 2
   - Are adapted/customized for {collected_data['industry']} context
   - Are concise (2-5 words)
   - Address the user's feedback

Output ONLY the CSV content, starting with the header row. Each description should be in quotes.
Example format:
Risk Code,Impact Score,Description
ER-01,4,"Market Competition"
"""
