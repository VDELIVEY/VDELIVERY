
// VDELIVER Driver Management System
class DriverSystem {
    constructor() {
        this.supabase = window.supabaseConfig?.getClient();
        this.drivers = [];
        this.availableDrivers = [];
        this.activeAssignments = new Map();
        this.init();
    }

    async init() {
        await this.loadDrivers();
        this.setupDriverListeners();
        this.startDriverMonitoring();
        console.log('Driver system initialized');
    }

    async loadDrivers() {
        try {
            const { data: drivers, error } = await this.supabase
                .from('drivers')
                .select('*')
                .eq('status', 'active')
                .order('name');

            if (error) throw error;
            
            this.drivers = drivers || [];
            this.availableDrivers = this.drivers.filter(driver => 
                driver.availability_status === 'available'
            );
            
            console.log(`Loaded ${this.drivers.length} drivers, ${this.availableDrivers.length} available`);

        } catch (error) {
            console.error('Error loading drivers:', error);
            // Fallback: Create demo drivers for testing
            this.createDemoDrivers();
        }
    }

    createDemoDrivers() {
        this.drivers = [
            {
                id: 'driver-1',
                name: 'John Mugisha',
                phone: '+256712345678',
                vehicle_type: 'motorcycle',
                vehicle_details: 'Bajaj Boxer - Red',
                license_plate: 'UAB 123A',
                availability_status: 'available',
                rating: 4.8,
                completed_deliveries: 47,
                current_location: [0.3476, 32.5825] // Kampala coordinates
            },
            {
                id: 'driver-2', 
                name: 'David Omondi',
                phone: '+256723456789',
                vehicle_type: 'car',
                vehicle_details: 'Toyota Premio - White',
                license_plate: 'UAD 456B',
                availability_status: 'available',
                rating: 4.9,
                completed_deliveries: 63,
                current_location: [0.3136, 32.5811] // Near Kampala
            },
            {
                id: 'driver-3',
                name: 'Sarah Nakato',
                phone: '+256734567890',
                vehicle_type: 'motorcycle',
                vehicle_details: 'TVS Star - Blue',
                license_plate: 'UAM 789C',
                availability_status: 'on_delivery',
                rating: 4.7,
                completed_deliveries: 32,
                current_location: [0.3376, 32.5755] // Kampala area
            }
        ];

        this.availableDrivers = this.drivers.filter(driver => 
            driver.availability_status === 'available'
        );
    }

    setupDriverListeners() {
        // Listen for new orders
        document.addEventListener('new_order_created', (e) => {
            this.handleNewOrder(e.detail);
        });

        // Listen for order status changes
        document.addEventListener('order_status_changed', (e) => {
            this.handleOrderStatusChange(e.detail);
        });
    }

    startDriverMonitoring() {
        // Simulate driver location updates (every 30 seconds)
        setInterval(() => {
            this.updateDriverLocations();
        }, 30000);
    }

    updateDriverLocations() {
        // Simulate driver movement for demo
        this.drivers.forEach(driver => {
            if (driver.availability_status === 'available') {
                // Add small random movement to coordinates
                const latChange = (Math.random() - 0.5) * 0.01;
                const lngChange = (Math.random() - 0.5) * 0.01;
                driver.current_location[0] += latChange;
                driver.current_location[1] += lngChange;
            }
        });
    }

    async handleNewOrder(order) {
        console.log('🚗 Driver system processing new order:', order.tracking_number);
        
        try {
            // Find suitable driver
            const assignedDriver = await this.assignDriverToOrder(order);
            
            if (assignedDriver) {
                await this.assignOrderToDriver(order, assignedDriver);
            } else {
                console.log('No available drivers for order:', order.tracking_number);
                // Queue order for later assignment
                await this.queueOrder(order);
            }

        } catch (error) {
            console.error('Error assigning driver:', error);
        }
    }

    async assignDriverToOrder(order) {
        const suitableDrivers = this.findSuitableDrivers(order);
        
        if (suitableDrivers.length === 0) {
            console.log('No suitable drivers found for order');
            return null;
        }

        // Select best driver based on criteria
        const bestDriver = this.selectBestDriver(suitableDrivers, order);
        return bestDriver;
    }

    findSuitableDrivers(order) {
        return this.availableDrivers.filter(driver => {
            // Match vehicle type
            if (driver.vehicle_type !== order.vehicle_type) {
                return false;
            }

            // Check if driver is actually available
            if (driver.availability_status !== 'available') {
                return false;
            }

            // Add distance calculation here in real implementation
            // For now, all available drivers with matching vehicle type are suitable
            
            return true;
        });
    }

    selectBestDriver(suitableDrivers, order) {
        // Simple selection: highest rated driver
        return suitableDrivers.reduce((best, driver) => {
            return (!best || driver.rating > best.rating) ? driver : best;
        }, null);
    }

    async assignOrderToDriver(order, driver) {
        console.log(`🚀 Assigning order ${order.tracking_number} to driver ${driver.name}`);

        try {
            // Update driver status
            driver.availability_status = 'on_delivery';
            this.availableDrivers = this.availableDrivers.filter(d => d.id !== driver.id);
            
            // Store assignment
            this.activeAssignments.set(order.id, {
                driver: driver,
                order: order,
                assigned_at: new Date(),
                status: 'assigned'
            });

            // Update order in database
            await this.updateOrderWithDriver(order.id, driver);

            // Notify customer
            await this.notifyCustomerDriverAssigned(order, driver);

            // Notify driver (in real app, this would be push notification)
            await this.notifyDriverNewAssignment(driver, order);

            return true;

        } catch (error) {
            console.error('Error assigning order to driver:', error);
            // Revert driver status on error
            driver.availability_status = 'available';
            this.availableDrivers.push(driver);
            throw error;
        }
    }

    async updateOrderWithDriver(orderId, driver) {
        try {
            const { error } = await this.supabase
                .from('orders')
                .update({
                    driver_id: driver.id,
                    driver_name: driver.name,
                    driver_phone: driver.phone,
                    vehicle_details: driver.vehicle_details,
                    status: 'accepted',
                    assigned_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            // Add status update
            await this.supabase
                .from('order_updates')
                .insert([{
                    order_id: orderId,
                    status: 'accepted',
                    description: `Driver ${driver.name} (${driver.phone}) assigned with ${driver.vehicle_details}`
                }]);

        } catch (error) {
            console.error('Error updating order with driver:', error);
            throw error;
        }
    }

    async notifyCustomerDriverAssigned(order, driver) {
        if (window.notificationSystem) {
            const estimatedArrival = this.calculateETA(order, driver);
            
            await window.notificationSystem.sendOrderNotification(order.id, 'driver_assigned', {
                driver_name: driver.name,
                driver_phone: driver.phone,
                vehicle_details: driver.vehicle_details,
                estimated_arrival: estimatedArrival
            });
        }
    }

    async notifyDriverNewAssignment(driver, order) {
        // In real implementation, send push notification to driver app
        // For now, log it and could send SMS
        console.log(`📱 Notifying driver ${driver.name} about new assignment: ${order.tracking_number}`);
        
        const driverMessage = `🚀 NEW DELIVERY ASSIGNED

Order: ${order.tracking_number}
Pickup: ${order.pickup_address}
Delivery: ${order.delivery_address}
Customer: ${order.sender_name} (${order.sender_phone})

Please proceed to pickup location.`;

        // Could send SMS to driver here
        // await window.notificationSystem.sendSMS(driver.phone, driverMessage);
    }

    calculateETA(order, driver) {
        // Simple ETA calculation based on distance
        // In real app, use Google Maps Distance Matrix API
        const baseMinutes = order.vehicle_type === 'motorcycle' ? 25 : 35;
        const randomVariation = Math.floor(Math.random() * 15) + 1; // 1-15 minutes
        return `${baseMinutes + randomVariation} minutes`;
    }

    async handleOrderStatusChange(data) {
        const { orderId, newStatus } = data;
        const assignment = this.activeAssignments.get(orderId);

        if (!assignment) return;

        if (newStatus === 'delivered' || newStatus === 'cancelled') {
            // Free up the driver
            await this.releaseDriver(assignment.driver, orderId);
        }
    }

    async releaseDriver(driver, orderId) {
        driver.availability_status = 'available';
        this.availableDrivers.push(driver);
        this.activeAssignments.delete(orderId);

        console.log(`Driver ${driver.name} released and available for new assignments`);

        // Check for queued orders
        await this.processQueuedOrders();
    }

    async queueOrder(order) {
        console.log(`Order ${order.tracking_number} queued - no drivers available`);
        
        // In real implementation, store in database queue
        // For now, just log and retry in 1 minute
        setTimeout(() => {
            this.handleNewOrder(order);
        }, 60000); // Retry after 1 minute
    }

    async processQueuedOrders() {
        // Process any orders that were waiting for drivers
        // Implementation would check database queue
        console.log('Checking for queued orders...');
    }

    // Driver management methods
    async updateDriverLocation(driverId, location) {
        const driver = this.drivers.find(d => d.id === driverId);
        if (driver) {
            driver.current_location = location;
            
            // Update in database in real implementation
            console.log(`Updated location for driver ${driver.name}:`, location);
        }
    }

    async updateDriverStatus(driverId, status) {
        const driver = this.drivers.find(d => d.id === driverId);
        if (driver) {
            const oldStatus = driver.availability_status;
            driver.availability_status = status;

            // Update available drivers list
            if (status === 'available' && !this.availableDrivers.includes(driver)) {
                this.availableDrivers.push(driver);
            } else if (status !== 'available') {
                this.availableDrivers = this.availableDrivers.filter(d => d.id !== driverId);
            }

            console.log(`Driver ${driver.name} status changed: ${oldStatus} -> ${status}`);
        }
    }

    // Admin methods
    getAvailableDrivers() {
        return this.availableDrivers;
    }

    getActiveAssignments() {
        return Array.from(this.activeAssignments.values());
    }

    getAllDrivers() {
        return this.drivers;
    }

    // Demo method to simulate driver accepting delivery
    async simulateDriverAction(orderId, action) {
        const assignment = this.activeAssignments.get(orderId);
        if (!assignment) return;

        const newStatus = action === 'pickup' ? 'picked_up' : 'delivered';
        
        // Update order status
        const { error } = await this.supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (!error) {
            // Trigger status change event
            document.dispatchEvent(new CustomEvent('order_status_changed', {
                detail: {
                    orderId: orderId,
                    newStatus: newStatus,
                    previousStatus: assignment.order.status
                }
            }));

            assignment.order.status = newStatus;
        }
    }
}

// Driver database schema (run in Supabase SQL Editor)
const driverSchema = `
CREATE TABLE IF NOT EXISTS drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('motorcycle', 'car')),
    vehicle_details VARCHAR(200) NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'on_delivery', 'offline', 'break')),
    rating DECIMAL(3,2) DEFAULT 5.0,
    completed_deliveries INTEGER DEFAULT 0,
    current_location JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_availability ON drivers(availability_status);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_type ON drivers(vehicle_type);
`;

// Initialize driver system
document.addEventListener('DOMContentLoaded', function() {
    window.driverSystem = new DriverSystem();
});
