/**
 * Mock Data and Application Constants
 */


// User privilege configurations
export const USER_PRIVILEGES = {
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

// Available job statuses
export const JOB_STATUSES = [
  'Site Not Started',
  'Site Work Completed', 
  'Delivered',
  'Postponed',
  'Cancelled',
  'On Hold',
  'Revisit Required'
];

// Available team roles
export const TEAM_ROLES = [
  'Site Team',
  'Project Team', 
  'Delivery Team',
  'Design Team',
  'Office Staff',
  'Subcontractor'
];

// Initial project data
export const INITIAL_PROJECTS = [
  { id: 1, project_number: '23001', project_name: 'West Coast Main Line - Track Renewal', client: 'Network Rail', date_created: '2023-10-26', status: 'In Progress', team: ['BC', 'CD'], description: 'Comprehensive topographical survey and track renewal assessment for a 20-mile section.', startDate: '2023-11-01', targetDate: '2024-12-31', tasksText: '- Finalize Survey Report\n- Produce Track Alignment Drawings' },
  { id: 2, project_number: '23045', project_name: 'HS2 Phase 2a - Topographical Survey', client: 'HS2 Ltd', date_created: '2023-09-15', status: 'Completed', team: ['BC', 'DE'], description: 'Topographical survey for the HS2 Phase 2a route.', startDate: '2023-10-01', targetDate: '2024-06-30', tasksText: 'All tasks completed. Final data delivered to client.' },
  { id: 3, project_number: '24012', project_name: 'Crossrail - Asset Verification', client: 'Transport for London', date_created: '2024-01-20', status: 'Planning', team: ['BC', 'CD', 'DE'], description: 'Verification of assets along the Crossrail line.', startDate: '2024-02-01', targetDate: '2025-01-31', tasksText: 'Awaiting final instruction from TfL before commencing site visits.' },
  { id: 4, project_number: '24005', project_name: 'Great Western Electrification - OLE Survey', client: 'Network Rail', date_created: '2024-02-10', status: 'In Progress', team: ['BC', 'CD'], description: 'Overhead Line Equipment survey for the GWEP project.', startDate: '2024-03-01', targetDate: '2024-11-30', tasksText: '' },
  { id: 5, project_number: '24002', project_name: 'Docklands Light Railway - Tunnel Inspection', client: 'TfL', date_created: '2024-03-05', status: 'On Hold', team: ['BC'], description: 'Detailed inspection of DLR tunnels.', startDate: '2024-04-01', targetDate: '2024-09-30', tasksText: 'Project on hold due to access restrictions.' },
  { id: 6, project_number: '24018', project_name: 'Midland Main Line - Embankment Stability', client: 'Network Rail', date_created: '2024-04-12', status: 'In Progress', team: ['BC', 'CD', 'DE'], description: 'Assessment of embankment stability on the MML.', startDate: '2024-05-01', targetDate: '2025-03-31', tasksText: '' },
  { id: 7, project_number: '24091', project_name: 'Old Oak Common - Site Survey', client: 'HS2 Ltd', date_created: '2024-05-21', status: 'Planning', team: ['BC', 'CD'], description: 'Initial site survey for the new Old Oak Common station.', startDate: '2024-06-01', targetDate: '2024-10-31', tasksText: '' },
];

// Mock assigned tasks
export const MOCK_ASSIGNED_TASKS = [
  { id: 1, text: 'Finalize NR-23-001 survey report', completed: false, project: 'NR-23-001', assignedTo: [3] },
  { id: 2, text: 'Schedule site visit for TFL-24-012', completed: false, project: 'TFL-24-012', assignedTo: [2, 4] },
  { id: 3, text: 'Process point cloud data for HS2-24-091', completed: true, project: 'HS2-24-091', assignedTo: [3] },
  { id: 4, text: 'Review safety briefing for DLR-24-002', completed: false, project: 'DLR-24-002', assignedTo: [2, 3, 4] },
];

// Mock announcements
export const MOCK_ANNOUNCEMENTS = [
  { id: 1, title: 'System Maintenance Scheduled', content: 'Server maintenance on Sunday 3AM-6AM GMT. System will be temporarily unavailable.', date: '2024-08-24', priority: 'high' },
  { id: 2, title: 'New Safety Protocols', content: 'Updated site safety requirements now in effect. Please review the updated documentation.', date: '2024-08-23', priority: 'medium' },
  { id: 3, title: 'Team Meeting Next Week', content: 'All project managers meeting scheduled for Thursday 2PM in Conference Room A.', date: '2024-08-22', priority: 'low' },
];

// Mock project files
export const MOCK_PROJECT_FILES = [
  { id: 1, name: 'Survey_Report_23001.pdf', size: '2.3 MB', type: 'pdf', uploadDate: '2024-08-20' },
  { id: 2, name: 'Track_Alignment_Drawings.dwg', size: '15.7 MB', type: 'dwg', uploadDate: '2024-08-18' },
  { id: 3, name: 'Site_Photos.zip', size: '89.2 MB', type: 'zip', uploadDate: '2024-08-15' },
];

// Mock notifications
export const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'task', message: 'New task assigned: Complete survey report for NR-23-001', time: '10 minutes ago', read: false },
  { id: 2, type: 'system', message: 'System maintenance completed successfully', time: '2 hours ago', read: true },
  { id: 3, type: 'project', message: 'Project TFL-24-012 status updated to "In Progress"', time: '1 day ago', read: true },
];