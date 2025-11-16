
// Fixed Admin Authentication System
class AdminAuthFixed {
    constructor() {
        this.adminUsers = [
            {
                email: 'admin@vdeliver.com',
                password: 'admin123',
                name: 'System Administrator',
                role: 'administrator'
            },
            {
                email: 'manager@vdeliver.com', 
                password: 'manager123',
                name: 'Operations Manager',
                role: 'manager'
            }
        ];
        this.currentAdmin = null;
        this.init();
    }

    init() {
        this.checkExistingSession();
        this.setupEventListeners();
    }

    checkExistingSession() {
        try {
            const adminData = localStorage.getItem('vdeliver_admin');
            if (adminData) {
                this.currentAdmin = JSON.parse(adminData);
                console.log('Admin session found:', this.currentAdmin.email);
                
                // If we're on login page and already logged in, redirect to dashboard
                if (window.location.pathname.includes('login.html') && this.isAuthenticated()) {
                    console.log('Already logged in, redirecting to dashboard...');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                }
            } else {
                console.log('No admin session found');
                
                // If we're on dashboard but not logged in, redirect to login
                if (window.location.pathname.includes('dashboard.html') && !this.isAuthenticated()) {
                    console.log('Not logged in, redirecting to login...');
                    window.location.href = 'login.html';
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
            localStorage.removeItem('vdeliver_admin');
        }
    }

    setupEventListeners() {
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleAdminLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async handleAdminLogin(e) {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        try {
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying Access...';
            submitButton.disabled = true;

            const formData = new FormData(form);
            const email = formData.get('email');
            const password = formData.get('password');

            const validAdmin = this.adminUsers.find(admin => 
                admin.email === email && admin.password === password
            );

            if (validAdmin) {
                this.currentAdmin = {
                    id: 'admin-' + Date.now(),
                    email: validAdmin.email,
                    name: validAdmin.name,
                    role: validAdmin.role,
                    loginTime: new Date().toISOString()
                };

                localStorage.setItem('vdeliver_admin', JSON.stringify(this.currentAdmin));
                
                // Show success message
                this.showNotification('Access granted! Redirecting...', 'success');
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);

            } else {
                throw new Error('Invalid admin credentials');
            }

        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            console.log('Authentication required, redirecting to login...');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    isAuthenticated() {
        return this.currentAdmin !== null;
    }

    logout() {
        this.currentAdmin = null;
        localStorage.removeItem('vdeliver_admin');
        this.showNotification('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.admin-notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `admin-notification admin-notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#00d4ff'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            font-weight: 600;
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    getCurrentAdmin() {
        return this.currentAdmin;
    }
}

// Initialize fixed admin auth
document.addEventListener('DOMContentLoaded', function() {
    window.adminAuth = new AdminAuthFixed();
});
