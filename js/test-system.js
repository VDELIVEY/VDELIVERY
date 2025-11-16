// VDELIVER Test System - Test Payments & Notifications
class TestSystem {
    constructor() {
        this.paymentSystem = window.paymentSystem;
        this.notificationSystem = window.notificationSystem;
        this.init();
    }

    init() {
        this.injectTestPanel();
        this.setupTestListeners();
        console.log('Test system ready - Press Ctrl+Shift+T to open test panel');
    }

    injectTestPanel() {
        const testPanel = document.createElement('div');
        testPanel.id = 'vdTestPanel';
        testPanel.style.cssText = `
            position: fixed;
            top: 50%;
            right: -300px;
            transform: translateY(-50%);
            width: 300px;
            background: var(--space-dark);
            border: 2px solid var(--space-electric);
            border-radius: 10px 0 0 10px;
            padding: 20px;
            z-index: 10000;
            transition: right 0.3s ease;
            box-shadow: -5px 0 15px rgba(0,0,0,0.5);
            color: white;
            font-family: 'Inter', sans-serif;
        `;

        testPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: var(--space-electric);">🧪 VDELIVER TESTS</h3>
                <button id="closeTestPanel" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <button id="testPaymentUI" style="width: 100%; padding: 10px; margin-bottom: 8px; background: var(--space-blue); color: white; border: none; border-radius: 5px; cursor: pointer;">
                    💰 Test Payment UI
                </button>
                <button id="testNotification" style="width: 100%; padding: 10px; margin-bottom: 8px; background: var(--space-green); color: white; border: none; border-radius: 5px; cursor: pointer;">
                    📱 Test Notification
                </button>
                <button id="testFullFlow" style="width: 100%; padding: 10px; background: var(--space-purple); color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🚀 Test Full Flow
                </button>
            </div>

            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; font-size: 12px;">
                <strong>Test Phone:</strong> +256712345678<br>
                <strong>Test Amount:</strong> 15,000 UGX
            </div>

            <div id="testResults" style="margin-top: 15px; max-height: 200px; overflow-y: auto; font-size: 12px;"></div>
        `;

        document.body.appendChild(testPanel);

        // Keyboard shortcut to open panel
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                this.toggleTestPanel();
            }
        });
    }

    toggleTestPanel() {
        const panel = document.getElementById('vdTestPanel');
        if (panel.style.right === '0px') {
            panel.style.right = '-300px';
        } else {
            panel.style.right = '0px';
        }
    }

    setupTestListeners() {
        document.getElementById('closeTestPanel').addEventListener('click', () => {
            this.toggleTestPanel();
        });

        document.getElementById('testPaymentUI').addEventListener('click', () => {
            this.testPaymentInterface();
        });

        document.getElementById('testNotification').addEventListener('click', () => {
            this.testNotificationSystem();
        });

        document.getElementById('testFullFlow').addEventListener('click', () => {
            this.testFullOrderFlow();
        });
    }

    testPaymentInterface() {
        this.logTest('💰 Testing Payment Interface...');
        
        // Simulate route calculation
        const routeCost = document.getElementById('routeCost');
        if (routeCost) {
            routeCost.textContent = '15,000 UGX';
            this.logTest('✅ Route cost set: 15,000 UGX');
        }

        // Trigger payment calculation
        if (this.paymentSystem) {
            this.paymentSystem.calculateTotal();
            this.logTest('✅ Payment calculation triggered');
            
            // Show payment section
            const paymentSection = document.querySelector('.payment-section');
            if (paymentSection) {
                paymentSection.scrollIntoView({ behavior: 'smooth' });
                this.logTest('✅ Scrolled to payment section');
            }
        } else {
            this.logTest('❌ Payment system not loaded');
        }
    }

    async testNotificationSystem() {
        this.logTest('📱 Testing Notification System...');

        if (!this.notificationSystem) {
            this.logTest('❌ Notification system not loaded');
            return;
        }

        try {
            // Test WhatsApp notification
            await this.notificationSystem.sendWhatsApp(
                '+256712345678', 
                this.notificationSystem.templates.order_created.whatsapp,
                {
                    tracking_number: 'VDTEST123',
                    pickup_address: 'Test Location, Kampala',
                    delivery_address: 'Test Delivery, Kampala', 
                    vehicle_type: 'Motorcycle 🏍️',
                    estimated_cost: '15,000 UGX'
                }
            );
            
            this.logTest('✅ WhatsApp notification sent (check console)');

            // Test SMS notification
            await this.notificationSystem.sendSMS(
                '+256712345678',
                this.notificationSystem.templates.order_created.sms,
                {
                    tracking_number: 'VDTEST123',
                    pickup_address: 'Test Location'
                }
            );

            this.logTest('✅ SMS notification sent (check console)');

        } catch (error) {
            this.logTest(`❌ Notification test failed: ${error.message}`);
        }
    }

    async testFullOrderFlow() {
        this.logTest('🚀 Testing Full Order Flow...');

        // Step 1: Test Payment UI
        this.testPaymentInterface();
        
        // Step 2: Test Notifications
        await this.testNotificationSystem();

        // Step 3: Test Database (if available)
        await this.testDatabaseConnection();

        this.logTest('🎉 Full flow test completed!');
    }

    async testDatabaseConnection() {
        this.logTest('🗄️ Testing Database Connection...');

        try {
            const { data, error } = await window.supabaseConfig?.getClient()
                .from('orders')
                .select('count')
                .limit(1);

            if (error) throw error;
            
            this.logTest('✅ Database connection successful');

        } catch (error) {
            this.logTest(`❌ Database connection failed: ${error.message}`);
        }
    }

    logTest(message) {
        const results = document.getElementById('testResults');
        if (results) {
            const logEntry = document.createElement('div');
            logEntry.style.padding = '5px';
            logEntry.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            
            results.appendChild(logEntry);
            results.scrollTop = results.scrollHeight;
        }
        
        console.log(`🧪 TEST: ${message}`);
    }
}

// Quick test function you can run in browser console
window.testVDeliver = {
    payment: function() {
        if (window.paymentSystem) {
            window.paymentSystem.calculateTotal();
            console.log('💰 Payment test triggered');
        } else {
            console.log('❌ Payment system not loaded');
        }
    },
    
    notification: function() {
        if (window.notificationSystem) {
            window.notificationSystem.testNotification('test-order', 'order_created');
            console.log('📱 Notification test triggered');
        } else {
            console.log('❌ Notification system not loaded');
        }
    },
    
    openPanel: function() {
        const panel = document.getElementById('vdTestPanel');
        if (panel) panel.style.right = '0px';
    }
};

// Initialize test system
document.addEventListener('DOMContentLoaded', function() {
    window.testSystem = new TestSystem();
});