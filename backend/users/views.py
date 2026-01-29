from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import User, Doctor, Patient, Secretary
from .serializers import UserSerializer, DoctorSerializer, DoctorListSerializer, UserUpdateSerializer, SecretarySerializer, AdminDoctorListSerializer
from clinic.views import log_activity

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
            
            Doctor.objects.create(
                user=user, 
                specialty=specialty, 
                consultation_price=0,
                gender=gender,
                license_image=license_image,
                is_verified=False # Explicitly set to False
            )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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
    queryset = Doctor.objects.select_related('user').all().order_by('user__first_name')
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
        if 'latitude' in data:
            doctor.latitude = data['latitude']
        if 'longitude' in data:
            doctor.longitude = data['longitude']
        
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
        if 'is_digital_booking_active' in data:
            doctor.is_digital_booking_active = data['is_digital_booking_active']
            
        if 'auto_approve_bookings' in data:
            doctor.auto_approve_bookings = data['auto_approve_bookings']
            
        # Update Social Media Links
        for field in ['facebook', 'instagram', 'tiktok', 'twitter', 'youtube']:
            if field in data:
                setattr(doctor, field, data[field])
        
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
        """List all unverified doctors"""
        pending_doctors = Doctor.objects.filter(is_verified=False).select_related('user')
        serializer = AdminDoctorListSerializer(pending_doctors, many=True)
        return Response(serializer.data)
        
    def post(self, request):
        """Approve or Reject doctor"""
        doctor_id = request.data.get('doctor_id')
        action = request.data.get('action') # 'approve' or 'reject'
        
        if not doctor_id or not action:
            return Response({'error': 'doctor_id and action are required'}, status=400)
            
        try:
            doctor = Doctor.objects.get(id=doctor_id)
        except Doctor.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=404)
            
        if action == 'approve':
            doctor.is_verified = True
            doctor.save()
            return Response({'status': 'approved', 'message': f'Doctor {doctor.user.first_name} approved'})
            
        elif action == 'reject':
            user = doctor.user
            user.delete() # This cascades to doctor profile
            return Response({'status': 'rejected', 'message': 'Doctor application rejected and removed'})
            
        return Response({'error': 'Invalid action'}, status=400)


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get system statistics for admin dashboard"""
        from django.utils import timezone
        from clinic.models import Booking
        
        today = timezone.now().date()
        
        stats = {
            'totalDoctors': Doctor.objects.count(),
            'verifiedDoctors': Doctor.objects.filter(is_verified=True).count(),
            'pendingDoctors': Doctor.objects.filter(is_verified=False).count(),
            'totalPatients': Patient.objects.count(),
            'totalBookings': Booking.objects.count() if 'Booking' in dir() else 0,
            'todayBookings': Booking.objects.filter(date=today).count() if 'Booking' in dir() else 0,
        }
        
        return Response(stats)
