
// Delivery Form Integration with User Accounts
class DeliveryIntegration {
    constructor() {
        this.authSystem = window.authSystem;
        this.supabaseConfig = window.supabaseConfig;
        this.userAddresses = [];
        this.init();
    }

    async init() {
        await this.checkUserStatus();
        this.setupEventListeners();
        this.loadUserAddresses();
    }

    async checkUserStatus() {
        // Wait a bit for auth system to initialize
        setTimeout(async () => {
            if (this.authSystem?.isLoggedIn()) {
                this.showUserFeatures();
                await this.loadUserAddresses();
            } else {
                this.showGuestFeatures();
            }
        }, 500);
    }

    showUserFeatures() {
        console.log('Showing user features for:', this.authSystem.currentUser.email);
        
        // Show user status indicator
        const userIndicator = document.getElementById('userStatusIndicator');
        if (userIndicator) userIndicator.style.display = 'flex';

        // Show benefits notice
        const benefitsNotice = document.getElementById('userBenefitsNotice');
        if (benefitsNotice) {
            benefitsNotice.style.display = 'block';
            benefitsNotice.querySelector('strong').textContent = `Welcome back, ${this.authSystem.currentUser.full_name.split(' ')[0]}!`;
        }

        // Show saved addresses dropdowns
        this.showSavedAddressesDropdowns();

        // Show save address buttons
        const savePickupBtn = document.getElementById('savePickupAddress');
        const saveDeliveryBtn = document.getElementById('saveDeliveryAddress');
        if (savePickupBtn) savePickupBtn.style.display = 'inline-flex';
        if (saveDeliveryBtn) saveDeliveryBtn.style.display = 'inline-flex';

        // Auto-fill sender info for logged-in users
        this.autoFillSenderInfo();
    }

    showGuestFeatures() {
        console.log('Showing guest features');
        
        // Show quick login prompt
        this.showQuickLoginPrompt();
    }

    showQuickLoginPrompt() {
        const locationSection = document.querySelector('.location-section');
        if (!locationSection) return;

        // Check if prompt already exists
        if (document.getElementById('quickLoginPrompt')) return;

        const quickLoginHTML = `
            <div id="quickLoginPrompt" class="quick-login-prompt">
                <p><strong>Create an account</strong> to save your addresses and track orders!</p>
                <div class="quick-login-buttons">
                    <a href="auth/register.html" class="cta-button primary quick-login-btn">
                        <i class="fas fa-user-plus"></i> Sign Up Free
                    </a>
                    <a href="auth/login.html" class="cta-button secondary quick-login-btn">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </a>
                </div>
            </div>
        `;

        locationSection.insertAdjacentHTML('beforebegin', quickLoginHTML);
    }

    async loadUserAddresses() {
        if (!this.authSystem?.isLoggedIn()) return;

        try {
            this.userAddresses = await this.authSystem.getUserAddresses();
            this.populateAddressDropdowns();
            console.log('Loaded user addresses:', this.userAddresses.length);
        } catch (error) {
            console.error('Error loading user addresses:', error);
        }
    }

    populateAddressDropdowns() {
        const pickupSelect = document.getElementById('pickupAddressSelect');
        const deliverySelect = document.getElementById('deliveryAddressSelect');

        if (!pickupSelect || !deliverySelect) return;

        // Clear existing options (except first)
        while (pickupSelect.options.length > 1) pickupSelect.remove(1);
        while (deliverySelect.options.length > 1) deliverySelect.remove(1);

        // Add address options
        this.userAddresses.forEach(address => {
            const option = new Option(`${address.label} - ${address.address}`, address.id);
            pickupSelect.add(option.cloneNode(true));
            deliverySelect.add(option);
        });
    }

    showSavedAddressesDropdowns() {
        const pickupDropdown = document.getElementById('savedAddressesPickup');
        const deliveryDropdown = document.getElementById('savedAddressesDelivery');

        if (pickupDropdown) pickupDropdown.style.display = 'block';
        if (deliveryDropdown) deliveryDropdown.style.display = 'block';
    }

    autoFillSenderInfo() {
        if (!this.authSystem?.currentUser) return;

        const user = this.authSystem.currentUser;
        
        // Auto-fill sender name and email
        const senderName = document.getElementById('senderName');
        const senderEmail = document.getElementById('senderEmail');
        const senderPhone = document.getElementById('senderPhone');

        if (senderName && !senderName.value) {
            senderName.value = user.full_name;
        }
        if (senderEmail && !senderEmail.value) {
            senderEmail.value = user.email;
        }
        if (senderPhone && !senderPhone.value) {
            senderPhone.value = user.phone;
        }
    }

    setupEventListeners() {
        // Saved address selection
        document.getElementById('pickupAddressSelect')?.addEventListener('change', (e) => {
            this.handleAddressSelection(e.target.value, 'pickup');
        });

        document.getElementById('deliveryAddressSelect')?.addEventListener('change', (e) => {
            this.handleAddressSelection(e.target.value, 'delivery');
        });

        // Clear saved address buttons
        document.getElementById('clearSavedPickup')?.addEventListener('click', () => {
            this.clearSavedAddress('pickup');
        });

        document.getElementById('clearSavedDelivery')?.addEventListener('click', () => {
            this.clearSavedAddress('delivery');
        });

        // Save address buttons
        document.getElementById('savePickupAddress')?.addEventListener('click', () => {
            this.saveCurrentAddress('pickup');
        });

        document.getElementById('saveDeliveryAddress')?.addEventListener('click', () => {
            this.saveCurrentAddress('delivery');
        });

        // Enhanced form submission
        const deliveryForm = document.getElementById('deliveryForm');
        if (deliveryForm) {
            deliveryForm.addEventListener('submit', (e) => this.handleFormSubmission(e));
        }
    }

    handleAddressSelection(addressId, type) {
        const address = this.userAddresses.find(addr => addr.id === addressId);
        if (!address) return;

        const addressField = document.getElementById(`${type}Address`);
        const landmarkField = document.getElementById(`${type}Landmark`);

        if (addressField) addressField.value = address.address;
        if (landmarkField) landmarkField.value = address.landmark;

        // Show success message
        this.supabaseConfig.showNotification(`Loaded ${address.label} address`, 'success');

        // Add visual feedback
        if (addressField) {
            addressField.style.borderColor = 'var(--space-green)';
            setTimeout(() => {
                addressField.style.borderColor = '';
            }, 2000);
        }
    }

    clearSavedAddress(type) {
        const select = document.getElementById(`${type}AddressSelect`);
        if (select) select.value = '';

        const addressField = document.getElementById(`${type}Address`);
        const landmarkField = document.getElementById(`${type}Landmark`);

        if (addressField) addressField.value = '';
        if (landmarkField) landmarkField.value = '';

        this.supabaseConfig.showNotification('Cleared saved address', 'info');
    }

    async saveCurrentAddress(type) {
        if (!this.authSystem?.isLoggedIn()) {
            this.supabaseConfig.showNotification('Please log in to save addresses', 'error');
            return;
        }

        const addressField = document.getElementById(`${type}Address`);
        const landmarkField = document.getElementById(`${type}Landmark`);

        if (!addressField?.value || !landmarkField?.value) {
            this.supabaseConfig.showNotification('Please fill in address and landmark first', 'error');
            return;
        }

        try {
            const label = prompt('Enter a label for this address (e.g., Home, Work):', type === 'pickup' ? 'My Pickup' : 'My Delivery');
            if (!label) return;

            const addressData = {
                label: label,
                address: addressField.value,
                landmark: landmarkField.value,
                instructions: '',
                setAsDefault: false
            };

            const savedAddress = await this.authSystem.saveAddress(addressData);
            this.userAddresses.push(savedAddress);
            this.populateAddressDropdowns();

            this.supabaseConfig.showNotification('Address saved successfully!', 'success');

            // Visual feedback
            addressField.style.borderColor = 'var(--space-green)';
            setTimeout(() => {
                addressField.style.borderColor = '';
            }, 2000);

        } catch (error) {
            this.supabaseConfig.showNotification('Failed to save address', 'error');
            console.error('Save address error:', error);
        }
    }

    async handleFormSubmission(e) {
        // Let the original form submission happen first
        setTimeout(async () => {
            // If user is logged in, also save to their order history
            if (this.authSystem?.isLoggedIn()) {
                await this.saveOrderToProfile();
            }
        }, 100);
    }

    async saveOrderToProfile() {
        try {
            const formData = this.getFormData();
            const order = await this.authSystem.createOrder(formData);
            
            console.log('Order saved to user profile:', order.tracking_number);
            
            // Show success message for logged-in users
            setTimeout(() => {
                this.supabaseConfig.showNotification(
                    `Order saved to your profile! Tracking: ${order.tracking_number}`, 
                    'success'
                );
            }, 2000);

        } catch (error) {
            console.error('Error saving order to profile:', error);
            // Don't show error to user - form submission still worked
        }
    }

    getFormData() {
        return {
            senderName: document.getElementById('senderName')?.value || '',
            senderPhone: document.getElementById('senderPhone')?.value || '',
            senderEmail: document.getElementById('senderEmail')?.value || '',
            pickupAddress: document.getElementById('pickupAddress')?.value || '',
            pickupLandmark: document.getElementById('pickupLandmark')?.value || '',
            pickupCoords: document.getElementById('pickupCoordsHidden')?.value || 'Not set',
            recipientName: document.getElementById('recipientName')?.value || '',
            recipientPhone: document.getElementById('recipientPhone')?.value || '',
            deliveryAddress: document.getElementById('deliveryAddress')?.value || '',
            deliveryLandmark: document.getElementById('deliveryLandmark')?.value || '',
            deliveryCoords: document.getElementById('deliveryCoordsHidden')?.value || 'Not set',
            vehicleType: document.getElementById('vehicleType')?.value || '',
            packageDescription: document.getElementById('packageDescription')?.value || '',
            specialInstructions: document.getElementById('specialInstructions')?.value || '',
            emergencyContact: document.getElementById('emergencyContact')?.value || '',
            callRecipient: document.getElementById('callRecipient')?.checked || false,
            routeDistance: document.getElementById('routeDistance')?.textContent || '--',
            routeDuration: document.getElementById('routeDuration')?.textContent || '--',
            routeCost: document.getElementById('routeCost')?.textContent || '--'
        };
    }
}

// Initialize delivery integration
document.addEventListener('DOMContentLoaded', function() {
    window.deliveryIntegration = new DeliveryIntegration();
});
