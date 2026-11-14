FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOST=0.0.0.0 PORT=8000
WORKDIR /app
COPY server.py ./
COPY data ./data
COPY static ./static
RUN mkdir -p /app/instance && useradd --system --uid 10001 estate && chown -R estate:estate /app
USER 10001
EXPOSE 8000
CMD ["python", "server.py"]
