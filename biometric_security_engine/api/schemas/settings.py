from pydantic import BaseModel
from typing import Optional

class UserPreferenceUpdate(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    notif_plagiarism_alerts: Optional[int] = None
    notif_meeting_reminders: Optional[int] = None
    notif_project_updates: Optional[int] = None

class SettingsUpdate(UserPreferenceUpdate):
    pass

class SettingsResponse(BaseModel):
    user: dict
    preferences: dict
