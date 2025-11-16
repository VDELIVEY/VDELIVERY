
// VDELIVER Mobile Money Payment Gateway
class PaymentGateway {
    constructor() {
        this.supabase = window.supabaseConfig?.getClient();
        this.businessNumber = '+256757268074'; // YOUR BUSINESS NUMBER
        this.businessName = 'VDELIVER';
        
        this.providers = {
            mtn: {
                name: 'MTN Mobile Money',
                code: 'MTN',
                ussd: `*165*3*${this.businessNumber.replace('+', '')}*`,
                fees: { percentage: 0, min: 0 }
            },
            airtel: {
                name: 'Airtel Money', 
                code: 'AIRTEL',
                ussd: `*185*3*${this.businessNumber.replace('+', '')}*`,
                fees: { percentage: 0, min: 0 }
            },
            africell: {
                name: 'Africell Money',
                code: 'AFRICELL', 
                ussd: `*123*3*${this.businessNumber.replace('+', '')}*`,
                fees: { percentage: 0, min: 0 }
            }
        };
        this.init();
    }

    init() {
        this.setupPaymentListeners();
        console.log('Payment gateway initialized - Payments to:', this.businessNumber);
    }

    setupPaymentListeners() {
        // Listen for payment form submissions
        document.addEventListener('payment_form_submit', (e) => {
            this.processMobileMoneyPayment(e.detail);
        });
    }

    async processMobileMoneyPayment(paymentData) {
        try {
            console.log('Processing mobile money payment to:', this.businessNumber);
            
            // Validate payment data
            this.validatePaymentData(paymentData);
            
            // Create payment record
            const paymentRecord = await this.createPaymentRecord(paymentData);
            
            // Simulate payment processing (in production, integrate with actual API)
            const paymentResult = await this.simulatePaymentProcessing(paymentRecord);
            
            // Update payment status
            await this.updatePaymentStatus(paymentRecord.id, paymentResult.status, paymentResult);
            
            // Notify customer with clear instructions
            await this.notifyCustomer(paymentRecord, paymentResult);
            
            return paymentResult;
            
        } catch (error) {
            console.error('Payment processing error:', error);
            await this.handlePaymentError(paymentData, error);
            throw error;
        }
    }

    validatePaymentData(paymentData) {
        const { phone, provider, amount, orderId } = paymentData;
        
        if (!phone || !provider || !amount || !orderId) {
            throw new Error('Missing required payment information');
        }
        
        if (!this.validateUgandaPhone(phone)) {
            throw new Error('Invalid Uganda phone number format');
        }
        
        if (amount < 1000) { // Minimum payment amount
            throw new Error('Payment amount must be at least 1,000 UGX');
        }
        
        if (!this.providers[provider.toLowerCase()]) {
            throw new Error('Unsupported mobile money provider');
        }
    }

    validateUgandaPhone(phone) {
        const cleaned = phone.replace(/\s|-/g, '');
        return /^(?:\+256|0|256)7\d{8}$/.test(cleaned);
    }

    async createPaymentRecord(paymentData) {
        const provider = this.providers[paymentData.provider.toLowerCase()];
        const fees = this.calculateFees(paymentData.amount, provider);
        const totalAmount = paymentData.amount + fees;
        
        const paymentRecord = {
            order_id: paymentData.orderId,
            transaction_id: this.generateTransactionId(),
            amount: paymentData.amount,
            fees: fees,
            total_amount: totalAmount,
            method: 'mobile_money',
            provider: provider.code,
            phone_number: this.formatPhoneNumber(paymentData.phone),
            status: 'initiated',
            created_at: new Date().toISOString()
        };

        const { data, error } = await this.supabase
            .from('payments')
            .insert([paymentRecord])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async simulatePaymentProcessing(paymentRecord) {
        console.log('Simulating mobile money payment processing...');
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Simulate different payment outcomes
        const outcomes = ['pending', 'pending', 'pending']; // Mostly pending to show instructions
        const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        return {
            status: randomOutcome,
            external_transaction_id: 'MM_' + Date.now(),
            message: this.getPaymentMessage(randomOutcome),
            timestamp: new Date().toISOString()
        };
    }

    getPaymentMessage(status) {
        const messages = {
            'completed': 'Payment completed successfully',
            'failed': 'Payment failed - please try again',
            'pending': `Payment pending - please send money to ${this.businessNumber}`
        };
        return messages[status] || 'Payment processing';
    }

    async updatePaymentStatus(paymentId, status, result) {
        const updateData = {
            status: status,
            external_transaction_id: result.external_transaction_id,
            notes: result.message,
            updated_at: new Date().toISOString()
        };

        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
            
            // Also update order payment status
            await this.supabase
                .from('orders')
                .update({ payment_status: 'paid' })
                .eq('id', (await this.getPaymentOrderId(paymentId)));
        }

        const { error } = await this.supabase
            .from('payments')
            .update(updateData)
            .eq('id', paymentId);

        if (error) throw error;
    }

    async getPaymentOrderId(paymentId) {
        const { data, error } = await this.supabase
            .from('payments')
            .select('order_id')
            .eq('id', paymentId)
            .single();

        if (error) throw error;
        return data.order_id;
    }

    async notifyCustomer(paymentRecord, paymentResult) {
        const message = this.createPaymentNotification(paymentRecord, paymentResult);
        
        // Send WhatsApp notification
        await this.sendPaymentNotification(paymentRecord.phone_number, message);
        
        // Show payment instructions modal
        this.showPaymentInstructionsModal(paymentRecord);
        
        // Update order tracking page
        this.updateOrderPaymentStatus(paymentRecord.order_id, paymentResult.status);
    }

    createPaymentNotification(paymentRecord, paymentResult) {
        const provider = Object.values(this.providers).find(p => p.code === paymentRecord.provider);
        
        return `
💳 *VDELIVER PAYMENT REQUEST* 💰

🆔 Order Reference: ${paymentRecord.transaction_id}
📦 Service: ${this.businessName} Delivery
💳 Method: ${provider?.name || paymentRecord.provider}

💵 *AMOUNT TO PAY: ${paymentRecord.total_amount.toLocaleString()} UGX*

📱 *SEND PAYMENT TO THIS NUMBER:*
👉 *${this.businessNumber}* 👈

📍 *PAYMENT STEPS:*
1. Open your ${provider?.name} menu
2. Select "Send Money"
3. Enter: *${this.businessNumber}*
4. Amount: *${paymentRecord.total_amount.toLocaleString()} UGX*
5. Complete transaction

📸 *CONFIRM PAYMENT:*
• Take screenshot of transaction
• Send to WhatsApp: ${this.businessNumber}
• Include your order reference

⚡ We'll confirm within 2 minutes and dispatch your delivery!

Payment Status: ${paymentResult.status}

Thank you for choosing ${this.businessName}! 🚀
        `.trim();
    }

    // Show beautiful payment instructions modal
    showPaymentInstructionsModal(paymentRecord) {
        const provider = Object.values(this.providers).find(p => p.code === paymentRecord.provider);
        
        const modal = document.createElement('div');
        modal.className = 'payment-instructions-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, var(--space-dark) 0%, #1a1a2e 100%);
                border: 2px solid var(--space-electric);
                border-radius: 20px;
                padding: var(--space-xl);
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                box-shadow: 0 20px 60px rgba(0, 212, 255, 0.3);
            ">
                <div style="text-align: center; margin-bottom: var(--space-lg);">
                    <div style="font-size: 3rem; margin-bottom: var(--space-md);">💳</div>
                    <h2 style="color: var(--space-electric); margin-bottom: var(--space-sm);">
                        Complete Your Payment
                    </h2>
                    <p style="color: rgba(255, 255, 255, 0.8);">
                        Send payment to complete your delivery request
                    </p>
                </div>

                <!-- Payment Details -->
                <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: var(--space-md); margin-bottom: var(--space-lg);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-sm);">
                        <span style="color: rgba(255, 255, 255, 0.7);">Amount:</span>
                        <strong style="color: var(--space-white); font-size: 1.2rem;">${paymentRecord.total_amount.toLocaleString()} UGX</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-sm);">
                        <span style="color: rgba(255, 255, 255, 0.7);">Provider:</span>
                        <strong style="color: var(--space-white);">${provider?.name}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: rgba(255, 255, 255, 0.7);">Reference:</span>
                        <strong style="color: var(--space-electric);">${paymentRecord.transaction_id}</strong>
                    </div>
                </div>

                <!-- Business Number Highlight -->
                <div style="background: linear-gradient(135deg, var(--space-green) 0%, #28a745 100%); border-radius: 12px; padding: var(--space-md); text-align: center; margin-bottom: var(--space-lg);">
                    <div style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.9); margin-bottom: var(--space-xs);">SEND PAYMENT TO</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: white;">${this.businessNumber}</div>
                    <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.8); margin-top: var(--space-xs);">${this.businessName}</div>
                </div>

                <!-- Payment Steps -->
                <div style="background: rgba(0, 212, 255, 0.1); border: 1px solid var(--space-electric); border-radius: 12px; padding: var(--space-md); margin-bottom: var(--space-lg);">
                    <h4 style="color: var(--space-electric); margin-bottom: var(--space-sm); text-align: center;">
                        📍 Payment Steps
                    </h4>
                    <div style="color: rgba(255, 255, 255, 0.9); line-height: 1.6;">
                        <div style="display: flex; align-items: flex-start; margin-bottom: var(--space-sm);">
                            <span style="background: var(--space-electric); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; margin-right: var(--space-sm); flex-shrink: 0;">1</span>
                            <span>Open your <strong>${provider?.name}</strong> menu</span>
                        </div>
                        <div style="display: flex; align-items: flex-start; margin-bottom: var(--space-sm);">
                            <span style="background: var(--space-electric); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; margin-right: var(--space-sm); flex-shrink: 0;">2</span>
                            <span>Select <strong>"Send Money"</strong></span>
                        </div>
                        <div style="display: flex; align-items: flex-start; margin-bottom: var(--space-sm);">
                            <span style="background: var(--space-electric); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; margin-right: var(--space-sm); flex-shrink: 0;">3</span>
                            <span>Enter: <strong>${this.businessNumber}</strong></span>
                        </div>
                        <div style="display: flex; align-items: flex-start; margin-bottom: var(--space-sm);">
                            <span style="background: var(--space-electric); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; margin-right: var(--space-sm); flex-shrink: 0;">4</span>
                            <span>Amount: <strong>${paymentRecord.total_amount.toLocaleString()} UGX</strong></span>
                        </div>
                        <div style="display: flex; align-items: flex-start;">
                            <span style="background: var(--space-electric); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; margin-right: var(--space-sm); flex-shrink: 0;">5</span>
                            <span>Complete the transaction</span>
                        </div>
                    </div>
                </div>

                <!-- Confirmation Instructions -->
                <div style="background: rgba(40, 167, 69, 0.1); border: 1px solid var(--space-green); border-radius: 12px; padding: var(--space-md); margin-bottom: var(--space-lg);">
                    <h4 style="color: var(--space-green); margin-bottom: var(--space-sm); text-align: center;">
                        📸 Confirm Payment
                    </h4>
                    <p style="color: rgba(255, 255, 255, 0.9); text-align: center; margin: 0;">
                        Take screenshot of transaction and send to:<br>
                        <strong>WhatsApp: ${this.businessNumber}</strong><br>
                        Include your reference: <strong>${paymentRecord.transaction_id}</strong>
                    </p>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: var(--space-sm); justify-content: center;">
                    <button class="action-btn secondary" onclick="this.closest('.payment-instructions-modal').remove()" style="padding: var(--space-sm) var(--space-md);">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="action-btn primary" onclick="window.open('https://wa.me/${this.businessNumber.replace('+', '')}?text=Payment%20Confirmation%20for%20${paymentRecord.transaction_id}', '_blank')" style="padding: var(--space-sm) var(--space-md);">
                        <i class="fab fa-whatsapp"></i> Confirm on WhatsApp
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async sendPaymentNotification(phoneNumber, message) {
        const cleanNumber = this.formatPhoneNumber(phoneNumber);
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        
        console.log('Payment notification URL:', whatsappUrl);
        
        // In production, use WhatsApp Business API
        // For now, log the URL
        return true;
    }

    updateOrderPaymentStatus(orderId, status) {
        // Trigger real-time update for tracking page
        if (window.realtimeSystem) {
            window.realtimeSystem.showNotification(
                `Payment ${status} for order`, 
                status === 'completed' ? 'success' : 'info'
            );
        }
    }

    async handlePaymentError(paymentData, error) {
        // Update payment status to failed
        if (paymentData.paymentId) {
            await this.supabase
                .from('payments')
                .update({ 
                    status: 'failed',
                    notes: error.message,
                    updated_at: new Date().toISOString()
                })
                .eq('id', paymentData.paymentId);
        }
        
        // Notify customer about payment failure
        const errorMessage = `
❌ *Payment Failed*

We couldn't process your mobile money payment.

Error: ${error.message}

Please try again or contact support at ${this.businessNumber}.
        `.trim();
        
        await this.sendPaymentNotification(paymentData.phone, errorMessage);
    }

    // Utility Methods
    calculateFees(amount, provider) {
        const { percentage, min } = provider.fees;
        const fee = Math.max((amount * percentage) / 100, min);
        return Math.ceil(fee);
    }

    generateTransactionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 6);
        return `VD${timestamp}${random}`.toUpperCase();
    }

    formatPhoneNumber(phone) {
        let clean = phone.replace(/\s+/g, '').replace('-', '');
        
        if (clean.startsWith('0')) {
            clean = '+256' + clean.substring(1);
        } else if (clean.startsWith('256')) {
            clean = '+' + clean;
        } else if (!clean.startsWith('+')) {
            clean = '+256' + clean;
        }
        
        return clean;
    }

    // USSD Code Generation (for manual payments)
    generateUSSDCode(amount, phone) {
        const cleanPhone = phone.replace(/\D/g, '').substr(-9);
        return `*165*1*${cleanPhone}*${amount}#`;
    }

    // Payment Status Checking
    async checkPaymentStatus(transactionId) {
        const { data, error } = await this.supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', transactionId)
            .single();

        if (error) throw error;
        return data;
    }

    // Admin Payment Management
    async getPendingPayments() {
        const { data, error } = await this.supabase
            .from('payments')
            .select(`
                *,
                orders (
                    tracking_number,
                    sender_name,
                    sender_phone
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getCompletedPayments(dateRange = 'today') {
        let query = this.supabase
            .from('payments')
            .select(`
                *,
                orders (
                    tracking_number,
                    sender_name
                )
            `)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false });

        // Filter by date range
        if (dateRange === 'today') {
            const today = new Date().toISOString().split('T')[0];
            query = query.gte('completed_at', today + 'T00:00:00Z');
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    // Manual Payment Confirmation (for cash payments)
    async confirmCashPayment(orderId, amount, collectedBy) {
        const paymentRecord = {
            order_id: orderId,
            transaction_id: this.generateTransactionId(),
            amount: amount,
            fees: 0,
            total_amount: amount,
            method: 'cash',
            status: 'completed',
            collected_by: collectedBy,
            collected_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        const { data, error } = await this.supabase
            .from('payments')
            .insert([paymentRecord])
            .select()
            .single();

        if (error) throw error;

        // Update order payment status
        await this.supabase
            .from('orders')
            .update({ payment_status: 'paid' })
            .eq('id', orderId);

        return data;
    }
}

// Initialize payment gateway
document.addEventListener('DOMContentLoaded', function() {
    window.paymentGateway = new PaymentGateway();
});