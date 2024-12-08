Ext.define('FileManagement.components.utils.AccessTracker', {
    singleton: true,

    // Store verified items with their expiry timestamps
    verifiedItems: new Map(),

    /**
     * Add an item to the verified list
     * @param {String} itemId The ID of the verified item
     */
    addVerifiedItem: function(itemId) {
        // Set expiry to 30 minutes from now
        const expiryTime = Date.now() + (1 * 60 * 1000);
        this.verifiedItems.set(itemId, expiryTime);
    },

    /**
     * Check if an item is verified and not expired
     * @param {String} itemId The ID of the item to check
     * @returns {Boolean} True if the item is verified and not expired
     */
    isItemVerified: function(itemId) {
        const expiryTime = this.verifiedItems.get(itemId);
        if (!expiryTime) return false;
        
        if (Date.now() > expiryTime) {
            // Remove expired item
            this.verifiedItems.delete(itemId);
            return false;
        }
        
        return true;
    },

    /**
     * Remove an item from the verified list
     * @param {String} itemId The ID of the item to remove
     */
    removeVerifiedItem: function(itemId) {
        this.verifiedItems.delete(itemId);
    },

    /**
     * Clear all verified items
     */
    clearVerifiedItems: function() {
        this.verifiedItems.clear();
    }
});
