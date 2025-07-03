FROM python:3.11-slim

WORKDIR /app

COPY ./backend.py ./
COPY ./requirements.txt ./
COPY .env ./

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 3001

CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "3001"]
