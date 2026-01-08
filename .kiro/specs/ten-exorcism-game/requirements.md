# Requirements Document

## Introduction

Ten Exorcism is a rectangle-based puzzle game where players exorcise ghosts by selecting rectangular groups of tiles whose numeric values sum to exactly 10. The game features a fixed 10×17 grid board with ghost tiles containing power values from 1-9, and players score points by successfully exorcising ghosts through strategic rectangular selections.

## Glossary

- **Game_Board**: A fixed 2D grid of size 10 × 17 containing ghost tiles and empty cells
- **Ghost_Tile**: A cell containing an integer power value from 1 to 9
- **Empty_Cell**: A cell that becomes vacant after successful exorcism
- **Rectangle_Selection**: An axis-aligned rectangular area selected by the player
- **Power_Sum**: The total of all numeric values within a selected rectangle
- **Exorcism**: The process of removing ghost tiles when power sum equals exactly 10
- **Score**: The total number of ghost tiles exorcised during the game
- **Game_Engine**: The core system managing game state, validation, and scoring
- **Board_Seed**: A numeric value used to deterministically generate the initial board
- **Game_Action**: A recorded player action including selection coordinates and timestamp
- **Game_Session**: A complete record of a game including seed, all actions, and final score
- **Action_Log**: An ordered list of all game actions for replay and verification

## Requirements

### Requirement 1: Game Board Management

**User Story:** As a player, I want to see a game board with ghost tiles, so that I can plan my exorcism strategy.

#### Acceptance Criteria

1. THE Game_Board SHALL display a fixed 10 × 17 grid layout
2. WHEN the game starts, THE Game_Board SHALL populate cells with ghost tiles containing power values from 1 to 9
3. THE Game_Board SHALL visually distinguish between ghost tiles and empty cells
4. WHEN a cell is empty, THE Game_Board SHALL display it as vacant space
5. THE Game_Board SHALL maintain consistent visual representation throughout the game

### Requirement 2: Rectangle Selection System

**User Story:** As a player, I want to select rectangular areas of ghost tiles, so that I can attempt exorcisms.

#### Acceptance Criteria

1. WHEN a player drags on the board, THE Game_Engine SHALL create an axis-aligned rectangular selection
2. THE Game_Engine SHALL only allow perfect rectangular selections
3. THE Game_Engine SHALL support single-row rectangles (horizontal lines)
4. THE Game_Engine SHALL support single-column rectangles (vertical lines)
5. THE Game_Engine SHALL support larger rectangles such as 2×2 or 3×4
6. THE Game_Engine SHALL reject non-rectangular shapes
7. WHEN a selection is active, THE Game_Board SHALL visually highlight the selected rectangle

### Requirement 3: Power Sum Validation

**User Story:** As a player, I want the game to validate my selections, so that I know when an exorcism is possible.

#### Acceptance Criteria

1. WHEN a rectangle is selected, THE Game_Engine SHALL calculate the sum of all power values within the rectangle
2. THE Game_Engine SHALL validate that the power sum equals exactly 10 for a successful exorcism
3. WHEN the power sum equals 10, THE Game_Engine SHALL indicate a valid exorcism
4. WHEN the power sum does not equal 10, THE Game_Engine SHALL indicate an invalid selection
5. THE Game_Engine SHALL provide visual feedback for valid and invalid selections

### Requirement 4: Exorcism Resolution

**User Story:** As a player, I want to exorcise ghosts when I make valid selections, so that I can progress in the game.

#### Acceptance Criteria

1. WHEN a valid rectangle is confirmed, THE Game_Engine SHALL remove all ghost tiles within the rectangle
2. WHEN ghost tiles are exorcised, THE Game_Engine SHALL convert them to empty cells
3. THE Game_Engine SHALL award points equal to the number of exorcised tiles
4. WHEN the power sum is not exactly 10, THE Game_Engine SHALL leave the selection unchanged
5. THE Game_Engine SHALL update the score immediately after successful exorcism

### Requirement 5: Board State Management

**User Story:** As a player, I want the board to maintain proper state after exorcisms, so that the game progresses correctly.

#### Acceptance Criteria

1. THE Game_Engine SHALL ensure ghost tiles do not fall after exorcism (no gravity)
2. THE Game_Engine SHALL ensure no new ghost tiles are generated (no refilling)
3. THE Game_Engine SHALL maintain empty cells as permanently vacant
4. THE Game_Engine SHALL preserve the positions of remaining ghost tiles
5. THE Game_Engine SHALL ensure the board becomes progressively sparser over time

### Requirement 6: Score Tracking

**User Story:** As a player, I want to see my current score, so that I can track my progress.

#### Acceptance Criteria

1. THE Game_Engine SHALL initialize the score to zero at game start
2. WHEN ghosts are exorcised, THE Game_Engine SHALL increment the score by the number of exorcised tiles
3. THE Game_Engine SHALL display the current score to the player
4. THE Game_Engine SHALL maintain score accuracy throughout the game session
5. THE Game_Engine SHALL persist the score until game completion

### Requirement 7: Game Progression and End Conditions

**User Story:** As a player, I want to know when the game ends, so that I can see my final score.

#### Acceptance Criteria

1. THE Game_Engine SHALL continuously check for available valid exorcism rectangles
2. WHEN no valid rectangles remain, THE Game_Engine SHALL end the game
3. WHEN the game ends, THE Game_Engine SHALL display the final score
4. THE Game_Engine SHALL provide an option to start a new game
5. THE Game_Engine SHALL prevent further moves after game completion

### Requirement 8: User Interface Integration

**User Story:** As a player, I want an intuitive interface, so that I can easily play the game within the hub.

#### Acceptance Criteria

1. THE Game_Engine SHALL integrate with the existing React component structure
2. THE Game_Engine SHALL use the provided ghost image asset for visual representation
3. THE Game_Engine SHALL maintain responsive design for different screen sizes
4. THE Game_Engine SHALL provide clear visual feedback for all player actions
5. THE Game_Engine SHALL follow the hub's design guidelines while maintaining game-specific styling


### Requirement 9: Deterministic Board Generation

**User Story:** As a system administrator, I want the game board to be reproducible from a seed, so that game sessions can be verified server-side.

#### Acceptance Criteria

1. THE Game_Engine SHALL generate boards using a deterministic pseudo-random number generator
2. WHEN a Board_Seed is provided, THE Game_Engine SHALL produce identical boards for the same seed
3. THE Game_Engine SHALL generate a unique Board_Seed for each new game session
4. THE Game_Engine SHALL store the Board_Seed as part of the Game_Session
5. THE Game_Engine SHALL allow board recreation from a stored seed for verification purposes

### Requirement 10: Action Logging System

**User Story:** As a system administrator, I want all player actions to be logged, so that game sessions can be replayed and verified.

#### Acceptance Criteria

1. WHEN a player makes a selection, THE Game_Engine SHALL record the action with coordinates and timestamp
2. THE Game_Engine SHALL maintain an ordered Action_Log of all game actions
3. THE Game_Engine SHALL include both valid and invalid selection attempts in the log
4. THE Game_Engine SHALL store action timestamps relative to game start time
5. THE Game_Engine SHALL preserve the Action_Log until game session is complete

### Requirement 11: Game Session Management

**User Story:** As a system administrator, I want complete game sessions to be exportable, so that scores can be verified by a backend server.

#### Acceptance Criteria

1. THE Game_Engine SHALL create a Game_Session object containing Board_Seed, Action_Log, and final score
2. WHEN the game ends, THE Game_Engine SHALL finalize the Game_Session with completion timestamp
3. THE Game_Engine SHALL provide a method to export the Game_Session as a serializable object
4. THE Game_Engine SHALL support replaying a Game_Session to verify the final score
5. FOR ALL Game_Sessions, replaying the Action_Log on the seeded board SHALL produce the same final score
