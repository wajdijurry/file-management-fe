Ext.define('FileManagement.components.utils.SnapAssist', {
    extend: 'Ext.container.Container',
    xtype: 'snapassist',
    itemId: 'snapassist',
    layout: {
        type: 'vbox', // Vertical layout for rows
        align: 'stretch' // Stretch rows to fill the parent
    },
    id: 'mainSnapContainer',
    cls: 'snap-assist-container',
    flex: 1, // Allow SnapAssist to fill its parent container
    width: '100%', // Ensures full width
    height: '100%', // Ensures full height of parent container

    items: [
        {
            xtype: 'container',
            itemId: 'topRow',
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            flex: 1,
            items: [
                {
                    xtype: 'container',
                    itemId: 'topLeft',
                    flex: 1,
                    cls: 'snap-zone invisible',
                },
                {
                    xtype: 'container',
                    itemId: 'topRight',
                    flex: 1,
                    cls: 'snap-zone invisible',
                }
            ]
        },
        {
            xtype: 'container',
            itemId: 'bottomRow',
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            flex: 1,
            items: [
                {
                    xtype: 'container',
                    itemId: 'bottomLeft',
                    flex: 1,
                    cls: 'snap-zone invisible',
                },
                {
                    xtype: 'container',
                    itemId: 'bottomRight',
                    flex: 1,
                    cls: 'snap-zone invisible',
                }
            ]
        }
    ],

    initialize: function(parentContainer) {
        const me = this;

        // Attach drag listeners to all draggable panels in the container
        parentContainer.items.each(panel => {
            if (panel.draggable) {
                // me.bindDragListeners(panel);
            }
        });

        // Dynamically bind to new components added to the parent container
        parentContainer.on('add', function(container, component) {
            if (component.draggable) {
                me.bindDragListeners(component);
            }
        });
    },

    bindDragListeners: function(panel) {
        const me = this;

        // console.log(panel.draggable);

        // Check if `draggable` is defined and has listeners
        if (!panel.draggable) {
            panel.draggable = {};
        }

        // Preserve existing listeners
        const existingDraggableConfig = Object.assign({}, panel.draggable);

        // console.log(existingDraggableConfig);

        // Add new listeners while preserving existing ones
        panel.draggable = {
            ...existingDraggableConfig,
            onDrag: function(draggable, panel) {
                if (existingDraggableConfig.onDrag) existingDraggableConfig.onDrag(draggable, panel);
                if (draggable.isExecuted) return;
                me.highlightSnapZones(me, panel);
                draggable.isExecuted = true;
            },
            onMouseUp: function(draggable) {
                if (existingDraggableConfig.onMouseUp) {
                    existingDraggableConfig.onMouseUp(draggable, panel); // Call original onMouseUp listener
                }
                if (draggable.isExecuted) return;
                me.snapToZone(panel);
                me.clearHighlights();
                draggable.isExecuted = true;
            }
        };
    },

    highlightSnapZones: function(panel) {
        const zones = Ext.ComponentQuery.query('container[cls~=snap-zone]');
        const panelBox = panel.getBox();

        zones.forEach(zone => {
            const zoneBox = zone.getBox();
            if (this.isOverlapping(panelBox, zoneBox)) {
                zone.addCls('highlight-region');
                zone.removeCls('invisible');
            } else {
                zone.removeCls('highlight-region');
                zone.addCls('invisible');
            }
        });
    },

    snapToZone: function(panel) {
        // debugger;
        const zones = Ext.ComponentQuery.query('container[cls~=snap-zone]');
        const panelBox = panel.getBox();

        // Proximity threshold (in pixels) for edge detection
        const edgeProximity = 20;

        // Get offsets for navigation panel and user toolbar
        const navPanel = Ext.getCmp('navigationpanel'); // Assuming the ID is 'navigationpanel'
        const navPanelWidth = navPanel ? navPanel.getWidth() : 0;

        const userToolbar = Ext.getCmp('userToolbar'); // Assuming the ID is 'userToolbar'
        const userToolbarHeight = userToolbar ? userToolbar.getHeight() : 0;

        let bestZone = null;
        let bestMatchScore = 0; // Score to determine the best zone

        zones.forEach(zone => {
            const zoneBox = zone.getBox();

            // Adjust the zoneBox to account for navigation panel and user toolbar offsets
            const adjustedZoneBox = {
                left: zoneBox.left + navPanelWidth,
                right: zoneBox.right + navPanelWidth,
                top: zoneBox.top,
                bottom: zoneBox.bottom - userToolbarHeight
            };

            // Check if the panel is near the edges of the adjusted zone
            const nearTopEdge = Math.abs(panelBox.top - adjustedZoneBox.top) <= edgeProximity;
            const nearBottomEdge = Math.abs(panelBox.bottom - adjustedZoneBox.bottom) <= edgeProximity;
            const nearLeftEdge = Math.abs(panelBox.left - adjustedZoneBox.left) <= edgeProximity;
            const nearRightEdge = Math.abs(panelBox.right - adjustedZoneBox.right) <= edgeProximity;

            // Calculate a match score based on edge proximity
            let matchScore = 0;
            if (nearTopEdge) matchScore += 1;
            if (nearBottomEdge) matchScore += 1;
            if (nearLeftEdge) matchScore += 1;
            if (nearRightEdge) matchScore += 1;

            // Further refine match by checking alignment
            const horizontallyAligned =
                panelBox.left >= adjustedZoneBox.left &&
                panelBox.right <= adjustedZoneBox.right;
            const verticallyAligned =
                panelBox.top >= adjustedZoneBox.top &&
                panelBox.bottom <= adjustedZoneBox.bottom;

            if (horizontallyAligned) matchScore += 2; // Favor horizontal alignment
            if (verticallyAligned) matchScore += 2; // Favor vertical alignment

            // Update the best zone if the current zone has a higher match score
            if (matchScore > bestMatchScore) {
                bestMatchScore = matchScore;
                bestZone = zone;
            }
        });

        if (bestZone) {
            const bestZoneBox = bestZone.getBox();

            // Adjust snapping to consider navigation panel and user toolbar offsets
            panel.setStyle({left: bestZoneBox.left, top: bestZoneBox.top});
            panel.setSize(bestZoneBox.width, bestZoneBox.height);
        }
    },

    clearHighlights: function() {
        const zones = Ext.ComponentQuery.query('container[cls~=snap-zone]');
        zones.forEach(zone => {
            zone.removeCls('highlight-region');
            zone.addCls('invisible');
        });
    },

    isOverlapping: function(box1, box2) {
        return !(
            box1.right <= box2.left ||
            box1.left >= box2.right ||
            box1.bottom <= box2.top ||
            box1.top >= box2.bottom
        );
    }

});
