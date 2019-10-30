const aServerSystem = server.registerSystem(0, 0);

/**
 * Base Minion Miners controller.
 */
MinionMiners = function(injectServer) {
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
    // Update is called every tick
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
MMCalendar = function() {
    var config = {
        rlMinutesInDay: 1
    };
    var ticksInHour = 1000;
    var mm = null;
    var timeOfDay = {
        hour: 0,
        minute: 0,
        second: 0,
        tick: 0
    };
    var syncing = false;
    var ready = false;
    this.initialize = function(injectMinionMiners) {
        mm = injectMinionMiners;
        // Convert minutes in day to number of ticks in an hour
        mm.getServer().executeCommand("/gamerule dodaylightcycle false", () => {});
        ticksInHour = config.rlMinutesInDay * 50;
    };
    this.update = function() {
        if (mm.isReady()) {
            if (ready == false && syncing == false) {
                this.syncTimeOfDay();
            }
            if (ready == true) {
                timeOfDay.tick++;
                // Recalculate time more often when minutes in day is low, less often when minutes in day is high.
                if (timeOfDay.tick % config.rlMinutesInDay == 0) {
                    timeOfDay.hour = Math.floor(timeOfDay.tick / ticksInHour);
                    if (timeOfDay.hour >= 24) {
                        timeOfDay.hour = 0;
                        timeOfDay.tick = 0;
                    }
                    timeOfDay.minute = Math.floor((timeOfDay.tick - (timeOfDay.hour * ticksInHour)) / (ticksInHour / 60));
                    mm.getServer().executeCommand("/time set " + Math.floor((timeOfDay.hour * 1000) + (timeOfDay.minute * (1000 / 60))), () => {});
                }
            }
        }
    };
    this.syncTimeOfDay = function() {
        syncing = true;
        mm.getServer().executeCommand("/time query daytime", (resultData) => {
            var n = resultData.data.body.split(" ");
            timeOfDay.tick = n[n.length - 1];
            syncing = false
            ready = true;
        });  
    };
};


let mm = new MinionMiners(aServerSystem);
mm.registerModule(new MMCalendar())

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
