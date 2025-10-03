import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Modal, Input, Select, Button } from '../ui';

const ProjectModal = ({ isOpen, onClose, onSave, project }) => {
    const [formData, setFormData] = useState({ project_name: '', project_number: '', client: '', year: '' });
    const [yearOptions, setYearOptions] = useState([]);

    useEffect(() => {
        if (project) {
            setFormData({ project_name: project.project_name, project_number: project.project_number, client: project.client, year: project.year || '' });
        } else {
            setFormData({ project_name: '', project_number: '', client: '', year: '' });
        }
    }, [project, isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchYearOptions();
        }
    }, [isOpen]);

    const fetchYearOptions = async () => {
        try {
            // Get the Year category - try case insensitive search to be safe
            const { data: categories, error: catError } = await supabase
                .from('dropdown_categories')
                .select('id')
                .ilike('name', 'year')
                .limit(1);

            if (catError || !categories || categories.length === 0) {
                console.error('Year category not found');
                return;
            }

            // Get the year options
            const { data: items, error: itemError } = await supabase
                .from('dropdown_items')
                .select('id, display_text, sort_order')
                .eq('category_id', categories[0].id)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (itemError) {
                console.error('Error fetching year items:', itemError);
                return;
            }

            setYearOptions(items || []);
        } catch (error) {
            console.error('Error fetching year options:', error);
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
                    <Input label="Client" name="client" value={formData.client} onChange={handleChange} required />
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
