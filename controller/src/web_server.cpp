#include "web_server.h"

#include <FS.h>
#include <SPIFFS.h>
#include <WiFi.h>

BoardGameWeb::BoardGameWeb(const Config &config)
    : ssid(config.ssid),
      password(config.password) {
    if (!SPIFFS.begin(true)) {
        Serial.println("Couldn't mount SPIFFS");
        while (1);
    }

    setupWifi();
    setupWebServer();
}

void BoardGameWeb::loop() {
    server.handleClient();
}

String BoardGameWeb::contentTypeFromPath(const String &path) {
    if (path.endsWith(".html")) return "text/html";
    if (path.endsWith(".css")) return "text/css";
    if (path.endsWith(".js")) return "application/javascript";
    if (path.endsWith(".json")) return "application/json";
    if (path.endsWith(".svg")) return "image/svg+xml";
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".jpg")) return "image/jpeg";
    if (path.endsWith(".ico")) return "image/x-icon";
    if (path.endsWith(".woff")) return "font/woff";
    if (path.endsWith(".woff2")) return "font/woff2";
    if (path.endsWith(".mp3")) return "audio/mpeg";
    if (path.endsWith(".ogg")) return "audio/ogg";
    return "text/plain";
}

bool BoardGameWeb::serveStaticFile(const String &path) {
    if (!SPIFFS.exists(path)) {
        return false;
    }

    File file = SPIFFS.open(path, "r");
    if (!file) {
        return false;
    }

    // Asset names carry no content hash, so clients must always revalidate
    // to pick up freshly deployed files.
    server.sendHeader("Cache-Control", "no-cache");
    server.streamFile(file, contentTypeFromPath(path));
    file.close();
    return true;
}

void BoardGameWeb::handleRoot() {
    if (!serveStaticFile("/index.html")) {
        server.send(404, "text/plain", "index.html not found");
    }
}

void BoardGameWeb::handleMapPage() {
    if (!serveStaticFile("/map.html")) {
        server.send(404, "text/plain", "map.html not found");
    }
}

void BoardGameWeb::setupWebServer() {
    server.on("/", [this]() { handleRoot(); });
    server.on("/index.html", [this]() { handleRoot(); });
    server.on("/map.html", [this]() { handleMapPage(); });
    server.onNotFound([this]() {
        if (!serveStaticFile(server.uri())) {
            server.send(404, "text/plain", "Not found");
        }
    });
    server.begin();
}

void BoardGameWeb::setupWifi() {
    WiFi.mode(WIFI_AP);
    bool started = WiFi.softAP(ssid, password);
    if (!started) {
        Serial.println("Couldn't start Wi-Fi access point");
        while (1);
    }

    Serial.print("Wi-Fi AP started. IP: ");
    Serial.println(WiFi.softAPIP());
}
