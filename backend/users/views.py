from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Doctor, Patient, Secretary
from .serializers import UserSerializer, DoctorSerializer, DoctorListSerializer, UserUpdateSerializer, SecretarySerializer, AdminDoctorListSerializer, SMTPSettingsSerializer, AdminPatientListSerializer
from clinic.views import log_activity
from core.email_service import send_dynamic_email
from .models import EmailVerificationToken, PasswordResetToken, SMTPSettings
from datetime import timedelta
from django.utils import timezone


class CustomLoginView(APIView):
    """Custom login view that provides specific error messages for disabled accounts"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'email_and_password_required', 'detail': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # First check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'invalid_credentials', 'detail': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if account is banned FIRST
        if user.is_banned:
            return Response(
                {'error': 'account_banned', 'detail': user.ban_reason or 'Your account has been banned. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if account is disabled
        if not user.is_active:
            return Response(
                {'error': 'account_disabled', 'detail': 'Your account has been disabled. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Check if email is verified
        if not user.is_email_verified:
            return Response(
                {'error': 'email_not_verified', 'detail': 'Please verify your email address before logging in.'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Check for 30-day account deletion grace period
        if user.is_deleted:
            if user.deleted_at:
                days_since_deletion = (timezone.now() - user.deleted_at).days
                if days_since_deletion > 30:
                    return Response(
                        {'error': 'account_permanently_deleted', 'detail': 'This account has been permanently deleted.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                else:
                    # Cancel the deletion (restore account)
                    user.is_deleted = False
                    user.deleted_at = None
                    user.save()
                    # We can log this if needed, but the account is now restored.
        
        # Now verify password
        if not user.check_password(password):
            return Response(
                {'error': 'invalid_credentials', 'detail': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })

class RegisterUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create Profile based on role
        if user.role == User.Role.PATIENT:
            gender = request.data.get('gender', 'M')
            Patient.objects.create(user=user, gender=gender)
        elif user.role == User.Role.DOCTOR:
            specialty = request.data.get('specialty', 'General')
            gender = request.data.get('gender', 'M')
            license_image = request.data.get('license_image')
            
            doctor = Doctor.objects.create(
                user=user, 
                specialty=specialty, 
                consultation_price=0,
                gender=gender,
                license_image=license_image,
                is_verified=False,
                verification_status='PENDING'
            )
            
            # Create an Admin notification
            from notifications.models import AdminNotification
            AdminNotification.objects.create(
                message=f"New Doctor Registration: Dr. {user.first_name} {user.last_name}",
                notification_type="NEW_DOCTOR",
                related_object_id=str(doctor.id)
            )
        
        # Determine the base URL for the frontend link
        origin = request.headers.get('Origin', 'http://localhost:5173')

        # Send Verification Email
        try:
            token = EmailVerificationToken.objects.create(user=user)
            verification_url = f"{origin}/verify-email?token={token.id}"
            send_dynamic_email(
                subject='تأكيد البريد الإلكتروني - عيادتك الرقمية',
                template_name='emails/verify_email.html',
                context={'name': user.first_name or 'المستخدم', 'verification_url': verification_url},
                recipient_list=[user.email]
            )
        except Exception as e:
            print(f"Failed to generate/send verification email: {str(e)}")

        return Response(serializer.data, status=status.HTTP_201_CREATED)

class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_id = request.data.get('token')
        if not token_id:
            return Response({'error': 'Token is required'}, status=400)
            
        try:
            token = EmailVerificationToken.objects.get(id=token_id)
            
            if not token.is_valid():
                token.delete()
                return Response({'error': 'Token has expired. Please request a new verification link.'}, status=400)
                
            user = token.user
            if user.is_email_verified:
                return Response({'message': 'Email is already verified'})
                
            user.is_email_verified = True
            user.save()
            # Token can be deleted after successful verification
            token.delete()
            return Response({'message': 'Email verified successfully'})
        except EmailVerificationToken.DoesNotExist:
            return Response({'error': 'Invalid or expired token'}, status=400)

class ResendVerificationEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=400)
            
        try:
            user = User.objects.get(email=email)
            if user.is_email_verified:
                return Response({'error': 'Email is already verified'}, status=400)
                
            origin = request.headers.get('Origin', 'http://localhost:5173')
            
            # Create a new token (or potentially delete old ones first to clean up)
            EmailVerificationToken.objects.filter(user=user).delete()
            token = EmailVerificationToken.objects.create(user=user)
            
            verification_url = f"{origin}/verify-email?token={token.id}"
            send_dynamic_email(
                subject='تأكيد البريد الإلكتروني - عيادتك الرقمية',
                template_name='emails/verify_email.html',
                context={'name': user.first_name or 'المستخدم', 'verification_url': verification_url},
                recipient_list=[user.email]
            )
            return Response({'message': 'Verification email sent successfully'})
            
        except User.DoesNotExist:
            # For security, we might want to return success even if user doesn't exist to prevent email enumeration,
            # but since this is specifically for unverified checking, it's a UX trade-off.
            return Response({'error': 'User not found'}, status=404)

class ChangeUnverifiedEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        old_email = request.data.get('old_email')
        password = request.data.get('password')
        new_email = request.data.get('new_email')
        
        if not old_email or not password or not new_email:
            return Response({'error': 'All fields are required'}, status=400)
            
        try:
            user = User.objects.get(email=old_email)
            
            # Verify they actually own the account by checking password
            if not user.check_password(password):
                return Response({'error': 'Invalid password'}, status=401)
                
            if user.is_email_verified:
                return Response({'error': 'Cannot change email for a verified account this way'}, status=400)
                
            # Check if new email is already taken
            if User.objects.filter(email=new_email).exists():
                return Response({'error': 'This email is already in use'}, status=400)
                
            # Update email
            user.email = new_email
            user.username = new_email  # Ensure username matches email
            user.save()
            
            # Send new verification link
            origin = request.headers.get('Origin', 'http://localhost:5173')
            EmailVerificationToken.objects.filter(user=user).delete()
            token = EmailVerificationToken.objects.create(user=user)
            
            verification_url = f"{origin}/verify-email?token={token.id}"
            send_dynamic_email(
                subject='تأكيد البريد الإلكتروني - عيادتك الرقمية',
                template_name='emails/verify_email.html',
                context={'name': user.first_name or 'المستخدم', 'verification_url': verification_url},
                recipient_list=[user.email]
            )
            return Response({'message': 'Email updated and verification link sent'})
            
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

class CheckVerificationStatusView(APIView):
    """Simple endpoint for polling: returns whether an email is verified."""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        email = request.query_params.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=400)
            
        try:
            user = User.objects.get(email=email)
            return Response({'is_verified': user.is_email_verified})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=400)
            
        try:
            user = User.objects.get(email=email)
            
            # Create a token valid for 1 hour
            expires_at = timezone.now() + timedelta(hours=1)
            token = PasswordResetToken.objects.create(user=user, expires_at=expires_at)
            
            origin = request.headers.get('Origin', 'http://localhost:5173')
            reset_url = f"{origin}/reset-password?token={token.id}"
            
            send_dynamic_email(
                subject='استعادة كلمة المرور - عيادتك الرقمية',
                template_name='emails/reset_password.html',
                context={'name': user.first_name or 'المستخدم', 'reset_url': reset_url},
                recipient_list=[user.email]
            )
            # Always return a success message so we don't leak user emails over API
            return Response({'message': 'If this email is registered, a reset link has been sent.'})
        except User.DoesNotExist:
            return Response({'message': 'If this email is registered, a reset link has been sent.'})

class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_id = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not token_id or not new_password:
            return Response({'error': 'Token and new password are required'}, status=400)
            
        try:
            token = PasswordResetToken.objects.get(id=token_id, is_used=False)
            if token.expires_at < timezone.now():
                return Response({'error': 'Token has expired'}, status=400)
                
            user = token.user
            user.set_password(new_password)
            user.save()
            
            token.is_used = True
            token.save()
            
            return Response({'message': 'Password has been reset successfully'})
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid or already used token'}, status=400)

class SMTPSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = SMTPSettingsSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        return SMTPSettings.objects.all().order_by('-created_at')

class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

class UpdateProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request):
        user = request.user
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(user, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from rest_framework import filters
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class DoctorListView(generics.ListAPIView):
    queryset = Doctor.objects.filter(is_verified=True, user__is_banned=False, user__is_deleted=False).select_related('user').order_by('user__first_name')
    serializer_class = DoctorListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['user__first_name', 'user__last_name', 'specialty']

class DoctorDetailView(generics.RetrieveAPIView):
    queryset = Doctor.objects.select_related('user').all()
    serializer_class = DoctorListSerializer
    permission_classes = [permissions.AllowAny]

class DoctorProfileUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get doctor profile with daily capacity (accepts optional date param)"""
        if request.user.role != User.Role.DOCTOR:
            return Response({"error": "Only doctors can access this"}, status=403)
        
        doctor = request.user.doctor_profile
        serializer_data = DoctorSerializer(doctor).data
        
        from django.utils import timezone
        from scheduling.models import DoctorAvailability
        from datetime import datetime
        
        # Use requested date or default to today
        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except:
                target_date = timezone.now().date()
        else:
            target_date = timezone.now().date()
        
        python_weekday = target_date.weekday()
        model_weekday = (python_weekday + 1) % 7
        
        day_availabilities = DoctorAvailability.objects.filter(
            doctor=doctor,
            day_of_week=model_weekday,
            is_available=True
        )
        
        # Calculate: (working hours / slot duration) × max_patients_per_slot
        daily_capacity = 0
        for av in day_availabilities:
            start = datetime.combine(target_date, av.start_time)
            end = datetime.combine(target_date, av.end_time)
            working_minutes = (end - start).total_seconds() / 60
            num_slots = int(working_minutes / av.slot_duration) if av.slot_duration > 0 else 0
            daily_capacity += num_slots * av.max_patients_per_slot
        
        serializer_data['daily_capacity'] = daily_capacity
        serializer_data['capacity_date'] = str(target_date)
        
        # Also return all availabilities so frontend can calculate capacity per day
        all_availabilities = DoctorAvailability.objects.filter(doctor=doctor, is_available=True)
        availability_map = {}
        for av in all_availabilities:
            day_key = str(av.day_of_week)
            start = datetime.combine(target_date, av.start_time)
            end = datetime.combine(target_date, av.end_time)
            working_minutes = (end - start).total_seconds() / 60
            num_slots = int(working_minutes / av.slot_duration) if av.slot_duration > 0 else 0
            capacity = num_slots * av.max_patients_per_slot
            if day_key not in availability_map:
                availability_map[day_key] = 0
            availability_map[day_key] += capacity
        
        serializer_data['capacity_by_day'] = availability_map
        
        return Response(serializer_data)

    def patch(self, request):
        if request.user.role != User.Role.DOCTOR:
            return Response({"error": "Only doctors can update this profile"}, status=403)
        
        doctor = request.user.doctor_profile
        data = request.data
        
        if 'specialty' in data:
            doctor.specialty = data['specialty']
        if 'consultation_price' in data:
            doctor.consultation_price = data['consultation_price']
        if 'bio' in data:
            doctor.bio = data['bio']
        if 'location' in data:
            doctor.location = data['location']
        if 'landmark' in data:
            doctor.landmark = data['landmark']
        if 'maps_link' in data:
            doctor.maps_link = data['maps_link']
        
        # Schedule settings (keep only these two)
        if 'allow_overbooking' in data:
            doctor.allow_overbooking = data['allow_overbooking']
        if 'preferred_calendar_view' in data:
            doctor.preferred_calendar_view = data['preferred_calendar_view']
            
        # Booking Controls
        if 'booking_visibility_weeks' in data:
            doctor.booking_visibility_weeks = data['booking_visibility_weeks']
        if 'booking_cutoff_hours' in data:
            doctor.booking_cutoff_hours = data['booking_cutoff_hours']
        if 'is_booking_cutoff_active' in data:
            doctor.is_booking_cutoff_active = data['is_booking_cutoff_active']
        if 'is_digital_booking_active' in data:
            doctor.is_digital_booking_active = data['is_digital_booking_active']
            
        if 'auto_approve_bookings' in data:
            doctor.auto_approve_bookings = data['auto_approve_bookings']
            
        # Update Social Media Links
        for field in ['facebook', 'instagram', 'tiktok', 'twitter', 'youtube']:
            if field in data:
                setattr(doctor, field, data[field])
                
        # Re-upload logic
        if 'license_image' in request.FILES:
            doctor.license_image = request.FILES['license_image']
            doctor.verification_status = 'PENDING'
            doctor.is_verified = False  # Reset if previously approved/rejected
            doctor.rejection_reason = ''
            
            # Trigger Admin Notification
            from notifications.models import AdminNotification
            AdminNotification.objects.create(
                message=f"Document Re-upload: Dr. {request.user.first_name} {request.user.last_name} uploaded a new license document.",
                notification_type="DOCUMENT_REUPLOAD",
                related_object_id=str(doctor.id)
            )
        
        doctor.save()
        return Response(DoctorSerializer(doctor).data)

class SecretaryDoctorProfileView(APIView):
    """Allow secretaries to access their linked doctor's profile with availability data"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.role != User.Role.SECRETARY:
            return Response({"error": "Only secretaries can access this"}, status=403)
        
        try:
            secretary = request.user.secretary_profile
            doctor = secretary.doctor
        except:
            return Response({"error": "Secretary profile not found"}, status=404)
        
        serializer_data = DoctorSerializer(doctor).data
        
        from django.utils import timezone
        from scheduling.models import DoctorAvailability
        from datetime import datetime
        
        target_date = timezone.now().date()
        
        python_weekday = target_date.weekday()
        model_weekday = (python_weekday + 1) % 7
        
        day_availabilities = DoctorAvailability.objects.filter(
            doctor=doctor,
            day_of_week=model_weekday,
            is_available=True
        )
        
        daily_capacity = 0
        for av in day_availabilities:
            start = datetime.combine(target_date, av.start_time)
            end = datetime.combine(target_date, av.end_time)
            working_minutes = (end - start).total_seconds() / 60
            num_slots = int(working_minutes / av.slot_duration) if av.slot_duration > 0 else 0
            daily_capacity += num_slots * av.max_patients_per_slot
        
        serializer_data['daily_capacity'] = daily_capacity
        serializer_data['capacity_date'] = str(target_date)
        
        # All availabilities for capacity per day
        all_availabilities = DoctorAvailability.objects.filter(doctor=doctor, is_available=True)
        availability_map = {}
        for av in all_availabilities:
            day_key = str(av.day_of_week)
            start = datetime.combine(target_date, av.start_time)
            end = datetime.combine(target_date, av.end_time)
            working_minutes = (end - start).total_seconds() / 60
            num_slots = int(working_minutes / av.slot_duration) if av.slot_duration > 0 else 0
            capacity = num_slots * av.max_patients_per_slot
            if day_key not in availability_map:
                availability_map[day_key] = 0
            availability_map[day_key] += capacity
        
        serializer_data['capacity_by_day'] = availability_map
        
        return Response(serializer_data)


class SecretaryViewSet(viewsets.ModelViewSet):
    serializer_class = SecretarySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Doctors see their own secretaries
        if self.request.user.role == User.Role.DOCTOR:
            return Secretary.objects.filter(doctor=self.request.user.doctor_profile)
        return Secretary.objects.none()

    def create(self, request):
        if request.user.role != User.Role.DOCTOR:
            return Response({"error": "Only doctors can add secretaries"}, status=403)
        
        data = request.data
        try:
            # Create User
            user = User.objects.create_user(
                email=data['email'],
                password=data['password'],
                role=User.Role.SECRETARY,
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                phone=data.get('phone', '')
            )
            
            # Create Secretary Profile
            secretary = Secretary.objects.create(
                user=user,
                doctor=request.user.doctor_profile,
                permissions=data.get('permissions', [])
            )
            
            # Log Activity
            log_activity(
                actor=request.user,
                doctor=request.user.doctor_profile,
                action_type='SECRETARY_ADDED',
                description=f"Added secretary {user.first_name} {user.last_name}",
                target_id=secretary.id
            )

            return Response(SecretarySerializer(secretary).data, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        secretary = self.get_object()
        user = secretary.user
        user.is_active = not user.is_active
        user.save()
        
        status_msg = "activated" if user.is_active else "deactivated"
        
        log_activity(
            actor=request.user,
            doctor=request.user.doctor_profile,
            action_type='SECRETARY_UPDATED',
            description=f"Secretary {user.first_name} {status_msg}",
            target_id=secretary.id
        )
        
        return Response({'status': status_msg, 'is_active': user.is_active})
    
    def perform_update(self, serializer):
        secretary = serializer.save()
        log_activity(
            actor=self.request.user,
            doctor=self.request.user.doctor_profile,
            action_type='SECRETARY_UPDATED',
            description=f"Updated details/permissions for {secretary.user.first_name}",
            target_id=secretary.id
        )

class ResolveMapsLinkView(APIView):
    """Resolve short Google Maps links and extract coordinates"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import re
        import sys
        
        url = request.data.get('url', '')
        if not url:
            return Response({'error': 'URL required'}, status=400)
            
        print(f"DEBUG: Resolving URL: {url}")
        
        try:
            try:
                import requests as http_requests
            except ImportError:
                print("DEBUG: Error: requests library not found")
                return Response({'error': 'Server configuration error: requests library missing. Please restart the backend server.'}, status=500)
        
            # Use browser-like headers to avoid blocks
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
            
            # Use GET instead of HEAD for better redirect handling
            print("DEBUG: Sending GET request...")
            response = http_requests.get(url, headers=headers, allow_redirects=True, timeout=15)
            final_url = response.url
            print(f"DEBUG: Final URL: {final_url}")
            
            # Also check the response body for coordinates
            body = response.text[:10000] if response.text else ''
            
            lat, lng = None, None
            
            # Try URL patterns first
            patterns = [
                r'@(-?\d+\.?\d*),(-?\d+\.?\d*)',          # @36.335,43.118
                r'[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)',      # q=36.335,43.118
                r'/@(-?\d+\.?\d*),(-?\d+\.?\d*),',         # /@36.335,43.118,
                r'!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)',       # !3d36.335!4d43.118
                r'll=(-?\d+\.?\d*),(-?\d+\.?\d*)',         # ll=36.335,43.118
                r'center=(-?\d+\.?\d*),(-?\d+\.?\d*)',     # center=36.335,43.118
            ]
            
            # Check URL first
            for pattern in patterns:
                match = re.search(pattern, final_url)
                if match:
                    lat, lng = float(match.group(1)), float(match.group(2))
                    if -90 <= lat <= 90 and -180 <= lng <= 180:
                        print(f"DEBUG: Found in URL: {lat}, {lng}")
                        break
                    lat, lng = None, None
            
            # If not found in URL, check body
            if not lat and body:
                print("DEBUG: Checking body for coordinates...")
                for pattern in patterns:
                    match = re.search(pattern, body)
                    if match:
                        lat, lng = float(match.group(1)), float(match.group(2))
                        if -90 <= lat <= 90 and -180 <= lng <= 180:
                            print(f"DEBUG: Found in Body: {lat}, {lng}")
                            break
                        lat, lng = None, None
            
            if lat and lng:
                return Response({'latitude': lat, 'longitude': lng, 'resolved_url': final_url})
            else:
                print("DEBUG: No coordinates found")
                return Response({
                    'error': 'Could not extract coordinates from link', 
                    'resolved_url': final_url,
                    'debug': f'URL length: {len(final_url)}'
                }, status=400)
        
        except Exception as e:
            print(f"DEBUG: Exception: {str(e)}")
            return Response({'error': str(e)}, status=400)

class AdminDoctorEntryView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """List all doctors (both verified and unverified)"""
        all_doctors = Doctor.objects.select_related('user').order_by('-user__date_joined')
        serializer = AdminDoctorListSerializer(all_doctors, many=True)
        return Response(serializer.data)
        
    def post(self, request):
        """Activate or Deactivate doctor"""
        doctor_id = request.data.get('doctor_id')
        action = request.data.get('action') # 'activate' or 'deactivate'
        
        if not doctor_id or not action:
            return Response({'error': 'doctor_id and action are required'}, status=400)
            
        try:
            doctor = Doctor.objects.get(id=doctor_id)
        except Doctor.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=404)
            
        if action in ('approve', 'activate'):
            doctor.is_verified = True
            doctor.verification_status = 'APPROVED'
            doctor.save()
            return Response({'status': 'activated', 'message': f'Doctor {doctor.user.first_name} activated'})
        
        elif action == 'deactivate':
            doctor.is_verified = False
            doctor.verification_status = 'PENDING'
            doctor.save()
            return Response({'status': 'deactivated', 'message': f'Doctor {doctor.user.first_name} deactivated'})

        elif action == 'reject':
            doctor.is_verified = False
            doctor.verification_status = 'REJECTED'
            doctor.rejection_reason = request.data.get('rejection_reason', '')
            doctor.save()
            return Response({'status': 'rejected', 'message': f'Doctor {doctor.user.first_name} rejected'})
        
        elif action == 'ban':
            ban_reason = request.data.get('ban_reason', '')
            doctor.user.is_banned = True
            doctor.user.ban_reason = ban_reason
            doctor.user.save()
            return Response({'status': 'banned', 'message': f'Doctor {doctor.user.first_name} has been banned'})
        
        elif action == 'unban':
            doctor.user.is_banned = False
            doctor.user.ban_reason = None
            doctor.user.save()
            return Response({'status': 'unbanned', 'message': f'Doctor {doctor.user.first_name} has been unbanned'})
            
        return Response({'error': 'Invalid action'}, status=400)


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get system statistics for admin dashboard"""
        from django.utils import timezone
        from datetime import timedelta
        from clinic.models import Booking
        
        today = timezone.now().date()
        thirty_days_ago = today - timedelta(days=29)
        
        stats = {
            'totalDoctors': Doctor.objects.count(),
            'verifiedDoctors': Doctor.objects.filter(is_verified=True).count(),
            'pendingDoctors': Doctor.objects.filter(is_verified=False).count(),
            'totalPatients': Patient.objects.count(),
            'totalBookings': Booking.objects.count() if 'Booking' in dir() else 0,
            'todayBookings': Booking.objects.filter(booking_datetime__date=today).count() if 'Booking' in dir() else 0,
        }
        
        # Calculate daily user registrations (patients + doctors) for the past 30 days
        date_range = [(today - timedelta(days=i)) for i in range(29, -1, -1)]
        daily_counts = {date.strftime('%m/%d'): {'patients': 0, 'doctors': 0} for date in date_range}
        
        recent_patients = Patient.objects.filter(user__date_joined__date__gte=thirty_days_ago)
        for p in recent_patients:
            d_str = p.user.date_joined.date().strftime('%m/%d')
            if d_str in daily_counts:
                daily_counts[d_str]['patients'] += 1
                
        recent_doctors = Doctor.objects.filter(user__date_joined__date__gte=thirty_days_ago)
        for d in recent_doctors:
            d_str = d.user.date_joined.date().strftime('%m/%d')
            if d_str in daily_counts:
                daily_counts[d_str]['doctors'] += 1
                
        registration_history = [{"name": date, "doctors": counts['doctors'], "patients": counts['patients']} for date, counts in daily_counts.items()]
        stats['registrationHistory'] = registration_history
        
        return Response(stats)

class AdminPatientListView(APIView):
    """
    API endpoint for admin to list, activate, or deactivate patients
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        """List all patients"""
        patients = Patient.objects.select_related('user').order_by('-user__date_joined')
        serializer = AdminPatientListSerializer(patients, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Activate or Deactivate patient"""
        patient_id = request.data.get('patient_id')
        action = request.data.get('action') # 'activate' or 'deactivate'
        
        if not patient_id or not action:
            return Response({'error': 'patient_id and action are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            patient = Patient.objects.get(id=patient_id)
            user = patient.user
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
            
        if action == 'activate':
            user.is_active = True
            user.save()
            return Response({'status': 'activated', 'message': f'Patient {user.first_name} activated'})
        
        elif action == 'deactivate':
            user.is_active = False
            user.save()
            return Response({'status': 'deactivated', 'message': f'Patient {user.first_name} deactivated'})
        
        elif action == 'ban':
            ban_reason = request.data.get('ban_reason', '')
            user.is_banned = True
            user.ban_reason = ban_reason
            user.save()
            return Response({'status': 'banned', 'message': f'Patient {user.first_name} has been banned'})
        
        elif action == 'unban':
            user.is_banned = False
            user.ban_reason = None
            user.save()
            return Response({'status': 'unbanned', 'message': f'Patient {user.first_name} has been unbanned'})
            
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({'error': 'Old password and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({'error': 'Invalid old password'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        # Send notification email
        send_dynamic_email(
            subject='تم تغيير كلمة المرور - عيادتك الرقمية',
            template_name='emails/password_changed.html',
            context={'name': user.first_name or user.email},
            recipient_list=[user.email]
        )

        return Response({'message': 'Password changed successfully'})

class SoftDeleteAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        password = request.data.get('password')
        
        if not password:
            return Response({'error': 'Password is required to delete your account'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not user.check_password(password):
            return Response({'error': 'Invalid password'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_deleted = True
        user.deleted_at = timezone.now()
        user.save()

        # Send notification email
        send_dynamic_email(
            subject='تم جدولة حذف حسابك - عيادتك الرقمية',
            template_name='emails/account_deletion_scheduled.html',
            context={'name': user.first_name or user.email},
            recipient_list=[user.email]
        )
        
        # Log the user out by blacklisting the refresh token if provided
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass

        return Response({
            'message': 'Account deleted successfully. If you do not log in within 30 days, your account will be permanently deleted.'
        })


class RemoveProfilePictureView(APIView):
    """Remove the user's profile picture"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        if user.profile_picture:
            user.profile_picture.delete(save=False)
            user.profile_picture = None
            user.save()
            return Response({'message': 'Profile picture removed successfully'})
        return Response({'message': 'No profile picture to remove'})
