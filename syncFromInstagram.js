#!/usr/bin/env node

/**
 * Complete Instagram Sync Solution
 * - Fetches posts from your public Instagram
 * - Extracts album info + full captions
 * - Syncs to albums.json with captions
 * - Handles deletions (removes albums if Instagram post is deleted)
 * - Downloads and optimizes images
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import InstagramScraper from './instagramScraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AlbumSyncManager {
    constructor(username = 'ayotalksmusic') {
        this.username = username;
        this.scraper = new InstagramScraper(username);
        this.albumsPath = path.join(__dirname, 'albums.json');
        this.imagesDir = path.join(__dirname, 'images');
        this.tempDir = path.join(__dirname, 'temp');
        this.ensureDirs();
    }

    ensureDirs() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        if (!fs.existsSync(this.imagesDir)) {
            fs.mkdirSync(this.imagesDir, { recursive: true });
        }
    }

    /**
     * Load existing albums
     */
    loadAlbums() {
        try {
            const data = fs.readFileSync(this.albumsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading albums.json:', error.message);
            return [];
        }
    }

    /**
     * Save albums to file
     */
    saveAlbums(albums) {
        try {
            fs.writeFileSync(this.albumsPath, JSON.stringify(albums, null, 4));
            console.log('✅ Albums saved successfully');
        } catch (error) {
            console.error('Error saving albums.json:', error);
            throw error;
        }
    }

    /**
     * Extract album information from caption
     * Looks for patterns like: "#123. Album Name by Artist"
     */
    extractAlbumInfo(caption, existingNumber = null) {
        if (!caption) return null;

        // Extract the first line (usually contains the album info)
        const firstLine = caption.split('\n')[0].trim();

        // Pattern: "#123. Album Name by Artist"
        const patterns = [
            /#(\d+)\.\s*(.+?)\s+by\s+(.+?)(?:\n|$)/i,
            /#(\d+)\.\s*(.+?)(?:\n|$)/i,
            /^(.+?)\s+by\s+(.+?)(?:\n|$)/i,
        ];

        for (const pattern of patterns) {
            const match = firstLine.match(pattern);
            if (match) {
                if (pattern === patterns[0]) { // Has number and "by Artist"
                    return {
                        number: parseInt(match[1]),
                        album: match[2].trim(),
                        artist: match[3].trim(),
                        fullName: `${match[2].trim()} by ${match[3].trim()}`
                    };
                } else if (pattern === patterns[1]) { // Has number only
                    return {
                        number: parseInt(match[1]),
                        album: match[2].trim(),
                        artist: null,
                        fullName: match[2].trim()
                    };
                } else { // "Album by Artist" without number
                    return {
                        number: existingNumber,
                        album: match[1].trim(),
                        artist: match[2].trim(),
                        fullName: `${match[1].trim()} by ${match[2].trim()}`
                    };
                }
            }
        }

        return null;
    }

    /**
     * Download and process image from Instagram
     */
    async downloadAndProcessImage(imageUrl, albumNumber) {
        try {
            const outputPath = path.join(this.imagesDir, `${albumNumber}.webp`);

            // Check if image already exists
            if (fs.existsSync(outputPath)) {
                console.log(`   ⚠️  Image ${albumNumber}.webp already exists, skipping download`);
                return `images/${albumNumber}.webp`;
            }

            console.log(`   📥 Downloading image...`);

            // Download image
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const buffer = await response.arrayBuffer();
            const tempPath = path.join(this.tempDir, `temp_${albumNumber}.jpg`);
            fs.writeFileSync(tempPath, Buffer.from(buffer));

            // Convert to WebP and resize
            await sharp(tempPath)
                .resize(800, 800, {
                    fit: 'cover',
                    withoutEnlargement: true
                })
                .toFormat('webp', { quality: 85 })
                .toFile(outputPath);

            // Clean up temp file
            fs.unlinkSync(tempPath);

            console.log(`   ✅ Image processed: ${albumNumber}.webp`);
            return `images/${albumNumber}.webp`;

        } catch (error) {
            console.error(`   ❌ Error processing image:`, error.message);
            throw error;
        }
    }

    /**
     * Normalize Instagram URL to standard format
     */
    normalizeInstagramUrl(url) {
        // Remove tracking parameters and ensure consistent format
        const shortcodeMatch = url.match(/\/p\/([A-Za-z0-9_-]+)/);
        if (shortcodeMatch) {
            return `https://www.instagram.com/p/${shortcodeMatch[1]}/`;
        }
        return url;
    }

    /**
     * Main sync function
     */
    async sync(options = {}) {
        const {
            dryRun = false,
            includeComments = false,
            limit = 50
        } = options;

        try {
            console.log('\n🔄 Starting Instagram sync...\n');

            // Fetch posts from Instagram
            const instagramPosts = await this.scraper.fetchPosts(limit);

            if (!instagramPosts || instagramPosts.length === 0) {
                console.log('❌ No posts fetched from Instagram');
                return;
            }

            // Load existing albums
            const existingAlbums = this.loadAlbums();
            console.log(`📚 Loaded ${existingAlbums.length} existing albums\n`);

            // Create a map of existing albums by their Instagram URL
            const existingByUrl = new Map();
            existingAlbums.forEach(album => {
                const normalizedUrl = this.normalizeInstagramUrl(album.link);
                existingByUrl.set(normalizedUrl, album);
            });

            // Track Instagram post URLs
            const instagramPostUrls = new Set(
                instagramPosts
                    .filter(post => post.media_type === 'IMAGE') // Only images
                    .map(post => this.normalizeInstagramUrl(post.permalink))
            );

            // === STEP 1: Handle Deletions ===
            console.log('🗑️  Checking for deleted posts...\n');
            const albumsToKeep = [];
            const deletedAlbums = [];

            for (const album of existingAlbums) {
                const normalizedUrl = this.normalizeInstagramUrl(album.link);
                if (instagramPostUrls.has(normalizedUrl)) {
                    albumsToKeep.push(album);
                } else {
                    deletedAlbums.push(album);
                    console.log(`   ❌ DELETED: ${album.name}`);
                    console.log(`      (Post no longer exists: ${normalizedUrl})\n`);
                }
            }

            if (deletedAlbums.length === 0) {
                console.log('   ✅ No deleted posts detected\n');
            } else {
                console.log(`   🗑️  Found ${deletedAlbums.length} deleted post(s)\n`);
            }

            // === STEP 2: Add New Posts ===
            console.log('🆕 Checking for new posts...\n');
            const newAlbums = [];

            for (const post of instagramPosts) {
                // Skip videos
                if (post.media_type !== 'IMAGE') {
                    continue;
                }

                const normalizedUrl = this.normalizeInstagramUrl(post.permalink);

                // Skip if already exists
                if (existingByUrl.has(normalizedUrl)) {
                    continue;
                }

                // Extract album info from caption
                const albumInfo = this.extractAlbumInfo(post.caption);

                if (!albumInfo) {
                    console.log(`   ⚠️  Skipping post (no album info detected): ${normalizedUrl}`);
                    console.log(`      Caption: "${post.caption.substring(0, 50)}..."\n`);
                    continue;
                }

                console.log(`   🎵 NEW: #${albumInfo.number}. ${albumInfo.fullName}`);
                console.log(`      URL: ${normalizedUrl}`);
                console.log(`      Caption length: ${post.caption.length} characters`);

                if (dryRun) {
                    console.log(`      🔍 DRY RUN - Would add this album\n`);
                    continue;
                }

                try {
                    // Download and process image
                    const imagePath = await this.downloadAndProcessImage(
                        post.media_url,
                        albumInfo.number
                    );

                    // Fetch comments if requested
                    let comments = null;
                    if (includeComments) {
                        console.log(`   💬 Fetching comments...`);
                        const details = await this.scraper.fetchPostDetails(post.shortcode);
                        comments = details?.comments || [];
                        console.log(`      Found ${comments.length} comments`);
                    }

                    // Create new album entry
                    const newAlbum = {
                        name: `#${albumInfo.number}. ${albumInfo.fullName}`,
                        link: normalizedUrl,
                        image: imagePath,
                        caption: post.caption, // Store full caption
                        timestamp: post.timestamp,
                        likes: post.likes,
                        ...(comments && comments.length > 0 && { comments })
                    };

                    newAlbums.push(newAlbum);
                    console.log(`   ✅ Successfully added\n`);

                } catch (error) {
                    console.error(`   ❌ Error processing post: ${error.message}\n`);
                }
            }

            if (newAlbums.length === 0 && !dryRun) {
                console.log('   ✅ No new posts to add\n');
            }

            // === STEP 3: Save Updated Albums ===
            if (!dryRun) {
                const updatedAlbums = [...albumsToKeep, ...newAlbums];

                // Sort by album number
                updatedAlbums.sort((a, b) => {
                    const numA = parseInt(a.name.match(/#(\d+)\./)?.[1] || '0');
                    const numB = parseInt(b.name.match(/#(\d+)\./)?.[1] || '0');
                    return numA - numB;
                });

                this.saveAlbums(updatedAlbums);
            }

            // === Summary ===
            console.log('📊 Sync Summary:');
            console.log(`   Total Instagram posts fetched: ${instagramPosts.length}`);
            console.log(`   Existing albums: ${existingAlbums.length}`);
            console.log(`   Deleted albums: ${deletedAlbums.length}`);
            console.log(`   New albums added: ${newAlbums.length}`);
            console.log(`   Final album count: ${albumsToKeep.length + newAlbums.length}`);

            if (dryRun) {
                console.log('\n🔍 DRY RUN - No changes were made');
            }

            return {
                deleted: deletedAlbums,
                added: newAlbums,
                total: albumsToKeep.length + newAlbums.length
            };

        } catch (error) {
            console.error('❌ Sync failed:', error.message);
            throw error;
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);

    const options = {
        dryRun: args.includes('--dry-run') || args.includes('-d'),
        includeComments: args.includes('--comments') || args.includes('-c'),
        limit: 50
    };

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🎵 Instagram Album Sync

Usage:
  node syncFromInstagram.js [options]

Options:
  --dry-run, -d       Preview changes without saving
  --comments, -c      Include comments in sync
  --help, -h          Show this help message

Examples:
  node syncFromInstagram.js                # Full sync
  node syncFromInstagram.js --dry-run      # Preview changes
  node syncFromInstagram.js --comments     # Sync with comments
        `);
        return;
    }

    const manager = new AlbumSyncManager('ayotalksmusic');

    try {
        await manager.sync(options);
        console.log('\n✅ Sync completed successfully!');
    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        process.exit(1);
    }
}

// Export for use as module
export default AlbumSyncManager;

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
