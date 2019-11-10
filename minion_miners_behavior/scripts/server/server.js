const aServerSystem = server.registerSystem(0, 0);

// Namespace.
MinionMiners = {};

// Time of day (in minecraft) class.
MinionMiners.timeOfDay = function(realLifeMinutesInDay) {
    var config = {
        // Real life minutes
        rlMinutes: {
            dayTime: null
        },
        // Calculated tick increment to achieve real life minutes
        tickIncrements: {
            dayTime: null
        }
    };
    // Maintain current minecraft time in discrete units.
    var time = {
        hour: 0,
        minute: 0,
        second: 0,
        tick: 0
    };
    /**
     * Return current time object.
     */
    this.getTime = function() {
        return JSON.parse(JSON.stringify(time));
    };
    /**
     * Calculate Minecraft daytime tick value based on time object.
     */
    this.getTick = function() {
        return Math.floor(time.tick);
    };
    /**
     * Set time object based on minecraft daytime tick value (0-24000).
     * 
     * @param {int} tick Tick of current daytime as found in minecraft.
     */
    this.setTick = function(tick) {
        time.hour = Math.floor(time.tick / (20 * 60 * 60));
        time.minute = Math.floor((time.tick - (time.hour * 1000)) / (20 * 60));
        time.second = 0;
        time.tick = tick;
        return this;
    };
    /**
     * Increment the minecraft time required by a single script tick (1/20 of a second)
     * 
     * Normally each minecraft tick (1/20th of a second) increments the minecraft daytime
     * value by the same (1/20th of a second). However, we alter this behavior and apply
     * a custom time increase based on how long (in real life minutes) a minecraft day
     * has been configured to take. 
     */
    this.incrementTick = function() {
        time.tick += config.tickIncrements.dayTime;
        if (time.tick >= (20 * 60 * 60 * 24)) {
            time.tick = 0;
        }
        this.setTick(time.tick);
    };
    /**
     * Set the number of real life minutes it takes for the minecraft sun to traverse the sky.
     */
    this.setMinutesInDaytime = function(minutes) {
        config.rlMinutes.dayTime = minutes;
        config.tickIncrements.dayTime = 24000 / (config.rlMinutes.dayTime * 60 * 20);
    };
    /**
     * Retrieve the configuration, which holds timespans in real minutes and 
     * the associated tick increment adjustments required to maintain it.
     */
    this.getConfig = function() {
        return JSON.parse(JSON.stringify(config));
    };
    this.setMinutesInDaytime(realLifeMinutesInDay);
};

/**
 * Base Minion Miners controller.
 */
MinionMiners.Core = function(injectServer) {
    var self = this;
    var minecraftServer = injectServer;
    var modules = [];
    var initialized = false;
    var updating = false;
    // Quick access to broadcast message
    this.say = function(message) {
        let chatEvent = minecraftServer.createEventData("minecraft:display_chat_event");
        chatEvent.data.message = message;
        minecraftServer.broadcastEvent("minecraft:display_chat_event", chatEvent);
    };
    this.registerModule = function(moduleInstance) {
        modules.push(moduleInstance);
    };
    this.initialize = function() {
        let scriptLoggerConfig = minecraftServer.createEventData("minecraft:script_logger_config");
        scriptLoggerConfig.data.log_errors = true;
        scriptLoggerConfig.data.log_information = true;
        scriptLoggerConfig.data.log_warnings = true;
        minecraftServer.broadcastEvent("minecraft:script_logger_config", scriptLoggerConfig);
        minecraftServer.listenForEvent("minion_miners:client_entered_world", eventData => this.onClientEnteredWorld(eventData));
        // Call initialize on each minion miners server module.
        for (i = 0; i < modules.length; i++) {
            modules[i].initialize(this);
        }
        initialized = true;
    };
    /**
     * Called by Minecraft each tick (20 times per second).
     */
    this.update = function() {
        // Call upate on each minion miners server module.
        if (initialized == true) {
            for (i = 0; i < modules.length; i++) {
                modules[i].update();            
            }
            updating = true;    
        }
    };
    this.getServer = function() {
        return minecraftServer;
    };
    this.isReady = function() {
        return updating;
    };
    this.onClientEnteredWorld = function(eventData) {
        this.say("Welcome!");
        // Do nothing for now.
    };
};

/**
 * Minion Miners Calendar.
 * 
 * Controls the sun, moon, and keeping track of the yearly/monthly/daily calendar.
 */
MinionMiners.Calendar = function(realLifeMinutesInDay) {
    var mm = null;
    var time = null;
    var ready = null;
    /**
     * Sync time object to current minecraft daytime tick (0 - 24000).
     * 
     * @param {function} callback Callback to invoke with new time object when sync is complete.
     */
    this.syncTime = function(callback) {
        this.getMinecraftDaytimeTick((tick) => {
            time.setTick(tick);
            if (callback) {
                callback(time);
            }
        });
    };
    this.initialize = function(injectCore) {
        mm = injectCore;
        mm.getServer().registerEventData("minion_miners:calendar_wizard_load_ui", {});
        mm.getServer().listenForEvent("minecraft:entity_acquired_item", (eventData) => {
            mm.say(JSON.stringify(eventData));
        });
        mm.getServer().listenForEvent("minecraft:entity_use_item", (eventData) => this.monitorItemUse(eventData));
        // Disable normal daylight cycle
        mm.getServer().executeCommand("/gamerule dodaylightcycle false", () => {});
    };
    /**
     * Called by core each script tick (20 times per second).
     */
    this.update = function() {
        if (mm.isReady() && ready == null) {
            ready = false;
            this.syncTime(() => {
                ready = true;
            });
        }
        if (mm.isReady() && ready) {
            time.incrementTick();
            this.setMinecraftDaytimeTick(time.getTick());
        }
    };
    /**
     * Increment or decrement minutes of daytime or nighttime based on which item was used.
     */
    this.monitorItemUse = function(eventData) {
//        mm.say(JSON.stringify(eventData));
        if (eventData.__type__ == "event_data" && eventData.data.item_stack.item == "minion_miners:calendar_daytime_increase") {
            this.incrementMinutesInDaytime();
        }
    };
    /**
     * Set current minecraft daytime tick.
     * 
     * This will update the position of the sun, moon, and stars.
     * 
     * @param {int} tick New value of daytime (0-24000)
     */
    this.setMinecraftDaytimeTick = function(tick) {
        mm.getServer().executeCommand("/time set " + tick, () => {});
    };
    /**
     * Get current minecraft daytime tick.
     * 
     * @param {function} callback Function to execute with result
     */
    this.getMinecraftDaytimeTick = function(callback) {
        mm.getServer().executeCommand("/time query daytime", (resultData) => {
            var n = resultData.data.body.split(" ");
            var tick = n[n.length - 1];
            if (callback) {
                callback(tick);
            }
        });
    };
    /**
     * Set the number of real life minutes it takes for the minecraft sun to traverse the sky.
     */
    this.setMinutesInDaytime = function(minutes) {
        time.setMinutesInDaytime(minutes);
    };
    /**
     * Increment the number of minutes during daytime by 1.
     */
    this.incrementMinutesInDaytime = function() {
        var timeConfig = time.getConfig();
        var newDayTimeMinutes = timeConfig.rlMinutes.dayTime + 1;
        this.setMinutesInDaytime(newDayTimeMinutes);
        mm.say("The heavens have altered their course. " + newDayTimeMinutes + " minutes during daytime.");
    };
    time = new MinionMiners.timeOfDay(realLifeMinutesInDay);
};

let mm = new MinionMiners.Core(aServerSystem);
mm.registerModule(new MinionMiners.Calendar(2))

// Register script only components and listen for events
aServerSystem.initialize = function () {
    mm.initialize();
};
// Update is called every tick
aServerSystem.update = function () {
    mm.update();
};
