// Helper function to get the day of the year (1-365)
function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff =
    now -
    start +
    (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
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
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  ); // Midnight of the next day
  const diff = midnight - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

// Function to update recent album reviews
function updateRecentAlbumReviews() {
  fetch("albums.json")
    .then((response) => response.json())
    .then((albums) => {
      // Get the latest 4 albums (the newest are at the bottom)
      const recentAlbums = albums
        .slice(-4)
        .reverse()
        .map((album) => {
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
        })
        .join("");

      const recentAlbumReviews = document.getElementById("recentAlbumReviews");
      recentAlbumReviews.innerHTML = `
                <header class="major">
                    <h2>Recent Album Reviews</h2>
                </header>
                <div class="row">${recentAlbums}</div>`;
    })
    .catch((error) => {
      console.error("Error fetching album data:", error);
    });
}

// Function to update the Album of the Day and Random Album
function updateAlbumsOfTheDayAndRandom() {
  fetch("albums.json")
    .then((response) => response.json())
    .then((albums) => {
      // Get Album of the Day (consistent) and Random Album (changes on every refresh)
      const albumOfTheDay = getAlbumOfTheDay(albums);
      const randomAlbum = getRandomAlbum(albums);

      // Update the Album of the Day section
      const albumOfTheDayElement = document.getElementById("albumOfTheDay");
      albumOfTheDayElement.innerHTML = `
                <header class="major">
                    <h2>Album of the Day</h2>
                </header>
                <div class="album-card">
                    <a href="${albumOfTheDay.link}" target="_blank">
                        <img src="${albumOfTheDay.image}" alt="${albumOfTheDay.name}" />
                        <h3>${albumOfTheDay.name}</h3>
                        <p>Check it out on Instagram!</p>
                    </a>
                </div>
            `;

      // Calculate and display the time until midnight
      const timeUntilMidnight = getTimeUntilMidnight();
      const timeUntilMidnightElement = document.createElement("p");
      timeUntilMidnightElement.textContent = `Time until next reset: ${timeUntilMidnight}`;
      albumOfTheDayElement.appendChild(timeUntilMidnightElement);

      // Update the Random Album section
      const randomAlbumElement = document.getElementById("randomAlbum");
      randomAlbumElement.innerHTML = `
                <header class="major">
                    <h2>Random Album</h2>
                </header>
                <div class="album-card">
                    <a href="${randomAlbum.link}" target="_blank">
                        <img src="${randomAlbum.image}" alt="${randomAlbum.name}" />
                        <h3>${randomAlbum.name}</h3>
                        <p>Check it out on Instagram!</p>
                    </a>
                </div>`;
    })
    .catch((error) => {
      console.error("Error fetching albums:", error);
    });
}

// Initialize all functions on page load
function initializePage() {
  updateRecentAlbumReviews();
  updateAlbumsOfTheDayAndRandom();
}

// Call the initialization function
initializePage();
