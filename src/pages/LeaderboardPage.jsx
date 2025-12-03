import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useUsers } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../contexts/ToastContext';
import { Card, Button, Input } from '../components/ui';
import { TrendingUp, Calendar, Loader2, Filter, AlertTriangle, Camera, Car, Save, Moon, Star } from 'lucide-react';

const LeaderboardPage = () => {
    const { users } = useUsers();
    const { user } = useAuth();
    const { can } = usePermissions();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [allocations, setAllocations] = useState([]);
    const [dummyAllocations, setDummyAllocations] = useState([]);
    
    // New data sources
    const [closeCalls, setCloseCalls] = useState([]);
    const [checkAdjustLogs, setCheckAdjustLogs] = useState([]);
    const [vehicleInspectionLogs, setVehicleInspectionLogs] = useState([]);

    // Date Range State (Loaded from settings if possible)
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    
    const [isManageMode, setIsManageMode] = useState(false);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Derive unique departments
    const departments = useMemo(() => {
        const uniqueDepts = [...new Set(users
            .map(u => u.department)
            .filter(dept => dept && dept.trim() !== '')
        )].sort();
        return uniqueDepts;
    }, [users]);

    // Initialize selected departments from users if settings haven't loaded yet
    useEffect(() => {
        if (departments.length > 0 && selectedDepartments.length === 0 && !settingsLoaded) {
            setSelectedDepartments(departments);
        }
    }, [departments, settingsLoaded]);

    // Fetch Global Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('leaderboard_settings')
                    .select('value')
                    .eq('key', 'global_filters')
                    .single();

                if (data && data.value) {
                    setStartDate(data.value.start_date || startDate);
                    setEndDate(data.value.end_date || endDate);
                    // Only override if departments exist in the saved value
                    if (data.value.selected_departments && Array.isArray(data.value.selected_departments)) {
                        setSelectedDepartments(data.value.selected_departments);
                    }
                    setSettingsLoaded(true);
                } else {
                    // No settings found, mark loaded anyway
                    setSettingsLoaded(true);
                }
            } catch (err) {
                // Table might not exist yet, ignore error and use defaults
                console.log('Settings fetch skipped (table may not exist yet)');
                setSettingsLoaded(true); // Ensure we don't reset forever
            }
        };
        fetchSettings();
    }, []);

    // Save Settings Globally
    const saveGlobalSettings = async () => {
        setSavingSettings(true);
        try {
            const { error } = await supabase
                .from('leaderboard_settings')
                .upsert({
                    key: 'global_filters',
                    value: {
                        start_date: startDate,
                        end_date: endDate,
                        selected_departments: selectedDepartments
                    },
                    updated_at: new Date().toISOString(),
                    updated_by: user?.id
                }, { onConflict: 'key' });

            if (error) throw error;
            
            addToast({ message: 'Leaderboard settings saved globally for all users', type: 'success' });
        } catch (err) {
            console.error('Error saving settings:', err);
            addToast({ message: 'Failed to save global settings', type: 'error' });
        } finally {
            setSavingSettings(false);
        }
    };

    // Handlers for local updates
    const handleStartDateChange = (val) => {
        setStartDate(val);
    };

    const handleEndDateChange = (val) => {
        setEndDate(val);
    };

    const toggleDepartment = (dept) => {
        const newDepts = selectedDepartments.includes(dept)
            ? selectedDepartments.filter(d => d !== dept)
            : [...selectedDepartments, dept];
        
        setSelectedDepartments(newDepts);
    };

    const toggleAllDepartments = () => {
        const newDepts = selectedDepartments.length === departments.length ? [] : departments;
        setSelectedDepartments(newDepts);
    };

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Allocations
                const allocationsPromise = supabase
                    .from('resource_allocations')
                    .select('user_id, allocation_date, assignment_type, shift, client')
                    .eq('assignment_type', 'project')
                    .gte('allocation_date', startDate)
                    .lte('allocation_date', endDate);

                const dummyAllocationsPromise = supabase
                    .from('dummy_resource_allocations')
                    .select('user_id, allocation_date, assignment_type, shift, client')
                    .eq('assignment_type', 'project')
                    .gte('allocation_date', startDate)
                    .lte('allocation_date', endDate);

                // 2. Close Calls
                // Assuming 'date_time' column
                const closeCallsPromise = supabase
                    .from('close_calls')
                    .select('user_id, date_time')
                    .gte('date_time', `${startDate}T00:00:00`)
                    .lte('date_time', `${endDate}T23:59:59`);

                // 3. Check & Adjust
                // Assuming 'check_date' column
                const checkAdjustPromise = supabase
                    .from('check_adjust_logs')
                    .select('user_id, check_date')
                    .gte('check_date', `${startDate}T00:00:00`)
                    .lte('check_date', `${endDate}T23:59:59`);

                // 4. Vehicle Inspections
                const vehicleInspectionPromise = supabase
                    .from('vehicle_inspection_logs')
                    .select('user_id, inspection_date')
                    .gte('inspection_date', startDate)
                    .lte('inspection_date', endDate);

                const [
                    { data: realAlloc, error: realAllocErr },
                    { data: dummyAlloc, error: dummyAllocErr },
                    { data: ccData, error: ccErr },
                    { data: caData, error: caErr },
                    { data: viData, error: viErr }
                ] = await Promise.all([
                    allocationsPromise,
                    dummyAllocationsPromise,
                    closeCallsPromise,
                    checkAdjustPromise,
                    vehicleInspectionPromise
                ]);

                if (realAllocErr) throw realAllocErr;
                if (dummyAllocErr) throw dummyAllocErr;
                if (ccErr) throw ccErr;
                // CA logs might be empty/error if table doesn't exist, handle gracefully
                if (caErr && caErr.code !== '42P01') throw caErr;
                if (viErr && viErr.code !== '42P01') throw viErr;

                setAllocations(realAlloc || []);
                setDummyAllocations(dummyAlloc || []);
                setCloseCalls(ccData || []);
                setCheckAdjustLogs(caData || []);
                setVehicleInspectionLogs(viData || []);

            } catch (error) {
                console.error('Error fetching leaderboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate]);

    // --- Leaderboard Calculations ---

    // Helper to filter user by department
    const isUserInDepartment = (userId) => {
        const user = users.find(u => u.id === userId);
        if (!user) return false; // Or true if you want to include unknowns? Usually false.
        if (user.department === null || user.department === '') {
            // If user has no department, decide inclusion.
            // If "All" are selected, include. If specific are selected, exclude?
            // Let's include if selectedDepartments includes '' or null? No, let's exclude for strict filtering.
            // But maybe default inclusion? Let's assume strict.
            // Wait, if user list has departments, filtering should work.
            // If user has NO department, they only show if we aren't strictly filtering?
            // Current logic: if user department is in selected list.
            return false; 
        }
        return selectedDepartments.includes(user.department);
    };

    // 1. Weekend Warriors
    const weekendLeaderboard = useMemo(() => {
        const allAllocations = [...allocations, ...dummyAllocations];
        // Object to track unique weekend dates per user
        const userShiftDates = {};

        allAllocations.forEach(alloc => {
            // Strictly filter for project assignments only (ignore leave, availability, etc.)
            if (alloc.assignment_type !== 'project') return;

            const dateObj = new Date(alloc.allocation_date);
            const dateStr = alloc.allocation_date.split('T')[0]; // YYYY-MM-DD
            const day = dateObj.getDay();
            
            if (day === 0 || day === 6) { // Sunday or Saturday
                const userId = alloc.user_id;
                if (userId && isUserInDepartment(userId)) {
                    if (!userShiftDates[userId]) {
                        userShiftDates[userId] = new Set();
                    }
                    userShiftDates[userId].add(dateStr);
                }
            }
        });

        return Object.entries(userShiftDates)
            .map(([userId, dateSet]) => {
                const user = users.find(u => u.id === userId);
                return {
                    name: user ? user.name : 'Unknown User',
                    department: user ? user.department : '',
                    count: dateSet.size // Count unique days
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [allocations, dummyAllocations, users, selectedDepartments]);

    // 2. Friday Night Fever
    const fridayNightFeverLeaderboard = useMemo(() => {
        const allAllocations = [...allocations, ...dummyAllocations];
        const userShiftDates = {};

        allAllocations.forEach(alloc => {
            // Strictly filter for project assignments only
            if (alloc.assignment_type !== 'project') return;

            const dateObj = new Date(alloc.allocation_date);
            const dateStr = alloc.allocation_date.split('T')[0]; // YYYY-MM-DD
            const day = dateObj.getDay();
            
            // Friday (5) AND Nights shift
            if (day === 5 && alloc.shift === 'Nights') {
                const userId = alloc.user_id;
                if (userId && isUserInDepartment(userId)) {
                    if (!userShiftDates[userId]) {
                        userShiftDates[userId] = new Set();
                    }
                    userShiftDates[userId].add(dateStr);
                }
            }
        });

        return Object.entries(userShiftDates)
            .map(([userId, dateSet]) => {
                const user = users.find(u => u.id === userId);
                return {
                    name: user ? user.name : 'Unknown User',
                    department: user ? user.department : '',
                    count: dateSet.size // Count unique dates
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [allocations, dummyAllocations, users, selectedDepartments]);

    // 3. CRSA Superstar
    const crsaSuperstarLeaderboard = useMemo(() => {
        const allAllocations = [...allocations, ...dummyAllocations];
        const userShiftDates = {};

        allAllocations.forEach(alloc => {
            // Strictly filter for project assignments only
            if (alloc.assignment_type !== 'project') return;

            // Filter for Client = CRSA (case insensitive)
            if (!alloc.client || alloc.client.trim().toUpperCase() !== 'CRSA') return;

            const dateStr = alloc.allocation_date.split('T')[0]; // YYYY-MM-DD
            const userId = alloc.user_id;
            
            if (userId && isUserInDepartment(userId)) {
                if (!userShiftDates[userId]) {
                    userShiftDates[userId] = new Set();
                }
                userShiftDates[userId].add(dateStr);
            }
        });

        return Object.entries(userShiftDates)
            .map(([userId, dateSet]) => {
                const user = users.find(u => u.id === userId);
                return {
                    name: user ? user.name : 'Unknown User',
                    department: user ? user.department : '',
                    count: dateSet.size // Count unique dates/shifts
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [allocations, dummyAllocations, users, selectedDepartments]);

    // 4. Close Calls
    const closeCallsLeaderboard = useMemo(() => {
        const userCounts = {};
        closeCalls.forEach(item => {
            if (item.user_id && isUserInDepartment(item.user_id)) {
                userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
            }
        });

        return Object.entries(userCounts)
            .map(([userId, count]) => {
                const user = users.find(u => u.id === userId);
                return {
                    name: user ? user.name : 'Unknown User',
                    department: user ? user.department : '',
                    count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [closeCalls, users, selectedDepartments]);

    // 5. Check & Adjust
    const checkAdjustLeaderboard = useMemo(() => {
        const userCounts = {};
        checkAdjustLogs.forEach(item => {
            if (item.user_id && isUserInDepartment(item.user_id)) {
                userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
            }
        });

        return Object.entries(userCounts)
            .map(([userId, count]) => {
                const user = users.find(u => u.id === userId);
                return {
                    name: user ? user.name : 'Unknown User',
                    department: user ? user.department : '',
                    count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [checkAdjustLogs, users, selectedDepartments]);

    // 6. Vehicle Inspections
    const vehicleInspectionLeaderboard = useMemo(() => {
        const userCounts = {};
        vehicleInspectionLogs.forEach(item => {
            if (item.user_id && isUserInDepartment(item.user_id)) {
                userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
            }
        });

        return Object.entries(userCounts)
            .map(([userId, count]) => {
                const user = users.find(u => u.id === userId);
                return {
                    name: user ? user.name : 'Unknown User',
                    department: user ? user.department : '',
                    count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [vehicleInspectionLogs, users, selectedDepartments]);


    // Reusable Table Component
    const LeaderboardTable = ({ title, icon: Icon, data, countLabel }) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden h-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    <Icon className="w-5 h-5 text-orange-500" />
                    {title}
                </h3>
            </div>
            
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 w-16">Rank</th>
                            <th className="px-6 py-3">Staff Member</th>
                            <th className="px-6 py-3 text-right">{countLabel}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="3" className="px-6 py-8 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Loading...
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                                    No data found for this period/filter.
                                </td>
                            </tr>
                        ) : (
                            data.map((entry, index) => (
                                <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-medium text-center">
                                        {index + 1 === 1 && <span className="text-xl" title="1st Place">🥇</span>}
                                        {index + 1 === 2 && <span className="text-xl" title="2nd Place">🥈</span>}
                                        {index + 1 === 3 && <span className="text-xl" title="3rd Place">🥉</span>}
                                        {index + 1 > 3 && <span className="font-bold text-gray-500">#{index + 1}</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 dark:text-white">{entry.name}</div>
                                        <div className="text-xs text-gray-400">{entry.department}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-orange-600 dark:text-orange-400 text-lg">
                                        {entry.count}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-orange-500" />
                        Company Leaderboards
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                    </p>
                </div>
                
                {can('MANAGE_LEADERBOARD_SETTINGS') && (
                    <Button 
                        onClick={() => setIsManageMode(!isManageMode)}
                        variant={isManageMode ? "default" : "outline"}
                        className="flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        {isManageMode ? 'Hide Settings' : 'Leaderboard Settings'}
                    </Button>
                )}
            </div>

            {/* Filters Section */}
            {isManageMode && can('MANAGE_LEADERBOARD_SETTINGS') && (
                <Card className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                        {/* Date Range */}
                        <div className="flex flex-col sm:flex-row gap-4 items-end border-b border-gray-200 dark:border-gray-700 pb-4">
                            <div className="w-full sm:w-auto">
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Start Date</label>
                                <Input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => handleStartDateChange(e.target.value)} 
                                />
                            </div>
                            <div className="w-full sm:w-auto">
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">End Date</label>
                                <Input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => handleEndDateChange(e.target.value)} 
                                />
                            </div>
                        </div>

                        {/* Departments Filter */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filter Departments</label>
                                <button 
                                    onClick={toggleAllDepartments}
                                    className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                                >
                                    {selectedDepartments.length === departments.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {departments.map(dept => (
                                    <label key={dept} className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={selectedDepartments.includes(dept)}
                                            onChange={() => toggleDepartment(dept)}
                                            className="rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate" title={dept}>{dept}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
                        <Button 
                            onClick={saveGlobalSettings} 
                            disabled={savingSettings}
                            className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
                        >
                            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {savingSettings ? 'Saving...' : 'Save Global Settings'}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Leaderboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <LeaderboardTable 
                    title="Weekend Warriors" 
                    icon={Calendar} 
                    data={weekendLeaderboard} 
                    countLabel="Shifts"
                />
                <LeaderboardTable 
                    title="Friday Night Fever" 
                    icon={Moon} 
                    data={fridayNightFeverLeaderboard} 
                    countLabel="Shifts"
                />
                <LeaderboardTable 
                    title="CRSA Superstar" 
                    icon={Star} 
                    data={crsaSuperstarLeaderboard} 
                    countLabel="Shifts"
                />
                <LeaderboardTable 
                    title="Top Reporters (Close Calls)" 
                    icon={AlertTriangle} 
                    data={closeCallsLeaderboard} 
                    countLabel="Reports"
                />
                <LeaderboardTable 
                    title="Top Performers (Check & Adjust)" 
                    icon={Camera} 
                    data={checkAdjustLeaderboard} 
                    countLabel="Checks"
                />
                <LeaderboardTable 
                    title="Top Performers (Vehicle Checks)" 
                    icon={Car} 
                    data={vehicleInspectionLeaderboard} 
                    countLabel="Inspections"
                />
            </div>
        </div>
    );
};

export default LeaderboardPage;