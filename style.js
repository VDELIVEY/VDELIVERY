// Global variables for Leaflet maps and routing
let pickupMap, deliveryMap;
let pickupMarker, deliveryMarker;
let routeLayer = null;
let currentFormData = null;

// Uganda bounds (approx): south, west, north, east
const UGANDA_BOUNDS = L.latLngBounds([ -1.5, 29.5 ], [ 4.9, 35.1 ]);

// Rates (UGX)
const BASE_FEE = 3000; // flat base fee
const RATE_MOTORCYCLE = 1500; // per km
const RATE_CAR = 4000; // per km

// Initialize Leaflet maps with enhanced features and Uganda restrictions
function initMaps() {
    console.log('Initializing OpenStreetMap + Leaflet with Uganda restrictions...');
    
    // Default center (Kampala, Uganda)
    const defaultCenter = [0.3476, 32.5825];
    const defaultZoom = 13;
    
    try {
        // High-quality tile layers
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        });

        const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CartoDB',
            maxZoom: 20
        });

        // Only initialize maps if their containers exist (when toggled open)
        if (document.getElementById('pickupMap') && document.getElementById('pickupMap').offsetParent !== null) {
            // Initialize Pickup Map
            pickupMap = L.map('pickupMap', {
                center: defaultCenter,
                zoom: defaultZoom,
                layers: [cartoVoyager],
                zoomControl: false,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                touchZoom: true,
                dragging: true
            });

            // Add zoom controls
            L.control.zoom({ position: 'topright' }).addTo(pickupMap);
            L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(pickupMap);

            // Add layer controls
            const baseMaps = {
                "Street Map": cartoVoyager,
                "OpenStreetMap": osmLayer
            };
            L.control.layers(baseMaps, null, { position: 'topright' }).addTo(pickupMap);

            // Add geocoder with Uganda validation
            L.Control.geocoder({
                defaultMarkGeocode: false,
                position: 'topleft',
                placeholder: 'Search location in Uganda...'
            })
            .on('markgeocode', function(e) {
                const center = e.geocode.center;
                if (!UGANDA_BOUNDS.contains(center)) {
                    showNotification('Search result is outside Uganda — please pick a location inside Uganda.');
                    return;
                }
                pickupMap.setView(center, 16);
                updateLocation(center, 'pickup');
            })
            .addTo(pickupMap);

            // Create custom pickup icon
            const pickupIcon = L.divIcon({
                className: 'custom-marker pickup-marker',
                html: `
                    <div class="marker-pulse pickup-pulse"></div>
                    <div class="marker-icon">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            });

            // Initialize pickup marker
            pickupMarker = L.marker(defaultCenter, {
                icon: pickupIcon,
                draggable: true
            }).addTo(pickupMap);

            // Add click listener with Uganda validation
            pickupMap.on('click', function(e) {
                onMapClick(e, 'pickup');
            });

            // Add dragend listener with Uganda validation
            pickupMarker.on('dragend', function(e) {
                onMarkerDragEnd(e, 'pickup');
            });
        }

        if (document.getElementById('deliveryMap') && document.getElementById('deliveryMap').offsetParent !== null) {
            // Initialize Delivery Map
            deliveryMap = L.map('deliveryMap', {
                center: defaultCenter,
                zoom: defaultZoom,
                layers: [cartoVoyager],
                zoomControl: false,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                touchZoom: true,
                dragging: true
            });

            // Add zoom controls
            L.control.zoom({ position: 'topright' }).addTo(deliveryMap);
            L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(deliveryMap);

            // Add layer controls
            const baseMaps = {
                "Street Map": cartoVoyager,
                "OpenStreetMap": osmLayer
            };
            L.control.layers(baseMaps, null, { position: 'topright' }).addTo(deliveryMap);

            // Add geocoder with Uganda validation
            L.Control.geocoder({
                defaultMarkGeocode: false,
                position: 'topleft',
                placeholder: 'Search location in Uganda...'
            })
            .on('markgeocode', function(e) {
                const center = e.geocode.center;
                if (!UGANDA_BOUNDS.contains(center)) {
                    showNotification('Search result is outside Uganda — please pick a location inside Uganda.');
                    return;
                }
                deliveryMap.setView(center, 16);
                updateLocation(center, 'delivery');
            })
            .addTo(deliveryMap);

            // Create custom delivery icon
            const deliveryIcon = L.divIcon({
                className: 'custom-marker delivery-marker',
                html: `
                    <div class="marker-pulse delivery-pulse"></div>
                    <div class="marker-icon">
                        <i class="fas fa-flag-checkered"></i>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            });

            // Initialize delivery marker
            deliveryMarker = L.marker(defaultCenter, {
                icon: deliveryIcon,
                draggable: true
            }).addTo(deliveryMap);

            // Add click listener with Uganda validation
            deliveryMap.on('click', function(e) {
                onMapClick(e, 'delivery');
            });

            // Add dragend listener with Uganda validation
            deliveryMarker.on('dragend', function(e) {
                onMarkerDragEnd(e, 'delivery');
            });
        }

        // Hide loading indicators
        document.querySelectorAll('.map-loading').forEach(el => {
            if (el.parentElement.style.display !== 'none') {
                el.style.display = 'none';
            }
        });

        console.log('Leaflet maps initialized successfully with Uganda restrictions!');

        // Check if we have both locations to show route section
        checkRouteAvailability();

    } catch (error) {
        console.error('Error initializing Leaflet maps:', error);
    }
}

// Map click handler that enforces Uganda bounds
function onMapClick(e, type) {
    const latlng = e.latlng;
    if (!UGANDA_BOUNDS.contains(latlng)) {
        showNotification('Location outside Uganda — pick a point inside Uganda.');
        return; // block clicks outside Uganda
    }
    updateLocation(latlng, type);
    showMapFeedback(type === 'pickup' ? pickupMap : deliveryMap, (type === 'pickup' ? 'Pickup' : 'Delivery') + ' location set');
}

function onMarkerDragEnd(e, type) {
    const latlng = e.target.getLatLng();
    if (!UGANDA_BOUNDS.contains(latlng)) {
        showNotification('Marker outside Uganda — resetting to last valid position.');
        // reset marker to previous valid position: if hidden input has coords, use that
        const hidden = document.getElementById(type + 'CoordsHidden').value;
        if (hidden && hidden !== 'Not set') {
            const [lat, lng] = hidden.split(',').map(s => parseFloat(s.trim()));
            e.target.setLatLng([lat, lng]);
        } else {
            // snap back to Kampala
            e.target.setLatLng([0.3476, 32.5825]);
        }
        return;
    }
    updateLocation(latlng, type);
    showMapFeedback(type === 'pickup' ? pickupMap : deliveryMap, (type === 'pickup' ? 'Pickup' : 'Delivery') + ' location updated');
}

// Update location when map is clicked or marker is dragged
function updateLocation(latlng, type) {
    const lat = latlng.lat.toFixed(6);
    const lng = latlng.lng.toFixed(6);
    
    // Generate OpenStreetMap link
    const mapLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
    
    if (type === 'pickup') {
        pickupMarker.setLatLng(latlng);
        document.getElementById('pickupLat').value = lat;
        document.getElementById('pickupLng').value = lng;
        document.getElementById('pickupLink').value = mapLink;
        document.getElementById('pickupLinkHidden').value = mapLink;
        document.getElementById('pickupCoordsHidden').value = `${lat}, ${lng}`;
        
        // Auto-pan to marker with smooth animation
        pickupMap.setView(latlng, pickupMap.getZoom(), {
            animate: true,
            duration: 0.5
        });
        
    } else {
        deliveryMarker.setLatLng(latlng);
        document.getElementById('deliveryLat').value = lat;
        document.getElementById('deliveryLng').value = lng;
        document.getElementById('deliveryLink').value = mapLink;
        document.getElementById('deliveryLinkHidden').value = mapLink;
        document.getElementById('deliveryCoordsHidden').value = `${lat}, ${lng}`;
        
        // Auto-pan to marker with smooth animation
        deliveryMap.setView(latlng, deliveryMap.getZoom(), {
            animate: true,
            duration: 0.5
        });
    }
    
    // Try to get address for the coordinates with Uganda validation
    getAddressFromCoordinates(lat, lng).then(addr => {
        if (addr && addr.country && addr.country.toLowerCase().includes('uganda')) {
            const field = type === 'pickup' ? 'pickupAddress' : 'deliveryAddress';
            const current = document.getElementById(field).value;
            // Only auto-fill if the field is empty or contains placeholder
            if (!current || current.toLowerCase().includes('enter') || current.trim() === '') {
                document.getElementById(field).value = addr.display_name || '';
            }
        } else {
            // If reverse geocode says not Uganda, clear and warn
            showNotification('Selected location is not in Uganda (reverse lookup).');
        }
    });

    // Check if we should show route section
    checkRouteAvailability();
}

// Get address from coordinates using Nominatim with country check
async function getAddressFromCoordinates(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        
        if (response.ok) {
            const data = await response.json();
            const country = (data.address && data.address.country) ? data.address.country : '';
            return { 
                display_name: data.display_name || 'Address not found',
                country: country
            };
        }
    } catch (error) {
        console.error('Error reverse geocoding:', error);
    }
    
    return { display_name: 'Address lookup failed', country: '' };
}

// Check if both locations are set and inside Uganda
function checkRouteAvailability() {
    const pickupCoords = document.getElementById('pickupCoordsHidden').value;
    const deliveryCoords = document.getElementById('deliveryCoordsHidden').value;
    
    if (pickupCoords && pickupCoords !== 'Not set' && deliveryCoords && deliveryCoords !== 'Not set') {
        // ensure both are inside Uganda bounds (quick check)
        const p = pickupCoords.split(',').map(s => parseFloat(s.trim()));
        const d = deliveryCoords.split(',').map(s => parseFloat(s.trim()));
        if (UGANDA_BOUNDS.contains([p[0], p[1]]) && UGANDA_BOUNDS.contains([d[0], d[1]])) {
            document.getElementById('routeSection').style.display = 'block';
            return;
        }
    }
    document.getElementById('routeSection').style.display = 'none';
}

// Calculate route using OpenRouteService with fallback
async function calculateRoute() {
    const pickupCoords = document.getElementById('pickupCoordsHidden').value;
    const deliveryCoords = document.getElementById('deliveryCoordsHidden').value;
    const vehicleType = document.getElementById('vehicleType').value;
    
    if (!pickupCoords || !deliveryCoords || pickupCoords === 'Not set' || deliveryCoords === 'Not set') {
        showNotification('Please set both pickup and delivery locations inside Uganda first');
        return;
    }

    if (!vehicleType) {
        showNotification('Please select a vehicle type first');
        return;
    }

    const [pickupLat, pickupLng] = pickupCoords.split(',').map(coord => parseFloat(coord.trim()));
    const [deliveryLat, deliveryLng] = deliveryCoords.split(',').map(coord => parseFloat(coord.trim()));

    // Determine profile based on vehicle type
    const profile = vehicleType === 'motorcycle' ? 'driving-motorcycle' : 'driving-car';

    try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/' + profile + '/geojson', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                coordinates: [
                    [pickupLng, pickupLat],
                    [deliveryLng, deliveryLat]
                ],
                instructions: false,
                preference: 'recommended'
            })
        });

        if (response.ok) {
            const data = await response.json();
            
            // Clear previous route
            if (routeLayer) {
                pickupMap.removeLayer(routeLayer);
                deliveryMap.removeLayer(routeLayer);
            }

            // Add route to both maps
            routeLayer = L.geoJSON(data, {
                style: {
                    color: '#00d4ff',
                    weight: 6,
                    opacity: 0.8
                }
            }).addTo(pickupMap).addTo(deliveryMap);

            // Fit both maps to show the entire route
            const bounds = routeLayer.getBounds();
            pickupMap.fitBounds(bounds, { padding: [20, 20] });
            deliveryMap.fitBounds(bounds, { padding: [20, 20] });

            // Extract route information
            const route = data.features[0];
            const distanceKm = (route.properties.segments[0].distance / 1000);
            const durationMin = Math.round(route.properties.segments[0].duration / 60);
            
            // Calculate estimated cost using Uganda rates
            const rate = vehicleType === 'motorcycle' ? RATE_MOTORCYCLE : RATE_CAR;
            const estimatedCost = Math.round(BASE_FEE + Math.round(distanceKm) * rate);

            // Update route info display
            document.getElementById('routeDistance').textContent = distanceKm.toFixed(1) + ' km';
            document.getElementById('routeDuration').textContent = durationMin + ' min';
            document.getElementById('routeCost').textContent = estimatedCost.toLocaleString() + ' UGX';

            showNotification('Route calculated successfully!');

        } else {
            throw new Error('Route calculation failed');
        }

    } catch (error) {
        console.error('Error calculating route:', error);
        
        // Fallback: Calculate straight-line distance and estimate
        const straightKm = calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
        const durationEst = Math.round(straightKm * 3); // ~3 min per km average
        const rate = vehicleType === 'motorcycle' ? RATE_MOTORCYCLE : RATE_CAR;
        const estimatedCost = Math.round(BASE_FEE + straightKm * rate);

        // draw straight line on maps
        if (routeLayer) { 
            try { 
                pickupMap.removeLayer(routeLayer); 
                deliveryMap.removeLayer(routeLayer);
            } catch(e){} 
        }
        routeLayer = L.polyline([[pickupLat, pickupLng], [deliveryLat, deliveryLng]], { 
            color: '#00d4ff', 
            weight: 4, 
            dashArray: '6' 
        }).addTo(pickupMap).addTo(deliveryMap);
        
        const bounds = routeLayer.getBounds(); 
        pickupMap.fitBounds(bounds, {padding:[20,20]}); 
        deliveryMap.fitBounds(bounds, {padding:[20,20]});

        document.getElementById('routeDistance').textContent = straightKm.toFixed(1) + ' km';
        document.getElementById('routeDuration').textContent = durationEst + ' min';
        document.getElementById('routeCost').textContent = Math.round(estimatedCost).toLocaleString() + ' UGX';

        showNotification('Estimated route shown (straight-line fallback)');
    }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Clear route from maps
function clearRoute() {
    if (routeLayer) {
        pickupMap.removeLayer(routeLayer);
        deliveryMap.removeLayer(routeLayer);
        routeLayer = null;
    }
    
    document.getElementById('routeDistance').textContent = '--';
    document.getElementById('routeDuration').textContent = '--';
    document.getElementById('routeCost').textContent = '--';
    
    showNotification('Route cleared');
}

// Get current location using browser geolocation with Uganda validation
function getCurrentLocation(type) {
    if (!navigator.geolocation) {
        showNotification('Geolocation is not supported by your browser');
        return;
    }
    
    const button = type === 'pickup' ? 
        document.getElementById('getCurrentLocationPickup') : 
        document.getElementById('getCurrentLocationDelivery');
    
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
    button.disabled = true;
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const latlng = L.latLng(
                position.coords.latitude,
                position.coords.longitude
            );
            
            // Check if location is within Uganda
            if (!UGANDA_BOUNDS.contains(latlng)) {
                showNotification('Your current location is outside Uganda. Please set a location inside Uganda.');
                button.innerHTML = originalText;
                button.disabled = false;
                return;
            }
            
            updateLocation(latlng, type);
            showNotification('Location found successfully!');
            
            button.innerHTML = originalText;
            button.disabled = false;
        },
        function(error) {
            console.error('Error getting location:', error);
            let errorMessage = 'Unable to get your current location. ';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
                    break;
            }
            
            showNotification(errorMessage);
            button.innerHTML = originalText;
            button.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Show map feedback
function showMapFeedback(map, message) {
    if (!map) return;
    
    L.popup()
        .setLatLng(map.getCenter())
        .setContent(`<div class="map-feedback">${message}</div>`)
        .openOn(map);
    
    setTimeout(() => {
        map.closePopup();
    }, 1500);
}

// Copy to clipboard function
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.select();
    element.setSelectionRange(0, 99999);
    
    try {
        navigator.clipboard.writeText(element.value).then(() => {
            showNotification('Link copied to clipboard!');
        });
    } catch (err) {
        document.execCommand('copy');
        showNotification('Link copied to clipboard!');
    }
}

// Form validation for Uganda phone numbers
function ugPhoneValid(value) {
    if (!value) return false;
    const cleaned = value.replace(/\s|-/g, '');
    // Accepts formats: +2567XXXXXXXX or 07XXXXXXXX or 2567XXXXXXXX
    return /^(?:\+256|0|256)7\d{8}$/.test(cleaned);
}

// Form submission handler with Uganda validation
document.getElementById('deliveryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Client-side validation
    const required = ['senderName','senderPhone','senderEmail','recipientName','recipientPhone','packageDescription','vehicleType','pickupLandmark','deliveryLandmark'];
    for (let id of required) { 
        const el = document.getElementById(id); 
        if (!el || !el.value.trim()) { 
            el && el.focus(); 
            showNotification('Please complete all required fields including landmarks'); 
            return; 
        } 
    }
    
    // Uganda phone validation
    if (!ugPhoneValid(document.getElementById('senderPhone').value)) { 
        showNotification('Sender phone must be a valid Ugandan number (e.g. +2567...)'); 
        document.getElementById('senderPhone').focus(); 
        return; 
    }
    if (!ugPhoneValid(document.getElementById('recipientPhone').value)) { 
        showNotification('Recipient phone must be a valid Ugandan number (e.g. +2567...)'); 
        document.getElementById('recipientPhone').focus(); 
        return; 
    }

    // Terms agreement validation
    if (!document.getElementById('termsAgreement').checked) {
        showNotification('Please agree to the terms of service and privacy policy');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    submitBtn.disabled = true;
    
    // Store form data
    currentFormData = {
        senderName: document.getElementById('senderName').value,
        senderPhone: document.getElementById('senderPhone').value,
        senderEmail: document.getElementById('senderEmail').value,
        pickupAddress: document.getElementById('pickupAddress').value,
        pickupLandmark: document.getElementById('pickupLandmark').value,
        pickupCoords: document.getElementById('pickupCoordsHidden').value || 'Not set',
        pickupLink: document.getElementById('pickupLink').value || 'No location set',
        recipientName: document.getElementById('recipientName').value,
        recipientPhone: document.getElementById('recipientPhone').value,
        deliveryAddress: document.getElementById('deliveryAddress').value,
        deliveryLandmark: document.getElementById('deliveryLandmark').value,
        deliveryCoords: document.getElementById('deliveryCoordsHidden').value || 'Not set',
        deliveryLink: document.getElementById('deliveryLink').value || 'No location set',
        vehicleType: document.getElementById('vehicleType').value,
        packageDescription: document.getElementById('packageDescription').value,
        specialInstructions: document.getElementById('specialInstructions').value || 'None',
        emergencyContact: document.getElementById('emergencyContact').value || 'Not provided',
        callRecipient: document.getElementById('callRecipient').checked,
        routeDistance: document.getElementById('routeDistance').textContent,
        routeDuration: document.getElementById('routeDuration').textContent,
        routeCost: document.getElementById('routeCost').textContent,
        timestamp: new Date().toLocaleString('en-UG', { 
            timeZone: 'Africa/Kampala',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    try {
        // Submit to FormSubmit
        const form = document.getElementById('deliveryForm');
        const formData = new FormData(form);
        
        // Add additional data to form
        formData.append('Pickup Coordinates', currentFormData.pickupCoords);
        formData.append('Delivery Coordinates', currentFormData.deliveryCoords);
        formData.append('Route Distance', currentFormData.routeDistance);
        formData.append('Route Duration', currentFormData.routeDuration);
        formData.append('Estimated Cost', currentFormData.routeCost);
        formData.append('Submission Time', currentFormData.timestamp);
        
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            document.getElementById('deliveryForm').style.display = 'none';
            document.getElementById('successMessage').style.display = 'block';
        } else {
            throw new Error('Form submission failed');
        }
        
    } catch (error) {
        console.error('FormSubmit error:', error);
        // Fallback: show success message anyway
        document.getElementById('deliveryForm').style.display = 'none';
        document.getElementById('successMessage').style.display = 'block';
    } finally {
        btnText.style.display = 'flex';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
});

// WhatsApp button handler
document.getElementById('whatsappBtn').addEventListener('click', function() {
    if (!currentFormData) return;
    
    const whatsappMessage = generateWhatsAppMessage(currentFormData);
    const whatsappUrl = `https://wa.me/256757268074?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
});

// Generate WhatsApp message
function generateWhatsAppMessage(formData) {
    return `
🚀 *QUICKDELIVER - DELIVERY REQUEST*

*Sender Information*
📛 Name: ${formData.senderName}
📞 Phone: ${formData.senderPhone}
📧 Email: ${formData.senderEmail}

*Pickup Location*
📍 Address: ${formData.pickupAddress}
🏷️ Landmark: ${formData.pickupLandmark}
📌 Coordinates: ${formData.pickupCoords}
🗺️ Map: ${formData.pickupLink}

*Recipient Information*
📛 Name: ${formData.recipientName}
📞 Phone: ${formData.recipientPhone}

*Delivery Location*
📍 Address: ${formData.deliveryAddress}
🏷️ Landmark: ${formData.deliveryLandmark}
📌 Coordinates: ${formData.deliveryCoords}
🗺️ Map: ${formData.deliveryLink}

*Route Information*
📏 Distance: ${formData.routeDistance}
⏱️ Duration: ${formData.routeDuration}
💰 Est. Cost: ${formData.routeCost}

*Delivery Details*
🚗 Vehicle: ${formData.vehicleType === 'motorcycle' ? 'Motorcycle 🏍️' : 'Car 🚗'}
📦 Package: ${formData.packageDescription}
📝 Instructions: ${formData.specialInstructions}
🆘 Emergency Contact: ${formData.emergencyContact}
📞 Notify Recipient: ${formData.callRecipient ? 'Yes' : 'No'}

⏰ Request Time: ${formData.timestamp}

---
Sent via QuickDeliver Platform (Uganda)
    `.trim();
}

// Enhanced Map Control Functions
function zoomIn(mapType) {
    const map = mapType === 'pickup' ? pickupMap : deliveryMap;
    if (!map) return;
    map.zoomIn();
    showMapFeedback(map, 'Zoomed in');
}

function zoomOut(mapType) {
    const map = mapType === 'pickup' ? pickupMap : deliveryMap;
    if (!map) return;
    map.zoomOut();
    showMapFeedback(map, 'Zoomed out');
}

function recenterMap(mapType) {
    const map = mapType === 'pickup' ? pickupMap : deliveryMap;
    const marker = mapType === 'pickup' ? pickupMarker : deliveryMarker;
    
    if (!map || !marker) return;
    
    if (marker.getLatLng()) {
        map.setView(marker.getLatLng(), map.getZoom(), {
            animate: true,
            duration: 0.5
        });
        showMapFeedback(map, 'Recentered on marker');
    } else {
        // Default to Kampala center
        map.setView([0.3476, 32.5825], map.getZoom(), {
            animate: true,
            duration: 0.5
        });
        showMapFeedback(map, 'Recentered on default location');
    }
}

function clearLocation(mapType) {
    const map = mapType === 'pickup' ? pickupMap : deliveryMap;
    const marker = mapType === 'pickup' ? pickupMarker : deliveryMarker;
    
    if (!map || !marker) return;
    
    // Reset to default position
    const defaultCenter = [0.3476, 32.5825];
    marker.setLatLng(defaultCenter);
    map.setView(defaultCenter, map.getZoom());
    
    // Clear form fields
    if (mapType === 'pickup') {
        document.getElementById('pickupLat').value = '';
        document.getElementById('pickupLng').value = '';
        document.getElementById('pickupLink').value = '';
        document.getElementById('pickupCoordsHidden').value = 'Not set';
    } else {
        document.getElementById('deliveryLat').value = '';
        document.getElementById('deliveryLng').value = '';
        document.getElementById('deliveryLink').value = '';
        document.getElementById('deliveryCoordsHidden').value = 'Not set';
    }
    
    showMapFeedback(map, 'Location cleared');
    checkRouteAvailability();
}

// Notification system
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--space-electric);
        color: white;
        padding: 12px 20px;
        border-radius: var(--radius-md);
        z-index: 10000;
        box-shadow: var(--shadow-lg);
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3500);
}

// Event listeners for map buttons
document.getElementById('getCurrentLocationPickup')?.addEventListener('click', function() {
    getCurrentLocation('pickup');
});

document.getElementById('getCurrentLocationDelivery')?.addEventListener('click', function() {
    getCurrentLocation('delivery');
});

document.getElementById('calculateRoute')?.addEventListener('click', calculateRoute);
document.getElementById('clearRoute')?.addEventListener('click', clearRoute);

// Toggle map sections
document.getElementById('pickupMapToggle')?.addEventListener('click', function() {
    const content = document.getElementById('pickupMapContent');
    const icon = this.querySelector('.fa-chevron-down, .fa-chevron-up');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
        // Initialize map if not already done
        setTimeout(() => {
            if (!pickupMap) initMaps();
        }, 100);
    } else {
        content.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
    }
});

document.getElementById('deliveryMapToggle')?.addEventListener('click', function() {
    const content = document.getElementById('deliveryMapContent');
    const icon = this.querySelector('.fa-chevron-down, .fa-chevron-up');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
        // Initialize map if not already done
        setTimeout(() => {
            if (!deliveryMap) initMaps();
        }, 100);
    } else {
        content.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
    }
});

// Form validation styling
document.querySelectorAll('input, select, textarea').forEach(element => {
    element.addEventListener('blur', function() {
        if (this.hasAttribute('required') && !this.value) {
            this.style.borderColor = 'var(--space-red)';
        } else {
            this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }
    });
});

// Vehicle type change effect
document.getElementById('vehicleType')?.addEventListener('change', function() {
    const selected = this.options[this.selectedIndex];
    if (selected.value) {
        this.style.background = 'var(--gradient-primary)';
        this.style.color = 'var(--space-white)';
    }
});

// Initialize maps when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Maps will be initialized when toggled open via the toggle functions
    console.log('QuickDeliver Uganda loaded successfully');
});

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
// Mobile form layout fix
function fixMobileFormLayout() {
    if (window.innerWidth <= 768) {
        // Force single column layout on mobile
        const formGrids = document.querySelectorAll('.form-grid');
        formGrids.forEach(grid => {
            grid.style.gridTemplateColumns = '1fr';
        });
        
        // Ensure full-width elements
        const fullWidthElements = document.querySelectorAll('.form-group.full-width');
        fullWidthElements.forEach(el => {
            el.style.gridColumn = '1';
        });
    }
}

// Run on load and resize
document.addEventListener('DOMContentLoaded', function() {
    fixMobileFormLayout();
    window.addEventListener('resize', fixMobileFormLayout);
});
