import firebase_admin
from firebase_admin import credentials
import os
import logging

logger = logging.getLogger(__name__)
_initialized = False


def initialize_firebase() -> None:
    global _initialized
    if _initialized:
        return
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # On Cloud Run, use Application Default Credentials (workload identity)
        firebase_admin.initialize_app()
    _initialized = True
    logger.info("Firebase initialized")


def get_firestore_client():
    from google.cloud import firestore
    return firestore.AsyncClient()
