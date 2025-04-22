import { useState } from "react";
import { Layout } from "../components/layout/Layout";
import { EmployeeTaskList } from "../components/tasks/EmployeeTaskList";
import { TaskHistory } from "../components/tasks/TaskHistory";
import { PersonalTaskList } from "../components/tasks/PersonalTaskList";
import { useAuth } from "../context/AuthContext";

export const EmployeeDashboardPage = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'today' | 'personal' | 'history'>('today');
  
  return (
    <Layout>
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Today's Tasks
        </button>
        <button 
          className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          Personal Tasks
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Task History
        </button>
      </div>
      
      {activeTab === 'today' && <EmployeeTaskList />}
      {activeTab === 'personal' && <PersonalTaskList />}
      {activeTab === 'history' && currentUser && <TaskHistory userId={currentUser.uid} />}
    </Layout>
  );
}; 