from app.tasks.celery_app import celery_app


@celery_app.task
def ping_resume_pipeline() -> dict[str, str]:
    return {"status": "queued", "task": "resume_pipeline"}

