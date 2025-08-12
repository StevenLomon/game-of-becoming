import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# --- 1. ADD PATH TO PROJECT ROOT ---
# This ensures that the 'app' module can be found by Python.
# We add the parent directory of 'alembic' (which is your project root) to the system path.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


# --- 2. IMPORT YOUR MODEL'S BASE and a CONFIG VARIABLE ---
# Import the Base from your models file, so Alembic knows about your tables.
# Import your database URL from your app's config/database file.
from app.models import Base
from app.database import SQLALCHEMY_DATABASE_URL # <--- Import the URL


# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# --- 3. SET THE DATABASE URL IN THE CONFIG ---
# This line tells Alembic to use the database URL from your application's settings,
# ensuring it always connects to the correct database (game_of_becoming.db).
if SQLALCHEMY_DATABASE_URL:
    config.set_main_option('sqlalchemy.url', SQLALCHEMY_DATABASE_URL)


# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# --- 4. SET THE TARGET METADATA ---
# Point Alembic to your models' Base.metadata. This is how it knows what tables
# it needs to manage for autogeneration and migrations.
target_metadata = Base.metadata


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # This part is key for online migrations. It uses the configuration
    # we set up above to create a connectable engine.
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()