import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { User, Task, DailyTaskStatus, EmployeeWithTasks } from "../../types";
import { format } from "date-fns";
import { AssignTaskForm } from "./AssignTaskForm";
import { TaskHistory } from "./TaskHistory";

export const ManagerDashboard = () => {
  const [employees, setEmployees] = useState<EmployeeWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    const fetchEmployeesWithTasks = async () => {
      try {
        setLoading(true);
        
        // 1. Get all employees (users with role "employee")
        const employeesQuery = query(
          collection(db, "users"),
          where("role", "==", "employee")
        );
        const employeeSnapshot = await getDocs(employeesQuery);
        
        if (employeeSnapshot.empty) {
          setEmployees([]);
          return;
        }
        
        // 2. For each employee, get their assigned tasks and status
        const employeePromises = employeeSnapshot.docs.map(async (employeeDoc) => {
          const employeeData = employeeDoc.data();
          const employee: User = {
            uid: employeeDoc.id,
            email: employeeData.email,
            displayName: employeeData.displayName,
            role: employeeData.role,
            createdAt: employeeData.createdAt?.toDate() || new Date(),
          };
          
          // Get assigned tasks for this employee
          const assignedTasksQuery = query(
            collection(db, "assignedTasks"),
            where("userId", "==", employee.uid)
          );
          const assignedTasksSnapshot = await getDocs(assignedTasksQuery);
          
          // If no assigned tasks, return employee with empty task list
          if (assignedTasksSnapshot.empty) {
            return {
              ...employee,
              assignedTasks: [],
            };
          }
          
          // For each assigned task, get the task details and today's status
          const taskPromises = assignedTasksSnapshot.docs.map(async (assignedTaskDoc) => {
            const assignedTaskData = assignedTaskDoc.data();
            
            // Get task details
            const taskDoc = await getDoc(doc(db, "tasks", assignedTaskData.taskId));
            if (!taskDoc.exists()) return null;
            
            const taskData = taskDoc.data();
            const task: Task = {
              id: taskDoc.id,
              title: taskData.title,
              instructions: taskData.instructions,
              requiresPhoto: taskData.requiresPhoto,
              createdBy: taskData.createdBy,
              createdAt: taskData.createdAt?.toDate() || new Date(),
            };
            
            // Get today's status for this task
            const statusQuery = query(
              collection(db, `users/${employee.uid}/dailyTasks`),
              where("assignedTaskId", "==", assignedTaskDoc.id),
              where("date", "==", today)
            );
            const statusSnapshot = await getDocs(statusQuery);
            
            let status: DailyTaskStatus | null = null;
            
            if (!statusSnapshot.empty) {
              const statusData = statusSnapshot.docs[0].data();
              status = {
                id: statusSnapshot.docs[0].id,
                assignedTaskId: assignedTaskDoc.id,
                userId: employee.uid,
                date: statusData.date,
                isCompleted: statusData.isCompleted,
                completedAt: statusData.completedAt?.toDate(),
                photoUrl: statusData.photoUrl,
              };
            }
            
            return {
              task,
              status,
            };
          });
          
          const assignedTasks = (await Promise.all(taskPromises)).filter(Boolean) as Array<{
            task: Task;
            status: DailyTaskStatus | null;
          }>;
          
          return {
            ...employee,
            assignedTasks,
          };
        });
        
        const employeesWithTasks = await Promise.all(employeePromises);
        setEmployees(employeesWithTasks);
      } catch (err) {
        console.error("Error fetching employees and tasks:", err);
        setError("Failed to load employee data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployeesWithTasks();
  }, [today]);

  // Function to toggle between tasks and history view
  const toggleHistoryView = (employeeId: string) => {
    if (viewingHistory === employeeId) {
      setViewingHistory(null);
    } else {
      setViewingHistory(employeeId);
      // Make sure the employee card is expanded when viewing history
      if (expandedEmployee !== employeeId) {
        setExpandedEmployee(employeeId);
      }
    }
  };

  if (loading) {
    return <div>Loading employee data...</div>;
  }

  return (
    <div className="manager-dashboard">
      <h2>Employee Task Dashboard</h2>
      {error && <div className="error-alert">{error}</div>}
      
      {employees.length === 0 ? (
        <p>No employees found. Add employees to get started.</p>
      ) : (
        <div className="employee-list">
          {employees.map((employee) => {
            const completedTasks = employee.assignedTasks.filter(
              (t) => t.status?.isCompleted
            ).length;
            const totalTasks = employee.assignedTasks.length;
            const completionPercentage = totalTasks
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0;
            const isExpanded = expandedEmployee === employee.uid;
            const isViewingHistory = viewingHistory === employee.uid;
            
            return (
              <div key={employee.uid} className="employee-card">
                <div className="employee-header">
                  <div className="employee-info">
                    <h3>{employee.displayName}</h3>
                    <div className="employee-email">{employee.email}</div>
                  </div>
                  
                  <div className="task-summary">
                    {totalTasks === 0 ? (
                      <span className="no-tasks">No tasks assigned</span>
                    ) : (
                      <>
                        <div className="task-count">
                          {completedTasks} of {totalTasks} tasks completed
                        </div>
                        <div className="mini-progress-bar">
                          <div
                            className="mini-progress-fill"
                            style={{ width: `${completionPercentage}%` }}
                          ></div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="employee-actions">
                    <button
                      onClick={() => toggleHistoryView(employee.uid)}
                      className={`history-button ${isViewingHistory ? 'active' : ''}`}
                      disabled={!isExpanded}
                      title={isExpanded ? "View task history" : "Expand to view history"}
                    >
                      {isViewingHistory ? "Today's Tasks" : "History"}
                    </button>
                    
                    <button
                      onClick={() =>
                        setExpandedEmployee(isExpanded ? null : employee.uid)
                      }
                      className="expand-button"
                    >
                      {isExpanded ? "Collapse" : "Expand"}
                    </button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="employee-expanded">
                    {isViewingHistory ? (
                      <div className="employee-history">
                        <TaskHistory userId={employee.uid} />
                      </div>
                    ) : (
                      <>
                        <div className="employee-tasks">
                          <h4>Today's Tasks</h4>
                          {employee.assignedTasks.length === 0 ? (
                            <p>No tasks assigned to this employee.</p>
                          ) : (
                            <table className="tasks-table">
                              <thead>
                                <tr>
                                  <th>Task</th>
                                  <th>Status</th>
                                  <th>Photo Required</th>
                                  <th>Completion Time</th>
                                </tr>
                              </thead>
                              <tbody>
                                {employee.assignedTasks.map(({ task, status }) => (
                                  <tr key={task.id}>
                                    <td>{task.title}</td>
                                    <td>
                                      <span
                                        className={`status-badge ${
                                          status?.isCompleted
                                            ? "completed"
                                            : "incomplete"
                                        }`}
                                      >
                                        {status?.isCompleted
                                          ? "Completed"
                                          : "Incomplete"}
                                      </span>
                                    </td>
                                    <td>
                                      {task.requiresPhoto ? (
                                        status?.photoUrl ? (
                                          <a
                                            href={status.photoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            View Photo
                                          </a>
                                        ) : (
                                          "Required"
                                        )
                                      ) : (
                                        "Not Required"
                                      )}
                                    </td>
                                    <td>
                                      {status?.completedAt
                                        ? format(status.completedAt, "h:mm a")
                                        : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                        
                        <AssignTaskForm
                          userId={employee.uid}
                          userName={employee.displayName}
                          onComplete={() => {
                            // Refresh the dashboard after task assignment
                            window.location.reload();
                          }}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}; 