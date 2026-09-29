/**
 * Pure logic for project initialization.
 * No I/O — provides validation and content transformation.
 */

/**
 * Validate project name for use as a directory name.
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateProjectName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Project name is required' };
  }

  if (name.trim() !== name) {
    return { valid: false, error: 'Project name must not have leading or trailing spaces' };
  }

  if (/[<>:"/\\|?*]/.test(name)) {
    return { valid: false, error: 'Project name contains invalid characters' };
  }

  if (name.startsWith('.') || name.startsWith('_')) {
    return { valid: false, error: 'Project name must not start with . or _' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'Project name must be 100 characters or fewer' };
  }

  return { valid: true };
}

/**
 * Validate a project short name for use in Feature IDs and worktree paths.
 * Short names keep IDs (e.g. `MYAPP-001`) and worktree paths readable
 * even when the full project name is long.
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateProjectShortname(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Project short name is required' };
  }

  if (name.trim() !== name) {
    return { valid: false, error: 'Project short name must not have leading or trailing spaces' };
  }

  if (/[<>:"/\\|?*]/.test(name)) {
    return { valid: false, error: 'Project short name contains invalid characters' };
  }

  if (name.startsWith('.') || name.startsWith('_')) {
    return { valid: false, error: 'Project short name must not start with . or _' };
  }

  if (name.length > 5) {
    return { valid: false, error: 'Project short name must be 5 characters or fewer' };
  }

  return { valid: true };
}

/**
 * @typedef {Object} ProjectConfig
 * @property {string} [projectName] - Project name
 * @property {string} [projectShortname] - Short project identifier used in Feature IDs and
 *   worktree paths. Falls back to projectName when not provided.
 * @property {string} [organization] - Organization name
 * @property {string} [language] - Primary language
 * @property {string} [moduleId] - Language-specific module/package identifier
 * @property {string} [repository] - Git repository URL
 * @property {string[]} [standards] - Standards to wire into .aiconfig.json
 */

/**
 * Apply all project substitutions to file content.
 * Replaces template placeholders with actual values.
 * Unfilled placeholders are left as-is for manual completion.
 * @param {string} content - File content from the template
 * @param {ProjectConfig} config - Project configuration values
 * @returns {string} Content with substitutions applied
 */
export function applyProjectConfig(content, config) {
  let result = content;

  if (config.projectName) {
    result = result.replace(/\{ProjectName\}/g, config.projectName);
    result = result.replace(/my-project/g, config.projectName);
  }

  const shortname = config.projectShortname || config.projectName;
  if (shortname) {
    result = result.replace(/\{ProjectShortName\}/g, shortname);
  }

  if (config.organization) {
    result = result.replace(/\{Organization\}/g, config.organization);
  }

  if (config.language) {
    result = result.replace(/\{Language\}/g, config.language);
  }

  if (config.moduleId) {
    result = result.replace(/\{ModuleID\}/g, config.moduleId);
  }

  if (config.repository) {
    result = result.replace(/\{Repository\}/g, config.repository);
  }

  // Date substitution
  const today = new Date().toISOString().slice(0, 10);
  result = result.replace(/\{YYYY-MM-DD\}/g, today);

  return result;
}

/**
 * Build the .aiconfig.json content with project configuration.
 * @param {ProjectConfig} config - Project configuration values
 * @returns {string} JSON string for .aiconfig.json
 */
export function buildAiConfig(config) {
  const shortname = config.projectShortname || config.projectName || '';

  const aiconfig = {
    project_name: config.projectName || '',
    project_shortname: shortname,
    repo_type: 'project',
    language: config.language || '',
    standards: {
      engineering: config.standards || [],
      all: [],
    },
    project_standards: '',
    paths: {
      plans: 'plans',
      features: 'plans/features',
      decisions: 'knowledge/decisions',
      knowledge: 'knowledge',
      architecture: 'knowledge/architecture',
      research: 'knowledge/research',
      worktrees: `../worktrees/${shortname}`,
    },
  };

  return JSON.stringify(aiconfig, null, 2) + '\n';
}

/**
 * Backward-compatible wrapper for applyProjectConfig.
 * @param {string} content - File content from the template
 * @param {string} projectName - The actual project name
 * @returns {string} Content with substitutions applied
 */
export function applyProjectName(content, projectName) {
  return applyProjectConfig(content, { projectName });
}
