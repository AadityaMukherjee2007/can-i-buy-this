from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://cibt_user:cibt_pass@localhost:5432/canibuythis"
    saltedge_app_id: str = ""
    saltedge_secret: str = ""
    saltedge_env: str = "sandbox"
    stripe_secret_key: str = ""
    jwt_secret: str = "super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    class Config:
        env_file = ".env"


settings = Settings()
