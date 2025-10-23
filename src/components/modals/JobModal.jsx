import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../ui';

const jobStatuses = ["Site Not Started", "Site Work Completed", "Delivered", "Postponed", "Cancelled", "On Hold", "Revisit Required"];

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

export default JobModal;
