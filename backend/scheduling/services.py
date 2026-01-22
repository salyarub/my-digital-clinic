import datetime
from django.db.models import Q
from dateutil.relativedelta import relativedelta
from clinic.models import Booking
from scheduling.models import DoctorAvailability
from django.utils import timezone

class ConflictService:
    @staticmethod
    def check_conflicts(doctor, start_date, end_date):
        """
        Returns a QuerySet of bookings that conflict with the given date range.
        Considers bookings that overlap with the day (assuming bookings have time).
        Simple logic: Any booking on these dates.
        """
        # Assuming booking_datetime is datetimetz
        # We check if booking's date part falls within start_date and end_date
        conflicts = Booking.objects.filter(
            doctor=doctor,
            status__in=[Booking.Status.CONFIRMED, Booking.Status.PENDING],
            booking_datetime__date__range=[start_date, end_date]
        )
        return conflicts

    @staticmethod
    def auto_resolve_conflicts(time_off_request):
        """
        Cancels conflicting bookings and creates rescheduling requests with suggested slots.
        """
        from scheduling.models import ReschedulingRequest
        import secrets
        
        # Filter by time range if specified
        conflicts = ConflictService.check_conflicts(
            time_off_request.doctor, 
            time_off_request.start_date, 
            time_off_request.end_date
        )
        
        # If time range is specified, filter further
        if time_off_request.start_time and time_off_request.end_time:
            filtered = []
            for booking in conflicts:
                booking_time = booking.booking_datetime.time()
                if time_off_request.start_time <= booking_time <= time_off_request.end_time:
                    filtered.append(booking)
            conflicts = filtered
        
        results = {
            "cancelled_count": 0,
            "rescheduling_count": 0,
            "walkin_cancelled": 0
        }
        
        # Calculate expiry datetime
        expiry_days = {
            '1_DAY': 1,
            '2_DAYS': 2,
            '1_WEEK': 7
        }.get(time_off_request.suggestion_expiry, 2)
        expires_at = timezone.now() + datetime.timedelta(days=expiry_days)
        
        for booking in conflicts:
            # Cancel Booking
            booking.status = Booking.Status.CANCELLED
            booking.cancellation_reason = f"إجازة طارئة للطبيب - Doctor Emergency Time Off: {time_off_request.reason}"
            booking.save()
            results["cancelled_count"] += 1
            
            # Skip walk-in patients (no account to send notifications to)
            if booking.is_walkin or not booking.patient:
                results["walkin_cancelled"] += 1
                continue
            
            # Generate 3 suggestion slots
            suggested_slots = SmartSlotEngine.find_suggested_slots(
                time_off_request.doctor, 
                needed_slots=3,
                start_search_date=time_off_request.end_date + datetime.timedelta(days=1)
            )
            
            # Create ReschedulingRequest
            token = secrets.token_urlsafe(32)
            reschedule_req = ReschedulingRequest.objects.create(
                token=token,
                original_booking=booking,
                time_off_request=time_off_request,
                doctor=time_off_request.doctor,
                patient=booking.patient,
                suggested_slots=suggested_slots,
                expires_at=expires_at
            )
            
            # Send Notification
            try:
                from notifications.views import create_notification
                
                slots_text = ", ".join([s[:10] for s in suggested_slots[:3]])  # Show dates only
                message = (
                    f'عذراً، تم إلغاء موعدك بتاريخ {booking.booking_datetime.strftime("%Y-%m-%d %H:%M")} '
                    f'بسبب ظرف طارئ للطبيب. لديك {expiry_days} يوم لاختيار موعد بديل. '
                    f'المواعيد المقترحة: {slots_text}'
                )
                
                create_notification(
                    'patient',
                    booking.patient,
                    'RESCHEDULE_OFFER',
                    message,
                    related_object_id=reschedule_req.id
                )
            except Exception as e:
                print(f"Failed to send notification: {e}")
            
            results["rescheduling_count"] += 1
        
        time_off_request.conflicting_bookings_count = results["cancelled_count"]
        time_off_request.save()
        
        return results

class SmartSlotEngine:
    @staticmethod
    def get_python_day_from_model(model_day):
        # Model: 0=Sun, 1=Mon... 6=Sat
        # Python: 0=Mon, 1=Tue... 6=Sun
        if model_day == 0: return 6
        return model_day - 1

    @staticmethod
    def get_model_day_from_python(python_day):
        # Python 0(Mon) -> 1
        # Python 6(Sun) -> 0
        if python_day == 6: return 0
        return python_day + 1
        
    @staticmethod
    def find_suggested_slots(doctor, duration_minutes=30, needed_slots=3, start_search_date=None):
        """
        Finds the next 'needed_slots' available slots for the doctor.
        """
        from scheduling.models import TimeOff

        if not start_search_date:
            start_search_date = datetime.date.today() + datetime.timedelta(days=1)
            
        suggested_slots = []
        current_date = start_search_date
        days_searched = 0
        
        # Limit search to avoid infinite loop
        while len(suggested_slots) < needed_slots and days_searched < 30:
            # Check for Full Day TimeOff
            is_full_day_off = TimeOff.objects.filter(
                doctor=doctor,
                start_date__lte=current_date,
                end_date__gte=current_date,
                start_time__isnull=True,
                end_time__isnull=True
            ).exclude(status='CANCELLED').exists()
            
            if is_full_day_off:
                current_date += datetime.timedelta(days=1)
                days_searched += 1
                continue

            # Get partial time offs for this day
            partial_time_offs = TimeOff.objects.filter(
                doctor=doctor,
                start_date__lte=current_date,
                end_date__gte=current_date
            ).exclude(start_time__isnull=True, end_time__isnull=True).exclude(status='CANCELLED')

            python_day = current_date.weekday()
            model_day = SmartSlotEngine.get_model_day_from_python(python_day)
            
            # Get doctor's availability for this day of week
            availabilities = DoctorAvailability.objects.filter(
                doctor=doctor, 
                day_of_week=model_day,
                is_available=True
            )
            
            for avail in availabilities:
                slot_start_time = avail.start_time
                while True:
                    slot_dt = datetime.datetime.combine(current_date, slot_start_time)
                    slot_end_dt = slot_dt + datetime.timedelta(minutes=duration_minutes)
                    
                    if slot_end_dt.time() > avail.end_time:
                        break
                        
                    # Check TimeOff conflicts (Partial)
                    is_off = False
                    for off in partial_time_offs:
                        if off.start_time <= slot_dt.time() <= off.end_time:
                            is_off = True
                            break
                    
                    if is_off:
                        # Move to next slot
                        next_slot_time = (slot_dt + datetime.timedelta(minutes=duration_minutes)).time()
                        if next_slot_time < slot_start_time: break
                        slot_start_time = next_slot_time
                        continue

                    # Check booking conflicts
                    is_conflict = Booking.objects.filter(
                        doctor=doctor,
                        status__in=[Booking.Status.CONFIRMED, Booking.Status.PENDING],
                        booking_datetime=slot_dt
                    ).exists()
                    
                    if not is_conflict:
                        suggested_slots.append(slot_dt.isoformat())
                        if len(suggested_slots) >= needed_slots:
                            return suggested_slots
                    
                    next_slot_time = (slot_dt + datetime.timedelta(minutes=duration_minutes)).time()
                    if next_slot_time < slot_start_time:
                        break
                    slot_start_time = next_slot_time
            
            current_date += datetime.timedelta(days=1)
            days_searched += 1
            
        return suggested_slots
