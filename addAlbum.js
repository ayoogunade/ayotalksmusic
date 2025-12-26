#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AlbumManager {
    constructor() {
        this.albumsPath = path.join(__dirname, 'albums.json');
        this.imagesDir = path.join(__dirname, 'images');
    }

    async loadAlbums() {
        try {
            const data = fs.readFileSync(this.albumsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading albums.json:', error);
            return [];
        }
    }

    async saveAlbums(albums) {
        try {
            fs.writeFileSync(this.albumsPath, JSON.stringify(albums, null, 4));
            console.log('✅ Albums saved successfully');
        } catch (error) {
            console.error('Error saving albums.json:', error);
            throw error;
        }
    }

    getNextAlbumNumber(albums) {
        if (albums.length === 0) return 1;
        
        // Extract numbers from album names and find the highest
        const numbers = albums.map(album => {
            const match = album.name.match(/^#(\d+)\./);
            return match ? parseInt(match[1]) : 0;
        });
        
        return Math.max(...numbers) + 1;
    }

    async processImage(imagePath, albumNumber) {
        try {
            const outputPath = path.join(this.imagesDir, `${albumNumber}.webp`);
            
            // Check if image already exists
            if (fs.existsSync(outputPath)) {
                console.log(`⚠️  Image ${albumNumber}.webp already exists, skipping conversion`);
                return `images/${albumNumber}.webp`;
            }

            // Convert image to WebP
            await sharp(imagePath)
                .resize(800, 800, { 
                    fit: 'cover',
                    withoutEnlargement: true 
                })
                .toFormat('webp', { quality: 85 })
                .toFile(outputPath);

            console.log(`✅ Image converted: ${albumNumber}.webp`);
            return `images/${albumNumber}.webp`;
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }

    validateInstagramUrl(url) {
        const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+\/?/;
        return instagramRegex.test(url);
    }

    extractAlbumInfo(albumName) {
        // Try to extract artist and album from common patterns
        const patterns = [
            /^#?\d+\.\s*(.+?)\s+by\s+(.+)$/i,  // "#1. Album Name by Artist"
            /^(.+?)\s+by\s+(.+)$/i,            // "Album Name by Artist"
            /^(.+?)\s+-\s+(.+)$/i,             // "Album Name - Artist"
        ];

        for (const pattern of patterns) {
            const match = albumName.match(pattern);
            if (match) {
                return {
                    album: match[1].trim(),
                    artist: match[2].trim()
                };
            }
        }

        // If no pattern matches, return the full name as album
        return {
            album: albumName.trim(),
            artist: 'Unknown Artist'
        };
    }

    async addAlbum(albumName, instagramUrl, imagePath, genres = null) {
        try {
            // Validate inputs
            if (!albumName || !instagramUrl || !imagePath) {
                throw new Error('Missing required parameters: albumName, instagramUrl, and imagePath are required');
            }

            if (!this.validateInstagramUrl(instagramUrl)) {
                throw new Error('Invalid Instagram URL format');
            }

            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image file not found: ${imagePath}`);
            }

            // Load existing albums
            const albums = await this.loadAlbums();
            const albumNumber = this.getNextAlbumNumber(albums);

            // Process image
            const imageRelativePath = await this.processImage(imagePath, albumNumber);

            // Create new album entry
            const newAlbum = {
                name: `#${albumNumber}. ${albumName}`,
                link: instagramUrl,
                image: imageRelativePath
            };

            // Add genre if provided
            if (genres && genres.length > 0) {
                newAlbum.genre = genres;
            }

            // Add to albums array
            albums.push(newAlbum);

            // Save updated albums
            await this.saveAlbums(albums);

            console.log('\n🎉 Album added successfully!');
            console.log(`📀 Album: ${newAlbum.name}`);
            console.log(`🔗 Link: ${newAlbum.link}`);
            console.log(`🖼️  Image: ${newAlbum.image}`);

            // Extract album info for additional context
            const info = this.extractAlbumInfo(albumName);
            console.log(`🎵 Detected - Album: "${info.album}" by ${info.artist}`);

            return newAlbum;

        } catch (error) {
            console.error('❌ Error adding album:', error.message);
            throw error;
        }
    }

    async bulkAdd(albumsData) {
        console.log(`🚀 Starting bulk add of ${albumsData.length} albums...\n`);
        const results = [];

        for (let i = 0; i < albumsData.length; i++) {
            const { name, url, imagePath } = albumsData[i];
            try {
                console.log(`Processing ${i + 1}/${albumsData.length}: ${name}`);
                const result = await this.addAlbum(name, url, imagePath);
                results.push({ success: true, album: result });
                console.log('');
            } catch (error) {
                console.error(`Failed to add ${name}:`, error.message);
                results.push({ success: false, error: error.message, name });
                console.log('');
            }
        }

        // Summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log('📊 Bulk Add Summary:');
        console.log(`✅ Successful: ${successful}`);
        console.log(`❌ Failed: ${failed}`);
        
        if (failed > 0) {
            console.log('\n❌ Failed albums:');
            results.filter(r => !r.success).forEach(r => {
                console.log(`  - ${r.name}: ${r.error}`);
            });
        }

        return results;
    }
}

// CLI Interface
async function main() {
    const albumManager = new AlbumManager();
    
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🎵 Album Manager CLI

Usage:
  node addAlbum.js <album_name> <instagram_url> <image_path>

Example:
  node addAlbum.js "DAMN by Kendrick Lamar" "https://www.instagram.com/p/ABC123/" "./my-image.jpg"

Options:
  --help, -h     Show this help message
  --bulk <file>  Add multiple albums from JSON file
        `);
        return;
    }

    if (args[0] === '--help' || args[0] === '-h') {
        console.log('Help message shown above');
        return;
    }

    if (args[0] === '--bulk') {
        if (!args[1]) {
            console.error('❌ Please provide a JSON file path for bulk import');
            return;
        }

        try {
            const bulkData = JSON.parse(fs.readFileSync(args[1], 'utf8'));
            await albumManager.bulkAdd(bulkData);
        } catch (error) {
            console.error('❌ Error reading bulk file:', error.message);
        }
        return;
    }

    if (args.length !== 3) {
        console.error('❌ Please provide exactly 3 arguments: album_name, instagram_url, and image_path');
        console.log('Use --help for usage information');
        return;
    }

    const [albumName, instagramUrl, imagePath] = args;

    try {
        await albumManager.addAlbum(albumName, instagramUrl, imagePath);
    } catch (error) {
        process.exit(1);
    }
}

// Export for use as module
export default AlbumManager;

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}