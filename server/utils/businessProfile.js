import fs from "fs";
import path from "path";

/**
 * Load a business profile from the businessProfiles directory
 * Automatically tries adding "Demo" suffix if the exact name is not found
 * @param {string} businessName - The name of the business profile to load
 * @returns {object} The parsed business profile JSON
 * @throws {Error} If the profile cannot be found or loaded
 */
export function loadBusinessProfile(businessName) {
  try {
    let filePath = path.resolve(`server/businessProfiles/${businessName}.json`);
    
    // If file doesn't exist, try adding "Demo" suffix
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(`server/businessProfiles/${businessName}Demo.json`);
    }
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Business profile not found: ${businessName}`);
    }
    
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading business profile:", error.message);
    throw error;
  }
}
