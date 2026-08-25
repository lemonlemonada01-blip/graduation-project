from pydantic import BaseModel, Field
from typing import List, Optional

class ImagePayload(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded JPEG/PNG image")

class AuthPayload(BaseModel):
    student_id: str
    image_base64: str

class StepChallengePayload(BaseModel):
    challenge_type: str = Field(..., description="Challenge type: TURN_LEFT, TURN_RIGHT, LOOK_UP, LOOK_DOWN, BLINK")
    image_base64: str

class CircularChallengePayload(BaseModel):
    frames_base64: List[str] = Field(..., description="Sequence of 4+ frames for circular motion verification")

class FaceLoginRequest(AuthPayload):
    pass

class FaceRegisterRequest(BaseModel):
    student_id: str
    image_base64: str
    liveness_token: Optional[str] = None

class ChallengeResponse(BaseModel):
    challenges: List[str]
