/**
 * Notion Integration Module
 * 
 * This module handles the integration with Notion API to export meeting content.
 * Responsibilities:
 * - Connect to Notion API using provided credentials
 * - Create pages in specified parent page
 * - Format and upload Strategy & Action Items content
 * - Handle API errors and provide user feedback
 */

// Import Notion client - note: this will be loaded via script tag in HTML since it's a renderer process
// const { Client } = require('@notionhq/client');

export class NotionIntegration {
    constructor() {
        this.client = null;
        this.isInitialized = false;
        
        // API credentials - hardcoded for this demo
        this.apiKey = "ntn_b21836603815tHxhJd8M44AeLsp2bAHgpqbmNVnlMaE3Sg";
        this.parentPageId = "26e08228035d805ca45ac47eac1b3849";
        
        // Auto-initialize with hardcoded credentials
        this.autoInitialize();
    }
    
    /**
     * Auto-initialize with hardcoded credentials
     */
    async autoInitialize() {
        try {
            await this.initialize();
        } catch (error) {
            console.warn('Auto-initialization failed:', error.message);
        }
    }

    /**
     * Initialize Notion client with API credentials
     */
    async initialize(apiKey = null, parentPageId = null) {
        try {
            console.log('Initializing Notion integration...');
            
            // Use provided credentials or fallback to hardcoded ones
            if (apiKey) this.apiKey = apiKey;
            if (parentPageId) this.parentPageId = parentPageId;
            
            // Validate that we have the required credentials
            if (!this.apiKey || !this.parentPageId) {
                throw new Error('Missing API key or parent page ID');
            }
            
            console.log('Using API key:', this.apiKey.substring(0, 10) + '...');
            console.log('Using parent page ID:', this.parentPageId);
            
            // Test the connection (but don't fail if it doesn't work)
            try {
                await this.testConnection();
                console.log('Connection test passed');
            } catch (error) {
                console.warn('Connection test failed, but continuing:', error.message);
            }
            
            this.isInitialized = true;
            console.log('Notion integration initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Notion integration:', error);
            throw new Error(`Notion initialization failed: ${error.message}`);
        }
    }

    /**
     * Create a new page in Notion with the provided content
     */
    async createPage(title, content) {
        if (!this.isInitialized) {
            throw new Error('Notion integration not initialized. Call initialize() first.');
        }

        try {
            console.log('Creating Notion page:', title);

            // Prepare the page data with correct Notion API format
            const pageData = {
                parent: {
                    type: "page_id",
                    page_id: this.parentPageId
                },
                properties: {
                    title: {
                        title: [
                            {
                                type: "text",
                                text: {
                                    content: title
                                }
                            }
                        ]
                    }
                },
                children: this.formatContentAsBlocks(content)
            };

            console.log('Sending page data:', JSON.stringify(pageData, null, 2));

            // Make API request to create the page
            const response = await this.makeNotionRequest('pages', 'POST', pageData);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Notion API error response:', errorText);
                
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(`Notion API error: ${errorData.message || errorData.code || response.statusText}`);
                } catch (parseError) {
                    throw new Error(`Notion API error: ${response.status} ${response.statusText} - ${errorText}`);
                }
            }

            const result = await response.json();
            console.log('Successfully created Notion page:', result.url);
            
            return {
                success: true,
                pageUrl: result.url,
                pageId: result.id
            };
        } catch (error) {
            console.error('Failed to create Notion page:', error);
            throw new Error(`Failed to create Notion page: ${error.message}`);
        }
    }

    /**
     * Export Strategy & Action Items to Notion
     */
    async exportStrategyContent(strategyContent) {
        try {
            // Generate a meaningful title with timestamp
            const timestamp = new Date().toLocaleString();
            const title = `Meeting Strategy & Action Items - ${timestamp}`;

            // Create the page without custom properties to avoid schema issues
            const result = await this.createPage(title, strategyContent);
            
            return result;
        } catch (error) {
            console.error('Failed to export strategy content:', error);
            throw error;
        }
    }

    /**
     * Format content as Notion blocks
     */
    formatContentAsBlocks(content) {
        if (!content || content.trim() === '') {
            return [
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: "No content available."
                                }
                            }
                        ]
                    }
                }
            ];
        }

        // Clean and split content into lines
        const lines = content.split('\n').map(line => line.trim()).filter(line => line !== '');
        const blocks = [];

        lines.forEach(line => {
            // Ensure line is not too long (Notion has limits)
            const maxLength = 2000;
            if (line.length > maxLength) {
                line = line.substring(0, maxLength) + '...';
            }
            
            // Check if it's a header (starts with #)
            if (line.startsWith('#')) {
                const hashCount = (line.match(/^#+/) || [''])[0].length;
                const level = Math.min(Math.max(hashCount, 1), 3); // Ensure level is 1-3
                const text = line.replace(/^#+\s*/, '').trim();
                
                if (text) { // Only add if there's actual text
                    blocks.push({
                        object: "block",
                        type: `heading_${level}`,
                        [`heading_${level}`]: {
                            rich_text: [
                                {
                                    type: "text",
                                    text: {
                                        content: text
                                    }
                                }
                            ]
                        }
                    });
                }
            }
            // Check if it's a bullet point
            else if (line.match(/^[•\-*]\s+/)) {
                const text = line.replace(/^[•\-*]\s+/, '').trim();
                if (text) {
                    blocks.push({
                        object: "block",
                        type: "bulleted_list_item",
                        bulleted_list_item: {
                            rich_text: [
                                {
                                    type: "text",
                                    text: {
                                        content: text
                                    }
                                }
                            ]
                        }
                    });
                }
            }
            // Check if it's a numbered list
            else if (line.match(/^\d+\.\s+/)) {
                const text = line.replace(/^\d+\.\s+/, '').trim();
                if (text) {
                    blocks.push({
                        object: "block",
                        type: "numbered_list_item",
                        numbered_list_item: {
                            rich_text: [
                                {
                                    type: "text",
                                    text: {
                                        content: text
                                    }
                                }
                            ]
                        }
                    });
                }
            }
            // Regular paragraph
            else if (line.trim()) {
                blocks.push({
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: line
                                }
                            }
                        ]
                    }
                });
            }
        });

        // If no blocks were created, add a default paragraph
        if (blocks.length === 0) {
            blocks.push({
                object: "block",
                type: "paragraph",
                paragraph: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: content.substring(0, 2000)
                            }
                        }
                    ]
                }
            });
        }

        return blocks;
    }

    /**
     * Make a request to the Notion API
     */
    async makeNotionRequest(endpoint, method = 'GET', data = null) {
        const url = `https://api.notion.com/v1/${endpoint}`;
        
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            }
        };

        if (data && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        return fetch(url, options);
    }

    /**
     * Test the Notion connection
     */
    async testConnection() {
        try {
            const response = await this.makeNotionRequest('users/me');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API test failed: ${errorData.message || response.statusText}`);
            }

            const userData = await response.json();
            console.log('Notion connection test successful:', userData);
            return true;
        } catch (error) {
            console.error('Notion connection test failed:', error);
            throw error;
        }
    }

    /**
     * Get page information
     */
    async getPageInfo(pageId) {
        try {
            const response = await this.makeNotionRequest(`pages/${pageId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to get page info: ${errorData.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get page info:', error);
            throw error;
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('Cleaning up Notion integration...');
        this.client = null;
        this.isInitialized = false;
        this.apiKey = null;
        this.parentPageId = null;
        console.log('Notion integration cleanup complete');
    }
}

// Export singleton instance
export const notionIntegration = new NotionIntegration();
