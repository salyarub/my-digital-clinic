
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import AppointmentCard from '../components/AppointmentCard';

const Dashboard = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [secretaryForm, setSecretaryForm] = useState(false);
    const [secData, setSecData] = useState({ username: '', password: '', email: '' });

    const fetchAppointments = async () => {
        try {
            const res = await api.get('/clinic/appointments/');
            setAppointments(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const handleConfirm = async (id) => {
        try {
            await api.post(`/clinic/appointments/${id}/confirm/`);
            fetchAppointments();
        } catch (error) {
            console.error(error);
        }
    };

    const handleCancel = async (id) => {
        try {
            await api.post(`/clinic/appointments/${id}/cancel/`);
            fetchAppointments();
        } catch (error) {
            console.error(error);
        }
    };

    const createSecretary = async (e) => {
        e.preventDefault();
        try {
            await api.post('/secretary/create/', secData);
            alert("Secretary created!");
            setSecretaryForm(false);
        } catch (error) {
            alert("Failed to create secretary");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Dashboard - {user.role === 'DOCTOR' ? 'Dr. ' : ''}{user.first_name} {user.last_name}
            </h1>

            {user.role === 'DOCTOR' && (
                <div className="mb-8">
                    <button onClick={() => setSecretaryForm(!secretaryForm)} className="bg-purple-600 text-white px-4 py-2 rounded">
                        {secretaryForm ? 'Close Form' : 'Add Secretary'}
                    </button>
                    {secretaryForm && (
                        <form onSubmit={createSecretary} className="mt-4 bg-white p-4 shadow rounded max-w-md">
                            <h3 className="text-lg font-medium mb-2">New Secretary Details</h3>
                            <input type="text" placeholder="Username" className="block w-full border rounded p-2 mb-2" onChange={e => setSecData({ ...secData, username: e.target.value })} />
                            <input type="email" placeholder="Email" className="block w-full border rounded p-2 mb-2" onChange={e => setSecData({ ...secData, email: e.target.value })} />
                            <input type="password" placeholder="Password" className="block w-full border rounded p-2 mb-2" onChange={e => setSecData({ ...secData, password: e.target.value })} />
                            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Create</button>
                        </form>
                    )}
                </div>
            )}

            <div>
                <h2 className="text-xl font-semibold mb-4">Your Appointments</h2>
                {appointments.length === 0 ? (
                    <p className="text-gray-500">No appointments found.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {appointments.map(apt => (
                            <AppointmentCard
                                key={apt.id}
                                appointment={apt}
                                role={user.role}
                                onConfirm={handleConfirm}
                                onCancel={handleCancel}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
