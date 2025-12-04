# Mechanics Library for Axiomancer

Axiomancer is a turn-based strategy RPG where players control a character who embarks on a journey to discover their true identity and the secrets behind the veil. After the king loses their advisor and opens the gates of the city to find their successor, the player must navigate the challenges of the labyrinth to reach the heart of the city and become the new advisor.

## 📚 Documentation

### Code Quality & Review
- **[REVIEW_SUMMARY.md](./REVIEW_SUMMARY.md)** - Overview of code review and improvements
- **[CODE_REVIEW.md](./CODE_REVIEW.md)** - Comprehensive code analysis with 35+ recommendations
- **[IMPROVEMENTS_IMPLEMENTED.md](./IMPROVEMENTS_IMPLEMENTED.md)** - Detailed changelog of improvements made
- **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** - TypeScript coding standards and best practices

### Game Design
- **[docs/](./docs/)** - Game design documentation and references

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development Commands
```bash
npm run build       # Compile TypeScript
npm run type-check  # Run TypeScript type checking
npm run lint        # Run ESLint
npm run lint:fix    # Fix linting issues

# CLI Tools
npm run character   # Character creation tool
npm run combat      # Combat simulation tool
```

## 📦 Project Structure

```
src/
├── Character/     # Player character system
├── Combat/        # Combat mechanics
├── Effects/       # Status effects and buffs
├── Enemy/         # Enemy characters
├── Game/          # Game state management
├── Items/         # Item system
├── NPCs/          # Non-player characters
├── Skills/        # Skill system
├── Utils/         # Utility functions and type guards
└── World/         # World, maps, and quests
```

## 🛠️ Recent Improvements

The codebase has undergone a comprehensive code review with the following improvements:

### Type Safety ✅
- Fixed invalid type definitions
- Removed redundant array types
- Added discriminated unions for items
- Improved type inference with const assertions

### Code Quality ✅
- Extracted magic numbers to named constants
- Created utility module with common functions
- Added type guards for runtime safety
- Improved error handling with custom error classes

### Documentation ✅
- Comprehensive JSDoc on all new functions
- Style guide for consistent coding
- Detailed code review documentation

See [REVIEW_SUMMARY.md](./REVIEW_SUMMARY.md) for complete details.

## 🎮 Game Systems

### Core Stats
Characters have three base stats:
- **Heart** - Emotion, willpower, charisma
- **Body** - Physical strength, constitution
- **Mind** - Intelligence, reflexes, perception

Each base stat derives four combat stats: Skill, Defense, Save, and Test.

### Combat System
Turn-based combat with rock-paper-scissors mechanics:
- **Heart** > Body > Mind > **Heart** (cyclic advantage)

### Progression
- Level-based progression
- Experience points
- Skill acquisition (fallacies and paradoxes)
- Equipment system (planned)

## 🤝 Contributing

When contributing, please:
1. Follow the [STYLE_GUIDE.md](./STYLE_GUIDE.md)
2. Add JSDoc comments to all functions
3. Extract magic numbers to named constants
4. Use type guards for runtime checks
5. Add input validation where appropriate

## 📝 License

ISC