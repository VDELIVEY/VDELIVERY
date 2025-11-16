
// Final VDELIVER Driver App with proper UUID handling
class DriverAppFinal {
    constructor() {
        this.supabase = window.supabaseConfig?.getClient();
        this.currentDriver = null;
        this.currentAssignment = null;
        this.isOnline = false;
        
        // Use proper UUID format for demo driver
        this.demoDriverId = '550e8400-e29b-41d4-a716-446655440000';
        
        this.init();
    }

    async init() {
        await this.loadDriverProfile();
        this.setupEventListeners();
        this.setupTabNavigation();
    }

    async loadDriverProfile() {
        try {
            // Try to load from database first
            const { data: driver, error } = await this.supabase
                .from('drivers')
                .select('*')
                .eq('id', this.demoDriverId)
                .single();

            if (error) {
                console.log('No driver in database, using demo driver');
                this.currentDriver = this.createDemoDriver();
            } else {
                this.currentDriver = driver;
            }

            this.displayDriverInfo();
            this.loadEarningsData();

        } catch (error) {
            console.error('Error loading driver profile:', error);
            this.currentDriver = this.createDemoDriver();
            this.displayDriverInfo();
        }
    }

    createDemoDriver() {
        return {
            id: this.demoDriverId, // Use proper UUID
            name: 'John Mugisha',
            phone: '+256712345678',
            vehicle_type: 'motorcycle',
            vehicle_details: 'Bajaj Boxer - Red',
            license_plate: 'UAB 123A',
            rating: 4.8,
            completed_deliveries: 47,
            earnings_today: 0,
            earnings_week: 0
        };
    }

    async acceptAssignment(orderId) {
        if (!confirm('Accept this delivery assignment?')) return;

        try {
            // Prepare update data
            const updateData = {
                driver_id: this.currentDriver.id,
                driver_name: this.currentDriver.name,
                driver_phone: this.currentDriver.phone,
                vehicle_details: this.currentDriver.vehicle_details,
                status: 'accepted',
                assigned_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('orders')
                .update(updateData)
                .eq('id', orderId);

            if (error) {
                console.error('Database error:', error);
                throw error;
            }

            // Add status update
            await this.supabase
                .from('order_updates')
                .insert([{
                    order_id: orderId,
                    status: 'accepted',
                    description: `Driver ${this.currentDriver.name} assigned and on the way to pickup`
                }]);

            // Load the accepted assignment
            await this.loadCurrentAssignment(orderId);
            
            alert('Assignment accepted successfully!');

        } catch (error) {
            console.error('Error accepting assignment:', error);
            alert('Failed to accept assignment: ' + error.message);
        }
    }

    displayDriverInfo() {
        if (document.getElementById('driverName')) {
            document.getElementById('driverName').value = this.currentDriver.name;
            document.getElementById('driverPhone').value = this.currentDriver.phone;
            document.getElementById('vehicleDetails').value = this.currentDriver.vehicle_details;
            document.getElementById('licensePlate').value = this.currentDriver.license_plate;
            
            document.getElementById('completedDeliveries').textContent = this.currentDriver.completed_deliveries;
            document.getElementById('driverRating').textContent = this.currentDriver.rating;
        }
    }

    setupEventListeners() {
        const statusToggle = document.getElementById('statusToggle');
        const updateProfile = document.getElementById('updateProfile');
        
        if (statusToggle) {
            statusToggle.addEventListener('click', () => {
                this.toggleOnlineStatus();
            });
        }
        
        if (updateProfile) {
            updateProfile.addEventListener('click', () => {
                this.updateDriverProfile();
            });
        }
    }

    setupTabNavigation() {
        document.querySelectorAll('.driver-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.driver-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                const tabName = e.target.getAttribute('data-tab');
                const tabContent = document.getElementById(`${tabName}-tab`);
                if (tabContent) tabContent.classList.add('active');
                
                if (tabName === 'earnings') {
                    this.loadEarningsData();
                } else if (tabName === 'assignments') {
                    this.loadAvailableAssignments();
                }
            });
        });
    }

    toggleOnlineStatus() {
        this.isOnline = !this.isOnline;
        const statusToggle = document.getElementById('statusToggle');
        
        if (!statusToggle) return;
        
        if (this.isOnline) {
            statusToggle.innerHTML = '<i class="fas fa-circle"></i> ONLINE';
            statusToggle.classList.remove('offline');
            statusToggle.style.background = 'var(--space-green)';
            this.goOnline();
        } else {
            statusToggle.innerHTML = '<i class="fas fa-circle"></i> OFFLINE';
            statusToggle.classList.add('offline');
            statusToggle.style.background = 'var(--space-red)';
            this.goOffline();
        }
    }

    async goOnline() {
        console.log('Driver going online...');
        await this.loadAvailableAssignments();
        this.startAssignmentMonitoring();
    }

    async goOffline() {
        console.log('Driver going offline...');
        this.stopAssignmentMonitoring();
    }

    startAssignmentMonitoring() {
        this.assignmentInterval = setInterval(() => {
            if (this.isOnline && !this.currentAssignment) {
                this.loadAvailableAssignments();
            }
        }, 30000);
    }

    stopAssignmentMonitoring() {
        if (this.assignmentInterval) {
            clearInterval(this.assignmentInterval);
        }
    }

    async loadAvailableAssignments() {
        if (!this.isOnline) return;

        try {
            const { data: orders, error } = await this.supabase
                .from('orders')
                .select('*')
                .eq('status', 'pending')
                .eq('vehicle_type', this.currentDriver.vehicle_type)
                .order('created_at', { ascending: true })
                .limit(5);

            if (error) throw error;
            this.displayAvailableAssignments(orders || []);

        } catch (error) {
            console.error('Error loading assignments:', error);
        }
    }

    displayAvailableAssignments(assignments) {
        const container = document.getElementById('availableAssignments');
        if (!container) return;
        
        if (assignments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No deliveries available</h3>
                    <p>New deliveries will appear here when available</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <h3>Available Deliveries</h3>
            ${assignments.map(order => this.createAssignmentCard(order)).join('')}
        `;
    }

    createAssignmentCard(order) {
        const distance = this.calculateDistance(order);
        const earnings = this.calculateEarnings(order);
        
        return `
            <div class="assignment-card">
                <h4>Delivery #${order.tracking_number}</h4>
                <div class="assignment-details">
                    <p><strong>From:</strong> ${order.pickup_address}</p>
                    <p><strong>To:</strong> ${order.delivery_address}</p>
                    <p><strong>Customer:</strong> ${order.sender_name}</p>
                    <p><strong>Phone:</strong> ${order.sender_phone}</p>
                    <p><strong>Package:</strong> ${order.package_description}</p>
                    <p><strong>Distance:</strong> ${distance} km</p>
                    <p><strong>Earnings:</strong> ${earnings.toLocaleString()} UGX</p>
                </div>
                <div class="assignment-actions">
                    <button class="action-btn secondary" onclick="driverAppFinal.viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                    <button class="action-btn primary" onclick="driverAppFinal.acceptAssignment('${order.id}')">
                        <i class="fas fa-check"></i> Accept
                    </button>
                </div>
            </div>
        `;
    }

    async loadCurrentAssignment(orderId) {
        try {
            const { data: order, error } = await this.supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (error) throw error;
            this.currentAssignment = order;
            this.displayCurrentAssignment(order);
        } catch (error) {
            console.error('Error loading current assignment:', error);
        }
    }

    displayCurrentAssignment(order) {
        const container = document.getElementById('currentAssignment');
        if (!container) return;
        
        container.innerHTML = `
            <div class="assignment-card">
                <h3>🔄 Active Delivery</h3>
                <h4>#${order.tracking_number}</h4>
                
                <div class="assignment-details">
                    <p><strong>Customer:</strong> ${order.sender_name} (${order.sender_phone})</p>
                    <p><strong>Pickup:</strong> ${order.pickup_address}</p>
                    <p><strong>Delivery:</strong> ${order.delivery_address}</p>
                    <p><strong>Recipient:</strong> ${order.recipient_name} (${order.recipient_phone})</p>
                    <p><strong>Package:</strong> ${order.package_description}</p>
                    <p><strong>Instructions:</strong> ${order.special_instructions || 'None'}</p>
                </div>
                
                <div class="assignment-actions">
                    <button class="action-btn primary" onclick="driverAppFinal.markAsPickedUp('${order.id}')">
                        <i class="fas fa-box"></i> Picked Up
                    </button>
                    <button class="action-btn secondary" onclick="driverAppFinal.contactCustomer('${order.sender_phone}')">
                        <i class="fas fa-phone"></i> Call Customer
                    </button>
                    <button class="action-btn primary" onclick="driverAppFinal.markAsDelivered('${order.id}')">
                        <i class="fas fa-flag-checkered"></i> Delivered
                    </button>
                    <button class="action-btn danger" onclick="driverAppFinal.cancelAssignment('${order.id}')">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;

        const availableContainer = document.getElementById('availableAssignments');
        if (availableContainer) availableContainer.innerHTML = '';
    }

    async markAsPickedUp(orderId) {
        try {
            const { error } = await this.supabase
                .from('orders')
                .update({ status: 'picked_up' })
                .eq('id', orderId);

            if (error) throw error;

            await this.supabase
                .from('order_updates')
                .insert([{
                    order_id: orderId,
                    status: 'picked_up',
                    description: 'Package picked up from customer and en route to delivery'
                }]);

            await this.loadCurrentAssignment(orderId);
            alert('Package marked as picked up!');

        } catch (error) {
            console.error('Error marking as picked up:', error);
            alert('Error updating status');
        }
    }

    async markAsDelivered(orderId) {
        if (!confirm('Mark this delivery as completed?')) return;

        try {
            const { error } = await this.supabase
                .from('orders')
                .update({ status: 'delivered' })
                .eq('id', orderId);

            if (error) throw error;

            await this.supabase
                .from('order_updates')
                .insert([{
                    order_id: orderId,
                    status: 'delivered',
                    description: 'Package successfully delivered to recipient'
                }]);

            // Update driver stats
            this.currentDriver.completed_deliveries++;
            const earnings = this.calculateEarnings(this.currentAssignment);
            this.currentDriver.earnings_today += earnings;
            this.currentDriver.earnings_week += earnings;
            
            // Clear current assignment
            this.currentAssignment = null;
            const currentAssignmentContainer = document.getElementById('currentAssignment');
            if (currentAssignmentContainer) currentAssignmentContainer.innerHTML = '';
            
            // Update UI
            this.loadEarningsData();
            this.loadAvailableAssignments();

            alert('Delivery completed successfully!');

        } catch (error) {
            console.error('Error marking as delivered:', error);
            alert('Error completing delivery');
        }
    }

    async cancelAssignment(orderId) {
        if (!confirm('Cancel this delivery assignment?')) return;

        try {
            const { error } = await this.supabase
                .from('orders')
                .update({ 
                    status: 'pending',
                    driver_id: null,
                    driver_name: null,
                    driver_phone: null,
                    vehicle_details: null,
                    assigned_at: null
                })
                .eq('id', orderId);

            if (error) throw error;

            await this.supabase
                .from('order_updates')
                .insert([{
                    order_id: orderId,
                    status: 'pending',
                    description: 'Driver cancelled assignment, looking for new driver'
                }]);

            // Clear current assignment
            this.currentAssignment = null;
            const currentAssignmentContainer = document.getElementById('currentAssignment');
            if (currentAssignmentContainer) currentAssignmentContainer.innerHTML = '';
            
            // Load available assignments
            this.loadAvailableAssignments();

            alert('Assignment cancelled');

        } catch (error) {
            console.error('Error cancelling assignment:', error);
            alert('Error cancelling assignment');
        }
    }

    calculateDistance(order) {
        return (Math.random() * 10 + 2).toFixed(1);
    }

    calculateEarnings(order) {
        const baseRate = order.vehicle_type === 'motorcycle' ? 1500 : 4000;
        const distance = this.calculateDistance(order);
        return Math.round(baseRate * distance);
    }

    async loadEarningsData() {
        const todayEarnings = document.getElementById('todayEarnings');
        const weekEarnings = document.getElementById('weekEarnings');
        
        if (todayEarnings) todayEarnings.textContent = this.currentDriver.earnings_today.toLocaleString() + ' UGX';
        if (weekEarnings) weekEarnings.textContent = this.currentDriver.earnings_week.toLocaleString() + ' UGX';
    }

    contactCustomer(phoneNumber) {
        window.open(`tel:${phoneNumber}`, '_self');
    }

    viewOrderDetails(orderId) {
        alert('Order details would show here for order: ' + orderId);
    }

    async updateDriverProfile() {
        const vehicleDetails = document.getElementById('vehicleDetails');
        const licensePlate = document.getElementById('licensePlate');

        if (!vehicleDetails || !licensePlate) {
            alert('Please fill in all fields');
            return;
        }

        this.currentDriver.vehicle_details = vehicleDetails.value;
        this.currentDriver.license_plate = licensePlate.value;

        alert('Profile updated successfully!');
    }
}

// Initialize final driver app
document.addEventListener('DOMContentLoaded', function() {
    window.driverAppFinal = new DriverAppFinal();
});
