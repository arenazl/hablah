from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Habláh"
    APP_VERSION: str = "0.1.0"
    APP_DEBUG: bool = True
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"

    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 días (sesión "recordarme" tipo app móvil)

    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Groq (Whisper para transcribir audios entrantes)
    GROQ_API_KEY: str = ""
    GROQ_WHISPER_MODEL: str = "whisper-large-v3"

    # ElevenLabs (TTS para que el bot/vendedor responda en audio)
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_MODEL: str = "eleven_flash_v2_5"
    ELEVENLABS_DEFAULT_VOICE_ID: str = ""

    SMTP_HOST: str = "smtp-relay.brevo.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "arenazl@gmail.com"
    SMTP_FROM_NAME: str = "Habláh"

    # Web Push (VAPID)
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CONTACT_EMAIL: str = "mailto:admin@agentflow.local"

    # WhatsApp Baileys integration (fallback si no esta en bot_config)
    WHATSAPP_WEBHOOK_API_KEY: str = ""
    BAILEYS_SERVICE_URL: str = ""

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
