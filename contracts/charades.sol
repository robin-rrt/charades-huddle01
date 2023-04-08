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
        bool isGameStarted;
        bool isRoundStarted;
        uint currentGuessingTeam; //0 for team0 | 1 for team1
        string roundWord;
        uint startRoundTimestamp;
        uint currentGameBalance;
    }

    mapping(string peerID => address) player; //mapping a peerID to a user address
    mapping(address => bool) isHostingGame; //to check if the host is currently hosting a game
    mapping(address => Game) hostToGame; //mapping the host to the game

    function _createGame(address[2] calldata team1, address[2] calldata team2, string calldata peerID) public returns(bool){
        require(!isHostingGame[msg.sender], "Address is already hosting another game.");

        //add host as a player
        token.transferFrom(msg.sender, address(this), 20*10**18);
        player[peerID] = msg.sender;
        isHostingGame[msg.sender] = true;
        hostToGame[msg.sender] = Game(msg.sender, team1, team2, true, false, 0, "", 0, 80*10**18);
        return(true);
    }

    function _endGame(string calldata peerID) public returns(bool){
        require(isHostingGame[msg.sender], "Address is NOT already hosting another game.");
        require(hostToGame[msg.sender].isGameStarted == true, "Game has not started");
        //give back stake to members.
        token.transferFrom(address(this), hostToGame[msg.sender].team0[0], hostToGame[msg.sender].currentGameBalance/4);
        token.transferFrom(address(this), hostToGame[msg.sender].team0[1], hostToGame[msg.sender].currentGameBalance/4);
        token.transferFrom(address(this), hostToGame[msg.sender].team1[0], hostToGame[msg.sender].currentGameBalance/4);
        token.transferFrom(address(this), hostToGame[msg.sender].team1[1], hostToGame[msg.sender].currentGameBalance/4);

        delete player[peerID];
        delete hostToGame[msg.sender];
        isHostingGame[msg.sender] = false;
        return(true);
    }

    function _addPlayer(string calldata peerID) public {
        player[peerID] = msg.sender;
        //add stake of 20 DAIx
        token.transferFrom(msg.sender, address(this), 20*10**18);
    }

    //start next round - when chat is sent (on frontend)
    function _startRound(address hostAddress, string calldata word) public{
        Game memory _game = hostToGame[hostAddress];
        require(!_game.isRoundStarted, "Round is already active");
        hostToGame[hostAddress].startRoundTimestamp = block.timestamp;
       
        if(_game.currentGuessingTeam == 0 && (msg.sender == _game.team0[0] || msg.sender == _game.team0[1])){
            hostToGame[hostAddress].isRoundStarted = true;
            hostToGame[hostAddress].roundWord = word;
            //start a flow to team[0] and team[1]
            token.createFlow(_game.team1[0], 5*10**13);
            token.createFlow(_game.team1[1], 5*10**13);
        }
        else if(_game.currentGuessingTeam == 1 && (msg.sender == _game.team1[0] || msg.sender == _game.team1[1])){
            hostToGame[hostAddress].isRoundStarted = true;
            hostToGame[hostAddress].roundWord = word;
            hostToGame[hostAddress].startRoundTimestamp = block.timestamp;
            //start a flow to team[0] and team[1]
            token.createFlow(_game.team0[0], 5*10**13);
            token.createFlow(_game.team0[1], 5*10**13);
        }
        else{
            revert("message sender is not authorized to start round.");
        }
        
    }
    //end current round
    function _endRound(address hostAddress) public {
        Game memory _game = hostToGame[hostAddress];
        require(_game.isRoundStarted, "Round is already INACTIVE");

        if(_game.currentGuessingTeam == 0 && (msg.sender == _game.team0[0] || msg.sender == _game.team0[1])){
            hostToGame[hostAddress].isRoundStarted = true;
            //end a flow to team[0] and team[1]
            token.deleteFlow(address(this), _game.team1[0]);
            token.deleteFlow(address(this), _game.team1[1]);
            hostToGame[hostAddress].currentGuessingTeam = (_game.currentGuessingTeam + 1) % 2;
        }
        else if(_game.currentGuessingTeam == 1 && (msg.sender == _game.team1[0] || msg.sender == _game.team1[1])){
            hostToGame[hostAddress].isRoundStarted = true;
            //end a flow to team[0] and team[1]
            token.deleteFlow(address(this), _game.team0[0]);
            token.deleteFlow(address(this), _game.team0[1]);
            hostToGame[hostAddress].currentGuessingTeam = (_game.currentGuessingTeam + 1) % 2;
        }

        else{
            revert("message sender is not authorized to start round.");
        }

        uint roundTransfer = _calculateRoundTransfer(hostAddress, block.timestamp);
       _updateGameBalance(hostAddress, roundTransfer);
    }
  
  function _calculateRoundTransfer(address hostAddress, uint endRoundTimestamp) public view returns(uint){
      uint duration = endRoundTimestamp - hostToGame[hostAddress].startRoundTimestamp;
      uint realTimeTransfer = 10*10**13  * duration;
      return(realTimeTransfer);
  }

  function _updateGameBalance(address hostAddress, uint roundTransfer) public {
      hostToGame[hostAddress].currentGameBalance -= roundTransfer;
  }


}
