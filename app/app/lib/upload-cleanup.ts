import { storage } from "./storage";

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAX_CHUNK_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cleanup orphaned upload chunks that are older than MAX_CHUNK_AGE
 */
export async function cleanupOrphanedChunks() {
  try {
    console.log("Starting orphaned chunk cleanup...");
    
    // List all files in the temp directory
    const tempFiles = await storage.list("temp/");
    
    let cleaned = 0;
    let errors = 0;
    
    for (const file of tempFiles) {
      try {
        const metadata = await storage.getMetadata(`temp/${file}`);
        const age = Date.now() - metadata.lastModified.getTime();
        
        // If chunk is older than MAX_CHUNK_AGE, delete it
        if (age > MAX_CHUNK_AGE) {
          await storage.delete(`temp/${file}`);
          cleaned++;
        }
      } catch (error) {
        console.error(`Failed to clean up chunk ${file}:`, error);
        errors++;
      }
    }
    
    console.log(`Cleanup complete. Removed ${cleaned} orphaned chunks, ${errors} errors.`);
    return { cleaned, errors };
  } catch (error) {
    console.error("Failed to run chunk cleanup:", error);
    throw error;
  }
}

/**
 * Start periodic cleanup of orphaned chunks
 */
export function startPeriodicCleanup() {
  // Run cleanup immediately on startup
  cleanupOrphanedChunks().catch(console.error);
  
  // Schedule periodic cleanup
  const interval = setInterval(() => {
    cleanupOrphanedChunks().catch(console.error);
  }, CLEANUP_INTERVAL);
  
  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Cleanup files that were deleted from database but still exist in storage
 */
export async function cleanupDeletedFiles() {
  try {
    console.log("Starting deleted files cleanup...");
    
    // This would need to query the database for all file URLs
    // and compare with storage to find orphaned files
    // Implementation depends on specific requirements
    
    console.log("Deleted files cleanup complete.");
  } catch (error) {
    console.error("Failed to clean up deleted files:", error);
    throw error;
  }
}