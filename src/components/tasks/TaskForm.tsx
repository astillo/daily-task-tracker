import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Task } from "../../types";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";

interface TaskFormProps {
  existingTask?: Task;
  onComplete?: () => void;
}

export const TaskForm = ({ existingTask, onComplete }: TaskFormProps) => {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { currentUser } = useAuth();

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setInstructions(existingTask.instructions || "");
      setRequiresPhoto(existingTask.requiresPhoto);
    }
  }, [existingTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError("You must be logged in to create tasks");
      return;
    }
    
    if (title.trim() === "") {
      setError("Task title is required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError("");
      
      if (existingTask) {
        // Update existing task
        await updateDoc(doc(db, "tasks", existingTask.id), {
          title,
          instructions: instructions || null,
          requiresPhoto,
        });
      } else {
        // Create new task
        await addDoc(collection(db, "tasks"), {
          title,
          instructions: instructions || null,
          requiresPhoto,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        
        // Reset form after successful creation
        setTitle("");
        setInstructions("");
        setRequiresPhoto(false);
      }
      
      if (onComplete) onComplete();
      
    } catch (err) {
      console.error("Error saving task:", err);
      setError("Failed to save task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="task-form">
      <h2>{existingTask ? "Edit Task" : "Create New Task Template"}</h2>
      {error && <div className="error-alert">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Task Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="instructions">Instructions (Optional)</label>
          <textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
          />
        </div>
        
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="requiresPhoto"
            checked={requiresPhoto}
            onChange={(e) => setRequiresPhoto(e.target.checked)}
          />
          <label htmlFor="requiresPhoto">
            Require photo verification for completion
          </label>
        </div>
        
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : existingTask
            ? "Update Task"
            : "Create Task"}
        </button>
      </form>
    </div>
  );
}; 