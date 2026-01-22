from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import DoctorNotification, PatientNotification, SecretaryNotification
from .serializers import DoctorNotificationSerializer, PatientNotificationSerializer, SecretaryNotificationSerializer
from users.models import User

class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        if user.role == User.Role.DOCTOR and hasattr(user, 'doctor_profile'):
            notifications = DoctorNotification.objects.filter(recipient=user.doctor_profile)
            serializer = DoctorNotificationSerializer(notifications, many=True)
        elif user.role == User.Role.PATIENT and hasattr(user, 'patient_profile'):
            notifications = PatientNotification.objects.filter(recipient=user.patient_profile)
            serializer = PatientNotificationSerializer(notifications, many=True)
        elif user.role == User.Role.SECRETARY and hasattr(user, 'secretary_profile'):
            notifications = SecretaryNotification.objects.filter(recipient=user.secretary_profile)
            serializer = SecretaryNotificationSerializer(notifications, many=True)
        else:
            return Response([])
        
        return Response(serializer.data)

class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id):
        user = request.user
        
        try:
            if user.role == User.Role.DOCTOR:
                notification = DoctorNotification.objects.get(id=notification_id, recipient=user.doctor_profile)
            elif user.role == User.Role.PATIENT:
                notification = PatientNotification.objects.get(id=notification_id, recipient=user.patient_profile)
            elif user.role == User.Role.SECRETARY:
                notification = SecretaryNotification.objects.get(id=notification_id, recipient=user.secretary_profile)
            else:
                return Response({'error': 'Invalid user role'}, status=400)
            
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save()
            return Response({'status': 'marked as read'})
        except Exception as e:
            return Response({'error': str(e)}, status=404)

class MarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        
        if user.role == User.Role.DOCTOR and hasattr(user, 'doctor_profile'):
            DoctorNotification.objects.filter(recipient=user.doctor_profile, is_read=False).update(
                is_read=True, read_at=timezone.now()
            )
        elif user.role == User.Role.PATIENT and hasattr(user, 'patient_profile'):
            PatientNotification.objects.filter(recipient=user.patient_profile, is_read=False).update(
                is_read=True, read_at=timezone.now()
            )
        elif user.role == User.Role.SECRETARY and hasattr(user, 'secretary_profile'):
            SecretaryNotification.objects.filter(recipient=user.secretary_profile, is_read=False).update(
                is_read=True, read_at=timezone.now()
            )
        
        return Response({'status': 'all marked as read'})

# Helper function to create notifications
def create_notification(recipient_type, recipient, notification_type, message, related_object_id=None):
    """
    Create a notification for a user.
    recipient_type: 'doctor', 'patient', or 'secretary'
    recipient: The Doctor, Patient, or Secretary instance
    notification_type: Type of notification (e.g., 'NEW_BOOKING', 'BOOKING_CONFIRMED')
    message: The notification message
    related_object_id: Optional ID of related object (e.g. Booking ID)
    """
    if recipient_type == 'doctor':
        DoctorNotification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            message=message,
            related_object_id=str(related_object_id) if related_object_id else None
        )
    elif recipient_type == 'patient':
        PatientNotification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            message=message,
            related_object_id=str(related_object_id) if related_object_id else None
        )
    elif recipient_type == 'secretary':
        SecretaryNotification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            message=message,
            related_object_id=str(related_object_id) if related_object_id else None
        )
