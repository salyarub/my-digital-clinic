
import React from 'react';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';

const AppointmentCard = ({ appointment, role, onConfirm, onCancel }) => {
    const isDoctorOrSecretary = role === 'DOCTOR' || role === 'SECRETARY';

    // Determine display name based on who is viewing
    const otherPartyName = isDoctorOrSecretary
        ? `${appointment.patient_detail?.user.first_name} ${appointment.patient_detail?.user.last_name}`
        : `Dr. ${appointment.doctor_detail?.user.first_name} ${appointment.doctor_detail?.user.last_name}`;

    return (
        <div className="bg-white shadow rounded-lg border-l-4 border-indigo-500 p-4 mb-4">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">{otherPartyName}</h3>
                    <p className="text-sm text-gray-500">{isDoctorOrSecretary ? "Patient" : "Doctor"}</p>

                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {appointment.date}
                        </div>
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {appointment.time}
                        </div>
                    </div>
                    {appointment.reason && (
                        <p className="mt-2 text-sm text-gray-600 italic">"{appointment.reason}"</p>
                    )}
                </div>

                <div className="flex flex-col items-end space-y-2">
                    <span className={clsx(
                        "px-2 py-1 text-xs font-semibold rounded-full",
                        appointment.status === 'CONFIRMED' ? "bg-green-100 text-green-800" :
                            appointment.status === 'PENDING' ? "bg-yellow-100 text-yellow-800" :
                                appointment.status === 'CANCELLED' ? "bg-red-100 text-red-800" :
                                    "bg-gray-100 text-gray-800"
                    )}>
                        {appointment.status}
                    </span>

                    {isDoctorOrSecretary && appointment.status === 'PENDING' && (
                        <div className="flex space-x-2 mt-2">
                            <button onClick={() => onConfirm(appointment.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Confirm">
                                <CheckCircle className="h-5 w-5" />
                            </button>
                            <button onClick={() => onCancel(appointment.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Cancel">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppointmentCard;
