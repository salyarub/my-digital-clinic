from rest_framework import serializers
from django.db import models
from .models import User, Doctor, Patient, Secretary

class DoctorSerializer(serializers.ModelSerializer):
    max_patients_per_session = serializers.SerializerMethodField()
    
    class Meta:
        model = Doctor
        fields = ['id', 'specialty', 'consultation_price', 'bio', 'location', 'landmark', 'latitude', 'longitude', 
                  'facebook', 'instagram', 'tiktok', 'twitter', 'youtube', 'is_verified',
                  'session_duration', 'time_per_patient', 'allow_overbooking', 'preferred_calendar_view', 
                  'booking_visibility_weeks', 'is_digital_booking_active', 'booking_cutoff_hours', 'auto_approve_bookings',
                  'max_patients_per_session']
    
    def get_max_patients_per_session(self, obj):
        return obj.max_patients_per_session

# New serializer for doctor listing with user info
class DoctorListSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    profile_picture = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Doctor
        fields = ['id', 'first_name', 'last_name', 'email', 'profile_picture', 'specialty', 
                  'consultation_price', 'bio', 'location', 'landmark', 'latitude', 'longitude', 
                  'facebook', 'instagram', 'tiktok', 'twitter', 'youtube',
                  'is_verified', 'average_rating', 'ratings_count']
    
    def get_profile_picture(self, obj):
        if obj.user.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile_picture.url)
            return f'/media/{obj.user.profile_picture}'
        return None
    
    def get_average_rating(self, obj):
        from clinic.models import Rating
        ratings = Rating.objects.filter(doctor=obj)
        if ratings.exists():
            avg = ratings.aggregate(avg=models.Avg('stars'))['avg']
            return round(avg, 1) if avg else 0
        return 0
    
    def get_ratings_count(self, obj):
        from clinic.models import Rating
        return Rating.objects.filter(doctor=obj).count()

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ['id', 'date_of_birth', 'gender']

class SecretarySerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    
    class Meta:
        model = Secretary
        fields = ['id', 'doctor', 'permissions', 'email', 'first_name', 'last_name', 'is_active']

class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'profile', 'password', 'profile_picture', 'profile_picture_url', 'phone', 'permissions']
        extra_kwargs = {'password': {'write_only': True}}

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return f'/media/{obj.profile_picture}'
        return None

    def get_permissions(self, obj):
        """Return permissions for secretary users"""
        if obj.role == User.Role.SECRETARY and hasattr(obj, 'secretary_profile'):
            return obj.secretary_profile.permissions
        return []

    def get_profile(self, obj):
        if obj.role == User.Role.DOCTOR and hasattr(obj, 'doctor_profile'):
            return DoctorSerializer(obj.doctor_profile).data
        elif obj.role == User.Role.PATIENT and hasattr(obj, 'patient_profile'):
            return PatientSerializer(obj.patient_profile).data
        elif obj.role == User.Role.SECRETARY and hasattr(obj, 'secretary_profile'):
            return SecretarySerializer(obj.secretary_profile).data
        return None

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

# Serializer for profile updates
class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'profile_picture']
