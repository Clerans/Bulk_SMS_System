import json
import redis
from app.core.config import settings

def publish_event(event_name: str, data: dict):
    """
    Synchronously publishes a payload to the Redis broadcast channel.
    Safe to call from sync functions, Celery tasks, or thread pools.
    """
    payload = {
        "event": event_name,
        **data
    }
    try:
        r = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=0.1, socket_timeout=0.1)
        r.publish("sms_ws_broadcast", json.dumps(payload))
    except Exception as e:
        # Safe fallback
        pass

def broadcast_campaign_progress(
    campaign_id: str,
    progress: float,
    recipient_count: int = 0,
    sent_count: int = 0,
    delivered_count: int = 0,
    failed_count: int = 0,
    pending_count: int = 0,
    status: str = "PROCESSING"
):
    publish_event("campaign_progress", {
        "campaignId": campaign_id,
        "progress": progress,
        "recipientCount": recipient_count,
        "sentCount": sent_count,
        "deliveredCount": delivered_count,
        "failedCount": failed_count,
        "pendingCount": pending_count,
        "status": status
    })

def broadcast_dashboard_update(today: int, failed: int, queued: int):
    publish_event("dashboard_update", {
        "today": today,
        "failed": failed,
        "queued": queued
    })

def broadcast_sms_status(phone: str, status: str, campaign_id: str = None, reason: str = None):
    publish_event("sms_status", {
        "phone": phone,
        "status": status,
        "campaignId": campaign_id,
        "reason": reason
    })

def broadcast_notification(title: str, type_str: str = "info"):
    publish_event("notification", {
        "title": title,
        "type": type_str
    })
