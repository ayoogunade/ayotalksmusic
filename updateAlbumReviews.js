// Function to update recent album reviews
function updateRecentAlbumReviews() {
    fetch('albums.json')
        .then(response => response.json())
        .then(albums => {
            // Get the latest 4 albums (the newest are at the bottom)
            const recentAlbums = albums.slice(-4).reverse().map(album => {
                return `
                    <div class="col-6 col-12-medium">
                        <section class="box">
                            <img src="${album.image}" alt="${album.name}" class="album-image" />
                            <h3>${album.name}</h3>
                            <ul class="actions special">
                                <li><a href="${album.link}" class="button">Read Review</a></li>
                            </ul>
                        </section>
                    </div>`;
            }).join('');
            
            const recentAlbumReviews = document.getElementById('recentAlbumReviews');
            recentAlbumReviews.innerHTML = `
                <header class="major">
                    <h2>Recent Album Reviews</h2>
                </header>
                <div class="row">${recentAlbums}</div>`;
        })
        .catch(error => {
            console.error('Error fetching album data:', error);
        });
}

// Function to get a random album from the JSON file
function getRandomAlbumOfTheDay() {
    fetch('albums.json')
        .then(response => response.json())
        .then(albums => {
            const randomIndex = Math.floor(Math.random() * albums.length);
            const album = albums[randomIndex];

            const albumOfTheDay = document.getElementById('albumOfTheDay');
            albumOfTheDay.innerHTML = `
                <header class="major">
                    <h2>Album of the Day</h2>
                </header>
                <div class="album-card">
                    <a href="${album.link}" target="_blank">
                        <img src="${album.image}" alt="${album.name}" />
                        <h3>${album.name}</h3>
                        <p>Check it out on Instagram!</p>
                    </a>
                </div>`;
        })
        .catch(error => {
            console.error('Error fetching albums:', error);
        });
}

// Initialize both functions on page load
function initializePage() {
    updateRecentAlbumReviews();
    getRandomAlbumOfTheDay();
}

// Call the initialization function
initializePage();
