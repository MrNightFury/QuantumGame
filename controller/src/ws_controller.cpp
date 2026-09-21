#include "ws_controller.h"

#include <algorithm>

namespace {
    // Placeholder name generator
    String userName(uint8_t clientId) {
        String name = "player";
        name += clientId;
        return name;
    }
}

WSController::WSController(uint16_t port) : server(port) {
    server.onEvent([this](uint8_t clientId, WStype_t type, uint8_t *payload, size_t length) {
        handleSocketEvent(clientId, type, payload, length);
    });
    // Dead users check
    server.enableHeartbeat(15000, 3000, 2);
    server.begin();
    Serial.printf("[WS] server started on port %u\n", (unsigned)port);
}

void WSController::loop() {
    server.loop();
}

void WSController::on(const char *event, EventHandler handler) {
    Subscription subscription;
    subscription.event = event;
    subscription.handler = handler;
    subscriptions.push_back(subscription);
}

void WSController::send(uint8_t clientId, const char *event, JsonVariantConst data) {
    JsonDocument doc;
    doc["event"] = event;
    doc["data"] = data;

    String message;
    serializeJson(doc, message);
    server.sendTXT(clientId, message);
}

void WSController::broadcast(const char *event, JsonVariantConst data) {
    JsonDocument doc;
    doc["event"] = event;
    doc["data"] = data;

    String message;
    serializeJson(doc, message);
    server.broadcastTXT(message);
}

void WSController::handleSocketEvent(uint8_t clientId, WStype_t type, uint8_t *payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED:
            handleConnected(clientId);
            break;
        case WStype_DISCONNECTED:
            // Might later handle reconnects, but ehh
            handleDisconnected(clientId);
            break;
        case WStype_ERROR:
            // Dont think i need to handle errors, but if i do, it'll be here
            handleDisconnected(clientId);
            break;
        case WStype_TEXT:
            handleText(clientId, payload, length);
            break;
        default:
            break;
    }
}

void WSController::handleConnected(uint8_t clientId) {
    if (std::find(onlineUsers.begin(), onlineUsers.end(), clientId) == onlineUsers.end()) {
        onlineUsers.push_back(clientId);
    }

    Serial.printf("[WS] client %u connected (%u online)\n", (unsigned)clientId, (unsigned)onlineUsers.size());
    sendId(clientId);
    sendOnlineUsers(clientId);
    sendUserConnected(clientId);
}

void WSController::handleDisconnected(uint8_t clientId) {
    auto it = std::find(onlineUsers.begin(), onlineUsers.end(), clientId);
    if (it != onlineUsers.end()) {
        onlineUsers.erase(it);
    }
    Serial.printf("[WS] client %u disconnected (%u online)\n", (unsigned)clientId, (unsigned)onlineUsers.size());
    sendUserDisconnected(clientId);
}

void WSController::handleText(uint8_t clientId, const uint8_t *payload, size_t length) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, reinterpret_cast<const char *>(payload), length);
    if (error) {
        Serial.printf("[WS] dropping malformed message from client %u: %s\n", (unsigned)clientId, error.c_str());
        return;
    }

    JsonVariantConst eventField = doc["event"];
    if (!eventField.is<const char *>()) {
        Serial.printf("[WS] dropping message without string event field from client %u\n", (unsigned)clientId);
        return;
    }

    dispatch(clientId, eventField.as<String>(), doc["data"]);
}

void WSController::dispatch(uint8_t clientId, const String &event, JsonVariantConst data) {
    for (size_t i = 0; i < subscriptions.size(); i++) {
        if (subscriptions[i].event == event) {
            subscriptions[i].handler(clientId, data);
        }
    }
}

void WSController::sendId(uint8_t clientId) {
    JsonDocument data;
    data = clientId;

    send(clientId, "setId", data);
}

void WSController::sendOnlineUsers(uint8_t clientId) {
    JsonDocument data;
    JsonArray users = data.to<JsonArray>();
    for (size_t i = 0; i < onlineUsers.size(); i++) {
        JsonObject user = users.add<JsonObject>();
        user["id"] = onlineUsers[i];
        user["name"] = userName(onlineUsers[i]);
    }

    send(clientId, "setOnlineUsers", data);
}

void WSController::sendUserConnected(uint8_t clientId) {
    JsonDocument data;
    JsonObject user = data.to<JsonObject>();
    user["id"] = clientId;
    user["name"] = userName(clientId);

    for (size_t i = 0; i < onlineUsers.size(); i++) {
        if (onlineUsers[i] != clientId) {
            send(onlineUsers[i], "addOnlineUser", data);
        }
    }
}

void WSController::sendUserDisconnected(uint8_t clientId) {
    JsonDocument data;
    data = clientId;

    broadcast("removeOnlineUser", data);
}
