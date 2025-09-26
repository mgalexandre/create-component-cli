#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access, mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Helper function to check if a path exists
async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Function to find the components directory
async function findComponentsDir() {
  const currentDir = process.cwd();

  // Common component directory patterns in Next.js projects
  const possiblePaths = [
    join(currentDir, "components"),
    join(currentDir, "src", "components"),
    join(currentDir, "app", "components"),
    join(currentDir, "src", "app", "components"),
    join(currentDir, "lib", "components"),
    join(currentDir, "src", "lib", "components"),
  ];

  // Check each possible path
  for (const path of possiblePaths) {
    if (await exists(path)) {
      const stats = await stat(path);
      if (stats.isDirectory()) {
        return path;
      }
    }
  }

  // If no components folder found, offer to create one
  const createPath = join(currentDir, "src", "components");
  console.log(`📁 No components folder found. Creating: ${createPath}`);
  await mkdir(createPath, { recursive: true });
  return createPath;
}

// Get component name from command line arguments
const componentName = process.argv[2];

if (!componentName) {
  console.error("❌ Please provide a component name");
  console.log("Usage: create-component ComponentName");
  process.exit(1);
}

// Validate component name (should be PascalCase)
if (!/^[A-Z][a-zA-Z0-9]*$/.test(componentName)) {
  console.error(
    "❌ Component name should be in PascalCase (e.g., ExampleButton)"
  );
  process.exit(1);
}

// Convert PascalCase to kebab-case for SCSS file
const scssFileName = componentName
  .replace(/([A-Z])/g, "-$1")
  .toLowerCase()
  .substring(1);

// Find the components directory
const componentsDir = await findComponentsDir();

// Define paths
const componentDir = join(componentsDir, componentName);
const tsxFile = join(componentDir, `${componentName}.tsx`);
const scssFile = join(componentDir, `_${scssFileName}.scss`);

// Check if component already exists
if (await exists(componentDir)) {
  console.error(`❌ Component "${componentName}" already exists`);
  process.exit(1);
}

// TypeScript component template
const tsxTemplate = `import "./_${scssFileName}.scss";

export default function ${componentName}() {
  return (
    <div className="${scssFileName}">
      <h1>${componentName}</h1>
    </div>
  );
}
`;

// SCSS template
const scssTemplate = `.${scssFileName} {
  // Add your styles here
  
}
`;

try {
  // Create component directory
  await mkdir(componentDir, { recursive: true });

  // Create TypeScript file
  await writeFile(tsxFile, tsxTemplate);

  // Create SCSS file
  await writeFile(scssFile, scssTemplate);

  console.log(`✅ Component "${componentName}" created successfully!`);
  console.log(`📁 Created in: ${componentsDir}/`);
  console.log(`📄 Created: ${componentName}/${componentName}.tsx`);
  console.log(`🎨 Created: ${componentName}/_${scssFileName}.scss`);
} catch (error) {
  console.error("❌ Error creating component:", error.message);

  // Cleanup on error
  try {
    const rmProcess = spawn("rm", ["-rf", componentDir]);
    await new Promise((resolve, reject) => {
      rmProcess.on("close", resolve);
      rmProcess.on("error", reject);
    });
  } catch {}

  process.exit(1);
}
