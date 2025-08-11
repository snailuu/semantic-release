# 三分支版本管理系统

本项目使用 semantic-release 实现了 alpha -> beta -> main 的三分支版本管理策略。

## 分支策略

### 版本发布规则

- **alpha 分支**: 发布 `X.Y.Z-alpha.N` 版本
  - 每次合并到 alpha 分支时，会自动递增 alpha.N
  - 如果 beta 分支已经发布了相同基础版本，alpha 会自动递增主版本或次版本

- **beta 分支**: 发布 `X.Y.Z-beta.N` 版本  
  - 从 alpha 合并到 beta 时，会发布新的 beta 版本
  - beta 版本发布后会自动合并回 alpha 分支

- **main 分支**: 发布正式版本 `X.Y.Z`
  - 从 beta 合并到 main 时，发布正式版本
  - main 版本发布后会自动合并到 beta 和 alpha 分支

### 自动合并流程

```
main -> beta -> alpha
```

当上游分支有新的发布时，会自动向下游分支合并。

## 提交规范

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` - 新功能 (触发 minor 版本递增)
- `fix:` - 修复 bug (触发 patch 版本递增)  
- `BREAKING CHANGE:` - 破坏性变更 (触发 major 版本递增)
- `chore:`, `docs:`, `style:`, `refactor:`, `test:` - 其他类型 (不触发版本递增)

## 使用方法

### 1. 功能开发

```bash
# 切换到 alpha 分支进行功能开发
git checkout alpha
git pull origin alpha

# 开发完成后提交
git add .
git commit -m "feat: add new feature"
git push origin alpha
```

### 2. Beta 测试

```bash
# 将 alpha 分支合并到 beta 进行测试
git checkout beta
git pull origin beta
git merge alpha
git push origin beta
```

### 3. 正式发布

```bash
# 将 beta 分支合并到 main 进行正式发布
git checkout main
git pull origin main
git merge beta
git push origin main
```

## 环境变量配置

在 GitHub 仓库设置中需要配置以下 Secrets：

- `GITHUB_TOKEN`: GitHub Personal Access Token (自动提供)
- `NPM_TOKEN`: NPM 发布令牌 (如果需要发布到 NPM)

## 本地测试

```bash
# 安装依赖
pnpm install

# 本地测试发布 (不实际发布)
pnpm run release:dry
```