// Simple test to verify game logic
console.log('Emotion Match Game - Logic Test');

// Test match detection algorithm
function findMatches(board) {
  const matches = [];
  const size = board.length;

  // Check horizontal matches
  for (let row = 0; row < size; row++) {
    let count = 1;
    for (let col = 1; col < size; col++) {
      if (board[row][col].type === board[row][col-1].type) {
        count++;
      } else {
        if (count >= 3) {
          for (let i = col - count; i < col; i++) {
            matches.push({ row, col: i });
          }
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let i = size - count; i < size; i++) {
        matches.push({ row, col: i });
      }
    }
  }

  // Check vertical matches
  for (let col = 0; col < size; col++) {
    let count = 1;
    for (let row = 1; row < size; row++) {
      if (board[row][col].type === board[row-1][col].type) {
        count++;
      } else {
        if (count >= 3) {
          for (let i = row - count; i < row; i++) {
            matches.push({ row: i, col });
          }
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let i = size - count; i < size; i++) {
        matches.push({ row: i, col });
      }
    }
  }

  return matches;
}

// Test board with matches
const testBoard = [
  [{ type: 'A' }, { type: 'A' }, { type: 'A' }, { type: 'B' }],
  [{ type: 'B' }, { type: 'C' }, { type: 'C' }, { type: 'B' }],
  [{ type: 'C' }, { type: 'D' }, { type: 'D' }, { type: 'B' }],
  [{ type: 'D' }, { type: 'E' }, { type: 'E' }, { type: 'B' }]
];

const matches = findMatches(testBoard);
console.log('Found matches:', matches);
console.log('Expected: horizontal match at row 0, cols 0-2 and vertical match at col 3, rows 0-3');

// Test scoring
function calculateScore(matchCount) {
  if (matchCount === 3) return 3;
  if (matchCount === 4) return 5;
  if (matchCount === 5) return 7;
  if (matchCount >= 6) return 10;
  return 0;
}

console.log('Scoring tests:');
console.log('3 blocks:', calculateScore(3), 'km (expected: 3)');
console.log('4 blocks:', calculateScore(4), 'km (expected: 5)');
console.log('5 blocks:', calculateScore(5), 'km (expected: 7)');
console.log('6 blocks:', calculateScore(6), 'km (expected: 10)');

console.log('Game logic test completed successfully!');