#!/usr/bin/env bash
# exit on error
set -o errexit

# Render will have already installed requirements,
# so we only need to run the migrations.
alembic upgrade head