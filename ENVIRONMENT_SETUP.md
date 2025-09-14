# Environment Variables Setup

This document explains how to configure environment variables for the ScrumAI application.

## Overview

The application uses environment variables to securely manage API keys and configuration. All sensitive credentials have been moved from hardcoded values to environment variables.

## Required Environment Variables

### Notion Integration

- `NOTION_API_KEY`: Your Notion integration API key
- `NOTION_PARENT_PAGE_ID`: The ID of the parent page where new pages will be created

### Supabase Authentication

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Setup Instructions

### 1. Create Environment File

Create a file named `config.env` in the root directory of the project:

```bash
# Notion API Configuration
NOTION_API_KEY=your_notion_api_key_here
NOTION_PARENT_PAGE_ID=your_notion_parent_page_id_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Replace Placeholder Values

Replace the placeholder values with your actual credentials:

- **Notion API Key**: Get this from your Notion integration settings
- **Notion Parent Page ID**: Extract from the URL of the page where you want to create new pages
- **Supabase URL**: Found in your Supabase project settings
- **Supabase Anon Key**: Found in your Supabase project API settings

### 3. Security Notes

- **Never commit the `config.env` file to version control**
- The `.gitignore` file already includes `.env` patterns to prevent accidental commits
- Keep your API keys secure and rotate them regularly
- Use different keys for development and production environments

## How It Works

### Environment Variable Loading

1. **Main Process**: The Electron main process loads environment variables from `config.env` at startup
2. **Preload Script**: Securely exposes specific environment variables to the renderer process
3. **Renderer Process**: Application code accesses environment variables through the secure API

### Security Implementation

- Environment variables are loaded only in the main process
- The preload script filters which variables are exposed to the renderer
- No direct access to `process.env` in the renderer process
- Fallback mechanisms for development environments

## File Structure

```
scrumAI/
├── config.env                 # Environment variables (DO NOT COMMIT)
├── src/
│   ├── electron/
│   │   ├── main.js           # Loads environment variables
│   │   └── preload.js        # Securely exposes variables
│   └── renderer/
│       ├── js/
│       │   ├── main.js       # Uses Notion credentials
│       │   └── notion-integration.js  # Uses Notion credentials
│       └── auth/
│           └── supabaseClient.js      # Uses Supabase credentials
└── .gitignore                # Excludes .env files
```

## Troubleshooting

### Environment Variables Not Loading

1. Check that `config.env` exists in the project root
2. Verify the file format (no spaces around `=`, proper line endings)
3. Check the console for error messages about missing credentials

### API Integration Not Working

1. Verify your API keys are correct and active
2. Check that the Notion integration has the correct permissions
3. Ensure the Supabase project is properly configured

### Development vs Production

- Use different environment files for different environments
- Consider using a more sophisticated configuration management system for production
- Always validate environment variables on application startup

## Migration from Hardcoded Values

If you're migrating from hardcoded API keys:

1. Create the `config.env` file with your current credentials
2. Restart the application
3. Verify that integrations work correctly
4. Remove any remaining hardcoded credentials from the codebase

## Best Practices

- Use descriptive names for environment variables
- Group related variables together in the config file
- Document what each variable is used for
- Use different values for development, staging, and production
- Regularly rotate API keys for security
- Monitor API usage and set up alerts for unusual activity
