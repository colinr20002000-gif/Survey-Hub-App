import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Phone, Briefcase, Award, User, Users } from 'lucide-react';
import { useUsers } from '../contexts/UserContext';
import { supabase } from '../supabaseClient';
import { getDepartmentColor } from '../utils/avatarColors';

const UserContactsPage = () => {
    const { users: allUsersRaw, loading: usersLoading } = useUsers();
    const [competencies, setCompetencies] = useState([]);

    // Filter out Subcontractor and Track Handback departments
    const allUsers = useMemo(() => {
        return allUsersRaw.filter(user => {
            const dept = user.department?.toLowerCase() || '';
            return dept !== 'subcontractor' && dept !== 'track handback';
        });
    }, [allUsersRaw]);

    useEffect(() => {
        fetchCompetencies();
    }, []);

    const fetchCompetencies = async () => {
        try {
            const { data: categoryData, error: categoryError } = await supabase
                .from('dropdown_categories')
                .select('id')
                .eq('name', 'competencies')
                .single();

            if (categoryError) throw categoryError;

            const { data: itemsData, error: itemsError } = await supabase
                .from('dropdown_items')
                .select('value, display_text')
                .eq('category_id', categoryData.id)
                .eq('is_active', true)
                .order('sort_order');

            if (itemsError) throw itemsError;
            setCompetencies(itemsData || []);
        } catch (error) {
            console.error('Error fetching competencies:', error);
        }
    };

    const getCompetencyDisplayText = (competencyValues) => {
        if (!competencyValues) return '';
        const values = competencyValues.split(',').map(v => v.trim());
        return values.map(value => {
            const comp = competencies.find(c => c.value === value);
            return comp ? comp.display_text : value;
        }).join(', ');
    };

    // Group users by department
    const usersByDepartment = useMemo(() => {
        const grouped = {};

        // Sort users alphabetically by name first
        const sortedUsers = [...allUsers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        sortedUsers.forEach(user => {
            const dept = user.department || 'No Department';
            if (!grouped[dept]) {
                grouped[dept] = [];
            }
            grouped[dept].push(user);
        });

        // Custom sort: Site Team first, then alphabetically
        return Object.keys(grouped)
            .sort((a, b) => {
                // Site Team always comes first
                if (a.toLowerCase() === 'site team') return -1;
                if (b.toLowerCase() === 'site team') return 1;
                // Everything else alphabetically
                return a.localeCompare(b);
            })
            .reduce((acc, dept) => {
                acc[dept] = grouped[dept];
                return acc;
            }, {});
    }, [allUsers]);

    if (usersLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Loading User Contacts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Staff Contacts</h1>
                <p className="text-gray-600 dark:text-gray-400">Browse and connect with team members</p>
            </div>

            {/* User Cards Grouped by Department */}
            <div className="space-y-8">
                {Object.keys(usersByDepartment).map(department => (
                    <div key={department}>
                        {/* Department Header */}
                        <div className="flex items-center gap-2 mb-4">
                            <Users size={20} className="text-orange-500" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{department}</h2>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                ({usersByDepartment[department].length})
                            </span>
                        </div>

                        {/* Department Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {usersByDepartment[department].map(user => {
                                const departmentColor = getDepartmentColor(user.department);
                                return (
                    <div
                        key={`${user.isDummy ? 'dummy-' : ''}${user.id}`}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                    >
                        {/* Card Header */}
                        <div className={`${departmentColor} p-3 text-white`}>
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="font-semibold truncate text-sm leading-tight flex-1">{user.name}</h3>
                                {user.isDummy && (
                                    <span className="inline-block bg-white bg-opacity-25 text-xs px-1.5 py-0.5 rounded text-white flex-shrink-0">
                                        Dummy
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-3 space-y-2">
                            {/* Contact Actions */}
                            <div className="flex gap-1.5">
                                {user.email && (
                                    <a
                                        href={`mailto:${user.email}`}
                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-xs font-medium"
                                        title="Send email"
                                    >
                                        <Mail size={14} />
                                        <span className="hidden sm:inline">Email</span>
                                    </a>
                                )}
                                {user.mobile_number && (
                                    <a
                                        href={`tel:${user.mobile_number}`}
                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-xs font-medium"
                                        title="Call"
                                    >
                                        <Phone size={14} />
                                        <span className="hidden sm:inline">Call</span>
                                    </a>
                                )}
                            </div>

                            {/* User Details */}
                            <div className="space-y-1.5 text-xs">
                                {user.email && (
                                    <div className="flex items-start gap-1.5">
                                        <Mail size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-700 dark:text-gray-300 break-all leading-tight">{user.email}</span>
                                    </div>
                                )}

                                {user.mobile_number && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone size={13} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-700 dark:text-gray-300 leading-tight">{user.mobile_number}</span>
                                    </div>
                                )}

                                {user.team_role && (
                                    <div className="flex items-center gap-1.5">
                                        <Briefcase size={13} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-gray-700 dark:text-gray-300 leading-tight">{user.team_role}</span>
                                    </div>
                                )}

                                {user.organisation && (
                                    <div className="flex items-start gap-1.5">
                                        <User size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-700 dark:text-gray-300 leading-tight">{user.organisation}</span>
                                    </div>
                                )}

                                {user.competencies && (
                                    <div className="flex items-start gap-1.5">
                                        <Award size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-gray-600 dark:text-gray-400 leading-tight block">
                                                {getCompetencyDisplayText(user.competencies)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {allUsers.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="max-w-sm mx-auto">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No staff contacts</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            There are no staff contacts to display.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserContactsPage;
