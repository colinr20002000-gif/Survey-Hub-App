import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui';
import { Car, Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { formatDateForDisplay } from '../utils/dateHelpers';

const VehicleSummaryPage = () => {
    const [vehicles, setVehicles] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [users, setUsers] = useState([]);
    const [mileageLogs, setMileageLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'assignedTo', direction: 'ascending' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                { data: vehiclesData },
                { data: assignmentsData },
                { data: realUsers },
                { data: dummyUsers },
                { data: mileageData }
            ] = await Promise.all([
                supabase.from('vehicles').select('*'),
                supabase.from('vehicle_assignments').select('*').is('returned_at', null),
                supabase.from('users').select('id, name').is('deleted_at', null),
                supabase.from('dummy_users').select('id, name').is('deleted_at', null),
                supabase.from('vehicle_inspection_logs')
                    .select('vehicle_id, mileage, inspection_date, created_at')
                    .order('inspection_date', { ascending: false })
                    .order('created_at', { ascending: false })
            ]);

            setVehicles(vehiclesData || []);
            setAssignments(assignmentsData || []);
            setUsers([
                ...(realUsers || []).map(u => ({ ...u, isDummy: false })),
                ...(dummyUsers || []).map(u => ({ ...u, isDummy: true }))
            ]);

            // Get latest mileage for each vehicle from the latest inspection
            const latestMileage = {};
            (mileageData || []).forEach(log => {
                if (!latestMileage[log.vehicle_id]) {
                    latestMileage[log.vehicle_id] = log.mileage;
                }
            });
            setMileageLogs(latestMileage);

        } catch (error) {
            console.error('Error fetching vehicle summary data:', error);
        } finally {
            setLoading(false);
        }
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 text-orange-200" />;
        return sortConfig.direction === 'ascending' ? <ArrowUp className="w-3 h-3 ml-1 text-white" /> : <ArrowDown className="w-3 h-3 ml-1 text-white" />;
    };

    const getAssignedUser = (vehicleId) => {
        const assignment = assignments.find(a => a.vehicle_id === vehicleId);
        if (!assignment) return 'Unassigned';
        const user = users.find(u => u.id === assignment.user_id);
        return user ? user.name : 'Unknown User';
    };

    const getCategoryColor = (categoryName) => {
        const colors = {
            'Van': '#EF4444', // Red
            'Truck': '#8B5CF6', // Purple
            'Car': '#3B82F6', // Blue
            'Electric': '#10B981', // Green
            'Hybrid': '#F59E0B', // Amber
            'Uncategorized': '#6B7280' // Gray
        };
        
        return colors[categoryName] || '#f97316'; // Brand Orange as default
    };

    const getMOTStatusStyles = (dueDate) => {
        if (!dueDate) return 'text-gray-600 dark:text-gray-300';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(dueDate);
        expiryDate.setHours(0, 0, 0, 0);
        
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'text-red-500 font-bold';
        if (diffDays <= 30) return 'text-amber-500 font-bold';
        return 'text-green-500 font-bold';
    };

    const summaryData = useMemo(() => {
        return vehicles.map(vehicle => ({
            id: vehicle.id,
            name: vehicle.name,
            registration: vehicle.serial_number || 'N/A',
            assignedTo: getAssignedUser(vehicle.id),
            currentMileage: mileageLogs[vehicle.id] || 0,
            motDueDate: vehicle.warranty_expiry,
            category: vehicle.category || 'Uncategorized'
        }));
    }, [vehicles, assignments, users, mileageLogs]);

    const filteredAndSortedData = useMemo(() => {
        let data = summaryData.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig.key) {
            data.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [summaryData, searchTerm, sortConfig]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    const tableHeaders = [
        { key: 'name', label: 'Vehicle Name' },
        { key: 'registration', label: 'Registration' },
        { key: 'assignedTo', label: 'Assigned To' },
        { key: 'currentMileage', label: 'Current Mileage' },
        { key: 'motDueDate', label: 'MOT Due Date' },
        { key: 'category', label: 'Category' },
    ];

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Car className="text-orange-500 w-8 h-8" />
                            Vehicle Summary
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of all active company vehicles and their current status</p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search vehicles, registration, or users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                                <tr>
                                    {tableHeaders.map(header => (
                                        <th 
                                            key={header.key} 
                                            scope="col" 
                                            className="px-6 py-4 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors text-center"
                                            onClick={() => requestSort(header.key)}
                                        >
                                            <div className="flex items-center justify-center">
                                                {header.label}
                                                <span className="ml-2">{getSortIndicator(header.key)}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredAndSortedData.length > 0 ? (
                                    filteredAndSortedData.map((item) => (
                                        <tr key={item.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-600/20 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white text-center">
                                                {item.name}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-mono font-bold uppercase tracking-wider">
                                                    {item.registration}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${item.assignedTo === 'Unassigned' ? 'bg-gray-400' : 'bg-green-500'}`} />
                                                    {item.assignedTo}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono tabular-nums">
                                                {item.currentMileage.toLocaleString()} mi
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={getMOTStatusStyles(item.motDueDate)}>
                                                    {item.motDueDate ? formatDateForDisplay(new Date(item.motDueDate)) : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span 
                                                    className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-sm"
                                                    style={{ backgroundColor: getCategoryColor(item.category) }}
                                                >
                                                    {item.category}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Car className="w-8 h-8 opacity-20" />
                                                <p>No vehicles found matching your search.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleSummaryPage;
