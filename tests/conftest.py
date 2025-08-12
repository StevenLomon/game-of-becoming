import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Iterator

# Import your app and its components
from app.main import app
from app.database import Base, get_db
from app import models # This import is critical and will now work as intended

# --- Test Database Configuration ---
# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# This is the session factory for the tests
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- The New, Robust Fixture Setup ---

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """
    Fixture to set up the database once for the entire test session.
    It creates all tables before any tests run, and drops them after all tests are done.
    """
    # By importing `models` above, Base.metadata is now populated.
    # This creates the tables in our in-memory SQLite database.
    Base.metadata.create_all(bind=engine)
    
    yield # This is where the tests will run
    
    # This will be executed after all tests have completed
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Iterator[Session]:
    """
    Provides a clean database session for each test function.
    It starts a transaction, yields the session, and then rolls back the transaction.
    This ensures each test runs in isolation without affecting others.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session: Session):
    """
    Provides a TestClient with the database dependency overridden.
    It uses the isolated db_session from the fixture above.
    """

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    del app.dependency_overrides[get_db]