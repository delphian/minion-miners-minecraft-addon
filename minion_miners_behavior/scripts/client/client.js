const aClientSystem = client.registerSystem(0, 0);

// Namespace.
MinionMiners = {};

/**
 * Base Minion Miners controller.
 */
MinionMiners.Core = function(injectClient) {
    var self = this;
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
    /**
     * Called by Minecraft once during script initialization.
     */
    this.initialize = function() {
        let scriptLoggerConfig = minecraftClient.createEventData("minecraft:script_logger_config");
        scriptLoggerConfig.data.log_errors = true;
        scriptLoggerConfig.data.log_information = true;
        scriptLoggerConfig.data.log_warnings = true;
        minecraftClient.broadcastEvent("minecraft:script_logger_config", scriptLoggerConfig);        
        minecraftClient.registerEventData("minion_miners:client_entered_world", {});
        minecraftClient.registerEventData("minion_miners:click", {});
        // Setup callback for when the player enters the world
        minecraftClient.listenForEvent("minecraft:client_entered_world", (eventData) => this.onClientEnteredWorld(eventData));
        // Setup callback for UI events from the custom screens.
        minecraftClient.listenForEvent("minecraft:ui_event", (eventData) => this.onUIMessage(eventData));
        // Call initialize on all minion miner client modules.
        for (var i = 0; i < modules.length; i++) {
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
            for (var i = 0; i < modules.length; i++) {
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
        let clientEnteredEventData = minecraftClient.createEventData("minion_miners:client_entered_world");
        minecraftClient.broadcastEvent("minion_miners:client_entered_world", clientEnteredEventData);
    };
};

/**
 * Minion Miners Calendar.
 * 
 * Controls the sun, moon, and keeping track of the yearly/monthly/daily calendar.
 */
MinionMiners.Calendar = function() {
    var mm = null;
    var initialized = false;
    var updating = false;
    /**
     * Called by Core once during script initialization.
     */
    this.initialize = function(injectMmCore) {
        mm = injectMmCore;
        // Setup callback for when the player enters the world
        mm.getClient().listenForEvent("minion_miners:calendar_wizard_load_ui", (eventData) => this.onDaytimeControlLoadUi(eventData));
        mm.getClient().listenForEvent("minecraft:hit_result_changed", (eventData) => {
            // mm.say(JSON.stringify(eventData));
        });
        initialized = true;
    };
    /**
     * Called by Core once per tick (20 times per second).
     */
    this.update = function() {
        updating = true;
    };
    /**
     * Load the daytime control ui.
     */
    this.onDaytimeControlLoadUi = function(eventData) {
        mm.say("Loading calendar wizard ui...");
        // let loadEventData = minecraftClient.createEventData("minecraft:load_ui");
        // loadEventData.data.path = "minion_miners.html";
        // loadEventData.data.options.always_accepts_input = false;
        // loadEventData.data.options.is_showing_menu = false;
        // loadEventData.data.options.absorbs_input = false;
        // loadEventData.data.options.should_steal_mouse = true;
        // loadEventData.data.options.render_game_behind = true;
        // loadEventData.data.options.force_render_below = false;
        // loadEventData.data.options.render_only_when_topmost = true;
        // minecraftClient.broadcastEvent("minecraft:load_ui", loadEventData);
    };
};

let mm = new MinionMiners.Core(aClientSystem);
mm.registerModule(new MinionMiners.Calendar());

// Register script only components and listen for events
aClientSystem.initialize = function () {
    mm.initialize();
};

// Update is called every tick
aClientSystem.update = function () {
    mm.update();
};
