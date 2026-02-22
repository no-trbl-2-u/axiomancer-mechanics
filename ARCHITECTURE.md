# Axiomancer Mechanics — Architecture

```mermaid
flowchart TD

    subgraph CLI["Entry Points"]
        CombatCLI["combat.cli\nCLI simulator"]
        CharCLI["character.cli\nCLI character builder"]
    end

    subgraph Core["Core State"]
        Game["Game\nGameState · save / load\nactions.constants"]
    end

    subgraph Systems["Game Systems"]
        Combat["Combat\nturns · rolls · advantage\nrock-paper-scissors types"]
        World["World\nmaps · quests · nodes\ncontinents"]
    end

    subgraph Entities["Entities"]
        Character["Character\nbase stats · derived stats\nHP · mana · inventory"]
        Enemy["Enemy\nenemyStats · AI logic\nenemy library"]
        Items["Items\nequipment · consumables\nmaterials · quest items"]
        Skills["Skills\nfallacies · paradoxes\ncombat effects"]
        Effects["Effects\nbuffs · debuffs\nstatus effects"]
        NPCs["NPCs\ndialogue maps"]
    end

    subgraph Foundation["Foundation"]
        Utils["Utils\ndice rolls · math helpers\ndeep clone · type guards"]
    end

    %% ── CLI entry points ──────────────────────────────────────────────────────
    CombatCLI --> Combat
    CombatCLI --> Game
    CharCLI   --> Character

    %% ── Game orchestrates everything ──────────────────────────────────────────
    Game --> Character
    Game --> World
    Game --> Combat

    %% ── Combat system ─────────────────────────────────────────────────────────
    Combat --> Character
    Combat --> Enemy
    Combat --> Utils

    %% ── World system ──────────────────────────────────────────────────────────
    World --> Items
    World --> NPCs
    World --> Utils
    World -.->|type| Enemy

    %% ── Character ─────────────────────────────────────────────────────────────
    Character --> Utils
    Character -.->|type| Items

    %% ── Enemy ─────────────────────────────────────────────────────────────────
    Enemy --> Skills
    Enemy -.->|type| Combat
    Enemy -.->|type| Items
    Enemy -.->|type| World

    %% ── Supporting modules ────────────────────────────────────────────────────
    Skills  --> Character
    Effects -.->|type| Combat
    NPCs    -.->|type| Utils
    Items   -.->|type| Game

    %% ── Utils type guards reach back up ───────────────────────────────────────
    Utils -.->|type| Combat
    Utils -.->|type| Character
    Utils -.->|type| Enemy
    Utils -.->|type| Game

    %% ── Styles ────────────────────────────────────────────────────────────────
    style CLI       fill:#1e1e2e,stroke:#585b70,color:#cdd6f4
    style Core      fill:#1e1e2e,stroke:#585b70,color:#cdd6f4
    style Systems   fill:#1e1e2e,stroke:#585b70,color:#cdd6f4
    style Entities  fill:#1e1e2e,stroke:#585b70,color:#cdd6f4
    style Foundation fill:#1e1e2e,stroke:#585b70,color:#cdd6f4

    style CombatCLI fill:#313244,stroke:#89b4fa,color:#cdd6f4
    style CharCLI   fill:#313244,stroke:#89b4fa,color:#cdd6f4

    style Game      fill:#313244,stroke:#a6e3a1,color:#cdd6f4

    style Combat    fill:#313244,stroke:#f38ba8,color:#cdd6f4
    style World     fill:#313244,stroke:#fab387,color:#cdd6f4

    style Character fill:#313244,stroke:#89dceb,color:#cdd6f4
    style Enemy     fill:#313244,stroke:#f38ba8,color:#cdd6f4
    style Items     fill:#313244,stroke:#f9e2af,color:#cdd6f4
    style Skills    fill:#313244,stroke:#cba6f7,color:#cdd6f4
    style Effects   fill:#313244,stroke:#cba6f7,color:#cdd6f4
    style NPCs      fill:#313244,stroke:#89dceb,color:#cdd6f4

    style Utils     fill:#313244,stroke:#a6e3a1,color:#cdd6f4
```

## Legend

| Arrow | Meaning |
|-------|---------|
| `-->` | Runtime import — values, functions, instances |
| `-.->` | Type-only import — interfaces and type aliases only |

## Module Summary

| Module | Role |
|--------|------|
| **Game** | Top-level state orchestrator; handles save/load and wires all systems together |
| **Combat** | Turn logic, dice rolls, type-advantage (Heart › Body › Mind › Heart), battle log |
| **World** | Map graph, quest tracking, continent definitions, node traversal |
| **Character** | Player character creation; derives stats from `BaseStats`; owns inventory |
| **Enemy** | Enemy definitions, stat tables, AI decision logic |
| **Items** | Equipment, consumables, materials, quest items; inventory reducers |
| **Skills** | Fallacy/paradox-themed combat skills; usage and damage calculation |
| **Effects** | Buff/debuff system; status effect types and application results |
| **NPCs** | Dialogue maps for non-player characters |
| **Utils** | Pure utility functions — dice creation, math helpers, deep clone, type guards |
```
