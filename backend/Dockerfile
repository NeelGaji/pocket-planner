FROM python:3.11-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Cloud Run sets the PORT env var at runtime
ENV PORT=8080
EXPOSE 8080

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
