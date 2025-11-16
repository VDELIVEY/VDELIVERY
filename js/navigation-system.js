
// VDELIVER Enhanced Navigation System
class NavigationSystem {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.userType = this.detectUserType();
        this.init();
    }

    init() {
        this.enhanceNavbar();
        this.addMobileNavigation();
        this.addBreadcrumbs();
        this.setupQuickActions();
        this.highlightActiveNav();
        console.log('Navigation system initialized');
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('admin')) return 'admin';
        if (path.includes('driver-app')) return 'driver';
        if (path.includes('track')) return 'tracking';
        if (path.includes('contact')) return 'contact';
        return 'home';
    }

    detectUserType() {
        if (window.location.pathname.includes('admin')) return 'admin';
        if (window.location.pathname.includes('driver-app')) return 'driver';
        if (window.authSystem && window.authSystem.isLoggedIn()) return 'logged_in';
        return 'guest';
    }

    enhanceNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        // Add enhanced navigation structure
        navbar.innerHTML = `
            <div class="nav-brand">
                <div class="logo-icon">
                    <img src="logo.jpeg" alt="VDELIVER Logo" class="logo-image">
                </div>
                <span class="brand-text">VDELIVER</span>
            </div>
            
            <div class="nav-center">
                <div class="nav-links" id="mainNavLinks">
                    ${this.generateMainNavLinks()}
                </div>
            </div>

            <div class="nav-right">
                ${this.generateUserSection()}
                <button class="mobile-menu-toggle" id="mobileMenuToggle">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        `;

        this.setupNavInteractions();
    }

    generateMainNavLinks() {
        const links = {
            'home.html': { icon: '🏠', text: 'Home', show: ['guest', 'logged_in'] },
            'index.html': { icon: '🚀', text: 'Request Delivery', show: ['guest', 'logged_in'] },
            'track.html': { icon: '📍', text: 'Track Order', show: ['guest', 'logged_in'] },
            'contact.html': { icon: '📞', text: 'Contact', show: ['guest', 'logged_in'] }
        };

        let html = '';
        Object.entries(links).forEach(([url, config]) => {
            if (config.show.includes(this.userType)) {
                const isActive = this.isLinkActive(url);
                html += `
                    <a href="${url}" class="nav-link ${isActive ? 'active' : ''}">
                        <span class="nav-icon">${config.icon}</span>
                        <span class="nav-text">${config.text}</span>
                    </a>
                `;
            }
        });

        return html;
    }

    generateUserSection() {
        if (this.userType === 'admin') {
            return `
                <div class="user-section">
                    <div class="user-info">
                        <span class="user-name">Administrator</span>
                        <span class="user-role">Admin</span>
                    </div>
                    <a href="admin/dashboard.html" class="nav-link admin-link">
                        <i class="fas fa-tachometer-alt"></i>
                        Dashboard
                    </a>
                </div>
            `;
        }

        if (window.authSystem && window.authSystem.isLoggedIn()) {
            const user = window.authSystem.currentUser;
            return `
                <div class="user-section">
                    <div class="user-info">
                        <span class="user-name">${user.full_name.split(' ')[0]}</span>
                        <span class="user-role">Customer</span>
                    </div>
                    <div class="user-actions">
                        <a href="auth/profile.html" class="nav-link">
                            <i class="fas fa-user"></i>
                            Profile
                        </a>
                        <button class="nav-link logout-btn" onclick="window.authSystem.logout()">
                            <i class="fas fa-sign-out-alt"></i>
                            Logout
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="auth-section">
                <a href="auth/login.html" class="nav-link">
                    <i class="fas fa-sign-in-alt"></i>
                    Login
                </a>
                <a href="auth/register.html" class="cta-button secondary small">
                    <i class="fas fa-user-plus"></i>
                    Sign Up
                </a>
            </div>
        `;
    }

    isLinkActive(url) {
        const currentPath = window.location.pathname;
        return currentPath.includes(url.replace('.html', ''));
    }

    setupNavInteractions() {
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // Add hover effects
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.style.transform = 'translateY(-2px)';
            });
            link.addEventListener('mouseleave', () => {
                link.style.transform = 'translateY(0)';
            });
        });
    }

    addMobileNavigation() {
        // Create mobile menu overlay
        const mobileMenu = document.createElement('div');
        mobileMenu.id = 'mobileMenu';
        mobileMenu.className = 'mobile-menu';
        mobileMenu.innerHTML = `
            <div class="mobile-menu-header">
                <div class="nav-brand">
                    <img src="logo.jpeg" alt="VDELIVER" class="logo-image">
                    <span class="brand-text">VDELIVER</span>
                </div>
                <button class="close-mobile-menu">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mobile-menu-content">
                ${this.generateMobileNavLinks()}
            </div>
        `;

        document.body.appendChild(mobileMenu);

        // Setup mobile menu interactions
        const closeBtn = mobileMenu.querySelector('.close-mobile-menu');
        closeBtn.addEventListener('click', () => {
            this.closeMobileMenu();
        });

        // Close when clicking outside
        mobileMenu.addEventListener('click', (e) => {
            if (e.target === mobileMenu) {
                this.closeMobileMenu();
            }
        });
    }

    generateMobileNavLinks() {
        const links = {
            'home.html': { icon: '🏠', text: 'Home' },
            'index.html': { icon: '🚀', text: 'Request Delivery' },
            'track.html': { icon: '📍', text: 'Track Order' },
            'contact.html': { icon: '📞', text: 'Contact' },
            'auth/login.html': { icon: '🔐', text: 'Login' },
            'auth/register.html': { icon: '👤', text: 'Sign Up' }
        };

        let html = '';
        Object.entries(links).forEach(([url, config]) => {
            const isActive = this.isLinkActive(url);
            html += `
                <a href="${url}" class="mobile-nav-link ${isActive ? 'active' : ''}">
                    <span class="mobile-nav-icon">${config.icon}</span>
                    <span class="mobile-nav-text">${config.text}</span>
                    ${isActive ? '<i class="fas fa-chevron-right"></i>' : ''}
                </a>
            `;
        });

        return html;
    }

    toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    }

    closeMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
    }

    addBreadcrumbs() {
        if (this.userType === 'admin') return; // Don't add to admin pages

        const breadcrumbs = this.generateBreadcrumbs();
        const mainContent = document.querySelector('.main-content, .form-container, .tracking-container');
        
        if (mainContent && breadcrumbs) {
            mainContent.insertAdjacentHTML('afterbegin', breadcrumbs);
        }
    }

    generateBreadcrumbs() {
        const path = window.location.pathname;
        const crumbs = [
            { name: 'Home', url: 'home.html' }
        ];

        if (path.includes('index.html')) {
            crumbs.push({ name: 'Request Delivery', url: 'index.html' });
        } else if (path.includes('track.html')) {
            crumbs.push({ name: 'Track Order', url: 'track.html' });
        } else if (path.includes('contact.html')) {
            crumbs.push({ name: 'Contact', url: 'contact.html' });
        } else if (path.includes('auth/profile.html')) {
            crumbs.push({ name: 'Profile', url: 'auth/profile.html' });
        }

        if (crumbs.length <= 1) return null;

        return `
            <nav class="breadcrumbs">
                ${crumbs.map((crumb, index) => `
                    <a href="${crumb.url}" class="breadcrumb-item ${index === crumbs.length - 1 ? 'active' : ''}">
                        ${crumb.name}
                        ${index < crumbs.length - 1 ? '<i class="fas fa-chevron-right"></i>' : ''}
                    </a>
                `).join('')}
            </nav>
        `;
    }

    setupQuickActions() {
        // Add quick action buttons to relevant pages
        if (this.currentPage === 'home') {
            this.addHomeQuickActions();
        } else if (this.currentPage === 'tracking') {
            this.addTrackingQuickActions();
        }
    }

    addHomeQuickActions() {
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            const quickActions = `
                <div class="quick-actions">
                    <a href="index.html" class="quick-action primary">
                        <i class="fas fa-shipping-fast"></i>
                        <span>Quick Delivery</span>
                    </a>
                    <a href="track.html" class="quick-action secondary">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Track Order</span>
                    </a>
                    <a href="contact.html" class="quick-action tertiary">
                        <i class="fas fa-headset"></i>
                        <span>Get Help</span>
                    </a>
                </div>
            `;
            heroSection.insertAdjacentHTML('beforeend', quickActions);
        }
    }

    addTrackingQuickActions() {
        const trackingContainer = document.querySelector('.tracking-container');
        if (trackingContainer) {
            const quickActions = `
                <div class="tracking-quick-actions">
                    <button class="quick-action" onclick="window.history.back()">
                        <i class="fas fa-arrow-left"></i>
                        Back
                    </button>
                    <button class="quick-action" onclick="window.location.reload()">
                        <i class="fas fa-sync-alt"></i>
                        Refresh
                    </button>
                    <button class="quick-action" onclick="window.print()">
                        <i class="fas fa-print"></i>
                        Print
                    </button>
                </div>
            `;
            trackingContainer.insertAdjacentHTML('afterbegin', quickActions);
        }
    }

    highlightActiveNav() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && currentPath.includes(href.replace('.html', ''))) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Utility method to navigate with loading state
    navigateTo(url, showLoading = true) {
        if (showLoading) {
            this.showLoadingOverlay();
        }
        
        setTimeout(() => {
            window.location.href = url;
        }, 500);
    }

    showLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'navigation-loading';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading...</p>
            </div>
        `;
        overlay.style.cssText = `
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
            color: white;
            font-size: 1.2rem;
        `;
        
        document.body.appendChild(overlay);
        
        // Auto-remove after 3 seconds (safety)
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 3000);
    }
}

// Add enhanced navigation CSS
const navigationStyles = document.createElement('style');
navigationStyles.textContent = `
    /* Enhanced Navbar */
    .navbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background: var(--space-gray);
        border-bottom: 1px solid rgba(255,255,255,0.1);
        position: sticky;
        top: 0;
        z-index: 1000;
        backdrop-filter: blur(10px);
    }

    .nav-center {
        flex: 1;
        display: flex;
        justify-content: center;
    }

    .nav-right {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .nav-links {
        display: flex;
        gap: 2rem;
        align-items: center;
    }

    .nav-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: rgba(255,255,255,0.8);
        text-decoration: none;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        transition: all 0.3s ease;
        position: relative;
    }

    .nav-link:hover {
        color: var(--space-white);
        background: rgba(255,255,255,0.1);
        transform: translateY(-2px);
    }

    .nav-link.active {
        color: var(--space-electric);
        background: rgba(0,212,255,0.1);
    }

    .nav-link.active:after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 2px;
        background: var(--space-electric);
        border-radius: 2px;
    }

    .nav-icon {
        font-size: 1.1rem;
    }

    .nav-text {
        font-weight: 500;
    }

    /* User Section */
    .user-section {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .user-info {
        text-align: right;
    }

    .user-name {
        display: block;
        font-weight: 600;
        color: var(--space-white);
    }

    .user-role {
        display: block;
        font-size: 0.8rem;
        color: rgba(255,255,255,0.6);
    }

    .user-actions {
        display: flex;
        gap: 0.5rem;
    }

    .auth-section {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    /* Mobile Menu */
    .mobile-menu-toggle {
        display: none;
        background: none;
        border: none;
        color: var(--space-white);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
    }

    .mobile-menu {
        position: fixed;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: var(--space-dark);
        z-index: 2000;
        transition: left 0.3s ease;
        overflow-y: auto;
    }

    .mobile-menu.active {
        left: 0;
    }

    .mobile-menu-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .close-mobile-menu {
        background: none;
        border: none;
        color: var(--space-white);
        font-size: 1.5rem;
        cursor: pointer;
    }

    .mobile-menu-content {
        padding: 2rem;
    }

    .mobile-nav-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 0;
        color: rgba(255,255,255,0.8);
        text-decoration: none;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        transition: color 0.3s ease;
    }

    .mobile-nav-link:hover,
    .mobile-nav-link.active {
        color: var(--space-electric);
    }

    .mobile-nav-icon {
        margin-right: 1rem;
        font-size: 1.2rem;
    }

    /* Breadcrumbs */
    .breadcrumbs {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 2rem;
        padding: 1rem;
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        font-size: 0.9rem;
    }

    .breadcrumb-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: rgba(255,255,255,0.7);
        text-decoration: none;
        transition: color 0.3s ease;
    }

    .breadcrumb-item:hover {
        color: var(--space-electric);
    }

    .breadcrumb-item.active {
        color: var(--space-white);
        font-weight: 600;
    }

    /* Quick Actions */
    .quick-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
        flex-wrap: wrap;
    }

    .quick-action {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.3s ease;
        border: 2px solid transparent;
    }

    .quick-action.primary {
        background: var(--space-electric);
        color: white;
    }

    .quick-action.secondary {
        background: rgba(255,255,255,0.1);
        color: white;
        border-color: rgba(255,255,255,0.2);
    }

    .quick-action.tertiary {
        background: transparent;
        color: var(--space-white);
        border-color: var(--space-purple);
    }

    .quick-action:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }

    .tracking-quick-actions {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .navbar {
            padding: 1rem;
        }

        .nav-center {
            display: none;
        }

        .nav-right .auth-section,
        .nav-right .user-section {
            display: none;
        }

        .mobile-menu-toggle {
            display: block;
        }

        .quick-actions {
            flex-direction: column;
            align-items: stretch;
        }

        .tracking-quick-actions {
            flex-direction: column;
        }

        .breadcrumbs {
            flex-wrap: wrap;
        }
    }

    @media (min-width: 769px) {
        .mobile-menu {
            display: none;
        }
    }
`;
document.head.appendChild(navigationStyles);

// Initialize navigation system
document.addEventListener('DOMContentLoaded', function() {
    window.navigationSystem = new NavigationSystem();
});
