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

    // 3. Load Data
    fetch('data/guru-list.json')
        .then(response => response.json())
        .then(data => {
            gurusData = data;
            renderMarkers('all');
        })
        .catch(err => console.error('Error loading guru data:', err));

    // 4. Render Markers Logic
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
            const marker = L.marker([guru.lat, guru.lng]);
            
            // Custom Popup Layout
            const popupContent = `
                <div class="guru-popup">
                    <h3>${guru.name}</h3>
                    <div class="dish">Dish: ${guru.specialty}</div>
                    <p>${guru.description}</p>
                    <a href="#" class="guru-btn" onclick="openMaps(${guru.lat}, ${guru.lng}); return false;">Guru, take me there!</a>
                </div>
            `;

            marker.bindPopup(popupContent);
            markersLayer.addLayer(marker);
        });
    }

    // 5. Filter Logic
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Toggle
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Data Filter
            const filter = btn.getAttribute('data-filter');
            renderMarkers(filter);
        });
    });

    // 6. Deep Link Logic
    window.openMaps = (lat, lng) => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);

        let url;
        if (isIOS) {
            // Apple Maps URL
            url = `maps://maps.apple.com/?q=${lat},${lng}`;
        } else if (isAndroid) {
            // Google Maps Android Intent
            url = `geo:${lat},${lng}?q=${lat},${lng}`;
        } else {
            // Browser Default (Google Maps)
            url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }

        window.open(url, '_blank');
    };
});
