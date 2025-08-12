import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Correctly import our FastAPI app and database components
from app.main import app
from app.database import Base, get_db

# --- Test Database Configuration ---
# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Dependency Override ---
# This function will override the `get_db` dependency in our routes
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Apply the override to our app
app.dependency_overrides[get_db] = override_get_db

# --- Pytest Fixture for the Test Client ---
# This fixture will be used by all our test functions
@pytest.fixture(scope="function")
def client():
    # Create the database tables before each test
    Base.metadata.create_all(bind=engine)
    
    # Yield the test client
    yield TestClient(app)
    
    # Drop the database tables after each test
    # This ensures a clean state for every test
    Base.metadata.drop_all(bind=engine)
