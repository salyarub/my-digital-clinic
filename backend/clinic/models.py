import uuid
from django.db import models
from users.models import Doctor, Patient
from users.models import User # For ActivityLog actor

class Booking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='bookings')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='bookings', null=True, blank=True)
    
    # Walk-in patient fields (for patients without account)
    is_walkin = models.BooleanField(default=False)
    walkin_patient_name = models.CharField(max_length=255, blank=True, null=True)
    walkin_patient_phone = models.CharField(max_length=20, blank=True, null=True)
    
    booking_datetime = models.DateTimeField(db_index=True)
    
    # Number of people in this booking (for group/family bookings)
    number_of_people = models.PositiveIntegerField(default=1)
    
    # Track if this booking was added as overflow (walk-in only, after regular hours)
    is_overflow = models.BooleanField(default=False)
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        CANCELLED = 'CANCELLED', 'Cancelled'
        COMPLETED = 'COMPLETED', 'Completed'
        NO_SHOW = 'NO_SHOW', 'No Show'
        EXPIRED = 'EXPIRED', 'Expired - No Action Taken'
        RESCHEDULING = 'RESCHEDULING_PENDING', 'Rescheduling Pending'
        
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    
    # Booking Type
    class BookingType(models.TextChoices):
        NEW = 'NEW', 'New Patient'
        FOLLOWUP = 'FOLLOWUP', 'Follow-up'
    
    booking_type = models.CharField(max_length=20, choices=BookingType.choices, default=BookingType.NEW)
    
    # Details
    patient_notes = models.TextField(blank=True, null=True)
    doctor_notes = models.TextField(blank=True, null=True)
    cancellation_reason = models.CharField(max_length=255, blank=True, null=True)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Rescheduling Links
    rescheduled_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='rescheduled_to_booking')

    def __str__(self):
        return f"Booking {self.id} - {self.doctor} / {self.patient} ({self.status})"

class ActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='activity_logs')
    actor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='actions')
    
    class ActionType(models.TextChoices):
        BOOKING_CREATED = 'BOOKING_CREATED', 'Booking Created'
        BOOKING_APPROVED = 'BOOKING_APPROVED', 'Booking Approved'
        BOOKING_REJECTED = 'BOOKING_REJECTED', 'Booking Rejected'
        BOOKING_CANCELLED = 'BOOKING_CANCELLED', 'Booking Cancelled'
        BOOKING_RESCHEDULED = 'BOOKING_RESCHEDULED', 'Booking Rescheduled'
        CHECK_IN = 'CHECK_IN', 'Patient Check-in'
        EXAM_STARTED = 'EXAM_STARTED', 'Exam Started'
        EXAM_COMPLETED = 'EXAM_COMPLETED', 'Exam Completed'
        NO_SHOW = 'NO_SHOW', 'No Show Recorded'
        WALKIN_ADDED = 'WALKIN_ADDED', 'Walk-in Patient Added'
        SECRETARY_ADDED = 'SECRETARY_ADDED', 'Secretary Added'
        SECRETARY_REMOVED = 'SECRETARY_REMOVED', 'Secretary Removed'
        SECRETARY_UPDATED = 'SECRETARY_UPDATED', 'Secretary Updated'
        
    action_type = models.CharField(max_length=50, choices=ActionType.choices)
    target_id = models.UUIDField(null=True, blank=True)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.actor} - {self.action_type} - {self.created_at}"

class Rating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='rating')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='ratings')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='ratings')
    
    stars = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    doctor_response = models.TextField(blank=True)
    
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.stars} Stars for {self.doctor}"
