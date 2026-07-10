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
    ca-certificates \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g @anthropic-ai/claude-code \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar deps primero para aprovechar layer cache de Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del backend
COPY . .

# Smoke import-check: si algun modulo tiene NameError / import faltante, el
# build FALLA aca, antes de deployar. Esto agarra el bug del 'import os'
# faltante que rompio la sesion 472. Listamos los modulos criticos del coach.
# Damos env vars dummy porque core.config valida required al import time.
RUN DB_HOST=x DB_PORT=1 DB_USER=x DB_PASSWORD=x DB_NAME=x SECRET_KEY=x \
    python -c "import services.voice_engines.cascade_engine; \
import services.voice_engines.gemini_live_engine; \
import services.voice_engine; \
import services.super_prompt; \
print('[import-check] critical voice modules OK')"

# Cloud Run inyecta PORT en runtime (default 8080).
# 1 worker porque rooms_registry esta en memoria del proceso.
# uvicorn worker es async = maneja muchas conexiones concurrentes con 1 worker.
ENV PORT=8080
EXPOSE 8080

# Entrypoint: si CLAUDE_CREDENTIALS_JSON viene como env (via Secret Manager),
# lo escribimos a ~/.claude/.credentials.json antes de arrancar gunicorn. Eso
# autentica claude -p para que el cascade engine pueda invocarlo headless.
RUN echo '#!/bin/bash\nif [ -n "$CLAUDE_CREDENTIALS_JSON" ]; then mkdir -p /root/.claude && echo "$CLAUDE_CREDENTIALS_JSON" > /root/.claude/.credentials.json && chmod 600 /root/.claude/.credentials.json; fi\nexec gunicorn main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 1800 --graceful-timeout 30' > /entrypoint.sh && chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
