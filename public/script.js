document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('games-grid');
    const loading = document.getElementById('loading');

    fetch('/api/games')
        .then(res => res.json())
        .then(games => {
            loading.style.display = 'none';
            
            if (!games || games.length === 0) {
                grid.innerHTML = '<p>No games found.</p>';
                return;
            }

            games.forEach(game => {
                const card = document.createElement('div');
                card.className = 'game-card';

                let actionButtons = '';
                
                // Playtest Button Logic
                if (game.playtestLink) {
                    actionButtons += `<a href="${game.playtestLink}" target="_blank" class="btn btn-playtest">Join Playtest</a>`;
                } else {
                    actionButtons += `<span class="btn btn-steam" style="pointer-events: none;">No Playtest Link Found</span>`;
                }

                // YouTube / Steam Button Logic
                if (game.youtubeVideo) {
                    actionButtons += `<a href="${game.youtubeVideo}" target="_blank" class="btn btn-watch">▶ Watch on YouTube</a>`;
                } else {
                    actionButtons += `<a href="${game.steamLink}" target="_blank" class="btn btn-steam">View on Steam</a>`;
                }

                card.innerHTML = `
                    <img src="${game.image}" alt="${game.title}" class="game-image" onerror="this.src='https://via.placeholder.com/460x215?text=No+Image'">
                    <div class="game-content">
                        <h3 class="game-title">${game.title}</h3>
                        <p class="game-desc">${game.description}</p>
                        <div class="btn-group">
                            ${actionButtons}
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        })
        .catch(err => {
            loading.style.display = 'none';
            grid.innerHTML = '<p style="color: red;">Error loading games. Check console.</p>';
            console.error(err);
        });
});
