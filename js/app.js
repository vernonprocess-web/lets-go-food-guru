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

    // 4. Custom Icons
    const redIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-pin"></div>',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -40]
    });

    const orangeIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-pin orange"></div>',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -40]
    });

    // 5. Render Markers Logic
    function renderMarkers(filterType) {
        markersLayer.clearLayers();

        const fType = filterType.toLowerCase();
        const filtered = gurusData.filter(guru => {
            if (fType === 'all') return true;
            
            const gType = guru.type.toLowerCase();
            
            // Map 'Stars' button to both 'Stars' and 'michelin_star'
            if (fType === 'stars') {
                return gType === 'stars' || gType === 'michelin_star';
            }
            
            // Map 'Bib Gourmand' button to both 'Bib Gourmand' and 'bib_gourmand'
            if (fType === 'bib gourmand') {
                return gType === 'bib gourmand' || gType === 'bib_gourmand';
            }

            return gType === fType;
        });

        filtered.forEach(guru => {
            const gType = (guru.type || 'Bib Gourmand').toLowerCase();
            const icon = (gType === 'stars' || gType === 'michelin_star') ? redIcon : orangeIcon;
            
            // Extract specialty and description with fallbacks for Ingestor data
            const specialty = guru.specialty || (guru.reviews && guru.reviews[0] ? guru.reviews[0].specialty_dish : 'Specialty pending');
            const description = guru.description || (guru.reviews && guru.reviews[0] ? `Recent Post: ${guru.reviews[0].post_date}` : 'Check it out!');
            
            const marker = L.marker([guru.lat, guru.lng], { icon: icon });
            
            // Custom Popup Layout
            const popupContent = `
                <div class="guru-popup">
                    <h3>${guru.name}</h3>
                    <div class="dish">Dish: ${specialty}</div>
                    <p>${description}</p>
                    <a href="#" class="guru-btn" onclick="openMaps(${guru.lat}, ${guru.lng}); return false;">Guru, take me there!</a>
                </div>
            `;

            marker.bindPopup(popupContent);
            markersLayer.addLayer(marker);
        });
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
            renderMarkers('all');
        })
        .catch(err => console.error('Error loading guru data:', err));

    // 8. Filter Logic
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            renderMarkers(filter);
        });
    });

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
