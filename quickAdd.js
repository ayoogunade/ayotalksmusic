#!/usr/bin/env node

/**
 * Quick Album Add - Interactive version
 * Streamlined workflow for fast manual album entry
 */

import readline from 'readline';
import AlbumManager from './addAlbum.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function quickAdd() {
    const albumManager = new AlbumManager();
    const albums = await albumManager.loadAlbums();
    const nextNumber = albumManager.getNextAlbumNumber(albums);

    console.log('\n🎵 Quick Album Add\n');
    console.log(`Next album number: #${nextNumber}\n`);

    // Get album name
    const albumName = await question('Album name (e.g., "DAMN by Kendrick Lamar"): ');
    if (!albumName.trim()) {
        console.log('❌ Album name is required');
        rl.close();
        return;
    }

    // Get Instagram URL
    const instagramUrl = await question('Instagram post URL: ');
    if (!albumManager.validateInstagramUrl(instagramUrl)) {
        console.log('❌ Invalid Instagram URL. Must be like: https://www.instagram.com/p/ABC123/');
        rl.close();
        return;
    }

    // Get image path with helpful default suggestion
    console.log('\nImage path options:');
    console.log('  1. Drag and drop the image file here');
    console.log('  2. Type the path (e.g., ~/Downloads/album.jpg)');
    console.log('');

    const imagePath = await question('Image path: ');
    if (!imagePath.trim()) {
        console.log('❌ Image path is required');
        rl.close();
        return;
    }

    // Clean up the path (remove quotes if dragged/dropped)
    const cleanPath = imagePath.trim().replace(/^["']|["']$/g, '');

    // Get genre (optional)
    console.log('\nGenre (optional):');
    console.log('  Options: Hip-Hop, Pop, R&B, Rock, Electronic, Jazz, Country, K-Pop');
    console.log('  You can enter multiple separated by commas (e.g., "Hip-Hop, R&B")');
    console.log('  Or press Enter to skip (auto-detection will be used)');
    console.log('');

    const genreInput = await question('Genre: ');
    const genres = genreInput.trim()
        ? genreInput.split(',').map(g => g.trim()).filter(g => g)
        : null;

    // Confirm before adding
    console.log('\n📋 Review:');
    console.log(`  Album: #${nextNumber}. ${albumName}`);
    console.log(`  URL: ${instagramUrl}`);
    console.log(`  Image: ${cleanPath}`);
    console.log('');

    const confirm = await question('Add this album? (y/n): ');

    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        console.log('❌ Cancelled');
        rl.close();
        return;
    }

    rl.close();

    // Add the album
    try {
        await albumManager.addAlbum(albumName, instagramUrl, cleanPath);
        console.log('\n✅ Done! Album added successfully.');
        console.log('\n💡 Quick tip: You can add another by running "npm run quick-add" again');
    } catch (error) {
        console.error('\n❌ Failed to add album:', error.message);
        process.exit(1);
    }
}

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
    console.log('\n\n❌ Cancelled by user');
    process.exit(0);
});

quickAdd().catch(console.error);
