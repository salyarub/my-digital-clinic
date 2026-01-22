import os
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from scheduling.models import DoctorAvailability
from users.models import Doctor
from datetime import datetime

# Get first doctor
doctor = Doctor.objects.first()
if not doctor:
    print("No doctors found!")
    sys.exit(1)

print(f"Doctor: {doctor.user.get_full_name()}")
print(f"Allow overbooking: {doctor.allow_overbooking}")
print()

# Get all availabilities
avs = DoctorAvailability.objects.filter(doctor=doctor)
print(f"Total availabilities: {avs.count()}")
print()

for av in avs:
    # Calculate capacity for this availability
    start = datetime.combine(datetime.today(), av.start_time)
    end = datetime.combine(datetime.today(), av.end_time)
    working_minutes = (end - start).total_seconds() / 60
    num_slots = int(working_minutes / av.slot_duration) if av.slot_duration > 0 else 0
    capacity = num_slots * av.max_patients_per_slot
    
    day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    day_name = day_names[av.day_of_week]
    
    print(f"Day {av.day_of_week} ({day_name}):")
    print(f"  Active: {av.is_available}")
    print(f"  Time: {av.start_time} - {av.end_time}")
    print(f"  Working minutes: {working_minutes}")
    print(f"  Slot duration: {av.slot_duration} min")
    print(f"  Num slots: {num_slots}")
    print(f"  Max patients/slot: {av.max_patients_per_slot}")
    print(f"  TOTAL CAPACITY: {capacity}")
    print()

# Test today's calculation
today = datetime.now().date()
python_weekday = today.weekday()  # Mon=0, Sun=6
model_weekday = (python_weekday + 1) % 7  # Sun=0, Mon=1

print(f"\n=== TODAY ({today}) ===")
print(f"Python weekday: {python_weekday}")
print(f"Model weekday: {model_weekday}")

day_avs = DoctorAvailability.objects.filter(
    doctor=doctor,
    day_of_week=model_weekday,
    is_available=True
)
print(f"Active availabilities for today: {day_avs.count()}")

total_capacity = 0
for av in day_avs:
    start = datetime.combine(today, av.start_time)
    end = datetime.combine(today, av.end_time)
    working_minutes = (end - start).total_seconds() / 60
    num_slots = int(working_minutes / av.slot_duration) if av.slot_duration > 0 else 0
    capacity = num_slots * av.max_patients_per_slot
    total_capacity += capacity
    print(f"  Slot: {av.start_time}-{av.end_time}, duration={av.slot_duration}, max={av.max_patients_per_slot} -> capacity={capacity}")

print(f"\nTOTAL CAPACITY FOR TODAY: {total_capacity}")
