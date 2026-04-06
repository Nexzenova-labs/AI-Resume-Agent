frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

backend-install:
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

backend-dev:
	cd backend && uvicorn app.main:app --reload

worker-dev:
	cd backend && celery -A app.tasks.celery_app.celery_app worker --loglevel=info

test-backend:
	cd backend && pytest

docker-up:
	docker-compose up --build

