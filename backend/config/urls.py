
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from users.views import RegisterUserView, CurrentUserView, DoctorListView, DoctorDetailView, SecretaryViewSet, UpdateProfileView, DoctorProfileUpdateView, ResolveMapsLinkView, SecretaryDoctorProfileView, AdminDoctorEntryView, AdminStatsView
from clinic.views import BookingViewSet, RatingViewSet, ActivityLogViewSet
from scheduling.views import CheckConflictsView, TimeOffView, PublicReschedulingView, DoctorAvailabilityViewSet, DoctorSlotsView, DaySlotsView, TimeOffDetailView, AuthenticatedRescheduleAcceptView
from notifications.views import NotificationListView, MarkNotificationReadView, MarkAllReadView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'ratings', RatingViewSet, basename='rating')
router.register(r'activity-logs', ActivityLogViewSet, basename='activity-log')
router.register(r'secretaries', SecretaryViewSet, basename='secretary')

# Scheduling router
scheduling_router = DefaultRouter()
scheduling_router.register(r'availability', DoctorAvailabilityViewSet, basename='availability')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth
    path('api/auth/register/', RegisterUserView.as_view(), name='register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('api/auth/profile/', UpdateProfileView.as_view(), name='update_profile'),

    # Users
    path('api/doctors/', DoctorListView.as_view(), name='doctor_list'),
    path('api/doctors/<uuid:pk>/', DoctorDetailView.as_view(), name='doctor_detail'),
    path('api/doctors/<uuid:doctor_id>/slots/', DoctorSlotsView.as_view(), name='doctor_slots'),
    path('api/doctors/profile/', DoctorProfileUpdateView.as_view(), name='doctor_profile_update'),

    path('api/resolve-maps-link/', ResolveMapsLinkView.as_view(), name='resolve_maps_link'),
    path('api/admin/doctors/', AdminDoctorEntryView.as_view(), name='admin_doctor_entry'),
    path('api/admin/stats/', AdminStatsView.as_view(), name='admin_stats'),

    # Secretary endpoints
    path('api/secretary/doctor-profile/', SecretaryDoctorProfileView.as_view(), name='secretary_doctor_profile'),

    # Clinic
    path('api/clinic/', include(router.urls)),
    
    # Scheduling (Doctor)
    path('api/scheduling/', include(scheduling_router.urls)),
    path('api/scheduling/conflicts/', CheckConflictsView.as_view(), name='check_conflicts'),
    path('api/scheduling/time-off/', TimeOffView.as_view(), name='time_off'),
    path('api/scheduling/time-off/<uuid:pk>/', TimeOffDetailView.as_view(), name='time_off_detail'),
    path('api/scheduling/day-slots/', DaySlotsView.as_view(), name='day_slots'),
    path('api/scheduling/reschedule-requests/<uuid:reschedule_id>/accept/', AuthenticatedRescheduleAcceptView.as_view(), name='reschedule_accept'),
    
    # Scheduling (Public)
    path('api/public/reschedule/<str:token>/', PublicReschedulingView.as_view(), name='public_reschedule'),
    
    # Notifications
    path('api/notifications/', NotificationListView.as_view(), name='notifications'),
    path('api/notifications/<uuid:notification_id>/read/', MarkNotificationReadView.as_view(), name='mark_read'),
    path('api/notifications/mark-all-read/', MarkAllReadView.as_view(), name='mark_all_read'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
