const aClientSystem = client.registerSystem(0, 0);

// Namespace.
MinionMiners = {};

/**
 * Base Minion Miners controller.
 */
MinionMiners.Core = function(injectClient) {
    var minecraftClient = injectClient;
    var modules = [];
    var initialized = false;
    var updating = false;
    // Quick access to broadcast message
    this.say = function(message) {
        let chatEvent = minecraftClient.createEventData("minecraft:display_chat_event");
        chatEvent.data.message = message;
        minecraftClient.broadcastEvent("minecraft:display_chat_event", chatEvent);
    };
    this.registerModule = function(moduleInstance) {
        modules.push(moduleInstance);
    };
    this.initialize = function() {
        minecraftClient.registerEventData("minion_miners:client_entered_world", {}); 
        // Setup callback for when the player enters the world
        minecraftClient.listenForEvent("minecraft:client_entered_world", (eventData) => this.onClientEnteredWorld(eventData));
        // Setup callback for UI events from the custom screens.
        minecraftClient.listenForEvent("minecraft:ui_event", (eventData) => this.onUIMessage(eventData));
        // Call initialize on all minion miner client modules.
        for (i = 0; i < modules.length; i++) {
            if (modules[i].initialize) {
                modules[i].initialize(this);
            }
        }
        initialized = true;
    };
    /**
     * Called by Minecraft each tick (20 times per second).
     */
    this.update = function() {
        // Call update on all minion miner client modules.
        if (initialized == true) {
            for (i = 0; i < modules.length; i++) {
                if (modules[i].update) {
                    modules[i].update();
                }
            }
            updating = true;
        }
    };
    this.getClient = function() {
        return minecraftClient;
    };
    this.isReady = function() {
        return updating;
    };
    /**
     * New client just connected to world.
     */
    this.onClientEnteredWorld = function(eventData) {
        // Client has entered the world, show the starting screen.
        let loadEventData = minecraftClient.createEventData("minecraft:load_ui");
        loadEventData.data.path = "minion_miners.html";
        loadEventData.data.options.always_accepts_input = true;
        loadEventData.data.options.is_showing_menu = false;
        loadEventData.data.options.absorbs_input = false;
        loadEventData.data.options.should_steal_mouse = true;
        loadEventData.data.options.render_game_behind = true;
        loadEventData.data.options.force_render_below = true;
        minecraftClient.broadcastEvent("minecraft:load_ui", loadEventData);
        // Notify the server script that the player has finished loading in.
        let clientEnteredEventData = minecraftClient.createEventData("minion_miners:client_entered_world");
        minecraftClient.broadcastEvent("minion_miners:client_entered_world", clientEnteredEventData);        
    };
    /**
     * Message from custom UI
     */
    this.onUIMessage = function(eventData) {
        this.say("Got it!");
    };
};

/**
 * Minion Miners Calendar.
 * 
 * Controls the sun, moon, and keeping track of the yearly/monthly/daily calendar.
 */
MinionMiners.Calendar = function() {
};

let mm = new MinionMiners.Core(aClientSystem);
//mm.registerModule(new MinionMiners.Calendar())

// Register script only components and listen for events
aClientSystem.initialize = function () {
    mm.initialize();
};

// Update is called every tick
aClientSystem.update = function () {
    mm.update();
};
