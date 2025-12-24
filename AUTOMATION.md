# Album Review Automation

This document explains how to use the automated tools for managing your album reviews.

## 🚀 Quick Start

### Manual Album Addition
```bash
# Add a single album
npm run add-album "DAMN by Kendrick Lamar" "https://www.instagram.com/p/ABC123/" "./path/to/image.jpg"

# Or use the script directly
node addAlbum.js "Album Name by Artist" "https://instagram.com/p/ABC123/" "./image.jpg"
```

### Instagram Integration
```bash
# Set up Instagram API (one-time setup)
npm run instagram-setup

# Preview what would be synced (recommended first)
npm run instagram-preview

# Sync new posts from Instagram
npm run instagram-sync
```

## 📖 Detailed Usage

### Album Addition Script (`addAlbum.js`)

**Features:**
- Automatically numbers albums sequentially (#1, #2, etc.)
- Converts images to optimized WebP format
- Resizes images to 800x800px for consistency
- Validates Instagram URLs
- Updates `albums.json` safely
- Supports bulk addition from JSON files

**Command Line Usage:**
```bash
node addAlbum.js <album_name> <instagram_url> <image_path>

# Examples:
node addAlbum.js "GKMC by Kendrick Lamar" "https://www.instagram.com/p/ABC123/" "./review-image.png"
node addAlbum.js "Blonde by Frank Ocean" "https://www.instagram.com/p/DEF456/" "../Downloads/blonde-review.jpg"
```

**Bulk Addition:**
Create a JSON file with multiple albums:
```json
[
  {
    "name": "Album 1 by Artist 1",
    "url": "https://www.instagram.com/p/ABC123/",
    "imagePath": "./images/album1.jpg"
  },
  {
    "name": "Album 2 by Artist 2", 
    "url": "https://www.instagram.com/p/DEF456/",
    "imagePath": "./images/album2.jpg"
  }
]
```

Then run:
```bash
node addAlbum.js --bulk albums-to-add.json
```

### Instagram Sync (`instagramSync.js`)

**Features:**
- Fetches your latest Instagram posts automatically
- Extracts album information from captions using intelligent parsing
- Downloads images and converts them to WebP
- Avoids duplicate entries
- Supports dry-run preview mode

**Setup (One-time):**
1. Create a Facebook Developer account
2. Create an app and add Instagram Basic Display
3. Generate an access token for your Instagram account
4. Save the token:
   ```bash
   node instagramSync.js --setup-token "YOUR_ACCESS_TOKEN_HERE"
   ```

**Caption Parsing:**
The script recognizes these patterns in your captions:
- `#123. Album Name by Artist` (your standard format)
- `Album Name by Artist` (at start of caption)
- `"Album Name" by Artist`
- `Artist - Album Name`

**Usage:**
```bash
# Preview what would be synced (recommended)
node instagramSync.js --dry-run

# Actually sync new posts
node instagramSync.js --sync

# Show setup instructions
node instagramSync.js --setup
```

## 🛠️ Troubleshooting

### Common Issues

**"Invalid Instagram URL format"**
- Ensure URL starts with `https://www.instagram.com/p/` or `https://instagram.com/p/`
- Remove any tracking parameters from the URL

**"Image file not found"**
- Check the file path is correct
- Use absolute paths or paths relative to the project root
- Ensure the image file exists and is readable

**"Could not extract album info from caption"**
- The script looks for patterns like "Album by Artist" in captions
- Make sure your caption follows a consistent format
- Check the dry-run output to see what was detected

**Instagram API Errors**
- Verify your access token is valid
- Check that your Instagram account is connected to the Facebook app
- Access tokens expire and may need to be refreshed

### Album Numbering

The script automatically finds the highest existing album number and increments it. If you have gaps in numbering (e.g., missing #262, #263), the script will still use the highest number found.

### Image Processing

Images are automatically:
- Converted to WebP format for better compression
- Resized to 800x800px (maintaining aspect ratio)
- Optimized to 85% quality for good balance of size/quality

## 📁 File Structure

After running the scripts, you'll have:
```
ayotalksmusic/
├── albums.json              # Updated with new entries
├── images/
│   ├── 301.webp            # New album image
│   ├── 302.webp            # Next album image
│   └── ...
├── temp/                   # Temporary files (auto-cleaned)
├── instagram-config.json   # Instagram API configuration
├── addAlbum.js            # Album addition script
└── instagramSync.js       # Instagram sync script
```

## 🔄 Recommended Workflow

### Option 1: Manual Process (Current + Enhanced)
1. Create review → Post to Instagram
2. Use the album addition script:
   ```bash
   npm run add-album "Album Name by Artist" "https://instagram.com/p/ABC123/" "./path/to/review-image.jpg"
   ```
3. Commit and push changes

### Option 2: Semi-Automated (Recommended)
1. Create reviews → Post to Instagram as usual
2. Periodically run preview to see what would be synced:
   ```bash
   npm run instagram-preview
   ```
3. Review the detected albums and sync them:
   ```bash
   npm run instagram-sync
   ```
4. Commit and push changes

### Option 3: Fully Automated (Future Enhancement)
- Set up GitHub Actions to run sync daily
- Automatic commits of new albums
- Slack/email notifications of new additions

## 🔧 Advanced Configuration

You can modify the scripts for your specific needs:

**Change image dimensions** (in `addAlbum.js`):
```javascript
.resize(800, 800, { 
    fit: 'cover',
    withoutEnlargement: true 
})
```

**Adjust image quality** (in `addAlbum.js`):
```javascript
.toFormat('webp', { quality: 85 })
```

**Modify caption parsing patterns** (in `instagramSync.js`):
```javascript
const patterns = [
    // Add your custom patterns here
    /your-custom-pattern/i,
    // existing patterns...
];
```

## 🆘 Getting Help

If you encounter issues:
1. Check this documentation
2. Look at the error messages (they're designed to be helpful)
3. Run scripts with `--help` flag for usage information
4. Check the temp files for debugging image processing issues

**Most Common Fix:** Make sure you're in the project directory when running commands!