"""
Booking Reminder Scheduler
Runs as a background thread within the Django process.
Checks every 30 minutes for bookings that need reminders sent.

Smart reminder logic:
- Booked days before → remind the day before the appointment
- Booked 1 day before → remind 2 hours before appointment
- Booked only hours before → no reminder (too recent)
"""
import threading
import time
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

INTERVAL_SECONDS = 30 * 60  # Check every 30 minutes


def send_booking_reminders():
    """Check for bookings that need reminders and send them."""
    from django.utils import timezone
    from clinic.models import Booking
    from core.email_service import send_dynamic_email

    now = timezone.now()

    # Get all confirmed/pending bookings that haven't had reminders sent yet
    upcoming_bookings = Booking.objects.filter(
        status__in=['CONFIRMED', 'PENDING'],
        reminder_sent=False,
        booking_datetime__gt=now,
        is_walkin=False,  # Only for registered patients
        patient__isnull=False,
    ).select_related('patient__user', 'doctor__user')

    for booking in upcoming_bookings:
        try:
            time_until_appointment = booking.booking_datetime - now
            time_since_booked = now - booking.created_at
            hours_until = time_until_appointment.total_seconds() / 3600
            hours_since_booked = time_since_booked.total_seconds() / 3600

            should_send = False

            # Case 1: Booked days before → remind when it's the day before (within 24 hours)
            if hours_since_booked >= 48 and hours_until <= 24:
                should_send = True

            # Case 2: Booked ~1 day before → remind 2 hours before
            elif 12 <= hours_since_booked < 48 and hours_until <= 2:
                should_send = True

            # Case 3: Booked only hours before → no reminder
            # (hours_since_booked < 12 → skip)

            if should_send:
                patient_user = booking.patient.user
                doctor_user = booking.doctor.user

                appointment_date = booking.booking_datetime.strftime('%Y-%m-%d')
                appointment_time = booking.booking_datetime.strftime('%I:%M %p')

                send_dynamic_email(
                    subject='تذكير بموعدك - عيادتك الرقمية',
                    template_name='emails/booking_reminder.html',
                    context={
                        'patient_name': patient_user.first_name or patient_user.email,
                        'doctor_name': f'{doctor_user.first_name} {doctor_user.last_name}',
                        'appointment_date': appointment_date,
                        'appointment_time': appointment_time,
                    },
                    recipient_list=[patient_user.email]
                )

                booking.reminder_sent = True
                booking.save(update_fields=['reminder_sent'])
                logger.info(f"Reminder sent for booking {booking.id} to {patient_user.email}")

        except Exception as e:
            logger.error(f"Error sending reminder for booking {booking.id}: {e}")


def _scheduler_loop():
    """Background loop that runs the reminder check periodically."""
    # Wait 60 seconds after startup before first check
    time.sleep(60)
    
    while True:
        try:
            send_booking_reminders()
        except Exception as e:
            logger.error(f"Reminder scheduler error: {e}")
        
        time.sleep(INTERVAL_SECONDS)


def start_reminder_scheduler():
    """Start the scheduler as a daemon thread."""
    thread = threading.Thread(target=_scheduler_loop, daemon=True)
    thread.start()
    logger.info("Booking reminder scheduler started (checking every 30 minutes)")
