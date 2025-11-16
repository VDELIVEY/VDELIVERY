// Profile Management System for VDELIVER
class ProfileSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.loadUserOrders();
        this.loadUserAddresses();
    }

    loadUserData() {
        if (!window.authSystem || !window.authSystem.isLoggedIn()) {
            window.location.href = 'login.html?redirect=profile.html';
            return;
        }

        this.currentUser = window.authSystem.currentUser;
        this.updateProfileDisplay();
    }

    updateProfileDisplay() {
        // Update greeting
        const greeting = document.getElementById('userGreeting');
        if (greeting && this.currentUser) {
            greeting.textContent = `Welcome, ${this.currentUser.fullName.split(' ')[0]}!`;
        }

        // Update profile form
        this.populateProfileForm();

        // Update stats
        this.updateOrderStats();
    }

    populateProfileForm() {
        if (!this.currentUser) return;

        document.getElementById('editFullName').value = this.currentUser.fullName || '';
        document.getElementById('editEmail').value = this.currentUser.email || '';
        document.getElementById('editPhone').value = this.currentUser.phone || '';
    }

    updateOrderStats() {
        if (!this.currentUser) return;

        const orders = this.currentUser.orders || [];
        const total = orders.length;
        const completed = orders.filter(order => order.status === 'delivered').length;
        const pending = orders.filter(order => 
            ['pending', 'accepted', 'picked_up', 'on_the_way'].includes(order.status)
        ).length;

        document.getElementById('totalOrders').textContent = total;
        document.getElementById('completedOrders').textContent = completed;
        document.getElementById('pendingOrders').textContent = pending;
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target));
        });

        // Profile form submission
        document.getElementById('profileForm')?.addEventListener('submit', (e) => this.handleProfileUpdate(e));

        // Add address button
        document.getElementById('addAddressBtn')?.addEventListener('click', () => this.showAddAddressModal());

        // Modal handlers
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => this.hideAddAddressModal());
        });

        // Add address form
        document.getElementById('addAddressForm')?.addEventListener('submit', (e) => this.handleAddAddress(e));

        // Change password button
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => this.changePassword());

        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => window.authSystem.logout());

        // Close modal when clicking outside
        document.getElementById('addAddressModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'addAddressModal') {
                this.hideAddAddressModal();
            }
        });
    }

    switchTab(button) {
        // Remove active class from all tabs and panes
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        // Add active class to clicked tab
        button.classList.add('active');

        // Show corresponding pane
        const tabName = button.getAttribute('data-tab');
        const pane = document.getElementById(`${tabName}-tab`);
        if (pane) {
            pane.classList.add('active');
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const updates = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone')
            };

            // Validate Uganda phone
            if (!window.authSystem.validateUgandaPhone(updates.phone)) {
                window.authSystem.showNotification('Please enter a valid Uganda phone number', 'error');
                return;
            }

            await window.authSystem.updateProfile(updates);
            this.currentUser = window.authSystem.currentUser;
            this.updateProfileDisplay();
            
            window.authSystem.showNotification('Profile updated successfully!', 'success');

        } catch (error) {
            window.authSystem.showNotification(error, 'error');
        }
    }

    loadUserOrders() {
        if (!this.currentUser || !this.currentUser.orders) return;

        const ordersList = document.getElementById('ordersList');
        if (!ordersList) return;

        if (this.currentUser.orders.length === 0) {
            // Show empty state (already in HTML)
            return;
        }

        // Clear existing orders (except empty state)
        const emptyState = ordersList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Add orders to the list
        this.currentUser.orders.forEach(order => {
            const orderElement = this.createOrderElement(order);
            ordersList.appendChild(orderElement);
        });
    }

    createOrderElement(order) {
        const orderDiv = document.createElement('div');
        orderDiv.className = `order-card order-status-${order.status}`;
        
        const statusIcons = {
            'pending': 'fas fa-clock',
            'accepted': 'fas fa-check-circle',
            'picked_up': 'fas fa-box',
            'on_the_way': 'fas fa-truck',
            'delivered': 'fas fa-flag-checkered',
            'cancelled': 'fas fa-times-circle'
        };

        const statusLabels = {
            'pending': 'Pending',
            'accepted': 'Accepted',
            'picked_up': 'Picked Up',
            'on_the_way': 'On the Way',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled'
        };

        const statusColors = {
            'pending': 'var(--space-blue)',
            'accepted': 'var(--space-green)',
            'picked_up': 'var(--space-electric)',
            'on_the_way': 'var(--space-purple)',
            'delivered': 'var(--space-green)',
            'cancelled': 'var(--space-red)'
        };

        orderDiv.innerHTML = `
            <div class="order-header">
                <div class="order-info">
                    <h4>Delivery to ${order.recipientName}</h4>
                    <p class="order-tracking">Tracking: <strong>${order.trackingNumber}</strong></p>
                </div>
                <div class="order-status" style="color: ${statusColors[order.status]};">
                    <i class="${statusIcons[order.status]}"></i>
                    ${statusLabels[order.status]}
                </div>
            </div>
            
            <div class="order-details">
                <div class="order-route">
                    <div class="route-point">
                        <i class="fas fa-arrow-up pickup-icon"></i>
                        <div>
                            <strong>Pickup:</strong> ${order.pickupAddress}
                        </div>
                    </div>
                    <div class="route-point">
                        <i class="fas fa-flag-checkered delivery-icon"></i>
                        <div>
                            <strong>Delivery:</strong> ${order.deliveryAddress}
                        </div>
                    </div>
                </div>
                
                <div class="order-meta">
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        ${new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-route"></i>
                        ${order.distance || '--'} km
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-money-bill-wave"></i>
                        ${order.cost || '--'} UGX
                    </div>
                </div>
            </div>
            
            <div class="order-actions">
                <button class="action-btn track-order" data-tracking="${order.trackingNumber}">
                    <i class="fas fa-map-marker-alt"></i>
                    Track
                </button>
                <button class="action-btn view-details" data-order="${order.id}">
                    <i class="fas fa-eye"></i>
                    Details
                </button>
                ${order.status === 'pending' ? `
                    <button class="action-btn cancel-order" data-order="${order.id}">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                ` : ''}
            </div>
        `;

        // Add event listeners to action buttons
        orderDiv.querySelector('.track-order')?.addEventListener('click', (e) => {
            this.trackOrder(e.target.closest('.track-order').getAttribute('data-tracking'));
        });

        orderDiv.querySelector('.view-details')?.addEventListener('click', (e) => {
            this.viewOrderDetails(e.target.closest('.view-details').getAttribute('data-order'));
        });

        orderDiv.querySelector('.cancel-order')?.addEventListener('click', (e) => {
            this.cancelOrder(e.target.closest('.cancel-order').getAttribute('data-order'));
        });

        return orderDiv;
    }

    loadUserAddresses() {
        if (!this.currentUser || !this.currentUser.addresses) return;

        const addressesList = document.getElementById('addressesList');
        if (!addressesList) return;

        if (this.currentUser.addresses.length === 0) {
            // Show empty state (already in HTML)
            return;
        }

        // Clear existing addresses (except empty state)
        const emptyState = addressesList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Add addresses to the list
        this.currentUser.addresses.forEach(address => {
            const addressElement = this.createAddressElement(address);
            addressesList.appendChild(addressElement);
        });
    }

    createAddressElement(address) {
        const addressDiv = document.createElement('div');
        addressDiv.className = `address-card ${address.isDefault ? 'default-address' : ''}`;
        
        addressDiv.innerHTML = `
            <div class="address-header">
                <h4>${address.label}</h4>
                ${address.isDefault ? '<span class="default-badge">Default</span>' : ''}
            </div>
            
            <div class="address-details">
                <p><strong>Address:</strong> ${address.address}</p>
                <p><strong>Landmark:</strong> ${address.landmark}</p>
                ${address.instructions ? `<p><strong>Instructions:</strong> ${address.instructions}</p>` : ''}
            </div>
            
            <div class="address-actions">
                <button class="action-btn use-address" data-address="${address.id}">
                    <i class="fas fa-truck"></i>
                    Use for Delivery
                </button>
                ${!address.isDefault ? `
                    <button class="action-btn set-default" data-address="${address.id}">
                        <i class="fas fa-star"></i>
                        Set Default
                    </button>
                ` : ''}
                <button class="action-btn delete-address" data-address="${address.id}">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        `;

        // Add event listeners
        addressDiv.querySelector('.use-address')?.addEventListener('click', (e) => {
            this.useAddressForDelivery(e.target.closest('.use-address').getAttribute('data-address'));
        });

        addressDiv.querySelector('.set-default')?.addEventListener('click', (e) => {
            this.setDefaultAddress(e.target.closest('.set-default').getAttribute('data-address'));
        });

        addressDiv.querySelector('.delete-address')?.addEventListener('click', (e) => {
            this.deleteAddress(e.target.closest('.delete-address').getAttribute('data-address'));
        });

        return addressDiv;
    }

    showAddAddressModal() {
        document.getElementById('addAddressModal').style.display = 'flex';
    }

    hideAddAddressModal() {
        document.getElementById('addAddressModal').style.display = 'none';
        document.getElementById('addAddressForm').reset();
    }

    async handleAddAddress(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const addressData = {
                label: formData.get('label'),
                address: formData.get('address'),
                landmark: formData.get('landmark'),
                instructions: formData.get('instructions'),
                setAsDefault: formData.get('setAsDefault') === 'on'
            };

            const newAddress = window.authSystem.saveAddress(addressData);
            
            if (addressData.setAsDefault) {
                await this.setDefaultAddress(newAddress.id);
            }

            this.hideAddAddressModal();
            this.loadUserAddresses();
            
            window.authSystem.showNotification('Address saved successfully!', 'success');

        } catch (error) {
            window.authSystem.showNotification(error, 'error');
        }
    }

    useAddressForDelivery(addressId) {
        const address = this.currentUser.addresses.find(addr => addr.id === addressId);
        if (address) {
            // Store in session storage for use in delivery form
            sessionStorage.setItem('selectedAddress', JSON.stringify(address));
            window.location.href = '../index.html';
        }
    }

    async setDefaultAddress(addressId) {
        try {
            // Update all addresses to not default
            const updatedAddresses = this.currentUser.addresses.map(addr => ({
                ...addr,
                isDefault: addr.id === addressId
            }));

            await window.authSystem.updateProfile({ addresses: updatedAddresses });
            this.currentUser = window.authSystem.currentUser;
            this.loadUserAddresses();
            
            window.authSystem.showNotification('Default address updated!', 'success');

        } catch (error) {
            window.authSystem.showNotification(error, 'error');
        }
    }

    async deleteAddress(addressId) {
        if (!confirm('Are you sure you want to delete this address?')) return;

        try {
            const updatedAddresses = this.currentUser.addresses.filter(addr => addr.id !== addressId);
            await window.authSystem.updateProfile({ addresses: updatedAddresses });
            this.currentUser = window.authSystem.currentUser;
            this.loadUserAddresses();
            
            window.authSystem.showNotification('Address deleted', 'success');

        } catch (error) {
            window.authSystem.showNotification(error, 'error');
        }
    }

    trackOrder(trackingNumber) {
        // For now, show tracking info
        alert(`Tracking number: ${trackingNumber}\n\nLive tracking will be available in the next update!`);
    }

    viewOrderDetails(orderId) {
        const order = this.currentUser.orders.find(o => o.id === orderId);
        if (order) {
            this.showOrderDetailsModal(order);
        }
    }

    showOrderDetailsModal(order) {
        // Simple modal for order details
        const details = `
            Order ID: ${order.id}
            Tracking: ${order.trackingNumber}
            Status: ${order.status}
            Created: ${new Date(order.createdAt).toLocaleString()}
            Pickup: ${order.pickupAddress}
            Delivery: ${order.deliveryAddress}
            Recipient: ${order.recipientName} (${order.recipientPhone})
            Vehicle: ${order.vehicleType}
            Distance: ${order.distance || '--'} km
            Cost: ${order.cost || '--'} UGX
        `;
        
        alert('Order Details:\n\n' + details);
    }

    async cancelOrder(orderId) {
        if (!confirm('Are you sure you want to cancel this delivery?')) return;

        try {
            // Find and update the order
            const orderIndex = this.currentUser.orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                this.currentUser.orders[orderIndex].status = 'cancelled';
                await window.authSystem.updateProfile({ orders: this.currentUser.orders });
                this.currentUser = window.authSystem.currentUser;
                this.loadUserOrders();
                this.updateOrderStats();
                
                window.authSystem.showNotification('Delivery cancelled', 'success');
            }
        } catch (error) {
            window.authSystem.showNotification(error, 'error');
        }
    }

    changePassword() {
        const newPassword = prompt('Enter new password (min. 6 characters):');
        if (newPassword && newPassword.length >= 6) {
            // In a real app, you'd hash this and verify old password
            window.authSystem.showNotification('Password change feature coming soon!', 'info');
        } else if (newPassword) {
            window.authSystem.showNotification('Password must be at least 6 characters', 'error');
        }
    }
}

// Initialize profile system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.profileSystem = new ProfileSystem();
});
