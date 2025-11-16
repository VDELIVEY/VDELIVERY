
// VDELIVER Order Tracking System
class TrackingSystem {
    constructor() {
        this.supabase = window.supabaseConfig?.getClient();
        this.currentOrder = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkURLTrackingNumber();
    }

    setupEventListeners() {
        document.getElementById('trackOrder').addEventListener('click', () => {
            this.trackOrder();
        });

        document.getElementById('trackingNumber').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.trackOrder();
            }
        });
    }

    checkURLTrackingNumber() {
        const urlParams = new URLSearchParams(window.location.search);
        const trackingNumber = urlParams.get('tracking');
        if (trackingNumber) {
            document.getElementById('trackingNumber').value = trackingNumber;
            this.trackOrder();
        }
    }

    async trackOrder() {
        const trackingNumber = document.getElementById('trackingNumber').value.trim().toUpperCase();
        
        if (!trackingNumber) {
            this.showError('Please enter a tracking number');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideResult();

        try {
            const order = await this.fetchOrderDetails(trackingNumber);
            
            if (order) {
                this.currentOrder = order;
                this.displayOrderDetails(order);
                this.startRealTimeUpdates(order.id);
            } else {
                this.showError('Order not found. Please check your tracking number.');
            }

        } catch (error) {
            console.error('Tracking error:', error);
            this.showError('Failed to load order details. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async fetchOrderDetails(trackingNumber) {
        const { data: order, error } = await this.supabase
            .from('orders')
            .select(`
                *,
                order_updates (
                    status,
                    description,
                    created_at
                ),
                payments (
                    amount,
                    method,
                    status
                )
            `)
            .eq('tracking_number', trackingNumber)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return null;
            }
            throw error;
        }

        return order;
    }

    displayOrderDetails(order) {
        const resultDiv = document.getElementById('trackingResult');
        
        resultDiv.innerHTML = this.generateTrackingHTML(order);
        resultDiv.style.display = 'block';

        // Update URL with tracking number
        const newUrl = `${window.location.pathname}?tracking=${order.tracking_number}`;
        window.history.pushState({}, '', newUrl);
    }

    generateTrackingHTML(order) {
        const statusConfig = {
            'pending': { icon: 'clock', color: 'var(--space-blue)', text: 'Order Received' },
            'accepted': { icon: 'check-circle', color: 'var(--space-green)', text: 'Driver Assigned' },
            'picked_up': { icon: 'box', color: 'var(--space-electric)', text: 'Package Picked Up' },
            'on_the_way': { icon: 'truck', color: 'var(--space-purple)', text: 'On the Way' },
            'delivered': { icon: 'flag-checkered', color: 'var(--space-green)', text: 'Delivered' },
            'cancelled': { icon: 'times-circle', color: 'var(--space-red)', text: 'Cancelled' }
        };

        const timelineItems = this.generateTimeline(order);
        const driverInfo = order.driver_name ? this.generateDriverInfo(order) : '';

        return `
            <div class="order-header">
                <h2>Order: ${order.tracking_number}</h2>
                <div class="order-status" style="color: ${statusConfig[order.status]?.color || 'var(--space-gray)'}">
                    <i class="fas fa-${statusConfig[order.status]?.icon || 'question'}"></i>
                    ${statusConfig[order.status]?.text || order.status}
                </div>
            </div>

            ${driverInfo}

            <div class="order-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Customer:</strong> ${order.sender_name}
                    </div>
                    <div class="detail-item">
                        <strong>Phone:</strong> ${order.sender_phone}
                    </div>
                    <div class="detail-item">
                        <strong>Pickup:</strong> ${order.pickup_address}
                    </div>
                    <div class="detail-item">
                        <strong>Delivery:</strong> ${order.delivery_address}
                    </div>
                    <div class="detail-item">
                        <strong>Vehicle:</strong> ${order.vehicle_type === 'motorcycle' ? 'Motorcycle 🏍️' : 'Car 🚗'}
                    </div>
                    <div class="detail-item">
                        <strong>Package:</strong> ${order.package_description}
                    </div>
                </div>
            </div>

            <div class="order-timeline">
                <h3>Delivery Progress</h3>
                ${timelineItems}
            </div>

            <div class="payment-info">
                <h3>Payment Information</h3>
                <div class="payment-details">
                    ${this.generatePaymentInfo(order)}
                </div>
            </div>

            <div class="tracking-actions">
                <button onclick="trackingSystem.shareTracking()" class="cta-button secondary">
                    <i class="fas fa-share"></i> Share Tracking
                </button>
                <button onclick="trackingSystem.contactSupport()" class="cta-button secondary">
                    <i class="fas fa-headset"></i> Contact Support
                </button>
            </div>
        `;
    }

    generateTimeline(order) {
        const statusOrder = ['pending', 'accepted', 'picked_up', 'on_the_way', 'delivered'];
        const currentStatusIndex = statusOrder.indexOf(order.status);
        
        let timelineHTML = '';
        
        statusOrder.forEach((status, index) => {
            const isCompleted = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const isCancelled = order.status === 'cancelled';
            
            const statusUpdate = order.order_updates?.find(update => update.status === status);
            const timestamp = statusUpdate ? new Date(statusUpdate.created_at).toLocaleString() : '';
            
            let icon = 'circle';
            let color = 'rgba(255,255,255,0.3)';
            let text = '';
            
            if (isCancelled && status === 'cancelled') {
                icon = 'times-circle';
                color = 'var(--space-red)';
                text = 'Order Cancelled';
            } else if (isCompleted) {
                icon = 'check-circle';
                color = 'var(--space-green)';
                
                switch(status) {
                    case 'pending': text = 'Order Received'; break;
                    case 'accepted': text = 'Driver Assigned'; break;
                    case 'picked_up': text = 'Package Collected'; break;
                    case 'on_the_way': text = 'On the Way to Delivery'; break;
                    case 'delivered': text = 'Delivered Successfully'; break;
                }
            } else {
                switch(status) {
                    case 'pending': text = 'Order Received'; break;
                    case 'accepted': text = 'Awaiting Driver'; break;
                    case 'picked_up': text = 'Waiting for Pickup'; break;
                    case 'on_the_way': text = 'Ready for Delivery'; break;
                    case 'delivered': text = 'Out for Delivery'; break;
                }
            }
            
            timelineHTML += `
                <div class="timeline-item">
                    <div class="timeline-icon ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}" 
                         style="background: ${color}">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="timeline-content">
                        <h4>${text}</h4>
                        ${timestamp ? `<p>${timestamp}</p>` : '<p>Pending</p>'}
                        ${statusUpdate?.description ? `<p><small>${statusUpdate.description}</small></p>` : ''}
                    </div>
                </div>
            `;
        });
        
        return timelineHTML;
    }

    generateDriverInfo(order) {
        if (!order.driver_name) return '';
        
        return `
            <div class="driver-info">
                <h3><i class="fas fa-user"></i> Your Driver</h3>
                <div class="driver-details">
                    <p><strong>Name:</strong> ${order.driver_name}</p>
                    <p><strong>Contact:</strong> ${order.driver_phone}</p>
                    <p><strong>Vehicle:</strong> ${order.vehicle_details}</p>
                    ${order.assigned_at ? `<p><strong>Assigned:</strong> ${new Date(order.assigned_at).toLocaleString()}</p>` : ''}
                </div>
            </div>
        `;
    }

    generatePaymentInfo(order) {
        const payment = order.payments?.[0];
        if (!payment) return '<p>Payment information not available</p>';
        
        return `
            <p><strong>Amount:</strong> ${payment.amount ? `${payment.amount.toLocaleString()} UGX` : '--'}</p>
            <p><strong>Method:</strong> ${payment.method === 'mobile_money' ? 'Mobile Money' : 'Cash on Delivery'}</p>
            <p><strong>Status:</strong> 
                <span style="color: ${payment.status === 'completed' ? 'var(--space-green)' : 'var(--space-orange)'}">
                    ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </span>
            </p>
        `;
    }

    startRealTimeUpdates(orderId) {
        // Subscribe to order updates
        const subscription = this.supabase
            .channel('order-updates')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'order_updates',
                    filter: `order_id=eq.${orderId}`
                }, 
                (payload) => {
                    console.log('Order update received:', payload);
                    this.refreshOrderDetails();
                }
            )
            .subscribe();

        // Store subscription for cleanup
        this.currentSubscription = subscription;
    }

    async refreshOrderDetails() {
        if (!this.currentOrder) return;
        
        try {
            const updatedOrder = await this.fetchOrderDetails(this.currentOrder.tracking_number);
            if (updatedOrder) {
                this.currentOrder = updatedOrder;
                this.displayOrderDetails(updatedOrder);
            }
        } catch (error) {
            console.error('Error refreshing order:', error);
        }
    }

    shareTracking() {
        if (!this.currentOrder) return;
        
        const trackingUrl = `${window.location.origin}${window.location.pathname}?tracking=${this.currentOrder.tracking_number}`;
        const message = `Track my VDELIVER order: ${trackingUrl}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'VDELIVER Tracking',
                text: message,
                url: trackingUrl
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(trackingUrl).then(() => {
                alert('Tracking link copied to clipboard!');
            });
        }
    }

    contactSupport() {
        const phone = '+256757268074';
        const message = `Hello, I need help with my VDELIVER order: ${this.currentOrder?.tracking_number || ''}`;
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    // Utility methods
    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        errorDiv.style.display = 'block';
    }

    hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    hideResult() {
        document.getElementById('trackingResult').style.display = 'none';
    }
}

// Initialize tracking system
document.addEventListener('DOMContentLoaded', function() {
    window.trackingSystem = new TrackingSystem();
});
