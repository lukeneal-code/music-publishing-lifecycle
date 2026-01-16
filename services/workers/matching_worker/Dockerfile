FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY matching_worker/pyproject.toml .
RUN pip install --no-cache-dir -e .

# Copy shared module
COPY shared/ ./shared/

# Copy application code
COPY matching_worker/src/ ./src/

# Add shared to Python path
ENV PYTHONPATH=/app

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Run the worker
CMD ["python", "-m", "src.main"]
