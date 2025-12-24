#!/usr/bin/env node

/**
 * Batch Album Add
 * Add multiple albums from a simple text file
 *
 * Text file format (batch.txt):
 * ---
 * DAMN by Kendrick Lamar | https://www.instagram.com/p/ABC123/ | ~/Downloads/damn.jpg
 * Blonde by Frank Ocean | https://www.instagram.com/p/DEF456/ | ~/Downloads/blonde.jpg
 * ---
 */

import fs from 'fs';
import path from 'path';
import AlbumManager from './addAlbum.js';

async function batchAdd(filePath) {
    const albumManager = new AlbumManager();

    // Read the batch file
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        console.log('\nCreate a text file with this format (one album per line):');
        console.log('Album Name by Artist | Instagram URL | /path/to/image.jpg\n');
        console.log('Example:');
        console.log('DAMN by Kendrick Lamar | https://www.instagram.com/p/ABC123/ | ~/Downloads/damn.jpg');
        process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
            // Skip empty lines
            if (!line) return false;
            // Skip comment lines (but not album numbers like #302.)
            if (line.startsWith('#') && !line.match(/^#\d+\./)) return false;
            return true;
        });

    if (lines.length === 0) {
        console.log('❌ No albums found in file');
        process.exit(1);
    }

    console.log(`\n🎵 Batch Album Add - Processing ${lines.length} album(s)\n`);

    const albums = [];
    const errors = [];

    // Parse each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split('|').map(p => p.trim());

        if (parts.length !== 3) {
            errors.push({
                line: i + 1,
                content: line,
                error: 'Invalid format. Expected: Album Name | URL | Image Path'
            });
            continue;
        }

        let [name, url, imagePath] = parts;

        // Remove album number prefix if present (#302. Album Name -> Album Name)
        const numberMatch = name.match(/^#\d+\.\s*(.+)$/);
        if (numberMatch) {
            name = numberMatch[1];
        }

        if (!albumManager.validateInstagramUrl(url)) {
            errors.push({
                line: i + 1,
                content: line,
                error: 'Invalid Instagram URL'
            });
            continue;
        }

        // Clean up image path (remove quotes)
        const cleanImagePath = imagePath.replace(/^["']|["']$/g, '');

        // Expand ~ to home directory
        const expandedPath = cleanImagePath.startsWith('~')
            ? cleanImagePath.replace('~', process.env.HOME)
            : cleanImagePath;

        if (!fs.existsSync(expandedPath)) {
            errors.push({
                line: i + 1,
                content: line,
                error: `Image not found: ${expandedPath}`
            });
            continue;
        }

        albums.push({ name, url, imagePath: expandedPath });
    }

    // Show errors if any
    if (errors.length > 0) {
        console.log('⚠️  Found errors in batch file:\n');
        errors.forEach(err => {
            console.log(`Line ${err.line}: ${err.error}`);
            console.log(`  "${err.content}"\n`);
        });

        if (albums.length === 0) {
            console.log('❌ No valid albums to add');
            process.exit(1);
        }

        console.log(`⚠️  Skipping ${errors.length} invalid line(s)\n`);
    }

    // Process valid albums
    console.log(`📋 Adding ${albums.length} album(s):\n`);

    const results = [];
    for (let i = 0; i < albums.length; i++) {
        const { name, url, imagePath } = albums[i];
        console.log(`[${i + 1}/${albums.length}] ${name}`);

        try {
            await albumManager.addAlbum(name, url, imagePath);
            results.push({ success: true, name });
            console.log('');
        } catch (error) {
            console.error(`  ❌ Failed: ${error.message}\n`);
            results.push({ success: false, name, error: error.message });
        }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('═'.repeat(50));
    console.log('📊 Batch Add Summary:');
    console.log(`✅ Successfully added: ${successful}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\n❌ Failed albums:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log('═'.repeat(50) + '\n');
}

// CLI Interface
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`
🎵 Batch Album Add

Usage:
  npm run batch-add batch.txt

Create a text file (e.g., batch.txt) with this format:

  Album Name by Artist | Instagram URL | /path/to/image.jpg

Example batch.txt:
  DAMN by Kendrick Lamar | https://www.instagram.com/p/ABC123/ | ~/Downloads/damn.jpg
  Blonde by Frank Ocean | https://www.instagram.com/p/DEF456/ | ~/Downloads/blonde.jpg
  To Pimp a Butterfly by Kendrick Lamar | https://www.instagram.com/p/GHI789/ | ~/Downloads/tpab.png

Tips:
  - One album per line
  - Lines starting with # are ignored (use for comments)
  - Empty lines are ignored
  - You can drag/drop images to get their paths
  - Use ~ for home directory (e.g., ~/Downloads/image.jpg)
    `);
    process.exit(0);
}

const filePath = args[0];
batchAdd(filePath).catch(error => {
    console.error('❌ Batch add failed:', error.message);
    process.exit(1);
});
