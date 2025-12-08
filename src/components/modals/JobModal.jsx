import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useProjects } from '../../contexts/ProjectContext';
import { Modal, Input, Select, Button, Combobox } from '../ui';

const JobModal = ({ isOpen, onClose, onSave, job }) => {
    const { projects, addProject } = useProjects();
    const [formData, setFormData] = useState({
        projectName: '', projectNumber: '', itemName: '', projectManager: '', client: '',
        processingHours: '', checkingHours: '', siteStartDate: '', siteCompletionDate: '',
        plannedDeliveryDate: '', actualDeliveryDate: '', discipline: '', comments: '', status: 'Site Not Started'
    });
    const [clientOptions, setClientOptions] = useState([]);
    
    // Project Selection State
    // const [projects, setProjects] = useState([]); // Removed local state
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
    const [newProjectData, setNewProjectData] = useState({ project_name: '', project_number: '', client: '', year: '' });
    const [yearOptions, setYearOptions] = useState([]);
    const [disciplineOptions, setDisciplineOptions] = useState([]);
    const [deliveryStatusOptions, setDeliveryStatusOptions] = useState(["Site Not Started", "Site Work Completed", "Delivered", "Postponed", "Cancelled", "On Hold", "Revisit Required"]);
    const [isManualProject, setIsManualProject] = useState(false);
    const projectDropdownRef = useRef(null);

    // Fetch options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                // Fetch Clients
                const { data: clientCategory } = await supabase
                    .from('dropdown_categories')
                    .select('id')
                    .ilike('name', 'Clients')
                    .single();

                if (clientCategory) {
                    const { data: items } = await supabase
                        .from('dropdown_items')
                        .select('display_text')
                        .eq('category_id', clientCategory.id)
                        .eq('is_active', true)
                        .order('sort_order');
                    
                    if (items) {
                        setClientOptions(items.map(i => i.display_text));
                    }
                }

                // Fetch Years for new project creation
                const { data: yearCategory } = await supabase
                    .from('dropdown_categories')
                    .select('id')
                    .ilike('name', 'year')
                    .single();

                if (yearCategory) {
                    const { data: items } = await supabase
                        .from('dropdown_items')
                        .select('display_text')
                        .eq('category_id', yearCategory.id)
                        .eq('is_active', true)
                        .order('sort_order');
                    setYearOptions(items || []);
                }

                // Fetch Job Types (Disciplines)
                // Try searching for "Job Type" or similar variants
                const { data: jobTypeCategories } = await supabase
                    .from('dropdown_categories')
                    .select('id, name')
                    .or('name.ilike.job type,name.ilike.job_type,name.ilike.jobtype')
                    .limit(1);

                if (jobTypeCategories && jobTypeCategories.length > 0) {
                    const { data: items } = await supabase
                        .from('dropdown_items')
                        .select('display_text')
                        .eq('category_id', jobTypeCategories[0].id)
                        .eq('is_active', true)
                        .order('sort_order');
                    
                    if (items) {
                        setDisciplineOptions(items.map(i => i.display_text));
                    }
                } else {
                    console.warn('Job Type category not found in dropdowns');
                }

                // Fetch Delivery Status Options
                const { data: deliveryStatusCategory } = await supabase
                    .from('dropdown_categories')
                    .select('id')
                    .or('name.ilike.delivery status,name.ilike.deliverystatus,name.ilike.delivery_status')
                    .limit(1);

                if (deliveryStatusCategory && deliveryStatusCategory.length > 0) {
                    const { data: items } = await supabase
                        .from('dropdown_items')
                        .select('display_text')
                        .eq('category_id', deliveryStatusCategory[0].id)
                        .eq('is_active', true)
                        .order('sort_order');

                    if (items) {
                        setDeliveryStatusOptions(items.map(i => i.display_text));
                    }
                } else {
                    console.warn('Delivery Status category not found in dropdowns');
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        if (isOpen) {
            fetchOptions();
        }
    }, [isOpen]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
                setIsProjectDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const handleProjectSelect = (project) => {
        setFormData(prev => ({
            ...prev,
            projectNumber: project.project_number,
            projectName: project.project_name,
            client: project.client || ''
        }));
        setIsProjectDropdownOpen(false);
        setProjectSearch('');
    };

    const handleNewProjectInputChange = (e) => {
        setNewProjectData({ ...newProjectData, [e.target.name]: e.target.value });
    };

    const handleCreateNewProject = async () => {
        try {
            if (!newProjectData.project_name || !newProjectData.project_number || !newProjectData.client) {
                alert('Please fill in all required fields');
                return;
            }

            // We use direct supabase call here to get the data back immediately for selection
            const { data, error } = await supabase
                .from('projects')
                .insert([newProjectData])
                .select()
                .single();

            if (error) throw error;

            // Context subscription will update the 'projects' list automatically
            // But we can select this project immediately
            handleProjectSelect(data);
            setIsCreatingNewProject(false);
            setNewProjectData({ project_name: '', project_number: '', client: '', year: '' });
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Error creating project');
        }
    };

    const filteredProjects = projects.filter(p => 
        p.project_number.toLowerCase().includes(projectSearch.toLowerCase()) || 
        p.project_name.toLowerCase().includes(projectSearch.toLowerCase())
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={job ? 'Edit Job' : 'Add Job'}>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <input 
                                type="checkbox" 
                                id="manual-project" 
                                checked={isManualProject} 
                                onChange={(e) => setIsManualProject(e.target.checked)} 
                                className="rounded text-orange-500 focus:ring-orange-500"
                            />
                            <label htmlFor="manual-project" className="text-sm text-gray-700 dark:text-gray-300">Enter Project Details Manually</label>
                        </div>

                        {!isManualProject ? (
                            <div className="relative" ref={projectDropdownRef}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Project</label>
                                <button
                                    type="button"
                                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    <span className={formData.projectNumber ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
                                        {formData.projectNumber ? `${formData.projectNumber} - ${formData.projectName}` : 'Select Project'}
                                    </span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isProjectDropdownOpen && (
                                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 flex flex-col">
                                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                            <h3 className="text-sm font-semibold mb-2">
                                                {isCreatingNewProject ? 'Create New Project' : 'Select Project'}
                                            </h3>
                                            {!isCreatingNewProject && (
                                                <input
                                                    type="text"
                                                    placeholder="Search..."
                                                    value={projectSearch}
                                                    onChange={(e) => setProjectSearch(e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    autoFocus
                                                />
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto p-3">
                                            {isCreatingNewProject ? (
                                                <div className="space-y-3">
                                                    <Input label="Project Name" name="project_name" value={newProjectData.project_name} onChange={handleNewProjectInputChange} required />
                                                    <Input label="Project Number" name="project_number" value={newProjectData.project_number} onChange={handleNewProjectInputChange} required />
                                                    <Combobox label="Client" name="client" value={newProjectData.client} onChange={handleNewProjectInputChange} options={clientOptions} required />
                                                    <Select label="Year" name="year" value={newProjectData.year} onChange={handleNewProjectInputChange} required>
                                                        <option value="">Select Year</option>
                                                        {yearOptions.map(option => (
                                                            <option key={option.display_text} value={option.display_text}>{option.display_text}</option>
                                                        ))}
                                                    </Select>
                                                </div>
                                            ) : (
                                                <>
                                                    {filteredProjects.length === 0 ? (
                                                        <div className="text-center text-sm text-gray-500 py-4">No projects found</div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {filteredProjects.map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    onClick={() => handleProjectSelect(p)}
                                                                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                                                                >
                                                                    {p.project_number} - {p.project_name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                                            {isCreatingNewProject ? (
                                                <div className="flex space-x-2">
                                                    <Button size="sm" variant="outline" onClick={() => setIsCreatingNewProject(false)} className="flex-1">Back</Button>
                                                    <Button size="sm" onClick={handleCreateNewProject} className="flex-1">Create</Button>
                                                </div>
                                            ) : (
                                                <Button size="sm" variant="outline" onClick={() => setIsCreatingNewProject(true)} className="w-full">
                                                    <span className="mr-2">+</span> Create New Project
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <Input label="Project Name" name="projectName" value={formData.projectName} onChange={handleChange} required disabled={!isManualProject} />
                    <Input label="Project Number" name="projectNumber" value={formData.projectNumber} onChange={handleChange} required disabled={!isManualProject} />
                    <Input label="Item Name" name="itemName" value={formData.itemName} onChange={handleChange} required />
                    <Input label="Project Manager" name="projectManager" value={formData.projectManager} onChange={handleChange} required />
                    <Combobox 
                        label="Client" 
                        name="client" 
                        value={formData.client} 
                        onChange={handleChange} 
                        options={clientOptions}
                        required 
                        disabled={!isManualProject}
                    />
                    <Input label="Processing Hours" name="processingHours" type="number" value={formData.processingHours} onChange={handleChange} required />
                    <Input label="Checking Hours" name="checkingHours" type="number" value={formData.checkingHours} onChange={handleChange} required />
                    <Input label="Site Start Date" name="siteStartDate" type="date" value={formData.siteStartDate} onChange={handleChange} />
                    <Input label="Site Completion Date" name="siteCompletionDate" type="date" value={formData.siteCompletionDate} onChange={handleChange} />
                    <Input label="Planned Delivery Date" name="plannedDeliveryDate" type="date" value={formData.plannedDeliveryDate} onChange={handleChange} />
                    <Input label="Actual Delivery Date" name="actualDeliveryDate" type="date" value={formData.actualDeliveryDate} onChange={handleChange} />
                    <Combobox 
                        label="Discipline" 
                        name="discipline" 
                        value={formData.discipline} 
                        onChange={handleChange} 
                        options={disciplineOptions}
                        required 
                    />
                    <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                        {deliveryStatusOptions.map(status => <option key={status}>{status}</option>)}
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

export default JobModal;
