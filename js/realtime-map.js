// VDELIVER Real-time Map System
class RealtimeMap {
    constructor() {
        this.map = null;
        this.orderMarkers = new Map();
        this.driverMarkers = new Map();
        this.routeLayers = new Map();
        this.init();
    }

    async init() {
        await this.loadLeaflet();
        this.initializeMap();
        this.setupMapControls();
    }

    async loadLeaflet() {
        // Load Leaflet CSS if not already loaded
        if (!document.querySelector('link[href*="leaflet"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Load Leaflet JS if not already loaded
        if (!window.L) {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }
    }

    initializeMap() {
        // Default to Kampala center
        const kampala = [0.3476, 32.5825];
        
        this.map = L.map('realtimeMap').setView(kampala, 12);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Add scale control
        L.control.scale({ imperial: false }).addTo(this.map);

        console.log('Real-time map initialized');
    }

    setupMapControls() {
        // Add layer control for different views
        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        });

        const baseMaps = {
            "Street": streetLayer,
            "Satellite": satelliteLayer
        };

        L.control.layers(baseMaps).addTo(this.map);
        streetLayer.addTo(this.map);
    }

    // Order Markers
    addOrderMarker(order) {
        if (!this.map) return;

        const pickupCoords = this.extractCoordinates(order.pickup_coords);
        const deliveryCoords = this.extractCoordinates(order.delivery_coords);

        if (!pickupCoords || !deliveryCoords) return;

        // Create pickup marker
        const pickupMarker = L.marker(pickupCoords, {
            icon: this.createOrderIcon('pickup', order.status)
        }).addTo(this.map);

        pickupMarker.bindPopup(`
            <div class="map-popup">
                <h4>📦 Order ${order.tracking_number}</h4>
                <p><strong>Pickup:</strong> ${order.pickup_address}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Customer:</strong> ${order.sender_name}</p>
                <button onclick="realtimeMap.focusOnOrder('${order.id}')">Track Order</button>
            </div>
        `);

        // Create delivery marker
        const deliveryMarker = L.marker(deliveryCoords, {
            icon: this.createOrderIcon('delivery', order.status)
        }).addTo(this.map);

        deliveryMarker.bindPopup(`
            <div class="map-popup">
                <h4>🎯 Delivery Point</h4>
                <p><strong>Address:</strong> ${order.delivery_address}</p>
                <p><strong>Recipient:</strong> ${order.recipient_name}</p>
                <button onclick="realtimeMap.focusOnOrder('${order.id}')">Track Order</button>
            </div>
        `);

        // Store markers
        this.orderMarkers.set(order.id, {
            pickup: pickupMarker,
            delivery: deliveryMarker,
            order: order
        });

        // Fit bounds to show both points
        const bounds = L.latLngBounds([pickupCoords, deliveryCoords]);
        this.map.fitBounds(bounds, { padding: [20, 20] });
    }

    updateOrderMarker(orderId, newStatus) {
        const markers = this.orderMarkers.get(orderId);
        if (!markers) return;

        // Update icon based on new status
        markers.pickup.setIcon(this.createOrderIcon('pickup', newStatus));
        markers.delivery.setIcon(this.createOrderIcon('delivery', newStatus));

        // Update popup content
        markers.pickup.getPopup().setContent(`
            <div class="map-popup">
                <h4>📦 Order ${markers.order.tracking_number}</h4>
                <p><strong>Pickup:</strong> ${markers.order.pickup_address}</p>
                <p><strong>Status:</strong> ${newStatus}</p>
                <p><strong>Customer:</strong> ${markers.order.sender_name}</p>
                <button onclick="realtimeMap.focusOnOrder('${orderId}')">Track Order</button>
            </div>
        `);
    }

    removeOrderMarker(orderId) {
        const markers = this.orderMarkers.get(orderId);
        if (markers) {
            this.map.removeLayer(markers.pickup);
            this.map.removeLayer(markers.delivery);
            this.orderMarkers.delete(orderId);
        }
    }

    // Driver Markers
    addDriverMarker(driver) {
        if (!this.map || !driver.current_location) return;

        const driverMarker = L.marker(driver.current_location, {
            icon: this.createDriverIcon(driver)
        }).addTo(this.map);

        driverMarker.bindPopup(`
            <div class="map-popup">
                <h4>🚗 ${driver.name}</h4>
                <p><strong>Vehicle:</strong> ${driver.vehicle_details}</p>
                <p><strong>Status:</strong> ${driver.availability_status}</p>
                <p><strong>Rating:</strong> ${driver.rating} ⭐</p>
                <p><strong>Completed:</strong> ${driver.completed_deliveries} deliveries</p>
            </div>
        `);

        this.driverMarkers.set(driver.id, driverMarker);
    }

    updateDriverMarker(driverId, newLocation, newStatus) {
        const marker = this.driverMarkers.get(driverId);
        if (!marker) return;

        if (newLocation) {
            marker.setLatLng(newLocation);
        }

        if (newStatus) {
            marker.setIcon(this.createDriverIcon({
                ...this.getDriverById(driverId),
                availability_status: newStatus
            }));
        }
    }

    removeDriverMarker(driverId) {
        const marker = this.driverMarkers.get(driverId);
        if (marker) {
            this.map.removeLayer(marker);
            this.driverMarkers.delete(driverId);
        }
    }

    // Route Drawing
    drawRoute(orderId, routeCoordinates) {
        if (!this.map) return;

        // Remove existing route
        this.removeRoute(orderId);

        const routeLayer = L.polyline(routeCoordinates, {
            color: '#00d4ff',
            weight: 6,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(this.map);

        this.routeLayers.set(orderId, routeLayer);
    }

    removeRoute(orderId) {
        const routeLayer = this.routeLayers.get(orderId);
        if (routeLayer) {
            this.map.removeLayer(routeLayer);
            this.routeLayers.delete(orderId);
        }
    }

    // Icon Creation
    createOrderIcon(type, status) {
        const colors = {
            'pending': '#ff6b6b',
            'accepted': '#4ecdc4', 
            'picked_up': '#45b7d1',
            'on_the_way': '#96ceb4',
            'delivered': '#59cd90'
        };

        const color = colors[status] || '#ff6b6b';
        const icon = type === 'pickup' ? '📦' : '🎯';

        return L.divIcon({
            className: `order-marker ${type}-marker`,
            html: `
                <div class="marker-content" style="background: ${color}">
                    ${icon}
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
    }

    createDriverIcon(driver) {
        const colors = {
            'available': '#28a745',
            'on_delivery': '#007bff',
            'offline': '#6c757d',
            'break': '#ffc107'
        };

        const color = colors[driver.availability_status] || '#6c757d';

        return L.divIcon({
            className: 'driver-marker',
            html: `
                <div class="driver-content" style="background: ${color}">
                    🚗
                </div>
            `,
            iconSize: [35, 35],
            iconAnchor: [17, 35]
        });
    }

    // Utility Methods
    extractCoordinates(coordsString) {
        if (!coordsString || coordsString === 'Not set') return null;
        
        try {
            const [lat, lng] = coordsString.split(',').map(coord => parseFloat(coord.trim()));
            return [lat, lng];
        } catch (error) {
            console.error('Error parsing coordinates:', error);
            return null;
        }
    }

    focusOnOrder(orderId) {
        const markers = this.orderMarkers.get(orderId);
        if (!markers) return;

        const bounds = L.latLngBounds([
            markers.pickup.getLatLng(),
            markers.delivery.getLatLng()
        ]);
        
        this.map.fitBounds(bounds, { padding: [50, 50] });
    }

    getDriverById(driverId) {
        // This would integrate with your driver data
        return null;
    }

    // Integration with Real-time System
    connectToRealtimeSystem() {
        if (window.realtimeSystem) {
            // Listen for order updates
            window.realtimeSystem.activeOrders.forEach(order => {
                this.addOrderMarker(order);
            });

            // Listen for driver updates  
            window.realtimeSystem.activeDrivers.forEach(driver => {
                this.addDriverMarker(driver);
            });
        }
    }

    // Cleanup
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        this.orderMarkers.clear();
        this.driverMarkers.clear();
        this.routeLayers.clear();
    }
}

// Add CSS for map markers
const mapStyles = document.createElement('style');
mapStyles.textContent = `
    .order-marker .marker-content {
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        background: #ff6b6b;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: white;
    }
    
    .order-marker .marker-content:after {
        content: '';
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 10px;
        left: 10px;
    }
    
    .driver-marker .driver-content {
        width: 35px;
        height: 35px;
        border-radius: 50%;
        background: #28a745;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: white;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }
    
    .map-popup {
        min-width: 200px;
    }
    
    .map-popup h4 {
        margin: 0 0 8px 0;
        color: var(--space-dark);
    }
    
    .map-popup p {
        margin: 4px 0;
        font-size: 12px;
    }
    
    .map-popup button {
        background: var(--space-electric);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-top: 8px;
        width: 100%;
    }
`;
document.head.appendChild(mapStyles);

// Initialize real-time map
document.addEventListener('DOMContentLoaded', function() {
    window.realtimeMap = new RealtimeMap();
});
