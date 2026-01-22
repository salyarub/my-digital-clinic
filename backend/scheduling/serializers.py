from rest_framework import serializers
from .models import DoctorAvailability, TimeOff, ReschedulingRequest
from clinic.serializers import BookingSerializer

class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DoctorAvailability
        fields = ['id', 'day_of_week', 'day_name', 'start_time', 'end_time', 
                  'slot_duration', 'max_patients_per_slot', 'is_available']
        read_only_fields = ['id', 'doctor']
    
    def get_day_name(self, obj):
        days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return days[obj.day_of_week]

class TimeOffSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeOff
        fields = ['id', 'start_date', 'end_date', 'start_time', 'end_time', 
                  'reason', 'suggestion_expiry', 'conflicting_bookings_count', 'status', 'type']
        read_only_fields = ['conflicting_bookings_count', 'all_conflicts_handled']

class ReschedulingRequestSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True)
    original_booking_details = BookingSerializer(source='original_booking', read_only=True)
    
    class Meta:
        model = ReschedulingRequest
        fields = ['id', 'token', 'doctor_name', 'patient_name', 'suggested_slots', 
                  'status', 'expires_at', 'original_booking_details']
