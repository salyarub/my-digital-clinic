
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Activity } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/" className="flex-shrink-0 flex items-center">
                            <Activity className="h-8 w-8 text-primary" />
                            <span className="ml-2 text-xl font-bold text-gray-800">My Digital Clinic</span>
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link to="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Home</Link>
                        <Link to="/doctors" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Find Doctors</Link>

                        {user ? (
                            <>
                                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
                                <div className="flex items-center ml-4 space-x-2">
                                    <span className="text-sm text-gray-500 hidden md:block">Hi, {user.first_name || user.username}</span>
                                    <button onClick={handleLogout} className="text-gray-500 hover:text-red-500">
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-indigo-600 hover:text-indigo-900 px-3 py-2 rounded-md text-sm font-medium">Login</Link>
                                <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Register</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
