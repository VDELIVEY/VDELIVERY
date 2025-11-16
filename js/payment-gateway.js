
// VDELIVER Mobile Money Payment Gateway
class PaymentGateway {
    constructor() {
        this.supabase = window.supabaseConfig?.getClient();
        this.providers = {
            mtn: {
                name: 'MTN Mobile Money',
                code: 'MTN',
                ussd: '*165*',
                fees: { percentage: 1.5, min: 500 }
            },
            airtel: {
                name: 'Airtel Money', 
                code: 'AIRTEL',
                ussd: '*185*',
                fees: { percentage: 1.5, min: 500 }
            },
            africell: {
                name: 'Africell Money',
                code: 'AFRICELL', 
                ussd: '*123*',
                fees: { percentage: 1.5, min: 500 }
            }
        };
        this.init();
    }

    init() {
        this.setupPaymentListeners();
        console.log('Payment gateway initialized');
    }

    setupPaymentListeners() {
        // Listen for payment form submissions
        document.addEventListener('payment_form_submit', (e) => {
            this.processMobileMoneyPayment(e.detail);
        });
    }

    async processMobileMoneyPayment(paymentData) {
        try {
            console.log('Processing mobile money payment:', paymentData);
            
            // Validate payment data
            this.validatePaymentData(paymentData);
            
            // Create payment record
            const paymentRecord = await this.createPaymentRecord(paymentData);
            
            // Simulate payment processing (in production, integrate with actual API)
            const paymentResult = await this.simulatePaymentProcessing(paymentRecord);
            
            // Update payment status
            await this.updatePaymentStatus(paymentRecord.id, paymentResult.status, paymentResult);
            
            // Notify customer
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
        const outcomes = ['completed', 'failed', 'pending'];
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
            'pending': 'Payment pending - waiting for confirmation'
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
        
        // Update order tracking page
        this.updateOrderPaymentStatus(paymentRecord.order_id, paymentResult.status);
    }

    createPaymentNotification(paymentRecord, paymentResult) {
        const provider = Object.values(this.providers).find(p => p.code === paymentRecord.provider);
        
        return `
💳 *VDELIVER Payment ${paymentResult.status.toUpperCase()}*

Amount: ${paymentRecord.total_amount.toLocaleString()} UGX
Fees: ${paymentRecord.fees.toLocaleString()} UGX
Method: ${provider?.name || paymentRecord.provider}
Transaction: ${paymentRecord.transaction_id}
Status: ${paymentResult.status}

${paymentResult.message}

Thank you for your payment!
        `.trim();
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

Please try again or contact support.
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

// Payment integration with existing form
class PaymentFormIntegration {
    constructor() {
        this.paymentGateway = new PaymentGateway();
        this.setupPaymentForm();
    }

    setupPaymentForm() {
        // Override form submission to handle payments
        const deliveryForm = document.getElementById('deliveryForm');
        if (deliveryForm) {
            deliveryForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            // Get payment data from form
            const paymentData = this.getPaymentDataFromForm();
            
            if (paymentData.method === 'mobile_money') {
                // Process mobile money payment
                await this.processFormPayment(paymentData);
            } else {
                // Cash payment - just submit form
                await this.submitFormWithCashPayment(paymentData);
            }
            
        } catch (error) {
            this.showPaymentError(error.message);
        }
    }

    getPaymentDataFromForm() {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
        const amount = document.getElementById('finalTotalAmount');
        
        if (!paymentMethod || !amount) {
            throw new Error('Payment information missing');
        }

        const data = {
            method: paymentMethod.value,
            amount: parseInt(amount.value) || 0
        };

        if (data.method === 'mobile_money') {
            data.provider = document.getElementById('mobileMoneyProvider').value;
            data.phone = document.getElementById('mobileMoneyPhone').value;
        }

        return data;
    }

    async processFormPayment(paymentData) {
        // Show payment processing UI
        this.showPaymentProcessing();
        
        try {
            // Process payment
            const result = await this.paymentGateway.processMobileMoneyPayment({
                ...paymentData,
                orderId: this.generateTempOrderId() // In real app, use actual order ID
            });
            
            if (result.status === 'completed') {
                this.showPaymentSuccess();
                await this.submitFormAfterPayment();
            } else {
                throw new Error(result.message || 'Payment processing failed');
            }
            
        } catch (error) {
            this.showPaymentError(error.message);
            throw error;
        }
    }

    showPaymentProcessing() {
        // Show processing spinner/message
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Payment...';
            submitBtn.disabled = true;
        }
    }

    showPaymentSuccess() {
        this.showNotification('Payment completed successfully!', 'success');
    }

    showPaymentError(message) {
        this.showNotification('Payment failed: ' + message, 'error');
    }

    async submitFormAfterPayment() {
        // Submit the main form after successful payment
        const form = document.getElementById('deliveryForm');
        if (form) {
            form.submit();
        }
    }

    async submitFormWithCashPayment(paymentData) {
        // For cash payments, just submit the form
        const form = document.getElementById('deliveryForm');
        if (form) {
            form.submit();
        }
    }

    generateTempOrderId() {
        return 'temp-' + Date.now();
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `payment-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
}

// Initialize payment gateway
document.addEventListener('DOMContentLoaded', function() {
    window.paymentGateway = new PaymentGateway();
    window.paymentFormIntegration = new PaymentFormIntegration();
});
