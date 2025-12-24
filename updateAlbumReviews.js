// updateAlbumReviews.js

// Helper function to get the day of the year (1-365)
function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start + (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

// Function to select the "Album of the Day" (consistent per day)
function getAlbumOfTheDay(albums) {
    const dayOfYear = getDayOfYear();
    return albums[dayOfYear % albums.length]; // Cycle through the albums based on the day of the year
}

// Function to get a random album
function getRandomAlbum(albums) {
    const randomIndex = Math.floor(Math.random() * albums.length);
    return albums[randomIndex];
}

// Calculate time until midnight
function getTimeUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // Midnight of the next day
    const diff = midnight - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

// Function to update recent album reviews
function updateRecentAlbumReviews() {
    fetch('albums.json')
        .then(response => response.json())
        .then(albums => {
            // Get the latest 4 albums (the newest are at the bottom)
            const recentAlbums = albums.slice(-4).reverse().map(album => {
                return `
                    <section class="box special">
                        <span class="image featured"><img src="${album.image}" alt="${album.name}" /></span>
                        <h3>${album.name}</h3>
                        <ul class="actions special">
                            <li><a href="${album.link}" class="button alt" target="_blank">Read Review</a></li>
                        </ul>
                    </section>`;
            }).join('');
            
            const recentContainer = document.querySelector('#recentAlbumReviews .row');
            if (recentContainer) {
                recentContainer.innerHTML = recentAlbums;
            }
        })
        .catch(error => {
            console.error('Error fetching album data:', error);
        });
}

// Function to update the Album of the Day and Random Album
function updateAlbumsOfTheDayAndRandom() {
    fetch('albums.json')
        .then(response => response.json())
        .then(albums => {
            // Get Album of the Day (consistent) and Random Album (changes on every refresh)
            const albumOfTheDay = getAlbumOfTheDay(albums);
            const randomAlbum = getRandomAlbum(albums);

            // Update the Album of the Day section
            const albumOfTheDayElement = document.querySelector('#albumOfTheDay .album-card');
            if (albumOfTheDayElement) {
                albumOfTheDayElement.innerHTML = `
                    <a href="${albumOfTheDay.link}" target="_blank">
                        <img src="${albumOfTheDay.image}" alt="${albumOfTheDay.name}" />
                        <h3>${albumOfTheDay.name}</h3>
                        <p>Check it out on Instagram!</p>
                    </a>`;
            }

            // Calculate and display the time until midnight
            const timeUntilMidnight = getTimeUntilMidnight();
            const timeDisplay = document.createElement('p');
            timeDisplay.innerHTML = `<span class="countdown">Time until next reset: ${timeUntilMidnight}</span>`;
            
            // Remove any existing countdown
            const existingCountdown = document.querySelector('#albumOfTheDay .countdown');
            if (existingCountdown) {
                existingCountdown.parentElement.remove();
            }
            
            // Add the new countdown
            const albumOfTheDayContainer = document.getElementById('albumOfTheDay');
            if (albumOfTheDayContainer) {
                albumOfTheDayContainer.appendChild(timeDisplay);
            }

            // Update the Random Album section
            const randomAlbumElement = document.querySelector('#randomAlbum .album-card');
            if (randomAlbumElement) {
                randomAlbumElement.innerHTML = `
                    <a href="${randomAlbum.link}" target="_blank">
                        <img src="${randomAlbum.image}" alt="${randomAlbum.name}" />
                        <h3>${randomAlbum.name}</h3>
                        <p>Check it out on Instagram!</p>
                    </a>`;
            }
        })
        .catch(error => {
            console.error('Error fetching albums:', error);
        });
}

// Initialize all functions on page load
function initializePage() {
    // Only run these functions on the homepage
    if (document.getElementById('albumOfTheDay')) {
        updateRecentAlbumReviews();
        updateAlbumsOfTheDayAndRandom();
        
        // Update the countdown every minute
        setInterval(() => {
            const timeUntilMidnight = getTimeUntilMidnight();
            const countdownElement = document.querySelector('#albumOfTheDay .countdown');
            if (countdownElement) {
                countdownElement.textContent = `Time until next reset: ${timeUntilMidnight}`;
            }
        }, 60000);
    }
}

// Call the initialization function when the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}