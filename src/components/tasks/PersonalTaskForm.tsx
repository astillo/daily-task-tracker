import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { motion } from "framer-motion";
import { slideUpFadeIn } from "../../animations";

interface PersonalTaskFormProps {
  onComplete?: () => void;
}

export const PersonalTaskForm = ({ onComplete }: PersonalTaskFormProps) => {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { currentUser } = useAuth();

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
      
      // Create new personal task
      await addDoc(collection(db, `users/${currentUser.uid}/personalTasks`), {
        title,
        instructions: instructions || null,
        requiresPhoto,
        isRecurring,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        status: 'pending',
        completedAt: null,
        photoUrl: null,
      });
      
      // Reset form after successful creation
      setTitle("");
      setInstructions("");
      setRequiresPhoto(false);
      setIsRecurring(false);
      
      if (onComplete) onComplete();
      
    } catch (err) {
      console.error("Error saving personal task:", err);
      // Provide more specific error message based on the error type
      if (err instanceof Error) {
        if (err.message.includes("permission-denied")) {
          setError("You don't have permission to create personal tasks. Please contact support.");
        } else if (err.message.includes("network")) {
          setError("Network error. Please check your internet connection and try again.");
        } else {
          setError("Failed to save task. Please try again.");
        }
      } else {
      setError("Failed to save task. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="task-form"
      variants={slideUpFadeIn}
    >
      <h2>Create Personal Task</h2>
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
        
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="isRecurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          <label htmlFor="isRecurring">
            Make this task recurring (resets daily)
          </label>
        </div>
        
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Create Task"}
        </button>
      </form>
    </motion.div>
  );
}; 