import React, { useRef, useState, useEffect } from 'react';
import axios from "axios";
import { useEventListener, useHuddle01 } from '@huddle01/react';
import { Audio, Video } from '@huddle01/react/components';
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

const App = () => {
  const contractAddress = "0x7BaBcdA298C9A9a8dED60CF3fF92192d2B3173ff";
  // refs
  const videoRef = useRef<HTMLVideoElement>(null);

  const { state, send } = useMeetingMachine();

  // Event Listner
  useEventListener('lobby:cam-on', () => {
    if (state.context.camStream && videoRef.current)
      videoRef.current.srcObject = state.context.camStream as MediaStream;
  });


  

  const { initialize } = useHuddle01();
  const { joinLobby } = useLobby();
  const {
    fetchAudioStream,
    produceAudio,
    stopAudioStream,
    stopProducingAudio,
    stream: micStream,
  } = useAudio();
  const {
    fetchVideoStream,
    produceVideo,
    stopVideoStream,
    stopProducingVideo,
    stream: camStream,
  } = useVideo();
  const { joinRoom, leaveRoom } = useRoom();

  const { peers } = usePeers();
  const inputRef = useRef(null);
  const [strings, setStrings] = useState(Array(4).fill(''));


    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState({
      team1: [],
      team2: [],
    });
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
    const otherTeam = teamName === "team1" ? "team2" : "team1";
    return (
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
    );
  };

  

  ///////////////////////////////////////////////////////////////////////////////////////////////////////

  return (
    <div className="grid grid-cols-2">
      <div>
        <h1 className="text-6xl font-bold">
          Welcome to{' '}
          <a className="text-blue-600" href="https://huddle01.com">
            Huddle01 SDK!
          </a>
        </h1>

        <h2 className="text-2xl">Room State</h2>
        <h3>{JSON.stringify(state.value)}</h3>

        <h2 className="text-2xl">Me Id</h2>
        <div className="break-words">
          {JSON.stringify(state.context.peerId)}
        </div>
        <h2 className="text-2xl">Consumers</h2>
        <div className="break-words">
          {JSON.stringify(state.context.consumers)}
        </div>

        <h2 className="text-2xl">Error</h2>
        <div className="break-words text-red-500">
          {JSON.stringify(state.context.error)}
        </div>
        <h2 className="text-2xl">Peers</h2>
        <div className="break-words">{JSON.stringify(peers)}</div>
        <h2 className="text-2xl">Consumers</h2>
        <div className="break-words">
          {JSON.stringify(state.context.consumers)}
        </div>

        <h2 className="text-3xl text-blue-500 font-extrabold">Idle</h2>
        <Button
          disabled={!state.matches('Idle')}
          onClick={() => initialize('KL1r3E1yHfcrRbXsT4mcE-3mK60Yc3YR')}
        >
          INIT
        </Button>

        <br />
        <br />
        <h2 className="text-3xl text-red-500 font-extrabold">Initialized</h2>
        <Button
          disabled={!joinLobby.isCallable}
          onClick={async() => {
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
                
            })
            } catch (error) {
              console.log({ error });
            }
          }}

        >
          JOIN_LOBBY
        </Button>
        <div>
      <input
        ref={inputRef}
        type="text"
        id="message"
        name="message"
      />

      <Button onClick={joinHandle}>Log message</Button>
    </div>
        <br />
        <br />
        <h2 className="text-3xl text-yellow-500 font-extrabold">Lobby</h2>
        <div className="flex gap-4 flex-wrap">
          <Button
            disabled={!fetchVideoStream.isCallable}
            onClick={fetchVideoStream}
          >
            FETCH_VIDEO_STREAM
          </Button>
          <Button
            
            onClick={logPeers}
          >
            Print PEERS
          </Button>
          <Button
            disabled={!fetchAudioStream.isCallable}
            onClick={fetchAudioStream}
          >
            FETCH_AUDIO_STREAM
          </Button>

          <Button disabled={!joinRoom.isCallable} onClick={joinRoom}>
            JOIN_ROOM
          </Button>

          <Button
            disabled={!state.matches('Initialized.JoinedLobby')}
            onClick={() => send('LEAVE_LOBBY')}
          >
            LEAVE_LOBBY
          </Button>

          <Button
            disabled={!stopVideoStream.isCallable}
            onClick={stopVideoStream}
          >
            STOP_VIDEO_STREAM
          </Button>
          <Button
            disabled={!stopAudioStream.isCallable}
            onClick={stopAudioStream}
          >
            STOP_AUDIO_STREAM
          </Button>
        </div>
        <br />
        <h2 className="text-3xl text-green-600 font-extrabold">Room</h2>
        <div className="flex gap-4 flex-wrap">
          <Button
            disabled={!produceAudio.isCallable}
            onClick={() => produceAudio(micStream)}
          >
            PRODUCE_MIC
          </Button>

          <Button
            disabled={!produceVideo.isCallable}
            onClick={() => produceVideo(camStream)}
          >
            PRODUCE_CAM
          </Button>

          <Button
            disabled={!stopProducingAudio.isCallable}
            onClick={() => stopProducingAudio()}
          >
            STOP_PRODUCING_MIC
          </Button>

          <Button
            disabled={!stopProducingVideo.isCallable}
            onClick={() => stopProducingVideo()}
          >
            STOP_PRODUCING_CAM
          </Button>

          <Button disabled={!leaveRoom.isCallable} onClick={leaveRoom}>
            LEAVE_ROOM
          </Button>
        </div>
        <Button
            onClick={confirmPlayers}
          >
            READY
          </Button>
          <div>
          <h2>Peer Selection</h2>
          <div>{renderTeam("team1")}</div>
          <div>{renderTeam("team2")}</div>
          </div>

        {/* Uncomment to see the Xstate Inspector */}
        {/* <Inspect /> */}
      </div>
      <div>
        Me Video:
        <video ref={videoRef} autoPlay muted></video>
        <div className="grid grid-cols-4">
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
      </div>
    </div>
  );
};

export default App;
