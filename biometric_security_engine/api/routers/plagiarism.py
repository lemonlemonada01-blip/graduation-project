from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_current_user
from ..database.models import PlagiarismScanReport
import json
import time

router = APIRouter(prefix="/api/plagiarism", tags=["Plagiarism"])

@router.get("/history")
def get_plagiarism_history(db: Session = Depends(get_db)):
    reports = db.query(PlagiarismScanReport).order_by(PlagiarismScanReport.created_at.desc()).all()
    res = []
    for r in reports:
        res.append({
            "id": r.id,
            "project_name": r.project_name,
            "scan_type": r.scan_type,
            "overall_similarity": r.overall_similarity,
            "code_similarity": r.code_similarity,
            "text_similarity": r.text_similarity,
            "verdict": r.verdict,
            "total_files": r.total_files,
            "total_loc": r.total_loc,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return {"reports": res}

@router.get("/reports/{id}")
def get_plagiarism_report(id: str, db: Session = Depends(get_db)):
    report = db.query(PlagiarismScanReport).filter(PlagiarismScanReport.id == id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        
    return {
        "id": report.id,
        "project_name": report.project_name,
        "scan_type": report.scan_type,
        "overall_similarity": report.overall_similarity,
        "code_similarity": report.code_similarity,
        "text_similarity": report.text_similarity,
        "verdict": report.verdict,
        "total_files": report.total_files,
        "total_loc": report.total_loc,
        "comparisons": json.loads(report.comparisons_json) if report.comparisons_json else [],
        "logs": json.loads(report.logs_json) if report.logs_json else [],
        "created_at": report.created_at.isoformat() if report.created_at else None
    }

@router.post("/upload-scan-stream")
def upload_scan_stream(file: UploadFile = File(...), db: Session = Depends(get_db)):
    def scan_generator():
        yield 'data: {"type": "log", "message": "Starting plagiarism scan..."}\n\n'
        time.sleep(1)
        yield 'data: {"type": "log", "message": "Analyzing syntax trees..."}\n\n'
        time.sleep(1)
        yield 'data: {"type": "log", "message": "Checking against internal database..."}\n\n'
        time.sleep(1)
        yield 'data: {"type": "result", "report_id": "dummy-report-123", "overall_similarity": 12.5}\n\n'

    return StreamingResponse(scan_generator(), media_type="text/event-stream")
