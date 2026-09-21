#pragma once

#include <Arduino.h>
#include <WebServer.h>

// HTTP server + Wi-Fi access point for the board game.
// Serves static pages from SPIFFS.
class BoardGameWeb {
    public:
        struct Config {
            const char *ssid;
            const char *password;
        };

        // Starts the Wi-Fi access point, mounts SPIFFS and starts the HTTP server.
        explicit BoardGameWeb(const Config &config);

        // Pumps HTTP traffic; call from the main loop().
        void loop();

    private:
        String contentTypeFromPath(const String &path);
        bool serveStaticFile(const String &path);
        void handleRoot();
        void handleMapPage();
        void setupWebServer();
        void setupWifi();

        WebServer server{80};
        const char *ssid = nullptr;
        const char *password = nullptr;
};
