//SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import {
    ISuperfluid, 
    ISuperToken, 
    ISuperApp
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import { SuperTokenV1Library } from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";


contract Charades{

    /// @notice CFA Library.
    using SuperTokenV1Library for ISuperToken;

    ISuperToken token = ISuperToken(0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f);
    
    struct Game{
        address gameHost;
        address[2] team0;
        address[2] team1;
        string[2] team0peerID;
        string[2] team1peerID;
        bool isGameStarted;
        bool isRoundStarted;
        uint currentGuessingTeam; //0 for team0 | 1 for team1
        uint team0Actor;
        uint team1Actor;
        string roundWord;
        uint startRoundTimestamp;
        uint currentGameBalance;
    }

    mapping(string peerID => address) player; //mapping a peerID to a user address
    mapping(address => bool) isHostingGame; //to check if the host is currently hosting a game
    mapping(string roomID => Game) roomToGame; //mapping the host to the game

    event PlayerAdded(string indexed peerID, address indexed playerAddress);
    event PlayerLeft(string indexed peerID, address indexed playerAddress);
    event CreatedGame(address[2] team0, address[2] team1, address GameHostAddress, string indexed HostPeerID, bool indexed isGameStarted);

    function _createGame(string[2] calldata team0, string[2] calldata team1, string calldata roomID) public returns(bool){
        require(!isHostingGame[msg.sender], "Address is already hosting another game.");

        //add host as a player
        //token.transferFrom(msg.sender, address(this), 20*10**18);
        //player[peerID] = msg.sender;
        isHostingGame[msg.sender] = true;
        address[2] memory team0Address = [player[team0[0]], player[team0[1]]];
        address[2] memory team1Address = [player[team1[0]], player[team1[1]]];

        roomToGame[roomID] = Game(msg.sender, team0Address, team1Address, team0, team1, true, false, 0, 0, 0, "", 0, 80*10**18);
        emit CreatedGame(team0Address, team1Address, msg.sender, roomID, true);
        return(true);
    }

    function _endGame(string calldata roomID) public returns(bool){
        require(isHostingGame[msg.sender], "Address is NOT already hosting another game.");
        require(roomToGame[roomID].isGameStarted == true, "Game has not started");
        //give back stake to members.
        token.transferFrom(address(this), roomToGame[roomID].team0[0], roomToGame[roomID].currentGameBalance/4);
        token.transferFrom(address(this), roomToGame[roomID].team0[1], roomToGame[roomID].currentGameBalance/4);
        token.transferFrom(address(this), roomToGame[roomID].team1[0], roomToGame[roomID].currentGameBalance/4);
        token.transferFrom(address(this), roomToGame[roomID].team1[1], roomToGame[roomID].currentGameBalance/4);

        delete roomToGame[roomID];
        isHostingGame[msg.sender] = false;
        return(true);
    }

    function _addPlayer(string calldata peerID) public {
        player[peerID] = msg.sender;
        //add stake of 20 DAIx
        token.transferFrom(msg.sender, address(this), 20*10**18);
        emit PlayerAdded(peerID, msg.sender);
    }

    function _leavePlayer(string calldata peerID) public {
        token.transferFrom(address(this), msg.sender, 20*10**18);
        delete player[peerID];
        emit PlayerLeft(peerID, msg.sender);
    }

    //start next round - when chat is sent (on frontend)
    function _startRound(string calldata roomID, string calldata word) public{
        Game memory _game = roomToGame[roomID];
        require(!_game.isRoundStarted, "Round is already active");
        roomToGame[roomID].startRoundTimestamp = block.timestamp;
       
        if(_game.currentGuessingTeam == 0 && (msg.sender == _game.team1[0] || msg.sender == _game.team1[1])){
            roomToGame[roomID].isRoundStarted = true;
            roomToGame[roomID].roundWord = word;
            //start a flow to team[0] and team[1]
            token.createFlow(_game.team1[0], 5*10**13);
            token.createFlow(_game.team1[1], 5*10**13);
        }
        else if(_game.currentGuessingTeam == 1 && (msg.sender == _game.team0[0] || msg.sender == _game.team0[1])){
            roomToGame[roomID].isRoundStarted = true;
            roomToGame[roomID].roundWord = word;
            roomToGame[roomID].startRoundTimestamp = block.timestamp;
            //start a flow to team[0] and team[1]
            token.createFlow(_game.team0[0], 5*10**13);
            token.createFlow(_game.team0[1], 5*10**13);
        }
        else{
            revert("message sender is not authorized to start round.");
        }
        
    }
    //end current round
    function _endRound(string calldata roomID) public {
        Game memory _game = roomToGame[roomID];
        require(_game.isRoundStarted, "Round is already INACTIVE");

        if(_game.currentGuessingTeam == 0 && (msg.sender == _game.team0[0] || msg.sender == _game.team0[1])){
            roomToGame[roomID].isRoundStarted = false;
            //end a flow to team[0] and team[1]
            token.deleteFlow(address(this), _game.team1[0]);
            token.deleteFlow(address(this), _game.team1[1]);
            roomToGame[roomID].currentGuessingTeam = (_game.currentGuessingTeam + 1) % 2;
            roomToGame[roomID].team0Actor = (_game.team0Actor + 1) % 2;
        }
        else if(_game.currentGuessingTeam == 1 && (msg.sender == _game.team1[0] || msg.sender == _game.team1[1])){
            roomToGame[roomID].isRoundStarted = false;
            //end a flow to team[0] and team[1]
            token.deleteFlow(address(this), _game.team0[0]);
            token.deleteFlow(address(this), _game.team0[1]);
            roomToGame[roomID].currentGuessingTeam = (_game.currentGuessingTeam + 1) % 2;
            roomToGame[roomID].team1Actor = (_game.team1Actor + 1) % 2;
        }

        else{
            revert("message sender is not authorized to start round.");
        }

        uint roundTransfer = _calculateRoundTransfer(roomID, block.timestamp);
       _updateGameBalance(roomID, roundTransfer);
    }
  
  function _calculateRoundTransfer(string calldata roomID, uint endRoundTimestamp) public view returns(uint){
      uint duration = endRoundTimestamp - roomToGame[roomID].startRoundTimestamp;
      uint realTimeTransfer = 10*10**13  * duration;
      return(realTimeTransfer);
  }

  function _updateGameBalance(string calldata roomID, uint roundTransfer) private {
      roomToGame[roomID].currentGameBalance -= roundTransfer;
  }

  function _viewGame(string calldata roomID) public view returns(Game memory) {
      return(roomToGame[roomID]);
  }

  function _getPlayer(string calldata peerID) public view returns(address){
      return(player[peerID]);
  }

  function _isPlayerHostingGame(address playerAddress) public view returns(bool){
      return(isHostingGame[playerAddress]);
  }

  function _isGameStarted(string calldata roomID) public view returns(bool){
      return(roomToGame[roomID].isGameStarted);
  }

  function _getTeam0PeerIDs(string calldata roomID) public view returns(string[2] memory){
      return(roomToGame[roomID].team0peerID);
  }

  function _getTeam1PeerIDs(string calldata roomID) public view returns(string[2] memory){
      return(roomToGame[roomID].team1peerID);
  }

  function _isTeam0Guessing(string calldata roomID) public view returns(bool){
      if(roomToGame[roomID].currentGuessingTeam == 0){
          return(true);
      }
      else{
          return(false);
      }
  }

  function _getTeamActor(string calldata roomID) public view returns(string memory){
      Game memory _game = roomToGame[roomID];
      if(_game.currentGuessingTeam == 0){
          uint actor = _game.team0Actor;
          return(_game.team0peerID[actor]);
      }
      else if(_game.currentGuessingTeam == 1){
          uint actor = _game.team1Actor;
          return(_game.team1peerID[actor]);
      }
      else{
          revert("SOMETHING WENT WRONG WITH YOUR CALL");
      }
  }

  function _getRoundWord(string calldata roomID) public view returns(string memory){
      Game memory _game = roomToGame[roomID];
      if(_game.currentGuessingTeam == 0){
          uint actor = _game.team0Actor;
          require(msg.sender == _game.team0[actor], "MSG.SENDER IS NOT ACTOR FOR THE TEAM");
          return(_game.roundWord);
      }
      else if(_game.currentGuessingTeam == 1){
          uint actor = _game.team1Actor;
          require(msg.sender == _game.team1[actor], "MSG.SENDER IS NOT ACTOR FOR THE TEAM");
          return(_game.roundWord);
      }
      else{
          revert("NEITHER TEAM IS PLAYING");
      }
  }
    




}
