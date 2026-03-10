import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

# 1. Custom User Model (Replaces default auth_user)
class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None  # Remove username field
    email = models.EmailField(unique=True) # Use email for authentication
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)
    ban_reason = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    objects = CustomUserManager()

    
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        DOCTOR = "DOCTOR", "Doctor"
        PATIENT = "PATIENT", "Patient"
        SECRETARY = "SECRETARY", "Secretary"
        
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.PATIENT)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = [] # Email is handled by USERNAME_FIELD

    def __str__(self):
        return self.email

# 2. Doctor Profile
class Doctor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    
    # Doctor specific fields
    specialty = models.CharField(max_length=100, db_index=True)
    consultation_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True, help_text="Clinic address")
    landmark = models.CharField(max_length=255, blank=True, help_text="Nearby landmark for easy finding")
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    maps_link = models.URLField(max_length=500, blank=True, null=True, help_text="Google Maps Link")
    
    # Verification & Personal Info
    license_image = models.ImageField(upload_to='doctor_licenses/', blank=True, null=True)
    gender = models.CharField(max_length=10, choices=[('M', 'Male'), ('F', 'Female')], default='M')
    
    # Social Media Links
    facebook = models.URLField(blank=True, max_length=255)
    instagram = models.URLField(blank=True, max_length=255)
    tiktok = models.URLField(blank=True, max_length=255)
    twitter = models.URLField(blank=True, max_length=255)
    youtube = models.URLField(blank=True, max_length=255)
    
    class VerificationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        
    verification_status = models.CharField(
        max_length=20, 
        choices=VerificationStatus.choices, 
        default=VerificationStatus.PENDING
    )
    rejection_reason = models.TextField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    
    # Schedule Settings
    session_duration = models.PositiveIntegerField(default=480, help_text="Working session duration in minutes (e.g., 480 = 8 hours)")
    time_per_patient = models.PositiveIntegerField(default=15, help_text="Average time per patient in minutes")
    allow_overbooking = models.BooleanField(default=False, help_text="Allow adding patients beyond calculated limit")
    
    class CalendarView(models.TextChoices):
        WEEKLY = 'WEEKLY', 'Weekly'
        MONTHLY = 'MONTHLY', 'Monthly'
    
    preferred_calendar_view = models.CharField(max_length=10, choices=CalendarView.choices, default=CalendarView.WEEKLY)
    
    # Booking Settings
    booking_visibility_weeks = models.PositiveIntegerField(
        default=4, 
        choices=[(i, f'{i} Week{"s" if i > 1 else ""}') for i in range(1, 21)],
        help_text="How many weeks in advance patients can see availability"
    )
    is_digital_booking_active = models.BooleanField(default=True, help_text="Master switch for digital bookings")
    booking_cutoff_hours = models.PositiveIntegerField(default=1, help_text="Minimum hours before appointment to allow booking")
    is_booking_cutoff_active = models.BooleanField(default=True, help_text="Turn off to bypass booking cutoff hours")
    
    # Auto-Approve Settings
    auto_approve_bookings = models.BooleanField(default=False, help_text="Automatically approve incoming bookings")
    
    @property
    def max_patients_per_session(self):
        """Calculate max patients based on session duration and time per patient"""
        if self.time_per_patient > 0:
            return self.session_duration // self.time_per_patient
        return 0
    
    def __str__(self):
        return f"Dr. {self.user.first_name} {self.user.last_name}"

# 3. Patient Profile
class Patient(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    
    # Patient specific fields
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[('M', 'Male'), ('F', 'Female')], default='M')
    
    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"

# 4. Secretary Profile
class Secretary(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='secretaries')
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='secretary_profile')
    
    # Permissions: ['manage_bookings', 'patient_checkin', 'view_patients']
    permissions = models.JSONField(default=list, blank=True)
    
    def __str__(self):
        return f"Secretary for {self.doctor}"

# 5. SMTP Settings (Admin configured)
class SMTPSettings(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.CharField(max_length=255, default='smtp.gmail.com')
    port = models.IntegerField(default=587)
    email_host_user = models.EmailField()
    email_host_password = models.CharField(max_length=255, help_text="App Password for Gmail")
    use_tls = models.BooleanField(default=True)
    is_active = models.BooleanField(default=False, help_text="Only one config can be active at a time")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.is_active:
            # Deactivate all other SMTP settings
            SMTPSettings.objects.filter(is_active=True).update(is_active=False)
        super(SMTPSettings, self).save(*args, **kwargs)

    def __str__(self):
        return f"SMTP Config: {self.email_host_user} ({'Active' if self.is_active else 'Inactive'})"

# 6. Auth Tokens (Email Verification & Password Reset)
class EmailVerificationToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verification_tokens')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            from datetime import timedelta
            from django.utils import timezone
            self.expires_at = timezone.now() + timedelta(hours=24)
        super(EmailVerificationToken, self).save(*args, **kwargs)

    def is_valid(self):
        from django.utils import timezone
        return self.expires_at > timezone.now()

    def __str__(self):
        return f"Verification Token for {self.user.email}"

class PasswordResetToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"Reset Token for {self.user.email}"
