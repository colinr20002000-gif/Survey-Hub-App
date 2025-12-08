import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Modal, Input, Select, Button, Combobox } from '../ui';

const ProjectModal = ({ isOpen, onClose, onSave, project }) => {
    const [formData, setFormData] = useState({ project_name: '', project_number: '', client: '', year: '' });
    const [yearOptions, setYearOptions] = useState([]);
    const [clientOptions, setClientOptions] = useState([]);

    useEffect(() => {
        if (project) {
            setFormData({ project_name: project.project_name, project_number: project.project_number, client: project.client, year: project.year || '' });
        } else {
            setFormData({ project_name: '', project_number: '', client: '', year: '' });
        }
    }, [project, isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchDropdownOptions();
        }
    }, [isOpen]);

    const fetchDropdownOptions = async () => {
        try {
            // Fetch Year Options
            const { data: yearCategory } = await supabase
                .from('dropdown_categories')
                .select('id')
                .ilike('name', 'year')
                .single();

            if (yearCategory) {
                const { data: items } = await supabase
                    .from('dropdown_items')
                    .select('id, display_text, sort_order')
                    .eq('category_id', yearCategory.id)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });
                setYearOptions(items || []);
            }

            // Fetch Client Options
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
        } catch (error) {
            console.error('Error fetching dropdown options:', error);
        }
    };

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
                    <Combobox 
                        label="Client" 
                        name="client" 
                        value={formData.client} 
                        onChange={handleChange} 
                        options={clientOptions}
                        required 
                    />
                    <Select label="Year" name="year" value={formData.year} onChange={handleChange} required>
                        <option value="">Select Year</option>
                        {yearOptions.map(option => (
                            <option key={option.id} value={option.display_text}>{option.display_text}</option>
                        ))}
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

export default ProjectModal;
