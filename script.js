let main = {
  variables: {
    turn: 'w',
    selectedpiece: '',
    highlighted: [],
    pieces: {
      w_king: { position: 'e_1', img: '&#9812;', type: 'w_king', moved: false },
      w_queen: { position: 'd_1', img: '&#9813;', type: 'w_queen', moved: false },
      w_rook1: { position: 'a_1', img: '&#9814;', type: 'w_rook', moved: false },
      w_rook2: { position: 'h_1', img: '&#9814;', type: 'w_rook', moved: false },
      w_bishop1: { position: 'c_1', img: '&#9815;', type: 'w_bishop', moved: false },
      w_bishop2: { position: 'f_1', img: '&#9815;', type: 'w_bishop', moved: false },
      w_knight1: { position: 'b_1', img: '&#9816;', type: 'w_knight', moved: false },
      w_knight2: { position: 'g_1', img: '&#9816;', type: 'w_knight', moved: false },
      w_pawn1: { position: 'a_2', img: '&#9817;', type: 'w_pawn', moved: false },
      w_pawn2: { position: 'b_2', img: '&#9817;', type: 'w_pawn', moved: false },
      w_pawn3: { position: 'c_2', img: '&#9817;', type: 'w_pawn', moved: false },
      w_pawn4: { position: 'd_2', img: '&#9817;', type: 'w_pawn', moved: false },
      w_pawn5: { position: 'e_2', img: '&#9817;', type: 'w_pawn', moved: false },
      w_pawn6: { position: 'f_2', img: '&#9817;', type: 'w_pawn', moved: false },
      w_pawn7: { position: 'g_2', img: '&#9817;', type: 'w_pawn', moved: false },
      w_pawn8: { position: 'h_2', img: '&#9817;', type: 'w_pawn', moved: false },

      b_king: { position: 'e_8', img: '&#9818;', type: 'b_king', moved: false },
      b_queen: { position: 'd_8', img: '&#9819;', type: 'b_queen', moved: false },
      b_rook1: { position: 'a_8', img: '&#9820;', type: 'b_rook', moved: false },
      b_rook2: { position: 'h_8', img: '&#9820;', type: 'b_rook', moved: false },
      b_bishop1: { position: 'c_8', img: '&#9821;', type: 'b_bishop', moved: false },
      b_bishop2: { position: 'f_8', img: '&#9821;', type: 'b_bishop', moved: false },
      b_knight1: { position: 'b_8', img: '&#9822;', type: 'b_knight', moved: false },
      b_knight2: { position: 'g_8', img: '&#9822;', type: 'b_knight', moved: false },
      b_pawn1: { position: 'a_7', img: '&#9823;', type: 'b_pawn', moved: false },
      b_pawn2: { position: 'b_7', img: '&#9823;', type: 'b_pawn', moved: false },
      b_pawn3: { position: 'c_7', img: '&#9823;', type: 'b_pawn', moved: false },
      b_pawn4: { position: 'd_7', img: '&#9823;', type: 'b_pawn', moved: false },
      b_pawn5: { position: 'e_7', img: '&#9823;', type: 'b_pawn', moved: false },
      b_pawn6: { position: 'f_7', img: '&#9823;', type: 'b_pawn', moved: false },
      b_pawn7: { position: 'g_7', img: '&#9823;', type: 'b_pawn', moved: false },
      b_pawn8: { position: 'h_7', img: '&#9823;', type: 'b_pawn', moved: false }
    }
  },

  methods: {
    gamesetup: function () {
      $('.gamecell').attr('chess', 'null').html('&nbsp;');
      for (let gamepiece in main.variables.pieces) {
        $('#' + main.variables.pieces[gamepiece].position).html(main.variables.pieces[gamepiece].img);
        $('#' + main.variables.pieces[gamepiece].position).attr('chess', gamepiece);
      }
    },

    move: function (target) {
      let selectedpiece = $('#' + main.variables.selectedpiece).attr('chess');
      let pieceObj = main.variables.pieces[selectedpiece];
      let targetRank = target.id.split('_')[1];

      // Update target square
      $('#' + target.id).html(pieceObj.img);
      $('#' + target.id).attr('chess', selectedpiece);

      // Clear previous square
      $('#' + main.variables.selectedpiece).html('&nbsp;');
      $('#' + main.variables.selectedpiece).attr('chess', 'null');

      pieceObj.position = target.id;
      pieceObj.moved = true;

      // Check pawn promotion
      let isPawnPromotion = (pieceObj.type === 'w_pawn' && targetRank === '8') || 
                             (pieceObj.type === 'b_pawn' && targetRank === '1');

      if (isPawnPromotion) {
        main.methods.handlePromotion(pieceObj, target.id, function() {
          main.methods.endturn();
        });
      } else {
        main.methods.endturn();
      }
    },

    capture: function (target) {
      let selectedpiece = {
        name: $('#' + main.variables.selectedpiece).attr('chess'),
        id: main.variables.selectedpiece
      };

      let capturedPieceName = target.name;
      let capturedPieceObj = main.variables.pieces[capturedPieceName];
      let pieceObj = main.variables.pieces[selectedpiece.name];
      let targetRank = target.id.split('_')[1];

      // 1. Move piece visually and update board state
      $('#' + target.id).html(pieceObj.img);
      $('#' + target.id).attr('chess', selectedpiece.name);

      // 2. Clear previous square
      $('#' + selectedpiece.id).html('&nbsp;');
      $('#' + selectedpiece.id).attr('chess', 'null');

      // 3. Update internal object state
      pieceObj.position = target.id;
      pieceObj.moved = true;
      capturedPieceObj.captured = true;

      // 4. Update captured panels
      if (capturedPieceName.startsWith('b_')) {
        $('#captured-black .captured-pieces-list').append('<span>' + capturedPieceObj.img + '</span>');
      } else if (capturedPieceName.startsWith('w_')) {
        $('#captured-white .captured-pieces-list').append('<span>' + capturedPieceObj.img + '</span>');
      }

      // Check pawn promotion on capture
      let isPawnPromotion = (pieceObj.type === 'w_pawn' && targetRank === '8') || 
                             (pieceObj.type === 'b_pawn' && targetRank === '1');

      if (isPawnPromotion) {
        main.methods.handlePromotion(pieceObj, target.id, function() {
          main.methods.endturn();
        });
      } else {
        main.methods.endturn();
      }
    },

    handlePromotion: function (pieceObj, targetCell, callback) {
      let isWhite = pieceObj.type.startsWith('w_');
      let optionsHtml = '';

      if (isWhite) {
        optionsHtml = `
          <div class="promo-choice" data-type="w_queen" data-img="&#9813;">&#9813;</div>
          <div class="promo-choice" data-type="w_rook" data-img="&#9814;">&#9814;</div>
          <div class="promo-choice" data-type="w_bishop" data-img="&#9815;">&#9815;</div>
          <div class="promo-choice" data-type="w_knight" data-img="&#9816;">&#9816;</div>
        `;
      } else {
        optionsHtml = `
          <div class="promo-choice" data-type="b_queen" data-img="&#9819;">&#9819;</div>
          <div class="promo-choice" data-type="b_rook" data-img="&#9820;">&#9820;</div>
          <div class="promo-choice" data-type="b_bishop" data-img="&#9821;">&#9821;</div>
          <div class="promo-choice" data-type="b_knight" data-img="&#9822;">&#9822;</div>
        `;
      }

      $('#promotion-options').html(optionsHtml);
      $('#promotion-modal').css('display', 'flex');

      $('.promo-choice').off('click').on('click', function() {
        let chosenType = $(this).data('type');
        let chosenImg = $(this).data('img');

        pieceObj.type = chosenType;
        pieceObj.img = chosenImg;

        $('#' + targetCell).html(chosenImg);

        $('#promotion-modal').css('display', 'none');
        if (callback) callback();
      });
    },

    endturn: function () {
      if (main.variables.turn === 'w') {
        main.variables.turn = 'b';
        $('#turn-display').text("It's Blacks Turn!");
      } else {
        main.variables.turn = 'w';
        $('#turn-display').text("It's Whites Turn!");
      }
      
      $('.gamecell').removeClass('green yellow red');
      main.variables.selectedpiece = '';
      main.variables.highlighted = [];
    }
  }
};

$(document).ready(function () {
  main.methods.gamesetup();

  $('.gamecell').click(function () {
    let cellId = $(this).attr('id');
    let chessPiece = $(this).attr('chess');

    // Selection logic
    if (main.variables.selectedpiece === '') {
      if (chessPiece !== 'null' && chessPiece.startsWith(main.variables.turn)) {
        main.variables.selectedpiece = cellId;
        $(this).addClass('yellow');
      }
    } else {
      // Deselect piece
      if (main.variables.selectedpiece === cellId) {
        $('.gamecell').removeClass('green yellow red');
        main.variables.selectedpiece = '';
      } 
      // Move to empty square or perform capture
      else {
        if (chessPiece === 'null') {
          main.methods.move({ id: cellId });
        } else if (!chessPiece.startsWith(main.variables.turn)) {
          main.methods.capture({ id: cellId, name: chessPiece });
        }
      }
    }
  });

  $('#reset-game').click(function () {
    location.reload();
  });
});
