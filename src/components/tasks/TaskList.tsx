import { useState, useEffect } from "react";
import { collection, query, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Task } from "../../types";
import { TaskForm } from "./TaskForm";

export const TaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch tasks from Firestore
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "tasks"));
      const querySnapshot = await getDocs(q);
      
      const taskList: Task[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        taskList.push({
          id: doc.id,
          title: data.title,
          instructions: data.instructions || undefined,
          requiresPhoto: data.requiresPhoto,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      
      setTasks(taskList);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    try {
      setIsDeleting(true);
      
      // Delete the task document
      await deleteDoc(doc(db, "tasks", taskId));
      
      // Update the local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      // If we're editing this task, close the form
      if (editingTask?.id === taskId) {
        setEditingTask(null);
        setShowForm(false);
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit task
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  // Handle form completion (create/edit)
  const handleFormComplete = () => {
    setShowForm(false);
    setEditingTask(null);
    fetchTasks(); // Refresh the list
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="task-list-container container-accent">
      <div className="header-actions">
        <h2>Task Templates</h2>
        <button 
          className="primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "New Task Template"}
        </button>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="task-form-container">
          <TaskForm
            existingTask={editingTask || undefined}
            onComplete={handleFormComplete}
          />
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p>No task templates found. Create your first template to get started.</p>
        </div>
      ) : (
        <div className="task-grid">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="task-card"
            >
              <div className="task-content">
                <h3>{task.title}</h3>
                {task.instructions && <p>{task.instructions}</p>}
                {task.requiresPhoto && (
                  <span className="badge badge-primary">
                    Photo required
                  </span>
                )}
              </div>
              <div className="task-actions">
                <button
                  className="edit-button"
                  onClick={() => handleEditTask(task)}
                >
                  Edit
                </button>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteTask(task.id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 