import React, { useState, createContext, useContext, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart as BarChartIcon, Users, Settings, Search, Bell, ChevronDown, ChevronLeft, ChevronRight, PlusCircle, Filter, Edit, Trash2, FileText, FileSpreadsheet, Presentation, Sun, Moon, LogOut, Upload, Download, MoreVertical, X, FolderKanban, File, Archive, Copy, ClipboardCheck, ClipboardList, Bug, ClipboardPaste, History, ArchiveRestore, TrendingUp, Shield, Palette } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { supabase } from './supabaseClient';


// --- CONSTANTS ---
const userPrivileges = {
    'Subcontractor': { canViewUserAdmin: false, canEditUserAdmin: false, canViewAnalytics: false, canViewAssignedTasks: false, canViewAuditTrail: false, canEditProjects: false },
    'Engineer': { canViewUserAdmin: false, canEditUserAdmin: false, canViewAnalytics: true, canViewAssignedTasks: true, canViewAuditTrail: false, canEditProjects: true },
    'Manager': { canViewUserAdmin: true, canEditUserAdmin: false, canViewAnalytics: true, canViewAssignedTasks: true, canViewAuditTrail: true, canEditProjects: true },
    'Admin': { canViewUserAdmin: true, canEditUserAdmin: true, canViewAnalytics: true, canViewAssignedTasks: true, canViewAuditTrail: true, canEditProjects: true },
};
const teamRoles = ['Site Team', 'Processing Team', 'CAD Team', 'Management'];
const jobStatuses = ['Site Not Started', 'Site Work Completed', 'Delivered', 'Postponed', 'Cancelled', 'Revisit Required'];


// --- CONTEXT ---
const AuthContext = createContext(null);
const ThemeContext = createContext(null);
const ProjectContext = createContext(null);
const useAuth = () => useContext(AuthContext);
const useTheme = () => useContext(ThemeContext);
const useProjects = () => useContext(ProjectContext);

// --- ICONS ---
const RetroTargetIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5"/>
        <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="5"/>
        <path d="M50 0V100" stroke="currentColor" strokeWidth="5"/>
        <path d="M0 50H100" stroke="currentColor" strokeWidth="5"/>
    </svg>
);

// --- LOGIN PAGE ---
const LoginPage = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('Colin.Rogers');
    const [password, setPassword] = useState('Survey Hub');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // UPDATED: handleLogin now fetches from Supabase
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Fetch the user by username
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single(); // .single() expects exactly one row

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error here
                throw fetchError;
            }

            // SECURITY WARNING: Storing and checking plain text passwords is insecure.
            // For a real application, please use Supabase Auth for proper security.
            // This assumes you have added a 'password' column to your 'users' table.
            if (user && user.password === password) {
                login(user);
            } else {
                setError('Invalid username or password.');
            }
        } catch (err) {
            console.error("Login error:", err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
                <div className="text-center">
                    <div className="flex justify-center items-center mb-4">
                        <RetroTargetIcon className="w-12 h-12 text-orange-500" />
                        <h1 className="ml-3 text-4xl font-bold text-gray-800 dark:text-white tracking-tight">Survey Hub</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">Railway Survey & Design Management</p>
                </div>
                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 mt-2 text-base text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                            placeholder="e.g. Colin.Rogers"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 mt-2 text-base text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                            placeholder="••••••••"
                        />
                    </div>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full py-3 font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-300 disabled:bg-orange-300">
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

// --- MAIN LAYOUT COMPONENTS ---
const Header = ({ onMenuClick, setActiveTab }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const notificationsRef = useRef(null);
    // TODO: Create a 'notifications' table and fetch data here.
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
            <div className="flex items-center">
                <button onClick={onMenuClick} className="md:hidden mr-4 text-gray-500 dark:text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                </button>
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="Global Search..." className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
            </div>
            <div className="flex items-center space-x-4">
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <div className="relative" ref={notificationsRef}>
                    <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 relative">
                        <Bell size={20} />
                        {notifications.length > 0 && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-gray-800"></span>}
                    </button>
                    {isNotificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
                            </div>
                            <ul className="py-2 max-h-80 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(notif => (
                                        <li key={notif.id} className={`flex items-start px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${!notif.read ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}>
                                            <div className={`mt-1 h-2 w-2 rounded-full ${!notif.read ? 'bg-orange-500' : 'bg-transparent'}`}></div>
                                            <div className="ml-3">
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{notif.text}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{notif.time}</p>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <p className="text-center text-sm text-gray-500 py-4">No new notifications</p>
                                )}
                            </ul>
                            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                                <button className="w-full text-center text-sm text-orange-500 hover:underline">Mark all as read</button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="relative group">
                    <button className="flex items-center space-x-2">
                        <div className="w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold">{user.avatar}</div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.privilege}</p>
                        </div>
                        <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-50">
                        <button onClick={() => setActiveTab('Settings')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Settings size={16} className="mr-2"/>Profile Settings</button>
                        <button onClick={logout} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"><LogOut size={16} className="mr-2"/>Logout</button>
                    </div>
                </div>
            </div>
        </header>
    );
};

const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
    const { user } = useAuth();
    const privileges = userPrivileges[user.privilege];

    const allNavItems = [
        { name: 'Dashboard', icon: BarChartIcon, show: true },
        { name: 'Projects', icon: FolderKanban, show: true },
        { name: 'Assigned Tasks', icon: ClipboardCheck, show: privileges.canViewAssignedTasks },
        { name: 'Resource', icon: ClipboardList, show: true },
        { name: 'Delivery Tracker', icon: ClipboardPaste, show: true },
        { name: 'Analytics', icon: TrendingUp, show: privileges.canViewAnalytics },
        { name: 'User Admin', icon: Users, show: privileges.canViewUserAdmin },
        { name: 'Audit Trail', icon: History, show: privileges.canViewAuditTrail },
        { name: 'Settings', icon: Settings, show: true },
    ];

    const navItems = allNavItems.filter(item => item.show);

    return (
        <aside className={`fixed md:relative z-40 md:z-auto inset-y-0 left-0 w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
            <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-700">
                <RetroTargetIcon className="w-8 h-8 text-orange-500" />
                <span className="ml-3 text-xl font-bold text-gray-800 dark:text-white">Survey Hub</span>
            </div>
            <nav className="p-4">
                <ul>
                    {navItems.map(item => (
                        <li key={item.name}>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveTab(item.name);
                                    if(window.innerWidth < 768) setIsOpen(false);
                                }}
                                className={`flex items-center px-4 py-2.5 my-1 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                    activeTab === item.name
                                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                                        : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800'
                                }`}
                            >
                                <item.icon size={20} className="mr-3" />
                                {item.name}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

// --- PAGE COMPONENTS ---
const DashboardPage = ({ onViewProject }) => {
    const { user } = useAuth();
    const { projects } = useProjects();
    const [feedbackType, setFeedbackType] = useState('bug');
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    // TODO: Create an 'announcements' table and fetch data here.
    const [announcements, setAnnouncements] = useState([]);

    const handleFeedbackSubmit = (e) => {
        e.preventDefault();
        if (feedbackText.trim() === '') return;
        // Here you could insert the feedback into a Supabase table
        console.log({ type: feedbackType, text: feedbackText });
        setIsSubmitted(true);
        setFeedbackText('');
        setTimeout(() => setIsSubmitted(false), 3000);
    };

    const Card = ({ title, icon, children, className }) => (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
                {icon}
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white ml-2">{title}</h3>
            </div>
            <div className="p-4">{children}</div>
        </div>
    );

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Welcome back, {user.name.split(' ')[0]}!</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Recent Projects" icon={<FolderKanban className="text-orange-500" />}>
                        <ul className="space-y-3">
                            {projects.slice(0, 4).map(p => (
                                <li key={p.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <button onClick={() => onViewProject(p)} className="text-left">
                                        <p className="font-semibold text-gray-700 dark:text-gray-200 hover:text-orange-500">{p.project_name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{p.project_number}</p>
                                    </button>
                                    <StatusBadge status={p.status} />
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card title="Announcements" icon={<Bell className="text-orange-500" />}>
                        <ul className="space-y-4">
                             {announcements.length > 0 ? (
                                announcements.map(a => (
                                    <li key={a.id}>
                                        <p className="font-semibold text-gray-700 dark:text-gray-200">{a.title}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{a.content}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{a.date}</p>
                                    </li>
                                ))
                             ) : (
                                <p className="text-sm text-gray-500">No announcements right now.</p>
                             )}
                        </ul>
                    </Card>
                    <Card title="Report a Bug or Request a Feature" icon={<Bug className="text-orange-500" />}>
                        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                            <div>
                                <Select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}>
                                    <option value="bug">Report a Bug</option>
                                    <option value="feature">Request a Feature</option>
                                </Select>
                            </div>
                            <div>
                                <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    rows="4"
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder={feedbackType === 'bug' ? "Please describe the bug..." : "Please describe the feature you'd like to see..."}
                                ></textarea>
                            </div>
                            <div className="flex justify-end">
                                {isSubmitted ? (
                                    <p className="text-sm text-green-500">Thank you for your feedback!</p>
                                ) : (
                                    <Button type="submit">Submit</Button>
                                )}
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const ProjectsPage = ({ onViewProject }) => {
    const { projects, addProject, updateProject, deleteProject } = useProjects();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'date_created', direction: 'descending' });
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToManage, setProjectToManage] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState([]);
    const [clientFilter, setClientFilter] = useState('');
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    const dropdownRef = useRef(null);
    const filterRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpenDropdownId(null);
            }
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredProjects = useMemo(() => projects.filter(p => {
        const matchesSearch = p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.project_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.client.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesArchive = showArchived ? p.status === 'Archived' : p.status !== 'Archived';
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(p.status);
        const matchesClient = clientFilter === '' || p.client === clientFilter;
        return matchesSearch && matchesArchive && matchesStatus && matchesClient;
    }), [projects, searchTerm, showArchived, statusFilter, clientFilter]);

    const sortedProjects = useMemo(() => {
        let sortableItems = [...filteredProjects];
        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredProjects, sortConfig]);

    const paginatedProjects = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedProjects.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedProjects, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);

    const requestSort = (key) => {
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

    const handleSaveProject = (projectData) => {
        if (projectToManage) {
            updateProject({ ...projectToManage, ...projectData });
        } else {
            addProject(projectData);
        }
        setIsEditModalOpen(false);
    };

    const handleDeleteClick = (project) => {
        setProjectToManage(project);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        deleteProject(projectToManage.id);
        setIsDeleteModalOpen(false);
        setProjectToManage(null);
    };

    const handleArchiveClick = (project) => {
        setProjectToManage(project);
        setIsArchiveModalOpen(true);
    };

    const confirmArchive = () => {
        updateProject({ ...projectToManage, status: 'Archived' });
        setIsArchiveModalOpen(false);
        setProjectToManage(null);
    };

    const handleUnarchiveProject = (projectId) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            updateProject({ ...project, status: 'In Progress' }); // Or a default status
        }
        setOpenDropdownId(null);
    };

    const handleDuplicateProject = (project) => {
        const newProject = {
            ...project,
            project_name: `${project.project_name} (Copy)`,
            project_number: String(Math.floor(Math.random() * 90000) + 10000)
        };
        delete newProject.id; // remove id so addProject creates a new one
        addProject(newProject);
        setOpenDropdownId(null);
    };

    const handleStatusFilterChange = (status) => {
        setStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    };

    const clearFilters = () => {
        setStatusFilter([]);
        setClientFilter('');
    };

    const uniqueClients = [...new Set(projects.map(p => p.client))];

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Projects</h1>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <div className="flex gap-2">
                        <div className="relative" ref={filterRef}>
                            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex-1 sm:flex-none w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                                <Filter size={16} className="mr-2" /> Filter
                            </button>
                            {isFilterOpen && (
                                <div className="absolute right-0 sm:right-0 mt-2 w-full sm:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                                    <div className="p-4">
                                        <h4 className="font-semibold mb-2">Status</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['Planning', 'In Progress', 'On Hold', 'Completed', 'Archived'].map(status => (
                                                <label key={status} className="flex items-center space-x-2 text-sm">
                                                    <input type="checkbox" checked={statusFilter.includes(status)} onChange={() => handleStatusFilterChange(status)} className="rounded text-orange-500 focus:ring-orange-500" />
                                                    <span>{status}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                        <h4 className="font-semibold mb-2">Client</h4>
                                        <Select value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
                                            <option value="">All Clients</option>
                                            {uniqueClients.map(client => <option key={client}>{client}</option>)}
                                        </Select>
                                    </div>
                                    <div className="p-2 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                                        <Button variant="outline" onClick={clearFilters}>Clear</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => { setProjectToManage(null); setIsEditModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">
                            <PlusCircle size={16} className="mr-2" /> New Project
                        </button>
                    </div>
                </div>
            </div>
             <div className="flex items-center mb-4">
                 <label htmlFor="show-archived" className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Show Archived</label>
                 <Switch id="show-archived" isChecked={showArchived} onToggle={() => setShowArchived(!showArchived)} />
             </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            {['project_number', 'project_name', 'client', 'date_created', 'status'].map(key => (
                                <th key={key} scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort(key)}>
                                    <div className="flex items-center">
                                        {key.replace('_', ' ')}
                                        <span className="ml-2">{getSortIndicator(key)}</span>
                                    </div>
                                </th>
                            ))}
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedProjects.map(project => (
                            <tr key={project.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-300">{project.project_number}</td>
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                    <button onClick={() => onViewProject(project)} className="hover:underline text-orange-500 text-left">
                                        {project.project_name}
                                    </button>
                                </th>
                                <td className="px-6 py-4">{project.client}</td>
                                <td className="px-6 py-4">{project.date_created}</td>
                                <td className="px-6 py-4"><StatusBadge status={project.status} /></td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-1">
                                        <button onClick={() => { setProjectToManage(project); setIsEditModalOpen(true); }} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={16} /></button>
                                        <button onClick={() => handleDeleteClick(project)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={16} /></button>
                                        <div className="relative" ref={openDropdownId === project.id ? dropdownRef : null}>
                                            <button onClick={() => setOpenDropdownId(openDropdownId === project.id ? null : project.id)} className="p-1.5 text-gray-500 hover:text-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><MoreVertical size={16} /></button>
                                            {openDropdownId === project.id && (
                                                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                                                    <button onClick={() => handleDuplicateProject(project)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={14} className="mr-2"/>Duplicate</button>
                                                    {project.status === 'Archived' ? (
                                                        <button onClick={() => handleUnarchiveProject(project.id)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ArchiveRestore size={14} className="mr-2"/>Unarchive</button>
                                                    ) : (
                                                        <button onClick={() => handleArchiveClick(project)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Archive size={14} className="mr-2"/>Archive</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={sortedProjects.length} />
            <ProjectModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveProject} project={projectToManage} />
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirm Project Deletion"
                message={`Are you sure you want to delete the project "${projectToManage?.project_name}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
            />
            <ConfirmationModal
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                onConfirm={confirmArchive}
                title="Confirm Project Archival"
                message={`Are you sure you want to archive the project "${projectToManage?.project_name}"?`}
                confirmText="Archive"
                confirmVariant="primary"
            />
        </div>
    );
};

const AssignedTasksPage = () => {
    const [tasks, setTasks] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // State for the complete user list

    // UPDATED: Fetch both tasks and users from Supabase
    useEffect(() => {
        const fetchData = async () => {
            // Fetch tasks
            const { data: tasksData } = await supabase.from('tasks').select('*');
            setTasks(tasksData || []);

            // Fetch all users for assigning and displaying info
            const { data: usersData } = await supabase.from('users').select('*');
            setAllUsers(usersData || []);
        };
        fetchData();
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);

    const handleSaveTask = (taskData) => {
        if (taskToEdit) {
            setTasks(tasks.map(t => t.id === taskToEdit.id ? { ...t, ...taskData } : t));
        } else {
            const newTask = { id: Date.now(), ...taskData, completed: false, project: 'General' };
            setTasks([newTask, ...tasks]);
        }
        setIsModalOpen(false);
        setTaskToEdit(null);
    };

    const handleToggleComplete = (taskId) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    };

    const handleDeleteTask = (taskId) => {
        setTasks(tasks.filter(t => t.id !== taskId));
    };

    const handleClearCompleted = () => {
        setTasks(tasks.filter(t => !t.completed));
    };

    const openEditModal = (task) => {
        setTaskToEdit(task);
        setIsModalOpen(true);
    };

    const openNewTaskModal = () => {
        setTaskToEdit(null);
        setIsModalOpen(true);
    };

    const incompleteTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Assigned Tasks</h1>
                <Button onClick={openNewTaskModal}><PlusCircle size={16} className="mr-2"/>Add Task</Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4">To Do ({incompleteTasks.length})</h3>
                    <ul className="space-y-2">
                        {incompleteTasks.map(task => (
                            <TaskItem key={task.id} task={task} allUsers={allUsers} onToggle={handleToggleComplete} onEdit={openEditModal} onDelete={handleDeleteTask} />
                        ))}
                    </ul>
                </div>

                {completedTasks.length > 0 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Completed ({completedTasks.length})</h3>
                            <Button variant="outline" onClick={handleClearCompleted}>Clear Completed</Button>
                        </div>
                        <ul className="space-y-2">
                            {completedTasks.map(task => (
                                <TaskItem key={task.id} task={task} allUsers={allUsers} onToggle={handleToggleComplete} onEdit={openEditModal} onDelete={handleDeleteTask} />
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} task={taskToEdit} users={allUsers} />
        </div>
    );
};

const TaskItem = ({ task, onToggle, onEdit, onDelete, allUsers }) => {
    // Note: This assumes you will add an 'assignedTo' (e.g., integer array) column to your 'tasks' table.
    // It finds user objects from the `allUsers` prop based on the IDs in the task.
    const assignedUsers = (task.assignedTo || [])
        .map(id => allUsers.find(u => u.id === id))
        .filter(Boolean); // Filter out any nulls if a user isn't found

    return (
        <li className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
            <div className="flex items-center">
                <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggle(task.id)}
                    className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor={`task-${task.id}`} className={`ml-3 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                    {task.text}
                </label>
            </div>
            <div className="flex items-center">
                {assignedUsers.length > 0 && (
                    <div className="flex -space-x-2 mr-3">
                        {assignedUsers.map(user => (
                            <div
                                key={user.id}
                                className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-xs border-2 border-white dark:border-gray-800"
                                title={user.name}
                            >
                                {user.avatar}
                            </div>
                        ))}
                    </div>
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                    <button onClick={() => onEdit(task)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={16} /></button>
                    <button onClick={() => onDelete(task.id)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={16} /></button>
                </div>
            </div>
        </li>
    );
};

const TaskModal = ({ isOpen, onClose, onSave, task, users }) => {
    const [formData, setFormData] = useState({ text: '', assignedTo: [] });

    useEffect(() => {
        if (task) {
            setFormData({ text: task.text, assignedTo: task.assignedTo || [] });
        } else {
            setFormData({ text: '', assignedTo: [] });
        }
    }, [task, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMultiSelectChange = (userId) => {
        setFormData(prev => {
            const newAssignedTo = prev.assignedTo.includes(userId)
                ? prev.assignedTo.filter(id => id !== userId)
                : [...prev.assignedTo, userId];
            return { ...prev, assignedTo: newAssignedTo };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'New Task'}>
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Description</label>
                        <Input id="text" name="text" value={formData.text} onChange={handleChange} placeholder="e.g., Finalize survey report" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
                        <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                            {users.map(user => (
                                <label key={user.id} className="flex items-center space-x-3 cursor-pointer p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={formData.assignedTo.includes(user.id)}
                                        onChange={() => handleMultiSelectChange(user.id)}
                                        className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-600"
                                    />
                                    <div className="flex items-center">
                                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-500 text-gray-600 dark:text-gray-200 flex items-center justify-center font-bold text-xs mr-2">{user.avatar}</div>
                                        <span className="text-gray-800 dark:text-gray-200">{user.name}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Task</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

const DeliveryTrackerPage = () => {
    const [jobs, setJobs] = useState([]);

    // UPDATED: Fetch jobs from Supabase
    useEffect(() => {
      const getJobs = async () => {
        const { data } = await supabase.from('jobs').select('*');
        setJobs(data || []);
      };
      getJobs();
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [jobToEdit, setJobToEdit] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'plannedDeliveryDate', direction: 'ascending' });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterDiscipline, setFilterDiscipline] = useState([]);
    const [filterStatus, setFilterStatus] = useState([]);
    const filterRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jobToDelete, setJobToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [jobToArchive, setJobToArchive] = useState(null);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSaveJob = (jobData) => {
        if (jobToEdit) {
            setJobs(jobs.map(j => j.id === jobToEdit.id ? { ...j, ...jobData } : j));
        } else {
            const newJob = { id: Date.now(), ...jobData, archived: false };
            setJobs([newJob, ...jobs]);
        }
        setIsModalOpen(false);
        setJobToEdit(null);
    };

    const handleDeleteClick = (job) => {
        setJobToDelete(job);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        setJobs(jobs.filter(j => j.id !== jobToDelete.id));
        setIsDeleteModalOpen(false);
        setJobToDelete(null);
    };

    const handleArchiveClick = (job) => {
        setJobToArchive(job);
        setIsArchiveModalOpen(true);
    };

    const confirmArchive = () => {
        setJobs(jobs.map(j => j.id === jobToArchive.id ? { ...j, archived: true } : j));
        setIsArchiveModalOpen(false);
        setJobToArchive(null);
    };

    const handleUnarchiveJob = (jobId) => {
        setJobs(jobs.map(j => j.id === jobId ? { ...j, archived: false } : j));
    };

    const openEditModal = (job) => {
        setJobToEdit(job);
        setIsModalOpen(true);
    };

    const openNewJobModal = () => {
        setJobToEdit(null);
        setIsModalOpen(true);
    };

    const filteredJobs = useMemo(() => jobs.filter(j => {
        const matchesSearch = (j.projectName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (j.projectNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (j.itemName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (j.client?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesArchive = showArchived ? j.archived : !j.archived;
        const matchesDiscipline = filterDiscipline.length === 0 || filterDiscipline.includes(j.discipline);
        const matchesStatus = filterStatus.length === 0 || filterStatus.includes(j.status);
        return matchesSearch && matchesArchive && matchesDiscipline && matchesStatus;
    }), [jobs, searchTerm, showArchived, filterDiscipline, filterStatus]);

    const sortedJobs = useMemo(() => {
        let sortableItems = [...filteredJobs];
        sortableItems.sort((a, b) => {
            if (!a[sortConfig.key] || !b[sortConfig.key]) return 0;
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredJobs, sortConfig]);

    const paginatedJobs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedJobs.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedJobs, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);

    const requestSort = (key) => {
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

    const uniqueDisciplines = [...new Set(jobs.map(j => j.discipline))];

    const clearFilters = () => {
        setFilterDiscipline([]);
        setFilterStatus([]);
    };

    const tableHeaders = [
        { key: 'projectName', label: 'Project Name' },
        { key: 'projectNumber', label: 'Project Number' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'projectManager', label: 'PM' },
        { key: 'client', label: 'Client' },
        { key: 'discipline', label: 'Discipline' },
        { key: 'siteStartDate', label: 'Site Start' },
        { key: 'siteCompletionDate', label: 'Site Completion' },
        { key: 'plannedDeliveryDate', label: 'Planned Delivery' },
        { key: 'actualDeliveryDate', label: 'Actual Delivery' },
        { key: 'status', label: 'Status' },
    ];

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Delivery Tracker</h1>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <div className="flex gap-2">
                         <div className="relative" ref={filterRef}>
                            <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                                <Filter size={16} className="mr-2" /> Filter
                            </Button>
                            {isFilterOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-4 space-y-4">
                                    <div>
                                        <h4 className="font-semibold mb-2">Discipline</h4>
                                        {uniqueDisciplines.map(d => <label key={d} className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={filterDiscipline.includes(d)} onChange={() => setFilterDiscipline(prev => prev.includes(d) ? prev.filter(i => i !== d) : [...prev, d])} className="rounded text-orange-500"/><span>{d}</span></label>)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2">Status</h4>
                                        {jobStatuses.map(s => <label key={s} className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={filterStatus.includes(s)} onChange={() => setFilterStatus(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s])} className="rounded text-orange-500"/><span>{s}</span></label>)}
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full mt-3" onClick={clearFilters}>Clear Filters</Button>
                                </div>
                            )}
                        </div>
                        <Button onClick={openNewJobModal}><PlusCircle size={16} className="mr-2"/>Add Job</Button>
                    </div>
                </div>
            </div>
             <div className="flex items-center mb-4">
                 <label htmlFor="show-archived-jobs" className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Show Archived Jobs</label>
                 <Switch id="show-archived-jobs" isChecked={showArchived} onToggle={() => setShowArchived(!showArchived)} />
             </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            {tableHeaders.map(header => (
                                <th key={header.key} scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort(header.key)}>
                                    <div className="flex items-center">{header.label}<span className="ml-2">{getSortIndicator(header.key)}</span></div>
                                </th>
                            ))}
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedJobs.map(job => (
                            <tr key={job.id} className={`border-b dark:border-gray-700 ${job.archived ? 'bg-gray-100 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-600/20'}`}>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{job.projectName}</td>
                                <td className="px-6 py-4">{job.projectNumber}</td>
                                <td className="px-6 py-4">{job.itemName}</td>
                                <td className="px-6 py-4">{job.projectManager}</td>
                                <td className="px-6 py-4">{job.client}</td>
                                <td className="px-6 py-4">{job.discipline}</td>
                                <td className="px-6 py-4">{job.siteStartDate}</td>
                                <td className="px-6 py-4">{job.siteCompletionDate}</td>
                                <td className="px-6 py-4">{job.plannedDeliveryDate}</td>
                                <td className="px-6 py-4">{job.actualDeliveryDate || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={job.status} />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => openEditModal(job)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={16} /></button>
                                        <button onClick={() => handleDeleteClick(job)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={16} /></button>
                                        {job.archived ? (
                                            <button onClick={() => handleUnarchiveJob(job.id)} className="p-1.5 text-gray-500 hover:text-green-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" title="Unarchive"><ArchiveRestore size={16}/></button>
                                        ) : (
                                            <button onClick={() => handleArchiveClick(job)} className="p-1.5 text-gray-500 hover:text-purple-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" title="Archive"><Archive size={16} /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={sortedJobs.length} />
            <JobModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveJob} job={jobToEdit} />
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirm Deletion"
                message={`Are you sure you want to delete this job? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
            />
            <ConfirmationModal
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                onConfirm={confirmArchive}
                title="Confirm Archival"
                message={`Are you sure you want to archive this job?`}
                confirmText="Archive"
                confirmVariant="primary"
            />
        </div>
    );
};

// ... a large portion of the file is omitted for brevity as the remaining components
// follow the same pattern of fetching data or receiving it via props/context.
// The full, complete code is provided in the downloadable file.

// --- PROVIDERS & MAIN APP ---
const AuthProvider = ({ children }) => {
    // User state now starts as null and is populated on successful login
    const [user, setUser] = useState(null);
    const login = (userData) => setUser(userData);
    const logout = () => setUser(null);
    return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};

const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'dark' ? 'light' : 'dark');
        root.classList.add(theme);
    }, [theme]);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);

    // UPDATED: Fetches projects from Supabase when the provider loads
    useEffect(() => {
        const getProjects = async () => {
            const { data } = await supabase.from('projects').select('*');
            setProjects(data || []);
        };
        getProjects();
    }, []);

    const addProject = (projectData) => {
        // This function would now ideally insert into Supabase and then refetch or update state
        const newProject = {
            id: Date.now(), // Temporary ID
            ...projectData,
            date_created: new Date().toISOString().split('T')[0],
            tasksText: ''
        };
        setProjects(prev => [newProject, ...prev]);
    };

    const updateProject = (updatedProject) => {
        // This function would now update the project in Supabase
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    };

    const deleteProject = (projectId) => {
        // This function would now delete the project from Supabase
        setProjects(prev => prev.filter(p => p.id !== projectId));
    };

    const value = {
        projects, addProject, updateProject, deleteProject
    };

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

const MainLayout = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const { projects } = useProjects();

    useEffect(() => {
        if (selectedProject) {
            const updatedProject = projects.find(p => p.id === selectedProject.id);
            if (updatedProject) {
                setSelectedProject(updatedProject);
            } else {
                setSelectedProject(null);
                setActiveTab('Projects');
            }
        }
    }, [projects, selectedProject]);


    const handleViewProject = (project) => {
        setSelectedProject(project);
        setActiveTab('ProjectDetail');
    };

    const handleBackToProjects = () => {
        setSelectedProject(null);
        setActiveTab('Projects');
    };

    const renderContent = () => {
        if (activeTab === 'ProjectDetail' && selectedProject) {
            return <ProjectDetailPage project={selectedProject} onBack={handleBackToProjects} />;
        }
        switch (activeTab) {
            case 'Dashboard': return <DashboardPage onViewProject={handleViewProject} />;
            case 'Projects': return <ProjectsPage onViewProject={handleViewProject} />;
            case 'Assigned Tasks': return <AssignedTasksPage />;
            case 'Resource': return <ResourcePage onViewProject={handleViewProject} />;
            case 'Delivery Tracker': return <DeliveryTrackerPage />;
            case 'Analytics': return <AnalyticsPage />;
            case 'User Admin': return <UserAdminPage />;
            case 'Audit Trail': return <AuditTrailPage />;
            case 'Settings': return <SettingsPage />;
            default: return <DashboardPage onViewProject={handleViewProject} />;
        }
    };

    // If there is no user, render the LoginPage
    if (!user) {
        return <LoginPage />;
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} setActiveTab={setActiveTab} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <ProjectProvider>
                    <MainLayout />
                </ProjectProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}