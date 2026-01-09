Ten Exorcism — Game Specification

1. Game Overview
Ten Exorcism is a rectangle-based puzzle game where players exorcise ghosts by selecting rectangular groups of tiles whose numeric values sum to exactly 10.

Each ghost tile has a number representing its power.
When the total power of a selected rectangle equals 10, the ghosts are exorcised and permanently removed from the board.

2. Game Board
- The game board is a fixed 2D grid of size 10 × 17.
- Each cell contains either:
  - a ghost tile with an integer power value from 1 to 9, or
  - an empty cell after exorcism.

3. Objective
- The objective is to maximize the total score.
- Score is defined as the total number of ghost tiles exorcised during the game.

4. Player Action (Exorcism Rule)

4.1 Selection Method
- The player selects tiles by dragging to form an axis-aligned rectangular area.
- The selected area must be a perfect rectangle.

Valid selections include:
- single-row rectangles (horizontal lines),
- single-column rectangles (vertical lines),
- larger rectangles such as 2×2 or 3×4.

Non-rectangular shapes are not allowed.

4.2 Connectivity Rule
- Ghost tiles are considered connected only via up, down, left, or right.
- Diagonal connectivity is not allowed.
- This condition is inherently satisfied by rectangular selection.

4.3 Power Sum Rule
- Each ghost tile has a numeric power value between 1 and 9.
- Let S be the sum of all power values inside the selected rectangle.
- A selection is valid if and only if the total power equals exactly 10.

5. Resolution of a Valid Exorcism
- When a valid rectangle is selected:
  - All ghost tiles inside the rectangle are exorcised.
  - Exorcised tiles become empty cells.
  - The player gains points equal to the number of exorcised tiles.
- If the total power is not exactly 10, the selection has no effect.

6. Board Update Rules
- There is no gravity. Ghost tiles do not fall after exorcism.
- There is no refilling. No new ghost tiles are generated.
- Empty cells remain empty permanently.
- The board becomes progressively sparser over time.

7. Game Progression
- The game continues while valid exorcism rectangles still exist and/or time remains if a timer is implemented.
- The game ends when no valid rectangles remain or the time limit is reached.

8. Strategic Characteristics (Important for AI Design)
- All moves are irreversible.
- Removing ghosts can permanently block or unlock future exorcisms.
- A move with a smaller immediate score may enable larger future exorcisms.
- Finding the globally optimal sequence of moves is computationally intractable for a 10×17 board.

9. Core Design Summary
Ten Exorcism is a puzzle game where players permanently remove rectangular groups of ghost tiles whose power values sum to exactly ten, scoring based on how many ghosts are exorcised.
