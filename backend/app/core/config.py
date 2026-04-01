from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ArcHire"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-secret-key-in-production-min-32-chars!!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # Database — set DATABASE_URL env var in Railway dashboard
    DATABASE_URL: str = "postgresql://neondb_owner:npg_xgEym3LWF1Oi@ep-cold-recipe-anvrbo0h-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

    # CORS — comma-separated string so Railway env vars work easily
    # e.g. ALLOWED_ORIGINS_STR="https://archire.vercel.app,http://localhost:5173"
    ALLOWED_ORIGINS_STR: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173"

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS_STR.split(",") if o.strip()]

    # SMTP Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""

    # SendGrid (alternative to SMTP)
    SENDGRID_API_KEY: str = ""

    # Notification backend: "smtp" | "sendgrid" | "sns" | "none"
    NOTIFICATION_BACKEND: str = "none"

    # AWS SNS (optional future integration)
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    SNS_TOPIC_ARN: str = ""

    # Scheduler
    SCRAPE_INTERVAL_HOURS: int = 24

    # Scraper
    REQUEST_TIMEOUT: int = 30
    MAX_RETRIES: int = 3

    # Cache
    CACHE_TTL_SECONDS: int = 300  # 5 minutes

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
