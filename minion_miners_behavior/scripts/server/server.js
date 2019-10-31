const aServerSystem = server.registerSystem(0, 0);

// Namespace.
MinionMiners = {};

// Time of day (in minecraft) class.
MinionMiners.timeOfDay = function(realLifeMinutesInDay) {
    var config = {
        tickIncrement: null,
    };
    // Maintain current time in discrete units.
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
     * Increment the time by a single tick (1/20 of a second)
     */
    this.incrementTick = function() {
        time.tick += config.tickIncrement;
        if (time.tick >= (20 * 60 * 60 * 24)) {
            time.tick = 0;
        }
        this.setTick(time.tick);
    };
    config.tickIncrement = 24000 / (realLifeMinutesInDay * 60 * 20);
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
        for (i = 0; i < modules.length; i++) {
            modules[i].initialize(this);
        }
        initialized = true;
    };
    /**
     * Called by Minecraft each tick (20 times per second).
     */
    this.update = function() {
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
    }
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
    time = new MinionMiners.timeOfDay(realLifeMinutesInDay);
};

let mm = new MinionMiners.Core(aServerSystem);
// Initialize calendar with a day cycle of 1 minute
mm.registerModule(new MinionMiners.Calendar(1))

let mmWeather = {};
mmWeather.Data = {};
mmWeather.Data.tickCount = 0;
mmWeather.Data.dayRainCount = 0;

// Register script only components and listen for events
aServerSystem.initialize = function () {
    let weather = this.getComponent(server.level, "minecraft:weather");
    weather.data.do_weather_cycle = false;
    this.applyComponentChanges(server.level, weather);
    this.listenForEvent("minecraft:weather_changed", eventData => this.onWeatherChanged(eventData));  
    mm.initialize();
};

// Update is called every tick
aServerSystem.update = function () {
    mm.update();
};

aServerSystem.onWeatherChanged = function(eventData) {
    let chatEvent = this.createEventData("minecraft:display_chat_event");
    let weather = this.getComponent(server.level, "minecraft:weather");
    chatEvent.data.message = "Detected Weather Change! " + JSON.stringify(weather);
    this.broadcastEvent("minecraft:display_chat_event", chatEvent);
};
