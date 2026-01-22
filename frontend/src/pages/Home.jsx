
import React, { useEffect, useState } from 'react';
import api from '../api';
import DoctorCard from '../components/DoctorCard';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const [doctors, setDoctors] = useState([]);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const res = await api.get('/doctors/');
                setDoctors(res.data);
            } catch (error) {
                console.error("Failed to fetch doctors", error);
            }
        };
        fetchDoctors();
    }, []);

    const handleBook = async (doctor) => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.role !== 'PATIENT') {
            alert("Only patients can book appointments.");
            return;
        }

        const date = prompt("Enter date (YYYY-MM-DD):");
        if (!date) return;
        const time = prompt("Enter time (HH:MM):");
        if (!time) return;
        const reason = prompt("Reason for visit:");

        try {
            await api.post('/clinic/appointments/', {
                doctor: doctor.id,
                date,
                time,
                reason
            });
            alert("Appointment request sent!");
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            alert("Failed to book appointment.");
        }
    };

    return (
        <div className="px-4 py-6 sm:px-0">
            <div className="bg-indigo-700 rounded-lg shadow-xl overflow-hidden mb-8">
                <div className="px-6 py-12 text-center text-white">
                    <h1 className="text-4xl font-bold mb-4">Welcome to My Digital Clinic</h1>
                    <p className="text-lg text-indigo-100 max-w-2xl mx-auto">
                        Connect with top healthcare professionals, book appointments online, and manage your health journey with ease.
                    </p>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Specialists</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {doctors.map(doctor => (
                    <DoctorCard key={doctor.id} doctor={doctor} onBook={handleBook} />
                ))}
            </div>
        </div>
    );
};

export default Home;
