const { XMLParser } = require('fast-xml-parser');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const STEAM_RSS = 'https://store.steampowered.com/feeds/curator/44917508/';
    const YT_HANDLE = 'GogetaSuperx';

    // Pretend to be a real browser so Steam/YouTube don't block the request
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    };

    try {
        const parser = new XMLParser();
        
        // 1. Scrape YouTube to find the Channel ID
        let ytVideos = [];
        try {
            const ytPageRes = await fetch(`https://www.youtube.com/@${YT_HANDLE}`, { headers });
            const ytPageHtml = await ytPageRes.text();
            
            // Look for the channel ID in the HTML source
            const ytChannelIdMatch = ytPageHtml.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/) 
                                  || ytPageHtml.match(/channel\/(UC[a-zA-Z0-9_-]{22})/);
            const ytChannelId = ytChannelIdMatch ? ytChannelIdMatch[1] : null;

            if (ytChannelId) {
                // Fetch YouTube RSS Feed
                const ytRssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ytChannelId}`, { headers });
                const ytRssXml = await ytRssRes.text();
                const ytParsed = parser.parse(ytRssXml);
                
                if (ytParsed.feed && ytParsed.feed.entry) {
                    let entries = ytParsed.feed.entry;
                    if (!Array.isArray(entries)) entries = [entries];
                    
                    ytVideos = entries.map(entry => ({
                        title: entry.title,
                        link: entry.link?.href || ''
                    }));
                }
            }
        } catch (ytError) {
            console.error('YouTube fetch failed, continuing without YT links:', ytError.message);
        }

        // 2. Fetch Steam Curator RSS
        const steamRes = await fetch(STEAM_RSS, { headers });
        if (!steamRes.ok) throw new Error('Steam RSS failed to load');
        
        const steamXml = await steamRes.text();
        const steamParsed = parser.parse(steamXml);
        
        let items = steamParsed.rss.channel.item || [];
        if (!Array.isArray(items)) items = [items];

        // Helper to normalize titles for matching
        const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

        // 3. Process Games
        const games = items.map(item => {
            const title = item.title;
            const steamLink = item.link;
            const description = item.description || '';
            
            // Extract Steam Image
            const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
            const image = imgMatch ? imgMatch[1] : 'https://via.placeholder.com/460x215?text=No+Image';
            
            // Clean HTML from description
            const cleanDesc = description.replace(/<[^>]*>?/gm, '').split('Recommended')[0].trim();

            // Extract Playtester/External Link from description
            const urlMatches = description.match(/href="([^"]*)"/g);
            let playtestLink = null;
            
            if (urlMatches) {
                const links = urlMatches.map(u => u.replace(/href="|"/g, ''));
                playtestLink = links.find(u => !u.includes('store.steampowered.com') && !u.includes('steamcommunity'));
            }

            // 4. Match YouTube Video
            let youtubeVideo = null;
            if (ytVideos.length > 0) {
                const normalizedSteamTitle = normalize(title);
                const matchedVideo = ytVideos.find(v => {
                    const normalizedYtTitle = normalize(v.title);
                    return normalizedYtTitle.includes(normalizedSteamTitle) || normalizedSteamTitle.includes(normalizedYtTitle);
                });
                if (matchedVideo) youtubeVideo = matchedVideo.link;
            }

            return {
                title,
                steamLink,
                image,
                description: cleanDesc,
                playtestLink,
                youtubeVideo
            };
        });

        res.status(200).json(games);
    } catch (error) {
        console.error('Fatal Error fetching data:', error);
        // Send valid JSON even on error so frontend doesn't crash
        res.status(500).json({ error: 'Failed to fetch games', details: error.message });
    }
};
