from pydantic_settings import BaseSettings
from pathlib import Path
from typing import List
import os

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # App Settings
    app_name: str = "Secure-FEPRH Unified AI & Security Engine"
    app_version: str = "2.5.0"
    
    # CORS
    cors_origins: List[str] = ["*"]

    # Security / JWT
    jwt_secret: str = "super-secret-biometric-key-123"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Paths & Databases
    database_url: str = "postgresql://postgres:postgres@localhost:5432/secure_feprh_db"
    
    # Biometric Security
    biometric_encryption_key: str = "Kz1c3u7F_Jv4Qk3-0d9oFqYc1N_P9Q2gW_y0D8C8uG8=" # 32-byte url-safe base64 for Fernet
    
    # Biometrics
    authentication_tolerance: float = 0.45
    minifasnet_model_path: str = "models/minifasnet.onnx"
    max_b64_size_bytes: int = 15 * 1024 * 1024

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()
