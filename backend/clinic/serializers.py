from rest_framework import serializers
from .models import Booking, Rating, ActivityLog

class BookingSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True)
    patient_email = serializers.EmailField(source='patient.user.email', read_only=True)
    is_rated = serializers.SerializerMethodField()
    
    def get_is_rated(self, obj):
        return hasattr(obj, 'rating')

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'status', 'patient', 'is_rated']

class RatingSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.user.get_full_name', read_only=True)
    
    class Meta:
        model = Rating
        fields = ['id', 'booking', 'doctor', 'patient', 'doctor_name', 'patient_name', 
                  'stars', 'comment', 'doctor_response', 'is_public', 'created_at']
        read_only_fields = ['id', 'created_at', 'patient', 'doctor_name', 'patient_name']

class ActivityLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_role = serializers.SerializerMethodField()
    
    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name()
        return "System"
    
    def get_actor_role(self, obj):
        if obj.actor:
            return obj.actor.role
        return "SYSTEM"
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'action_type', 'description', 'created_at', 'actor_name', 'actor_role', 'target_id']

