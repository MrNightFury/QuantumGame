#pragma once

#include <Arduino.h>
#include <WebServer.h>
#include <DNSServer.h>

// HTTP server + Wi-Fi access point for the board game
// Serves static pages from SPIFFS
class BoardGameWeb {
    public:
        struct Config {
            const char *ssid;
            const char *password;
        };

        // Starts the Wi-Fi access point, mounts SPIFFS and starts the DNS and HTTP servers
        explicit BoardGameWeb(const Config &config);

        // Pumps HTTP traffic; call from the main loop().
        void loop();

    private:
        String contentTypeFromPath(const String &path);
        bool serveStaticFile(const String &path);
        void handleRoot();
        void handleMapPage();
        void setupWebServer();
        IPAddress setupWifi();
        void setupDNS(IPAddress ip);

        WebServer server{80};
        DNSServer dns;
        const char *ssid = nullptr;
        const char *password = nullptr;
};
