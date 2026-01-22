import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from users.models import Doctor, Patient
from clinic.models import Booking

class DoctorAvailability(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='availabilities')
    
    # 0=Sunday, 1=Monday, ...
    day_of_week = models.IntegerField(choices=[(i, str(i)) for i in range(7)]) 
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.IntegerField(default=30) # in minutes
    max_patients_per_slot = models.PositiveIntegerField(
        default=1,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(20)
        ],
        help_text="الحد الأقصى للمرضى في الموعد الواحد (1-20)"
    )  # max patients per time slot
    
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['day_of_week', 'start_time']

class TimeOff(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='time_off_requests')
    
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)  # For partial day off
    end_time = models.TimeField(null=True, blank=True)    # For partial day off
    reason = models.CharField(max_length=255, blank=True)
    
    # Suggestion Configuration
    class ExpiryDuration(models.TextChoices):
        ONE_DAY = '1_DAY', '1 Day'
        TWO_DAYS = '2_DAYS', '2 Days'
        ONE_WEEK = '1_WEEK', '1 Week'
    
    suggestion_expiry = models.CharField(max_length=20, choices=ExpiryDuration.choices, default=ExpiryDuration.TWO_DAYS)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class TimeOffType(models.TextChoices):
        ABSENCE = 'ABSENCE', 'Absence'
        DIGITAL_UNAVAILABLE = 'DIGITAL_UNAVAILABLE', 'Digital Unavailable'
        
    type = models.CharField(max_length=20, choices=TimeOffType.choices, default=TimeOffType.ABSENCE)

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        CANCELLED = 'CANCELLED', 'Cancelled'
        
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    
    # Conflict Management
    conflicting_bookings_count = models.IntegerField(default=0)
    all_conflicts_handled = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ReschedulingRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=255, unique=True) # Secure token for URL
    
    original_booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='rescheduling_requests')
    new_booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='generated_from_request')
    time_off_request = models.ForeignKey(TimeOff, on_delete=models.SET_NULL, null=True, blank=True, related_name='rescheduling_requests')
    
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    
    # Suggested Slots (JSON List of ISO timestamps)
    suggested_slots = models.JSONField(default=list) 
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'
        EXPIRED = 'EXPIRED', 'Expired'
        
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
