# Backend Habláh para Google Cloud Run (region southamerica-east1).
# Reemplaza al deploy de Heroku que estaba en US-East con ~170ms RTT desde
# Argentina. Cloud Run SP da ~30-50ms RTT, esencial para audio Live fluido.
#
# Build: docker build -t hablah-api .
# Push : docker push southamerica-east1-docker.pkg.dev/hablah-prod/hablah/api:latest
# Local: docker run -p 8200:8080 -e PORT=8080 --env-file .env hablah-api

FROM python:3.11-slim

# Configuracion base de Python para containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Dependencias del sistema minimas (build tools removidos para imagen mas chica)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar deps primero para aprovechar layer cache de Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del backend
COPY . .

# Cloud Run inyecta PORT en runtime (default 8080).
# 1 worker porque rooms_registry esta en memoria del proceso.
# uvicorn worker es async = maneja muchas conexiones concurrentes con 1 worker.
ENV PORT=8080
EXPOSE 8080
CMD exec gunicorn main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120
