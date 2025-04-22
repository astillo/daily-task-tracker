import { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc, where, serverTimestamp, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Task } from "../../types";
import { useAuth } from "../../context/AuthContext";

interface AssignTaskFormProps {
  userId: string;
  userName: string;
  onComplete?: () => void;
}

export const AssignTaskForm = ({ userId, userName, onComplete }: AssignTaskFormProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { currentUser } = useAuth();

  // Fetch available tasks and already assigned tasks
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all tasks
        const tasksQuery = query(collection(db, "tasks"));
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksList: Task[] = [];
        tasksSnapshot.forEach((doc) => {
          const data = doc.data();
          tasksList.push({
            id: doc.id,
            title: data.title,
            instructions: data.instructions,
            requiresPhoto: data.requiresPhoto,
            createdBy: data.createdBy,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        setTasks(tasksList);
        
        // Fetch tasks already assigned to this user
        const assignedTasksQuery = query(
          collection(db, "assignedTasks"),
          where("userId", "==", userId)
        );
        const assignedTasksSnapshot = await getDocs(assignedTasksQuery);
        const assignedTaskIds: string[] = [];
        assignedTasksSnapshot.forEach((doc) => {
          const data = doc.data();
          assignedTaskIds.push(data.taskId);
        });
        setAssignedTasks(assignedTaskIds);
        
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load tasks. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId]);

  // Assign a task to the user
  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTaskId) {
      setError("Please select a task to assign");
      return;
    }
    
    if (!currentUser) {
      setError("You must be logged in to assign tasks");
      return;
    }
    
    try {
      setSaving(true);
      
      // Add to assignedTasks collection
      await addDoc(collection(db, "assignedTasks"), {
        taskId: selectedTaskId,
        userId,
        assignedBy: currentUser.uid,
        assignedAt: serverTimestamp(),
      });
      
      // Update local state
      setAssignedTasks([...assignedTasks, selectedTaskId]);
      setSelectedTaskId("");
      
      if (onComplete) onComplete();
      
    } catch (err) {
      console.error("Error assigning task:", err);
      setError("Failed to assign task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Unassign a task from the user
  const handleUnassignTask = async (taskId: string) => {
    if (!confirm(`Are you sure you want to unassign this task from ${userName}?`)) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Find the assignedTask document to delete
      const assignedTaskQuery = query(
        collection(db, "assignedTasks"),
        where("taskId", "==", taskId),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(assignedTaskQuery);
      
      if (querySnapshot.empty) {
        setError("Task assignment not found");
        return;
      }
      
      // Delete the assignment
      await deleteDoc(doc(db, "assignedTasks", querySnapshot.docs[0].id));
      
      // Update local state
      setAssignedTasks(assignedTasks.filter((id) => id !== taskId));
      
    } catch (err) {
      console.error("Error unassigning task:", err);
      setError("Failed to unassign task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  // Filter out already assigned tasks for the dropdown
  const availableTasks = tasks.filter(
    (task) => !assignedTasks.includes(task.id)
  );

  // Get assigned task objects
  const userAssignedTasks = tasks.filter((task) =>
    assignedTasks.includes(task.id)
  );

  return (
    <div className="assign-task-container">
      <h3>Assigned Tasks for {userName}</h3>
      {error && <div className="error-alert">{error}</div>}
      
      {/* Form to assign new tasks */}
      <form onSubmit={handleAssignTask} className="assign-task-form">
        <div className="form-group">
          <label htmlFor="taskId">Select Task to Assign</label>
          <select
            id="taskId"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            disabled={saving || availableTasks.length === 0}
          >
            <option value="">-- Select a task --</option>
            {availableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>
        
        <button type="submit" disabled={!selectedTaskId || saving}>
          {saving ? "Assigning..." : "Assign Task"}
        </button>
      </form>
      
      {/* List of currently assigned tasks */}
      <div className="assigned-tasks-list">
        <h4>Currently Assigned Tasks</h4>
        {userAssignedTasks.length === 0 ? (
          <p>No tasks assigned yet.</p>
        ) : (
          <ul>
            {userAssignedTasks.map((task) => (
              <li key={task.id} className="assigned-task-item">
                <span className="task-title">{task.title}</span>
                {task.requiresPhoto && (
                  <span className="photo-required">Photo required</span>
                )}
                <button
                  onClick={() => handleUnassignTask(task.id)}
                  className="unassign-button"
                  disabled={saving}
                >
                  Unassign
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}; 