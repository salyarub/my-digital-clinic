"""
Management command to expire old unhandled bookings.
Run this at midnight or end of each day.

Usage: python manage.py expire_old_bookings
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from clinic.models import Booking

class Command(BaseCommand):
    help = 'Marks old unhandled bookings as EXPIRED'

    def handle(self, *args, **options):
        today = timezone.now().date()
        total_updated = 0
        
        # 1. PENDING bookings → EXPIRED (no approval decision was made)
        pending_expired = Booking.objects.filter(
            booking_datetime__date__lt=today,
            status=Booking.Status.PENDING
        ).update(
            status=Booking.Status.EXPIRED,
            cancellation_reason='لم يتم اتخاذ قرار بشأن الموافقة - Expired: No approval decision made'
        )
        total_updated += pending_expired
        
        # 2. CONFIRMED bookings → NO_SHOW (approved but exam never started)
        confirmed_noshow = Booking.objects.filter(
            booking_datetime__date__lt=today,
            status=Booking.Status.CONFIRMED
        ).update(
            status=Booking.Status.NO_SHOW,
            cancellation_reason='تمت الموافقة لكن لم يبدأ الفحص - No Show: Approved but exam never started'
        )
        total_updated += confirmed_noshow
        
        # 3. IN_PROGRESS bookings → EXPIRED (exam started but never completed)
        in_progress_expired = Booking.objects.filter(
            booking_datetime__date__lt=today,
            status=Booking.Status.IN_PROGRESS
        ).update(
            status=Booking.Status.EXPIRED,
            cancellation_reason='بدأ الفحص لكن لم يكتمل - Expired: Exam started but never completed'
        )
        total_updated += in_progress_expired
        
        if total_updated > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Updated {total_updated} booking(s): '
                    f'{pending_expired} expired, {confirmed_noshow} no-show, {in_progress_expired} incomplete'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('No old bookings to update')
            )
