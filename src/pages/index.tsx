import React, { useRef, useState, useEffect } from 'react';
import axios from "axios";
import { useEventListener, useHuddle01 } from '@huddle01/react';
import { Audio, Video } from '@huddle01/react/components';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {usePrepareContractWrite, useContractWrite, useContractRead, useAccount, useWaitForTransaction} from "wagmi";
import contractInterface from "./abis/charadesABI.json"
/* Uncomment to see the Xstate Inspector */
// import { Inspect } from '@huddle01/react/components';

import {
  useAudio,
  useLobby,
  useMeetingMachine,
  usePeers,
  useRoom,
  useVideo,
} from '@huddle01/react/hooks';

import Button from '../components/Button';

function App() {
  const contractAddress = "0x389749E4117A29B5Db503B38e8f8CFceAfEE6EFA";
  // refs
  const videoRef = useRef<HTMLVideoElement>(null);

  const { state, send } = useMeetingMachine();
  const{isConnected} = useAccount();
  // Event Listner
  useEventListener('lobby:cam-on', () => {
    if (state.context.camStream && videoRef.current)
      videoRef.current.srcObject = state.context.camStream as MediaStream;
  });

  
  const { address, isConnecting, isDisconnected } = useAccount()
  const { initialize, isInitialized } = useHuddle01();
  const { joinLobby } = useLobby();
  const {
    fetchAudioStream,
    produceAudio,
    stopAudioStream,
    stopProducingAudio,
    isProducing: isProducingAudio,
    stream: micStream,
  } = useAudio();
  const {
    fetchVideoStream,
    produceVideo,
    stopVideoStream,
    stopProducingVideo,
    isProducing: isProducingVideo,
    stream: camStream,
  } = useVideo();

  const [roomId, setRoomId] = useState(""); 
  const [showTeamsButton, setShowTeamsButton] = useState(false);
  const [showCreateLobbyButton, setShowCreateLobbyButton] = useState(true);
  const [showJoinRoomButton, setShowJoinRoomButton] = useState(true);
  const [showJoinLobbyButton, setShowJoinLobbyButton] = useState(true);
  const [showReadyButton, setShowReadyButton] = useState(false);
  const [showEndGameButton, setshowEndGameButton] = useState(false);
  const [showRoundButtons, setShowRoundButtons] =useState(false);
  const [isVideoStreaming, setIsVideoStreaming] = useState(false);
  const [isAudioStreaming, setIsAudioStreaming] = useState(false);
  const [isPeerHost, setIsPeerHost] = useState(false);
  const [roundWord, setRoundWord] = useState("");
  //const [isProducingVideo, setIsProducingVideo] = useState(false);
 // const [isProducingAudio, setIsProducingAudio] = useState(false);
  const { joinRoom, leaveRoom } = useRoom();

  const { peers } = usePeers();
  const inputRef = useRef(null);
  const [strings, setStrings] = useState(Array(4).fill(''));


    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState({
      team0: [],
      team1: [],
    });

    useEffect(() => {
      if(!isInitialized){
      initialize('KL1r3E1yHfcrRbXsT4mcE-3mK60Yc3YR');
      console.log(state.value);
      console.log(state.context);
      }
    }, []);

    useEffect(() => {
      if(Object.keys(peers).length == 3 && isPeerHost){
        setShowReadyButton(true);
        console.log(state.context);
      }
    })

    useEffect(() => {
      if(isCreateGameSuccess && isPeerHost){
        setshowEndGameButton(true);
        setShowRoundButtons(true);
        setShowReadyButton(false);
        console.log(state.context);
        console.log(isGameStarted);
      }
      if(isGameStarted && !isPeerHost){
        setShowReadyButton(false)
        setShowRoundButtons(true);
      }
    })

  
////////////////////////////////////////////////////*////
                  /* CONTRACT CONFIGS */
////////////////////////////////////////////////////////

const { config: addPlayerConfig } = usePrepareContractWrite({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_addPlayer',
  args: [state.context.peerId],
  onSuccess(data) {
    console.log('Success', data)
  },
})
const{write: _addPlayer, isSuccess: isAddPlayerSuccess} = useContractWrite(addPlayerConfig);

const { config: leavePlayerConfig } = usePrepareContractWrite({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_leavePlayer',
  args: [state.context.peerId],
  onSuccess(data) {
    console.log('Success', data)
  },
})
const{write: _leavePlayer, isSuccess: isLeavePlayerSuccess} = useContractWrite(leavePlayerConfig);

//create GAME
const { config: createGameConfig } = usePrepareContractWrite({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_createGame',
  args: [teams['team0'], teams['team1'], roomId],
  onSuccess(data) {
    console.log('Success', data)
  },
})
const{write: _createGame, data: createGameData} = useContractWrite(createGameConfig);
const{isSuccess: isCreateGameSuccess} = useWaitForTransaction({
  hash: createGameData?.hash
})

// end GAME
const { config: endGameConfig } = usePrepareContractWrite({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_endGame',
  args: [roomId],
  onSuccess(data) {
    console.log('Success', data)
  },
})
const{write: _endGame, isSuccess: isEndGameSuccess} = useContractWrite(endGameConfig);

// start ROUND
const { config: startRoundConfig } = usePrepareContractWrite({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_startRound',
  args: [roomId, roundWord],
  onSuccess(data) {
    console.log('Success', data)
  },
})
const{write: _startRound, isSuccess: isStartRoundSuccess} = useContractWrite(startRoundConfig);

// end ROUND
const { config: endRoundConfig } = usePrepareContractWrite({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_endRound',
  args: [roomId],
  onSuccess(data) {
    console.log('Success', data)
  },
})
const{write: _endRound, isSuccess: isEndRoundSuccess} = useContractWrite(endRoundConfig);

// const { config: getRoundWordConfig } = usePrepareContractWrite({
//   address: contractAddress,
//   abi: contractInterface,
//   functionName: '_getRoundWord',
//   args: [roomId],
//   onSuccess(data) {
//     console.log('Success', data)
//   },
// })
// const{write: _getRoundWord, data: roundWordData} = useContractWrite(getRoundWordConfig);
// const{isSuccess: getRoundWordSuccess} = useWaitForTransaction({
//   hash: roundWordData?.hash
// })

//////READ FUNCTIONS//////

const { data: isGameStarted, isError, isLoading } = useContractRead({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_isGameStarted',
  args: [roomId],
  watch: true,           
  onSuccess(data) {
    console.log('Success', data)
  },
})

const { data: Team0PeerIDs } = useContractRead({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_getTeam0PeerIDs',
  args: [roomId],
  watch: true,
  onSuccess(data) {
    console.log('Success', data)
  },
})

const { data: Team1PeerIDs } = useContractRead({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_getTeam1PeerIDs',
  args: [roomId],
  watch: true,
  onSuccess(data) {
    console.log('Success', data)
  },
})

const { data: isTeam0Guessing } = useContractRead({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_isTeam0Guessing',
  args: [roomId],
  watch: true,
  onSuccess(data) {
    console.log('Success', data)
  },
})

const { data: TeamActorData } = useContractRead({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_getTeamActor',
  args: [roomId],
  watch: true,
  onSuccess(data) {
    console.log('Success', data)
  },
})

const { data: roundWordData } = useContractRead({
  address: contractAddress,
  abi: contractInterface,
  functionName: '_getRoundWord',
  args: [roomId],
  watch: true,
  onSuccess(data) {
    console.log('Success', data)
  },
  onSettled(data, error) {
    console.log('Settled', { data, error })
  },
})

/////////////////////////////////////////////////////////

    const handlePlayerSelection = (player, team) => {
      setPlayers((prevPlayers) => prevPlayers.filter((p) => p !== player));
      setTeams((prevTeams) => {
        const newTeam = [...prevTeams[team], player];
        return { ...prevTeams, [team]: newTeam };
      });
    };
  
    const handleRemovePlayer = (player, team) => {
      setPlayers((prevPlayers) => [...prevPlayers, player]);
      setTeams((prevTeams) => {
        const newTeam = prevTeams[team].filter((p) => p !== player);
        return { ...prevTeams, [team]: newTeam };
      });
    };

  function joinHandle(){
    joinLobby(inputRef.current.value)
    setShowTeamsButton(true);
    setShowCreateLobbyButton(false);
    setShowJoinLobbyButton(false);
  }

  function handleVideoStream() {
    if(fetchVideoStream.isCallable || stopVideoStream.isCallable){
      setIsVideoStreaming(prevState => !prevState);
      isVideoStreaming ?  fetchVideoStream() : stopVideoStream();
      console.log("condition1");
    }
    else if(produceVideo.isCallable || stopProducingVideo.isCallable){
      isProducingVideo ? stopProducingVideo() : produceVideo(camStream);
      console.log("condition2");
    }
    console.log("condition13");
  }

  function handleAudioStream() {
    if(fetchAudioStream.isCallable || stopAudioStream.isCallable){
      setIsAudioStreaming(prevState => !prevState);
      isAudioStreaming ?  fetchAudioStream() : stopAudioStream();
      console.log("audio1");
    }
    else if(produceAudio.isCallable || stopProducingAudio.isCallable){
      isProducingAudio ? stopProducingAudio() : produceAudio(micStream);
      console.log("audio2");
    }
    console.log("audio3");
  }

  function handleJoinRoom() {
    setShowJoinRoomButton(false);
    _addPlayer?.();
    joinRoom();
    if(isVideoStreaming){
      produceVideo(camStream);
    }
    if(isAudioStreaming){
      produceAudio(micStream);
    }
    
  }

  function handleLeaveRoom(){
    setShowJoinRoomButton(true);
    _leavePlayer?.();
    leaveRoom();
    stopAudioStream();
    stopVideoStream();
  }
  
  function logPeers(){
    console.log(peers);
    console.log("MY ID: " +  state.context.peerId);
    console.log(state.context);
    console.log(state.context.roomId);
  }

  function confirmPlayers(){
    setPlayers(prevPlayers => [...new Set([...prevPlayers, state.context.peerId])]);
    Object.values(peers).map(peer => {
      setPlayers(prevPlayers => [...new Set([...prevPlayers, peer.peerId])]);

    });
  }

  const renderTeam = (teamName) => {
    const team = teams[teamName];
    const otherTeam = teamName === "team0" ? "team1" : "team0";
    return (showReadyButton && (
      <div key={teamName}>
        <h3>{teamName.toUpperCase()}</h3>
        {team.length < 2 && (
          <div>
            <select
              value=""
              onChange={(e) => handlePlayerSelection(e.target.value, teamName)}
            >
              <option value="">Select a peer</option>
              {players.map((player) => (
                <option key={player} value={player}>
                  {player}
                </option>
              ))}
            </select>
          </div>
        )}
        {team.map((player, index) => (
          <div key={player}>
            {player}
            {team.length <=2 && (
              <button onClick={() => handleRemovePlayer(player, teamName)}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    )
    );
  };


  let createLobby = async() => {
    try{
      //const  roomID = await response();
      const response = await axios.post(
        'https://iriko.testing.huddle01.com/api/v1/create-room',
        {
          title: 'Huddle01-Test',
          hostWallets: ['0x42456E6C6823bDA6E2C30B6b11c08F172D7940A8'],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'VwTZ4AGTxme9snANex9tep3NwvVMGfYd',
          }
        }
      ).then(async (result) => {
        console.log(result.data.data.roomId);
        joinLobby(result.data.data.roomId);
        setRoomId(result.data.data.roomId);
        setIsPeerHost(true);
        
    })
    } catch (error) {
      console.log({ error });
    }
    setShowTeamsButton(true);
    setShowCreateLobbyButton(false);
    setShowJoinLobbyButton(false);
  }

  function handleRoomIdChange(event) {
    setRoomId(inputRef.current.value);
  }
  function handleStartGame() {
    _createGame?.();
    if(isCreateGameSuccess){
      setShowReadyButton(false);
      setShowRoundButtons(true);
    }
  }

  function handleEndGame() {
    _endGame?.();
    console.log("GAME HAS ENDED");

  }

  function handleRoundWordChange() {
    setRoundWord(inputRef.current.value);
  }

  function handleStartRound() {
    _startRound?.();
  }

  function handleEndRound() {
    _endRound?.();
  }

  function handleViewWord(){
    console.log(roundWordData);
  }


  return (
    <div className="App">
      <div id='ConnectButton'>
      <ConnectButton/>
      </div>
      
      {showCreateLobbyButton && (
        <button id="create-lobby-btn" onClick={createLobby}>Create Lobby</button>
      )}
      {showJoinLobbyButton && (
        <div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter Room ID"
            onChange={handleRoomIdChange}
            id="join-lobby-input"
          />
          <button
          onClick={joinHandle}
          id="join-lobby-btn"
        >
          JOIN_LOBBY
        </button>
        </div>
      )}

      {showTeamsButton && (
        <div>
          <div>
            {roomId}
            </div>
          {showJoinRoomButton && isConnected && (
            <button onClick={handleJoinRoom}
            >Join Room</button>
          )}
          {!showJoinRoomButton && (
            <button onClick={handleLeaveRoom}>Leave Room</button>
          )}
          
          <button 
            onClick={handleVideoStream}
          >
            {isVideoStreaming || isProducingVideo ? 'Camera:On' : 'Camera:Off'}
          </button>
          <button
            onClick={handleAudioStream}
          >
            {isAudioStreaming || isProducingAudio? 'Mic:On' : 'Mic:Off'}
          </button>
          {showEndGameButton && (
        <button onClick={handleEndGame} style={{backgroundColor:"indianred"}}>END GAME</button>
          )}
          <div style={{color: "white"}}>

        <div className="grid grid-cols-4">
        Me Video:
        <video ref={videoRef} autoPlay muted></video>
          {Object.values(peers)
            .filter(peer => peer.cam)
            .map(peer => (
              <Video
                key={peer.peerId}
                peerId={peer.peerId}
                track={peer.cam}
                debug
              />
            ))}
          {Object.values(peers)
            .filter(peer => peer.mic)
            .map(peer => (
              <Audio key={peer.peerId} peerId={peer.peerId} track={peer.mic} />
            ))}

        </div>
        <div className="break-words">
          My ID:
          {JSON.stringify(state.context.peerId)}
        </div>
        <h2 className="text-2xl" >Players</h2>
        <div className="break-words">{JSON.stringify(peers) + JSON.stringify(state.context.peerId)}</div>
        {showReadyButton && (
        <div id='player-selection'>
        <Button
            onClick={confirmPlayers}
          >
            ADD PLAYERS
        </Button>
        <div>
        <h2>Player Selection</h2>
          <div>{renderTeam("team0")}</div>
          <div>{renderTeam("team1")}</div>
          <Button onClick={handleStartGame}>Start GAME</Button>
          </div>
          
          </div>
      )}
      {showRoundButtons && (
        <div>
          <div>
            <h2>Team 0</h2>
            {Team0PeerIDs[0] + ",  " + Team0PeerIDs[1]}
            
            <br></br>
            <h2>Team 1</h2>
            {Team1PeerIDs[0] + ",   " + Team1PeerIDs[1]}
          </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter WORD"
          onChange={handleRoundWordChange}
          id="join-lobby-input"
        />
        <button
        onClick={handleStartRound}
        id="join-lobby-btn"
      >
        START ROUND
      </button>
      <button
        onClick={handleEndRound}
        id="join-lobby-btn"
      >
        END ROUND
      </button>
      <button
        onClick={handleViewWord}
        id="join-lobby-btn"
      >
        VIEW WORD
      </button>
      <div>
      {roundWordData}
      </div>
      <div>
        <h2>ROUND ACTOR</h2>
        {TeamActorData}
        </div>
      </div>

      )}
      </div>
      
        </div>
      )}

{/*       
<div id='player-selection'>
        <Button
            onClick={confirmPlayers}
          >
            READY
        </Button>
        <div>
        <h2>Player Selection</h2>
          <div>{renderTeam("team0")}</div>
          <div>{renderTeam("team1")}</div>
          </div>
          </div> */}
      
    </div>
  );
}

export default App;
