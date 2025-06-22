class ChessGame {
            constructor() {
                this.board = this.initializeBoard();
                this.currentPlayer = 'white';
                this.selectedSquare = null;
                this.gameOver = false;
                this.whitePlayerName = '';
                this.blackPlayerName = '';
                this.capturedPieces = { white: [], black: [] };
                this.moveHistory = [];
                this.enPassantTarget = null;
                this.castlingRights = {
                    white: { kingside: true, queenside: true },
                    black: { kingside: true, queenside: true }
                };
                
                this.pieceSymbols = {
                    white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
                    black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
                };
                
                this.initializeEventListeners();
                this.showPlayerNamesModal();
            }
            
            initializeBoard() {
                const board = Array(8).fill(null).map(() => Array(8).fill(null));
                
                // Place pawns
                for (let col = 0; col < 8; col++) {
                    board[1][col] = { type: 'pawn', color: 'white' };
                    board[6][col] = { type: 'pawn', color: 'black' };
                }
                
                // Place other pieces
                const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
                for (let col = 0; col < 8; col++) {
                    board[0][col] = { type: backRank[col], color: 'white' };
                    board[7][col] = { type: backRank[col], color: 'black' };
                }
                
                return board;
            }
            
            initializeEventListeners() {
                document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
                document.getElementById('newGameBtn').addEventListener('click', () => this.showPlayerNamesModal());
                document.getElementById('undoBtn').addEventListener('click', () => this.undoMove());
                document.getElementById('offerDrawBtn').addEventListener('click', () => this.offerDraw());
                document.getElementById('acceptDrawBtn').addEventListener('click', () => this.acceptDraw());
                document.getElementById('declineDrawBtn').addEventListener('click', () => this.declineDraw());
                document.getElementById('playAgainBtn').addEventListener('click', () => {
                        document.getElementById('gameOverModal').style.display = 'none';
                        this.showPlayerNamesModal();
                });
            }
            
            showPlayerNamesModal() {
                document.getElementById('playerNamesModal').style.display = 'block';
                document.getElementById('whitePlayerName').focus();
            }
            
            startGame() {
                const whiteName = document.getElementById('whitePlayerName').value.trim() || 'White Player';
                const blackName = document.getElementById('blackPlayerName').value.trim() || 'Black Player';
                
                this.whitePlayerName = whiteName;
                this.blackPlayerName = blackName;
                
                document.getElementById('playerNamesModal').style.display = 'none';
                
                this.resetGame();
                this.renderBoard();
                this.updateUI();
            }
            
            resetGame() {
                this.board = this.initializeBoard();
                this.currentPlayer = 'white';
                this.selectedSquare = null;
                this.gameOver = false;
                this.capturedPieces = { white: [], black: [] };
                this.moveHistory = [];
                this.enPassantTarget = null;
                this.castlingRights = {
                    white: { kingside: true, queenside: true },
                    black: { kingside: true, queenside: true }
                };
            }
            
            renderBoard() {
                const chessboard = document.getElementById('chessboard');
                chessboard.innerHTML = '';
                
                for (let row = 7; row >= 0; row--) {
                    for (let col = 0; col < 8; col++) {
                        const square = document.createElement('div');
                        square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                        square.dataset.row = row;
                        square.dataset.col = col;
                        
                        const piece = this.board[row][col];
                        if (piece) {
                            const pieceElement = document.createElement('span');
                            pieceElement.className = `piece ${piece.color}`;
                            pieceElement.textContent = this.pieceSymbols[piece.color][piece.type];
                            square.appendChild(pieceElement);
                        }
                        
                        square.addEventListener('click', () => this.handleSquareClick(row, col));
                        chessboard.appendChild(square);
                    }
                }
            }
            
            handleSquareClick(row, col) {
                if (this.gameOver) return;
                
                const piece = this.board[row][col];
                
                if (this.selectedSquare) {
                    const [selectedRow, selectedCol] = this.selectedSquare;
                    
                    if (selectedRow === row && selectedCol === col) {
                        // Deselect current piece
                        this.selectedSquare = null;
                        this.renderBoard();
                        return;
                    }
                    
                    if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                        this.makeMove(selectedRow, selectedCol, row, col);
                        this.selectedSquare = null;
                    } else if (piece && piece.color === this.currentPlayer) {
                        // Select new piece
                        this.selectedSquare = [row, col];
                        this.highlightValidMoves(row, col);
                    } else {
                        this.selectedSquare = null;
                        this.renderBoard();
                    }
                } else if (piece && piece.color === this.currentPlayer) {
                    this.selectedSquare = [row, col];
                    this.highlightValidMoves(row, col);
                }
            }
            
            highlightValidMoves(row, col) {
                this.renderBoard();
                
                const squares = document.querySelectorAll('.square');
                squares.forEach(square => {
                    const squareRow = parseInt(square.dataset.row);
                    const squareCol = parseInt(square.dataset.col);
                    
                    if (squareRow === row && squareCol === col) {
                        square.classList.add('selected');
                    } else if (this.isValidMove(row, col, squareRow, squareCol)) {
                        square.classList.add('valid-move');
                    }
                });
                
                // Highlight king if in check
                this.highlightCheck();
            }
            
            isValidMove(fromRow, fromCol, toRow, toCol) {
                const piece = this.board[fromRow][fromCol];
                if (!piece || piece.color !== this.currentPlayer) return false;
                
                // Check if move is within bounds
                if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
                
                // Can't capture own piece
                const targetPiece = this.board[toRow][toCol];
                if (targetPiece && targetPiece.color === piece.color) return false;
                
                // Check piece-specific movement
                if (!this.isPieceMovementValid(piece.type, fromRow, fromCol, toRow, toCol, piece.color)) {
                    return false;
                }
                
                // Test if move would leave king in check
                const tempBoard = this.copyBoard();
                const tempMove = this.makeTemporaryMove(fromRow, fromCol, toRow, toCol, tempBoard);
                if (this.isKingInCheck(piece.color, tempBoard)) {
                    return false;
                }
                
                return true;
            }
            
            isPieceMovementValid(pieceType, fromRow, fromCol, toRow, toCol, color) {
                const rowDiff = toRow - fromRow;
                const colDiff = toCol - fromCol;
                const absRowDiff = Math.abs(rowDiff);
                const absColDiff = Math.abs(colDiff);
                
                switch (pieceType) {
                    case 'pawn':
                        return this.isPawnMoveValid(fromRow, fromCol, toRow, toCol, color);
                    case 'rook':
                        return (rowDiff === 0 || colDiff === 0) && this.isPathClear(fromRow, fromCol, toRow, toCol);
                    case 'bishop':
                        return absRowDiff === absColDiff && this.isPathClear(fromRow, fromCol, toRow, toCol);
                    case 'queen':
                        return ((rowDiff === 0 || colDiff === 0) || (absRowDiff === absColDiff)) && 
                               this.isPathClear(fromRow, fromCol, toRow, toCol);
                    case 'knight':
                        return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
                    case 'king':
                        return this.isKingMoveValid(fromRow, fromCol, toRow, toCol, color);
                    default:
                        return false;
                }
            }
            
            isPawnMoveValid(fromRow, fromCol, toRow, toCol, color) {
                const direction = color === 'white' ? 1 : -1;
                const startRow = color === 'white' ? 1 : 6;
                const rowDiff = toRow - fromRow;
                const colDiff = Math.abs(toCol - fromCol);
                
                // Forward move
                if (colDiff === 0) {
                    if (rowDiff === direction && !this.board[toRow][toCol]) {
                        return true;
                    }
                    if (fromRow === startRow && rowDiff === 2 * direction && !this.board[toRow][toCol] && !this.board[fromRow + direction][fromCol]) {
                        return true;
                    }
                }
                
                // Diagonal capture
                if (colDiff === 1 && rowDiff === direction) {
                    const targetPiece = this.board[toRow][toCol];
                    if (targetPiece && targetPiece.color !== color) {
                        return true;
                    }
                    
                    // En passant
                    if (this.enPassantTarget && 
                        this.enPassantTarget.row === toRow && 
                        this.enPassantTarget.col === toCol) {
                        return true;
                    }
                }
                
                return false;
            }
            
            isKingMoveValid(fromRow, fromCol, toRow, toCol, color) {
                const rowDiff = Math.abs(toRow - fromRow);
                const colDiff = Math.abs(toCol - fromCol);
                
                // Normal king move
                if (rowDiff <= 1 && colDiff <= 1) {
                    return true;
                }
                
                // Castling
                if (rowDiff === 0 && colDiff === 2) {
                    return this.canCastle(fromRow, fromCol, toRow, toCol, color);
                }
                
                return false;
            }
            
            canCastle(fromRow, fromCol, toRow, toCol, color) {
                // Check if king and rook haven't moved
                if (!this.castlingRights[color]) return false;
                
                const isKingside = toCol > fromCol;
                if (isKingside && !this.castlingRights[color].kingside) return false;
                if (!isKingside && !this.castlingRights[color].queenside) return false;
                
                // Check if king is in check
                if (this.isKingInCheck(color)) return false;
                
                // Check if path is clear and king doesn't pass through check
                const rookCol = isKingside ? 7 : 0;
                const direction = isKingside ? 1 : -1;
                
                for (let col = fromCol + direction; col !== rookCol; col += direction) {
                    if (this.board[fromRow][col]) return false;
                    
                    // Check if king would be in check while passing through
                    const tempBoard = this.copyBoard();
                    tempBoard[fromRow][col] = tempBoard[fromRow][fromCol];
                    tempBoard[fromRow][fromCol] = null;
                    if (this.isKingInCheck(color, tempBoard)) return false;
                }
                
                return true;
            }
            
            isPathClear(fromRow, fromCol, toRow, toCol) {
                const rowStep = toRow === fromRow ? 0 : (toRow > fromRow ? 1 : -1);
                const colStep = toCol === fromCol ? 0 : (toCol > fromCol ? 1 : -1);
                
                let currentRow = fromRow + rowStep;
                let currentCol = fromCol + colStep;
                
                while (currentRow !== toRow || currentCol !== toCol) {
                    if (this.board[currentRow][currentCol]) return false;
                    currentRow += rowStep;
                    currentCol += colStep;
                }
                
                return true;
            }
            
            makeMove(fromRow, fromCol, toRow, toCol) {
                const piece = this.board[fromRow][fromCol];
                const capturedPiece = this.board[toRow][toCol];
                
                // Store move for undo
                const move = {
                    fromRow, fromCol, toRow, toCol,
                    piece: { ...piece },
                    capturedPiece: capturedPiece ? { ...capturedPiece } : null,
                    enPassantTarget: this.enPassantTarget,
                    castlingRights: JSON.parse(JSON.stringify(this.castlingRights))
                };
                
                // Handle en passant capture
                if (piece.type === 'pawn' && this.enPassantTarget && 
                    toRow === this.enPassantTarget.row && toCol === this.enPassantTarget.col) {
                    const capturedPawnRow = piece.color === 'white' ? toRow - 1 : toRow + 1;
                    move.enPassantCapture = { ...this.board[capturedPawnRow][toCol] };
                    this.capturedPieces[piece.color].push(this.board[capturedPawnRow][toCol]);
                    this.board[capturedPawnRow][toCol] = null;
                }
                
                // Handle regular capture
                if (capturedPiece) {
                    this.capturedPieces[piece.color].push(capturedPiece);
                }
                
                // Handle castling
                if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
                    const rookFromCol = toCol > fromCol ? 7 : 0;
                    const rookToCol = toCol > fromCol ? toCol - 1 : toCol + 1;
                    this.board[toRow][rookToCol] = this.board[fromRow][rookFromCol];
                    this.board[fromRow][rookFromCol] = null;
                    move.castling = { rookFromCol, rookToCol };
                }
                
                // Make the move
                this.board[toRow][toCol] = piece;
                this.board[fromRow][fromCol] = null;
                
                // Handle pawn promotion
                if (piece.type === 'pawn' && (toRow === 7 || toRow === 0)) {
                    this.handlePawnPromotion(toRow, toCol, move);
                    return;
                }
                
                // Update en passant target
                this.enPassantTarget = null;
                if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
                    this.enPassantTarget = {
                        row: piece.color === 'white' ? fromRow + 1 : fromRow - 1,
                        col: fromCol
                    };
                }
                
                // Update castling rights
                this.updateCastlingRights(fromRow, fromCol, toRow, toCol, piece);
                
                this.moveHistory.push(move);
                this.switchPlayer();
                this.renderBoard();
                this.updateUI();
                this.checkGameEnd();
            }
            
            handlePawnPromotion(row, col, move) {
                const color = this.board[row][col].color;
                const promotionOptions = document.getElementById('promotionOptions');
                promotionOptions.innerHTML = '';
                
                const pieces = ['queen', 'rook', 'bishop', 'knight'];
                pieces.forEach(pieceType => {
                    const btn = document.createElement('button');
                    btn.className = 'promotion-btn';
                    btn.textContent = this.pieceSymbols[color][pieceType];
                    btn.onclick = () => {
                        this.board[row][col] = { type: pieceType, color };
                        move.promotion = pieceType;
                        document.getElementById('promotionModal').style.display = 'none';
                        
                        this.moveHistory.push(move);
                        this.switchPlayer();
                        this.renderBoard();
                        this.updateUI();
                        this.checkGameEnd();
                    };
                    promotionOptions.appendChild(btn);
                });
                
                document.getElementById('promotionModal').style.display = 'block';
            }
            
            updateCastlingRights(fromRow, fromCol, toRow, toCol, piece) {
                // King moves
                if (piece.type === 'king') {
                    this.castlingRights[piece.color].kingside = false;
                    this.castlingRights[piece.color].queenside = false;
                }
                
                // Rook moves
                if (piece.type === 'rook') {
                    if (fromCol === 0) {
                        this.castlingRights[piece.color].queenside = false;
                    } else if (fromCol === 7) {
                        this.castlingRights[piece.color].kingside = false;
                    }
                }
                
                // Rook captured
                if (toRow === 0 || toRow === 7) {
                    const color = toRow === 0 ? 'white' : 'black';
                    if (toCol === 0) {
                        this.castlingRights[color].queenside = false;
                    } else if (toCol === 7) {
                        this.castlingRights[color].kingside = false;
                    }
                }
            }
            
            makeTemporaryMove(fromRow, fromCol, toRow, toCol, board) {
                const piece = board[fromRow][fromCol];
                const capturedPiece = board[toRow][toCol];
                
                board[toRow][toCol] = piece;
                board[fromRow][fromCol] = null;
                
                return { piece, capturedPiece };
            }
            
            copyBoard() {
                return this.board.map(row => row.map(cell => cell ? { ...cell } : null));
            }
            
            switchPlayer() {
                this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
            }
            
            isKingInCheck(color, board = this.board) {
                const kingPos = this.findKing(color, board);
                if (!kingPos) return false;
                
                const opponentColor = color === 'white' ? 'black' : 'white';
                
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const piece = board[row][col];
                        if (piece && piece.color === opponentColor) {
                            if (this.canPieceAttackSquare(piece.type, row, col, kingPos.row, kingPos.col, piece.color, board)) {
                                return true;
                            }
                        }
                    }
                }
                
                return false;
            }
            
            findKing(color, board = this.board) {
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const piece = board[row][col];
                        if (piece && piece.type === 'king' && piece.color === color) {
                            return { row, col };
                        }
                    }
                }
                return null;
            }
            
            canPieceAttackSquare(pieceType, fromRow, fromCol, toRow, toCol, color, board) {
                if (pieceType === 'pawn') {
                    const direction = color === 'white' ? 1 : -1;
                    const rowDiff = toRow - fromRow;
                    const colDiff = Math.abs(toCol - fromCol);
                    return colDiff === 1 && rowDiff === direction;
                }
                
                return this.isPieceMovementValidForBoard(pieceType, fromRow, fromCol, toRow, toCol, color, board);
            }
            
            isPieceMovementValidForBoard(pieceType, fromRow, fromCol, toRow, toCol, color, board) {
                const rowDiff = toRow - fromRow;
                const colDiff = toCol - fromCol;
                const absRowDiff = Math.abs(rowDiff);
                const absColDiff = Math.abs(colDiff);
                
                switch (pieceType) {
                    case 'rook':
                        return (rowDiff === 0 || colDiff === 0) && this.isPathClearForBoard(fromRow, fromCol, toRow, toCol, board);
                    case 'bishop':
                        return absRowDiff === absColDiff && this.isPathClearForBoard(fromRow, fromCol, toRow, toCol, board);
                    case 'queen':
                        return ((rowDiff === 0 || colDiff === 0) || (absRowDiff === absColDiff)) && 
                               this.isPathClearForBoard(fromRow, fromCol, toRow, toCol, board);
                    case 'knight':
                        return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
                    case 'king':
                        return absRowDiff <= 1 && absColDiff <= 1;
                    default:
                        return false;
                }
            }
            
            isPathClearForBoard(fromRow, fromCol, toRow, toCol, board) {
                const rowStep = toRow === fromRow ? 0 : (toRow > fromRow ? 1 : -1);
                const colStep = toCol === fromCol ? 0 : (toCol > fromCol ? 1 : -1);
                
                let currentRow = fromRow + rowStep;
                let currentCol = fromCol + colStep;
                
                while (currentRow !== toRow || currentCol !== toCol) {
                    if (board[currentRow][currentCol]) return false;
                    currentRow += rowStep;
                    currentCol += colStep;
                }
                
                return true;
            }
            
            highlightCheck() {
                if (this.isKingInCheck(this.currentPlayer)) {
                    const kingPos = this.findKing(this.currentPlayer);
                    if (kingPos) {
                        const square = document.querySelector(`[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
                        if (square) {
                            square.classList.add('in-check');
                        }
                    }
                }
            }
            
            checkGameEnd() {
                const hasValidMoves = this.hasValidMoves(this.currentPlayer);
                const inCheck = this.isKingInCheck(this.currentPlayer);
                
                if (!hasValidMoves) {
                    if (inCheck) {
                        this.endGame('checkmate');
                    } else {
                        this.endGame('stalemate');
                    }
                } else if (this.isInsufficientMaterial()) {
                    this.endGame('insufficient_material');
                }
            }
            
            hasValidMoves(color) {
                for (let fromRow = 0; fromRow < 8; fromRow++) {
                    for (let fromCol = 0; fromCol < 8; fromCol++) {
                        const piece = this.board[fromRow][fromCol];
                        if (piece && piece.color === color) {
                            for (let toRow = 0; toRow < 8; toRow++) {
                                for (let toCol = 0; toCol < 8; toCol++) {
                                    if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                }
                return false;
            }
            
            isInsufficientMaterial() {
                const pieces = { white: [], black: [] };
                
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const piece = this.board[row][col];
                        if (piece) {
                            pieces[piece.color].push(piece.type);
                        }
                    }
                }
                
                // King vs King
                if (pieces.white.length === 1 && pieces.black.length === 1) {
                    return true;
                }
                
                // King + Bishop vs King or King + Knight vs King
                if ((pieces.white.length === 1 && pieces.black.length === 2) ||
                    (pieces.white.length === 2 && pieces.black.length === 1)) {
                    const smallerArmy = pieces.white.length === 1 ? pieces.black : pieces.white;
                    return smallerArmy.includes('bishop') || smallerArmy.includes('knight');
                }
                
                return false;
            }
            
            endGame(result) {
                this.gameOver = true;
                const modal = document.getElementById('gameOverModal');
                const title = document.getElementById('gameOverTitle');
                const message = document.getElementById('gameOverMessage');
                
                switch (result) {
                    case 'checkmate':
                        const winner = this.currentPlayer === 'white' ? this.blackPlayerName : this.whitePlayerName;
                        title.textContent = '👑 Checkmate! 👑';
                        message.textContent = `${winner} wins by checkmate!`;
                        break;
                    case 'stalemate':
                        title.textContent = '🤝 Stalemate! 🤝';
                        message.textContent = 'The game ends in a draw by stalemate.';
                        break;
                    case 'insufficient_material':
                        title.textContent = '⚖️ Draw! ⚖️';
                        message.textContent = 'The game ends in a draw due to insufficient material.';
                        break;
                    case 'draw_accepted':
                        title.textContent = '🤝 Draw Accepted! 🤝';
                        message.textContent = 'Both players agreed to a draw.';
                        break;
                }
                
                modal.style.display = 'block';
            }
            
            undoMove() {
                if (this.moveHistory.length === 0 || this.gameOver) return;
                
                const lastMove = this.moveHistory.pop();
                
                // Restore piece position
                this.board[lastMove.fromRow][lastMove.fromCol] = lastMove.piece;
                this.board[lastMove.toRow][lastMove.toCol] = lastMove.capturedPiece;
                
                // Restore en passant capture
                if (lastMove.enPassantCapture) {
                    const capturedPawnRow = lastMove.piece.color === 'white' ? lastMove.toRow - 1 : lastMove.toRow + 1;
                    this.board[capturedPawnRow][lastMove.toCol] = lastMove.enPassantCapture;
                    this.capturedPieces[lastMove.piece.color].pop();
                }
                
                // Restore regular capture
                if (lastMove.capturedPiece) {
                    this.capturedPieces[lastMove.piece.color].pop();
                }
                
                // Restore castling
                if (lastMove.castling) {
                    this.board[lastMove.fromRow][lastMove.castling.rookFromCol] = this.board[lastMove.toRow][lastMove.castling.rookToCol];
                    this.board[lastMove.toRow][lastMove.castling.rookToCol] = null;
                }
                
                // Restore promotion
                if (lastMove.promotion) {
                    this.board[lastMove.fromRow][lastMove.fromCol] = { type: 'pawn', color: lastMove.piece.color };
                }
                
                // Restore game state
                this.enPassantTarget = lastMove.enPassantTarget;
                this.castlingRights = lastMove.castlingRights;
                this.switchPlayer();
                this.selectedSquare = null;
                
                this.renderBoard();
                this.updateUI();
            }
            
            offerDraw() {
                if (this.gameOver) return;
                
                const currentPlayerName = this.currentPlayer === 'white' ? this.whitePlayerName : this.blackPlayerName;
                const message = document.getElementById('drawOfferMessage');
                message.textContent = `${currentPlayerName} offers a draw. Do you accept?`;
                
                document.getElementById('drawOfferModal').style.display = 'block';
            }
            
            acceptDraw() {
                document.getElementById('drawOfferModal').style.display = 'none';
                this.endGame('draw_accepted');
            }
            
            declineDraw() {
                document.getElementById('drawOfferModal').style.display = 'none';
            }
            
            updateUI() {
                // Update turn indicator
                const turnIndicator = document.getElementById('turnIndicator');
                const currentPlayerName = this.currentPlayer === 'white' ? this.whitePlayerName : this.blackPlayerName;
                const currentPlayerSymbol = this.currentPlayer === 'white' ? '♔' : '♚';
                
                if (this.gameOver) {
                    turnIndicator.textContent = 'Game Over';
                } else {
                    turnIndicator.textContent = `${currentPlayerSymbol} ${currentPlayerName}'s Turn`;
                }
                
                // Update game status
                const gameStatus = document.getElementById('gameStatus');
                if (this.isKingInCheck(this.currentPlayer) && !this.gameOver) {
                    gameStatus.textContent = 'Check!';
                    gameStatus.className = 'game-status status-check';
                } else {
                    gameStatus.textContent = '';
                    gameStatus.className = 'game-status';
                }
                
                // Update captured pieces
                this.updateCapturedPieces();
                
                // Update controls
                document.getElementById('undoBtn').disabled = this.moveHistory.length === 0 || this.gameOver;
                document.getElementById('offerDrawBtn').disabled = this.gameOver;
                
                // Update player names in scoreboard
                document.getElementById('whitePlayerCaptures').textContent = `${this.whitePlayerName} Captures:`;
                document.getElementById('blackPlayerCaptures').textContent = `${this.blackPlayerName} Captures:`;
            }
            
            updateCapturedPieces() {
                const whiteCapturedDiv = document.getElementById('whiteCaptured');
                const blackCapturedDiv = document.getElementById('blackCaptured');
                
                whiteCapturedDiv.innerHTML = '';
                blackCapturedDiv.innerHTML = '';
                
                this.capturedPieces.white.forEach(piece => {
                    const span = document.createElement('span');
                    span.className = 'captured-piece';
                    span.textContent = this.pieceSymbols[piece.color][piece.type];
                    whiteCapturedDiv.appendChild(span);
                });
                
                this.capturedPieces.black.forEach(piece => {
                    const span = document.createElement('span');
                    span.className = 'captured-piece';
                    span.textContent = this.pieceSymbols[piece.color][piece.type];
                    blackCapturedDiv.appendChild(span);
                });
            }
        }
        
        // Initialize the game when the page loads
        document.addEventListener('DOMContentLoaded', () => {
            new ChessGame();
        });
        
        // Allow Enter key to start game
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const modal = document.getElementById('playerNamesModal');
                if (modal.style.display === 'block') {
                    document.getElementById('startGameBtn').click();
                }
            }
        });