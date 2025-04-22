import { useState, useEffect, useCallback } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  limit,
  documentId,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { Task, DailyTaskStatus, AssignedTask } from "../../types";
import { format } from "date-fns";
import ImageModal from "./ImageModal";

// Create cache for tasks to avoid redundant fetching
const taskCache: Record<string, Task> = {};

export const EmployeeTaskList = () => {
  const [tasks, setTasks] = useState<Array<{
    task: Task;
    status: DailyTaskStatus | null;
    assignedTaskId: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Memoize fetchTasks to prevent unnecessary recreations
  const fetchTasks = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      console.time('fetchTasks');
      setLoading(true);
      
      // 1. Get all assigned tasks for this user (in a single query)
      const assignedTasksQuery = query(
        collection(db, "assignedTasks"),
        where("userId", "==", currentUser.uid),
        limit(20) // Reduce limit for better performance
      );
      const assignedTasksSnapshot = await getDocs(assignedTasksQuery);
      
      // If no assigned tasks, return early
      if (assignedTasksSnapshot.empty) {
        setTasks([]);
        setLoading(false);
        console.timeEnd('fetchTasks');
        return;
      }
      
      // 2. For each assigned task, prepare data
      const assignedTasks: AssignedTask[] = [];
      const taskIds: string[] = [];
      
      assignedTasksSnapshot.forEach((doc) => {
        const data = doc.data();
        assignedTasks.push({
          id: doc.id,
          taskId: data.taskId,
          userId: data.userId,
          assignedBy: data.assignedBy,
          assignedAt: data.assignedAt?.toDate() || new Date(),
        });
        
        // Collect taskIds for batch fetching
        if (!taskCache[data.taskId]) {
          taskIds.push(data.taskId);
        }
      });
      
      // 3. Get today's completion status for each task
      let statusMap: Record<string, DailyTaskStatus> = {};
      
      if (assignedTasks.length > 0) {
        const dailyTasksRef = collection(db, `users/${currentUser.uid}/dailyTasks`);
        const todayStatusQuery = query(dailyTasksRef, where("date", "==", today));
        const todayStatusSnapshot = await getDocs(todayStatusQuery);
        
        todayStatusSnapshot.forEach((doc) => {
          const data = doc.data();
          statusMap[data.assignedTaskId] = {
            id: doc.id,
            assignedTaskId: data.assignedTaskId,
            userId: data.userId,
            date: data.date,
            isCompleted: data.isCompleted,
            completedAt: data.completedAt?.toDate(),
            photoUrl: data.photoUrl,
          };
        });
      }
      
      // 4. Batch fetch task details for uncached tasks
      if (taskIds.length > 0) {
        // For a small number of tasks, use a single query instead of batching
        if (taskIds.length <= 10) {
          const tasksQuery = query(
            collection(db, "tasks"),
            where(documentId(), "in", taskIds)
          );
          const taskDocs = await getDocs(tasksQuery);
          
          taskDocs.forEach(doc => {
            const taskData = doc.data();
            taskCache[doc.id] = {
              id: doc.id,
              title: taskData.title,
              instructions: taskData.instructions,
              requiresPhoto: taskData.requiresPhoto,
              createdBy: taskData.createdBy,
              createdAt: taskData.createdAt?.toDate() || new Date(),
            };
          });
        } else {
          // Split into chunks of 10 (Firestore limitation for 'in' queries)
          const fetchTaskDetails = async (ids: string[]) => {
            const tasksQuery = query(
              collection(db, "tasks"),
              where(documentId(), "in", ids)
            );
            const taskDocs = await getDocs(tasksQuery);
            
            taskDocs.forEach(doc => {
              const taskData = doc.data();
              taskCache[doc.id] = {
                id: doc.id,
                title: taskData.title,
                instructions: taskData.instructions,
                requiresPhoto: taskData.requiresPhoto,
                createdBy: taskData.createdBy,
                createdAt: taskData.createdAt?.toDate() || new Date(),
              };
            });
          };
          
          // Batch fetch tasks in chunks of 10
          const chunks: string[][] = [];
          for (let i = 0; i < taskIds.length; i += 10) {
            chunks.push(taskIds.slice(i, i + 10));
          }
          
          await Promise.all(chunks.map(fetchTaskDetails));
        }
      }
      
      // 5. Assemble the final task list using the cache
      const result = assignedTasks.map(assignedTask => {
        const task = taskCache[assignedTask.taskId];
        if (!task) return null;
        
        return {
          task,
          status: statusMap[assignedTask.id] || null,
          assignedTaskId: assignedTask.id,
        };
      }).filter(Boolean) as Array<{
        task: Task;
        status: DailyTaskStatus | null;
        assignedTaskId: string;
      }>;
      
      setTasks(result);
      console.timeEnd('fetchTasks');
      
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load your tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentUser, today]);
  
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  // Handle task completion
  const handleCompleteTask = async (assignedTaskId: string, requiresPhoto: boolean, photoFile?: File) => {
    if (!currentUser) return;
    
    try {
      setUploading((prev) => ({ ...prev, [assignedTaskId]: true }));
      
      let photoUrl = undefined;
      
      // If photo is required, upload it first
      if (requiresPhoto && photoFile) {
        const storageRef = ref(storage, `task-photos/${currentUser.uid}/${today}/${assignedTaskId}`);
        await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(storageRef);
      }
      
      // Get reference to status doc if it exists
      const dailyTasksRef = collection(db, `users/${currentUser.uid}/dailyTasks`);
      const statusQuery = query(
        dailyTasksRef,
        where("assignedTaskId", "==", assignedTaskId),
        where("date", "==", today)
      );
      const statusSnapshot = await getDocs(statusQuery);
      
      if (statusSnapshot.empty) {
        // Create new status document
        await addDoc(dailyTasksRef, {
          assignedTaskId,
          userId: currentUser.uid,
          date: today,
          isCompleted: true,
          completedAt: serverTimestamp(),
          photoUrl,
        });
      } else {
        // Update existing status document
        const statusDoc = statusSnapshot.docs[0];
        await updateDoc(doc(dailyTasksRef, statusDoc.id), {
          isCompleted: true,
          completedAt: serverTimestamp(),
          photoUrl: photoUrl || statusDoc.data().photoUrl,
        });
      }
      
      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.assignedTaskId === assignedTaskId
            ? {
                ...t,
                status: {
                  id: statusSnapshot.empty ? "" : statusSnapshot.docs[0].id,
                  assignedTaskId,
                  userId: currentUser.uid,
                  date: today,
                  isCompleted: true,
                  completedAt: new Date(),
                  photoUrl,
                },
              }
            : t
        )
      );
      
    } catch (err) {
      console.error("Error completing task:", err);
      alert("Failed to complete task. Please try again.");
    } finally {
      setUploading((prev) => ({ ...prev, [assignedTaskId]: false }));
    }
  };
  
  // Refresh tasks manually
  const handleRefresh = () => {
    fetchTasks();
  };
  
  // Calculate completion stats
  const completedTasks = tasks.filter((t) => t.status?.isCompleted).length;
  const totalTasks = tasks.length;
  const completionPercentage = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <p className="error-alert">{error}</p>
        <button onClick={handleRefresh} className="primary-button">Retry</button>
      </div>
    );
  }
  
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <p>You don't have any tasks assigned yet.</p>
      </div>
    );
  }
  
  return (
    <div className="employee-tasks-container container-accent">
      <div className="task-progress-container container-accent">
        <div className="task-progress-header">
          <h2>Your Daily Tasks</h2>
          <span className="progress-percentage">{completionPercentage}% Complete</span>
        </div>
        <div className="progress-bar-enhanced">
          <div 
            className="progress-fill-enhanced" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <div className="task-stats">
          <p>
            <strong>{completedTasks}</strong> of <strong>{totalTasks}</strong> tasks completed
          </p>
          <button 
            onClick={handleRefresh} 
            className="refresh-button" 
            title="Refresh tasks"
          >
            ↻
          </button>
        </div>
      </div>
      
      <div className="employee-task-list">
        {tasks.map(({ task, status, assignedTaskId }) => (
          <div 
            key={assignedTaskId}
            className={`employee-task-card ${status?.isCompleted ? 'completed' : ''}`}
          >
            <div className="employee-task-header">
              <h3>{task.title}</h3>
              {task.requiresPhoto && !status?.isCompleted && (
                <span className="badge badge-primary">Photo Required</span>
              )}
            </div>
            
            <div className="employee-task-content">
              {task.instructions && <p>{task.instructions}</p>}
              
              {status?.isCompleted ? (
                <div className="task-completed">
                  <div className="task-status">
                    <div className="status-dot completed"></div>
                    <span className="completed-badge">Completed</span>
                    {status.completedAt && (
                      <span className="completion-time">
                        at {format(status.completedAt, "h:mm a")}
                      </span>
                    )}
                  </div>
                  
                  {status.photoUrl && (
                    <div className="upload-preview">
                      <img 
                        src={status.photoUrl} 
                        alt="Task completion" 
                        onClick={() => setZoomedImage(status.photoUrl || null)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <TaskCompletionForm
                  assignedTaskId={assignedTaskId}
                  requiresPhoto={task.requiresPhoto}
                  onComplete={handleCompleteTask}
                  uploading={uploading[assignedTaskId] || false}
                  onImageClick={setZoomedImage}
                />
              )}
            </div>
            
            <div className="employee-task-footer">
              <div className="task-status">
                <div className={`status-dot ${status?.isCompleted ? 'completed' : 'incomplete'}`}></div>
                <span>{status?.isCompleted ? 'Completed' : 'Pending'}</span>
              </div>
              <div className="task-due-date">
                Due today
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Image Zoom Modal */}
      {zoomedImage && (
        <ImageModal 
          imageUrl={zoomedImage} 
          onClose={() => setZoomedImage(null)} 
        />
      )}
    </div>
  );
};

// Separate component for the completion form
const TaskCompletionForm = ({ 
  assignedTaskId, 
  requiresPhoto,
  onComplete,
  uploading,
  onImageClick
}: { 
  assignedTaskId: string;
  requiresPhoto: boolean;
  onComplete: (assignedTaskId: string, requiresPhoto: boolean, photoFile?: File) => Promise<void>;
  uploading: boolean;
  onImageClick: (url: string) => void;
}) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file is an image and not too large
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image is too large. Please select an image under 5MB.');
        return;
      }
      
      setPhotoFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPreviewUrl(null);
    
    // Reset the file input
    const fileInput = document.getElementById(`photo-${assignedTaskId}`) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(assignedTaskId, requiresPhoto, photoFile || undefined);
  };
  
  return (
    <form onSubmit={handleSubmit} className="task-completion-form">
      {requiresPhoto && (
        <div className="photo-upload-wrapper">
          <label htmlFor={`photo-${assignedTaskId}`} className="upload-label">
            {photoFile ? "Change photo" : "Upload a photo of the completed task"} 📸
          </label>
          <input
            type="file"
            id={`photo-${assignedTaskId}`}
            accept="image/*"
            onChange={handleFileChange}
            required
            disabled={uploading}
            className="photo-upload-input"
          />
          
          {previewUrl && (
            <div className="upload-preview-container">
              <div className="upload-preview">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  onClick={() => previewUrl && onImageClick(previewUrl)}
                />
              </div>
              {!uploading && (
                <button 
                  type="button" 
                  onClick={handleRemovePhoto}
                  className="remove-photo-button"
                >
                  Remove photo
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={uploading || (requiresPhoto && !photoFile)}
        className="complete-task-button"
      >
        {uploading ? "Uploading..." : "Mark as Complete ✓"}
      </button>
    </form>
  );
}; 