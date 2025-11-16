
// Admin Dashboard Management System
class AdminDashboard {
    constructor() {
        this.supabase = window.supabaseConfig?.getClient();
        this.adminAuth = window.adminAuth;
        this.orders = [];
        this.init();
    }

    async init() {
        // Check authentication first
        if (!this.adminAuth.requireAuth()) return;
        
        this.loadAdminInfo();
        this.setupEventListeners();
        await this.loadOrders();
        this.updateDashboardStats();
        this.setupTabNavigation();
    }

    loadAdminInfo() {
        const admin = this.adminAuth.currentAdmin;
        if (admin) {
            document.getElementById('adminUserName').textContent = admin.name;
            document.getElementById('adminUserRole').textContent = admin.role.charAt(0).toUpperCase() + admin.role.slice(1);
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('adminLogoutBtn').addEventListener('click', () => {
            this.adminAuth.logout();
        });

        // Refresh orders button
        document.getElementById('refreshOrdersBtn').addEventListener('click', async () => {
            await this.loadOrders();
            this.updateDashboardStats();
        });

        // Order filters
        document.getElementById('recentOrdersFilter').addEventListener('change', (e) => {
            this.filterRecentOrders(e.target.value);
        });

        document.getElementById('allOrdersFilter').addEventListener('change', (e) => {
            this.filterAllOrders(e.target.value);
        });
    }

    setupTabNavigation() {
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class from all tabs
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab
                e.target.classList.add('active');
                
                // Show corresponding pane
                const tabName = e.target.getAttribute('data-tab');
                const pane = document.getElementById(`${tabName}-tab`);
                if (pane) {
                    pane.classList.add('active');
                }
                
                // Load data for the tab if needed
                if (tabName === 'orders') {
                    this.loadAllOrdersTable();
                }
            });
        });
    }

    async loadOrders() {
        try {
            console.log('Loading orders from Supabase...');
            
            const { data: orders, error } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    order_updates (
                        status,
                        description,
                        created_at
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading orders:', error);
                window.supabaseConfig.showNotification('Failed to load orders', 'error');
                return;
            }

            this.orders = orders || [];
            console.log(`Loaded ${this.orders.length} orders`);
            
            this.loadRecentOrdersTable();
            this.loadAllOrdersTable();

        } catch (error) {
            console.error('Error in loadOrders:', error);
            window.supabaseConfig.showNotification('Error loading orders', 'error');
        }
    }

    loadRecentOrdersTable() {
        const tableBody = document.getElementById('recentOrdersTable');
        if (!tableBody) return;

        // Show only recent 10 orders for dashboard
        const recentOrders = this.orders.slice(0, 10);
        
        if (recentOrders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                        No orders found
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = recentOrders.map(order => this.createOrderRow(order)).join('');
    }

    loadAllOrdersTable() {
        const tableBody = document.getElementById('allOrdersTable');
        if (!tableBody) return;

        if (this.orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                        No orders found
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.orders.map(order => this.createOrderRow(order, true)).join('');
    }

    createOrderRow(order, showFullInfo = false) {
        const createdDate = new Date(order.created_at).toLocaleDateString('en-UG');
        const statusClass = `status-${order.status}`;
        
        // Get latest status update
        const latestUpdate = order.order_updates && order.order_updates.length > 0 
            ? order.order_updates[order.order_updates.length - 1]
            : null;

        return `
            <tr>
                <td><strong>${order.tracking_number}</strong></td>
                <td>
                    <div>${order.sender_name}</div>
                    <small style="color: rgba(255,255,255,0.7);">${order.sender_phone}</small>
                </td>
                ${showFullInfo ? `
                    <td>
                        <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${order.pickup_address}
                        </div>
                    </td>
                    <td>
                        <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${order.delivery_address}
                        </div>
                    </td>
                ` : `
                    <td>
                        <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${order.pickup_address} → ${order.delivery_address}
                        </div>
                    </td>
                `}
                <td>${order.vehicle_type === 'motorcycle' ? '🏍️ Bike' : '🚗 Car'}</td>
                <td><strong>${order.estimated_cost ? `${parseInt(order.estimated_cost).toLocaleString()} UGX` : '--'}</strong></td>
                <td>
                    <span class="status-badge ${statusClass}">${order.status.replace('_', ' ')}</span>
                    ${latestUpdate ? `<br><small style="color: rgba(255,255,255,0.7);">${latestUpdate.description}</small>` : ''}
                </td>
                <td>${createdDate}</td>
                <td>
                    <button class="action-btn" onclick="adminDashboard.viewOrder('${order.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn primary" onclick="adminDashboard.updateOrderStatus('${order.id}')" title="Update Status">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" onclick="adminDashboard.contactCustomer('${order.sender_phone}')" title="Contact Customer">
                        <i class="fas fa-phone"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    updateDashboardStats() {
        const today = new Date().toDateString();
        
        const totalOrders = this.orders.length;
        const completedToday = this.orders.filter(order => 
            order.status === 'delivered' && 
            new Date(order.created_at).toDateString() === today
        ).length;
        
        const pendingOrders = this.orders.filter(order => 
            ['pending', 'accepted', 'picked_up', 'on_the_way'].includes(order.status)
        ).length;
        
        const revenueToday = this.orders
            .filter(order => 
                order.status === 'delivered' && 
                new Date(order.created_at).toDateString() === today &&
                order.estimated_cost
            )
            .reduce((sum, order) => sum + (parseInt(order.estimated_cost) || 0), 0);

        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('completedOrders').textContent = completedToday;
        document.getElementById('pendingOrders').textContent = pendingOrders;
        document.getElementById('revenueToday').textContent = revenueToday.toLocaleString() + ' UGX';
    }

    filterRecentOrders(status) {
        let filteredOrders = this.orders.slice(0, 10);
        
        if (status !== 'all') {
            if (status === 'active') {
                filteredOrders = filteredOrders.filter(order => 
                    ['accepted', 'picked_up', 'on_the_way'].includes(order.status)
                );
            } else if (status === 'completed') {
                filteredOrders = filteredOrders.filter(order => order.status === 'delivered');
            } else {
                filteredOrders = filteredOrders.filter(order => order.status === status);
            }
        }
        
        const tableBody = document.getElementById('recentOrdersTable');
        if (tableBody) {
            tableBody.innerHTML = filteredOrders.length > 0 
                ? filteredOrders.map(order => this.createOrderRow(order)).join('')
                : `<tr><td colspan="8" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">No orders match the filter</td></tr>`;
        }
    }

    filterAllOrders(status) {
        let filteredOrders = this.orders;
        
        if (status !== 'all') {
            filteredOrders = filteredOrders.filter(order => order.status === status);
        }
        
        const tableBody = document.getElementById('allOrdersTable');
        if (tableBody) {
            tableBody.innerHTML = filteredOrders.length > 0 
                ? filteredOrders.map(order => this.createOrderRow(order, true)).join('')
                : `<tr><td colspan="9" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">No orders match the filter</td></tr>`;
        }
    }

    viewOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            const message = `
Order Details:
---------------
Tracking: ${order.tracking_number}
Customer: ${order.sender_name} (${order.sender_phone})
Email: ${order.sender_email}
Recipient: ${order.recipient_name} (${order.recipient_phone})

Pickup: ${order.pickup_address}
Landmark: ${order.pickup_landmark}
${order.pickup_coords && order.pickup_coords !== 'Not set' ? `Coordinates: ${order.pickup_coords}` : ''}

Delivery: ${order.delivery_address}
Landmark: ${order.delivery_landmark}
${order.delivery_coords && order.delivery_coords !== 'Not set' ? `Coordinates: ${order.delivery_coords}` : ''}

Vehicle: ${order.vehicle_type === 'motorcycle' ? 'Motorcycle 🏍️' : 'Car 🚗'}
Package: ${order.package_description}
Special Instructions: ${order.special_instructions || 'None'}
Emergency Contact: ${order.emergency_contact || 'Not provided'}
Call Recipient: ${order.call_recipient ? 'Yes' : 'No'}

Route Info:
Distance: ${order.distance_km || '--'} km
Duration: ${order.duration_min || '--'} min
Estimated Cost: ${order.estimated_cost ? `${parseInt(order.estimated_cost).toLocaleString()} UGX` : '--'}

Status History:
${order.order_updates && order.order_updates.length > 0 ? 
    order.order_updates.map(update => 
        `${new Date(update.created_at).toLocaleString()}: ${update.status} - ${update.description}`
    ).join('\n') : 'No status updates available'}

Created: ${new Date(order.created_at).toLocaleString('en-UG')}
${order.updated_at ? `Last Updated: ${new Date(order.updated_at).toLocaleString('en-UG')}` : ''}
            `.trim();
            
            // Create modal for detailed view
            this.showOrderModal(order, message);
        }
    }

    showOrderModal(order, details) {
        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        modal.innerHTML = `
            <div class="admin-modal-content" style="
                background: var(--gradient-card);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: var(--radius-lg);
                padding: var(--space-xl);
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
            ">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-lg);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    padding-bottom: var(--space-md);
                ">
                    <h3 style="margin: 0; color: var(--space-electric);">
                        Order Details - ${order.tracking_number}
                    </h3>
                    <button class="close-modal" style="
                        background: none;
                        border: none;
                        color: var(--space-white);
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 5px;
                        border-radius: 4px;
                        transition: all 0.3s ease;
                    ">&times;</button>
                </div>
                
                <div class="modal-body" style="color: rgba(255, 255, 255, 0.9);">
                    <pre style="
                        white-space: pre-wrap;
                        font-family: 'Inter', sans-serif;
                        font-size: 0.9rem;
                        line-height: 1.5;
                        margin: 0;
                    ">${details}</pre>
                </div>
                
                <div class="modal-footer" style="
                    margin-top: var(--space-lg);
                    padding-top: var(--space-md);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    gap: var(--space-sm);
                    justify-content: flex-end;
                ">
                    <button class="action-btn primary" onclick="adminDashboard.updateOrderStatus('${order.id}')">
                        <i class="fas fa-edit"></i> Update Status
                    </button>
                    <button class="action-btn" onclick="adminDashboard.contactCustomer('${order.sender_phone}')">
                        <i class="fas fa-phone"></i> Contact Customer
                    </button>
                    <button class="action-btn secondary close-modal-btn">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners for close buttons
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.close-modal-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    async updateOrderStatus(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const statusOptions = [
            { value: 'pending', label: 'Pending', description: 'Order received and awaiting processing' },
            { value: 'accepted', label: 'Accepted', description: 'Order accepted and driver assigned' },
            { value: 'picked_up', label: 'Picked Up', description: 'Package picked up from sender' },
            { value: 'on_the_way', label: 'On the Way', description: 'Package in transit to destination' },
            { value: 'delivered', label: 'Delivered', description: 'Package successfully delivered' },
            { value: 'cancelled', label: 'Cancelled', description: 'Order cancelled' }
        ];

        // Create status update modal
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        modal.innerHTML = `
            <div class="admin-modal-content" style="
                background: var(--gradient-card);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: var(--radius-lg);
                padding: var(--space-xl);
                max-width: 500px;
                width: 90%;
                position: relative;
            ">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-lg);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    padding-bottom: var(--space-md);
                ">
                    <h3 style="margin: 0; color: var(--space-electric);">
                        Update Order Status
                    </h3>
                    <button class="close-modal" style="
                        background: none;
                        border: none;
                        color: var(--space-white);
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 5px;
                        border-radius: 4px;
                        transition: all 0.3s ease;
                    ">&times;</button>
                </div>
                
                <form id="statusUpdateForm">
                    <div class="form-group">
                        <label for="statusSelect">New Status *</label>
                        <select id="statusSelect" class="modern-select" required>
                            <option value="">Select status...</option>
                            ${statusOptions.map(opt => 
                                `<option value="${opt.value}" ${order.status === opt.value ? 'selected' : ''}>${opt.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="statusDescription">Status Description *</label>
                        <textarea id="statusDescription" class="modern-textarea" rows="3" required placeholder="Provide update details for the customer..."></textarea>
                    </div>
                    
                    <div class="modal-footer" style="
                        margin-top: var(--space-lg);
                        padding-top: var(--space-md);
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        display: flex;
                        gap: var(--space-sm);
                        justify-content: flex-end;
                    ">
                        <button type="button" class="action-btn secondary close-modal-btn">
                            Cancel
                        </button>
                        <button type="submit" class="action-btn primary">
                            <i class="fas fa-save"></i> Update Status
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Set default description based on selected status
        const statusSelect = modal.querySelector('#statusSelect');
        const descriptionTextarea = modal.querySelector('#statusDescription');
        
        statusSelect.addEventListener('change', (e) => {
            const selectedOption = statusOptions.find(opt => opt.value === e.target.value);
            if (selectedOption) {
                descriptionTextarea.value = selectedOption.description;
            }
        });

        // Set initial description
        const currentOption = statusOptions.find(opt => opt.value === order.status);
        if (currentOption) {
            descriptionTextarea.value = currentOption.description;
        }

        // Form submission
        modal.querySelector('#statusUpdateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newStatus = statusSelect.value;
            const description = descriptionTextarea.value;

            try {
                // Update order status in Supabase
                const { error: orderError } = await this.supabase
                    .from('orders')
                    .update({ 
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', orderId);

                if (orderError) throw orderError;

                // Add status update record
                const { error: updateError } = await this.supabase
                    .from('order_updates')
                    .insert([
                        {
                            order_id: orderId,
                            status: newStatus,
                            description: description
                        }
                    ]);

                if (updateError) throw updateError;

                window.supabaseConfig.showNotification('Order status updated successfully!', 'success');
                
                // Close modal and refresh data
                document.body.removeChild(modal);
                await this.loadOrders();
                this.updateDashboardStats();

            } catch (error) {
                console.error('Error updating order status:', error);
                window.supabaseConfig.showNotification('Failed to update order status', 'error');
            }
        });

        // Close event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.close-modal-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    contactCustomer(phoneNumber) {
        if (!phoneNumber) {
            window.supabaseConfig.showNotification('No phone number available for this customer', 'error');
            return;
        }

        // Clean phone number
        let cleanNumber = phoneNumber.replace(/\s+/g, '').replace('-', '');
        
        // Ensure it starts with +256
        if (cleanNumber.startsWith('0')) {
            cleanNumber = '+256' + cleanNumber.substring(1);
        } else if (!cleanNumber.startsWith('+')) {
            cleanNumber = '+256' + cleanNumber;
        }

        // Create contact options modal
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        modal.innerHTML = `
            <div class="admin-modal-content" style="
                background: var(--gradient-card);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: var(--radius-lg);
                padding: var(--space-xl);
                max-width: 400px;
                width: 90%;
                position: relative;
                text-align: center;
            ">
                <div class="modal-header" style="
                    margin-bottom: var(--space-lg);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    padding-bottom: var(--space-md);
                ">
                    <h3 style="margin: 0; color: var(--space-electric);">
                        Contact Customer
                    </h3>
                    <button class="close-modal" style="
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        background: none;
                        border: none;
                        color: var(--space-white);
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 5px;
                        border-radius: 4px;
                        transition: all 0.3s ease;
                    ">&times;</button>
                </div>
                
                <div style="margin-bottom: var(--space-lg);">
                    <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: var(--space-md);">
                        Contact customer at: <strong>${phoneNumber}</strong>
                    </p>
                </div>
                
                <div class="contact-actions" style="
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-sm);
                ">
                    <button class="action-btn primary" onclick="window.open('tel:${cleanNumber}', '_self')">
                        <i class="fas fa-phone"></i> Call Customer
                    </button>
                    <button class="action-btn" style="background: #25D366; border-color: #25D366;" 
                            onclick="window.open('https://wa.me/${cleanNumber}', '_blank')">
                        <i class="fab fa-whatsapp"></i> WhatsApp Message
                    </button>
                    <button class="action-btn secondary" onclick="window.open('sms:${cleanNumber}', '_self')">
                        <i class="fas fa-sms"></i> Send SMS
                    </button>
                </div>
                
                <div class="modal-footer" style="
                    margin-top: var(--space-lg);
                    padding-top: var(--space-md);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    <button class="action-btn secondary close-modal-btn" style="width: 100%;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.close-modal-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Export orders data
    exportOrders() {
        if (this.orders.length === 0) {
            window.supabaseConfig.showNotification('No orders to export', 'warning');
            return;
        }

        const csvContent = this.convertToCSV(this.orders);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vdeliver-orders-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        window.supabaseConfig.showNotification('Orders exported successfully!', 'success');
    }

    convertToCSV(orders) {
        const headers = ['Tracking Number', 'Customer Name', 'Customer Phone', 'Customer Email', 'Recipient Name', 'Recipient Phone', 'Pickup Address', 'Delivery Address', 'Vehicle Type', 'Status', 'Estimated Cost', 'Created Date'];
        
        const csvRows = [
            headers.join(','),
            ...orders.map(order => [
                order.tracking_number,
                `"${order.sender_name}"`,
                order.sender_phone,
                order.sender_email,
                `"${order.recipient_name}"`,
                order.recipient_phone,
                `"${order.pickup_address}"`,
                `"${order.delivery_address}"`,
                order.vehicle_type,
                order.status,
                order.estimated_cost || '',
                new Date(order.created_at).toLocaleDateString('en-UG')
            ].join(','))
        ];
        
        return csvRows.join('\n');
    }

    // Search orders
    searchOrders(query) {
        if (!query.trim()) {
            this.loadAllOrdersTable();
            return;
        }

        const filteredOrders = this.orders.filter(order => 
            order.tracking_number.toLowerCase().includes(query.toLowerCase()) ||
            order.sender_name.toLowerCase().includes(query.toLowerCase()) ||
            order.sender_phone.includes(query) ||
            order.sender_email.toLowerCase().includes(query.toLowerCase()) ||
            order.recipient_name.toLowerCase().includes(query.toLowerCase()) ||
            order.pickup_address.toLowerCase().includes(query.toLowerCase()) ||
            order.delivery_address.toLowerCase().includes(query.toLowerCase())
        );

        const tableBody = document.getElementById('allOrdersTable');
        if (tableBody) {
            tableBody.innerHTML = filteredOrders.length > 0 
                ? filteredOrders.map(order => this.createOrderRow(order, true)).join('')
                : `<tr><td colspan="9" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">No orders found matching "${query}"</td></tr>`;
        }
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminDashboard = new AdminDashboard();
});
