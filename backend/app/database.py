from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Database setup
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///backend/game_of_becoming.db")
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency generator to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() # The session is closed after use. Guaranteed clean up and no memory leaks