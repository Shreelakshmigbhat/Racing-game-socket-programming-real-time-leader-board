import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AlertCircle, CheckCircle, User, Lock, Mail, Trophy, LogOut } from 'lucide-react';
import { io } from 'socket.io-client';

// Socket.io initialization
const socket = io();

const CompleteRacingGame = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuth, setShowAuth] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // Game states
  const mountRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [modeSelected, setModeSelected] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  // Listen for real-time leaderboard updates
  useEffect(() => {
    socket.on('leaderboardUpdate', (data) => {
      setLeaderboard(data);
    });

    return () => {
      socket.off('leaderboardUpdate');
    };
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setIsLoggedIn(true);
      setCurrentUser(userData);
      setShowAuth(false);
    }
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setMessage({ type: '', text: '' });
  };

  const handleAuth = async () => {
    setLoading(true);
    // Simple mock auth for this demo
    if (!formData.username) {
      setMessage({ type: 'error', text: 'Username is required' });
      setLoading(false);
      return;
    }

    const userData = { username: formData.username };
    localStorage.setItem('user', JSON.stringify(userData));
    setIsLoggedIn(true);
    setCurrentUser(userData);
    setShowAuth(false);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setShowAuth(true);
    setGameStarted(false);
    setScore(0);
    setModeSelected(null);
  };

  const updateHighScore = (newScore) => {
    if (currentUser) {
      socket.emit('updateScore', { player: currentUser.username, score: newScore });
    }
  };

  // Racing Game Logic (Integrated from user's code)
  useEffect(() => {
    if (!gameStarted || !isLoggedIn) return;
    
    let scene, camera, renderer, car, road, obstacles = [];
    let carSpeed = 0;
    let carPosition = 0;
    let obstacleSpeed = 0.1;
    let gameRunning = true;
    let currentScore = 0;
    let trees = [];
    let citySegments = [];

    const CITY_SEGMENT_DEPTH = 60;
    const CITY_SEGMENT_COUNT = 5;
    const TOTAL_CITY_LENGTH = CITY_SEGMENT_DEPTH * CITY_SEGMENT_COUNT;
    const CITY_SPEED_FACTOR = 0.35;
    const BUILDING_COLORS = [0x1f2933, 0x24354a, 0x2d4157, 0x35546b, 0x394861];

    const keys = { left: false, right: false, up: false, down: false };

    const init = (isNight) => {
      scene = new THREE.Scene();
      const bgColor = isNight ? 0x050b16 : 0x87ceeb;
      scene.background = new THREE.Color(bgColor);
      
      if (isNight) {
        scene.fog = new THREE.FogExp2(bgColor, 0.02);
      } else {
        scene.fog = new THREE.Fog(bgColor, 10, 50);
      }

      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 5, 8);
      camera.lookAt(0, 0, 0);
      
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      if (mountRef.current) mountRef.current.appendChild(renderer.domElement);
      
      const ambientLight = new THREE.AmbientLight(0xffffff, isNight ? 0.6 : 1);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, isNight ? 0.8 : 1.2);
      if (!isNight) directionalLight.color.set(0xfff2cc);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);
      
      createCar();
      createRoad();
      createCityBackground();

      if (isNight) {
        for (let i = 0; i < 40; i++) {
          const z = -i * 10;
          const leftTree = createTree(-6, z);
          const rightTree = createTree(6, z);
          trees.push(leftTree, rightTree);
          scene.add(leftTree);
          scene.add(rightTree);
        }
      }
      
      for (let i = 0; i < 5; i++) {
        createObstacle(-20 - i * 10);
      }
      
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('resize', onWindowResize);
      
      animate();
    };

    const createBuilding = ({ parent, x, z, width, height, depth, color }) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshPhongMaterial({ color, flatShading: true }));
      tower.position.y = height / 2;
      tower.castShadow = true;
      group.add(tower);
      if (Math.random() > 0.6) {
        const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.35, 1.4, 4), new THREE.MeshPhongMaterial({ color: 0x121720 }));
        roof.position.y = height + 0.7;
        group.add(roof);
      }
      const windowGeometry = new THREE.PlaneGeometry(0.35, 0.55);
      const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.8 });
      const floors = Math.floor(height / 1.2);
      const windowsPerFloor = Math.floor(width / 0.6);
      for (let floor = 0; floor < floors; floor++) {
        for (let i = 0; i < windowsPerFloor; i++) {
          const win = new THREE.Mesh(windowGeometry, windowMaterial.clone());
          win.position.set(-width / 2 + 0.4 + i * 0.6, 0.5 + floor * 1.2, depth / 2 + 0.002);
          win.material.opacity = 0.6 + Math.random() * 0.4;
          group.add(win);
        }
      }
      parent.add(group);
    };

    const createCitySegment = (zOffset) => {
      const segment = new THREE.Group();
      segment.position.z = zOffset;
      const laneSets = [{ lanes: [-11, -14.5, -18], jitter: 1.4 }, { lanes: [11, 14.5, 18], jitter: -1.4 }];
      laneSets.forEach(({ lanes, jitter }) => {
        lanes.forEach(lane => {
          for (let i = 0; i < 3; i++) {
            const width = 2 + Math.random() * 3;
            const height = 8 + Math.random() * 12;
            const depth = 2 + Math.random() * 3;
            const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
            const z = -CITY_SEGMENT_DEPTH/2 + i * (CITY_SEGMENT_DEPTH / 3) + (Math.random()*4 - 2);
            createBuilding({ parent: segment, x: lane + Math.random() * jitter, z, width, height, depth, color });
          }
        });
      });
      return segment;
    };

    const createCityBackground = () => {
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 400), new THREE.MeshPhongMaterial({ color: 0x1a1d28 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.02;
      ground.receiveShadow = true;
      scene.add(ground);
      for (let i = 0; i < CITY_SEGMENT_COUNT; i++) {
        const s = createCitySegment(-CITY_SEGMENT_DEPTH/2 - i * CITY_SEGMENT_DEPTH);
        citySegments.push(s);
        scene.add(s);
      }
    };

    const createCar = () => {
      const carGroup = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 2.5), new THREE.MeshPhongMaterial({ color: 0xff0000 }));
      body.position.y = 0.4;
      body.castShadow = true;
      carGroup.add(body);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.5), new THREE.MeshPhongMaterial({ color: 0xcc0000 }));
      top.position.set(0, 1, -0.2);
      top.castShadow = true;
      carGroup.add(top);
      const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
      const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
      [[-0.7, 0.3, 1], [0.7, 0.3, 1], [-0.7, 0.3, -1], [0.7, 0.3, -1]].forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos[0], pos[1], pos[2]);
        wheel.castShadow = true;
        carGroup.add(wheel);
      });
      carGroup.position.set(0, 0, 5);
      car = carGroup;
      scene.add(car);
    };
    
    const createRoad = () => {
      const roadGroup = new THREE.Group();
      const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 100), new THREE.MeshPhongMaterial({ color: 0x555555 }));
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.receiveShadow = true;
      roadGroup.add(roadMesh);
      for (let i = -50; i < 50; i += 5) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.01, i);
        roadGroup.add(line);
      }
      const edgeMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
      const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 100), edgeMaterial);
      leftEdge.position.set(-4.5, 0.25, 0);
      roadGroup.add(leftEdge);
      const rightEdge = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 100), edgeMaterial);
      rightEdge.position.set(4.5, 0.25, 0);
      roadGroup.add(rightEdge);
      road = roadGroup;
      scene.add(road);
    };
    
    const createObstacle = (zPos) => {
      const types = ['box', 'cone', 'sphere'];
      const type = types[Math.floor(Math.random() * types.length)];
      let obstacle;
      const color = [0x00ff00, 0x0000ff, 0xffff00, 0xff00ff][Math.floor(Math.random() * 4)];
      const material = new THREE.MeshPhongMaterial({ color });
      if (type === 'box') obstacle = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
      else if (type === 'cone') {
        obstacle = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 8), material);
        obstacle.position.y = 0.75;
      } else {
        obstacle = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), material);
        obstacle.position.y = 0.6;
      }
      obstacle.castShadow = true;
      obstacle.position.x = [-2.5, 0, 2.5][Math.floor(Math.random() * 3)];
      obstacle.position.z = zPos;
      obstacles.push(obstacle);
      scene.add(obstacle);
    };
   
    const createTree = (x, z) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8), new THREE.MeshPhongMaterial({ color: 0x8b5a2b }));
      trunk.position.y = 0.6;
      tree.add(trunk);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 12), new THREE.MeshPhongMaterial({ color: 0x2e8b57 }));
      leaves.position.y = 2;
      tree.add(leaves);
      tree.position.set(x, 0, z);
      tree.castShadow = true;
      return tree;
    };

    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
    };
    
    const onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
    };
    
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    const checkCollision = (obj1, obj2) => {
      const box1 = new THREE.Box3().setFromObject(obj1);
      const box2 = new THREE.Box3().setFromObject(obj2);
      return box1.intersectsBox(box2);
    };
    
    const animate = () => {
      if (!gameRunning) return;
      requestAnimationFrame(animate);
      if (keys.up) carSpeed = Math.min(carSpeed + 0.01, 0.5);
      if (keys.down) carSpeed = Math.max(carSpeed - 0.01, 0);
      if (!keys.up && !keys.down) carSpeed *= 0.98;
      if (keys.left) carPosition = Math.max(carPosition - 0.1, -2.5);
      if (keys.right) carPosition = Math.min(carPosition + 0.1, 2.5);
      car.position.x = carPosition;
      setSpeed(Math.floor(carSpeed * 200));
      obstacleSpeed = 0.1 + carSpeed;
      obstacles.forEach(obstacle => {
        obstacle.position.z += obstacleSpeed;
        if (checkCollision(car, obstacle)) {
          gameRunning = false;
          setGameOver(true);
          updateHighScore(currentScore);
        }
        if (obstacle.position.z > 10) {
          scene.remove(obstacle);
          obstacles = obstacles.filter(o => o !== obstacle);
          createObstacle(-30);
          currentScore += 10;
          setScore(currentScore);
        }
      });
      const parallaxSpeed = 0.112 + obstacleSpeed * CITY_SPEED_FACTOR;
      citySegments.forEach(segment => {
        segment.position.z += parallaxSpeed;
        if (segment.position.z > camera.position.z + CITY_SEGMENT_DEPTH) {
          segment.position.z -= TOTAL_CITY_LENGTH;
        }
      });
      renderer.render(scene, camera);
    };
    
    init(modeSelected === "night");
    
    return () => {
      gameRunning = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onWindowResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [gameStarted, isLoggedIn, modeSelected]);

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setSpeed(0);
  };

  const restartGame = () => {
    setGameStarted(false);
    setTimeout(() => startGame(), 100);
  };

  // Auth UI
  if (showAuth || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4 font-sans" style={{
        background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('https://picsum.photos/seed/racing/1920/1080') center/cover no-repeat`,
      }}>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-10 shadow-2xl max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🏎️ Racing Pro</h1>
            <p className="text-white/60">
              {isLogin ? 'Login to compete on the leaderboard' : 'Create an account to start racing'}
            </p>
          </div>

          {message.text && (
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${message.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/50' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/50'}`}>
              {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Username</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter your username"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Enter Race'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!modeSelected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white font-sans p-4" style={{
        background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url('https://picsum.photos/seed/city/1920/1080') center/cover no-repeat`,
      }}>
        <h1 className="text-5xl font-black mb-12 tracking-tighter">SELECT ENVIRONMENT</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <button
            onClick={() => setModeSelected("day")}
            className="group relative overflow-hidden rounded-3xl aspect-video bg-sky-400 flex items-center justify-center transition-transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="relative text-4xl font-bold">🌞 DAYLIGHT</span>
          </button>
          <button
            onClick={() => setModeSelected("night")}
            className="group relative overflow-hidden rounded-3xl aspect-video bg-indigo-950 flex items-center justify-center transition-transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="relative text-4xl font-bold">🌙 MIDNIGHT</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-black font-sans">
      <div ref={mountRef} className="w-full h-full" />
      
      {!gameStarted && !gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-zinc-900/90 border border-white/10 p-10 rounded-[2rem] text-center text-white max-w-md w-full shadow-2xl">
            <h1 className="text-5xl font-black mb-2 tracking-tighter">READY?</h1>
            <p className="text-white/60 mb-8">Welcome back, {currentUser.username}</p>
            
            <div className="bg-white/5 rounded-2xl p-6 mb-8 text-left">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Live Leaderboard</h3>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-white/80 font-medium">{i + 1}. {item.player}</span>
                    <span className="font-mono text-indigo-300">{item.score}</span>
                  </div>
                ))}
                {leaderboard.length === 0 && <p className="text-white/20 text-sm">No scores yet...</p>}
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full bg-white text-black font-black py-4 rounded-2xl text-xl hover:bg-indigo-400 transition-colors mb-4"
            >
              START ENGINE
            </button>
            <button
              onClick={handleLogout}
              className="w-full border border-white/10 text-white/40 font-bold py-3 rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              LOGOUT
            </button>
          </div>
        </div>
      )}
      
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/40 backdrop-blur-md">
          <div className="bg-zinc-900/90 border border-red-500/20 p-10 rounded-[2rem] text-center text-white max-w-md w-full shadow-2xl">
            <h1 className="text-6xl font-black mb-2 tracking-tighter text-red-500">CRASHED</h1>
            <p className="text-4xl font-mono mb-8">{score}</p>
            
            <div className="bg-white/5 rounded-2xl p-6 mb-8 text-left">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Top Rankings</h3>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className={`font-medium ${item.player === currentUser.username ? 'text-indigo-400' : 'text-white/80'}`}>
                      {i + 1}. {item.player}
                    </span>
                    <span className="font-mono text-indigo-300">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={restartGame}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl text-xl hover:bg-indigo-500 transition-colors mb-4"
            >
              RETRY
            </button>
            <button
              onClick={() => setModeSelected(null)}
              className="w-full border border-white/10 text-white/40 font-bold py-3 rounded-2xl hover:bg-white/5 transition-colors"
            >
              CHANGE MODE
            </button>
          </div>
        </div>
      )}
      
      {gameStarted && !gameOver && (
        <div className="absolute top-8 left-8 space-y-4">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 p-6 rounded-3xl text-white min-w-[240px]">
            <div className="flex items-center gap-3 mb-4 opacity-60">
              <User size={16} />
              <span className="text-sm font-bold uppercase tracking-widest">{currentUser.username}</span>
            </div>
            <div className="text-5xl font-mono font-black mb-1">{score}</div>
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Current Score</div>
            
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-2xl font-mono">{speed} <span className="text-sm opacity-40">KM/H</span></div>
            </div>
          </div>

          <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-white">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Leaderboard</h3>
            <div className="space-y-2">
              {leaderboard.slice(0, 3).map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="opacity-60">{i + 1}. {item.player}</span>
                  <span className="font-mono text-indigo-400">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteRacingGame;
