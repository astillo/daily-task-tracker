import { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, attemptReconnection } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { PersonalTask } from "../../types";
import { format } from "date-fns";
import { PersonalTaskForm } from "./PersonalTaskForm";
import ImageModal from "./ImageModal";

// Create a fixed version of ImageModal to handle null imageUrl
const SafeImageModal: React.FC<{
  imageUrl: string | null;
  onClose: () => void;
}> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return <ImageModal imageUrl={imageUrl} onClose={onClose} />;
};

export const PersonalTaskList = () => {
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { currentUser } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch personal tasks
  const fetchPersonalTasks = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const personalTasksRef = collection(db, `users/${currentUser.uid}/personalTasks`);
      const personalTasksSnapshot = await getDocs(personalTasksRef);
      
      const tasks: PersonalTask[] = [];
      personalTasksSnapshot.forEach((doc) => {
        const data = doc.data();
        tasks.push({
          id: doc.id,
          title: data.title,
          instructions: data.instructions,
          requiresPhoto: data.requiresPhoto,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
          isRecurring: data.isRecurring,
          status: data.status,
          completedAt: data.completedAt?.toDate(),
          photoUrl: data.photoUrl,
        });
      });
      
      setPersonalTasks(tasks);
      
    } catch (err) {
      console.error("Error fetching personal tasks:", err);
      // Provide more specific error message based on the error type
      if (err instanceof Error) {
        if (err.message.includes("permission-denied")) {
          setError("You don't have permission to access your personal tasks. Please contact support.");
        } else if (err.message.includes("network")) {
          setError("Network error. Please check your internet connection and try again.");
        } else {
          setError("Failed to load your personal tasks. Please try again.");
        }
      } else {
      setError("Failed to load your personal tasks. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalTasks();
  }, [currentUser]);

  // Complete task
  const handleCompleteTask = async (taskId: string, requiresPhoto: boolean, photoFile?: File) => {
    if (!currentUser) return;
    
    try {
      setUploading((prev) => ({ ...prev, [taskId]: true }));
      
      let photoUrl = undefined;
      
      // If photo is required, upload it first
      if (requiresPhoto && photoFile) {
        const storageRef = ref(storage, `personal-task-photos/${currentUser.uid}/${today}/${taskId}`);
        await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(storageRef);
      }
      
      // Update task status
      const taskRef = doc(db, `users/${currentUser.uid}/personalTasks`, taskId);
      await updateDoc(taskRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        photoUrl: photoUrl || null,
      });
      
      // Update local state
      setPersonalTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: 'completed',
                completedAt: new Date(),
                photoUrl,
              }
            : task
        )
      );
      
    } catch (err) {
      console.error("Error completing task:", err);
      alert("Failed to complete task. Please try again.");
    } finally {
      setUploading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }
    
    try {
      if (!currentUser) return;
      
      const taskRef = doc(db, `users/${currentUser.uid}/personalTasks`, taskId);
      await deleteDoc(taskRef);
      
      // Update local state
      setPersonalTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
      
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task. Please try again.");
    }
  };

  // Handle form completion
  const handleFormComplete = () => {
    setShowForm(false);
    fetchPersonalTasks();
  };

  // Handle reconnection attempt
  const handleReconnect = async () => {
    try {
      setIsReconnecting(true);
      await attemptReconnection();
      // Retry fetching tasks after reconnection
      fetchPersonalTasks();
    } catch (err) {
      console.error("Failed to reconnect:", err);
      setError("Failed to reconnect. Please check your internet connection.");
    } finally {
      setIsReconnecting(false);
    }
  };

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
        <div className="error-actions">
          <button 
            onClick={fetchPersonalTasks} 
            className="primary-button"
            disabled={isReconnecting}
          >
            Retry
          </button>
          <button 
            onClick={handleReconnect} 
            className="secondary-button"
            disabled={isReconnecting}
          >
            {isReconnecting ? "Reconnecting..." : "Check Connection"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="personal-tasks-container">
      <div className="header-actions">
        <h2>My Personal Tasks</h2>
        <button 
          className="primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "New Personal Task"}
        </button>
      </div>

      {showForm && (
        <div className="task-form-container">
          <PersonalTaskForm onComplete={handleFormComplete} />
        </div>
      )}

      {personalTasks.length === 0 && !showForm ? (
        <div className="empty-state">
          <p>You don't have any personal tasks yet. Create your first task to get started.</p>
          <button 
            className="primary-button"
            onClick={() => setShowForm(true)}
          >
            Create Task
          </button>
        </div>
      ) : (
        <div className="task-grid">
          {personalTasks.map((task) => (
            <div
              key={task.id}
              className={`task-card ${task.status === 'completed' ? 'completed' : 'pending'}`}
            >
              <div className="task-content">
                <h3>{task.title}</h3>
                {task.instructions && <p>{task.instructions}</p>}
                <div className="task-badges">
                  {task.requiresPhoto && (
                    <span className="badge badge-primary">
                      Photo required
                    </span>
                  )}
                  {task.isRecurring && (
                    <span className="badge badge-secondary">
                      Recurring daily
                    </span>
                  )}
                  <span className={`badge badge-${task.status === 'completed' ? 'success' : 'warning'}`}>
                    {task.status === 'completed' ? 'Completed' : 'Pending'}
                  </span>
                </div>
                
                {task.photoUrl && (
                  <div className="task-photo">
                    <img 
                      src={task.photoUrl} 
                      alt="Task completion" 
                      onClick={() => task.photoUrl && setZoomedImage(task.photoUrl)}
                    />
                  </div>
                )}
              </div>
              
              <div className="task-actions">
                {task.status === 'pending' && (
                  <TaskCompletionForm
                    taskId={task.id}
                    requiresPhoto={task.requiresPhoto}
                    onComplete={handleCompleteTask}
                    uploading={uploading[task.id] || false}
                    onImageClick={(url) => setZoomedImage(url)}
                  />
                )}
                <button
                  className="delete-button"
                  onClick={() => handleDeleteTask(task.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Image zoom modal */}
      {zoomedImage && (
        <SafeImageModal 
          imageUrl={zoomedImage} 
          onClose={() => setZoomedImage(null)} 
        />
      )}
    </div>
  );
};

// Task completion form component
const TaskCompletionForm = ({ 
  taskId, 
  requiresPhoto,
  onComplete,
  uploading,
  onImageClick
}: { 
  taskId: string;
  requiresPhoto: boolean;
  onComplete: (taskId: string, requiresPhoto: boolean, photoFile?: File) => Promise<void>;
  uploading: boolean;
  onImageClick: (url: string) => void;
}) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      
      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresPhoto && !photoFile) {
      alert("Please upload a photo before marking the task as complete.");
      return;
    }
    onComplete(taskId, requiresPhoto, photoFile || undefined);
  };
  
  return (
    <form onSubmit={handleSubmit} className="complete-task-form">
      {requiresPhoto && (
        <div className="photo-upload">
          {photoPreview ? (
            <div className="photo-preview">
              <img 
                src={photoPreview} 
                alt="Preview" 
                onClick={() => onImageClick(photoPreview)}
              />
              <button 
                type="button" 
                className="remove-photo"
                onClick={handleRemovePhoto}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="upload-button-container">
              <label htmlFor={`photo-${taskId}`} className="upload-label">
                Upload verification photo
              </label>
              <input
                type="file"
                id={`photo-${taskId}`}
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
          )}
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={uploading || (requiresPhoto && !photoFile)}
        className="complete-button"
      >
        {uploading ? "Completing..." : "Mark as Complete"}
      </button>
    </form>
  );
}; 