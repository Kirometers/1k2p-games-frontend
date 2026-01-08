# Emotion Match - 3-Match Puzzle Game

A React-based 3-match puzzle game where players match emotion blocks to reach high altitudes within a time limit.

## Game Features

### Core Gameplay
- **3-Match Mechanics**: Match 3 or more adjacent blocks horizontally or vertically
- **Swap System**: Click two adjacent blocks to swap them (only valid moves are allowed)
- **Gravity & Cascading**: Blocks fall down when matches are cleared, creating combo opportunities
- **Time Limit**: 60-second countdown with bonus time for successful matches (+2 seconds per match)

### Game Modes
- **Normal Mode**: 10x10 grid with 6 selected emotion characters
- **Hard Mode**: 12x12 grid with 8 selected emotion characters

### Scoring System
- 3 blocks = 3km altitude
- 4 blocks = 5km altitude  
- 5 blocks = 7km altitude
- 6+ blocks = 10km altitude
- Combos are calculated separately and added together

### Special Features
- **Character Selection**: Choose your emotion characters before starting
- **Hint System**: 2 hints per game that highlight possible moves
- **Pause/Resume**: Pause the game anytime during play
- **No Valid Moves Detection**: Game ends if no moves are available

## Game Flow

1. **Main Menu**: Game introduction and start button
2. **Difficulty Selection**: Choose between Normal (10x10) or Hard (12x12) mode
3. **Character Selection**: Pick 6 or 8 emotion characters from 10 available options
4. **Gameplay**: Match blocks within the time limit to maximize altitude
5. **Game Over**: View final score and return to main menu

## Available Emotion Characters

- Black Frightened
- Blue Sad
- Green Disgust
- Grey Love
- Orange Shy
- Pink Happy
- Purple Envy
- Red Angry
- White Smile
- Yellow Frightened

## Technical Implementation

### Performance Optimizations
- React.memo for preventing unnecessary re-renders
- Separated timer component to avoid full board re-renders
- CSS transitions for smooth animations
- Optimized match detection algorithm

### State Management
- useReducer for complex game state management
- Minimal re-renders through careful state structure
- Efficient board update patterns

### Animations
- CSS-based block explosion effects
- Smooth falling animations with transitions
- Hint highlighting with pulsing effects
- Responsive hover and selection states

## Controls

- **Click**: Select/swap blocks
- **Hint Button**: Reveal a possible move (2 uses per game)
- **Pause Button**: Pause/resume game
- **Give Up**: End game early from pause menu

## Game End Conditions

1. **Time Runs Out**: 60-second timer reaches zero
2. **No Valid Moves**: No possible swaps can create matches
3. **Player Gives Up**: Manual game termination

The game emphasizes strategic thinking, pattern recognition, and quick decision-making under time pressure.