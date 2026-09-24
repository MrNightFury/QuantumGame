#pragma once

#include <ArduinoJson.h>
#include <memory>
#include <map>

#include "card_effects.h"
#include "card_registry.h"
#include "game_state.h"
#include "nfc_scanner.h"
#include "ws_controller.h"

namespace Game {

// Class for all game logic. Subscribes to events from reader and ws
class GameController {
    public:
        GameController(NfcScanner &scanner, WSController &ws);

    private:
        // Ws event handler; switch by event name.
        void handleWsEvent(const char *event, uint8_t clientId,
                           JsonVariantConst data);
        // Tag handler; switch by card type. Runs in the main loop context (Hopefully)
        void handleTag(const NfcScanner::TagEvent &event);

        // "startGame": creates a fresh GameState and notifies the players.
        void startGame(JsonVariantConst data);
        // "selectTarget": the current player picks the cubit (player index +
        // cubit index in their register) the next scanned card will hit.
        void selectTarget(uint8_t clientId, JsonVariantConst data);
        // "writeCard": arms card registration - the next tag scanned while
        // no game is running is bound to the given card type. An empty type
        // name cancels the pending write (nothing is sent); an actual
        // registration confirms with "cardWritten" to the sender.
        void writeCard(uint8_t clientId, JsonVariantConst data);
        // "giveUp": the sender admits defeat, the game ends with another
        // player as the winner.
        void giveUp(uint8_t clientId);
        // "cardInput": the current player supplies the extra input the
        // pending card is waiting for (a second target or a chosen face).
        void cardInput(uint8_t clientId, JsonVariantConst data);
        // Ends the running game and sends "gameEnded" to the participants.
        void endGame(size_t winnerIndex);
        // Applies the card with the given inputs, burns the tag uid, advances
        // the turn and notifies the players. Returns false if the card had no
        // effect and was ignored.
        bool commitCard(CardRegistry::CardType type, const uint8_t *uid,
                        uint8_t uidLength, const CardParams &params);
        // The card cannot be played: drops the aim and any pending input,
        // tells the current player the reason id. The card is not consumed.
        void refusePlay(const char *reason);
        // Builds the data payload of a "setGameState" event.
        JsonDocument buildGameStateDoc() const;

        NfcScanner &scanner;
        WSController &ws;

        CardRegistry cards;                    // uid -> card type (NVS-backed)
        std::unique_ptr<GameState> gameState;  // null = no game yet
        bool isGameOn = false;                 // a game session is running

        // Armed by "writeCard": the next tag scanned outside a game is
        // registered with this type instead of being reported.
        bool awaitingCard = false;
        CardRegistry::CardType pendingCardType;
        // Client that armed the pending write; it receives "cardWritten".
        uint8_t pendingWriteClient = 0;

        // Cubit chosen by the current player for the next scanned card.
        bool hasTarget = false;
        Target target;

        // A card scanned during a game that needs extra input (a second
        // target or a chosen face) before it can be applied. The primary
        // target is the current aim (hasTarget/target); the extra input
        // arrives via "cardInput" and applies the card immediately.
        bool pendingPlayActive = false;
        CardRegistry::CardType pendingPlayType;
        uint8_t pendingPlayUid[8];
        uint8_t pendingPlayUidLength = 0;

        // Armed by a scanned kronecker_multiplication card (the card itself
        // is free - it takes no card slot): the next two applied cards form
        // a pair that costs a single card slot. The first card of the pair
        // fixes the registers the pair is bound to (every register it
        // involved; a card without a target binds none, leaving the pair
        // unrestricted). While the list is empty the second card may target
        // any register.
        bool kroneckerActive = false;
        size_t kroneckerPairCards = 0;           // 0 or 1 cards of the pair applied
        std::vector<size_t> kroneckerRegisters;  // registers the pair is bound to
};

}  // namespace Game
