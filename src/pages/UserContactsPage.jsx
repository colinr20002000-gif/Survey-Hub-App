import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { useUsers } from '../contexts/UserContext';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui';
import { useDebouncedValue } from '../utils/debounce';

const UserContactsPage = () => {
    const { users: realUsers, loading: usersLoading } = useUsers();
    const [dummyUsers, setDummyUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [competencies, setCompetencies] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchDummyUsers();
        fetchCompetencies();
    }, []);

    const fetchDummyUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('dummy_users')
                .select('*')
                .order('name');

            if (error) throw error;
            setDummyUsers(data || []);
        } catch (error) {
            console.error('Error fetching dummy users:', error);
        } finally {
            setLoading(false);
        }
    };

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

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    // Combine real and dummy users
    const allUsers = [...realUsers.map(u => ({ ...u, isDummy: false })), ...dummyUsers.map(u => ({ ...u, isDummy: true }))];

    // Get unique departments and user names
    const departments = useMemo(() => {
        const depts = [...new Set(allUsers.map(u => u.department).filter(Boolean))];
        return depts.sort();
    }, [allUsers]);

    const userNames = useMemo(() => {
        return allUsers.map(u => ({ id: u.id, name: u.name, isDummy: u.isDummy })).sort((a, b) => a.name.localeCompare(b.name));
    }, [allUsers]);

    const handleDepartmentToggle = (dept) => {
        setSelectedDepartments(prev =>
            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
        );
    };

    const handleSelectAllDepartments = () => {
        if (selectedDepartments.length === departments.length) {
            setSelectedDepartments([]);
        } else {
            setSelectedDepartments([...departments]);
        }
    };

    const isAllDepartmentsSelected = departments.length > 0 && selectedDepartments.length === departments.length;

    const handleUserToggle = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectAllUsers = () => {
        if (selectedUsers.length === userNames.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(userNames.map(u => u.id));
        }
    };

    const isAllUsersSelected = userNames.length > 0 && selectedUsers.length === userNames.length;

    const filteredUsers = useMemo(() => {
        let filtered = allUsers.filter(user => {
            // Search filter
            const matchesSearch = !debouncedSearchTerm ||
                (user.name && user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                (user.email && user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                (user.mobile_number && user.mobile_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                (user.department && user.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                (user.team_role && user.team_role.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

            // Department filter
            const matchesDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(user.department);

            // User filter
            const matchesUser = selectedUsers.length === 0 || selectedUsers.includes(user.id);

            return matchesSearch && matchesDepartment && matchesUser;
        });

        // Sort the filtered users
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key] || '';
            const bValue = b[sortConfig.key] || '';

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return filtered;
    }, [allUsers, debouncedSearchTerm, sortConfig, selectedDepartments, selectedUsers]);

    if (loading || usersLoading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading User Contacts...</div>;
    }

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">User Contacts</h1>

            <div className="mb-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email, phone, department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>
                <div className="relative">
                    <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                        <Filter size={16} className="mr-2"/>Filter
                    </Button>
                    {showFilters && (
                        <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-4 space-y-4">
                            {/* Department Filter */}
                            <div>
                                <h4 className="font-semibold mb-2 text-sm">Departments</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    <label className="flex items-center space-x-2 text-sm font-medium border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                                        <input
                                            type="checkbox"
                                            checked={isAllDepartmentsSelected}
                                            onChange={handleSelectAllDepartments}
                                            className="rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span>All Departments</span>
                                    </label>
                                    {departments.map(dept => (
                                        <label key={dept} className="flex items-center space-x-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedDepartments.includes(dept)}
                                                onChange={() => handleDepartmentToggle(dept)}
                                                className="rounded text-orange-500 focus:ring-orange-500"
                                            />
                                            <span>{dept}</span>
                                        </label>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setSelectedDepartments([])}>Clear Departments</Button>
                            </div>

                            {/* User Filter */}
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                                <h4 className="font-semibold mb-2 text-sm">Users</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    <label className="flex items-center space-x-2 text-sm font-medium border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                                        <input
                                            type="checkbox"
                                            checked={isAllUsersSelected}
                                            onChange={handleSelectAllUsers}
                                            className="rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span>All Users</span>
                                    </label>
                                    {userNames.map(user => (
                                        <label key={user.id} className="flex items-center space-x-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => handleUserToggle(user.id)}
                                                className="rounded text-orange-500 focus:ring-orange-500"
                                            />
                                            <span>
                                                {user.name}
                                                {user.isDummy && <span className="ml-1 text-xs text-gray-500">(Dummy)</span>}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setSelectedUsers([])}>Clear Users</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Name {getSortIndicator('name')}
                                </th>
                                <th onClick={() => handleSort('email')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Email {getSortIndicator('email')}
                                </th>
                                <th onClick={() => handleSort('mobile_number')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Mobile Number {getSortIndicator('mobile_number')}
                                </th>
                                <th onClick={() => handleSort('privilege')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Privilege {getSortIndicator('privilege')}
                                </th>
                                <th onClick={() => handleSort('team_role')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Team Role {getSortIndicator('team_role')}
                                </th>
                                <th onClick={() => handleSort('department')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Department {getSortIndicator('department')}
                                </th>
                                <th onClick={() => handleSort('organisation')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Organisation {getSortIndicator('organisation')}
                                </th>
                                <th onClick={() => handleSort('competencies')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    Competencies {getSortIndicator('competencies')}
                                </th>
                                <th onClick={() => handleSort('pts_number')} className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                                    PTS Number {getSortIndicator('pts_number')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredUsers.map(user => (
                                <tr key={`${user.isDummy ? 'dummy-' : ''}${user.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                        {user.name}
                                        {user.isDummy && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Dummy)</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {user.email ? (
                                            <a href={`mailto:${user.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                                {user.email}
                                            </a>
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {user.mobile_number ? (
                                            <>
                                                <a href={`tel:${user.mobile_number}`} className="md:hidden text-blue-600 dark:text-blue-400 hover:underline">
                                                    {user.mobile_number}
                                                </a>
                                                <span className="hidden md:inline text-gray-900 dark:text-white">
                                                    {user.mobile_number}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{user.privilege || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{user.team_role || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{user.department || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{user.organisation || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                        {user.competencies ? getCompetencyDisplayText(user.competencies) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{user.pts_number || '-'}</td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserContactsPage;
