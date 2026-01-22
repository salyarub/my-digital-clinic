import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scheduling.models import DoctorAvailability
from users.models import Doctor

def check_availability():
    print("--- Debugging Doctor Availability ---")
    doctors = Doctor.objects.all()
    if not doctors.exists():
        print("No doctors found!")
        return

    doctor = doctors.first()
    print(f"Checking for Doctor: {doctor.user.email} (ID: {doctor.id})")
    
    availabilities = DoctorAvailability.objects.filter(doctor=doctor).order_by('day_of_week')
    
    if not availabilities.exists():
        print("No availability records found for this doctor.")
    
    days_map = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    for av in availabilities:
        day_name = days_map[av.day_of_week] if 0 <= av.day_of_week < 7 else f"Unknown({av.day_of_week})"
        print(f"Day: {av.day_of_week} ({day_name}) | Available: {av.is_available} | Time: {av.start_time}-{av.end_time}")

if __name__ == "__main__":
    check_availability()
