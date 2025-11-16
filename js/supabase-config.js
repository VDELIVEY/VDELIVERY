
// Supabase Configuration for VDELIVER
// REPLACE THESE VALUES WITH YOUR ACTUAL SUPABASE CREDENTIALS

const SUPABASE_URL = 'https://hfkcfzzezzemjtvuwolp.supabase.co';  // ← Replace with your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhma2NmenplenplbWp0dnV3b2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDEwMDYsImV4cCI6MjA3ODc3NzAwNn0.wdpJhFWtn4zC6g8sVLNnBAA-0KUDrpHCva64kg6IsmE';  // ← Replace with your anon public key



// Load Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class SupabaseConfig {
    constructor() {
        this.supabase = supabaseClient;
        console.log('Supabase initialized successfully');
    }

    getClient() {
        return this.supabase;
    }

    generateTrackingNumber() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return 'VD' + timestamp + random;
    }

    validateUgandaPhone(phone) {
        if (!phone) return false;
        const cleaned = phone.replace(/\s|-/g, '');
        return /^(?:\+256|0|256)7\d{8}$/.test(cleaned);
    }

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
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#00d4ff'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            font-weight: 600;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    // Format currency for Uganda
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX'
        }).format(amount);
    }

    // Get order status color
    getStatusColor(status) {
        const colors = {
            'pending': '#007bff',
            'accepted': '#28a745', 
            'picked_up': '#17a2b8',
            'on_the_way': '#6f42c1',
            'delivered': '#20c997',
            'cancelled': '#dc3545'
        };
        return colors[status] || '#6c757d';
    }

    // Get status label
    getStatusLabel(status) {
        const labels = {
            'pending': 'Pending',
            'accepted': 'Accepted',
            'picked_up': 'Picked Up',
            'on_the_way': 'On the Way',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled'
        };
        return labels[status] || 'Unknown';
    }
}

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

// Initialize Supabase configuration
window.supabaseConfig = new SupabaseConfig();
