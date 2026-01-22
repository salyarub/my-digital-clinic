
import React from 'react';
import { User as UserIcon, Star, Clock } from 'lucide-react';

const DoctorCard = ({ doctor, onBook }) => {
    return (
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-3">
                        <UserIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Dr. {doctor.user.first_name} {doctor.user.last_name}</h3>
                        <p className="text-sm text-gray-500">{doctor.specialization}</p>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-gray-600 text-sm line-clamp-2">{doctor.bio || "No bio available."}</p>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        <span>4.8 (Reviews)</span>
                    </div>
                    <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-1" />
                        <span>{doctor.available_start_time} - {doctor.available_end_time}</span>
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <button
                    onClick={() => onBook(doctor)}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Book Appointment
                </button>
            </div>
        </div>
    );
};

export default DoctorCard;
