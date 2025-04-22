import { useState, useEffect, Component, ReactNode } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { format, parse, isValid } from 'date-fns';
import { db } from '../../firebase/config';
import { GroupedTaskHistory, TaskHistoryItem, Task } from '../../types';
import ImageModal from './ImageModal';
import { TaskCompletionCalendar } from './TaskCompletionCalendar';
import '../../styles/task-history.css';

// Custom ErrorBoundary component
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Calendar error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

interface TaskHistoryProps {
  userId: string;
  historyMonths?: number;
}

// Main TaskHistory component
export const TaskHistory = ({ userId, historyMonths = 3 }: TaskHistoryProps) => {
  const [groupedHistory, setGroupedHistory] = useState<GroupedTaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const [selectedCalendarTasks, setSelectedCalendarTasks] = useState<TaskHistoryItem[]>([]);
  const [showingSelectedDay, setShowingSelectedDay] = useState(false);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTaskHistory = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        // Calculate date range - today to X months ago
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(endDate.getMonth() - historyMonths);
        
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        // Get all completed tasks for this user in date range
        const userTasksRef = collection(db, `users/${userId}/dailyTasks`);
        const completedTasksQuery = query(
          userTasksRef,
          where('isCompleted', '==', true),
          where('date', '>=', formattedStartDate),
          where('date', '<=', formattedEndDate)
        );
        
        const completedTasksSnapshot = await getDocs(completedTasksQuery);
        
        if (completedTasksSnapshot.empty) {
          setGroupedHistory([]);
          setLoading(false);
          return;
        }
        
        // Get tasks details and organize history
        
        // Use Promise.all for parallel processing
        const taskPromises = completedTasksSnapshot.docs.map(async (taskDoc) => {
          const data = taskDoc.data();
          
          // Validate assignedTaskId exists
          if (!data.assignedTaskId) {
            console.warn('Missing assignedTaskId for task record:', taskDoc.id);
            return null;
          }
          
          try {
            // Get the assigned task
            const assignedTaskRef = doc(db, 'assignedTasks', data.assignedTaskId);
            const assignedTaskSnapshot = await getDoc(assignedTaskRef);
            
            if (!assignedTaskSnapshot.exists()) {
              console.warn(`Assigned task ${data.assignedTaskId} not found`);
              return null;
            }
            
            const assignedTaskData = assignedTaskSnapshot.data();
            const taskId = assignedTaskData?.taskId as string;
            
            if (!taskId) {
              console.warn(`No taskId found in assigned task ${data.assignedTaskId}`);
              return null;
            }
            
            // Get the task details
            const taskRef = doc(db, 'tasks', taskId);
            const taskSnapshot = await getDoc(taskRef);
            
            if (!taskSnapshot.exists()) {
              console.warn(`Task ${taskId} not found`);
              return null;
            }
            
            const taskData = taskSnapshot.data();
            
            if (!taskData) {
              console.warn(`No data for task ${taskId}`);
              return null;
            }
            
            // Validate required task fields exist
            if (!taskData.title) {
              console.warn(`Task ${taskId} is missing required title field`);
              return null;
            }
            
            const task: Task = {
              id: taskSnapshot.id,
              title: taskData.title as string,
              instructions: taskData.instructions as string | undefined,
              requiresPhoto: Boolean(taskData.requiresPhoto),
              createdBy: taskData.createdBy as string || 'unknown',
              createdAt: taskData.createdAt?.toDate() || new Date(),
            };
            
            return {
              id: taskDoc.id,
              task,
              date: data.date,
              completedAt: data.completedAt?.toDate() || new Date(),
              photoUrl: data.photoUrl,
              assignedTaskId: data.assignedTaskId,
            };
          } catch (err) {
            console.error(`Error processing task ${taskDoc.id}:`, err);
            return null;
          }
        });
        
        const results = await Promise.all(taskPromises);
        const validResults = results.filter(Boolean) as TaskHistoryItem[];
        
        // Sort by completion date, newest first
        validResults.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
        
        // Group by month and day
        const groupedByMonth: Record<string, Record<string, TaskHistoryItem[]>> = {};
        
        validResults.forEach(item => {
          const date = parse(item.date, 'yyyy-MM-dd', new Date());
          
          if (!isValid(date)) {
            console.warn('Invalid date:', item.date);
            return;
          }
          
          const monthKey = format(date, 'MMMM yyyy');
          const dayKey = item.date;
          
          if (!groupedByMonth[monthKey]) {
            groupedByMonth[monthKey] = {};
          }
          
          if (!groupedByMonth[monthKey][dayKey]) {
            groupedByMonth[monthKey][dayKey] = [];
          }
          
          groupedByMonth[monthKey][dayKey].push(item);
        });
        
        // Transform to our GroupedTaskHistory structure
        const groupedHistory: GroupedTaskHistory[] = Object.entries(groupedByMonth).map(([month, days]) => {
          return {
            month,
            days: Object.entries(days).map(([date, tasks]) => {
              // Parse the date to format it nicely
              const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
              const displayDate = format(parsedDate, 'EEEE, MMMM d, yyyy');
              
              return {
                date,
                displayDate,
                tasks,
              };
            }).sort((a, b) => {
              // Sort days newest first
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            }),
          };
        });
        
        setGroupedHistory(groupedHistory);
      } catch (err) {
        console.error('Error fetching task history:', err);
        
        // More detailed error logging
        if (err instanceof Error) {
          console.error('Error details:', err.message);
          if (err.stack) {
            console.error('Stack trace:', err.stack);
          }
          
          // Set more specific error message based on error type
          if (err.message.includes('permission-denied')) {
            setError('You don\'t have permission to access this data. Please contact an administrator.');
          } else if (err.message.includes('not-found')) {
            setError('The requested data was not found. This could be due to missing records.');
          } else if (err.message.includes('network')) {
            setError('Network error. Please check your connection and try again.');
          } else {
            setError(`Failed to load your task history. Error: ${err.message}`);
          }
        } else {
          setError('Failed to load your task history. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaskHistory();
  }, [userId, historyMonths]);

  // Toggle expanded month
  const toggleMonth = (month: string) => {
    setExpandedMonth(expandedMonth === month ? null : month);
    setExpandedDay(null); // Close any expanded day when changing month
  };
  
  // Toggle expanded day
  const toggleDay = (day: string) => {
    setExpandedDay(expandedDay === day ? null : day);
  };
  
  // Toggle calendar/list view
  const toggleView = () => {
    setShowCalendar(!showCalendar);
    // Reset selection when switching views
    if (showCalendar) {
      setShowingSelectedDay(false);
    }
  };
  
  // Handle image click to zoom
  const handleImageClick = (url: string) => {
    setZoomedImage(url);
  };

  // Function to fetch task titles for tasks that don't have them
  const fetchMissingTaskTitles = async (tasks: any[]) => {
    const tasksNeedingTitles = tasks.filter(task => 
      !task.task?.title && 
      !task.title && 
      task.assignedTaskId && 
      !taskTitles[task.assignedTaskId]
    );
    
    if (tasksNeedingTitles.length === 0) return;
    
    const newTitles: Record<string, string> = {...taskTitles};
    
    for (const task of tasksNeedingTitles) {
      try {
        // Get the assigned task
        const assignedTaskRef = doc(db, 'assignedTasks', task.assignedTaskId);
        const assignedTaskSnapshot = await getDoc(assignedTaskRef);
        
        if (!assignedTaskSnapshot.exists()) {
          console.warn(`Assigned task ${task.assignedTaskId} not found`);
          newTitles[task.assignedTaskId] = "Task";
          continue;
        }
        
        const assignedTaskData = assignedTaskSnapshot.data();
        const taskId = assignedTaskData?.taskId as string;
        
        if (!taskId) {
          console.warn(`No taskId found in assigned task ${task.assignedTaskId}`);
          newTitles[task.assignedTaskId] = "Task";
          continue;
        }
        
        // Get the task details
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnapshot = await getDoc(taskRef);
        
        if (!taskSnapshot.exists()) {
          console.warn(`Task ${taskId} not found`);
          newTitles[task.assignedTaskId] = "Task";
          continue;
        }
        
        const taskData = taskSnapshot.data();
        
        if (!taskData || !taskData.title) {
          console.warn(`Task ${taskId} is missing required title field`);
          newTitles[task.assignedTaskId] = "Task";
          continue;
        }
        
        newTitles[task.assignedTaskId] = taskData.title;
      } catch (err) {
        console.error(`Error fetching task title for ${task.assignedTaskId}:`, err);
        newTitles[task.assignedTaskId] = "Task";
      }
    }
    
    setTaskTitles(newTitles);
  };

  // Handle day selection from calendar
  const handleDaySelect = (date: string, tasks: any[]) => {
    if (!date || tasks.length === 0) {
      setShowingSelectedDay(false);
      return;
    }

    console.log("Calendar tasks received:", JSON.stringify(tasks, null, 2));
    setSelectedCalendarDate(date);
    setSelectedCalendarTasks(tasks);
    setShowingSelectedDay(true);
    
    // Fetch any missing task titles
    fetchMissingTaskTitles(tasks);
    
    // Switch to list view if we have selected tasks
    if (showCalendar && tasks.length > 0) {
      setShowCalendar(false);
    }
  };

  if (loading) {
    return (
      <div className="task-history-loading">
        <div className="loading-spinner"></div>
        <p>Loading your task history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-history-error">
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={() => window.location.reload()} className="primary-button">
            Retry
          </button>
          {showCalendar && (
            <button onClick={() => setShowCalendar(false)} className="secondary-button">
              Try List View Instead
            </button>
          )}
          {!showCalendar && (
            <button onClick={() => setShowCalendar(true)} className="secondary-button">
              Try Calendar View Instead
            </button>
          )}
        </div>
      </div>
    );
  }

  if (groupedHistory.length === 0) {
    return (
      <div className="task-history-empty">
        <h3>No Task History</h3>
        <p>You haven't completed any tasks in the past {historyMonths} months.</p>
      </div>
    );
  }

  return (
    <div className="task-history-container">
      <div className="task-history-header">
        <h2>Your Task History</h2>
        <div className="task-history-controls">
          {showingSelectedDay && !showCalendar && (
            <button 
              onClick={() => setShowingSelectedDay(false)} 
              className="back-button"
              title="Back to all history"
            >
              Back to All History
            </button>
          )}
          <button 
            onClick={toggleView} 
            className="view-toggle-button"
            title={showCalendar ? "Show list view" : "Show calendar view"}
          >
            {showCalendar ? "List View" : "Calendar View"}
          </button>
        </div>
      </div>
      
      {showCalendar ? (
        <ErrorBoundary
          fallback={
            <div className="calendar-error">
              <p>Unable to load the calendar view. <button onClick={() => setShowCalendar(false)}>Switch to List View</button></p>
            </div>
          }
        >
          <TaskCompletionCalendar 
            userId={userId} 
            months={historyMonths} 
            onDaySelect={handleDaySelect}
          />
        </ErrorBoundary>
      ) : showingSelectedDay ? (
        // Render just the selected day's tasks
        <div className="task-history-selected-day">
          <div className="selected-day-header">
            <h3>{format(parse(selectedCalendarDate, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d, yyyy')}</h3>
            <span className="task-count">{selectedCalendarTasks.length} tasks</span>
          </div>
          <div className="selected-day-tasks">
            {selectedCalendarTasks.map((taskItem) => {
              console.log("Rendering task item:", taskItem);
              
              // Determine task title from different data sources
              let taskTitle = "Task";
              if (taskItem.task?.title) {
                taskTitle = taskItem.task.title;
              } else if ((taskItem as any).title) {
                taskTitle = (taskItem as any).title;
              } else if ((taskItem as any).assignedTaskId && taskTitles[(taskItem as any).assignedTaskId]) {
                taskTitle = taskTitles[(taskItem as any).assignedTaskId];
              }
              
              return (
                <div key={taskItem.id} className="task-history-item">
                  <div className="task-history-item-header">
                    <h5>Completed - {taskTitle}</h5>
                    <span className="completion-time">
                      {taskItem.completedAt 
                        ? (typeof taskItem.completedAt === 'object' && 'toDate' in taskItem.completedAt 
                            ? format((taskItem.completedAt as any).toDate(), 'h:mm a')
                            : format(new Date(taskItem.completedAt as any), 'h:mm a'))
                        : ''}
                    </span>
                  </div>
                  
                  {/* Instructions can be in different places depending on data source */}
                  {(taskItem.task?.instructions || (taskItem as any).instructions) && (
                    <p className="task-instructions">
                      {taskItem.task?.instructions || (taskItem as any).instructions}
                    </p>
                  )}
                  
                  {taskItem.photoUrl && (
                    <div className="task-photo">
                      <img 
                        src={taskItem.photoUrl} 
                        alt="Task completion" 
                        onClick={() => taskItem.photoUrl && handleImageClick(taskItem.photoUrl)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Regular history list
        <div className="task-history-months">
          {groupedHistory.map(({ month, days }) => (
            <div key={month} className="task-history-month">
              <div 
                className={`month-header ${expandedMonth === month ? 'expanded' : ''}`}
                onClick={() => toggleMonth(month)}
              >
                <h3>{month}</h3>
                <span className="task-count">
                  {days.reduce((acc, day) => acc + day.tasks.length, 0)} tasks
                </span>
                <span className="expand-icon">{expandedMonth === month ? '−' : '+'}</span>
              </div>
              
              {expandedMonth === month && (
                <div className="task-history-days">
                  {days.map(({ date, displayDate, tasks }) => (
                    <div key={date} className="task-history-day">
                      <div 
                        className={`day-header ${expandedDay === date ? 'expanded' : ''}`}
                        onClick={() => toggleDay(date)}
                      >
                        <h4>{displayDate}</h4>
                        <span className="task-count">{tasks.length} tasks</span>
                        <span className="expand-icon">{expandedDay === date ? '−' : '+'}</span>
                      </div>
                      
                      {expandedDay === date && (
                        <div className="task-history-items">
                          {tasks.map((taskItem) => (
                            <div key={taskItem.id} className="task-history-item">
                              <div className="task-history-item-header">
                                <h5>{taskItem.task?.title || "Completed Task"}</h5>
                                <span className="completion-time">
                                  {taskItem.completedAt 
                                    ? (typeof taskItem.completedAt === 'object' && 'toDate' in taskItem.completedAt 
                                        ? format((taskItem.completedAt as any).toDate(), 'h:mm a')
                                        : format(new Date(taskItem.completedAt as any), 'h:mm a'))
                                    : ''}
                                </span>
                              </div>
                              
                              {taskItem.task?.instructions && (
                                <p className="task-instructions">{taskItem.task?.instructions}</p>
                              )}
                              
                              {taskItem.photoUrl && (
                                <div className="task-photo">
                                  <img 
                                    src={taskItem.photoUrl} 
                                    alt="Task completion" 
                                    onClick={() => taskItem.photoUrl && handleImageClick(taskItem.photoUrl)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {zoomedImage && (
        <ImageModal 
          imageUrl={zoomedImage} 
          onClose={() => setZoomedImage(null)} 
        />
      )}
    </div>
  );
}; 