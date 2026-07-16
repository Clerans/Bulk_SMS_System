from app.websocket.events import broadcast_notification

def notify_campaign_started(campaign_name: str):
    broadcast_notification(f"Campaign '{campaign_name}' has started.", "info")

def notify_campaign_completed(campaign_name: str):
    broadcast_notification(f"Campaign '{campaign_name}' completed successfully.", "success")

def notify_gateway_connected(gateway_name: str):
    broadcast_notification(f"SMS Gateway '{gateway_name}' connected successfully.", "success")

def notify_gateway_offline(gateway_name: str):
    broadcast_notification(f"SMS Gateway '{gateway_name}' is offline!", "error")

def notify_import_completed(count: int):
    broadcast_notification(f"Contact Import Completed: {count} contacts imported.", "success")

def notify_sms_failed(phone: str, error_message: str):
    broadcast_notification(f"SMS delivery failed to {phone}: {error_message}", "error")
