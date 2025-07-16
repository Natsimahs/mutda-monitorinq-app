// src/AdminManagementPage.jsx

import React, { useState } from 'react';
import ManageKindergartens from './ManageKindergartens.jsx';
import ManageGroups from './ManageGroups.jsx';
import ManageChildren from './ManageChildren.jsx';

const AdminManagementPage = () => {
  const [activeTab, setActiveTab] = useState('kindergartens');

  return (
    <div className="admin-page-container">
      <h2>İdarəetmə Paneli</h2>
      <div className="admin-tabs">
        <button
          className={`admin-tab-button ${activeTab === 'kindergartens' ? 'active' : ''}`}
          onClick={() => setActiveTab('kindergartens')}
        >
          Bağçalar
        </button>
        <button
          className={`admin-tab-button ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Qruplar
        </button>
        <button
          className={`admin-tab-button ${activeTab === 'children' ? 'active' : ''}`}
          onClick={() => setActiveTab('children')}
        >
          Uşaqlar
        </button>
      </div>

      <div className="admin-tab-content">
        {activeTab === 'kindergartens' && <ManageKindergartens />}
        {activeTab === 'groups' && <ManageGroups />}
        {activeTab === 'children' && <ManageChildren />}
      </div>
    </div>
  );
};

export default AdminManagementPage;
