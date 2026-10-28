# AGENTS.md - Development Guide

## Project Overview

This is a **Hugo blog** with a **Vue.js 3** frontend. The Hugo site is in the root directory

## Build Commands

### Hugo Site (Root Directory)

```bash
# Build the Hugo site
hugo

# Development server with live reload
hugo server

# Build for production (minified)
hugo --minify

# Specific Hugo version used in CI: 0.168.0
```


## Project Structure

```
/                     # Hugo blog root
├── content/          # Blog posts (Markdown)
├── layouts/          # Hugo layouts
├── static/           # Static assets
├── themes/           # Hugo themes
├── config.toml       # Hugo configuration

```

## Adding New Vue Pages

1. Create a new `.vue` file in `src/views/`
2. Add route in `src/router/index.js`:

```javascript
{
  path: '/new-page',
  name: 'new-page',
  component: () => import('../views/NewPage.vue')
}
```

## Hugo Content

- Add Markdown posts to `content/posts/`
- Use front matter for metadata:

```yaml
---
title: "Post Title"
date: 2024-01-01
draft: false
tags: ["tag1", "tag2"]
categories: ["category1"]
---
```

## CI/CD

GitHub Actions workflow is in `.github/workflows/pages.yml`:
- Builds Hugo site on push to main
- Deploys to GitHub Pages
- Uses Hugo 0.168.0

## Dependencies

### Hugo (root)
- Version: 0.168.0 (see CI workflow)
- Theme: PaperMod
