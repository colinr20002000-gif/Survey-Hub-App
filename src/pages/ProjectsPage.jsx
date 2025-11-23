import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Filter, PlusCircle, Edit, Trash2, MoreVertical, Copy, Archive, ArchiveRestore, WifiOff } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { usePermissions } from '../hooks/usePermissions';
import { Select, Button, Switch, Pagination, ConfirmationModal } from '../components/ui';
import ProjectModal from '../components/modals/ProjectModal';
import { useDebouncedValue } from '../utils/debounce';

const ProjectsPage = ({ onViewProject }) => {
    const { projects, addProject, updateProject, deleteProject, loading, error, isOnline, lastSync } = useProjects();
    const { canCreateProjects, canEditProjects, canDeleteProjects, can } = usePermissions();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [sortConfig, setSortConfig] = useState({ key: 'project_number', direction: 'descending' });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToManage, setProjectToManage] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [clientFilter, setClientFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

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

    // IMPORTANT: All hooks must be called before any conditional returns (React Rules of Hooks)
    const filteredProjects = useMemo(() => {
        if (!projects) return [];
        return projects.filter(p => {
            const matchesSearch = p.project_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                p.project_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                p.client.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            const matchesArchive = showArchived ? p.archived : !p.archived;
            const matchesClient = clientFilter === '' || p.client === clientFilter;
            const matchesYear = yearFilter === '' || p.year === yearFilter;
            return matchesSearch && matchesArchive && matchesClient && matchesYear;
        });
    }, [projects, debouncedSearchTerm, showArchived, clientFilter, yearFilter]);

    const sortedProjects = useMemo(() => {
        let sortableItems = [...filteredProjects];
        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredProjects, sortConfig]);

    // Calculate pagination - compute total number of pages
    const totalPages = useMemo(() => {
        if (!sortedProjects || sortedProjects.length === 0 || !itemsPerPage || itemsPerPage <= 0) return 0;
        return Math.ceil(sortedProjects.length / itemsPerPage);
    }, [sortedProjects, itemsPerPage]) || 0;

    const paginatedProjects = useMemo(() => {
        if (!sortedProjects || sortedProjects.length === 0) return [];
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sortedProjects.slice(startIndex, endIndex);
    }, [sortedProjects, currentPage, itemsPerPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, showArchived, clientFilter, yearFilter]);

    // Calculate unique values for filters
    const uniqueClients = useMemo(() => {
        if (!projects) return [];
        return [...new Set(projects.map(p => p.client))].sort((a, b) => a.localeCompare(b));
    }, [projects]);

    const uniqueYears = useMemo(() => {
        if (!projects) return [];
        return [...new Set(projects.map(p => p.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
    }, [projects]);

    // Now safe to do conditional returns after all hooks are called
    if (loading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading Projects...</div>;
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 className="font-bold text-xl mb-2">Error Loading Projects</h2>
                <p>There was a problem fetching data from the database.</p>
                <p className="mt-4 font-bold">Error Message:</p>
                <pre className="font-mono bg-red-50 p-2 rounded mt-1 text-sm">{error}</pre>
                <p className="mt-4">
                    Please check the browser's developer console (F12) for more details. This could be due to an RLS policy, an incorrect API key in Vercel, or a network issue.
                </p>
            </div>
        );
    }

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
        updateProject({ ...projectToManage, archived: true });
        setIsArchiveModalOpen(false);
        setProjectToManage(null);
    };

    const handleUnarchiveProject = (projectId) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            updateProject({ ...project, archived: false });
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

    const clearFilters = () => {
        setClientFilter('');
        setYearFilter('');
    };

    return (
        <div className="p-4 md:p-6">
            {/* Offline indicator */}
            {!isOnline && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4 rounded">
                    <div className="flex items-center">
                        <WifiOff className="h-5 w-5 text-yellow-700 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-semibold text-yellow-700">Viewing cached data (offline mode)</p>
                            <p className="text-sm text-yellow-600 mt-1">
                                {lastSync
                                    ? `Last updated: ${new Date(lastSync).toLocaleString()}`
                                    : 'Connect to internet to create or edit projects'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

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
                                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                        <h4 className="font-semibold mb-2">Client</h4>
                                        <Select value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
                                            <option value="">All Clients</option>
                                            {uniqueClients.map(client => <option key={client}>{client}</option>)}
                                        </Select>
                                    </div>
                                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                        <h4 className="font-semibold mb-2">Year</h4>
                                        <Select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                                            <option value="">All Years</option>
                                            {uniqueYears.map(year => <option key={year}>{year}</option>)}
                                        </Select>
                                    </div>
                                    <div className="p-2 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                                        <Button variant="outline" onClick={clearFilters}>Clear</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {canCreateProjects && (
                            <button
                                onClick={() => { setProjectToManage(null); setIsEditModalOpen(true); }}
                                disabled={!isOnline}
                                className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-sm font-medium text-white rounded-lg ${
                                    !isOnline
                                        ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                        : 'bg-orange-500 hover:bg-orange-600'
                                }`}
                                title={!isOnline ? 'Connect to internet to create projects' : ''}
                            >
                                <PlusCircle size={16} className="mr-2" /> New Project
                                {!isOnline && ' 🔒'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
             {can('SHOW_ARCHIVED_PROJECTS_TOGGLE') && (
                 <div className="flex items-center mb-4">
                     <label htmlFor="show-archived" className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Show Archived</label>
                     <Switch id="show-archived" isChecked={showArchived} onToggle={() => setShowArchived(!showArchived)} />
                 </div>
             )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto w-full">
                <table className="text-sm text-left text-gray-500 dark:text-gray-400 min-w-full">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('project_number')}>
                                <div className="flex items-center">
                                    project number
                                    <span className="ml-2">{getSortIndicator('project_number')}</span>
                                </div>
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('project_name')}>
                                <div className="flex items-center">
                                    project name
                                    <span className="ml-2">{getSortIndicator('project_name')}</span>
                                </div>
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('client')}>
                                <div className="flex items-center">
                                    client
                                    <span className="ml-2">{getSortIndicator('client')}</span>
                                </div>
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('year')}>
                                <div className="flex items-center">
                                    year
                                    <span className="ml-2">{getSortIndicator('year')}</span>
                                </div>
                            </th>
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
                                <td className="px-6 py-4">{project.year || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-1">
                                        {canEditProjects && (
                                            <button
                                                onClick={() => { setProjectToManage(project); setIsEditModalOpen(true); }}
                                                disabled={!isOnline}
                                                className={`p-1.5 rounded-md ${
                                                    !isOnline
                                                        ? 'text-gray-300 cursor-not-allowed opacity-50'
                                                        : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                                title={!isOnline ? 'Connect to internet to edit' : ''}
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                        {canDeleteProjects && (
                                            <button
                                                onClick={() => handleDeleteClick(project)}
                                                disabled={!isOnline}
                                                className={`p-1.5 rounded-md ${
                                                    !isOnline
                                                        ? 'text-gray-300 cursor-not-allowed opacity-50'
                                                        : 'text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                                title={!isOnline ? 'Connect to internet to delete' : ''}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        {(canEditProjects || canDeleteProjects) && (
                                            <div className="relative" ref={openDropdownId === project.id ? dropdownRef : null}>
                                                <button
                                                    onClick={() => setOpenDropdownId(openDropdownId === project.id ? null : project.id)}
                                                    disabled={!isOnline}
                                                    className={`p-1.5 rounded-md ${
                                                        !isOnline
                                                            ? 'text-gray-300 cursor-not-allowed opacity-50'
                                                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                                    title={!isOnline ? 'Actions available when online' : ''}
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {openDropdownId === project.id && isOnline && (
                                                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                                                        {canCreateProjects && (
                                                            <button onClick={() => handleDuplicateProject(project)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={14} className="mr-2"/>Duplicate</button>
                                                        )}
                                                        {canEditProjects && (
                                                            project.archived ? (
                                                                <button onClick={() => handleUnarchiveProject(project.id)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ArchiveRestore size={14} className="mr-2"/>Unarchive</button>
                                                            ) : (
                                                                <button onClick={() => handleArchiveClick(project)} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Archive size={14} className="mr-2"/>Archive</button>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-4">
                <Pagination
                    currentPage={currentPage || 1}
                    setCurrentPage={setCurrentPage}
                    totalPages={totalPages || 0}
                    totalItems={sortedProjects?.length || 0}
                    itemsPerPage={itemsPerPage || 25}
                    setItemsPerPage={setItemsPerPage}
                />
            </div>

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

export default ProjectsPage;
