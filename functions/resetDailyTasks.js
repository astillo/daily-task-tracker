import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Firebase Cloud Function that runs at 11:59 PM CST every day
 * to reset all daily tasks for the next day.
 * 
 * This function creates a new batch of incomplete task records for
 * each employee for the new day, based on their task assignments.
 * It also resets recurring personal tasks created by employees.
 */
export const resetDailyTasks = functions.pubsub.schedule("59 23 * * *")
  .timeZone("America/Chicago") // CST timezone
  .onRun(async () => {
    try {
      const db = admin.firestore();
      
      // Calculate tomorrow's date in yyyy-MM-dd format
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowFormatted = tomorrow.toISOString().split("T")[0];
      
      console.log(`Preparing task reset for ${tomorrowFormatted}`);
      
      // PART 1: Reset assigned tasks
      // Get all assigned tasks
      const assignedTasksSnapshot = await db.collection("assignedTasks").get();
      
      if (!assignedTasksSnapshot.empty) {
        // For each assigned task, create a new daily task entry for tomorrow
        const batch = db.batch();
        
        for (const assignedTaskDoc of assignedTasksSnapshot.docs) {
          const assignedTaskData = assignedTaskDoc.data();
          const userId = assignedTaskData.userId;
          
          // Create a new dailyTask document for tomorrow
          const dailyTaskRef = db
            .collection(`users/${userId}/dailyTasks`)
            .doc();
            
          batch.set(dailyTaskRef, {
            assignedTaskId: assignedTaskDoc.id,
            userId: userId,
            date: tomorrowFormatted,
            isCompleted: false,
            // No completedAt or photoUrl initially
          });
        }
        
        // Commit the batch
        await batch.commit();
        
        console.log(`Successfully reset ${assignedTasksSnapshot.size} assigned tasks for ${tomorrowFormatted}`);
      } else {
        console.log("No assigned tasks found to reset.");
      }
      
      // PART 2: Reset recurring personal tasks
      // Get all users
      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get all recurring personal tasks for the user that are completed
        const personalTasksSnapshot = await db
          .collection(`users/${userId}/personalTasks`)
          .where("isRecurring", "==", true)
          .where("status", "==", "completed")
          .get();
        
        if (!personalTasksSnapshot.empty) {
          // Create a batch for each user
          const personalBatch = db.batch();
          
          // Reset each recurring task
          for (const taskDoc of personalTasksSnapshot.docs) {
            const taskRef = db.collection(`users/${userId}/personalTasks`).doc(taskDoc.id);
            
            personalBatch.update(taskRef, {
              status: "pending",
              completedAt: null,
              photoUrl: null
            });
          }
          
          // Commit the batch
          await personalBatch.commit();
          
          console.log(`Reset ${personalTasksSnapshot.size} recurring personal tasks for user ${userId}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error resetting daily tasks:", error);
      return null;
    }
  });

/**
 * HTTP Function for manual reset (can be triggered manually if needed)
 */
export const manualResetTasks = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    
    const db = admin.firestore();
    
    // Calculate today's date in yyyy-MM-dd format
    const today = new Date();
    const todayFormatted = today.toISOString().split("T")[0];
    
    // PART 1: Reset assigned tasks
    const assignedTasksSnapshot = await db.collection("assignedTasks").get();
    
    if (!assignedTasksSnapshot.empty) {
      // For each assigned task, create a new daily task entry for today
      const batch = db.batch();
      
      for (const assignedTaskDoc of assignedTasksSnapshot.docs) {
        const assignedTaskData = assignedTaskDoc.data();
        const userId = assignedTaskData.userId;
        
        // Create a new dailyTask document for today
        const dailyTaskRef = db
          .collection(`users/${userId}/dailyTasks`)
          .doc();
          
        batch.set(dailyTaskRef, {
          assignedTaskId: assignedTaskDoc.id,
          userId: userId,
          date: todayFormatted,
          isCompleted: false,
        });
      }
      
      // Commit the batch
      await batch.commit();
      
      res.status(200).send(`Successfully reset ${assignedTasksSnapshot.size} assigned tasks for ${todayFormatted}`);
    } else {
      res.status(200).send("No assigned tasks found to reset.");
    }
    
    // PART 2: Reset recurring personal tasks
    // Get all users
    const usersSnapshot = await db.collection("users").get();
    let totalPersonalTasks = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Get all recurring personal tasks for the user that are completed
      const personalTasksSnapshot = await db
        .collection(`users/${userId}/personalTasks`)
        .where("isRecurring", "==", true)
        .where("status", "==", "completed")
        .get();
      
      if (!personalTasksSnapshot.empty) {
        // Create a batch for each user
        const personalBatch = db.batch();
        
        // Reset each recurring task
        for (const taskDoc of personalTasksSnapshot.docs) {
          const taskRef = db.collection(`users/${userId}/personalTasks`).doc(taskDoc.id);
          
          personalBatch.update(taskRef, {
            status: "pending",
            completedAt: null,
            photoUrl: null
          });
        }
        
        // Commit the batch
        await personalBatch.commit();
        totalPersonalTasks += personalTasksSnapshot.size;
      }
    }
    
    res.status(200).send(`Successfully reset ${assignedTasksSnapshot.size} assigned tasks and ${totalPersonalTasks} personal tasks for ${todayFormatted}`);
    
  } catch (error) {
    console.error("Error in manual reset:", error);
    if (error instanceof Error) {
      res.status(500).send(`Internal Server Error: ${error.message}`);
    } else {
      res.status(500).send(`Internal Server Error: ${error}`);
    }
  }
}); 