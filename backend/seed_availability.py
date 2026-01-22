import os
import django
import sys
from datetime import time

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scheduling.models import DoctorAvailability
from users.models import Doctor

def seed_availability():
    print("--- Seeding Doctor Availability ---")
    doctors = Doctor.objects.all()
    if not doctors.exists():
        print("No doctors found!")
        return

    doctor = doctors.first()
    print(f"Seeding for Doctor: {doctor.user.email}")
    
    # Clear existing
    DoctorAvailability.objects.filter(doctor=doctor).delete()
    print("Cleared existing availability.")
    
    # Create Sun(0) to Thu(4)
    # Note: Frontend 0=Sun. Model 0=Sun or Mon?
    # Logic in add_walkin check:
    # python_weekday = today.weekday() # Mon=0, Sun=6
    # model_weekday = (python_weekday + 1) % 7 # Sun=0, Mon=1...
    # So used Model 0=Sunday.
    
    days_to_seed = [
        (0, 'Sunday'),
        (1, 'Monday'),
        (2, 'Tuesday'),
        (3, 'Wednesday'),
        (4, 'Thursday')
    ]
    
    for day_val, day_name in days_to_seed:
        DoctorAvailability.objects.create(
            doctor=doctor,
            day_of_week=day_val,
            start_time=time(9, 0),
            end_time=time(17, 0),
            slot_duration=30,
            max_patients_per_slot=1,
            is_available=True
        )
        print(f"Created availability for {day_name} (9:00-17:00)")

    # Also create Fri/Sat as unavailable (just to be sure consistency)
    for day_val in [5, 6]:
        DoctorAvailability.objects.create(
            doctor=doctor,
            day_of_week=day_val,
            start_time=time(9, 0),
            end_time=time(17, 0),
            is_available=False
        )
        print(f"Created unavailable record for day {day_val}")
        
    print("Seeding Complete.")

if __name__ == "__main__":
    seed_availability()
