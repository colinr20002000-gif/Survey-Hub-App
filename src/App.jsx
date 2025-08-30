import React, { useState, useEffect, createContext, useContext, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart as BarChartIcon, Users, Settings, Search, Bell, ChevronDown, ChevronLeft, ChevronRight, PlusCircle, Filter, Edit, Trash2, FileText, FileSpreadsheet, Presentation, Sun, Moon, LogOut, Upload, Download, MoreVertical, X, FolderKanban, File, Archive, Copy, ClipboardCheck, ClipboardList, Bug, ClipboardPaste, History, ArchiveRestore, TrendingUp, Shield, Palette } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';


// --- MOCK DATA & PRIVILEGES ---
const mockUsers = {
  '1': { id: 1, username: 'Colin.Rogers', name: 'Colin Rogers', role: 'Admin', teamRole: 'Office Staff', avatar: 'CR', email: 'colin.rogers@surveyhub.co.uk', last_login: '2024-08-25 10:30', password: 'Survey Hub', privilege: 'Admin' },
  '2': { id: 2, username: 'Ben.Carter', name: 'Ben Carter', role: 'Manager', teamRole: 'Project Team', avatar: 'BC', email: 'ben.carter@surveyhub.co.uk', last_login: '2024-08-25 09:15', password: 'password123', privilege: 'Project Managers' },
  '3': { id: 3, username: 'Chloe.Davis', name: 'Chloe Davis', role: 'Editor', teamRole: 'Site Team', avatar: 'CD', email: 'chloe.davis@surveyhub.co.uk', last_login: '2024-08-24 15:45', password: 'password456', privilege: 'Site Staff' },
  '4': { id: 4, username: 'David.Evans', name: 'David Evans', role: 'Viewer', teamRole: 'Design Team', avatar: 'DE', email: 'david.evans@surveyhub.co.uk', last_login: '2024-08-23 11:20', password: 'password789', privilege: 'Delivery Surveyors' },
  '5': { id: 5, username: 'Frank.Green', name: 'Frank Green', role: 'Viewer', teamRole: 'Subcontractor', avatar: 'FG', email: 'frank.green@contractors.com', last_login: '2024-08-22 18:00', password: 'password101', privilege: 'Subcontractor' },
};

const userPrivileges = {
    'Subcontractor': {
        level: 1,
        canEditProjects: false,
        canViewAssignedTasks: false,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: false,
    },
    'Site Staff': {
        level: 2,
        canEditProjects: true,
        canViewAssignedTasks: false,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: false,
    },
    'Office Staff': {
        level: 3,
        canEditProjects: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: false,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    },
    'Delivery Surveyors': {
        level: 3,
        canEditProjects: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: false,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    },
    'Project Managers': {
        level: 3,
        canEditProjects: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: false,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    },
    'Admin': {
        level: 4,
        canEditProjects: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: true,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    }
};

const initialProjects = [
  { id: 1, project_number: '23001', project_name: 'West Coast Main Line - Track Renewal', client: 'Network Rail', date_created: '2023-10-26', status: 'In Progress', team: ['BC', 'CD'], description: 'Comprehensive topographical survey and track renewal assessment for a 20-mile section.', startDate: '2023-11-01', targetDate: '2024-12-31', tasksText: '- Finalize Survey Report\n- Produce Track Alignment Drawings' },
  { id: 2, project_number: '23045', project_name: 'HS2 Phase 2a - Topographical Survey', client: 'HS2 Ltd', date_created: '2023-09-15', status: 'Completed', team: ['BC', 'DE'], description: 'Topographical survey for the HS2 Phase 2a route.', startDate: '2023-10-01', targetDate: '2024-06-30', tasksText: 'All tasks completed. Final data delivered to client.' },
  { id: 3, project_number: '24012', project_name: 'Crossrail - Asset Verification', client: 'Transport for London', date_created: '2024-01-20', status: 'Planning', team: ['BC', 'CD', 'DE'], description: 'Verification of assets along the Crossrail line.', startDate: '2024-02-01', targetDate: '2025-01-31', tasksText: 'Awaiting final instruction from TfL before commencing site visits.' },
  { id: 4, project_number: '24005', project_name: 'Great Western Electrification - OLE Survey', client: 'Network Rail', date_created: '2024-02-10', status: 'In Progress', team: ['BC', 'CD'], description: 'Overhead Line Equipment survey for the GWEP project.', startDate: '2024-03-01', targetDate: '2024-11-30', tasksText: '' },
  { id: 5, project_number: '24002', project_name: 'Docklands Light Railway - Tunnel Inspection', client: 'TfL', date_created: '2024-03-05', status: 'On Hold', team: ['BC'], description: 'Detailed inspection of DLR tunnels.', startDate: '2024-04-01', targetDate: '2024-09-30', tasksText: 'Project on hold due to access restrictions.' },
  { id: 6, project_number: '24018', project_name: 'Midland Main Line - Embankment Stability', client: 'Network Rail', date_created: '2024-04-12', status: 'In Progress', team: ['BC', 'CD', 'DE'], description: 'Assessment of embankment stability on the MML.', startDate: '2024-05-01', targetDate: '2025-03-31', tasksText: '' },
  { id: 7, project_number: '24091', project_name: 'Old Oak Common - Site Survey', client: 'HS2 Ltd', date_created: '2024-05-21', status: 'Planning', team: ['BC', 'CD'], description: 'Initial site survey for the new Old Oak Common station.', startDate: '2024-06-01', targetDate: '2024-10-31', tasksText: '' },
];

const mockAssignedTasks = [
    { id: 1, text: 'Finalize NR-23-001 survey report', completed: false, project: 'NR-23-001', assignedTo: [3] },
    { id: 2, text: 'Schedule site visit for TFL-24-012', completed: false, project: 'TFL-24-012', assignedTo: [2, 4] },
    { id: 3, text: 'Process point cloud data for HS2-24-091', completed: true, project: 'HS2-24-091', assignedTo: [3] },
    { id: 4, text: 'Review safety briefing for DLR-24-002', completed: false, project: 'DLR-24-002', assignedTo: [2, 3, 4] },
];

const mockResourceAllocations = {
  '2025-08-25': {
    '1': {
        assignments: [
            { type: 'leave', leaveType: 'Office (Haydock)' },
            { type: 'leave', leaveType: 'Office (Haydock)' },
            { type: 'leave', leaveType: 'Office (Home)' },
            { type: 'leave', leaveType: 'Office (Haydock)' },
            { type: 'leave', leaveType: 'Office (Haydock)' },
            null, null
        ]
    },
    '2': {
      assignments: [
        { type: 'leave', leaveType: 'Bank Holiday' },
        { type: 'project', projectNumber: '24005', projectName: 'Great Western Electrification - OLE Survey', client: 'Network Rail', time: '08:00-16:00', task: 'Survey', comment: '', shift: 'Days', projectId: 4 },
        null,
        { type: 'project', projectNumber: '24012', projectName: 'Crossrail - Asset Verification', client: 'Transport for London', time: '09:00-17:00', task: 'Monitoring', comment: 'Check access permits', shift: 'Evening', projectId: 3 },
        null, null, null
      ]
    },
    '3': {
      assignments: [
        { type: 'leave', leaveType: 'Bank Holiday' },
        { type: 'project', projectNumber: '24018', projectName: 'Midland Main Line - Embankment Stability', client: 'Network Rail', time: '22:00-06:00', task: 'Ground Investigation', comment: '', shift: 'Nights', projectId: 6 },
        { type: 'project', projectNumber: '24018', projectName: 'Midland Main Line - Embankment Stability', client: 'Network Rail', time: '22:00-06:00', task: 'Ground Investigation', comment: 'Full PPE required', shift: 'Nights', projectId: 6 },
        null, null, null, null
      ]
    },
    '4': {
      assignments: [
        { type: 'leave', leaveType: 'Bank Holiday' },
        null, null, null,
        { type: 'leave', leaveType: 'Annual Leave' },
        { type: 'leave', leaveType: 'Annual Leave' },
        null
      ]
    }
  }
};


const mockAnnouncements = [
    { id: 1, title: 'New Drone Surveying Equipment', content: 'We have acquired new LiDAR-equipped drones. Training sessions will be held next week.', date: '2024-07-22' },
    { id: 2, title: 'Updated Safety Protocols for Trackside Work', content: 'Please review the updated safety documentation on the portal before any new site visits.', date: '2024-07-18' },
];

const mockProjectFiles = [
    { id: 1, name: 'Topographical_Survey_Data.xlsx', type: 'spreadsheet', size: '2.3 MB', uploaded: '2024-07-28' },
    { id: 2, name: 'Site_Visit_Report_v2.pdf', type: 'pdf', size: '1.1 MB', uploaded: '2024-07-29' },
    { id: 3, name: 'Track_Alignment_Final.dwg', type: 'cad', size: '5.8 MB', uploaded: '2024-08-01' },
    { id: 4, name: 'Site_Photos_July.zip', type: 'zip', size: '15.2 MB', uploaded: '2024-08-02' },
];

const mockNotifications = [
    { id: 1, text: 'Chloe Davis commented on "West Coast Main Line"', time: '2m ago', read: false },
    { id: 2, text: 'New file uploaded to "HS2 Phase 2a"', time: '1h ago', read: false },
    { id: 3, text: 'Your task "Finalize NR-23-001 survey report" is due tomorrow.', time: '3h ago', read: true },
];

const jobStatuses = ["Site Not Started", "Site Work Completed", "Delivered", "Postponed", "Cancelled", "On Hold", "Revisit Required"];

const initialJobs = [
    { id: 1, projectName: "HS2 Phase 1 Enabling Works", projectNumber: "HS2-EW-21-001", itemName: "Euston Station Survey", projectManager: "Ben Carter", client: "HS2 Ltd", processingHours: 80, checkingHours: 16, siteStartDate: "2024-08-01", siteCompletionDate: "2024-09-30", plannedDeliveryDate: "2024-10-15", actualDeliveryDate: "", discipline: "Survey", comments: "Awaiting final sign-off from client.", archived: false, status: "Site Work Completed" },
    { id: 2, projectName: "Crossrail - Paddington Integration", projectNumber: "CR-PADD-22-005", itemName: "Paddington Station As-built", projectManager: "Ben Carter", client: "Transport for London", processingHours: 120, checkingHours: 24, siteStartDate: "2024-07-15", siteCompletionDate: "2024-09-20", plannedDeliveryDate: "2024-09-27", actualDeliveryDate: "2024-09-26", discipline: "Design", comments: "", archived: true, status: "Delivered" },
    { id: 3, projectName: "OLE Foundation Survey", projectNumber: "OOC-OLE-23-002", itemName: "Old Oak Common Site", projectManager: "Colin Rogers", client: "HS2 Ltd", processingHours: 60, checkingHours: 12, siteStartDate: "2024-09-01", siteCompletionDate: "2024-10-10", plannedDeliveryDate: "2024-10-20", actualDeliveryDate: "", discipline: "Utility", comments: "Access constraints on weekends.", archived: false, status: "Site Not Started" },
];

const teamRoles = ['Site Team', 'Project Team', 'Delivery Team', 'Design Team', 'Office Staff', 'Subcontractor'];

// --- NEW MOCK DATA FOR AUDIT TRAIL ---
const mockAuditTrail = [
    { id: 1, userId: 1, action: 'LOGIN', entity: 'USER', entityId: 1, timestamp: '2024-08-25 10:30:15', details: { ip_address: '192.168.1.10' } },
    { id: 2, userId: 2, action: 'CREATE', entity: 'PROJECT', entityId: 7, timestamp: '2024-08-25 09:15:45', details: { after: { project_name: 'Old Oak Common - Site Survey' } } },
    { id: 3, userId: 1, action: 'UPDATE', entity: 'USER', entityId: 3, timestamp: '2024-08-25 08:45:22', details: { before: { role: 'Viewer' }, after: { role: 'Editor' } } },
    { id: 4, userId: 3, action: 'DELETE', entity: 'TASK', entityId: 5, timestamp: '2024-08-24 15:50:00', details: { before: { text: 'Initial site walkover' } } },
    { id: 5, userId: 2, action: 'LOGOUT', entity: 'USER', entityId: 2, timestamp: '2024-08-24 12:30:00', details: {} },
    { id: 6, action: 'SYSTEM_EVENT', entity: 'SYSTEM', timestamp: '2024-08-24 11:00:00', details: { type: 'ERROR', message: 'Database connection failed' } },
    { id: 7, userId: 4, action: 'VIEW', entity: 'DELIVERY_TRACKER', timestamp: '2024-08-23 11:22:10', details: {} },
];


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

    const handleLogin = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setTimeout(() => {
            const user = Object.values(mockUsers).find(u => u.username === username);
            if (user && user.password === password) {
                login(user);
            } else {
                setError('Invalid username or password.');
            }
            setIsLoading(false);
        }, 1000);
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
                        <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-gray-800"></span>
                    </button>
                    {isNotificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
                            </div>
                            <ul className="py-2 max-h-80 overflow-y-auto">
                                {mockNotifications.map(notif => (
                                    <li key={notif.id} className={`flex items-start px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${!notif.read ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}>
                                        <div className={`mt-1 h-2 w-2 rounded-full ${!notif.read ? 'bg-orange-500' : 'bg-transparent'}`}></div>
                                        <div className="ml-3">
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{notif.text}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{notif.time}</p>
                                        </div>
                                    </li>
                                ))}
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
    const [feedbackType, setFeedbackType] = useState('bug');
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleFeedbackSubmit = (e) => {
        e.preventDefault();
        if (feedbackText.trim() === '') return;
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
                            {initialProjects.slice(0, 4).map(p => (
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
                            {mockAnnouncements.map(a => (
                                <li key={a.id}>
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">{a.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{a.content}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{a.date}</p>
                                </li>
                            ))}
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
    const [tasks, setTasks] = useState(mockAssignedTasks);
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
                            <TaskItem key={task.id} task={task} onToggle={handleToggleComplete} onEdit={openEditModal} onDelete={handleDeleteTask} />
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
                                <TaskItem key={task.id} task={task} onToggle={handleToggleComplete} onEdit={openEditModal} onDelete={handleDeleteTask} />
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} task={taskToEdit} users={Object.values(mockUsers)} />
        </div>
    );
};

const TaskItem = ({ task, onToggle, onEdit, onDelete }) => {
    const assignedUsers = task.assignedTo.map(id => mockUsers[id]).filter(Boolean);

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
    const [jobs, setJobs] = useState(initialJobs);
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
        const matchesSearch = j.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            j.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            j.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            j.client.toLowerCase().includes(searchTerm.toLowerCase());
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

const JobModal = ({ isOpen, onClose, onSave, job }) => {
    const [formData, setFormData] = useState({
        projectName: '', projectNumber: '', itemName: '', projectManager: '', client: '',
        processingHours: '', checkingHours: '', siteStartDate: '', siteCompletionDate: '',
        plannedDeliveryDate: '', actualDeliveryDate: '', discipline: '', comments: '', status: 'Site Not Started'
    });

    useEffect(() => {
        if (job) {
            setFormData(job);
        } else {
            setFormData({
                projectName: '', projectNumber: '', itemName: '', projectManager: '', client: '',
                processingHours: '', checkingHours: '', siteStartDate: '', siteCompletionDate: '',
                plannedDeliveryDate: '', actualDeliveryDate: '', discipline: '', comments: '', status: 'Site Not Started'
            });
        }
    }, [job, isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={job ? 'Edit Job' : 'Add Job'}>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Project Name" name="projectName" value={formData.projectName} onChange={handleChange} required />
                    <Input label="Project Number" name="projectNumber" value={formData.projectNumber} onChange={handleChange} required />
                    <Input label="Item Name" name="itemName" value={formData.itemName} onChange={handleChange} required />
                    <Input label="Project Manager" name="projectManager" value={formData.projectManager} onChange={handleChange} required />
                    <Input label="Client" name="client" value={formData.client} onChange={handleChange} required />
                    <Input label="Processing Hours" name="processingHours" type="number" value={formData.processingHours} onChange={handleChange} required />
                    <Input label="Checking Hours" name="checkingHours" type="number" value={formData.checkingHours} onChange={handleChange} required />
                    <Input label="Site Start Date" name="siteStartDate" type="date" value={formData.siteStartDate} onChange={handleChange} />
                    <Input label="Site Completion Date" name="siteCompletionDate" type="date" value={formData.siteCompletionDate} onChange={handleChange} />
                    <Input label="Planned Delivery Date" name="plannedDeliveryDate" type="date" value={formData.plannedDeliveryDate} onChange={handleChange} />
                    <Input label="Actual Delivery Date" name="actualDeliveryDate" type="date" value={formData.actualDeliveryDate} onChange={handleChange} />
                    <Input label="Discipline" name="discipline" value={formData.discipline} onChange={handleChange} required />
                    <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                        {jobStatuses.map(status => <option key={status}>{status}</option>)}
                    </Select>
                    <div className="md:col-span-2">
                        <Input label="Comments" name="comments" value={formData.comments} onChange={handleChange} />
                    </div>
                    <div className="md:col-span-2 flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Job</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

const ContextMenu = ({ x, y, cellData, clipboard, onAction, onClose }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const hasAssignment = !!cellData.assignment;
    const hasProjectAssignment = hasAssignment && cellData.assignment.type === 'project' && cellData.assignment.projectNumber;

    return (
        <div
            ref={menuRef}
            style={{ top: y, left: x }}
            className="absolute z-50 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1"
        >
            {hasAssignment && (
                <>
                    <button onClick={() => onAction('copy')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={14} className="mr-2"/>Copy</button>
                    <button onClick={() => onAction('cut')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>Cut</button>
                    {hasProjectAssignment && (
                        <button onClick={() => onAction('goToProject')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><FolderKanban size={14} className="mr-2"/>Go to Project</button>
                    )}
                    <button onClick={() => onAction('delete')} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={14} className="mr-2"/>Delete</button>
                </>
            )}
            {!hasAssignment && clipboard.data && (
                <button onClick={() => onAction('paste')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ClipboardCheck size={14} className="mr-2"/>Paste</button>
            )}
        </div>
    );
};

const ResourcePage = ({ onViewProject }) => {
    const { user: currentUser } = useAuth();
    const isAdminOrManager = currentUser.role === 'Admin' || currentUser.role === 'Manager';
    const allUsers = useMemo(() => Object.values(mockUsers), []);
    
    const [allocations, setAllocations] = useState(mockResourceAllocations);
    const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStartDate(new Date('2025-08-26')));
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [visibleUserIds, setVisibleUserIds] = useState(allUsers.map(u => u.id));
    const [filterRoles, setFilterRoles] = useState([]);
    const [sortOrder, setSortOrder] = useState('alphabetical');
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cellData: null });
    const [clipboard, setClipboard] = useState({ type: null, data: null, sourceCell: null });
    const filterRef = useRef(null);
    
    const shiftColors = {
      Days: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200',
      Evening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/60 dark:text-yellow-200',
      Nights: 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200',
    };
    
    const leaveColors = {
      'Annual Leave': 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
      'Bank Holiday': 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
      'Office (Haydock)': 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200',
      'Office (Home)': 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
      'Training': 'bg-gray-200 text-gray-800 dark:bg-gray-700/60 dark:text-gray-200',
      'Stand Down': 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
             if (contextMenu.visible) {
                setContextMenu({ visible: false });
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [contextMenu.visible]);

    const displayedUsers = useMemo(() => {
        let usersToDisplay = allUsers;

        if (filterRoles.length > 0) {
            usersToDisplay = usersToDisplay.filter(user => filterRoles.includes(user.teamRole));
        }

        usersToDisplay = usersToDisplay.filter(user => visibleUserIds.includes(user.id));

        if (sortOrder === 'alphabetical') {
            usersToDisplay.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOrder === 'role') {
            usersToDisplay.sort((a, b) => {
                const roleComparison = a.teamRole.localeCompare(b.teamRole);
                if (roleComparison !== 0) return roleComparison;
                return a.name.localeCompare(b.name);
            });
        }

        return usersToDisplay;
    }, [allUsers, visibleUserIds, filterRoles, sortOrder]);

    const weekDates = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    }, [currentWeekStart]);

    const handleCellClick = (userId, date, dayIndex) => {
        if (!isAdminOrManager) return;
        setSelectedCell({ userId, date, dayIndex });
        setIsAllocationModalOpen(true);
    };
    
    const handleActionClick = (e, userId, dayIndex, assignment) => {
        e.stopPropagation();
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            cellData: { userId, dayIndex, assignment }
        });
    };

    const handleSaveAllocation = (allocationData, cellToUpdate = selectedCell) => {
        const { userId, dayIndex } = cellToUpdate;
        const weekKey = formatDateForKey(currentWeekStart);

        setAllocations(prev => {
            const newAllocations = JSON.parse(JSON.stringify(prev));
            if (!newAllocations[weekKey]) newAllocations[weekKey] = {};
            if (!newAllocations[weekKey][userId]) newAllocations[weekKey][userId] = { assignments: Array(7).fill(null) };
            
            if (allocationData === null) {
                newAllocations[weekKey][userId].assignments[dayIndex] = null;
            } else if (allocationData.type === 'leave') {
                newAllocations[weekKey][userId].assignments[dayIndex] = allocationData;
            } else if (Object.values(allocationData).every(val => val === '' || val === 'Days' || val === null)) {
                 newAllocations[weekKey][userId].assignments[dayIndex] = null;
            } else {
                 newAllocations[weekKey][userId].assignments[dayIndex] = {...allocationData, type: 'project'};
            }
            
            return newAllocations;
        });
        setIsAllocationModalOpen(false);
    };
    
    const handleContextMenuAction = (action) => {
        const { cellData } = contextMenu;
        if (!cellData) return;

        if (action === 'goToProject') {
            const projectToView = initialProjects.find(p => p.project_number === cellData.assignment.projectNumber);
            if (projectToView) {
                onViewProject(projectToView);
            }
            setContextMenu({ visible: false });
            return;
        }
        
        if (action === 'copy' || action === 'cut') {
            setClipboard({ type: action, data: cellData.assignment, sourceCell: cellData });
        } else if (action === 'delete') {
            handleSaveAllocation(null, cellData);
        } else if (action === 'paste') {
            handleSaveAllocation(clipboard.data, cellData);
            if (clipboard.type === 'cut') {
                handleSaveAllocation(null, clipboard.sourceCell);
                setClipboard({ type: null, data: null, sourceCell: null });
            }
        }
        setContextMenu({ visible: false });
    };

    const handleUpdateVisibleUsers = (newUserIds) => {
        setVisibleUserIds(newUserIds);
        setIsManageUsersModalOpen(false);
    };
    
    const changeWeek = (offset) => {
        setCurrentWeekStart(prev => addDays(prev, offset * 7));
    };

    const handleRoleFilterChange = (role) => {
        setFilterRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const weekKey = formatDateForKey(currentWeekStart);
    const fiscalWeek = getFiscalWeek(currentWeekStart);
    const currentWeekAllocations = allocations[weekKey] || {};
    const selectedUser = selectedCell ? mockUsers[selectedCell.userId] : null;

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Resource Allocation</h1>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button variant="outline" onClick={() => setCurrentWeekStart(getWeekStartDate(new Date()))}>This Week</Button>
                    <Button variant="outline" onClick={() => changeWeek(-1)}><ChevronLeft size={16}/></Button>
                    <Button variant="outline" onClick={() => changeWeek(1)}><ChevronRight size={16}/></Button>
                    <Button onClick={() => setIsManageUsersModalOpen(true)}><Users size={16} className="mr-2"/>Show/Hide User</Button>
                </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                 <div className="flex items-center gap-2">
                    <div className="relative" ref={filterRef}>
                         <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}><Filter size={16} className="mr-2"/>Filter by Role</Button>
                         {isFilterOpen && (
                             <div className="absolute top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-4">
                                 <h4 className="font-semibold mb-2 text-sm">Roles</h4>
                                 <div className="space-y-2 max-h-60 overflow-y-auto">
                                     {teamRoles.map(role => (
                                         <label key={role} className="flex items-center space-x-2 text-sm">
                                             <input type="checkbox" checked={filterRoles.includes(role)} onChange={() => handleRoleFilterChange(role)} className="rounded text-orange-500 focus:ring-orange-500"/>
                                             <span>{role}</span>
                                         </label>
                                     ))}
                                 </div>
                                 <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setFilterRoles([])}>Clear</Button>
                             </div>
                         )}
                    </div>
                    <div className="flex items-center">
                        <label htmlFor="sort-by" className="text-sm mr-2">Sort by:</label>
                        <Select id="sort-by" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="!py-1.5">
                            <option value="alphabetical">Alphabetical</option>
                            <option value="role">Role</option>
                        </Select>
                    </div>
                </div>
                <h2 className="text-lg font-semibold text-center">Week {fiscalWeek}: {formatDateForDisplay(weekDates[0])} - {formatDateForDisplay(weekDates[6])}, {currentWeekStart.getFullYear()}</h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed' }}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3 w-[250px]">Staff Member</th>
                            {weekDates.map(date => (
                                <th key={date.toISOString()} className="px-4 py-3 text-center w-52">
                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    <br/>
                                    {formatDateForDisplay(date)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {displayedUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-4 py-2 font-medium">
                                    <div className="flex items-center min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">{user.avatar}</div>
                                        <div className="min-w-0">
                                            <p className="truncate">{user.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{user.teamRole}</p>
                                        </div>
                                    </div>
                                </td>
                                {weekDates.map((date, dayIndex) => {
                                    const assignment = currentWeekAllocations[user.id]?.assignments[dayIndex] || null;
                                    let cellContent;
                                    let cellColor = '';

                                    if (assignment) {
                                        if (assignment.type === 'leave') {
                                            cellColor = leaveColors[assignment.leaveType] || '';
                                            cellContent = (
                                                <div className={`p-1.5 rounded-md text-xs h-full flex items-center justify-center font-semibold ${cellColor}`}>
                                                    {assignment.leaveType}
                                                </div>
                                            );
                                        } else if (assignment.type === 'project') {
                                            cellColor = shiftColors[assignment.shift] || '';
                                            cellContent = (
                                                <div className={`p-1.5 rounded-md text-xs space-y-1 h-full flex flex-col overflow-hidden text-center ${cellColor}`}>
                                                    <p className="font-bold whitespace-nowrap overflow-ellipsis overflow-hidden">{assignment.projectNumber}</p>
                                                    <p className="flex-grow min-w-0 break-words" title={assignment.projectName}>{assignment.projectName}</p>
                                                    <p className="whitespace-nowrap overflow-ellipsis overflow-hidden" title={assignment.client}>{assignment.client}</p>
                                                    <p className="font-semibold">{assignment.task}</p>
                                                    <p className="font-semibold">{assignment.shift}</p>
                                                    <p className="text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-ellipsis overflow-hidden" title={assignment.comment}>{assignment.comment}</p>
                                                </div>
                                            );
                                        }
                                    }

                                    return (
                                        <td key={date.toISOString()} className="p-1 align-top h-40 relative group">
                                            <div 
                                                onClick={() => handleCellClick(user.id, date, dayIndex)}
                                                className={`w-full h-full text-left rounded-md ${isAdminOrManager ? 'cursor-pointer' : 'cursor-default'}`}
                                            >
                                                {cellContent}
                                            </div>
                                            {isAdminOrManager && (
                                                <button 
                                                    onClick={(e) => handleActionClick(e, user.id, dayIndex, assignment)}
                                                    className="absolute top-1 right-1 p-1 rounded-full bg-gray-300/20 dark:bg-gray-900/20 hover:bg-gray-400/50 dark:hover:bg-gray-700/50"
                                                >
                                                    <MoreVertical size={14} />
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {contextMenu.visible && (
                <ContextMenu 
                    x={contextMenu.x} 
                    y={contextMenu.y} 
                    cellData={contextMenu.cellData}
                    clipboard={clipboard}
                    onAction={handleContextMenuAction}
                    onClose={() => setContextMenu({ visible: false })}
                />
            )}
            {selectedCell && (
                <AllocationModal
                    isOpen={isAllocationModalOpen}
                    onClose={() => setIsAllocationModalOpen(false)}
                    onSave={handleSaveAllocation}
                    user={selectedUser}
                    date={selectedCell.date}
                    currentAssignment={currentWeekAllocations[selectedCell.userId]?.assignments[selectedCell.dayIndex] || null}
                />
            )}
            <ShowHideUsersModal
                isOpen={isManageUsersModalOpen}
                onClose={() => setIsManageUsersModalOpen(false)}
                onSave={handleUpdateVisibleUsers}
                allUsers={allUsers}
                visibleUserIds={visibleUserIds}
            />
        </div>
    );
};

const ShowHideUsersModal = ({ isOpen, onClose, onSave, allUsers, visibleUserIds }) => {
    const [selectedIds, setSelectedIds] = useState(visibleUserIds);

    useEffect(() => {
        setSelectedIds(visibleUserIds);
    }, [visibleUserIds, isOpen]);

    const handleToggleUser = (userId) => {
        setSelectedIds(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSave = () => {
        onSave(selectedIds);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Show/Hide Staff">
            <div className="p-6">
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select the staff members to display on the resource planner.</p>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-2 border rounded-md dark:border-gray-600">
                        {allUsers.map(user => (
                            <label key={user.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(user.id)}
                                    onChange={() => handleToggleUser(user.id)}
                                    className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500 border-gray-300 dark:border-gray-500"
                                />
                                <span>{user.name}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const AllocationModal = ({ isOpen, onClose, onSave, user, date, currentAssignment }) => {
    const [isManual, setIsManual] = useState(false);
    const [leaveType, setLeaveType] = useState('');
    const [formData, setFormData] = useState({
        projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Days', projectId: null
    });

    useEffect(() => {
        if (currentAssignment) {
            if (currentAssignment.type === 'leave') {
                setLeaveType(currentAssignment.leaveType);
                setFormData({ projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Days', projectId: null });
                setIsManual(false);
            } else {
                setLeaveType('');
                setFormData({
                    projectNumber: currentAssignment.projectNumber || '',
                    projectName: currentAssignment.projectName || '',
                    client: currentAssignment.client || '',
                    time: currentAssignment.time || '',
                    task: currentAssignment.task || '',
                    comment: currentAssignment.comment || '',
                    shift: currentAssignment.shift || 'Days',
                    projectId: currentAssignment.projectId || null
                });
                const isProjectInList = initialProjects.some(p => p.project_number === currentAssignment.projectNumber);
                setIsManual(!isProjectInList && !!currentAssignment.projectNumber);
            }
        } else {
            setFormData({ projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Days', projectId: null });
            setIsManual(false);
            setLeaveType('');
        }
    }, [currentAssignment, isOpen]);

    const handleProjectSelect = (e) => {
        const selectedProjectNumber = e.target.value;
        const project = initialProjects.find(p => p.project_number === selectedProjectNumber);
        if (project) {
            setFormData(prev => ({ ...prev, projectNumber: project.project_number, projectName: project.project_name, client: project.client, projectId: project.id }));
        } else {
            setFormData(prev => ({...prev, projectNumber: '', projectName: '', client: '', projectId: null}));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (leaveType) {
            onSave({ type: 'leave', leaveType: leaveType });
        } else {
            onSave(formData);
        }
    };

    const handleClear = () => {
        onSave({ type: 'project', projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Days', projectId: null });
    }
    
    const handleLeaveChange = (type) => {
        setLeaveType(prev => prev === type ? '' : type);
    };

    const projectFieldsDisabled = !!leaveType;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Allocate Resource">
             <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="space-y-4">
                    <div>
                        <p><span className="font-semibold">Staff:</span> {user?.name}</p>
                        <p><span className="font-semibold">Date:</span> {date?.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Annual Leave'} onChange={() => handleLeaveChange('Annual Leave')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Annual Leave</span></label>
                        <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Bank Holiday'} onChange={() => handleLeaveChange('Bank Holiday')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Bank Holiday</span></label>
                        <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Office (Haydock)'} onChange={() => handleLeaveChange('Office (Haydock)')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Office (Haydock)</span></label>
                        <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Office (Home)'} onChange={() => handleLeaveChange('Office (Home)')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Office (Home)</span></label>
                        <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Training'} onChange={() => handleLeaveChange('Training')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Training</span></label>
                        <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Stand Down'} onChange={() => handleLeaveChange('Stand Down')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Stand Down</span></label>
                    </div>

                    <fieldset disabled={projectFieldsDisabled} className="space-y-4 border-t pt-4 mt-4 border-gray-200 dark:border-gray-700 disabled:opacity-40">
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="manual-entry" checked={isManual} onChange={(e) => setIsManual(e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500"/>
                            <label htmlFor="manual-entry" className="text-sm">Enter Manually</label>
                        </div>

                        {!isManual ? (
                            <Select label="Project" value={formData.projectNumber} onChange={handleProjectSelect}>
                                <option value="">Select Project</option>
                                {initialProjects.map(p => (
                                    <option key={p.id} value={p.project_number}>{p.project_number} - {p.project_name}</option>
                                ))}
                            </Select>
                        ) : (
                            <Input label="Project Number" name="projectNumber" value={formData.projectNumber} onChange={handleInputChange} />
                        )}
                        
                        <Input label="Project Name" name="projectName" value={formData.projectName} onChange={handleInputChange} disabled={!isManual} />
                        <Input label="Client" name="client" value={formData.client} onChange={handleInputChange} disabled={!isManual} />
                        
                        <Select label="Shift" name="shift" value={formData.shift} onChange={handleInputChange}>
                            <option>Days</option>
                            <option>Evening</option>
                            <option>Nights</option>
                        </Select>

                        <Input label="Task" name="task" value={formData.task} onChange={handleInputChange} placeholder="e.g., Survey, Monitoring..."/>
                        
                        <Input label="Start/End Time" name="time" value={formData.time} onChange={handleInputChange} placeholder="e.g., 09:00 - 17:00"/>
                        <Input label="Comment" name="comment" value={formData.comment} onChange={handleInputChange} placeholder="Add a comment..."/>
                    </fieldset>
                </div>
            </div>
            <div className="flex-shrink-0 flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="danger" onClick={handleClear}>Clear Assignment</Button>
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </div>
        </Modal>
    );
};


const UserAdminPage = ({}) => {
    const [users, setUsers] = useState(Object.values(mockUsers));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const { user: currentUser } = useAuth();
    const privileges = userPrivileges[currentUser.privilege];
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

    const handleSaveUser = (userData) => {
        if (userToEdit) {
            setUsers(users.map(u => u.id === userToEdit.id ? { ...u, ...userData } : u));
        } else {
            const newUser = { 
                id: Date.now(), 
                ...userData, 
                avatar: userData.name.split(' ').map(n => n[0]).join(''),
                last_login: 'Never'
            };
            setUsers([...users, newUser]);
        }
        setIsModalOpen(false);
    };
    
    const openEditModal = (user) => {
        setUserToEdit(user);
        setIsModalOpen(true);
    };

    const openNewUserModal = () => {
        setUserToEdit(null);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        setUsers(users.filter(u => u.id !== userToDelete.id));
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
    };

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

    const filteredUsers = useMemo(() => users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.teamRole.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

    const sortedUsers = useMemo(() => {
        let sortableItems = [...filteredUsers];
        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredUsers, sortConfig]);

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">User Administration</h1>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    {privileges.canEditUserAdmin && (
                        <Button onClick={openNewUserModal}><PlusCircle size={16} className="mr-2"/>Add User</Button>
                    )}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            {['name', 'username', 'privilege', 'teamRole', 'last_login'].map(key => (
                                <th key={key} scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(key)}>
                                    <div className="flex items-center">{key.replace('_', ' ')}<span className="ml-2">{getSortIndicator(key)}</span></div>
                                </th>
                            ))}
                            {privileges.canEditUserAdmin && <th className="px-6 py-3">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map(user => (
                            <tr key={user.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                <td className="px-6 py-4 flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm mr-3">{user.avatar}</div>
                                    {user.name}
                                </td>
                                <td className="px-6 py-4">{user.username}</td>
                                <td className="px-6 py-4">{user.privilege}</td>
                                <td className="px-6 py-4">{user.teamRole}</td>
                                <td className="px-6 py-4">{user.last_login}</td>
                                {privileges.canEditUserAdmin && (
                                    <td className="px-6 py-4">
                                        <button onClick={() => openEditModal(user)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={16} /></button>
                                        <button onClick={() => handleDeleteClick(user)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={16} /></button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {privileges.canEditUserAdmin && (
                <>
                    <UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveUser} user={userToEdit} />
                    <ConfirmationModal 
                        isOpen={isDeleteModalOpen} 
                        onClose={() => setIsDeleteModalOpen(false)} 
                        onConfirm={confirmDelete} 
                        title="Confirm User Deletion"
                        message={`Are you sure you want to delete the user "${userToDelete?.name}"? This action cannot be undone.`}
                        confirmText="Delete"
                        confirmVariant="danger"
                    />
                </>
            )}
        </div>
    );
};

const UserModal = ({ isOpen, onClose, onSave, user }) => {
    const [formData, setFormData] = useState({ name: '', username: '', email: '', privilege: 'Subcontractor', teamRole: 'Site Team', password: '' });

    useEffect(() => {
        if (user) {
            setFormData({ name: user.name, username: user.username, email: user.email, privilege: user.privilege, teamRole: user.teamRole, password: user.password });
        } else {
            setFormData({ name: '', username: '', email: '', privilege: 'Subcontractor', teamRole: 'Site Team', password: '' });
        }
    }, [user, isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Add User'}>
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
                    <Input label="Username" name="username" value={formData.username} onChange={handleChange} required />
                    <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                    <Input label="Password" name="password" type="text" value={formData.password} onChange={handleChange} required />
                    <Select label="Privilege" name="privilege" value={formData.privilege} onChange={handleChange}>
                        {Object.keys(userPrivileges).map(p => <option key={p}>{p}</option>)}
                    </Select>
                    <Select label="Role" name="teamRole" value={formData.teamRole} onChange={handleChange}>
                        {teamRoles.map(role => <option key={role}>{role}</option>)}
                    </Select>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

const SettingsPage = () => {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('profile');

    const sections = [
        { id: 'profile', label: 'Profile', icon: Users },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Settings</h1>
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4">
                    <nav className="space-y-1">
                        {sections.map(section => (
                            <button 
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeSection === section.id ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <section.icon className="mr-3 h-5 w-5" />
                                <span>{section.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                        {activeSection === 'profile' && <ProfileSettings user={user} />}
                        {activeSection === 'security' && <SecuritySettings />}
                        {activeSection === 'appearance' && <AppearanceSettings />}
                        {activeSection === 'notifications' && <NotificationSettings />}
                    </div>
                </main>
            </div>
        </div>
    );
};

const ProfileSettings = ({ user }) => (
    <div>
        <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
        <form className="space-y-4">
            <Input label="Full Name" defaultValue={user.name} />
            <Input label="Email Address" type="email" defaultValue={user.email} />
            <Input label="Username" defaultValue={user.username} disabled />
            <div className="pt-2">
                <Button>Save Changes</Button>
            </div>
        </form>
    </div>
);

const SecuritySettings = () => (
    <div>
        <h2 className="text-xl font-semibold mb-4">Security</h2>
        <form className="space-y-4">
            <Input label="Current Password" type="password" />
            <Input label="New Password" type="password" />
            <Input label="Confirm New Password" type="password" />
            <div className="pt-2">
                <Button>Update Password</Button>
            </div>
        </form>
    </div>
);

const AppearanceSettings = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">Appearance</h2>
            <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600">
                <p>Theme</p>
                <div className="flex items-center gap-2">
                    <button onClick={theme === 'dark' ? toggleTheme : undefined} className={`px-3 py-1 rounded-md text-sm ${theme === 'light' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Light</button>
                    <button onClick={theme === 'light' ? toggleTheme : undefined} className={`px-3 py-1 rounded-md text-sm ${theme === 'dark' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Dark</button>
                </div>
            </div>
        </div>
    );
};

const NotificationSettings = () => (
    <div>
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span>Email Notifications</span>
                <Switch isChecked={true} onToggle={() => {}} />
            </div>
            <div className="flex items-center justify-between">
                <span>Push Notifications</span>
                <Switch isChecked={false} onToggle={() => {}} />
            </div>
            <div className="flex items-center justify-between">
                <span>Weekly Summary</span>
                <Switch isChecked={true} onToggle={() => {}} />
            </div>
        </div>
    </div>
);

const ProjectDetailPage = ({ project, onBack }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const { updateProject } = useProjects();
    const { user } = useAuth();
    const privileges = userPrivileges[user.privilege];

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'files', label: 'Files' },
    ];

    return (
        <div className="p-4 md:p-6">
            <button onClick={onBack} className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 mb-4">
                <ChevronLeft size={16} className="mr-1"/>
                Back to Projects
            </button>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{project.project_name}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{project.project_number} - {project.client}</p>
                </div>
                <StatusBadge status={project.status} />
            </div>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-3 px-1 border-b-2 text-sm font-medium ${activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}`}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'overview' && <ProjectOverview project={project} onUpdate={updateProject} canEdit={privileges.canEditProjects} />}
                {activeTab === 'tasks' && <ProjectTasks project={project} canEdit={privileges.canEditProjects} />}
                {activeTab === 'files' && <ProjectFiles files={mockProjectFiles} />}
            </div>
        </div>
    );
};

const ProjectOverview = ({ project, onUpdate, canEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(project);

    useEffect(() => {
        setFormData(project);
    }, [project]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdate(formData);
        setIsEditing(false);
    };

    return (
        <div className="space-y-6">
            {canEdit && (
                <div className="flex justify-end">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(project); }}>Cancel</Button>
                            <Button onClick={handleSave}>Save Changes</Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Details</Button>
                    )}
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-4">Project Description</h3>
                    {isEditing ? (
                        <textarea name="description" value={formData.description} onChange={handleInputChange} rows="5" className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"></textarea>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-4">Key Dates</h3>
                    <div className="text-sm space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Created</label>
                            {isEditing ? <Input type="date" name="date_created" value={formData.date_created} onChange={handleInputChange} /> : <p>{project.date_created}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Start Date</label>
                            {isEditing ? <Input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} /> : <p>{project.startDate}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Target Completion</label>
                            {isEditing ? <Input type="date" name="targetDate" value={formData.targetDate} onChange={handleInputChange} /> : <p>{project.targetDate}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectTasks = ({ project, canEdit }) => {
    const { updateProject } = useProjects();
    const [isEditing, setIsEditing] = useState(false);
    const [tasksText, setTasksText] = useState(project.tasksText || '');

    useEffect(() => {
        setTasksText(project.tasksText || '');
    }, [project.tasksText]);

    const handleSave = () => {
        updateProject({ ...project, tasksText });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTasksText(project.tasksText || '');
        setIsEditing(false);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                <h3 className="font-semibold">Tasks & Notes</h3>
                {canEdit && (
                    isEditing ? (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
                    )
                )}
            </div>
            <div className="p-4">
                {isEditing ? (
                    <textarea
                        value={tasksText}
                        onChange={(e) => setTasksText(e.target.value)}
                        rows="15"
                        className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Enter a list of tasks or any relevant information..."
                    />
                ) : (
                    <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">
                        {tasksText || 'No tasks or notes have been added yet.'}
                    </pre>
                )}
            </div>
        </div>
    );
};

const ProjectFiles = ({ files }) => {
    const getFileIcon = (type) => {
        switch (type) {
            case 'spreadsheet': return <FileSpreadsheet className="text-green-500" />;
            case 'pdf': return <FileText className="text-red-500" />;
            case 'cad': return <Presentation className="text-blue-500" />;
            default: return <File className="text-gray-500" />;
        }
    };
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                <h3 className="font-semibold">Project Files</h3>
                <Button><Upload size={16} className="mr-2"/>Upload File</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-2 text-left">Name</th>
                            <th className="px-4 py-2 text-left">Size</th>
                            <th className="px-4 py-2 text-left">Uploaded</th>
                            <th className="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map(file => (
                            <tr key={file.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                <td className="px-4 py-3 flex items-center">
                                    {getFileIcon(file.type)}
                                    <span className="ml-3 font-medium">{file.name}</span>
                                </td>
                                <td className="px-4 py-3">{file.size}</td>
                                <td className="px-4 py-3">{file.uploaded}</td>
                                <td className="px-4 py-3 text-center">
                                    <button className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><Download size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- NEW AUDIT TRAIL PAGE ---
const AuditTrailPage = () => {
    const [logs, setLogs] = useState(mockAuditTrail);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'descending' });
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [actionFilter, setActionFilter] = useState([]);
    const [userFilter, setUserFilter] = useState('');
    const filterRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredLogs = useMemo(() => logs.filter(log => {
        const user = log.userId ? mockUsers[log.userId] : { name: 'SYSTEM' };
        const matchesSearch = (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entity.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesAction = actionFilter.length === 0 || actionFilter.includes(log.action);
        const matchesUser = userFilter === '' || log.userId === parseInt(userFilter);
        return matchesSearch && matchesAction && matchesUser;
    }), [logs, searchTerm, actionFilter, userFilter]);

    const sortedLogs = useMemo(() => {
        let sortableItems = [...filteredLogs];
        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredLogs, sortConfig]);
    
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedLogs, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);

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

    const handleExport = (format) => {
        // In a real app, this would trigger a file download.
        console.log(`Exporting audit trail as ${format}...`);
        alert(`Exporting audit trail as ${format}... (See console for details)`);
    };

    const uniqueActions = [...new Set(logs.map(log => log.action))];
    const allUsers = Object.values(mockUsers);

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Audit Trail</h1>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                         <input type="text" placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <div className="relative" ref={filterRef}>
                        <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                            <Filter size={16} className="mr-2" /> Filter
                        </Button>
                         {isFilterOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-4 space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Action</h4>
                                    {uniqueActions.map(action => <label key={action} className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={actionFilter.includes(action)} onChange={() => setActionFilter(prev => prev.includes(action) ? prev.filter(i => i !== action) : [...prev, action])} className="rounded text-orange-500"/><span>{action}</span></label>)}
                                </div>
                                 <div>
                                    <h4 className="font-semibold mb-2">User</h4>
                                    <Select value={userFilter} onChange={e => setUserFilter(e.target.value)}>
                                        <option value="">All Users</option>
                                        {allUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                                    </Select>
                                </div>
                                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => { setActionFilter([]); setUserFilter(''); }}>Clear Filters</Button>
                            </div>
                        )}
                    </div>
                    <div className="relative group">
                        <Button variant="outline"><Download size={16} className="mr-2"/>Export</Button>
                        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-20">
                            <button onClick={() => handleExport('CSV')} className="w-full text-left px-4 py-2 text-sm">CSV</button>
                            <button onClick={() => handleExport('XLSX')} className="w-full text-left px-4 py-2 text-sm">XLSX</button>
                            <button onClick={() => handleExport('PDF')} className="w-full text-left px-4 py-2 text-sm">PDF</button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            {['timestamp', 'user', 'action', 'entity', 'details'].map(key => (
                                <th key={key} scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(key)}>
                                    <div className="flex items-center">{key}<span className="ml-2">{getSortIndicator(key)}</span></div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedLogs.map(log => {
                            const user = log.userId ? mockUsers[log.userId] : { name: 'SYSTEM', avatar: 'SYS' };
                            return (
                                <tr key={log.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                    <td className="px-6 py-4">{log.timestamp}</td>
                                    <td className="px-6 py-4 flex items-center">
                                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center font-bold text-xs mr-2">{user.avatar}</div>
                                        {user.name}
                                    </td>
                                    <td className="px-6 py-4"><StatusBadge status={log.action} /></td>
                                    <td className="px-6 py-4">{log.entity} {log.entityId && `#${log.entityId}`}</td>
                                    <td className="px-6 py-4 font-mono text-xs"><pre>{JSON.stringify(log.details, null, 2)}</pre></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={sortedLogs.length} />
        </div>
    );
};

// --- ANALYTICS PAGE & COMPONENTS ---
const AnalyticsPage = () => {
    const [activeTab, setActiveTab] = useState('Projects');

    const tabs = ['Projects', 'Resource', 'Delivery Tracker'];

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Analytics</h1>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-1 border-b-2 text-sm font-medium ${activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'Projects' && <ProjectsAnalytics />}
                {activeTab === 'Resource' && <ResourceAnalytics />}
                {activeTab === 'Delivery Tracker' && <DeliveryTrackerAnalytics />}
            </div>
        </div>
    );
};

const ProjectsAnalytics = () => {
    const { projects } = useProjects();
    const [filteredData, setFilteredData] = useState(projects);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const handleFilter = () => {
        let data = projects;
        if (dateRange.start) {
            data = data.filter(p => new Date(p.date_created) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            data = data.filter(p => new Date(p.date_created) <= new Date(dateRange.end));
        }
        setFilteredData(data);
    };

    const handleExport = (format) => {
        const headers = ["ID", "Project Number", "Project Name", "Client", "Date Created", "Status"];
        const data = filteredData.map(p => [p.id, p.project_number, p.project_name, p.client, p.date_created, p.status]);
        exportData(headers, data, `projects_analytics`, format);
    };
    
    const projectsByStatus = useMemo(() => {
        return filteredData.reduce((acc, project) => {
            acc[project.status] = (acc[project.status] || 0) + 1;
            return acc;
        }, {});
    }, [filteredData]);

    const projectsByClient = useMemo(() => {
        return filteredData.reduce((acc, project) => {
            acc[project.client] = (acc[project.client] || 0) + 1;
            return acc;
        }, {});
    }, [filteredData]);

    const pieDataStatus = Object.entries(projectsByStatus).map(([name, value]) => ({ name, value }));
    const barDataClient = Object.entries(projectsByClient).map(([name, value]) => ({ name, projects: value }));

    return (
        <div className="space-y-6">
            <AnalyticsToolbar 
                dateRange={dateRange} 
                setDateRange={setDateRange} 
                onFilter={handleFilter} 
                onExport={handleExport}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalyticsCard title="Projects by Status">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={pieDataStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {pieDataStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </AnalyticsCard>
                <AnalyticsCard title="Projects by Client">
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barDataClient}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="projects" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </AnalyticsCard>
            </div>
        </div>
    );
};

const ResourceAnalytics = () => {
    // This is a placeholder. In a real app, you'd process mockResourceAllocations
    const handleExport = (format) => {
        alert(`Exporting Resource Analytics as ${format} is not implemented yet.`);
    };
    return (
        <div className="space-y-6">
             <AnalyticsToolbar onExport={handleExport} onFilter={() => {}} dateRange={{start:'', end: ''}} setDateRange={() => {}} />
            <AnalyticsCard title="Resource Utilization (Placeholder)">
                <p>Resource analytics charts and data would go here.</p>
            </AnalyticsCard>
        </div>
    );
};

const DeliveryTrackerAnalytics = () => {
    // This is a placeholder. In a real app, you'd process initialJobs
    const handleExport = (format) => {
        alert(`Exporting Delivery Tracker Analytics as ${format} is not implemented yet.`);
    };
    return (
        <div className="space-y-6">
            <AnalyticsToolbar onExport={handleExport} onFilter={() => {}} dateRange={{start:'', end: ''}} setDateRange={() => {}} />
            <AnalyticsCard title="Delivery Performance (Placeholder)">
                <p>Delivery tracker analytics charts and data would go here.</p>
            </AnalyticsCard>
        </div>
    );
};

const AnalyticsToolbar = ({ dateRange, setDateRange, onFilter, onExport }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <Input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} />
            <span>to</span>
            <Input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} />
            <Button onClick={onFilter}>Apply Filter</Button>
        </div>
        <div className="relative group">
            <Button variant="outline"><Download size={16} className="mr-2"/>Export Data</Button>
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-20">
                <button onClick={() => onExport('csv')} className="w-full text-left px-4 py-2 text-sm">as CSV</button>
                <button onClick={() => onExport('txt')} className="w-full text-left px-4 py-2 text-sm">as TXT</button>
            </div>
        </div>
    </div>
);

const AnalyticsCard = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="p-4 text-lg font-semibold border-b border-gray-200 dark:border-gray-700">{title}</h3>
        <div className="p-4">{children}</div>
    </div>
);

const exportData = (headers, data, filename, format) => {
    let content = '';
    if (format === 'csv') {
        content += headers.join(',') + '\n';
        data.forEach(row => {
            content += row.map(item => `"${item}"`).join(',') + '\n';
        });
    } else { // txt
        content += headers.join('\t') + '\n';
        data.forEach(row => {
            content += row.join('\t') + '\n';
        });
    }

    const blob = new Blob([content], { type: `text/${format}` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.${format}`;
    link.click();
    URL.revokeObjectURL(link.href);
};


// --- GENERIC / REUSABLE COMPONENTS ---
const StatusBadge = ({ status }) => {
    const statusClasses = {
        'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'Planning': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'On Hold': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'Archived': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        'Site Not Started': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'Site Work Completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'Delivered': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'Postponed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
        'Revisit Required': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        // Audit Trail Actions
        'LOGIN': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'LOGOUT': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'CREATE': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'UPDATE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'DELETE': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        'VIEW': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
        'SYSTEM_EVENT': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        // Task Statuses
        'To Do': 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusClasses[status] || statusClasses['On Hold']}`}>{status}</span>;
};

const Pagination = ({ currentPage, setCurrentPage, totalPages, itemsPerPage, setItemsPerPage, totalItems }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex flex-col md:flex-row justify-between items-center mt-4 text-sm text-gray-700 dark:text-gray-400">
            <div className="flex items-center mb-2 md:mb-0">
                <span>Rows per page:</span>
                <Select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className="ml-2 !py-1 !text-sm">
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                </Select>
                <span className="ml-4">
                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                </span>
            </div>
            <div className="flex items-center space-x-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={14} className="mr-[-4px]"/><ChevronLeft size={14}/></button>
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={16}/></button>
                <span className="px-2">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={16}/></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-md disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={14} className="ml-[-4px]"/><ChevronRight size={14}/></button>
            </div>
        </div>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-700 flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
                    </div>
                    {children}
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

const ProjectModal = ({ isOpen, onClose, onSave, project }) => {
    const [formData, setFormData] = useState({ project_name: '', project_number: '', client: '', status: 'Planning' });

    useEffect(() => {
        if (project) {
            setFormData({ project_name: project.project_name, project_number: project.project_number, client: project.client, status: project.status });
        } else {
            setFormData({ project_name: '', project_number: '', client: '', status: 'Planning' });
        }
    }, [project, isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={project ? 'Edit Project' : 'New Project'}>
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Project Name" name="project_name" value={formData.project_name} onChange={handleChange} required />
                    <Input label="Project Number" name="project_number" value={formData.project_number} onChange={handleChange} required />
                    <Input label="Client" name="client" value={formData.client} onChange={handleChange} required />
                    <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                        <option>Planning</option>
                        <option>In Progress</option>
                        <option>On Hold</option>
                        <option>Completed</option>
                    </Select>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Project</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmVariant = "primary" }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="p-6">
            <p className="text-gray-600 dark:text-gray-300">{message}</p>
            <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant={confirmVariant} onClick={onConfirm}>{confirmText}</Button>
            </div>
        </div>
    </Modal>
);

const Input = ({ label, ...props }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
        <input {...props} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
);

const Select = ({ label, children, className, ...props }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
        <select {...props} className={`w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${className}`}>
            {children}
        </select>
    </div>
);

const Button = ({ children, variant = 'primary', size = 'md', ...props }) => {
    const baseClasses = "font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200 flex items-center justify-center";
    const variants = {
        primary: 'text-white bg-orange-500 hover:bg-orange-600 focus:ring-orange-500',
        outline: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-orange-500',
        danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
    };
     const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
    };
    return <button {...props} className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}>{children}</button>;
};

const Switch = ({ isChecked, onToggle, id }) => (
    <button
        id={id}
        type="button"
        className={`${isChecked ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500`}
        onClick={onToggle}
    >
        <span className={`${isChecked ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
    </button>
);

const getWeekStartDate = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
};

const getFiscalWeek = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const formatDateForKey = (date) => {
    return date.toISOString().split('T')[0];
};


// --- PROVIDERS & MAIN APP ---
const AuthProvider = ({ children }) => {
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
    const [projects, setProjects] = useState(initialProjects);

    const addProject = (projectData) => {
        const newProject = { 
            id: Date.now(), 
            ...projectData, 
            date_created: new Date().toISOString().split('T')[0],
            tasksText: ''
        };
        setProjects(prev => [newProject, ...prev]);
    };

    const updateProject = (updatedProject) => {
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    };

    const deleteProject = (projectId) => {
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
