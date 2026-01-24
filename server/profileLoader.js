import fs from "fs";
import path from "path";

/**
 * Load a business or internal profile from the correct directory
 * Checks internalProfiles first, then businessProfiles
 */
export function loadProfile(businessName) {
  // Try internal profiles first (for HR, IT, etc.)
  const internalPath = path.resolve(`server/internalProfiles/${businessName}.json`);
  if (fs.existsSync(internalPath)) {
    const data = fs.readFileSync(internalPath, "utf-8");
    return JSON.parse(data);
  }

  // Try business profiles
  const businessPath = path.resolve(`server/businessProfiles/${businessName}.json`);
  if (fs.existsSync(businessPath)) {
    const data = fs.readFileSync(businessPath, "utf-8");
    return JSON.parse(data);
  }

  // Try with Demo suffix
  const demoPath = path.resolve(`server/businessProfiles/${businessName}Demo.json`);
  if (fs.existsSync(demoPath)) {
    const data = fs.readFileSync(demoPath, "utf-8");
    return JSON.parse(data);
  }

  throw new Error(`Profile not found: ${businessName}`);
}

/**
 * Get the correct file path for a business or internal profile
 */
export function getProfilePath(businessName) {
  const internalPath = path.resolve(`server/internalProfiles/${businessName}.json`);
  if (fs.existsSync(internalPath)) {
    return internalPath;
  }

  const businessPath = path.resolve(`server/businessProfiles/${businessName}.json`);
  if (fs.existsSync(businessPath)) {
    return businessPath;
  }

  const demoPath = path.resolve(`server/businessProfiles/${businessName}Demo.json`);
  if (fs.existsSync(demoPath)) {
    return demoPath;
  }

  // Return internal path if it's a new internal profile
  if (businessName.includes('HR') || businessName.includes('IT') || businessName.includes('Internal')) {
    return internalPath;
  }

  // Default to business profiles
  return businessPath;
}

/**
 * Save a profile to the correct location
 */
export function saveProfile(businessName, profileData) {
  const filePath = getProfilePath(businessName);
  fs.writeFileSync(filePath, JSON.stringify(profileData, null, 2));
}
