const semver = require('semver');

/**
 * semantic-release 自定义插件：三分支版本管理
 * 实现 alpha -> beta -> main 的版本递增逻辑
 */

async function analyzeCommits(pluginConfig, context) {
  const { cwd, logger, branch, lastRelease } = context;
  
  // 获取当前分支
  const currentBranch = branch.name;
  logger.log(`🔍 [VERSION-MANAGER] Current branch: ${currentBranch}`);
  logger.log(`🔍 [VERSION-MANAGER] Last release: ${lastRelease ? lastRelease.version : 'none'}`);
  
  try {
    const { execa } = await import('execa');
    
    // 获取所有标签
    const { stdout: allTags } = await execa('git', ['tag', '-l', '--sort=-version:refname'], { cwd });
    const tags = allTags.split('\n').filter(tag => tag.trim());
    
    // 分类标签
    const mainTags = tags.filter(tag => !tag.includes('-'));
    const betaTags = tags.filter(tag => tag.includes('-beta.'));
    const alphaTags = tags.filter(tag => tag.includes('-alpha.'));
    
    logger.log(`🔍 [VERSION-MANAGER] All tags (first 10): ${tags.slice(0, 10).join(', ')}`);
    logger.log(`🔍 [VERSION-MANAGER] Main tags: ${mainTags.slice(0, 3).join(', ')}`);
    logger.log(`🔍 [VERSION-MANAGER] Beta tags: ${betaTags.slice(0, 3).join(', ')}`);
    logger.log(`🔍 [VERSION-MANAGER] Alpha tags: ${alphaTags.slice(0, 3).join(', ')}`);
    
    // 根据当前分支决定版本策略
    const versionStrategy = determineVersionStrategy(currentBranch, {
      mainTags,
      betaTags,
      alphaTags,
      lastRelease
    }, logger);
    
    if (versionStrategy) {
      logger.log(`🚀 [VERSION-MANAGER] Applying version strategy: ${versionStrategy.type} (reason: ${versionStrategy.reason})`);
      return versionStrategy.type;
    }
    
  } catch (error) {
    logger.error('❌ [VERSION-MANAGER] Error checking version tags:', error);
  }
  
  logger.log(`ℹ️ [VERSION-MANAGER] No custom version strategy needed, using default analysis`);
  return null;
}

function determineVersionStrategy(currentBranch, { mainTags, betaTags, alphaTags, lastRelease }, logger) {
  const latestMain = mainTags[0];
  const latestBeta = betaTags[0];
  const latestAlpha = alphaTags[0];
  
  logger.log(`🔍 [VERSION-MANAGER] Latest versions - Main: ${latestMain || 'none'}, Beta: ${latestBeta || 'none'}, Alpha: ${latestAlpha || 'none'}`);
  
  if (currentBranch === 'alpha') {
    return handleAlphaVersioning(latestMain, latestBeta, latestAlpha, lastRelease, logger);
  } else if (currentBranch === 'beta') {
    return handleBetaVersioning(latestMain, latestBeta, latestAlpha, lastRelease, logger);
  } else if (currentBranch === 'main') {
    return handleMainVersioning(latestMain, latestBeta, logger);
  }
  
  return null;
}

function handleAlphaVersioning(latestMain, latestBeta, latestAlpha, lastRelease, logger) {
  // Alpha 分支逻辑：检查是否需要因为 beta 或 main 发布而重置版本
  
  if (!latestAlpha) {
    logger.log(`📝 [ALPHA] No previous alpha releases, using default versioning`);
    return null;
  }
  
  const alphaVersion = semver.parse(latestAlpha);
  if (!alphaVersion) {
    logger.log(`❌ [ALPHA] Cannot parse alpha version: ${latestAlpha}`);
    return null;
  }
  
  const alphaBase = `${alphaVersion.major}.${alphaVersion.minor}.${alphaVersion.patch}`;
  logger.log(`🔍 [ALPHA] Current alpha base version: ${alphaBase}`);
  
  // 检查是否有更高优先级的发布
  let shouldBump = false;
  let bumpReason = '';
  
  if (latestBeta) {
    const betaVersion = semver.parse(latestBeta);
    if (betaVersion) {
      const betaBase = `${betaVersion.major}.${betaVersion.minor}.${betaVersion.patch}`;
      logger.log(`🔍 [ALPHA] Latest beta base version: ${betaBase}`);
      
      // 如果 beta 发布了相同或更高版本，alpha 需要递增
      if (semver.gte(`${betaBase}`, alphaBase)) {
        shouldBump = true;
        bumpReason = `Beta ${latestBeta} >= Alpha ${alphaBase}`;
      }
    }
  }
  
  if (latestMain && !shouldBump) {
    const mainVersion = semver.parse(latestMain);
    if (mainVersion) {
      const mainBase = `${mainVersion.major}.${mainVersion.minor}.${mainVersion.patch}`;
      logger.log(`🔍 [ALPHA] Latest main base version: ${mainBase}`);
      
      // 如果 main 发布了相同或更高版本，alpha 需要递增
      if (semver.gte(`${mainBase}`, alphaBase)) {
        shouldBump = true;
        bumpReason = `Main ${latestMain} >= Alpha ${alphaBase}`;
      }
    }
  }
  
  if (shouldBump) {
    logger.log(`🚀 [ALPHA] Version bump needed: ${bumpReason}`);
    return {
      type: 'minor',
      reason: bumpReason
    };
  }
  
  logger.log(`✅ [ALPHA] No version bump needed, continuing with patch increments`);
  return null;
}

function handleBetaVersioning(latestMain, latestBeta, latestAlpha, lastRelease, logger) {
  // Beta 分支逻辑：检查是否需要因为 main 发布而重置版本
  
  if (!latestBeta) {
    logger.log(`📝 [BETA] No previous beta releases, using default versioning`);
    return null;
  }
  
  const betaVersion = semver.parse(latestBeta);
  if (!betaVersion) {
    logger.log(`❌ [BETA] Cannot parse beta version: ${latestBeta}`);
    return null;
  }
  
  const betaBase = `${betaVersion.major}.${betaVersion.minor}.${betaVersion.patch}`;
  logger.log(`🔍 [BETA] Current beta base version: ${betaBase}`);
  
  if (latestMain) {
    const mainVersion = semver.parse(latestMain);
    if (mainVersion) {
      const mainBase = `${mainVersion.major}.${mainVersion.minor}.${mainVersion.patch}`;
      logger.log(`🔍 [BETA] Latest main base version: ${mainBase}`);
      
      // 如果 main 发布了相同或更高版本，beta 需要递增
      if (semver.gte(`${mainBase}`, betaBase)) {
        const bumpReason = `Main ${latestMain} >= Beta ${betaBase}`;
        logger.log(`🚀 [BETA] Version bump needed: ${bumpReason}`);
        return {
          type: 'minor',
          reason: bumpReason
        };
      }
    }
  }
  
  logger.log(`✅ [BETA] No version bump needed, continuing with patch increments`);
  return null;
}

function handleMainVersioning(latestMain, latestBeta, logger) {
  // Main 分支通常不需要特殊的版本管理，使用标准的 semantic-release 逻辑
  logger.log(`✅ [MAIN] Using standard semantic versioning`);
  return null;
}

async function generateNotes(pluginConfig, context) {
  const { logger, branch, nextRelease } = context;
  
  if (!nextRelease) return null;
  
  const currentBranch = branch.name;
  logger.log(`📝 [NOTES] Generating notes for ${currentBranch} branch, version: ${nextRelease.version}`);
  
  if (currentBranch === 'alpha' && nextRelease.type === 'minor') {
    logger.log(`📝 [NOTES] Adding new alpha cycle notes`);
    return `### 🚀 New Alpha Development Cycle

This alpha version starts a new development cycle after upstream releases.

${nextRelease.notes || ''}`;
  }
  
  if (currentBranch === 'beta' && nextRelease.type === 'minor') {
    logger.log(`📝 [NOTES] Adding new beta cycle notes`);
    return `### 🧪 New Beta Testing Cycle

This beta version starts a new testing cycle after main branch releases.

${nextRelease.notes || ''}`;
  }
  
  return null;
}

module.exports = {
  analyzeCommits,
  generateNotes
};