
// Authentication System for VDELIVER
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.users = JSON.parse(localStorage.getItem('vdeliver_users')) || [];
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.setupEventListeners();
        this.updateNavigation();
    }

    // Load current user from localStorage
    loadCurrentUser() {
        const userData = localStorage.getItem('vdeliver_current_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    // Save current user to localStorage
    saveCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('vdeliver_current_user', JSON.stringify(user));
    }

    // Register new user
    register(userData) {
        return new Promise((resolve, reject) => {
            // Check if user already exists
            const existingUser = this.users.find(user => 
                user.email === userData.email || user.phone === userData.phone
            );

            if (existingUser) {
                reject('User with this email or phone already exists');
                return;
            }

            // Create new user object
            const newUser = {
                id: this.generateId(),
                ...userData,
                createdAt: new Date().toISOString(),
                orders: [],
                addresses: [],
                profileCompleted: false
            };

            // Add to users array
            this.users.push(newUser);
            localStorage.setItem('vdeliver_users', JSON.stringify(this.users));

            // Auto-login after registration
            this.saveCurrentUser(newUser);
            this.updateNavigation();

            resolve(newUser);
        });
    }

    // Login user
    login(emailOrPhone, password) {
        return new Promise((resolve, reject) => {
            const user = this.users.find(user => 
                (user.email === emailOrPhone || user.phone === emailOrPhone) && 
                user.password === password
            );

            if (user) {
                this.saveCurrentUser(user);
                this.updateNavigation();
                resolve(user);
            } else {
                reject('Invalid email/phone or password');
            }
        });
    }

    // Logout user
    logout() {
        this.currentUser = null;
        localStorage.removeItem('vdeliver_current_user');
        this.updateNavigation();
        window.location.href = '../index.html';
    }

    // Update user profile
    updateProfile(updates) {
        return new Promise((resolve, reject) => {
            if (!this.currentUser) {
                reject('No user logged in');
                return;
            }

            // Find user in array and update
            const userIndex = this.users.findIndex(user => user.id === this.currentUser.id);
            if (userIndex !== -1) {
                this.users[userIndex] = { ...this.users[userIndex], ...updates };
                localStorage.setItem('vdeliver_users', JSON.stringify(this.users));
                
                // Update current user
                this.saveCurrentUser(this.users[userIndex]);
                resolve(this.users[userIndex]);
            } else {
                reject('User not found');
            }
        });
    }

    // Add order to user's history
    addOrder(orderData) {
        if (!this.currentUser) return;

        const order = {
            id: this.generateId(),
            ...orderData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            trackingNumber: this.generateTrackingNumber()
        };

        const userIndex = this.users.findIndex(user => user.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex].orders.unshift(order);
            localStorage.setItem('vdeliver_users', JSON.stringify(this.users));
            
            // Update current user
            this.saveCurrentUser(this.users[userIndex]);
        }

        return order;
    }

    // Save address to user profile
    saveAddress(addressData) {
        if (!this.currentUser) return;

        const address = {
            id: this.generateId(),
            ...addressData,
            isDefault: false
        };

        const userIndex = this.users.findIndex(user => user.id === this.currentUser.id);
        if (userIndex !== -1) {
            // If this is the first address, set as default
            if (this.users[userIndex].addresses.length === 0) {
                address.isDefault = true;
            }
            
            this.users[userIndex].addresses.push(address);
            localStorage.setItem('vdeliver_users', JSON.stringify(this.users));
            this.saveCurrentUser(this.users[userIndex]);
        }

        return address;
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateTrackingNumber() {
        return 'VD' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Update navigation based on auth status
    updateNavigation() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        if (this.isLoggedIn()) {
            // Remove existing auth links
            const existingAuthLinks = navLinks.querySelector('.auth-links');
            if (existingAuthLinks) {
                existingAuthLinks.remove();
            }

            // Add user dropdown
            const userDropdown = `
                <div class="auth-links" style="display: flex; align-items: center; gap: var(--space-md);">
                    <a href="auth/profile.html" class="nav-link">
                        <i class="fas fa-user"></i>
                        ${this.currentUser.fullName.split(' ')[0]}
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
            // Remove user dropdown
            const existingAuthLinks = navLinks.querySelector('.auth-links');
            if (existingAuthLinks) {
                existingAuthLinks.remove();
            }

            // Add login/register links
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
    }

    // Handle registration form submission
    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        // Basic validation
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        // Uganda phone validation
        const phone = formData.get('phone');
        if (!this.validateUgandaPhone(phone)) {
            this.showNotification('Please enter a valid Uganda phone number (+2567...)', 'error');
            return;
        }

        try {
            const userData = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                password: password,
                marketingEmails: formData.get('marketing') === 'on'
            };

            await this.register(userData);
            this.showNotification('Account created successfully! Redirecting...', 'success');
            
            // Redirect to profile or home page
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1500);

        } catch (error) {
            this.showNotification(error, 'error');
        }
    }

    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const emailOrPhone = formData.get('email');
            const password = formData.get('password');
            const rememberMe = formData.get('rememberMe') === 'on';

            await this.login(emailOrPhone, password);
            this.showNotification('Login successful! Redirecting...', 'success');
            
            // Redirect to previous page or home
            setTimeout(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect') || '../index.html';
                window.location.href = redirect;
            }, 1000);

        } catch (error) {
            this.showNotification(error, 'error');
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

    // Uganda phone validation
    validateUgandaPhone(phone) {
        if (!phone) return false;
        const cleaned = phone.replace(/\s|-/g, '');
        return /^(?:\+256|0|256)7\d{8}$/.test(cleaned);
    }

    // Notification system
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.auth-notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `auth-notification auth-notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? 'var(--space-red)' : type === 'success' ? 'var(--space-green)' : 'var(--space-electric)'};
            color: white;
            padding: 12px 20px;
            border-radius: var(--radius-md);
            z-index: 10000;
            box-shadow: var(--shadow-lg);
            animation: slideIn 0.3s ease;
            font-weight: 600;
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

// Initialize auth system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.authSystem = new AuthSystem();
});

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
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
document.head.appendChild(notificationStyles);


// WhatsApp OTP Verification
class WhatsAppAuth {
    constructor() {
        this.otpStorage = {};
    }

    // Send OTP via WhatsApp
    sendOTP(phoneNumber) {
        return new Promise((resolve) => {
            const otp = Math.floor(100000 + Math.random() * 900000);
            const expiration = Date.now() + 10 * 60 * 1000; // 10 minutes
            
            this.otpStorage[phoneNumber] = {
                code: otp,
                expires: expiration,
                verified: false
            };

            // Create WhatsApp message
            const message = `🔐 Your VDELIVER verification code: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            
            // Open WhatsApp (user sends the message)
            window.open(whatsappUrl, '_blank');
            
            resolve({ success: true, otp: otp });
        });
    }

    // Verify OTP
    verifyOTP(phoneNumber, enteredOtp) {
        const record = this.otpStorage[phoneNumber];
        
        if (!record) {
            return { success: false, message: 'No OTP sent to this number' };
        }
        
        if (Date.now() > record.expires) {
            delete this.otpStorage[phoneNumber];
            return { success: false, message: 'OTP has expired' };
        }
        
        if (record.code.toString() === enteredOtp.toString()) {
            record.verified = true;
            return { success: true, message: 'Phone number verified' };
        }
        
        return { success: false, message: 'Invalid OTP' };
    }
}

// Initialize WhatsApp auth
window.whatsappAuth = new WhatsAppAuth();
