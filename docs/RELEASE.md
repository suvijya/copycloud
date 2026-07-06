# Release Process

## Versioning

We follow Semantic Versioning (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Release Steps

### 1. Prepare
```bash
# Update version
npm version minor

# Update changelog
# Edit CHANGELOG.md

# Create release branch
git checkout -b release/v1.2.0
```

### 2. Test
```bash
npm test
npm run test:e2e
npm run build
```

### 3. Merge
```bash
git checkout main
git merge release/v1.2.0
git tag v1.2.0
git push --tags
```

### 4. Deploy
```bash
# Staging (automatic)
# Production (manual trigger)
```

### 5. Post-Release
- Update documentation
- Announce on social media
- Monitor for issues

## Hotfix Process

1. Create hotfix branch from main
2. Fix the issue
3. Test thoroughly
4. Merge to main
5. Tag and deploy
