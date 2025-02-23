from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # JWT Settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Azure OpenAI Settings
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME: str = "text-embedding-ada-002"
    AZURE_OPENAI_CHAT_DEPLOYMENT_NAME: str = "gpt-4"
    AZURE_OPENAI_API_VERSION: str = "2023-05-15"

    # Weaviate Settings
    WEAVIATE_URL: str = "http://weaviate:8080"  # Docker internal network URL

    # CORS Settings
    ADDITIONAL_CORS_ORIGINS: List[str] = []  # Additional allowed origins

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
