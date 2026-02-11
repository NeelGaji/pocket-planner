FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed by shapely (libgeos) and pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgeos-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Cloud Run sets the PORT env var at runtime
ENV PORT=8080
EXPOSE 8080

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
