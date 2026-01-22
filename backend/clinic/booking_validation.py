"""
Booking Validation Service
Provides comprehensive validation for booking requests to prevent common issues:
- Double booking / Race conditions
- Slot capacity overflow (counting total people, not bookings)
- Time-off conflicts
- Patient booking limits (one per day per doctor)
"""

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from clinic.models import Booking
from scheduling.models import DoctorAvailability, TimeOff


class BookingValidator:
    """
    Comprehensive booking validation service.
    All validation methods return (is_valid: bool, error_message: str or None)
    
    Key Logic:
    - max_patients_per_slot: Maximum TOTAL PEOPLE (not bookings) per time slot
    - Patient can book ONCE per DAY per doctor
    - Only PENDING and CONFIRMED count towards capacity (COMPLETED frees slot)
    - number_of_people in booking counts against slot capacity
    """
    
    @staticmethod
    def get_slot_people_count(doctor, booking_datetime, exclude_booking_id=None):
        """
        Get the current number of PEOPLE (not bookings) for a specific slot.
        Sums up number_of_people from all active bookings.
        Only counts PENDING and CONFIRMED - COMPLETED/CANCELLED don't count.
        """
        # Only CANCELLED frees the slot
        bookings = Booking.objects.filter(
            doctor=doctor,
            booking_datetime=booking_datetime
        ).exclude(status=Booking.Status.CANCELLED)
        
        if exclude_booking_id:
            bookings = bookings.exclude(id=exclude_booking_id)
        
        # Sum the number_of_people field
        result = bookings.aggregate(total_people=Sum('number_of_people'))
        return result['total_people'] or 0
    
    @staticmethod
    def get_max_patients_for_slot(doctor, booking_datetime):
        """
        Get the max patients allowed for the slot based on doctor's availability settings.
        Falls back to 5 if no specific setting found.
        """
        # Get day of week (Python: 0=Mon, Model: 0=Sun)
        python_day = booking_datetime.weekday()
        model_day = 0 if python_day == 6 else python_day + 1
        
        availability = DoctorAvailability.objects.filter(
            doctor=doctor,
            day_of_week=model_day,
            is_available=True,
            start_time__lte=booking_datetime.time(),
            end_time__gte=booking_datetime.time()
        ).first()
        
        if availability:
            return availability.max_patients_per_slot
        return 5  # Default fallback
    
    @classmethod
    def validate_slot_availability(cls, doctor, booking_datetime, number_of_people=1, exclude_booking_id=None):
        """
        Check if the slot has capacity for the requested number of people.
        Uses database locking to prevent race conditions.
        
        Args:
            doctor: Doctor object
            booking_datetime: DateTime of the slot
            number_of_people: How many people are being booked
            exclude_booking_id: Exclude this booking from count (for edits)
        
        Returns: (is_valid, error_message)
        """
        with transaction.atomic():
            # Lock the relevant bookings to prevent race condition
            # Only CANCELLED frees the slot
            bookings = Booking.objects.select_for_update().filter(
                doctor=doctor,
                booking_datetime=booking_datetime
            ).exclude(status=Booking.Status.CANCELLED)
            
            if exclude_booking_id:
                bookings = bookings.exclude(id=exclude_booking_id)
            
            # Sum total people currently booked
            result = bookings.aggregate(total_people=Sum('number_of_people'))
            current_people = result['total_people'] or 0
            
            max_patients = cls.get_max_patients_for_slot(doctor, booking_datetime)
            available_spots = max_patients - current_people
            
            if number_of_people > available_spots:
                if available_spots <= 0:
                    return False, f"هذا الموعد ممتلئ ({current_people}/{max_patients}). الرجاء اختيار موعد آخر."
                else:
                    return False, f"متوفر {available_spots} أماكن فقط، لكنك طلبت {number_of_people}. الرجاء تقليل العدد أو اختيار موعد آخر."
            
            return True, None
    
    @classmethod
    def validate_one_booking_per_day(cls, patient, doctor, booking_datetime, exclude_booking_id=None):
        """
        Check if patient already has a booking on this DAY with this doctor.
        Patient can only book ONCE per day per doctor.
        
        Returns: (is_valid, error_message)
        """
        booking_date = booking_datetime.date()
        
        # Only CANCELLED frees the slot for daily limit
        existing_booking = Booking.objects.filter(
            patient=patient,
            doctor=doctor,
            booking_datetime__date=booking_date
        ).exclude(status=Booking.Status.CANCELLED)
        
        if exclude_booking_id:
            existing_booking = existing_booking.exclude(id=exclude_booking_id)
        
        if existing_booking.exists():
            return False, "لديك حجز مسجل بالفعل في هذا اليوم عند هذا الطبيب. بإمكانك الحجز في يوم آخر."
        
        return True, None
    
    @classmethod
    def validate_number_of_people(cls, number_of_people, max_allowed=10):
        """
        Validate the number of people in a booking.
        
        Returns: (is_valid, error_message)
        """
        if number_of_people < 1:
            return False, "يجب حجز شخص واحد على الأقل."
        
        if number_of_people > max_allowed:
            return False, f"الحد الأقصى للحجز {max_allowed} أشخاص في الحجز الواحد."
        
        return True, None
    
    @classmethod
    def validate_time_off_conflict(cls, doctor, booking_datetime):
        """
        Check if the booking time conflicts with doctor's time off.
        
        Returns: (is_valid, error_message)
        """
        booking_date = booking_datetime.date()
        booking_time = booking_datetime.time()
        
        # Check full day time off
        full_day_off = TimeOff.objects.filter(
            doctor=doctor,
            start_date__lte=booking_date,
            end_date__gte=booking_date,
            start_time__isnull=True,
            end_time__isnull=True,
            status=TimeOff.Status.ACTIVE
        ).exists()
        
        if full_day_off:
            return False, "الطبيب في إجازة في هذا اليوم."
        
        # Check partial time off
        partial_off = TimeOff.objects.filter(
            doctor=doctor,
            start_date__lte=booking_date,
            end_date__gte=booking_date,
            start_time__lte=booking_time,
            end_time__gte=booking_time,
            status=TimeOff.Status.ACTIVE
        ).exists()
        
        if partial_off:
            return False, "الطبيب غير متاح في هذا الوقت."
        
        return True, None
    
    @classmethod
    def validate_future_booking(cls, booking_datetime):
        """
        Ensure booking is in the future.
        
        Returns: (is_valid, error_message)
        """
        if booking_datetime < timezone.now():
            return False, "لا يمكن الحجز في تاريخ ماضٍ."
        
        return True, None
    
    @classmethod
    def validate_booking_not_too_far(cls, booking_datetime, max_days=90):
        """
        Prevent bookings too far in the future.
        
        Returns: (is_valid, error_message)
        """
        max_date = timezone.now() + timedelta(days=max_days)
        if booking_datetime > max_date:
            return False, f"لا يمكن الحجز لأكثر من {max_days} يوماً مسبقاً."
        
        return True, None
    
    @classmethod
    def validate_all(cls, doctor, patient, booking_datetime, number_of_people=1, exclude_booking_id=None):
        """
        Run all validations and return comprehensive result.
        
        Returns: (is_valid, errors_list)
        """
        errors = []
        
        # Validate number of people
        is_valid, error = cls.validate_number_of_people(number_of_people)
        if not is_valid:
            errors.append(error)
            return False, errors  # Stop early - invalid input
        
        # Future booking check
        is_valid, error = cls.validate_future_booking(booking_datetime)
        if not is_valid:
            errors.append(error)
        
        # Not too far in future
        is_valid, error = cls.validate_booking_not_too_far(booking_datetime)
        if not is_valid:
            errors.append(error)
        
        # Time off conflict
        is_valid, error = cls.validate_time_off_conflict(doctor, booking_datetime)
        if not is_valid:
            errors.append(error)
        
        # One booking per day per doctor
        is_valid, error = cls.validate_one_booking_per_day(patient, doctor, booking_datetime, exclude_booking_id)
        if not is_valid:
            errors.append(error)
        
        # Slot availability with people count (with locking)
        is_valid, error = cls.validate_slot_availability(doctor, booking_datetime, number_of_people, exclude_booking_id)
        if not is_valid:
            errors.append(error)
        
        return len(errors) == 0, errors


class SlotInfo:
    """
    Helper class for slot information.
    """
    
    @staticmethod
    def get_slot_details(doctor, booking_datetime):
        """
        Get detailed information about a slot.
        Returns people count, not booking count.
        """
        current_people = BookingValidator.get_slot_people_count(doctor, booking_datetime)
        max_patients = BookingValidator.get_max_patients_for_slot(doctor, booking_datetime)
        
        return {
            'current_people': current_people,
            'max_patients': max_patients,
            'available_spots': max(0, max_patients - current_people),
            'is_full': current_people >= max_patients,
            'percentage_full': round((current_people / max_patients) * 100) if max_patients > 0 else 0
        }
