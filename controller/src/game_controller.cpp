#include "game_controller.h"

#include <Arduino.h>
#include <string.h>
#include <vector>

namespace Game {

GameController::GameController(NfcScanner &scanner, WSController &ws)
    : scanner(scanner), ws(ws) {
    // Stored registry (if any) overrides the hardcoded defaults.
    cards.load();
    scanner.onTag([this](const NfcScanner::TagEvent &event) { handleTag(event); });
    ws.on("startGame", [this](uint8_t clientId, JsonVariantConst data) {
        handleWsEvent("startGame", clientId, data);
    });
    ws.on("selectTarget", [this](uint8_t clientId, JsonVariantConst data) {
        handleWsEvent("selectTarget", clientId, data);
    });
    ws.on("writeCard", [this](uint8_t clientId, JsonVariantConst data) {
        handleWsEvent("writeCard", clientId, data);
    });
    ws.on("giveUp", [this](uint8_t clientId, JsonVariantConst data) {
        handleWsEvent("giveUp", clientId, data);
    });
    ws.on("cardInput", [this](uint8_t clientId, JsonVariantConst data) {
        handleWsEvent("cardInput", clientId, data);
    });
}

void GameController::handleWsEvent(const char *event, uint8_t clientId,
                                   JsonVariantConst data) {
    // Switch by event name.
    if (strcmp(event, "startGame") == 0) {
        startGame(data);
    } else if (strcmp(event, "selectTarget") == 0) {
        selectTarget(clientId, data);
    } else if (strcmp(event, "writeCard") == 0) {
        writeCard(clientId, data);
    } else if (strcmp(event, "giveUp") == 0) {
        giveUp(clientId);
    } else if (strcmp(event, "cardInput") == 0) {
        cardInput(clientId, data);
    } else {
        Serial.printf("[Game] Unknown ws event: %s\n", event);
    }
}

void GameController::handleTag(const NfcScanner::TagEvent &event) {
    // Not in game: register card or report scan
    if (!isGameOn || !gameState) {
        CardRegistry::CardType type;
        bool registered = cards.lookup(event.uid, event.uidLength, type);

        if (awaitingCard) {
            cards.set(event.uid, event.uidLength, pendingCardType);
            cards.save();
            awaitingCard = false;
            Serial.printf("[Game] Card registered as %s\n",
                          CardRegistry::toString(pendingCardType));
            // No data: only the writer needs to know the write is done.
            JsonDocument writtenDoc;
            ws.send(pendingWriteClient, "cardWritten", writtenDoc);
            return;
        }

        Serial.printf("[Game] Card scanned: %s\n",
                      registered ? CardRegistry::toString(type) : "unknown");
        JsonDocument scannedDoc;
        scannedDoc["registered"] = registered;
        if (registered) {
            scannedDoc["type"] = CardRegistry::toString(type);
        }
        ws.broadcast("cardScanned", scannedDoc);
        return;
    }

    CardRegistry::CardType type;
    if (!cards.lookup(event.uid, event.uidLength, type)) {
        Serial.print("[Game] Unknown card (uid:");
        for (uint8_t i = 0; i < event.uidLength; i++) {
            Serial.printf(" %02X", event.uid[i]);
        }
        Serial.println(")");
        return;
    }

    Serial.printf("[Game] Card %s\n", CardRegistry::toString(type));

    if (gameState->isCardPlayed(event.uid, event.uidLength) && false) { // TODO: remove the && false when we want to enforce one-time use of cards
        Serial.println("[Game] Card ignored, already played this game");
        return;
    }
    if (pendingPlayActive) {
        Serial.println("[Game] Card ignored, a card is awaiting input");
        return;
    }

    CardRequirement requirement = cardRequirement(type);

    // Cards that need no aim apply on their own.
    if (requirement == CardRequirement::None) {
        commitCard(type, event.uid, event.uidLength, CardParams());
        return;
    }

    if (!hasTarget) {
        Serial.println("[Game] Card ignored, no target selected");
        return;
    }

    if (requirement == CardRequirement::OneTarget) {
        CardParams params;
        params.primary = target;
        commitCard(type, event.uid, event.uidLength, params);
        return;
    }

    // TwoTargets / TargetAndFace: hold the card until the extra input arrives.
    pendingPlayActive = true;
    pendingPlayType = type;
    memcpy(pendingPlayUid, event.uid, event.uidLength);
    pendingPlayUidLength = event.uidLength;

    JsonDocument promptDoc;
    promptDoc["card"] = CardRegistry::toString(type);
    if (requirement == CardRequirement::TwoTargets) {
        promptDoc["need"] = "secondTarget";
    } else {
        promptDoc["need"] = "face";
        JsonArray faces = promptDoc["faces"].to<JsonArray>();
        Die::Face faceBuf[6];
        size_t count = allowedFaces(type, *gameState, target, faceBuf, 6);
        for (size_t i = 0; i < count; i++) {
            faces.add(Die::toString(faceBuf[i]));
        }
    }
    ws.send(gameState->playerIds[gameState->currentPlayer], "cardNeedsInput",
            promptDoc);
    Serial.printf("[Game] Card %s awaits input\n", CardRegistry::toString(type));
}

void GameController::startGame(JsonVariantConst data) {
    if (isGameOn) {
        Serial.println("[Game] startGame ignored, a game is already in progress");
        return;
    }

    JsonArrayConst players = data["players"];
    JsonVariantConst cubitCount = data["cubitCount"];
    if (players.isNull() || players.size() == 0 || !cubitCount.is<unsigned int>() ||
        cubitCount.as<unsigned int>() == 0) {
        Serial.println("[Game] startGame has invalid data");
        return;
    }

    std::vector<uint8_t> playerIds;
    for (JsonVariantConst player : players) {
        if (!player.is<unsigned int>()) {
            Serial.println("[Game] startGame has invalid data");
            return;
        }
        playerIds.push_back(player.as<uint8_t>());
    }
    size_t diceCount = cubitCount.as<size_t>();

    gameState.reset(new GameState(playerIds, diceCount));
    isGameOn = true;
    hasTarget = false;
    pendingPlayActive = false;
    Serial.printf("[Game] Game started: %u players, %u dice\n",
                  (unsigned int)playerIds.size(), (unsigned int)diceCount);

    // Report to players that yes, we started
    JsonDocument startedDoc;
    JsonArray startedPlayers = startedDoc["players"].to<JsonArray>();
    for (uint8_t id : playerIds) {
        startedPlayers.add(id);
    }
    startedDoc["cubitCount"] = diceCount;
    for (uint8_t id : playerIds) {
        ws.send(id, "gameStarted", startedDoc);
    }

    // Initial game state
    JsonDocument stateDoc = buildGameStateDoc();
    for (uint8_t id : playerIds) {
        ws.send(id, "setGameState", stateDoc);
    }
}

void GameController::selectTarget(uint8_t clientId, JsonVariantConst data) {
    if (!isGameOn || !gameState) {
        Serial.println("[Game] selectTarget ignored, no game in progress");
        return;
    }

    // Check if the sender is the current player
    const GameState &state = *gameState;
    if (state.playerIds[state.currentPlayer] != clientId) {
        Serial.printf("[Game] selectTarget ignored, not client %u's turn\n",
                      clientId);
        return;
    }
    if (pendingPlayActive) {
        Serial.println("[Game] selectTarget ignored, a card is awaiting input");
        return;
    }

    JsonVariantConst player = data["player"];
    JsonVariantConst cubit = data["cubit"];
    if (!player.is<unsigned int>() || !cubit.is<unsigned int>()) {
        Serial.println("[Game] selectTarget has invalid data");
        return;
    }
    size_t playerIndex = player.as<size_t>();
    size_t cubitIndex = cubit.as<size_t>();
    if (playerIndex >= state.registers.size() ||
        cubitIndex >= state.registers[playerIndex].dice.size()) {
        Serial.println("[Game] selectTarget points outside the registers");
        return;
    }

    target = {playerIndex, cubitIndex};
    hasTarget = true;
    Serial.printf("[Game] Target: player %u cubit %u\n",
                  (unsigned int)playerIndex, (unsigned int)cubitIndex);
}

void GameController::writeCard(uint8_t clientId, JsonVariantConst data) {
    if (!data.is<const char *>()) {
        Serial.println("[Game] writeCard has invalid data");
        return;
    }
    const char *typeName = data.as<const char *>();

    // An empty type name cancels the pending write. Maybe thats stupid, will think about it later
    if (typeName[0] == '\0') {
        awaitingCard = false;
        Serial.println("[Game] Pending card write cancelled");
        return;
    }

    CardRegistry::CardType type;
    if (!CardRegistry::fromString(typeName, type)) {
        Serial.printf("[Game] writeCard: unknown card type %s\n", typeName);
        return;
    }

    pendingCardType = type;
    pendingWriteClient = clientId;
    awaitingCard = true;
    Serial.printf("[Game] Waiting for a card to register as %s\n", typeName);
}

bool GameController::commitCard(CardRegistry::CardType type,
                                const uint8_t *uid, uint8_t uidLength,
                                const CardParams &params) {
    if (!applyCard(type, *gameState, params)) {
        Serial.println("[Game] Card ignored, no effect");
        return false;
    }
    gameState->playedCardUids.emplace_back(uid, uid + uidLength);
    // Record the card in the history of every cubit it affected (the whole
    // window for the x3 cards).
    size_t cubits[3];
    size_t cubitCount = affectedCubits(type, *gameState, params.primary, cubits, 3);
    for (size_t i = 0; i < cubitCount; i++) {
        gameState->cardHistory[params.primary.player][cubits[i]].push_back(type);
    }
    hasTarget = false;  // the chosen cubit is consumed by the card

    // Two cards per turn
    // Pass the turn before notifying the players
    gameState->playedCards++;
    if (gameState->playedCards >= GameState::CARDS_PER_TURN) {
        gameState->currentPlayer =
            (gameState->currentPlayer + 1) % gameState->playerIds.size();
        gameState->playedCards = 0;
    }

    JsonDocument playedDoc;
    playedDoc["target"]["register"] = params.primary.player;
    playedDoc["target"]["cubit"] = params.primary.cubit;
    playedDoc["card"] = CardRegistry::toString(type);

    JsonDocument stateDoc = buildGameStateDoc();
    for (uint8_t id : gameState->playerIds) {
        // "cardPlayerd" will be removed later ig if i wont come up with something to use it for
        ws.send(id, "cardPlayed", playedDoc);
        ws.send(id, "setGameState", stateDoc);
    }

    // Win check
    for (size_t i = 0; i < gameState->registers.size(); i++) {
        if (gameState->registers[i] == gameState->targetRegister) {
            Serial.printf("[Game] Player %u reached the target register\n",
                          gameState->playerIds[i]);
            endGame(i);
            break;
        }
    }
    return true;
}

void GameController::cardInput(uint8_t clientId, JsonVariantConst data) {
    if (!isGameOn || !gameState) {
        Serial.println("[Game] cardInput ignored, no game in progress");
        return;
    }
    if (!pendingPlayActive) {
        Serial.println("[Game] cardInput ignored, no card awaiting input");
        return;
    }

    // Check if the sender is the current player
    const GameState &state = *gameState;
    if (state.playerIds[state.currentPlayer] != clientId) {
        Serial.printf("[Game] cardInput ignored, not client %u's turn\n",
                      clientId);
        return;
    }

    CardRequirement requirement = cardRequirement(pendingPlayType);
    CardParams params;
    params.primary = target;

    if (requirement == CardRequirement::TwoTargets) {
        JsonVariantConst player = data["secondTarget"]["player"];
        JsonVariantConst cubit = data["secondTarget"]["cubit"];
        if (!player.is<unsigned int>() || !cubit.is<unsigned int>()) {
            Serial.println("[Game] cardInput has invalid second target");
            return;
        }
        size_t playerIndex = player.as<size_t>();
        size_t cubitIndex = cubit.as<size_t>();
        if (playerIndex >= state.registers.size() ||
            cubitIndex >= state.registers[playerIndex].dice.size()) {
            Serial.println("[Game] cardInput second target outside the registers");
            return;
        }
        params.hasSecond = true;
        params.second = {playerIndex, cubitIndex};
    } else if (requirement == CardRequirement::TargetAndFace) {
        JsonVariantConst faceName = data["face"];
        if (!faceName.is<const char *>()) {
            Serial.println("[Game] cardInput has invalid face");
            return;
        }
        Die::Face faceBuf[6];
        size_t count = allowedFaces(pendingPlayType, state, target, faceBuf, 6);
        bool found = false;
        for (size_t i = 0; i < count; i++) {
            if (strcmp(Die::toString(faceBuf[i]), faceName.as<const char *>()) == 0) {
                params.face = faceBuf[i];
                found = true;
                break;
            }
        }
        if (!found) {
            Serial.println("[Game] cardInput face not allowed");
            return;
        }
        params.hasFace = true;
    } else {
        Serial.println("[Game] cardInput ignored, card needs no input");
        return;
    }

    pendingPlayActive = false;
    commitCard(pendingPlayType, pendingPlayUid, pendingPlayUidLength, params);
}

void GameController::giveUp(uint8_t clientId) {
    if (!isGameOn || !gameState) {
        Serial.println("[Game] giveUp ignored, no game in progress");
        return;
    }

    const GameState &state = *gameState;
    size_t senderIndex = state.playerIds.size();
    for (size_t i = 0; i < state.playerIds.size(); i++) {
        if (state.playerIds[i] == clientId) {
            senderIndex = i;
            break;
        }
    }
    if (senderIndex == state.playerIds.size()) {
        Serial.printf("[Game] giveUp ignored, client %u is not a player\n",
                      clientId);
        return;
    }

    if (state.playerIds.size() < 2) {
        // Ehh. Dont remember why i wrote this...
        isGameOn = false;
        hasTarget = false;
        pendingPlayActive = false;
        Serial.println("[Game] Sole player gave up, game stopped");
        return;
    }

    // The next participant in player order wins (with two players: the other one)
    size_t winnerIndex = (senderIndex + 1) % state.playerIds.size();
    Serial.printf("[Game] Player %u gave up\n", clientId);
    endGame(winnerIndex);
}

void GameController::endGame(size_t winnerIndex) {
    uint8_t winnerId = gameState->playerIds[winnerIndex];
    isGameOn = false;
    hasTarget = false;
    pendingPlayActive = false;

    // Same naming as the online users list.
    String winnerName = "player";
    winnerName += winnerId;

    JsonDocument endedDoc;
    endedDoc["winnerId"] = winnerId;
    endedDoc["winnerName"] = winnerName;
    for (uint8_t id : gameState->playerIds) {
        ws.send(id, "gameEnded", endedDoc);
    }
}

JsonDocument GameController::buildGameStateDoc() const {
    const GameState &state = *gameState;

    JsonDocument doc;

    JsonArray players = doc["players"].to<JsonArray>();
    for (uint8_t id : state.playerIds) {
        players.add(id);
    }

    JsonArray registers = doc["registers"].to<JsonArray>();
    for (const Register &reg : state.registers) {
        JsonArray faces = registers.add<JsonArray>();
        for (const Die &die : reg.dice) {
            faces.add(die.faceString());
        }
    }

    JsonArray target = doc["targetRegister"].to<JsonArray>();
    for (const Die &die : state.targetRegister.dice) {
        target.add(die.faceString());
    }

    // Only the last card played on each cubit is sent; the controller keeps
    // the full history in GameState::cardHistory.
    JsonArray fieldCards = doc["cardsOnField"].to<JsonArray>();
    for (size_t player = 0; player < state.cardHistory.size(); player++) {
        for (size_t cubit = 0; cubit < state.cardHistory[player].size(); cubit++) {
            const std::vector<CardRegistry::CardType> &history =
                state.cardHistory[player][cubit];
            if (history.empty()) {
                continue;
            }
            JsonObject cardObj = fieldCards.add<JsonObject>();
            cardObj["player"] = player;
            cardObj["cubit"] = cubit;
            cardObj["card"] = CardRegistry::toString(history.back());
        }
    }

    doc["currentPlayer"] = state.currentPlayer;
    doc["playedCards"] = state.playedCards;
    return doc;
}

}  // namespace Game
