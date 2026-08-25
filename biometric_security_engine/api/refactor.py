import os
import re

BASE = r'd:\AI engine\biometric_security_engine\api'
MAIN = os.path.join(BASE, 'main.py')
with open(MAIN, 'r', encoding='utf-8') as f:
    content = f.read()

def extract_section(start_str, end_str=None):
    start_idx = content.find(start_str)
    if start_idx == -1: return ""
    if end_str:
        end_idx = content.find(end_str, start_idx + len(start_str))
        if end_idx == -1:
            end_idx = len(content)
    else:
        # Find next section marker
        next_sec = content.find('# ===', start_idx + len(start_str))
        end_idx = next_sec if next_sec != -1 else len(content)
    
    return content[start_idx:end_idx].replace('@app.', '@router.')

# Create routers
routers = {
    'plagiarism.py': extract_section('# 2. PLAGIARISM & SIMILARITY ENDPOINTS') + "\n" + extract_section('# PLAGIARISM HISTORY & AUDIT ENDPOINTS'),
    'sessions.py': extract_section('# 3. SESSIONS & ATTENDANCE MANAGEMENT ENDPOINTS'),
    'users.py': extract_section('# 4. USER MANAGEMENT & RBAC ENDPOINTS') + "\n" + extract_section('# 11. EXTENDED USER MANAGEMENT'),
    'teams.py': extract_section('# 5. TEAMS MANAGEMENT ENDPOINTS'),
    'meetings.py': extract_section('# 6. MEETINGS & ATTENDANCE RECORDING ENDPOINTS'),
    'projects.py': extract_section('# 7. PROJECTS, KANBAN TASKS & DELIVERABLES ENDPOINTS'),
    'settings.py': extract_section('# 8. SETTINGS, PREFERENCES, PASSWORD & ACTIVITY LOGS'),
    'reports.py': extract_section('# 9. REPORTS & ANALYTICS ENDPOINTS'),
    'notifications.py': extract_section('# 10. NOTIFICATIONS & ALERTS ENDPOINTS')
}

common_imports = """from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..database.models import *
from ..schemas.models_schemas import *
from ..schemas.attendance import *
from ..schemas.settings import *
from ..schemas.user import *
from ..dependencies import get_db, get_bio_db, get_current_user
import datetime
import json
import asyncio
import os
import shutil
import tempfile
import urllib.parse
import subprocess
from pathlib import Path
import numpy as np

# Mock function for SSE
def _sse(msg_type: str, **kwargs) -> str:
    payload = {"type": msg_type, **kwargs}
    return f"data: {json.dumps(payload)}\\n\\n"

try:
    from plagiarism_engine import FileExtractor, CodePlagiarismDetector, TextPlagiarismDetector, SystemDBStore, MinHashLSHIndex
    PLAGIARISM_AVAILABLE = True
except:
    PLAGIARISM_AVAILABLE = False

"""

for router_name, code in routers.items():
    if not code.strip(): continue
    
    router_code = f"router = APIRouter(tags=['{router_name.replace('.py','').capitalize()}'])\n\n"
    
    with open(os.path.join(BASE, 'routers', router_name), 'w', encoding='utf-8') as f:
        f.write(common_imports + router_code + code)

print("Routers generated successfully.")
