#!/bin/bash
set -e

# Activate the Python 3.11 virtual environment
# NOTE: Python 3.14 breaks pydantic v1 — always use 3.11 venv
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Creating venv with Python 3.11..."
    /opt/homebrew/bin/python3.11 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
fi

echo "Starting NoMoreGaps backend on http://localhost:8000"
uvicorn main:app --reload --port 8000
