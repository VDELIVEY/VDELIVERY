
// VDELIVER Real-time Monitoring System
class RealtimeSystem {
    constructor() {
        this.supabase = window.supabaseConfig?.getClient();
        this.activeOrders = new Map();
        this.activeDrivers = new Map();
        this.subscriptions = new Set();
        this.init();
    }

    async init() {
        await this.startRealtimeSubscriptions();
        this.setupRealtimeUI();
        console.log('Real-time monitoring system initialized');
    }

    async startRealtimeSubscriptions() {
        // Subscribe to order updates
        this.subscribeToOrders();
        
        // Subscribe to driver updates  
        this.subscribeToDrivers();
        
        // Subscribe to order updates table
        this.subscribeToOrderUpdates();
    }

    subscribeToOrders() {
        const subscription = this.supabase
            .channel('orders-realtime')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'orders' 
                }, 
                (payload) => {
                    console.log('Order update received:', payload);
                    this.handleOrderUpdate(payload);
                }
            )
            .subscribe((status) => {
                console.log('Orders subscription status:', status);
            });

        this.subscriptions.add(subscription);
    }

    subscribeToDrivers() {
        const subscription = this.supabase
            .channel('drivers-realtime')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'drivers' 
                }, 
                (payload) => {
                    console.log('Driver update received:', payload);
                    this.handleDriverUpdate(payload);
                }
            )
            .subscribe((status) => {
                console.log('Drivers subscription status:', status);
            });

        this.subscriptions.add(subscription);
    }

    subscribeToOrderUpdates() {
        const subscription = this.supabase
            .channel('order-updates-realtime')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'order_updates' 
                }, 
                (payload) => {
                    console.log('Order status update:', payload);
                    this.handleOrderStatusUpdate(payload);
                }
            )
            .subscribe((status) => {
                console.log('Order updates subscription status:', status);
            });

        this.subscriptions.add(subscription);
    }

    handleOrderUpdate(payload) {
        const { eventType, new: newData, old: oldData } = payload;
        
        switch (eventType) {
            case 'INSERT':
                this.handleNewOrder(newData);
                break;
            case 'UPDATE':
                this.handleOrderChange(newData, oldData);
                break;
            case 'DELETE':
                this.handleOrderDelete(oldData);
                break;
        }
    }

    handleNewOrder(order) {
        console.log('🆕 NEW ORDER:', order.tracking_number);
        
        // Add to active orders
        this.activeOrders.set(order.id, order);
        
        // Show notification
        this.showNotification(`New order: ${order.tracking_number}`, 'info');
        
        // Update admin dashboard in real-time
        this.updateAdminDashboard();
        
        // If driver app is open, show notification
        if (window.driverAppFinal && window.driverAppFinal.isOnline) {
            this.notifyDriverNewOrder(order);
        }
    }

    handleOrderChange(newOrder, oldOrder) {
        console.log('🔄 ORDER UPDATED:', newOrder.tracking_number);
        
        // Update in active orders
        this.activeOrders.set(newOrder.id, newOrder);
        
        // Check if status changed
        if (oldOrder && newOrder.status !== oldOrder.status) {
            this.showNotification(`Order ${newOrder.tracking_number} is now ${newOrder.status}`, 'info');
        }
        
        // Check if driver was assigned
        if (oldOrder && !oldOrder.driver_id && newOrder.driver_id) {
            this.showNotification(`Driver assigned to order ${newOrder.tracking_number}`, 'success');
        }
        
        // Update UI everywhere
        this.updateAdminDashboard();
        this.updateTrackingPages(newOrder.id);
    }

    handleOrderDelete(order) {
        console.log('🗑️ ORDER DELETED:', order.tracking_number);
        this.activeOrders.delete(order.id);
        this.updateAdminDashboard();
    }

    handleDriverUpdate(payload) {
        const { eventType, new: newData } = payload;
        
        if (eventType === 'UPDATE') {
            console.log('🚗 DRIVER UPDATED:', newData.name);
            this.activeDrivers.set(newData.id, newData);
            this.updateDriverMap();
        }
    }

    handleOrderStatusUpdate(payload) {
        const { new: update } = payload;
        console.log('📊 STATUS UPDATE:', update);
        
        // Update order tracking pages in real-time
        this.updateTrackingPages(update.order_id);
        
        // Show notification for important status changes
        if (['picked_up', 'on_the_way', 'delivered'].includes(update.status)) {
            this.showStatusNotification(update);
        }
    }

    notifyDriverNewOrder(order) {
        // Check if order matches driver's vehicle type
        if (window.driverAppFinal.currentDriver && 
            order.vehicle_type === window.driverAppFinal.currentDriver.vehicle_type) {
            
            const notification = {
                title: '🚗 New Delivery Available',
                message: `Order ${order.tracking_number} - ${order.pickup_address} to ${order.delivery_address}`,
                order: order
            };
            
            // Show browser notification if permitted
            this.showBrowserNotification(notification);
            
            // Update driver app UI
            window.driverAppFinal.loadAvailableAssignments();
        }
    }

    showStatusNotification(update) {
        const statusMessages = {
            'picked_up': '📦 Package picked up and on the way!',
            'on_the_way': '🚗 Delivery is on the way to you!',
            'delivered': '✅ Package delivered successfully!'
        };
        
        const message = statusMessages[update.status];
        if (message) {
            this.showNotification(message, 'success');
        }
    }

    // UI Updates
    updateAdminDashboard() {
        // Update admin dashboard if open
        if (window.adminDashboard) {
            window.adminDashboard.loadOrders();
            window.adminDashboard.updateDashboardStats();
        }
    }

    updateTrackingPages(orderId) {
        // Update any open tracking pages
        if (window.trackingSystem && window.trackingSystem.currentOrder && 
            window.trackingSystem.currentOrder.id === orderId) {
            window.trackingSystem.refreshOrderDetails();
        }
    }

    updateDriverMap() {
        // Update driver locations on map (if map is implemented)
        console.log('Updating driver map with', this.activeDrivers.size, 'active drivers');
    }

    // Notification System
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `realtime-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;
        
        // Add close button event
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        document.body.appendChild(notification);
    }

    showBrowserNotification(notification) {
        // Check if browser supports notifications
        if (!("Notification" in window)) {
            return;
        }
        
        // Check if permission is granted
        if (Notification.permission === "granted") {
            this.createBrowserNotification(notification);
        } else if (Notification.permission !== "denied") {
            // Request permission
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    this.createBrowserNotification(notification);
                }
            });
        }
    }

    createBrowserNotification(notification) {
        const browserNotification = new Notification(notification.title, {
            body: notification.message,
            icon: '/logo.jpeg', // Your logo
            badge: '/logo.jpeg',
            tag: 'vdeliver-notification'
        });
        
        browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
        };
    }

    getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'times-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            'info': '#00d4ff',
            'success': '#28a745', 
            'warning': '#ffc107',
            'error': '#dc3545'
        };
        return colors[type] || '#00d4ff';
    }

    // Admin Real-time Dashboard
    setupRealtimeUI() {
        this.injectRealtimeIndicator();
    }

    injectRealtimeIndicator() {
        // Add real-time indicator to admin dashboard
        const indicator = document.createElement('div');
        indicator.id = 'realtime-indicator';
        indicator.innerHTML = `
            <div class="realtime-status">
                <span class="status-dot"></span>
                <span class="status-text">LIVE</span>
            </div>
        `;
        
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--space-green);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        const statusDot = indicator.querySelector('.status-dot');
        statusDot.style.cssText = `
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: pulse 2s infinite;
        `;
        
        document.body.appendChild(indicator);
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // Cleanup
    destroy() {
        // Unsubscribe from all channels
        this.subscriptions.forEach(subscription => {
            subscription.unsubscribe();
        });
        this.subscriptions.clear();
    }

    // Utility methods
    getActiveOrders() {
        return Array.from(this.activeOrders.values());
    }

    getActiveDrivers() {
        return Array.from(this.activeDrivers.values());
    }

    getOrderById(orderId) {
        return this.activeOrders.get(orderId);
    }

    // Simulate driver movement (for demo)
    simulateDriverMovement() {
        setInterval(() => {
            this.activeDrivers.forEach((driver, id) => {
                if (driver.availability_status === 'on_delivery') {
                    // Simulate small location changes
                    if (driver.current_location) {
                        driver.current_location[0] += (Math.random() - 0.5) * 0.001;
                        driver.current_location[1] += (Math.random() - 0.5) * 0.001;
                    }
                }
            });
        }, 10000); // Update every 10 seconds
    }
}

// Initialize real-time system
document.addEventListener('DOMContentLoaded', function() {
    window.realtimeSystem = new RealtimeSystem();
});
