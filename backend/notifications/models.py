import uuid
from django.db import models
from users.models import Doctor, Patient, Secretary

class BaseNotification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Generic link to related object (e.g. Booking ID)
    related_object_id = models.CharField(max_length=100, null=True, blank=True)
    
    class Meta:
        abstract = True
        ordering = ['-created_at']

class DoctorNotification(BaseNotification):
    recipient = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50) # e.g. NEW_BOOKING

class PatientNotification(BaseNotification):
    recipient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50) # e.g. RESCHEDULE_REQ

class SecretaryNotification(BaseNotification):
    recipient = models.ForeignKey(Secretary, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50)
