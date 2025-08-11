const semver = require('semver');

/**
 * semantic-release 自定义插件：三分支版本管理
 * 实现 alpha -> beta -> main 的版本递增逻辑
 */

async function analyzeCommits(pluginConfig, context) {
  const { cwd, env, stdout, stderr, logger, branch, commits, lastRelease, nextRelease } = context;
  
  // 获取当前分支
  const currentBranch = branch.name;
  logger.log(`Current branch: ${currentBranch}`);
  
  if (currentBranch === 'alpha') {
    // 检查是否有 beta 版本发布
    try {
      const { execa } = await import('execa');
      const { stdout: tags } = await execa('git', ['tag', '-l', '--sort=-version:refname'], { cwd });
      const betaTags = tags.split('\n').filter(tag => tag.includes('-beta.'));
      const alphaTags = tags.split('\n').filter(tag => tag.includes('-alpha.'));
      
      logger.log(`Beta tags found: ${betaTags.slice(0, 3).join(', ')}`);
      logger.log(`Alpha tags found: ${alphaTags.slice(0, 3).join(', ')}`);
      
      if (betaTags.length > 0 && alphaTags.length > 0) {
        const latestBeta = betaTags[0];
        const latestAlpha = alphaTags[0];
        
        const betaVersion = semver.parse(latestBeta);
        const alphaVersion = semver.parse(latestAlpha);
        
        if (betaVersion && alphaVersion) {
          const betaBase = `${betaVersion.major}.${betaVersion.minor}.${betaVersion.patch}`;
          const alphaBase = `${alphaVersion.major}.${alphaVersion.minor}.${alphaVersion.patch}`;
          
          logger.log(`Beta base: ${betaBase}, Alpha base: ${alphaBase}`);
          
          // 如果 beta 发布了相同基础版本，alpha 需要递增到下一个版本
          if (betaBase === alphaBase) {
            logger.log('🔄 Beta release detected with same base version, bumping alpha to next minor version');
            return 'minor'; // 强制返回 minor 类型的版本递增
          }
        }
      }
    } catch (error) {
      logger.error('Error checking version tags:', error);
    }
  }
  
  // 默认使用 semantic-release 的标准分析
  return null;
}

async function generateNotes(pluginConfig, context) {
  const { logger, branch, nextRelease } = context;
  
  if (branch.name === 'alpha' && nextRelease.type === 'minor') {
    return `### 🚀 New Alpha Development Cycle

This alpha version starts a new development cycle after the beta release.

${nextRelease.notes || ''}`;
  }
  
  return null;
}

module.exports = {
  analyzeCommits,
  generateNotes
};