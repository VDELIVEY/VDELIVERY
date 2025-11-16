
// VDELIVER Notification System - WhatsApp, SMS, Email
class NotificationSystem {
    constructor() {
        this.supabase = window.supabaseConfig?.getClient();
        this.templates = this.getNotificationTemplates();
        this.init();
    }

    init() {
        this.setupNotificationListeners();
        console.log('Notification system initialized');
    }

    getNotificationTemplates() {
        return {
            // ORDER STATUS UPDATES
            order_created: {
                whatsapp: `🚀 *VDELIVER - Order Confirmed*

Your delivery request has been received!

📦 *Order Details:*
Tracking: {tracking_number}
Pickup: {pickup_address}
Delivery: {delivery_address}
Vehicle: {vehicle_type}
Est. Cost: {estimated_cost}

We'll notify you when a driver is assigned.

Thank you for choosing VDELIVER!`,
                sms: `VDELIVER: Order confirmed! Track: {tracking_number}. Pickup: {pickup_address}. We'll notify you when driver assigned.`
            },

            driver_assigned: {
                whatsapp: `🚗 *Driver Assigned*

Your VDELIVER is on the way!

👤 Driver: {driver_name}
📞 Contact: {driver_phone}
🚗 Vehicle: {vehicle_details}
🎯 ETA: {estimated_arrival}

Tracking: {tracking_number}

You can track your delivery in real-time.`,
                sms: `VDELIVER: Driver {driver_name} ({driver_phone}) assigned. ETA: {estimated_arrival}. Track: {tracking_number}`
            },

            pickup_complete: {
                whatsapp: `📦 *Package Picked Up*

Your package has been collected successfully!

✅ Pickup confirmed at: {pickup_time}
🚗 Now en route to: {delivery_address}
🎯 Est. delivery: {delivery_eta}

Tracking: {tracking_number}

We'll notify you upon delivery.`,
                sms: `VDELIVER: Package picked up! En route to delivery. ETA: {delivery_eta}. Track: {tracking_number}`
            },

            delivery_complete: {
                whatsapp: `✅ *Delivery Completed*

Your package has been delivered successfully!

📍 Delivered to: {recipient_name}
🕒 Time: {delivery_time}
📦 Received by: {received_by}

Tracking: {tracking_number}

Thank you for using VDELIVER!`,
                sms: `VDELIVER: Package delivered to {recipient_name} at {delivery_time}. Thank you!`
            },

            // PAYMENT NOTIFICATIONS
            payment_required: {
                whatsapp: `💰 *Payment Required*

Total Amount: {amount} UGX
Payment Method: {payment_method}

Please have the payment ready for the driver.

Tracking: {tracking_number}

Thank you!`,
                sms: `VDELIVER: Payment required: {amount} UGX ({payment_method}). Please have payment ready.`
            },

            payment_received: {
                whatsapp: `💳 *Payment Received*

Payment of {amount} UGX received successfully.

Payment Method: {payment_method}
Transaction ID: {transaction_id}

Tracking: {tracking_number}

Thank you for your payment!`,
                sms: `VDELIVER: Payment of {amount} UGX received. Thank you!`
            },

            // ADMIN NOTIFICATIONS
            new_order_admin: {
                whatsapp: `🆕 *NEW DELIVERY ORDER*

Order: {tracking_number}
Customer: {customer_name}
Phone: {customer_phone}
Amount: {amount} UGX

Pickup: {pickup_address}
Delivery: {delivery_address}

Please assign a driver.`,
                sms: `VDELIVER: New order #{tracking_number} from {customer_name}. Amount: {amount} UGX`
            }
        };
    }

    setupNotificationListeners() {
        // Listen for order status changes
        document.addEventListener('order_status_changed', (e) => {
            this.handleStatusChange(e.detail);
        });

        // Listen for new orders
        document.addEventListener('new_order_created', (e) => {
            this.handleNewOrder(e.detail);
        });

        // Listen for payment events
        document.addEventListener('payment_processed', (e) => {
            this.handlePaymentEvent(e.detail);
        });
    }

    async handleStatusChange(data) {
        const { orderId, newStatus, previousStatus, extraData } = data;
        
        try {
            await this.sendOrderNotification(orderId, newStatus, extraData);
            console.log(`Notification sent for order ${orderId} status: ${newStatus}`);
        } catch (error) {
            console.error('Failed to send status notification:', error);
        }
    }

    async handleNewOrder(orderData) {
        try {
            // Notify customer
            await this.sendOrderNotification(orderData.id, 'order_created');
            
            // Notify admin
            await this.sendAdminNotification('new_order_admin', orderData);
            
        } catch (error) {
            console.error('Failed to send new order notifications:', error);
        }
    }

    async handlePaymentEvent(paymentData) {
        try {
            const { orderId, status, amount, method } = paymentData;
            
            if (status === 'completed') {
                await this.sendOrderNotification(orderId, 'payment_received', {
                    amount: amount.toLocaleString(),
                    payment_method: method,
                    transaction_id: paymentData.transactionId
                });
            } else if (status === 'pending' && method === 'cash') {
                await this.sendOrderNotification(orderId, 'payment_required', {
                    amount: amount.toLocaleString(),
                    payment_method: 'Cash on Delivery'
                });
            }
        } catch (error) {
            console.error('Failed to send payment notification:', error);
        }
    }

    async sendOrderNotification(orderId, notificationType, extraData = {}) {
        try {
            // Get order details from database
            const { data: order, error } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    order_updates (
                        status,
                        description,
                        created_at
                    )
                `)
                .eq('id', orderId)
                .single();

            if (error) throw error;

            // Prepare template data
            const templateData = {
                tracking_number: order.tracking_number,
                sender_name: order.sender_name,
                sender_phone: order.sender_phone,
                recipient_name: order.recipient_name,
                recipient_phone: order.recipient_phone,
                pickup_address: order.pickup_address,
                delivery_address: order.delivery_address,
                vehicle_type: order.vehicle_type === 'motorcycle' ? 'Motorcycle 🏍️' : 'Car 🚗',
                estimated_cost: order.estimated_cost ? `${parseInt(order.estimated_cost).toLocaleString()} UGX` : '--',
                ...extraData
            };

            // Send to customer
            await this.sendCustomerNotification(order, notificationType, templateData);

            // Log notification
            await this.logNotification(orderId, notificationType, 'customer', templateData);

            return true;

        } catch (error) {
            console.error('Order notification error:', error);
            return false;
        }
    }

    async sendCustomerNotification(order, notificationType, data) {
        const template = this.templates[notificationType];
        if (!template) {
            console.warn(`No template found for: ${notificationType}`);
            return;
        }

        // Send WhatsApp to customer
        if (template.whatsapp) {
            await this.sendWhatsApp(order.sender_phone, template.whatsapp, data);
        }

        // Send SMS to customer
        if (template.sms) {
            await this.sendSMS(order.sender_phone, template.sms, data);
        }

        // Also notify recipient if different phone and call_recipient is true
        if (order.recipient_phone && 
            order.recipient_phone !== order.sender_phone && 
            order.call_recipient) {
            
            if (template.sms) {
                await this.sendSMS(order.recipient_phone, template.sms, data);
            }
        }
    }

    async sendAdminNotification(notificationType, orderData) {
        const template = this.templates[notificationType];
        if (!template) return;

        const adminData = {
            tracking_number: orderData.tracking_number,
            customer_name: orderData.sender_name,
            customer_phone: orderData.sender_phone,
            amount: orderData.estimated_cost ? `${parseInt(orderData.estimated_cost).toLocaleString()} UGX` : '--',
            pickup_address: orderData.pickup_address,
            delivery_address: orderData.delivery_address
        };

        // Send to admin WhatsApp (your number)
        const adminPhone = '+256757268074'; // Your number
        if (template.whatsapp) {
            await this.sendWhatsApp(adminPhone, template.whatsapp, adminData);
        }

        // Log admin notification
        await this.logNotification(orderData.id, notificationType, 'admin', adminData);
    }

    async sendWhatsApp(phoneNumber, template, data) {
        const message = this.replaceTemplatePlaceholders(template, data);
        const cleanNumber = this.cleanPhoneNumber(phoneNumber);
        
        // Create WhatsApp URL
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        
        // For demo: log the URL (in production, this would actually send via WhatsApp Business API)
        console.log('WhatsApp Notification:', {
            to: cleanNumber,
            message: message,
            url: whatsappUrl
        });

        // In real implementation, you would:
        // 1. Use WhatsApp Business API
        // 2. Or open URL for manual sending (for now)
        // window.open(whatsappUrl, '_blank');
        
        return true;
    }

    async sendSMS(phoneNumber, template, data) {
        const message = this.replaceTemplatePlaceholders(template, data);
        const cleanNumber = this.cleanPhoneNumber(phoneNumber);
        
        // For demo: log the SMS (in production, integrate with SMS gateway like Africa's Talking)
        console.log('SMS Notification:', {
            to: cleanNumber,
            message: message
        });

        // In real implementation:
        // Integrate with SMS service like Africa's Talking, Twilio, etc.
        
        return true;
    }

    replaceTemplatePlaceholders(template, data) {
        return template.replace(/{(\w+)}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    cleanPhoneNumber(phone) {
        let clean = phone.replace(/\s+/g, '').replace('-', '');
        
        // Convert to international format
        if (clean.startsWith('0')) {
            clean = '+256' + clean.substring(1);
        } else if (clean.startsWith('256')) {
            clean = '+' + clean;
        } else if (!clean.startsWith('+')) {
            clean = '+256' + clean;
        }
        
        return clean;
    }

    async logNotification(orderId, type, recipient, data) {
        try {
            const { error } = await this.supabase
                .from('notifications')
                .insert([{
                    order_id: orderId,
                    type: type,
                    recipient: recipient,
                    channel: 'whatsapp', // or 'sms'
                    status: 'sent',
                    data: data,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

        } catch (error) {
            console.error('Failed to log notification:', error);
        }
    }

    // Manual notification triggers (for testing)
    async testNotification(orderId, type) {
        return await this.sendOrderNotification(orderId, type);
    }

    // Get notification history for an order
    async getOrderNotifications(orderId) {
        const { data, error } = await this.supabase
            .from('notifications')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
}

// Database schema for notifications (to be executed in Supabase SQL Editor)
const notificationSchema = `
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    recipient VARCHAR(20) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'sent',
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
`;

// Initialize notification system
document.addEventListener('DOMContentLoaded', function() {
    window.notificationSystem = new NotificationSystem();
});
