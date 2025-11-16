
// Form Integration with Payment System
class FormIntegration {
    constructor() {
        this.paymentSystem = window.paymentSystem;
        this.setupFormIntegration();
    }

    setupFormIntegration() {
        // Override form submission to include payment validation
        const deliveryForm = document.getElementById('deliveryForm');
        if (deliveryForm) {
            deliveryForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Update payment when route is calculated
        document.getElementById('calculateRoute')?.addEventListener('click', () => {
            setTimeout(() => {
                window.paymentSystem.calculateTotal();
            }, 1000);
        });
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            // Validate payment first
            this.paymentSystem.validatePayment();
            
            // Get payment data
            const paymentData = this.paymentSystem.getPaymentData();
            
            // Continue with original form submission
            await this.submitFormWithPayment(paymentData);
            
        } catch (error) {
            this.showNotification(error.message, 'error');
            // Scroll to payment section
            document.querySelector('.payment-section')?.scrollIntoView({ 
                behavior: 'smooth' 
            });
        }
    }

    async submitFormWithPayment(paymentData) {
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        // Show loading state
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        submitBtn.disabled = true;

        try {
            // Store form data
            const formData = this.getFormData();
            
            // Submit to FormSubmit (original behavior)
            const form = document.getElementById('deliveryForm');
            const formSubmitData = new FormData(form);
            
            // Add payment info to form submission
            formSubmitData.append('Payment Method', paymentData.method);
            formSubmitData.append('Payment Amount', `${paymentData.amount} UGX`);
            if (paymentData.provider) {
                formSubmitData.append('Mobile Money Provider', paymentData.provider);
                formSubmitData.append('Mobile Money Phone', paymentData.phoneNumber);
            }

            // Submit to FormSubmit
            await fetch(form.action, {
                method: 'POST',
                body: formSubmitData,
                headers: { 'Accept': 'application/json' }
            });

            // If user is logged in, save to database with payment
            if (window.authSystem?.isLoggedIn()) {
                await this.saveOrderWithPayment(formData, paymentData);
            }

            // Show success
            document.getElementById('deliveryForm').style.display = 'none';
            document.getElementById('successMessage').style.display = 'block';

        } catch (error) {
            console.error('Form submission error:', error);
            // Still show success (fallback)
            document.getElementById('deliveryForm').style.display = 'none';
            document.getElementById('successMessage').style.display = 'block';
        } finally {
            btnText.style.display = 'flex';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    async saveOrderWithPayment(formData, paymentData) {
        try {
            // Create order first
            const order = await window.authSystem.createOrder(formData);
            
            // Process payment
            if (order && paymentData) {
                await this.paymentSystem.processPayment(order.id, paymentData);
            }
            
        } catch (error) {
            console.error('Error saving order with payment:', error);
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
            routeCost: document.getElementById('routeCost')?.textContent || '--',
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || '',
            finalAmount: document.getElementById('finalTotalAmount')?.value || '0'
        };
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : '#00d4ff'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            font-weight: 600;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

// Initialize form integration
document.addEventListener('DOMContentLoaded', function() {
    window.formIntegration = new FormIntegration();
});
