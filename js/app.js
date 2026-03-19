document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Map
    const map = L.map('map', {
        zoomControl: false // Move zoom control later or hide
    }).setView([1.3521, 103.8198], 12); // Centered on Singapore

    // 2. Add Stadia Maps Tiles (Alidade Smooth Style)
    const stadiaAlidadeSmooth = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=ec7a4e92-5a2d-4b4e-82ca-f9e0cdfef0f8', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add Zoom Control to bottom right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    let gurusData = [];
    let markersLayer = L.layerGroup().addTo(map);
    let userLocationMarker = null;
    let activeFilter = 'all';
    let searchQuery = '';

    // 5. Render Markers Logic
    function renderMarkers() {
        markersLayer.clearLayers();

        const fType = activeFilter.toLowerCase();
        const query = searchQuery.toLowerCase();

        const filtered = gurusData.filter(guru => {
            // Check Tag Filter
            let passesFilter = false;
            if (fType === 'all') {
                passesFilter = true;
            } else {
                const gType = (guru.type || '').toLowerCase();
                const tags = (guru.tags || []).map(t => t.toLowerCase());
                
                if (fType === 'stars') {
                    passesFilter = gType === 'stars' || gType === 'michelin_star' || tags.includes('michelin plate') || tags.includes('michelin star');
                } else if (fType === 'bib gourmand') {
                    passesFilter = gType === 'bib gourmand' || gType === 'bib_gourmand' || tags.includes('bib gourmand');
                } else {
                    passesFilter = tags.includes(fType);
                }
            }

            if (!passesFilter) return false;

            // Check Search Query
            if (query) {
                const searchString = `${guru.name} ${guru.specialty || ''} ${guru.description || ''} ${(guru.tags || []).join(' ')}`.toLowerCase();
                if (!searchString.includes(query)) return false;
            }

            return true;
        });

        let latlngs = [];

        filtered.forEach(guru => {
            const gType = (guru.type || 'Bib Gourmand').toLowerCase();
            let iconDiv = (gType === 'stars' || gType === 'michelin_star') ? '<div class="marker-pin"></div>' : '<div class="marker-pin orange"></div>';
            
            // Media Badge check
            const hasMedia = ['video', 'facebook_reel', 'instagram_post'].includes(guru.media_type) || 
                             (guru.reviews && guru.reviews.some(r => ['video', 'facebook_reel', 'instagram_post'].includes(r.media_type)));
            
            if (hasMedia) {
                iconDiv += '<div class="media-badge">▶</div>';
            }

            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: iconDiv,
                iconSize: [30, 42],
                iconAnchor: [15, 42],
                popupAnchor: [0, -40]
            });
            // Extract specialty and description with fallbacks for Ingestor data
            const specialty = guru.specialty || (guru.reviews && guru.reviews[0] ? guru.reviews[0].specialty_dish : 'Specialty pending');
            const description = guru.description || (guru.reviews && guru.reviews[0] ? `Recent Post: ${guru.reviews[0].post_date || 'New!'}` : '');
            
            // Build rich data strings
            const addressHtml = guru.address ? `<div class="address" style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">📍 ${guru.address}</div>` : '';
            
            // Michelin Status Logic
            let michelinStatusHtml = '';
            const gTypeLower = (guru.type || '').toLowerCase();
            const tagsLower = (guru.tags || []).map(t => t.toLowerCase());
            
            if (gTypeLower === 'michelin_star' || gTypeLower === 'stars' || tagsLower.includes('michelin star') || tagsLower.includes('michelin plate') || tagsLower.includes('bib gourmand')) {
                let statusText = "Michelin Recognized";
                if (tagsLower.includes('michelin plate')) statusText = "Michelin Plate";
                if (tagsLower.includes('michelin star') || gTypeLower === 'michelin_star' || gTypeLower === 'stars') statusText = "Michelin Starred";
                if (gTypeLower === 'bib_gourmand' || gTypeLower === 'bib gourmand' || tagsLower.includes('bib gourmand')) statusText = "Bib Gourmand";
                
                michelinStatusHtml = `<div class="michelin" style="font-weight: 700; color: var(--primary-red); margin-bottom: 5px; font-size: 0.9rem;">⭐ Michelin Status: ${statusText}</div>`;
            }

            // Blogger Link Logic
            let bloggerHtml = '';
            if (guru.reviews && guru.reviews.length > 0) {
               const review = guru.reviews[0];
               let sourceName = review.source;
               if (!sourceName && review.url) {
                   if (review.url.includes('facebook')) sourceName = "Facebook Reel";
                   if (review.url.includes('instagram')) sourceName = "Instagram Post";
                   // Specific requested override for Poh Cheu
                   if (guru.name === "Poh Cheu Kitchen") sourceName = "Singapore Foodie";
               }

               if (sourceName && review.url) {
                   bloggerHtml = `
                    <div style="margin-top: 10px; margin-bottom: 10px;">
                        <span style="font-size: 0.85rem; color: #555;">Featured by: <strong style="color: var(--deep-blue);">${sourceName}</strong></span>
                        <a href="${review.url}" target="_blank" class="blogger-btn" style="display: block; width: 100%; background: #4267B2; color: white; text-align: center; padding: 8px; border-radius: 8px; text-decoration: none; font-size: 0.9rem; margin-top: 5px; font-weight: 600;">
                            🎥 View Blogger Post
                        </a>
                    </div>
                   `;
               }
            }
            
            const marker = L.marker([guru.lat, guru.lng], { icon: customIcon });
            latlngs.push([guru.lat, guru.lng]);
            
            // Custom Popup Layout
            const popupContent = `
                <div class="guru-popup">
                    <h3>${guru.name}</h3>
                    <div class="dish">Dish: ${specialty}</div>
                    ${addressHtml}
                    ${michelinStatusHtml}
                    ${description ? `<p style="font-size: 0.9rem; color: var(--dark-gray); margin-bottom: 10px;">${description}</p>` : ''}
                    ${bloggerHtml}
                    <a href="#" class="guru-btn" onclick="openMaps(${guru.lat}, ${guru.lng}); return false;">Guru, take me there!</a>
                </div>
            `;

            marker.bindPopup(popupContent);
            markersLayer.addLayer(marker);
        });

        if (latlngs.length > 0) {
            map.fitBounds(latlngs, { padding: [50, 50], maxZoom: 15 });
        }
    }

    // 6. Geolocation Logic
    const locateBtn = document.getElementById('locate-me');
    locateBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        locateBtn.innerHTML = `
            <svg class="animate-spin" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10"></circle>
            </svg>
        `;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // Update User Marker
                if (userLocationMarker) {
                    userLocationMarker.setLatLng([latitude, longitude]);
                } else {
                    userLocationMarker = L.marker([latitude, longitude], {
                        icon: L.divIcon({
                            className: 'user-location-marker',
                            html: '<div class="user-location-dot"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(map);
                }

                map.flyTo([latitude, longitude], 15);
                
                // Reset Button Icon
                resetLocateIcon();
            },
            (err) => {
                console.error('Geolocation error:', err);
                alert('Unable to find your location. Please check your permissions.');
                resetLocateIcon();
            },
            { enableHighAccuracy: true }
        );
    });

    function resetLocateIcon() {
        locateBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
        `;
    }

    // 7. Load Data
    fetch('data/guru-list.json')
        .then(response => response.json())
        .then(data => {
            gurusData = data;
            buildFilterPills(data);
            renderMarkers();
        })
        .catch(err => console.error('Error loading guru data:', err));

    function buildFilterPills(data) {
        const filterBar = document.getElementById('filter-bar');
        
        let tagsSet = new Set();
        data.forEach(g => {
            if (g.tags) g.tags.forEach(t => tagsSet.add(t));
        });
        
        // Base pills
        let html = `
            <button class="filter-btn active" data-filter="all">Show All</button>
            <button class="filter-btn" data-filter="Stars">⭐ Stars</button>
            <button class="filter-btn" data-filter="Bib Gourmand">🍲 Bib Gourmand</button>
        `;
        
        // Add unique tags
        Array.from(tagsSet).sort().forEach(tag => {
            if (tag.toLowerCase() !== 'michelin star' && tag.toLowerCase() !== 'bib gourmand' && tag.toLowerCase() !== 'michelin plate') {
                html += `<button class="filter-btn" data-filter="${tag}">${tag}</button>`;
            }
        });
        
        filterBar.innerHTML = html;
        
        // Attach events
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.getAttribute('data-filter');
                renderMarkers();
            });
        });
    }

    // 8. Search Logic
    const searchInput = document.getElementById('guru-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderMarkers();
        });
    }

    // 9. Deep Link Logic
    window.openMaps = (lat, lng) => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);

        let url;
        if (isIOS) {
            url = `maps://maps.apple.com/?q=${lat},${lng}`;
        } else if (isAndroid) {
            url = `geo:${lat},${lng}?q=${lat},${lng}`;
        } else {
            url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }

        window.open(url, '_blank');
    };
});
