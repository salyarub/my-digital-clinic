from django.core.management.base import BaseCommand
from users.models import User, Doctor

class Command(BaseCommand):
    help = 'Seed database with sample doctors for testing'

    def handle(self, *args, **options):
        doctors_data = [
            {
                'email': 'ahmed.ali@clinic.com',
                'first_name': 'Ahmed',
                'last_name': 'Ali',
                'specialty': 'Cardiology',
                'consultation_price': 150.00,
                'bio': 'Senior cardiologist with 15 years of experience.'
            },
            {
                'email': 'sara.hassan@clinic.com',
                'first_name': 'Sara',
                'last_name': 'Hassan',
                'specialty': 'Dermatology',
                'consultation_price': 100.00,
                'bio': 'Specialized in skin care and cosmetic dermatology.'
            },
            {
                'email': 'omar.khalid@clinic.com',
                'first_name': 'Omar',
                'last_name': 'Khalid',
                'specialty': 'General Medicine',
                'consultation_price': 75.00,
                'bio': 'Family medicine specialist.'
            },
            {
                'email': 'fatima.ahmad@clinic.com',
                'first_name': 'Fatima',
                'last_name': 'Ahmad',
                'specialty': 'Pediatrics',
                'consultation_price': 120.00,
                'bio': 'Child health specialist with gentle approach.'
            },
            {
                'email': 'youssef.mohammed@clinic.com',
                'first_name': 'Youssef',
                'last_name': 'Mohammed',
                'specialty': 'Orthopedics',
                'consultation_price': 200.00,
                'bio': 'Expert in bone and joint treatments.'
            },
        ]

        created_count = 0
        for doc_data in doctors_data:
            email = doc_data.pop('email')
            specialty = doc_data.pop('specialty')
            price = doc_data.pop('consultation_price')
            bio = doc_data.pop('bio')

            # Check if user already exists
            if User.objects.filter(email=email).exists():
                self.stdout.write(f'User {email} already exists, skipping...')
                continue

            # Create user
            user = User.objects.create_user(
                email=email,
                password='doctor123',  # Default password for testing
                role=User.Role.DOCTOR,
                **doc_data
            )

            # Create doctor profile
            Doctor.objects.create(
                user=user,
                specialty=specialty,
                consultation_price=price,
                bio=bio,
                is_verified=True
            )

            created_count += 1
            self.stdout.write(self.style.SUCCESS(f'Created doctor: {email}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully created {created_count} doctors'))
