#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WebSocketsServer.h>
#include <functional>
#include <vector>

// WebSocket controller with a JSON text protocol.
//
// Every message is a JSON object: {"event":"<name>","data":<any JSON value>}.
// "event" (string) selects the handler, "data" carries the event payload.
// Incoming messages are parsed with ArduinoJson on receipt; the subscriber
// gets "data" as JsonVariantConst - a view into the parsed document, valid
// only for the duration of the handler call.
//
// Connection lifecycle broadcasts:
//   connect:    the new client receives {"event":"setId","data":<id>},
//               then {"event":"setOnlineUsers",
//                 "data":[{"id":0,"name":"player0"},...]};
//               the others receive {"event":"addOnlineUser","data":{id,name}}
//   disconnect: everyone receives {"event":"removeOnlineUser","data":<id>}
class WSController {
    public:
        // clientId - websocket connection id, data - parsed "data" field
        // (null variant if the message has no "data").
        using EventHandler = std::function<void(uint8_t clientId, JsonVariantConst data)>;

        explicit WSController(uint16_t port = 81);

        void loop();
        // Subscribe to messages whose "event" field equals event.
        void on(const char *event, EventHandler handler);

        // Compose {"event":<event>,"data":<data>} and send it to one client
        // or to everyone. data is a view into the caller's JSON value and is
        // serialized before returning, so a local JsonDocument works fine.
        void send(uint8_t clientId, const char *event, JsonVariantConst data);
        void broadcast(const char *event, JsonVariantConst data);

    private:
        struct Subscription {
            String event;
            EventHandler handler;
        };

        void handleSocketEvent(uint8_t clientId, WStype_t type, uint8_t *payload, size_t length);
        void handleConnected(uint8_t clientId);
        void handleDisconnected(uint8_t clientId);
        void handleText(uint8_t clientId, const uint8_t *payload, size_t length);
        void dispatch(uint8_t clientId, const String &event, JsonVariantConst data);
        void sendId(uint8_t clientId);
        void sendOnlineUsers(uint8_t clientId);
        void sendUserConnected(uint8_t clientId);
        void sendUserDisconnected(uint8_t clientId);

        WebSocketsServer server;
        std::vector<uint8_t> onlineUsers;
        std::vector<Subscription> subscriptions;
};
