import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  format, 
  parse, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  getMonth,
  getYear,
  getDay,
  isSameMonth
} from 'date-fns';
import { db } from '../../firebase/config';
import { CalendarData, TaskHistoryItem } from '../../types';
import '../../styles/calendar.css';

type CompletedTask = {
  id: string;
  date: string;
  assignedTaskId: string;
  title?: string;
  photoUrl?: string;
  instructions?: string;
  completedAt: any;
};

interface TaskCompletionCalendarProps {
  userId: string;
  months?: number; // Number of months to display (default: 6)
  onDaySelect?: (date: string, tasks: CompletedTask[]) => void; // Callback for day selection
}

export const TaskCompletionCalendar = ({ userId, months = 6, onDaySelect }: TaskCompletionCalendarProps) => {
  const [calendarData, setCalendarData] = useState<Record<string, CalendarData[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<number>(0);
  const [dailyTasks, setDailyTasks] = useState<Record<string, TaskHistoryItem[]>>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availableMonths, setAvailableMonths] = useState<Date[]>([]);

  useEffect(() => {
    const fetchTaskCompletionData = async () => {
      setLoading(true);
      
      try {
        // Calculate date range - today to X months ago
        const endDate = new Date();
        const startDate = subMonths(endDate, months);
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');

        // Query all completed tasks in the date range
        const tasksRef = collection(db, `users/${userId}/dailyTasks`);
        const completedTasksQuery = query(
          tasksRef,
          where('isCompleted', '==', true),
          where('date', '>=', formattedStartDate),
          where('date', '<=', formattedEndDate)
        );
        
        const tasksSnapshot = await getDocs(completedTasksQuery);
        
        // Count tasks per day and collect task details
        const taskCountByDate: Record<string, number> = {};
        const tasksByDate: Record<string, any[]> = {};
        const monthsWithData: Set<string> = new Set();
        
        tasksSnapshot.forEach(doc => {
          const data = doc.data();
          const date = data.date; // This is already in yyyy-MM-dd format
          
          if (!taskCountByDate[date]) {
            taskCountByDate[date] = 0;
            tasksByDate[date] = [];
          }
          
          taskCountByDate[date]++;
          
          // Store basic task info for later retrieval
          tasksByDate[date].push({
            id: doc.id,
            ...data
          });
          
          // Keep track of which months have data
          const monthKey = date.substring(0, 7); // YYYY-MM format
          monthsWithData.add(monthKey);
        });
        
        // Get the maximum count by month for scaling
        const monthlyData: Record<string, CalendarData[]> = {};
        const monthDateObjs: Date[] = [];
        
        // Create month date objects for display
        Array.from(monthsWithData).sort().forEach(monthStr => {
          const [year, month] = monthStr.split('-').map(Number);
          monthDateObjs.push(new Date(year, month - 1, 1));
        });
        
        // If no data, add current month
        if (monthDateObjs.length === 0) {
          monthDateObjs.push(new Date());
        }

        // Set the current month to the most recent month with data
        const mostRecentMonth = monthDateObjs[monthDateObjs.length - 1];
        setCurrentMonth(mostRecentMonth);
        setAvailableMonths(monthDateObjs);
        
        // Process each month's data
        monthDateObjs.forEach(monthDate => {
          const monthKey = format(monthDate, 'yyyy-MM');
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          // Get days in this month
          const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
          
          // Calculate the max count for this month for scaling
          const datesInThisMonth = daysInMonth.map(day => format(day, 'yyyy-MM-dd'));
          const countsInThisMonth = datesInThisMonth
            .map(date => taskCountByDate[date] || 0)
            .filter(count => count > 0);
          
          const maxForMonth = countsInThisMonth.length > 0 
            ? Math.max(...countsInThisMonth) 
            : 0;
            
          // Create the calendar data array for this month
          const monthData: CalendarData[] = daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const count = taskCountByDate[dateStr] || 0;
            
            // Calculate level (0-4) where 0 is no activity and 4 is maximum
            let level = 0;
            if (count > 0) {
              if (maxForMonth <= 4) {
                level = count; // Direct mapping for small counts
              } else {
                level = Math.ceil((count / maxForMonth) * 4); // Scale to 1-4
              }
            }
            
            return {
              date: dateStr,
              count,
              level
            };
          });
          
          monthlyData[monthKey] = monthData;
        });
        
        setCalendarData(monthlyData);
        setDailyTasks(tasksByDate);
      } catch (error) {
        console.error('Error fetching task completion data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaskCompletionData();
  }, [userId, months]);

  // Generate calendar data for the current month view
  const generateMonthCalendar = () => {
    if (!calendarData || Object.keys(calendarData).length === 0) return [];
    
    const monthKey = format(currentMonth, 'yyyy-MM');
    const monthData = calendarData[monthKey] || [];
    
    if (monthData.length === 0) return [];
    
    const firstDayOfMonth = startOfMonth(currentMonth);
    const startingDayOfWeek = getDay(firstDayOfMonth); // 0 = Sunday, 1 = Monday, etc.
    
    // Create array for all days in the month plus empty cells for leading days
    const calendarArray: (CalendarData | null)[] = Array(startingDayOfWeek).fill(null);
    
    // Add the actual days
    monthData.forEach(dayData => {
      calendarArray.push(dayData);
    });
    
    // Calculate how many rows we need (6 to be safe - some months can span 6 weeks)
    const totalCells = 6 * 7;
    // Add trailing empty cells if needed
    while (calendarArray.length < totalCells) {
      calendarArray.push(null);
    }
    
    // Group by weeks
    const weeks: (CalendarData | null)[][] = [];
    for (let i = 0; i < calendarArray.length; i += 7) {
      weeks.push(calendarArray.slice(i, i + 7));
    }
    
    return weeks;
  };

  // Handle day click
  const handleCellClick = (data: CalendarData | null) => {
    if (!data || data.count === 0) {
      setSelectedDate(null);
      setSelectedTasks(0);
      if (onDaySelect) {
        onDaySelect('', []);
      }
      return;
    }
    
    setSelectedDate(data.date);
    setSelectedTasks(data.count);
    
    // If we have a callback and tasks for this day, call it
    if (onDaySelect && dailyTasks[data.date]) {
      console.log("Calendar sending task data:", JSON.stringify(dailyTasks[data.date], null, 2));
      // Convert TaskHistoryItem[] to CompletedTask[]
      const tasks = dailyTasks[data.date].map(task => ({
        id: task.id,
        date: task.date,
        assignedTaskId: task.assignedTaskId,
        title: task.task?.title,
        photoUrl: task.photoUrl,
        instructions: task.task?.instructions,
        completedAt: task.completedAt
      }));
      onDaySelect(data.date, tasks);
    }
  };

  // Get CSS class for level
  const getLevelClass = (level: number) => {
    return `calendar-cell-level-${level}`;
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    // Check if the previous month is in our available months
    if (availableMonths.some(m => 
        getMonth(m) === getMonth(prevMonth) && 
        getYear(m) === getYear(prevMonth))) {
      setCurrentMonth(prevMonth);
    }
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const nextMonth = addMonths(currentMonth, 1);
    // Check if the next month is in our available months and not in the future
    const now = new Date();
    if (availableMonths.some(m => 
        getMonth(m) === getMonth(nextMonth) && 
        getYear(m) === getYear(nextMonth)) && 
        (getYear(nextMonth) < getYear(now) || 
        (getYear(nextMonth) === getYear(now) && getMonth(nextMonth) <= getMonth(now)))) {
      setCurrentMonth(nextMonth);
    }
  };

  // Select a specific month
  const selectMonth = (monthDate: Date) => {
    setCurrentMonth(monthDate);
  };

  const weeks = generateMonthCalendar();

  if (loading) {
    return <div className="calendar-loading">Loading activity data...</div>;
  }

  return (
    <div className="task-completion-calendar">
      <div className="calendar-header">
        <h3>Task Completion History</h3>
        {selectedDate && (
          <div className="calendar-tooltip" key={selectedDate}>
            <strong>{format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}:</strong> {selectedTasks} tasks completed
          </div>
        )}
      </div>
      
      <div className="calendar-container">
        {/* Month navigation */}
        <div className="calendar-month-navigation">
          <button 
            className="month-nav-button" 
            onClick={goToPreviousMonth}
            disabled={!availableMonths.some(m => 
              getMonth(m) === getMonth(subMonths(currentMonth, 1)) && 
              getYear(m) === getYear(subMonths(currentMonth, 1))
            )}
          >
            &larr;
          </button>
          <h4 className="current-month">{format(currentMonth, 'MMMM yyyy')}</h4>
          <button 
            className="month-nav-button" 
            onClick={goToNextMonth}
            disabled={!availableMonths.some(m => 
              getMonth(m) === getMonth(addMonths(currentMonth, 1)) && 
              getYear(m) === getYear(addMonths(currentMonth, 1))
            ) || getMonth(addMonths(currentMonth, 1)) > getMonth(new Date()) && getYear(addMonths(currentMonth, 1)) >= getYear(new Date())}
          >
            &rarr;
          </button>
        </div>
        
        {/* Month selector */}
        <div className="months-selector">
          {availableMonths.map(month => (
            <button 
              key={format(month, 'yyyy-MM')}
              className={isSameMonth(month, currentMonth) ? 'active-month' : ''}
              onClick={() => selectMonth(month)}
            >
              {format(month, 'MMM')}
            </button>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="calendar-grid">
          {/* Weekday headers */}
          <div className="weekday-header">M</div>
          <div className="weekday-header">T</div>
          <div className="weekday-header">W</div>
          <div className="weekday-header">T</div>
          <div className="weekday-header">F</div>
          <div className="weekday-header">S</div>
          <div className="weekday-header">S</div>
          
          {/* Calendar days - each day is directly in the grid */}
          {weeks.map((week, weekIndex) => 
            week.map((dayData, dayIndex) => {
              if (dayData === null) {
                // Empty cell
                return <div key={`${weekIndex}-${dayIndex}`} className="calendar-day empty"></div>;
              }
              
              const level = dayData.level || 0;
              const isSelected = selectedDate === dayData.date;
              const hasTasksToday = dayData && dayData.count > 0;
              const dayNum = parseInt(dayData.date.split('-')[2], 10);
              
              return (
                <div 
                  key={`${weekIndex}-${dayIndex}`}
                  className={`calendar-day ${getLevelClass(level)} ${isSelected ? 'selected' : ''}`}
                  title={`${format(parse(dayData.date, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}: ${dayData.count || 0} tasks`}
                  onClick={() => handleCellClick(dayData)}
                  aria-label={hasTasksToday ? `View tasks for ${format(parse(dayData.date, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}` : undefined}
                  role={hasTasksToday ? 'button' : undefined}
                  tabIndex={hasTasksToday ? 0 : undefined}
                >
                  <span className="day-number">{dayNum}</span>
                  <span className="calendar-day-tooltip">
                    {format(parse(dayData.date, 'yyyy-MM-dd', new Date()), 'MMM d')}: {dayData.count || 0} tasks
                  </span>
                </div>
              );
            })
          )}
        </div>
        
        {/* Calendar legend */}
        <div className="calendar-legend">
          <div className="legend-header">Activity Level:</div>
          <div className="legend-items">
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className="legend-item">
                <div className={`legend-color level-${level}`}></div>
                <div className="legend-label">
                  {level === 0 ? 'None' : 
                   level === 1 ? '1-2 tasks' : 
                   level === 2 ? '3-4 tasks' : 
                   level === 3 ? '5-6 tasks' : '7+ tasks'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 