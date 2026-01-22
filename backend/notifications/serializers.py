from rest_framework import serializers
from .models import DoctorNotification, PatientNotification, SecretaryNotification
from clinic.models import Booking

class DoctorNotificationSerializer(serializers.ModelSerializer):
    # Returns the current booking status if this notification is for a booking
    related_booking_status = serializers.SerializerMethodField()
    
    class Meta:
        model = DoctorNotification
        fields = ['id', 'message', 'notification_type', 'is_read', 'read_at', 'created_at', 'related_object_id', 'related_booking_status']
        read_only_fields = ['id', 'created_at']
    
    def get_related_booking_status(self, obj):
        """Get the current status of the related booking if applicable"""
        if obj.notification_type in ['NEW_BOOKING', 'BOOKING_CREATED'] and obj.related_object_id:
            try:
                booking = Booking.objects.get(id=obj.related_object_id)
                return booking.status
            except Booking.DoesNotExist:
                return None
        return None

class PatientNotificationSerializer(serializers.ModelSerializer):
    related_booking_status = serializers.SerializerMethodField()
    reschedule_data = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientNotification
        fields = ['id', 'message', 'notification_type', 'is_read', 'read_at', 'created_at', 'related_object_id', 'related_booking_status', 'reschedule_data']
        read_only_fields = ['id', 'created_at']
    
    def get_related_booking_status(self, obj):
        if obj.notification_type in ['NEW_BOOKING', 'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED'] and obj.related_object_id:
            try:
                booking = Booking.objects.get(id=obj.related_object_id)
                return booking.status
            except Booking.DoesNotExist:
                return None
        return None
    
    def get_reschedule_data(self, obj):
        """Get reschedule request data for RESCHEDULE_OFFER notifications"""
        if obj.notification_type == 'RESCHEDULE_OFFER' and obj.related_object_id:
            try:
                from scheduling.models import ReschedulingRequest
                from django.utils import timezone
                
                reschedule_req = ReschedulingRequest.objects.get(id=obj.related_object_id)
                
                # Get original booking info
                original_booking_info = None
                if reschedule_req.original_booking:
                    original_booking_info = {
                        'id': str(reschedule_req.original_booking.id),
                        'datetime': reschedule_req.original_booking.booking_datetime.isoformat()
                    }
                
                return {
                    'id': str(reschedule_req.id),
                    'suggested_slots': reschedule_req.suggested_slots,
                    'status': reschedule_req.status,
                    'expires_at': reschedule_req.expires_at.isoformat(),
                    'is_expired': reschedule_req.expires_at < timezone.now(),
                    'original_booking': original_booking_info,
                    'doctor_name': f"{reschedule_req.doctor.user.first_name} {reschedule_req.doctor.user.last_name}"
                }
            except Exception as e:
                print(f"Error fetching reschedule data: {e}")
                return None
        return None

class SecretaryNotificationSerializer(serializers.ModelSerializer):
    related_booking_status = serializers.SerializerMethodField()
    
    class Meta:
        model = SecretaryNotification
        fields = ['id', 'message', 'notification_type', 'is_read', 'read_at', 'created_at', 'related_object_id', 'related_booking_status']
        read_only_fields = ['id', 'created_at']
    
    def get_related_booking_status(self, obj):
        if obj.notification_type in ['NEW_BOOKING', 'BOOKING_CREATED'] and obj.related_object_id:
            try:
                booking = Booking.objects.get(id=obj.related_object_id)
                return booking.status
            except Booking.DoesNotExist:
                return None
        return None

