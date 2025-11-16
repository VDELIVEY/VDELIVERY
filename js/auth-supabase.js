
// Production Authentication System with Supabase for VDELIVER
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.supabase = window.supabaseConfig?.getClient();
        this.init();
    }

    async init() {
        await this.loadCurrentUser();
        this.setupEventListeners();
        this.updateNavigation();
    }

    // Load current user from Supabase session
    async loadCurrentUser() {
        try {
            console.log('Loading current user...');
            
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('Session error:', error);
                return;
            }
            
            if (session?.user) {
                console.log('User session found:', session.user.id);
                
                // Get user profile from database
                const { data: user, error: userError } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (userError) {
                    console.error('User profile error:', userError);
                    // User might not have profile yet, create one
                    await this.createUserProfile(session.user);
                    return;
                }
                
                this.currentUser = user;
                localStorage.setItem('vdeliver_current_user', JSON.stringify(user));
                console.log('User loaded successfully:', user.email);
            } else {
                console.log('No user session found');
                this.currentUser = null;
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.currentUser = null;
        }
    }

    // Create user profile if it doesn't exist
    async createUserProfile(authUser) {
        try {
            const { data: user, error } = await this.supabase
                .from('users')
                .insert([
                    {
                        id: authUser.id,
                        email: authUser.email,
                        phone: authUser.user_metadata?.phone || '',
                        full_name: authUser.user_metadata?.full_name || 'User'
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            this.currentUser = user;
            localStorage.setItem('vdeliver_current_user', JSON.stringify(user));
            console.log('User profile created successfully');

        } catch (error) {
            console.error('Error creating user profile:', error);
        }
    }

    // Register new user with Supabase
    async register(userData) {
        try {
            console.log('Starting registration for:', userData.email);
            
            // Validate Uganda phone
            if (!window.supabaseConfig.validateUgandaPhone(userData.phone)) {
                throw new Error('Please enter a valid Uganda phone number (e.g., +256712345678)');
            }

            // Validate password
            if (userData.password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Create user in Supabase Auth
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        full_name: userData.fullName,
                        phone: userData.phone
                    }
                }
            });

            if (authError) {
                console.error('Auth error:', authError);
                throw new Error(this.getAuthErrorMessage(authError));
            }

            console.log('Auth user created:', authData.user.id);

            // Create user profile in database
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .insert([
                    {
                        id: authData.user.id,
                        email: userData.email,
                        phone: userData.phone,
                        full_name: userData.fullName
                    }
                ])
                .select()
                .single();

            if (userError) {
                console.error('User profile error:', userError);
                throw new Error('Account created but profile setup failed. Please try logging in.');
            }

            this.currentUser = user;
            localStorage.setItem('vdeliver_current_user', JSON.stringify(user));
            this.updateNavigation();
            
            console.log('Registration completed successfully');
            return user;

        } catch (error) {
            console.error('Registration error:', error);
            throw new Error(error.message || 'Registration failed. Please try again.');
        }
    }

    // Login user with Supabase
    async login(emailOrPhone, password) {
        try {
            console.log('Attempting login for:', emailOrPhone);
            
            let email = emailOrPhone;
            
            // If input looks like a phone number, find user by phone
            if (window.supabaseConfig.validateUgandaPhone(emailOrPhone)) {
                const { data: user, error: phoneError } = await this.supabase
                    .from('users')
                    .select('email')
                    .eq('phone', emailOrPhone)
                    .single();
                
                if (phoneError) {
                    console.error('Phone lookup error:', phoneError);
                    throw new Error('No account found with this phone number');
                }
                
                if (user) {
                    email = user.email;
                    console.log('Found user by phone:', email);
                }
            }

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('Login error:', error);
                throw new Error(this.getAuthErrorMessage(error));
            }

            // Get user profile
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (userError) {
                console.error('User profile error:', userError);
                throw new Error('Login successful but profile loading failed');
            }

            this.currentUser = user;
            localStorage.setItem('vdeliver_current_user', JSON.stringify(user));
            this.updateNavigation();

            console.log('Login successful:', user.email);
            return user;

        } catch (error) {
            console.error('Login error:', error);
            throw new Error(error.message || 'Invalid email/phone or password');
        }
    }

    // Logout user
    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            localStorage.removeItem('vdeliver_current_user');
            this.updateNavigation();
            
            window.supabaseConfig.showNotification('Logged out successfully', 'success');
            
            // Redirect to home page after a brief delay
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
            
        } catch (error) {
            console.error('Logout error:', error);
            window.supabaseConfig.showNotification('Logout failed', 'error');
        }
    }

    // Update user profile
    async updateProfile(updates) {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            // Validate Uganda phone if provided
            if (updates.phone && !window.supabaseConfig.validateUgandaPhone(updates.phone)) {
                throw new Error('Please enter a valid Uganda phone number');
            }

            const { data: user, error } = await this.supabase
                .from('users')
                .update({
                    full_name: updates.fullName,
                    email: updates.email,
                    phone: updates.phone,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;

            this.currentUser = user;
            localStorage.setItem('vdeliver_current_user', JSON.stringify(user));
            
            return user;

        } catch (error) {
            console.error('Profile update error:', error);
            throw new Error(error.message || 'Profile update failed');
        }
    }

    // Save address to database
    async saveAddress(addressData) {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            const { data: address, error } = await this.supabase
                .from('addresses')
                .insert([
                    {
                        user_id: this.currentUser.id,
                        label: addressData.label,
                        address: addressData.address,
                        landmark: addressData.landmark,
                        instructions: addressData.instructions,
                        is_default: addressData.setAsDefault || false
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            return address;

        } catch (error) {
            console.error('Save address error:', error);
            throw new Error(error.message || 'Failed to save address');
        }
    }

    // Get user addresses
    async getUserAddresses() {
        try {
            if (!this.currentUser) return [];

            const { data: addresses, error } = await this.supabase
                .from('addresses')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            return addresses || [];

        } catch (error) {
            console.error('Get addresses error:', error);
            return [];
        }
    }

    // Create new order
    async createOrder(orderData) {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            const trackingNumber = window.supabaseConfig.generateTrackingNumber();
            
            const { data: order, error } = await this.supabase
                .from('orders')
                .insert([
                    {
                        user_id: this.currentUser.id,
                        tracking_number: trackingNumber,
                        status: 'pending',
                        
                        // Sender info
                        sender_name: orderData.senderName,
                        sender_phone: orderData.senderPhone,
                        sender_email: orderData.senderEmail,
                        
                        // Recipient info
                        recipient_name: orderData.recipientName,
                        recipient_phone: orderData.recipientPhone,
                        
                        // Location info
                        pickup_address: orderData.pickupAddress,
                        pickup_landmark: orderData.pickupLandmark,
                        pickup_coords: orderData.pickupCoords,
                        delivery_address: orderData.deliveryAddress,
                        delivery_landmark: orderData.deliveryLandmark,
                        delivery_coords: orderData.deliveryCoords,
                        
                        // Delivery details
                        vehicle_type: orderData.vehicleType,
                        package_description: orderData.packageDescription,
                        special_instructions: orderData.specialInstructions,
                        emergency_contact: orderData.emergencyContact,
                        call_recipient: orderData.callRecipient,
                        
                        // Route info
                        distance_km: orderData.routeDistance ? parseFloat(orderData.routeDistance) : null,
                        duration_min: orderData.routeDuration ? parseInt(orderData.routeDuration) : null,
                        estimated_cost: orderData.routeCost ? parseFloat(orderData.routeCost.replace(/[^0-9.]/g, '')) : null
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            // Create initial status update
            await this.supabase
                .from('order_updates')
                .insert([
                    {
                        order_id: order.id,
                        status: 'pending',
                        description: 'Delivery request received and being processed'
                    }
                ]);

            return order;

        } catch (error) {
            console.error('Create order error:', error);
            throw new Error(error.message || 'Failed to create order');
        }
    }

    // Get user orders
    async getUserOrders() {
        try {
            if (!this.currentUser) return [];

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
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return orders || [];

        } catch (error) {
            console.error('Get orders error:', error);
            return [];
        }
    }

    // Update order status
    async updateOrderStatus(orderId, status, description = '') {
        try {
            // Update order
            const { error: orderError } = await this.supabase
                .from('orders')
                .update({ 
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (orderError) throw orderError;

            // Add status update
            const { error: updateError } = await this.supabase
                .from('order_updates')
                .insert([
                    {
                        order_id: orderId,
                        status: status,
                        description: description
                    }
                ]);

            if (updateError) throw updateError;

            return true;

        } catch (error) {
            console.error('Update order status error:', error);
            throw new Error(error.message || 'Failed to update order status');
        }
    }

    // Delete address
    async deleteAddress(addressId) {
        try {
            const { error } = await this.supabase
                .from('addresses')
                .delete()
                .eq('id', addressId);

            if (error) throw error;

            return true;

        } catch (error) {
            console.error('Delete address error:', error);
            throw new Error(error.message || 'Failed to delete address');
        }
    }

    // Set default address
    async setDefaultAddress(addressId) {
        try {
            if (!this.currentUser) return false;

            // First, set all addresses to not default
            await this.supabase
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', this.currentUser.id);

            // Then set the selected one as default
            const { error } = await this.supabase
                .from('addresses')
                .update({ is_default: true })
                .eq('id', addressId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            return true;

        } catch (error) {
            console.error('Set default address error:', error);
            throw new Error(error.message || 'Failed to set default address');
        }
    }

    // Helper method to get user-friendly auth error messages
    getAuthErrorMessage(error) {
        const messages = {
            'Invalid login credentials': 'Invalid email/phone or password',
            'Email not confirmed': 'Please check your email to confirm your account',
            'User already registered': 'An account with this email already exists',
            'Password should be at least 6 characters': 'Password must be at least 6 characters long'
        };
        
        return messages[error.message] || error.message || 'Authentication failed';
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Update navigation based on auth status
    updateNavigation() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        // Remove existing auth links
        const existingAuthLinks = navLinks.querySelector('.auth-links');
        if (existingAuthLinks) {
            existingAuthLinks.remove();
        }

        if (this.isLoggedIn()) {
            const userDropdown = `
                <div class="auth-links" style="display: flex; align-items: center; gap: var(--space-md);">
                    <a href="auth/profile.html" class="nav-link">
                        <i class="fas fa-user"></i>
                        ${this.currentUser.full_name.split(' ')[0]}
                    </a>
                    <button id="logoutBtn" class="nav-link" style="background: none; border: none; color: inherit; cursor: pointer;">
                        <i class="fas fa-sign-out-alt"></i>
                        Logout
                    </button>
                </div>
            `;
            navLinks.innerHTML += userDropdown;

            // Add logout event listener
            document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        } else {
            const authLinks = `
                <div class="auth-links" style="display: flex; align-items: center; gap: var(--space-md);">
                    <a href="auth/login.html" class="nav-link">Login</a>
                    <a href="auth/register.html" class="cta-button secondary" style="padding: var(--space-xs) var(--space-sm);">Sign Up</a>
                </div>
            `;
            navLinks.innerHTML += authLinks;
        }
    }

    // Setup event listeners for auth forms
    setupEventListeners() {
        // Registration form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            
            // Password strength indicator
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.addEventListener('input', (e) => this.updatePasswordStrength(e.target.value));
            }
        }

        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button (if exists on current page)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn && !logoutBtn.onclick) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    // Handle registration form submission
    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        try {
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            submitButton.disabled = true;

            const formData = new FormData(form);
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');

            // Basic validation
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            const userData = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                password: password
            };

            await this.register(userData);
            window.supabaseConfig.showNotification('Account created successfully! Redirecting...', 'success');
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);

        } catch (error) {
            window.supabaseConfig.showNotification(error.message, 'error');
        } finally {
            // Restore button state
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }

    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        try {
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            submitButton.disabled = true;

            const formData = new FormData(form);
            const emailOrPhone = formData.get('email');
            const password = formData.get('password');

            await this.login(emailOrPhone, password);
            window.supabaseConfig.showNotification('Login successful! Redirecting...', 'success');
            
            // Redirect to previous page or home
            setTimeout(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect') || '../index.html';
                window.location.href = redirect;
            }, 1000);

        } catch (error) {
            window.supabaseConfig.showNotification(error.message, 'error');
        } finally {
            // Restore button state
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }

    // Update password strength indicator
    updatePasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-bar');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthBar || !strengthText) return;

        let strength = 0;
        let text = 'Password strength';
        let className = '';

        if (password.length >= 6) strength += 1;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1;
        if (password.match(/\d/)) strength += 1;
        if (password.match(/[^a-zA-Z\d]/)) strength += 1;

        switch (strength) {
            case 0:
                className = '';
                text = 'Password strength';
                break;
            case 1:
                className = 'weak';
                text = 'Weak password';
                break;
            case 2:
                className = 'medium';
                text = 'Medium strength';
                break;
            case 3:
            case 4:
                className = 'strong';
                text = 'Strong password';
                break;
        }

        strengthBar.className = `strength-bar ${className}`;
        strengthText.textContent = text;
    }
}

// Initialize auth system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.authSystem = new AuthSystem();
});
