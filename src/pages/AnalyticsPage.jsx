import React, { useState } from 'react';

const AnalyticsPage = () => {
    const [activeTab, setActiveTab] = useState('Projects');

    const tabs = ['Projects', 'Resource', 'Delivery Team'];

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
                {activeTab === 'Delivery Team' && <DeliveryTrackerAnalytics />}
            </div>
        </div>
    );
};

export default AnalyticsPage;
