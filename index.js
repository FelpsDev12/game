import { entitys } from "./entitys.js";
import { inputs } from "./inputs.js";
import { Debounce } from "./modules.js";
import { platforms } from "./platforms.js";

const usernameInput = document.getElementById("nameInput");
const playerInfo = document.getElementById("playerInfo");
const healthBar = document.querySelector(".healthBar");
const mainScreen = document.querySelector(".mainScreen");
const sendButton = document.getElementById("sendButton");
const usernameP1 = document.getElementById("usernameP1");
const usernameP2 = document.getElementById("usernameP2");
const playerSetInfo = document.getElementById("playerSetInfo");
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const btnsM = {
	right: 'd',
	left: 'a',
	jump: ' ',
	dash: 'q'
}

let socket;
let username;
let paused = true;
let otherUsername;
let right = true;
let left = false;

const imagens = {
	idleR: new Image(), idleL: new Image(),
	walkR: new Image(), walkL: new Image(),
	jumpR: new Image(), jumpL: new Image(),
	dashR: new Image(), dashL: new Image()
};

imagens.idleR.src = 'assets/idleR.png';
imagens.idleL.src = 'assets/idleL.png';
imagens.walkR.src = 'assets/walkR.png';
imagens.walkL.src = 'assets/walkL.png';
imagens.jumpR.src = 'assets/jumpR.png';
imagens.jumpL.src = 'assets/jumpL.png';
imagens.dashR.src = 'assets/dashR.png';
imagens.dashL.src = 'assets/dashL.png';

let imagemAtual = imagens.idleR;
let imagemOther = imagens.idleR;

const WS_URL = "http://localhost:3001"

//wss://game-backend-fspb.onrender.com / 
let ready = false
const vida1 = document.getElementById("barraum")
const vida2 = document.getElementById("barradois")

const GRAVITY = 0.3;
const JUMP_FORCE = -10;
let frameAtual = 0;
const totalFrames = 4;
const larguraSprite = 32;
const alturaSprite = 32;

let ultimoTempo = 0;
const fpsDesejado = 10;
const intervaloFrame = 1000 / fpsDesejado;
let acumuladorTempo = 0;
let serverCtrl = false

const teclas = {};
let dashCharged = true;
let dashing = false;
let dashTimer = 0;
let controller = false
let barraW = "300"
let mode;
let clientDied = false
let serverDied = false

let serverReady
let myHealth
let serverHealth

function resetGame() {
	ready = false
	paused = false
	entitys.player1.health = 100
	 entitys.player2.health = 100

	canvas.style.display = 'none'
	playerInfo.style.display = 'none'
	mainScreen.style.display = ''
}

window.addEventListener("keydown", (e) => teclas[e.key] = true);
window.addEventListener("keyup", (e) => teclas[e.key] = false);

window.addEventListener("keydown", (e) => {
	if (e.key === "f" && !Debounce.Check("controlAwait")) {
		Debounce.Add("controlAwait", 800)
		controller = true
		entitys.player2.health -= 10
		vida2.style.width = vida2.clientWidth - 30 + "px"
		console.warn(`minha Vida: ${entitys.player1.health} \n Adversario: ${entitys.player2.health}`)
	}
})

document.getElementById("attack").addEventListener("touchstart", () => {
	if (!Debounce.Check("controlAwait")) {
		Debounce.Add("controlAwait", 800)
		controller = true
		entitys.player2.health -= 10
		vida2.style.width = vida2.clientWidth - 30 + "px"
		console.warn(`minha Vida: ${entitys.player1.health} \n Adversario: ${entitys.player2.health}`)
	}
})

function isAMobile() {
	const query = window.matchMedia("(max-width: 768px)").matches

	if (!query) {
		console.log("Desktop")
		hideButtons()
		return false
	}

	console.log("Mobile")
	return true
}

function showButtons() {
	document.getElementById("btns").style.display = 'flex'
}

function hideButtons() {
	document.getElementById("btns").style.display = 'none'
}

function showHealthBar() {
	vida1.style.display = 'flex'
	vida2.style.display = 'flex'
}

sendButton.onclick = () => {
	username = usernameInput.value;
	if (username.trim() === "") return;

	usernameP1.textContent = username;

	socket = new WebSocket(`${WS_URL}`);

	socket.onopen = () => {
		console.log("Conectado!");

		isAMobile()

		showHealthBar()
		showButtons()
		canvas.style.zIndex = "9"
		paused = false;
		ready = true
		canvas.style.display = ''
		playerInfo.style.display = ''
		mainScreen.style.display = 'none'

		if (isAMobile) {
			showButtons()
		}

		socket.send(JSON.stringify({ isOtherUsername: username, ready: ready }));

		ultimoTempo = performance.now();
		requestAnimationFrame(loopPrincipal);
	};

	socket.onmessage = (evento) => {
		if (!ready) return;
		const dados = JSON.parse(evento.data);

		if (dados.isOtherUsername !== username) {
			otherUsername = dados.isOtherUsername;
			usernameP2.textContent = otherUsername;
		}

		if (dados.ready == true) {
			console.log("Servidor Pronto")
			serverReady = dados.ready
		}

		if (dados.status == 404) {
			socket.close()
			resetGame()
		}

		document.getElementById("diedCheckC").textContent = `Died: ${dados.serverDied}`
		document.getElementById("diedCheckS").textContent = `Died: ${dados.clientDied}`

		document.getElementById("hp1").textContent = `${dados.clientHealth}`
		document.getElementById("hp2").textContent = `${dados.serverHealth}`

		if (dados.damaged && !Debounce.Check("controlAwait")) {
			vida1.style.width = vida1.clientWidth - 30 + 'px'
			entitys.player1.health -= 10
		}

		entitys.player2.x = dados.x;
		entitys.player2.y = dados.y;

		if (dados.isWalking) {
			imagemOther = dados.isRight ? imagens.walkR : imagens.walkL;
		} else if (!dados.onFloor) {
			imagemOther = dados.isRight ? imagens.jumpR : imagens.jumpL;
		} else if (dados.isDashing) {
			imagemOther = dados.isRight ? imagens.dashR : imagens.dashL;
		} else {
			imagemOther = dados.isRight ? imagens.idleR : imagens.idleL;
		}
	};

	socket.onerror = () => alert("Erro ao conectar no servidor!");
};

function loopPrincipal(tempoAtual) {
	if (paused || !ready) return;

	const deltaTime = tempoAtual - ultimoTempo;
	ultimoTempo = tempoAtual;
	acumuladorTempo += deltaTime;

	if (teclas[" "] && entitys.player1.noChao) {
		entitys.player1.vy += JUMP_FORCE;
		entitys.player1.noChao = false;
	}

	if (teclas["q"] && dashCharged) {
		dashCharged = false;
		dashTimer = 20;
		dashing = true;
		setTimeout(() => { dashCharged = true; dashing = false; }, 1000);
	}

	if (dashTimer > 0) {
		entitys.player1.x += right ? 10 : -10;
		imagemAtual = right ? imagens.dashR : imagens.dashL;
		dashTimer--;
	}

	entitys.player1.vy += GRAVITY;
	entitys.player1.y += entitys.player1.vy;

	let andando = false;
	if (inputs["right"].some(key => teclas[key])) {
		entitys.player1.x += entitys.player1.velocidade;
		imagemAtual = imagens.walkR;
		right = true; left = false; andando = true;
	} else if (inputs["left"].some(key => teclas[key])) {
		entitys.player1.x -= entitys.player1.velocidade;
		imagemAtual = imagens.walkL;
		right = false; left = true; andando = true;
	} else if (!entitys.player1.noChao) {
		imagemAtual = right ? imagens.jumpR : imagens.jumpL;
	} else {
		imagemAtual = right ? imagens.idleR : imagens.idleL;
	}

	if (entitys.player1.health <= 0) {
		clientDied = true
	}

	if (entitys.player2.health <= 0) {
		serverDied = true
	}

	Object.keys(btnsM).forEach(id => {
		const element = document.getElementById(id)
		const press = btnsM[id]

		element.addEventListener("touchstart", (e) => {
			e.preventDefault()
			teclas[press] = true
		})

		element.addEventListener("touchend", (e) => {
			e.preventDefault()
			teclas[press] = false
		})
	})

	if (socket && socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify({
			x: entitys.player1.x,
			y: entitys.player1.y,
			isOtherUsername: username,
			isWalking: andando,
			onFloor: entitys.player1.noChao,
			isDashing: dashing,
			isRight: right,
			ready: ready,
			clientHealth: entitys.player2.health,
			serverHealth: entitys.player1.health,
			damaged: controller,
			clientDied: serverDied,
			serverDied: clientDied
		}));
		controller = false
	}

	if (acumuladorTempo >= intervaloFrame) {
		frameAtual = (frameAtual + 1) % totalFrames;
		acumuladorTempo -= intervaloFrame;
	}

	if (entitys.player1.x < -10) entitys.player1.x = -10;
	if (entitys.player1.x > 910) entitys.player1.x = 910;

	if (checkCollision(entitys.player1, platforms.floor)) {
		entitys.player1.y = platforms.floor.y - entitys.player1.h;
		entitys.player1.vy = 0;
		entitys.player1.noChao = true;
	} else {
		entitys.player1.noChao = false;
	}

	renderizar();
	requestAnimationFrame(loopPrincipal);
}

function renderizar() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = platforms.floor.color;
	ctx.fillRect(0, platforms.floor.y, platforms.floor.w, platforms.floor.h);

	if (!clientDied) {
		ctx.drawImage(
			imagemAtual,
			frameAtual * larguraSprite, 0, larguraSprite, alturaSprite,
			entitys.player1.x, entitys.player1.y, larguraSprite * 3, alturaSprite * 3
		);
	}

	if (!serverReady) return;
	if (serverDied) return;
	ctx.drawImage(
		imagemOther,
		frameAtual * larguraSprite, 0, larguraSprite, alturaSprite,
		entitys.player2.x, entitys.player2.y, larguraSprite * 3, alturaSprite * 3
	);
}

function checkCollision(obj1, obj2) {
	return obj1.x < obj2.x + obj2.w &&
		obj1.x + obj1.w > obj2.x &&
		obj1.y < obj2.y + obj2.h &&
		obj1.y + obj1.h > obj2.y;
};

window.addEventListener("resize", isAMobile)
document.addEventListener("DOMContentLoaded", isAMobile)

document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		ultimoTempo = performance.now()
	} else {
		ultimoTempo = performance.now()
	}
})