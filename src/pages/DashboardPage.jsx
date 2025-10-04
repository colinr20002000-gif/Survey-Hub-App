import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FolderKanban, Bell, Megaphone, Bug } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { supabase } from '../supabaseClient';
import { Card, Button, Select } from '../components/ui';
import { ANNOUNCEMENT_PRIORITIES } from '../constants';

const DashboardPage = ({ onViewProject, setActiveTab }) => {
    const { user } = useAuth();
    const { projects } = useProjects();
    const [feedbackType, setFeedbackType] = useState('bug');
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [dashboardAnnouncements, setDashboardAnnouncements] = useState([]);

    const placeholderText = useMemo(() => {
        return feedbackType === 'bug' ? "Please describe the bug..." : "Please describe the feature you'd like to see...";
    }, [feedbackType]);

    // Fetch recent announcements for dashboard
    useEffect(() => {
        const fetchRecentAnnouncements = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('announcements')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (error) {
                    // If table doesn't exist, just set empty announcements
                    if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
                        setDashboardAnnouncements([]);
                        return;
                    }
                    throw error;
                }
                // Filter out feedback announcements for non-super admins
                const isSuperAdmin = user?.email === 'colin.rogers@inorail.co.uk';
                const filteredData = (data || []).filter(announcement => {
                    const isFeedbackAnnouncement = announcement.category === 'Feedback';
                    return !isFeedbackAnnouncement || isSuperAdmin;
                });
                setDashboardAnnouncements(filteredData);
            } catch (error) {
                console.error('Error fetching dashboard announcements:', error);
                setDashboardAnnouncements([]);
            }
        };

        fetchRecentAnnouncements();
    }, [user]);

    const handleFeedbackSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (feedbackText.trim() === '') return;

        try {
            // Save feedback to database
            // Note: Don't use .select() because non-admin users can't read feedback
            const { error } = await supabase
                .from('feedback')
                .insert([
                    {
                        user_id: user.id,
                        type: feedbackType,
                        description: feedbackText.trim(),
                        title: feedbackType === 'bug' ? 'Bug Report' : 'Feature Request'
                    }
                ]);

            if (error) {
                throw error;
            }

            setIsSubmitted(true);
            setFeedbackText('');
            setTimeout(() => setIsSubmitted(false), 3000);

            console.log('Feedback submitted successfully');
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        }
    }, [feedbackText, feedbackType, user]);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Welcome back, {user.name.split(' ')[0]}!</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Recent Projects" icon={<FolderKanban className="text-orange-500" />}>
                        <ul className="space-y-3">
                            {projects.slice(0, 4).map(p => (
                                <li key={p.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <button onClick={() => onViewProject(p)} className="text-left w-full">
                                        <p className="font-semibold text-gray-700 dark:text-gray-200 hover:text-orange-500">{p.project_name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{p.project_number}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card title="Announcements" icon={<Bell className="text-orange-500" />}>
                        {dashboardAnnouncements.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No recent announcements</p>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {dashboardAnnouncements.map(a => (
                                    <li key={a.id} className="border-l-4 border-l-orange-500 pl-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-700 dark:text-gray-200">{a.title}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{a.content}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                                        {new Date(a.created_at).toLocaleDateString()}
                                                    </p>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        ANNOUNCEMENT_PRIORITIES[a.priority]?.bg || 'bg-gray-100 dark:bg-gray-700'
                                                    } ${ANNOUNCEMENT_PRIORITIES[a.priority]?.color || 'text-gray-500'}`}>
                                                        {ANNOUNCEMENT_PRIORITIES[a.priority]?.label || a.priority}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveTab && setActiveTab('Announcements')}
                                className="w-full"
                            >
                                View All Announcements
                            </Button>
                        </div>
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
                                    key="feedback-textarea"
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    rows="4"
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder={placeholderText}
                                />
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

export default DashboardPage;
