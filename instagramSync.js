#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AlbumManager from './addAlbum.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class InstagramSync {
    constructor() {
        this.albumManager = new AlbumManager();
        this.configPath = path.join(__dirname, 'instagram-config.json');
        this.tempDir = path.join(__dirname, 'temp');
        this.ensureTempDir();
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir);
        }
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading Instagram config:', error);
        }
        return {};
    }

    saveConfig(config) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('Error saving Instagram config:', error);
        }
    }

    // Instagram Basic Display API integration
    async getInstagramPosts(accessToken, limit = 10) {
        try {
            const response = await fetch(
                `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&limit=${limit}&access_token=${accessToken}`
            );

            if (!response.ok) {
                throw new Error(`Instagram API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching Instagram posts:', error);
            throw error;
        }
    }

    // Extract album information from Instagram caption
    extractAlbumFromCaption(caption) {
        if (!caption) return null;

        // Common patterns in music review captions
        const patterns = [
            // "#123. Album Name by Artist" - your typical pattern
            /#(\d+)\.\s*(.+?)\s+by\s+(.+?)[\n\r\s]*(?:[🎵🎶🎸🥁🎤🎹🎺🎷]|$)/i,
            
            // "Album Name by Artist" at start of caption
            /^(.+?)\s+by\s+(.+?)[\n\r\s]*(?:[🎵🎶🎸🥁🎤🎹🎺🎷]|$)/i,
            
            // "Artist - Album Name"
            /^(.+?)\s*-\s*(.+?)[\n\r\s]*(?:[🎵🎶🎸🥁🎤🎹🎺🎷]|$)/i,
            
            // Look for quoted album names
            /"(.+?)"\s+by\s+(.+?)[\n\r\s]/i,
            
            // Album review indicators
            /(?:album|record|ep|lp):\s*"?(.+?)"?\s+by\s+(.+?)[\n\r\s]/i,
        ];

        for (const pattern of patterns) {
            const match = caption.match(pattern);
            if (match) {
                let album, artist, number;
                
                if (pattern === patterns[0]) { // Has number
                    number = match[1];
                    album = match[2].trim();
                    artist = match[3].trim();
                } else if (pattern === patterns[2]) { // Artist - Album
                    artist = match[1].trim();
                    album = match[2].trim();
                } else { // Album by Artist
                    album = match[1].trim();
                    artist = match[2].trim();
                }

                // Clean up common suffixes/prefixes
                album = album.replace(/^(the\s+)?album\s+/i, '').trim();
                artist = artist.replace(/[🎵🎶🎸🥁🎤🎹🎺🎷\n\r]+.*$/, '').trim();
                
                return {
                    album: album,
                    artist: artist,
                    number: number,
                    fullName: number ? `${album} by ${artist}` : `${album} by ${artist}`
                };
            }
        }

        // Fallback: look for any mention of "by"
        const fallbackMatch = caption.match(/(.+?)\s+by\s+(.+?)(?:\s|$|\.)/i);
        if (fallbackMatch) {
            return {
                album: fallbackMatch[1].trim(),
                artist: fallbackMatch[2].trim(),
                fullName: `${fallbackMatch[1].trim()} by ${fallbackMatch[2].trim()}`
            };
        }

        return null;
    }

    async downloadImage(url, filename) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const buffer = await response.arrayBuffer();
            const filePath = path.join(this.tempDir, filename);
            fs.writeFileSync(filePath, Buffer.from(buffer));
            
            return filePath;
        } catch (error) {
            console.error('Error downloading image:', error);
            throw error;
        }
    }

    async syncNewPosts(accessToken, dryRun = false) {
        try {
            console.log('🔄 Fetching latest Instagram posts...');
            const posts = await this.getInstagramPosts(accessToken, 20);
            
            // Load existing albums to check for duplicates
            const existingAlbums = await this.albumManager.loadAlbums();
            const existingLinks = new Set(existingAlbums.map(album => album.link));
            
            const newPosts = posts.filter(post => {
                // Only process image posts
                if (post.media_type !== 'IMAGE') return false;
                
                // Skip if already exists
                if (existingLinks.has(post.permalink)) return false;
                
                // Must have a caption
                return post.caption && post.caption.trim().length > 0;
            });

            console.log(`📱 Found ${posts.length} recent posts`);
            console.log(`🆕 Found ${newPosts.length} new potential album reviews`);

            if (newPosts.length === 0) {
                console.log('✅ No new albums to sync');
                return [];
            }

            const results = [];

            for (let i = 0; i < newPosts.length; i++) {
                const post = newPosts[i];
                console.log(`\n📝 Processing post ${i + 1}/${newPosts.length}...`);
                console.log(`🔗 URL: ${post.permalink}`);
                
                // Extract album info from caption
                const albumInfo = this.extractAlbumFromCaption(post.caption);
                
                if (!albumInfo) {
                    console.log(`⚠️  Could not extract album info from caption`);
                    console.log(`Caption preview: "${post.caption.substring(0, 100)}..."`);
                    results.push({
                        success: false,
                        reason: 'Could not extract album info',
                        post: post
                    });
                    continue;
                }

                console.log(`🎵 Detected: "${albumInfo.album}" by ${albumInfo.artist}`);

                if (dryRun) {
                    console.log(`🔍 DRY RUN - Would add: ${albumInfo.fullName}`);
                    results.push({
                        success: true,
                        dryRun: true,
                        albumInfo: albumInfo,
                        post: post
                    });
                    continue;
                }

                try {
                    // Download the image
                    const imageFilename = `temp_${Date.now()}_${i}.jpg`;
                    console.log('📥 Downloading image...');
                    const imagePath = await this.downloadImage(post.media_url, imageFilename);

                    // Add the album
                    console.log('📀 Adding album to database...');
                    const album = await this.albumManager.addAlbum(
                        albumInfo.fullName,
                        post.permalink,
                        imagePath
                    );

                    // Clean up temp file
                    fs.unlinkSync(imagePath);

                    results.push({
                        success: true,
                        album: album,
                        albumInfo: albumInfo,
                        post: post
                    });

                    console.log(`✅ Successfully added: ${album.name}`);

                } catch (error) {
                    console.error(`❌ Error processing post: ${error.message}`);
                    results.push({
                        success: false,
                        error: error.message,
                        albumInfo: albumInfo,
                        post: post
                    });
                }
            }

            // Summary
            const successful = results.filter(r => r.success && !r.dryRun).length;
            const failed = results.filter(r => !r.success).length;
            const dryRunCount = results.filter(r => r.dryRun).length;

            console.log('\n📊 Sync Summary:');
            if (dryRun) {
                console.log(`🔍 Dry Run - Albums that would be added: ${dryRunCount}`);
            } else {
                console.log(`✅ Successfully synced: ${successful}`);
                console.log(`❌ Failed: ${failed}`);
            }

            return results;

        } catch (error) {
            console.error('❌ Error during sync:', error);
            throw error;
        }
    }

    async setupAuth() {
        console.log(`
🔧 Instagram API Setup

To use Instagram integration, you need to:

1. Create a Facebook App at https://developers.facebook.com/
2. Add Instagram Basic Display product
3. Generate an access token for your Instagram account

For detailed instructions, visit:
https://developers.facebook.com/docs/instagram-basic-display-api/getting-started

Once you have an access token, run:
node instagramSync.js --setup-token <your_access_token>
        `);
    }

    async saveAccessToken(token) {
        try {
            // Test the token first
            await this.getInstagramPosts(token, 1);
            
            const config = this.loadConfig();
            config.accessToken = token;
            config.lastSync = null;
            this.saveConfig(config);
            
            console.log('✅ Access token saved and validated!');
            console.log('You can now run: node instagramSync.js --sync');
            
        } catch (error) {
            console.error('❌ Invalid access token:', error.message);
            throw error;
        }
    }
}

// CLI Interface
async function main() {
    const instagramSync = new InstagramSync();
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log(`
🎵 Instagram Sync for Album Reviews

Usage:
  node instagramSync.js [command] [options]

Commands:
  --setup              Show setup instructions for Instagram API
  --setup-token <token> Save your Instagram access token
  --sync               Sync new posts from Instagram
  --dry-run            Preview what would be synced without making changes
  --help, -h           Show this help message

Examples:
  node instagramSync.js --setup
  node instagramSync.js --setup-token "your_token_here"
  node instagramSync.js --dry-run
  node instagramSync.js --sync
        `);
        return;
    }

    try {
        switch (args[0]) {
            case '--setup':
                await instagramSync.setupAuth();
                break;

            case '--setup-token':
                if (!args[1]) {
                    console.error('❌ Please provide an access token');
                    return;
                }
                await instagramSync.saveAccessToken(args[1]);
                break;

            case '--sync':
                const config = instagramSync.loadConfig();
                if (!config.accessToken) {
                    console.error('❌ No access token found. Run --setup first.');
                    return;
                }
                await instagramSync.syncNewPosts(config.accessToken, false);
                break;

            case '--dry-run':
                const dryConfig = instagramSync.loadConfig();
                if (!dryConfig.accessToken) {
                    console.error('❌ No access token found. Run --setup first.');
                    return;
                }
                await instagramSync.syncNewPosts(dryConfig.accessToken, true);
                break;

            default:
                console.error(`❌ Unknown command: ${args[0]}`);
                console.log('Use --help for usage information');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default InstagramSync;