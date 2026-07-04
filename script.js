// --- 🎵 CONFIGURAÇÃO DOS SEUS ARQUIVOS MP3 e IMAGENS 🎵 ---
const ARQUIVOS_DE_AUDIO = {
    musicaFundo: 'sounds/music.mp3', passoNormal: 'sounds/walk.mp3',
    passoCorrer: 'sounds/run.mp3', passoAgua: 'sounds/walk_water.mp3',
    lanterna: 'sounds/click_lantern.mp3', portaAbrir: 'sounds/open_door.mp3',  
    portaFechar: 'sounds/close_door.mp3', pulo: 'sounds/jump.mp3'
};
const CAMINHO_QUADRO_IMAGEM = 'img/tumoritus.jpeg';

// --- SISTEMA INVENTÁRIO E ESTADO ---
let inventario = { madeira: 0, machado: 1, planta_p: 0, planta_m: 0, planta_g: 0 };
let itemAtivo = 'machado';
let tempoSegurandoClique = 0, estaMinando = false, arvoreSendoCortada = null;
let modoConstrucaoAtivo = false, tipoCasaParaConstruir = null, hologramaVisual = null;
let anguloRotacaoHolograma = 0; 

// --- SISTEMA DE ESCADAS DA CASA ---
let listaEscadas = [];

// --- CONFIGURAÇÃO INICIAL DO ESPAÇO 3D ---
const container = document.getElementById('canvas-container');
const instrucoes = document.getElementById('instrucoes');
const promptInteracao = document.getElementById('prompt-interacao');
const btnFullscreen = document.getElementById('btn-fullscreen');
const controlesMobileDiv = document.getElementById('controles-mobile');
const menuCrafting = document.getElementById('menu-crafting');
const barraProgressoContainer = document.getElementById('barra-coleta-container');
const barraProgressoPreenchimento = document.getElementById('barra-coleta-progresso');
const btnGirarPlantaMobile = document.getElementById('btn-girar-planta');

const cena = new THREE.Scene();
const corDia = new THREE.Color(0xa0c4ff), corNoite = new THREE.Color(0x050510), corOcaso = new THREE.Color(0xd97706);
cena.background = corDia.clone(); cena.fog = new THREE.FogExp2(0xa0c4ff, 0.006); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraContainer = new THREE.Group(); cena.add(cameraContainer); cameraContainer.add(camera);

const renderizador = new THREE.WebGLRenderer({ antialias: true });
renderizador.setSize(window.innerWidth, window.innerHeight);
renderizador.shadowMap.enabled = true; renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderizador.domElement);

let ehTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
let moverFrente = false, moverTras = false, moverEsquerda = false, moverDireita = false, podeSaltar = false, correndo = false, lanternaLigada = false;

// OTIMIZAÇÃO: Vetores fixos para evitar sobrecarga de memória nas rotações da casa
const vetorColisaoAux = new THREE.Vector3();
const eixoY = new THREE.Vector3(0, 1, 0);

// --- CONTROLES MOBILE (JOYSTICK) ---
if (ehTouch && typeof nipplejs !== 'undefined') {
    controlesMobileDiv.style.display = 'block';
    const manager = nipplejs.create({
        zone: document.getElementById('zona-joystick'),
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'white'
    });
    manager.on('move', (evt, data) => {
        moverFrente = false; moverTras = false; moverEsquerda = false; moverDireita = false;
        const angle = data.angle.degree;
        if (angle > 45 && angle < 135) moverFrente = true;
        else if (angle > 225 && angle < 315) moverTras = true;
        if (angle <= 45 || angle >= 315) moverDireita = true;
        else if (angle >= 135 && angle <= 225) moverEsquerda = true;
    });
    manager.on('end', () => { moverFrente = moverTras = moverEsquerda = moverDireita = false; });
}

// --- LISTAS DE INTERAÇÃO E FÍSICA ---
const raycaster = new THREE.Raycaster();
const vetorCentroTela = new THREE.Vector2(0, 0);
const objetosRaycast = []; const objetosMundo = []; const zonasInteriores = []; const todasAsPortas = [];

if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e => console.log(e)); else document.exitFullscreen(); });
}

// --- ÁUDIO CONTROLES ---
const ouvinteAudio = new THREE.AudioListener(); camera.add(ouvinteAudio);
const carregadorAudio = new THREE.AudioLoader();
const somMusicaFundo = new THREE.Audio(ouvinteAudio), somPassoNormal = new THREE.Audio(ouvinteAudio), somPassoCorrer = new THREE.Audio(ouvinteAudio), somPassoAgua = new THREE.Audio(ouvinteAudio), somLanterna = new THREE.Audio(ouvinteAudio), somPortaAbrir = new THREE.Audio(ouvinteAudio), somPortaFechar = new THREE.Audio(ouvinteAudio), somPulo = new THREE.Audio(ouvinteAudio);

let audiosCarregados = false;
function carregarTodosOsAudios() {
    if (audiosCarregados) return;
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.musicaFundo, b => { somMusicaFundo.setBuffer(b); somMusicaFundo.setLoop(true); somMusicaFundo.setVolume(0.3); somMusicaFundo.play(); }, undefined, () => {});
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.passoNormal, b=> {somPassoNormal.setBuffer(b); somPassoNormal.setLoop(true); somPassoNormal.setVolume(0.5);});
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.passoCorrer, b=> {somPassoCorrer.setBuffer(b); somPassoCorrer.setLoop(true); somPassoCorrer.setVolume(0.6);});
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.passoAgua, b=> {somPassoAgua.setBuffer(b); somPassoAgua.setLoop(true); somPassoAgua.setVolume(0.6);});
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.lanterna, b=> {somLanterna.setBuffer(b); somLanterna.setVolume(0.4);});
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.portaAbrir, b=> {somPortaAbrir.setBuffer(b); somPortaAbrir.setVolume(0.6);});
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.portaFechar, b=> {somPortaFechar.setBuffer(b); somPortaFechar.setVolume(0.6);});
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.pulo, b=> {somPulo.setBuffer(b); somPulo.setVolume(0.5);});
    audiosCarregados = true;
}

// --- SISTEMA DE NOTIFICAÇÕES ---
function mostrarNotificacao(msg, cor = '#ef4444') {
    const notif = document.getElementById('notificacao');
    if (!notif) return;
    notif.innerText = msg;
    notif.style.borderLeftColor = cor;
    notif.style.display = 'block';
    notif.style.opacity = '1';
    clearTimeout(notif.timeoutId);
    notif.timeoutId = setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.style.display = 'none', 300);
    }, 3000);
}

// --- CONTROLES E INPUTS ---
const controles = new THREE.PointerLockControls(cameraContainer, document.body);
instrucoes.addEventListener('click', () => { if(!ehTouch) controles.lock(); else { instrucoes.style.display = 'none'; carregarTodosOsAudios(); } });
controles.addEventListener('lock', () => { instrucoes.style.display = 'none'; carregarTodosOsAudios(); });
controles.addEventListener('unlock', () => { if(!ehTouch && menuCrafting.style.display !== 'block') { instrucoes.style.display = 'block'; promptInteracao.style.display = 'none'; pararSonsDeMovimento(); } });
cena.add(controles.getObject());

let toqueIniciado = false, anteriorToqueX = 0, anteriorToqueY = 0;
window.addEventListener('touchstart', (e) => { 
    const joystickZone = document.getElementById('zona-joystick');
    if (e.target.tagName !== 'BUTTON' && (!joystickZone || !joystickZone.contains(e.target)) && menuCrafting.style.display !== 'block') { 
        toqueIniciado = true; anteriorToqueX = e.touches[0].pageX; anteriorToqueY = e.touches[0].pageY; 
    } 
}, {passive: true});
window.addEventListener('touchmove', (e) => { if (!toqueIniciado) return; const movX = e.touches[0].pageX - anteriorToqueX, movY = e.touches[0].pageY - anteriorToqueY; cameraContainer.rotation.y -= movX * 0.005; camera.rotation.x -= movY * 0.005; camera.rotation.x = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, camera.rotation.x)); anteriorToqueX = e.touches[0].pageX; anteriorToqueY = e.touches[0].pageY; }, {passive: true});
window.addEventListener('touchend', () => { toqueIniciado = false; });

const velocidade = new THREE.Vector3(), direcao = new THREE.Vector3();
const ALTURA_JOGADOR = 2.0, FORCA_SALTO = 14.0, GRAVIDADE = 38.0; let VELOCIDADE_BASE = 90.0; 
let temporizadorBobbing = 0, audioAtualTocando = null;

let mesaTrabalhoMesh = null, menuCraftingAberto = false;

function atualizarUIAktiv() {
    const slotP = document.getElementById('slot-casa-p');
    const slotM = document.getElementById('slot-casa-m');
    const slotG = document.getElementById('slot-casa-g');
    
    if(slotP) slotP.style.display = inventario.planta_p > 0 ? 'flex' : 'none';
    if(slotM) slotM.style.display = inventario.planta_m > 0 ? 'flex' : 'none';
    if(slotG) slotG.style.display = inventario.planta_g > 0 ? 'flex' : 'none';
    
    document.querySelectorAll('.slot-item').forEach(el => el.classList.remove('ativo'));
    if (itemAtivo.startsWith('planta_') && inventario[itemAtivo] <= 0) itemAtivo = 'machado';

    if(itemAtivo === 'machado') document.getElementById('slot-machado')?.classList.add('ativo');
    if(itemAtivo === 'madeira') document.getElementById('slot-madeira')?.classList.add('ativo');
    if(itemAtivo === 'planta_p' && slotP) slotP.classList.add('ativo');
    if(itemAtivo === 'planta_m' && slotM) slotM.classList.add('ativo');
    if(itemAtivo === 'planta_g' && slotG) slotG.classList.add('ativo');

    if(itemAtivo.startsWith('planta_') && inventario[itemAtivo] > 0) { 
        modoConstrucaoAtivo = true; tipoCasaParaConstruir = itemAtivo.split('_')[1]; ativarHolograma(tipoCasaParaConstruir); 
        if (btnGirarPlantaMobile) btnGirarPlantaMobile.style.display = 'block';
    } else { 
        modoConstrucaoAtivo = false; desativarHolograma(); 
        if (btnGirarPlantaMobile) btnGirarPlantaMobile.style.display = 'none';
    }
}

// --- ADIÇÃO: CLIQUE/TOQUE NOS ITENS DO INVENTÁRIO ---
document.querySelectorAll('.slot-item').forEach(slot => {
    ['mousedown', 'touchstart'].forEach(tipoEvento => {
        slot.addEventListener(tipoEvento, (e) => {
            // e.stopPropagation() é crucial aqui para que o toque não passe para o cenário 
            // e faça o personagem bater o machado ou construir algo sem querer.
            e.stopPropagation(); 
            
            let novoItem = slot.getAttribute('data-item');
            
            // Só permite equipar plantas se você tiver pelo menos 1 no inventário
            if (novoItem.startsWith('planta_') && inventario[novoItem] <= 0) {
                return;
            }
            
            itemAtivo = novoItem;
            atualizarUIAktiv();
        });
    });
});

window.addEventListener('keydown', (e) => {
    if(e.code === 'Digit1') { itemAtivo = 'machado'; atualizarUIAktiv(); }
    if(e.code === 'Digit2') { itemAtivo = 'madeira'; atualizarUIAktiv(); }
    if(e.code === 'Digit3' && inventario.planta_p > 0) { itemAtivo = 'planta_p'; atualizarUIAktiv(); }
    if(e.code === 'Digit4' && inventario.planta_m > 0) { itemAtivo = 'planta_m'; atualizarUIAktiv(); }
    if(e.code === 'Digit5' && inventario.planta_g > 0) { itemAtivo = 'planta_g'; atualizarUIAktiv(); }
    
    if(modoConstrucaoAtivo && hologramaVisual) {
        if(e.code === 'KeyR') { anguloRotacaoHolograma += Math.PI / 2; } 
        if(e.code === 'KeyT') { anguloRotacaoHolograma -= Math.PI / 2; } 
    }
});

window.addEventListener('mousedown', (e) => {
    if (menuCraftingAberto || instrucoes.style.display !== 'none') return;
    if (modoConstrucaoAtivo) { executarConstrucaoReal(); } 
    else if (itemAtivo === 'machado' && e.button === 0) { estaMinando = true; tempoSegurandoClique = 0; }
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) { estaMinando = false; tempoSegurandoClique = 0; if (barraProgressoContainer) barraProgressoContainer.style.display = 'none'; } });

window.addEventListener('touchstart', (e) => {
    if (menuCraftingAberto || instrucoes.style.display !== 'none') return;
    const joystickZone = document.getElementById('zona-joystick');
    if (e.target.tagName === 'BUTTON' || (joystickZone && joystickZone.contains(e.target))) return;
    if (modoConstrucaoAtivo) { executarConstrucaoReal(); } else if (itemAtivo === 'machado') { estaMinando = true; tempoSegurandoClique = 0; }
}, {passive: true});
window.addEventListener('touchend', () => { estaMinando = false; tempoSegurandoClique = 0; if (barraProgressoContainer) barraProgressoContainer.style.display = 'none'; });

const noKeyDown = (evento) => {
    if(menuCraftingAberto && evento.code !== 'KeyE') return;
    switch (evento.code) { case 'KeyW': moverFrente = true; break; case 'KeyS': moverTras = true; break; case 'KeyA': moverEsquerda = true; break; case 'KeyD': moverDireita = true; break; case 'ShiftLeft': correndo = true; break; case 'KeyF': alternarLanterna(); break; case 'KeyE': processarInteracaoGeral(); break; case 'Space': executarPulo(); break; }
};
const noKeyUp = (evento) => {
    switch (evento.code) { case 'KeyW': moverFrente = false; break; case 'KeyS': moverTras = false; break; case 'KeyA': moverEsquerda = false; break; case 'KeyD': moverDireita = false; break; case 'ShiftLeft': correndo = false; break; }
};
document.addEventListener('keydown', noKeyDown); document.addEventListener('keyup', noKeyUp);

function alternarLanterna() { lanternaLigada = !lanternaLigada; luzLanterna.visible = lanternaLigada; if (somLanterna.buffer) somLanterna.play(); }
function executarPulo() { if (podeSaltar) { velocidade.y = FORCA_SALTO; podeSaltar = false; pararSonsDeMovimento(); if (somPulo.buffer) somPulo.play(); } }

function processarInteracaoGeral() {
    if (menuCraftingAberto) { 
        menuCrafting.style.display = 'none'; menuCraftingAberto = false; controles.lock(); return; 
    }
    
    raycaster.setFromCamera(vetorCentroTela, camera);
    const alvos = raycaster.intersectObjects(objetosRaycast, true);
    
    if (alvos.length > 0 && alvos[0].distance < 4.0) {
        let objAlvo = alvos[0].object;
        if (objAlvo.userData && typeof objAlvo.userData.interagir === 'function') {
            objAlvo.userData.interagir(); return;
        }
        
        let noPai = objAlvo;
        let interagiu = false;
        while(noPai && noPai !== cena) {
            if(noPai.userData && noPai.userData.ePorta) {
                noPai.userData.aberta = !noPai.userData.aberta;
                if (noPai.userData.aberta && somPortaAbrir.buffer) somPortaAbrir.play();
                else if (!noPai.userData.aberta && somPortaFechar.buffer) somPortaFechar.play();
                interagiu = true; break;
            }
            if(noPai === mesaTrabalhoMesh || noPai.parent === mesaTrabalhoMesh) {
                menuCraftingAberto = true; menuCrafting.style.display = 'block'; pararSonsDeMovimento(); controles.unlock(); return;
            }
            noPai = noPai.parent;
        }
        if (interagiu) return; // Se abriu a porta, não sobe na escada
    }

    const posJ = controles.getObject().position;
    for (let i = 0; i < listaEscadas.length; i++) {
        const escada = listaEscadas[i];
        const dx = posJ.x - escada.x;
        const dz = posJ.z - escada.z;
        const distHorizontal = Math.sqrt(dx * dx + dz * dz);

        // Distância super confortável e precisa agora
        if (distHorizontal < 2.5) {
            if (posJ.y < (escada.yBase + 3.0)) controles.getObject().position.y = escada.yTopo + ALTURA_JOGADOR;
            else controles.getObject().position.y = escada.yBase + ALTURA_JOGADOR;
            velocidade.set(0, 0, 0); 
            return;
        }
    }
}
window.craftarConstrucao = function(tipo, custo) {
    if(inventario.madeira >= custo) {
        inventario.madeira -= custo; 
        const txtMadeira = document.getElementById('txt-qtd-madeira');
        if(txtMadeira) txtMadeira.innerText = inventario.madeira;
        if(tipo === 'p') inventario.planta_p++;
        if(tipo === 'm') inventario.planta_m++;
        if(tipo === 'g') inventario.planta_g++;
        atualizarUIAktiv();
        mostrarNotificacao("Planta criada! Equipe apertando as teclas de 1 a 5.", "#22c55e");
        window.processarInteracaoGeral();
    } else mostrarNotificacao("Madeiras insuficientes!", "#ef4444");
};
document.getElementById('btn-fechar-crafting')?.addEventListener('click', () => processarInteracaoGeral());

document.getElementById('btn-lanterna')?.addEventListener('touchstart', (e) => { e.preventDefault(); alternarLanterna(); });
document.getElementById('btn-pulo')?.addEventListener('touchstart', (e) => { e.preventDefault(); executarPulo(); });
document.getElementById('btn-interagir')?.addEventListener('touchstart', (e) => { e.preventDefault(); processarInteracaoGeral(); });
btnGirarPlantaMobile?.addEventListener('touchstart', (e) => { e.preventDefault(); if(modoConstrucaoAtivo) anguloRotacaoHolograma += Math.PI / 2; });

const bCorrida = document.getElementById('btn-corrida');
if(bCorrida) {
    bCorrida.addEventListener('touchstart', (e) => { e.preventDefault(); correndo = !correndo; if(correndo) bCorrida.classList.add('btn-ativo'); else bCorrida.classList.remove('btn-ativo'); });
}

function pararSonsDeMovimento() { if (somPassoNormal.isPlaying) somPassoNormal.stop(); if (somPassoCorrer.isPlaying) somPassoCorrer.stop(); if (somPassoAgua.isPlaying) somPassoAgua.stop(); audioAtualTocando = null; }

const luzLanterna = new THREE.SpotLight(0xfffdd0, 4.0, 50, Math.PI / 5, 0.6, 1);
luzLanterna.castShadow = true; luzLanterna.shadow.mapSize.width = 1024; luzLanterna.shadow.mapSize.height = 1024; luzLanterna.visible = false; camera.add(luzLanterna); luzLanterna.position.set(0.3, -0.4, -0.2); luzLanterna.target = new THREE.Object3D(); camera.add(luzLanterna.target); luzLanterna.target.position.set(0, 0, -1);

function gerarTexturaGrama() { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#1e3f20'; ctx.fillRect(0, 0, 512, 512); for (let i = 0; i < 20000; i++) { ctx.fillStyle = Math.random() > 0.5 ? '#152e16' : '#254a27'; ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3); } const textura = new THREE.CanvasTexture(canvas); textura.wrapS = THREE.RepeatWrapping; textura.wrapT = THREE.RepeatWrapping; textura.repeat.set(60, 60); return textura; }
function gerarTexturaTronco() { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#5c321a'; ctx.fillRect(0, 0, 512, 512); for (let i = 0; i < 900; i++) { ctx.fillStyle = Math.random() > 0.4 ? '#3b1f10' : '#472613'; ctx.fillRect(Math.random() * 512, 0, Math.random() * 5 + 2, 512); } return new THREE.CanvasTexture(canvas); }
function gerarTexturaAgua() { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#1d4ed8'; ctx.fillRect(0, 0, 256, 256); for(let i=0; i<40; i++) { ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = Math.random() * 2 + 1; ctx.beginPath(); let yFixo = Math.random() * 256; ctx.moveTo(0, yFixo); ctx.lineTo(256, yFixo); ctx.stroke(); } const textura = new THREE.CanvasTexture(canvas); textura.wrapS = THREE.RepeatWrapping; textura.wrapT = THREE.RepeatWrapping; textura.repeat.set(8, 8); return textura; }
const texturaGrama = gerarTexturaGrama(), texturaTronco = gerarTexturaTronco(), texturaAgua = gerarTexturaAgua();
const matTroncoGlobal = new THREE.MeshStandardMaterial({ map: texturaTronco, roughness: 0.85 });
const matPisoGlobal = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.9 });
const matTelhadoCabana = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.9 });
const matVidroGlobal = new THREE.MeshStandardMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.8 });

const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.5); cena.add(luzAmbiente);
const luzSol = new THREE.DirectionalLight(0xfffaed, 0.9); luzSol.castShadow = true; luzSol.shadow.mapSize.width = 2048; luzSol.shadow.mapSize.height = 2048; cena.add(luzSol);
const geoSol = new THREE.SphereGeometry(6, 16, 16), matSol = new THREE.MeshBasicMaterial({ color: 0xfff6e0 }), meshSol = new THREE.Mesh(geoSol, matSol); cena.add(meshSol);
const geoLua = new THREE.SphereGeometry(4, 16, 16), matLua = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }), meshLua = new THREE.Mesh(geoLua, matLua); cena.add(meshLua);

let sistemaEstrelas; function criarEstrelas() { const contagem = 1200; const geo = new THREE.BufferGeometry(); const pos = new Float32Array(contagem * 3); for (let i = 0; i < contagem * 3; i += 3) { const raio = 350, u = Math.random(), v = Math.random(), theta = u * 2.0 * Math.PI, phi = Math.acos(2.0 * v - 1.0); pos[i] = raio * Math.sin(phi) * Math.cos(theta); pos[i + 1] = Math.abs(raio * Math.sin(phi) * Math.sin(theta)); pos[i + 2] = raio * Math.cos(phi); } geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sistemaEstrelas = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, transparent: true, opacity: 0 })); cena.add(sistemaEstrelas); } criarEstrelas();

const ponteX = 20, ponteZ = -6, larguraPonte = 5, comprimentoPonte = 94, NIVEL_DA_AGUA = -2.0, alturaPonteY = NIVEL_DA_AGUA + 2.8; 
const tamanhoMapa = 400, segmentos = 100; const gTerreno = new THREE.PlaneGeometry(tamanhoMapa, tamanhoMapa, segmentos, segmentos); const posicoes = gTerreno.attributes.position;
for (let i = 0; i < posicoes.count; i++) {
    const x = posicoes.getX(i), y = posicoes.getY(i); let altura = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 1.2;
    const rRio = Math.sin(x * 0.02) * 50, distRio = Math.abs(y - rRio), rCor = Math.cos(y * 0.03) * 30 + 60, distCor = Math.abs(x - rCor);
    if (distRio < 25) altura -= Math.cos((distRio / 25) * Math.PI / 2) * 6.5; if (distCor < 12) altura -= Math.cos((distCor / 12) * Math.PI / 2) * 4.0;
    if (Math.sqrt(x*x + y*y) > 70 && distRio > 32) altura += Math.abs(Math.sin(x * 0.015) * Math.cos(y * 0.015)) * 22 * ((Math.sqrt(x*x + y*y) - 70) / 130); 
    if (Math.abs(x - ponteX) < 4) { const distN = Math.sqrt(Math.pow(x - ponteX, 2) + Math.pow(y - (ponteZ - comprimentoPonte/2), 2)); if (distN < 10) altura = altura * (1 - Math.cos((distN / 10) * Math.PI / 2)) + ((alturaPonteY - 1.5) * Math.cos((distN / 10) * Math.PI / 2)); const distS = Math.sqrt(Math.pow(x - ponteX, 2) + Math.pow(y - (ponteZ + comprimentoPonte/2), 2)); if (distS < 10) altura = altura * (1 - Math.cos((distS / 10) * Math.PI / 2)) + ((alturaPonteY - 1.5) * Math.cos((distS / 10) * Math.PI / 2)); } posicoes.setZ(i, altura);
}
gTerreno.computeVertexNormals(); const terreno = new THREE.Mesh(gTerreno, new THREE.MeshStandardMaterial({ map: texturaGrama, roughness: 0.85 })); terreno.rotation.x = -Math.PI / 2; terreno.receiveShadow = true; cena.add(terreno); objetosRaycast.push(terreno);
const agua = new THREE.Mesh(new THREE.PlaneGeometry(tamanhoMapa, tamanhoMapa), new THREE.MeshStandardMaterial({ map: texturaAgua, color: 0x2563eb, roughness: 0.05, transparent: true, opacity: 0.8 })); agua.rotation.x = -Math.PI / 2; agua.position.y = NIVEL_DA_AGUA; cena.add(agua); objetosRaycast.push(agua);

function obterAlturaTerreno(x, z) { const col = Math.floor((x + tamanhoMapa / 2) / tamanhoMapa * segmentos), lin = Math.floor((z + tamanhoMapa / 2) / tamanhoMapa * segmentos); if (col < 0 || col >= segmentos || lin < 0 || lin >= segmentos) return 0; let h = gTerreno.attributes.position.getZ(lin * (segmentos + 1) + col) || 0; return h < NIVEL_DA_AGUA ? NIVEL_DA_AGUA : h; }

// Ponte
const ponteGrupo = new THREE.Group(); const pisoPonte = new THREE.Mesh(new THREE.BoxGeometry(larguraPonte, 0.3, comprimentoPonte), matTroncoGlobal); pisoPonte.castShadow = true; pisoPonte.receiveShadow = true; ponteGrupo.add(pisoPonte);
const corrimaoEsq = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, comprimentoPonte), matTroncoGlobal); corrimaoEsq.position.set(-larguraPonte/2 + 0.1, 1.0, 0); ponteGrupo.add(corrimaoEsq); const corrimaoDir = corrimaoEsq.clone(); corrimaoDir.position.x = larguraPonte/2 - 0.1; ponteGrupo.add(corrimaoDir);
for(let zOffset = -comprimentoPonte/2; zOffset <= comprimentoPonte/2; zOffset += 4) { const pEsq = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), matTroncoGlobal); pEsq.position.set(-larguraPonte/2 + 0.1, 0.5, zOffset); pEsq.castShadow = true; ponteGrupo.add(pEsq); const pDir = pEsq.clone(); pDir.position.x = larguraPonte/2 - 0.1; ponteGrupo.add(pDir); }
const numDegraus = 5, profDeg = 0.8, totEscada = numDegraus * profDeg;
for (let i = 1; i <= numDegraus; i++) { const gDeg = new THREE.BoxGeometry(larguraPonte, 0.4, profDeg); const altY = -(i * 0.35), distZ = (i * profDeg) - (profDeg/2); const dN = new THREE.Mesh(gDeg, matTroncoGlobal); dN.position.set(0, altY, -comprimentoPonte/2 - distZ); dN.castShadow = true; ponteGrupo.add(dN); const dS = new THREE.Mesh(gDeg, matTroncoGlobal); dS.position.set(0, altY, comprimentoPonte/2 + distZ); dS.castShadow = true; ponteGrupo.add(dS); }
ponteGrupo.position.set(ponteX, alturaPonteY, ponteZ); cena.add(ponteGrupo); objetosRaycast.push(ponteGrupo);

zonasInteriores.push({ 
    tipo: 'ponte', 
    minX: ponteX - larguraPonte/2, 
    maxX: ponteX + larguraPonte/2, 
    corpoMinZ: ponteZ - comprimentoPonte/2, 
    corpoMaxZ: ponteZ + comprimentoPonte/2, 
    yBase: alturaPonteY, 
    escadaL: totEscada 
});

// CABANA ORIGINAL
let cabanaX = -15, cabanaZ = -20;
const hCabana = obterAlturaTerreno(cabanaX, cabanaZ);
function gerarPorta(x, y, z, parentGroup) {
    const grupoDob = new THREE.Group(); grupoDob.position.set(x, y, z); 
    const meshP = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.8, 0.15), new THREE.MeshStandardMaterial({ color: 0x311b0b, roughness: 0.7 })); meshP.position.set(0.75, 1.4, 0); meshP.castShadow = true; grupoDob.add(meshP);
    grupoDob.userData = { ePorta: true, aberta: false }; parentGroup.add(grupoDob); todasAsPortas.push(grupoDob); return grupoDob;
}
const grupoCabana = new THREE.Group();
const pEsq = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 5), matTroncoGlobal); pEsq.position.set(-3, 2.2, 0); pEsq.castShadow = true; grupoCabana.add(pEsq);
const pDir = pEsq.clone(); pDir.position.x = 3; grupoCabana.add(pDir);
const pTras = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 0.3), matTroncoGlobal); pTras.position.set(0, 2.2, -2.5); pTras.castShadow = true; grupoCabana.add(pTras);
const pFEsq = new THREE.Mesh(new THREE.BoxGeometry(2.25, 4, 0.3), matTroncoGlobal); pFEsq.position.set(-1.875, 2.2, 2.5); pFEsq.castShadow = true; grupoCabana.add(pFEsq);
const pFDir = pFEsq.clone(); pFDir.position.x = 1.875; grupoCabana.add(pFDir);
const vTopo = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.3), matTroncoGlobal); vTopo.position.set(0, 3.6, 2.5); grupoCabana.add(vTopo);
const pisoCab = new THREE.Mesh(new THREE.BoxGeometry(6, 0.55, 5), matPisoGlobal); pisoCab.position.set(0, 0.275, 0); grupoCabana.add(pisoCab);
const telhadoCab = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.5, 4), matTelhadoCabana); telhadoCab.position.y = 5.45; telhadoCab.rotation.y = Math.PI / 4; telhadoCab.castShadow = true; grupoCabana.add(telhadoCab);

mesaTrabalhoMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.0), new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 })); mesaTrabalhoMesh.position.set(1.8, 0.65, -1.5); mesaTrabalhoMesh.castShadow = true; mesaTrabalhoMesh.receiveShadow = true; grupoCabana.add(mesaTrabalhoMesh);
const tampoVisM = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.1), new THREE.MeshStandardMaterial({ color: 0x78350f })); tampoVisM.position.set(1.8, 1.1, -1.5); grupoCabana.add(tampoVisM);

gerarPorta(-0.75, 0.2, 2.5, grupoCabana);
grupoCabana.position.set(cabanaX, hCabana, cabanaZ); cena.add(grupoCabana); objetosRaycast.push(grupoCabana);
zonasInteriores.push({ tipo: 'casa', x: cabanaX, z: cabanaZ, w: 5.6, d: 4.6, pisos: [hCabana + 0.5], pisoMax: 1 });

// Colisões precisas da Cabana inicial
objetosMundo.push({ isBox: true, minX: cabanaX - 3.15, maxX: cabanaX - 2.85, minZ: cabanaZ - 2.5, maxZ: cabanaZ + 2.5, topoY: hCabana + 4 }); 
objetosMundo.push({ isBox: true, minX: cabanaX + 2.85, maxX: cabanaX + 3.15, minZ: cabanaZ - 2.5, maxZ: cabanaZ + 2.5, topoY: hCabana + 4 }); 
objetosMundo.push({ isBox: true, minX: cabanaX - 3, maxX: cabanaX + 3, minZ: cabanaZ - 2.65, maxZ: cabanaZ - 2.35, topoY: hCabana + 4 }); 
objetosMundo.push({ isBox: true, minX: cabanaX - 3, maxX: cabanaX - 0.75, minZ: cabanaZ + 2.35, maxZ: cabanaZ + 2.65, topoY: hCabana + 4 }); 
objetosMundo.push({ isBox: true, minX: cabanaX + 0.75, maxX: cabanaX + 3, minZ: cabanaZ + 2.35, maxZ: cabanaZ + 2.65, topoY: hCabana + 4 }); 

// Fogueira e Nuvens
const fogueiraX = -15, fogueiraZ = -13; const alturaChaoFogo = obterAlturaTerreno(fogueiraX, fogueiraZ);
for(let a=0; a<Math.PI*2; a+=Math.PI/4) { const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), new THREE.MeshStandardMaterial({ color: 0x555555 })); p.position.set(fogueiraX + Math.cos(a)*0.6, alturaChaoFogo + 0.1, fogueiraZ + Math.sin(a)*0.6); cena.add(p); }
const countPart = 35; const geoPart = new THREE.BufferGeometry(); const posPart = new Float32Array(countPart * 3); const dadosPart = [];
for(let i=0; i<countPart; i++) { posPart[i*3] = fogueiraX + (Math.random()-0.5)*0.3; posPart[i*3+1] = alturaChaoFogo + Math.random()*2; posPart[i*3+2] = fogueiraZ + (Math.random()-0.5)*0.3; dadosPart.push({ vY: Math.random()*1.5+1, vX: (Math.random()-0.5)*0.2, vZ: (Math.random()-0.5)*0.2 }); }
geoPart.setAttribute('position', new THREE.BufferAttribute(posPart, 3)); const sistemaFumaça = new THREE.Points(geoPart, new THREE.PointsMaterial({ color: 0xff4500, size: 0.25, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })); cena.add(sistemaFumaça);
const luzFogo = new THREE.PointLight(0xff7700, 2.0, 10); luzFogo.position.set(fogueiraX, alturaChaoFogo + 0.5, fogueiraZ); cena.add(luzFogo);

const grupoNuvens = new THREE.Group(); const matNuven = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
for(let n=0; n<12; n++) { const nuvem = new THREE.Group(); const pedacos = Math.floor(Math.random()*3 + 3); for(let p=0; p<pedacos; p++) { const b = new THREE.Mesh(new THREE.BoxGeometry(6+p*2, 3, 5), matNuven); b.position.set(p*2.5 - pedacos, Math.random()*0.5, (Math.random()-0.5)*2); nuvem.add(b); } nuvem.position.set((Math.random()-0.5)*300, 45 + Math.random()*15, (Math.random()-0.5)*300); grupoNuvens.add(nuvem); } cena.add(grupoNuvens);

function criarArvoreDiferenciada(x, z) {
    if (Math.abs(x - ponteX) < 8 && Math.abs(z - ponteZ) < 56) return; if (Math.abs(x - cabanaX) < 8 && Math.abs(z - cabanaZ) < 8) return;
    const h = obterAlturaTerreno(x, z); if (h <= NIVEL_DA_AGUA) return;
    const grupoA = new THREE.Group(); const tipo = Math.floor(Math.random() * 3); let madeiraDrop = 3;
    const mod = 0.65 + Math.random() * 1.0, altT = (tipo === 2 ? 5.5 : 4.5) * mod, rT = (tipo === 1 ? 0.6 : 0.4) * mod;
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(rT * 0.7, rT, altT, 12), matTroncoGlobal); tronco.position.y = altT / 2; tronco.castShadow = true; tronco.receiveShadow = true; grupoA.add(tronco);
    const cFolha = (tipo===0) ? new THREE.Color().setHSL(0.32+Math.random()*0.03,0.7,0.22) : (tipo===1 ? new THREE.Color().setHSL(0.28+Math.random()*0.04,0.65,0.26) : new THREE.Color().setHSL(0.35+Math.random()*0.02,0.55,0.3));
    const mFolhas = new THREE.MeshStandardMaterial({ color: cFolha, roughness: 0.8, flatShading: true });
    if (tipo === 0) { for(let i=0; i<4; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry((2.5-(i*0.45))*mod, 2.5*mod, 10), mFolhas); f.position.y = (altT*0.7)+(i*1.2*mod); f.castShadow = true; grupoA.add(f); } } 
    else if (tipo === 1) { for (let i=0; i<4; i++) { const f = new THREE.Mesh(new THREE.DodecahedronGeometry((2.0+Math.random()*0.6)*mod, 1), mFolhas); f.position.set((Math.random()-0.5)*1.2*mod, altT+(i*0.8*mod), (Math.random()-0.5)*1.2*mod); f.castShadow = true; grupoA.add(f); } } 
    else { const f = new THREE.Mesh(new THREE.CylinderGeometry(1.2*mod, 1.6*mod, 3.5*mod, 8), mFolhas); f.position.y = altT+(1.75*mod); f.castShadow = true; grupoA.add(f); }
    grupoA.position.set(x, h, z); cena.add(grupoA);
    const objDados = { x: x, z: z, raio: 1.3 * mod, topoY: h + altT + (3.0 * mod), meshRaiz: grupoA, eArvore: true, madeirasDisponiveis: madeiraDrop };
    grupoA.userData = { dadosArvore: objDados }; objetosMundo.push(objDados); objetosRaycast.push(grupoA);
}
function criarRocha(x, z) {
    if (Math.abs(x - ponteX) < 6 && Math.abs(z - ponteZ) < 52) return; if (Math.abs(x - cabanaX) < 7 && Math.abs(z - cabanaZ) < 7) return;
    const s = Math.random() * 2 + 1.5, r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.9 }));
    const h = obterAlturaTerreno(x, z); r.position.set(x, h + (s*0.3), z); r.castShadow = true; cena.add(r); objetosMundo.push({ x: x, z: z, raio: s*1.2, topoY: h + (s*1.1), meshRaiz: r }); objetosRaycast.push(r);
}
for (let i = 0; i < 140; i++) { let x = (Math.random() - 0.5) * 340, z = (Math.random() - 0.5) * 340; if (Math.abs(x) > 12 || Math.abs(z) > 12) { if (Math.random() > 0.35) criarArvoreDiferenciada(x, z); else criarRocha(x, z); } }

controles.getObject().position.set(0, obterAlturaTerreno(0,0) + ALTURA_JOGADOR, 15);

// --- SISTEMA AVANÇADO DE CONSTRUÇÃO DE CASAS ---
function criarEscadaDeParede(grupoPai, x, y, z, altura) {
    const matMadeira = new THREE.MeshStandardMaterial({ color: 0x5c321a, roughness: 0.9 });
    const grupoEscada = new THREE.Group();
    const hasteEsq = new THREE.Mesh(new THREE.BoxGeometry(0.1, altura, 0.1), matMadeira);
    hasteEsq.position.set(-0.4, altura / 2, 0); hasteEsq.castShadow = true; grupoEscada.add(hasteEsq);
    const hasteDir = new THREE.Mesh(new THREE.BoxGeometry(0.1, altura, 0.1), matMadeira);
    hasteDir.position.set(0.4, altura / 2, 0); hasteDir.castShadow = true; grupoEscada.add(hasteDir);
    for (let i = 0.4; i < altura; i += 0.5) {
        const degrau = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), matMadeira);
        degrau.position.set(0, i, 0); degrau.castShadow = true; grupoEscada.add(degrau);
    }
    grupoEscada.position.set(x, y, z);
    grupoPai.add(grupoEscada);
}

function ativarHolograma(tipo) {
    if(hologramaVisual) cena.remove(hologramaVisual);
    hologramaVisual = new THREE.Group();
    let largura = (tipo === 'g') ? 14 : 7, profundidade = 6, altura = (tipo === 'p') ? 4 : 8;
    
    let malhaPrevia = new THREE.Mesh(
        new THREE.BoxGeometry(largura, altura, profundidade), 
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.4 })
    );
    malhaPrevia.position.y = altura / 2;
    hologramaVisual.add(malhaPrevia);
    
    let indicadorPorta = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2.8, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 })
    );
    indicadorPorta.position.set(0, 1.4, profundidade / 2); 
    hologramaVisual.add(indicadorPorta);

    anguloRotacaoHolograma = 0;
    hologramaVisual.visible = false; 
    cena.add(hologramaVisual);
}

function desativarHolograma() { if(hologramaVisual) { cena.remove(hologramaVisual); hologramaVisual = null; } }

function construirCasaDetalhada(tipo, posX, posY, posZ, rotacaoY) {
    const casa = new THREE.Group();
    const eGrossa = 0.3, w = (tipo === 'g') ? 14 : 7, d = 6, andares = (tipo === 'p') ? 1 : 2;
    let andaresLista = [posY + 0.5];
    if (andares === 2) andaresLista.push(posY + 4.5);
    
    function adicionarParedeComJanela(larguraTotal, alturaTotal, prof, px, py, pz, rotY, jLarg, jAlt) {
        const grp = new THREE.Group();
        const altBaixo = (alturaTotal - jAlt) / 2, largLado = (larguraTotal - jLarg) / 2;

        const pBx = new THREE.Mesh(new THREE.BoxGeometry(larguraTotal, altBaixo, prof), matTroncoGlobal);
        pBx.position.set(0, -alturaTotal/2 + altBaixo/2, 0); pBx.castShadow = true; grp.add(pBx);
        const pCm = new THREE.Mesh(new THREE.BoxGeometry(larguraTotal, altBaixo, prof), matTroncoGlobal);
        pCm.position.set(0, alturaTotal/2 - altBaixo/2, 0); pCm.castShadow = true; grp.add(pCm);
        const pEq = new THREE.Mesh(new THREE.BoxGeometry(largLado, jAlt, prof), matTroncoGlobal);
        pEq.position.set(-larguraTotal/2 + largLado/2, 0, 0); pEq.castShadow = true; grp.add(pEq);
        const pDr = new THREE.Mesh(new THREE.BoxGeometry(largLado, jAlt, prof), matTroncoGlobal);
        pDr.position.set(larguraTotal/2 - largLado/2, 0, 0); pDr.castShadow = true; grp.add(pDr);
        
        const vetro = new THREE.Mesh(new THREE.BoxGeometry(jLarg, jAlt, prof * 0.4), matVidroGlobal);
        grp.add(vetro); 
        grp.position.set(px, py, pz); grp.rotation.y = rotY;
        casa.add(grp);
    }

    if (tipo === 'g') {
        const piso1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), matPisoGlobal);
        piso1.position.y = 0.2; piso1.receiveShadow = true; casa.add(piso1);
        const piso2Completo = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), matPisoGlobal);
        piso2Completo.position.y = 4.2; piso2Completo.receiveShadow = true; casa.add(piso2Completo);

        // Janelas andar de baixo (restauradas)
        adicionarParedeComJanela(5, 4, eGrossa, -4.5, 2, 2.85, 0, 2.5, 1.8);
        adicionarParedeComJanela(5, 4, eGrossa, 4.5, 2, 2.85, 0, 2.5, 1.8);
        // Janelas andar de cima
        adicionarParedeComJanela(5, 4, eGrossa, -4.5, 6, 2.85, 0, 2.5, 1.8);
        adicionarParedeComJanela(5, 4, eGrossa, 4.5, 6, 2.85, 0, 2.5, 1.8);
        
        const pFrenteSag2 = new THREE.Mesh(new THREE.BoxGeometry(4, 4, eGrossa), matTroncoGlobal);
        pFrenteSag2.position.set(0, 6, 2.85); casa.add(pFrenteSag2);
        
        // Vão da porta restaurado
        const pFE = new THREE.Mesh(new THREE.BoxGeometry(1.25, 4, eGrossa), matTroncoGlobal); 
        pFE.position.set(-1.375, 2, 2.85); casa.add(pFE);
        const pFD = new THREE.Mesh(new THREE.BoxGeometry(1.25, 4, eGrossa), matTroncoGlobal); 
        pFD.position.set(1.375, 2, 2.85); casa.add(pFD);
        const vPorta = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, eGrossa), matTroncoGlobal); 
        vPorta.position.set(0, 3.4, 2.85); casa.add(vPorta);
        gerarPorta(-0.75, 0.2, 2.85, casa);

        const pTras1E = new THREE.Mesh(new THREE.BoxGeometry(5, 4, eGrossa), matTroncoGlobal);
        pTras1E.position.set(-4.5, 2, -2.85); casa.add(pTras1E);
        const pTras1D = new THREE.Mesh(new THREE.BoxGeometry(5, 4, eGrossa), matTroncoGlobal);
        pTras1D.position.set(4.5, 2, -2.85); casa.add(pTras1D);
        adicionarParedeComJanela(4, 4, eGrossa, 0, 2, -2.85, 0, 2.5, 1.8); 
        const pTras2 = new THREE.Mesh(new THREE.BoxGeometry(14, 4, eGrossa), matTroncoGlobal);
        pTras2.position.set(0, 6, -2.85); casa.add(pTras2);

        const pEsq = new THREE.Mesh(new THREE.BoxGeometry(eGrossa, 8, 6), matTroncoGlobal);
        pEsq.position.set(-6.85, 4, 0); casa.add(pEsq);
        const pDir = new THREE.Mesh(new THREE.BoxGeometry(eGrossa, 8, 6), matTroncoGlobal);
        pDir.position.set(6.85, 4, 0); casa.add(pDir);

        // Escada com cálculo de rotação global
        criarEscadaDeParede(casa, 0, 0.4, -2.6, 4.4);
        let cosR = Math.cos(rotacaoY), sinR = Math.sin(rotacaoY);
        let escGlobalX = posX + (0 * cosR - (-2.6) * sinR);
        let escGlobalZ = posZ + (0 * sinR + (-2.6) * cosR);
        listaEscadas.push({ x: escGlobalX, z: escGlobalZ, yBase: posY, yTopo: posY + 4.5 });

        // Telhado original restaurado
        const geoTelhado = new THREE.BoxGeometry(15, 3, 7);
        const pos = geoTelhado.attributes.position;
        for(let i=0; i<pos.count; i++) {
            if (pos.getY(i) > 0) { 
                let px = pos.getX(i);
                if (px > 0) pos.setX(i, px - 3.5);
                if (px < 0) pos.setX(i, px + 3.5);
                pos.setZ(i, 0);
            }
        }
        geoTelhado.computeVertexNormals();
        const telhado = new THREE.Mesh(geoTelhado, matTelhadoCabana);
        telhado.position.set(0, 9.5, 0); telhado.castShadow = true; casa.add(telhado);
        
    } else {
        const hTotalMuros = 4 * andares;
        for(let a=0; a<andares; a++) {
            const piso = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), matPisoGlobal);
            piso.position.y = (a * 4) + 0.2; piso.receiveShadow = true; casa.add(piso);
        }
        for(let a=0; a<andares; a++) {
            let yCentroMuro = (a * 4) + 2;
            adicionarParedeComJanela(d, 4, eGrossa, -w/2 + eGrossa/2, yCentroMuro, 0, Math.PI / 2, 2.2, 1.8);
            adicionarParedeComJanela(d, 4, eGrossa, w/2 - eGrossa/2, yCentroMuro, 0, Math.PI / 2, 2.2, 1.8);
            adicionarParedeComJanela(w, 4, eGrossa, 0, yCentroMuro, -d/2 + eGrossa/2, 0, 2.5, 1.8);
        }
        
        const pFE = new THREE.Mesh(new THREE.BoxGeometry((w/2) - 0.75, hTotalMuros, eGrossa), matTroncoGlobal); 
        pFE.position.set(-w/4 - 0.75/2, hTotalMuros/2, d/2 - eGrossa/2); pFE.castShadow = true; casa.add(pFE);
        const pFD = new THREE.Mesh(new THREE.BoxGeometry((w/2) - 0.75, hTotalMuros, eGrossa), matTroncoGlobal); 
        pFD.position.set(w/4 + 0.75/2, hTotalMuros/2, d/2 - eGrossa/2); pFD.castShadow = true; casa.add(pFD);
        const vPorta = new THREE.Mesh(new THREE.BoxGeometry(1.5, hTotalMuros-2.8, eGrossa), matTroncoGlobal); 
        vPorta.position.set(0, 2.8 + (hTotalMuros-2.8)/2, d/2 - eGrossa/2); casa.add(vPorta);
        
        gerarPorta(-0.75, 0.2, d/2 - eGrossa/2, casa);

        if (tipo === 'm') {
            let offsetZ = -d/2 + 1.0;
            criarEscadaDeParede(casa, 0, 0.4, offsetZ, 4.0);
            let cosR = Math.cos(rotacaoY), sinR = Math.sin(rotacaoY);
            let escGlobalX = posX + (0 * cosR - offsetZ * sinR);
            let escGlobalZ = posZ + (0 * sinR + offsetZ * cosR);
            listaEscadas.push({ x: escGlobalX, z: escGlobalZ, yBase: posY, yTopo: posY + 4.5 });
        }

        const telhado = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 2.5, 4), matTelhadoCabana);
        telhado.position.y = hTotalMuros + 1.25; telhado.rotation.y = Math.PI / 4; telhado.castShadow = true; casa.add(telhado);
    }

    casa.rotation.y = rotacaoY;
    casa.position.set(posX, posY, posZ);
    cena.add(casa);
    objetosRaycast.push(casa);

    const infoCasa = { 
        isCasaConstruida: true, x: posX, y: posY, z: posZ, w: w, d: d, rot: rotacaoY, topoY: posY + (andares * 4)
    };
    objetosMundo.push(infoCasa);

    zonasInteriores.push({ 
        tipo: 'casa_andares', x: posX, z: posZ, w: w, d: d, rot: rotacaoY,
        pisos: andaresLista, pisoMax: andares
    });
}

function executarConstrucaoReal() {
    if(!hologramaVisual || !hologramaVisual.visible) return;
    const posAlvo = hologramaVisual.position.clone();
    if(posAlvo.y <= NIVEL_DA_AGUA + 0.1) { mostrarNotificacao("Impossível construir na água!", "#ef4444"); return; }
    
    const posJ = controles.getObject().position;
    const larguraCasa = (tipoCasaParaConstruir === 'g') ? 14 : 7;
    const profundidadeCasa = 6;
    
    if (Math.abs(posJ.x - posAlvo.x) < larguraCasa/2 + 0.5 && Math.abs(posJ.z - posAlvo.z) < profundidadeCasa/2 + 0.5) {
        mostrarNotificacao("Saia do meio para construir a casa!", "#ef4444");
        return;
    }

    construirCasaDetalhada(tipoCasaParaConstruir, posAlvo.x, posAlvo.y, posAlvo.z, anguloRotacaoHolograma); 
    inventario['planta_' + tipoCasaParaConstruir]--;
    
    if(inventario['planta_' + tipoCasaParaConstruir] <= 0) { 
        inventario['planta_' + tipoCasaParaConstruir] = 0;
        itemAtivo = 'machado'; 
    }
    atualizarUIAktiv();
}

// --- LOOP DE ANIMAÇÃO PRINCIPAL ---
const relogio = new THREE.Clock(); let tempoCiclo = 0.5; 

function animar() {
    requestAnimationFrame(animar); const delta = Math.min(relogio.getDelta(), 0.1);

    if (texturaAgua) { texturaAgua.offset.x -= 0.6 * delta; texturaAgua.offset.y += 0.05 * delta; }
    
    todasAsPortas.forEach(porta => {
        let alvo = porta.userData.aberta ? -Math.PI / 1.8 : 0;
        porta.rotation.y = THREE.MathUtils.lerp(porta.rotation.y, alvo, 10 * delta);
    });

    raycaster.setFromCamera(vetorCentroTela, camera);
    const interseccoes = raycaster.intersectObjects(objetosRaycast, true);
    
    let achouObjetoPerto = false, promptTexto = "Pressione E para Interagir", arvoreOlhada = null;

    if(interseccoes.length > 0 && interseccoes[0].distance < 4.0) {
        let objOcular = interseccoes[0].object;
        if (objOcular === mesaTrabalhoMesh || objOcular.parent === mesaTrabalhoMesh) { achouObjetoPerto = true; promptTexto = "Pressione E para usar a Mesa de Trabalho"; }
        else {
            let cur = objOcular;
            while(cur && cur.type !== 'Scene') {
                if(cur.userData && cur.userData.ePorta) { achouObjetoPerto = true; promptTexto = "Pressione E para abrir/fechar a Porta"; break; }
                if(cur.userData && cur.userData.dadosArvore) { arvoreOlhada = cur.userData.dadosArvore; break; }
                cur = cur.parent;
            }
        }
    }
    
    if (arvoreOlhada && estaMinando && itemAtivo === 'machado') {
        if (arvoreSendoCortada !== arvoreOlhada) { arvoreSendoCortada = arvoreOlhada; tempoSegurandoClique = 0; }
        tempoSegurandoClique += delta;
        if (barraProgressoContainer && barraProgressoContainer.style.display !== 'block') barraProgressoContainer.style.display = 'block';
        if (barraProgressoPreenchimento) barraProgressoPreenchimento.style.width = Math.min(100, (tempoSegurandoClique / 3.0 * 100)) + '%';
        
        if (tempoSegurandoClique >= 3.0) {
            inventario.madeira += arvoreSendoCortada.madeirasDisponiveis; 
            const txtMadeira = document.getElementById('txt-qtd-madeira');
            if(txtMadeira) txtMadeira.innerText = inventario.madeira;
            cena.remove(arvoreSendoCortada.meshRaiz);
            let iMundo = objetosMundo.indexOf(arvoreSendoCortada); if (iMundo > -1) objetosMundo.splice(iMundo, 1);
            let iRay = objetosRaycast.indexOf(arvoreSendoCortada.meshRaiz); if (iRay > -1) objetosRaycast.splice(iRay, 1);
            estaMinando = false; tempoSegurandoClique = 0; arvoreSendoCortada = null; if(barraProgressoContainer) barraProgressoContainer.style.display = 'none';
        }
    } else {
        if (estaMinando && arvoreSendoCortada) estaMinando = false; 
        tempoSegurandoClique = 0; arvoreSendoCortada = null;
        if (barraProgressoContainer && barraProgressoContainer.style.display !== 'none') barraProgressoContainer.style.display = 'none';
    }
    
let pertoDeEscada = false;
    const posJEscada = controles.getObject().position;

    for (let i = 0; i < listaEscadas.length; i++) {
        const escada = listaEscadas[i];
        const dx = posJEscada.x - escada.x;
        const dz = posJEscada.z - escada.z;
        const distHorizontal = Math.sqrt(dx * dx + dz * dz);

        if (distHorizontal < 1.0) {
            pertoDeEscada = true;
            if(promptInteracao) {
                promptInteracao.style.display = 'block';
                if (posJEscada.y < (escada.yBase + 3.0)) promptInteracao.innerText = "Pressione [E] para SUBIR a Escada";
                else promptInteracao.innerText = "Pressione [E] para DESCER a Escada";
            }
            break; 
        }
    }

    if (!pertoDeEscada && promptInteracao) {
        promptInteracao.style.display = achouObjetoPerto ? 'block' : 'none';
        promptInteracao.innerText = promptTexto;
    }

    if (modoConstrucaoAtivo && hologramaVisual) {
        let pChao = interseccoes.find(i => i.object === terreno || i.object === agua);
        if(pChao) {
            hologramaVisual.visible = true; let hc = obterAlturaTerreno(pChao.point.x, pChao.point.z);
            hologramaVisual.position.set(pChao.point.x, hc, pChao.point.z);
            hologramaVisual.rotation.y = anguloRotacaoHolograma; 
            
            let corIndicativa = (hc <= NIVEL_DA_AGUA) ? 0xff0000 : 0x00ff00;
            hologramaVisual.children.forEach(c => { if(c.material) c.material.color.setHex(corIndicativa); });
        } else hologramaVisual.visible = false;
    }

    tempoCiclo += delta * 0.015; if(tempoCiclo > Math.PI * 2) tempoCiclo = 0;
    const sX = Math.cos(tempoCiclo) * 160, sY = Math.sin(tempoCiclo) * 160;
    luzSol.position.set(sX, sY, 50); meshSol.position.set(sX, sY, 50); meshLua.position.set(-sX, -sY, -50);
    const alturaSol = Math.sin(tempoCiclo), fNoite = Math.max(0, Math.min(1, (0.2 - alturaSol) * 5)), fOcaso = Math.max(0, Math.min(1, (0.4 - Math.abs(alturaSol)) * 4)); 
    let corCeuAtual = corDia.clone().lerp(corOcaso, fOcaso).lerp(corNoite, fNoite); cena.background = corCeuAtual; cena.fog.color = corCeuAtual;
    if (alturaSol > 0.2) { luzSol.intensity = alturaSol * 0.9; luzAmbiente.intensity = 0.5; } else if (alturaSol <= 0.2 && alturaSol > -0.1) { luzSol.intensity = Math.max(0.1, (alturaSol + 0.1) * 2); luzAmbiente.intensity = 0.25; } else { luzSol.intensity = 0.04; luzAmbiente.intensity = 0.08; }
    if (sistemaEstrelas) sistemaEstrelas.material.opacity = fNoite;
    grupoNuvens.children.forEach(n => { n.position.x += 2.0 * delta; if(n.position.x > 200) n.position.x = -200; });
    const posFP = sistemaFumaça.geometry.attributes.position.array;
    for(let i=0; i<countPart; i++) { posFP[i*3+1] += dadosPart[i].vY * delta; posFP[i*3] += dadosPart[i].vX * delta; posFP[i*3+2] += dadosPart[i].vZ * delta; if(posFP[i*3+1] > alturaChaoFogo + 4.5) { posFP[i*3+1] = alturaChaoFogo + 0.2; posFP[i*3] = fogueiraX + (Math.random() - 0.5) * 0.3; posFP[i*3+2] = fogueiraZ + (Math.random() - 0.5) * 0.3; } }
    sistemaFumaça.geometry.attributes.position.needsUpdate = true; luzFogo.intensity = 1.5 + Math.sin(Date.now() * 0.02) * 0.4;

    velocidade.x -= velocidade.x * 10.0 * delta; velocidade.z -= velocidade.z * 10.0 * delta; velocidade.y -= GRAVIDADE * delta; 
    direcao.z = Number(moverFrente) - Number(moverTras); direcao.x = Number(moverDireita) - Number(moverEsquerda); direcao.normalize();

    const posJ = controles.getObject().position;
    let alturaDoChaoReal = obterAlturaTerreno(posJ.x, posJ.z);
    let noPisoDaPonte = false;

    // --- CORREÇÃO E TRATAMENTO DE INTERIORES E ROTAÇÃO NATIVA ---
    for(let zona of zonasInteriores) {
        if(zona.tipo === 'ponte') {
            if (posJ.x >= zona.minX && posJ.x <= zona.maxX) {
                if (posJ.z >= zona.corpoMinZ && posJ.z <= zona.corpoMaxZ) { alturaDoChaoReal = zona.yBase; noPisoDaPonte = true; } 
                else if (posJ.z >= (zona.corpoMinZ - zona.escadaL) && posJ.z < zona.corpoMinZ) { 
                    let fatorInterp = (posJ.z - (zona.corpoMinZ - zona.escadaL)) / zona.escadaL;
                    alturaDoChaoReal = THREE.MathUtils.lerp(obterAlturaTerreno(posJ.x, posJ.z), zona.yBase, fatorInterp); noPisoDaPonte = true; 
                } 
                else if (posJ.z > zona.corpoMaxZ && posJ.z <= (zona.corpoMaxZ + zona.escadaL)) { 
                    let fatorInterp = ((zona.corpoMaxZ + zona.escadaL) - posJ.z) / zona.escadaL;
                    alturaDoChaoReal = THREE.MathUtils.lerp(obterAlturaTerreno(posJ.x, posJ.z), zona.yBase, fatorInterp); noPisoDaPonte = true; 
                }
            }
        }
        else if (zona.tipo === 'casa') { 
            if (Math.abs(posJ.x - zona.x) < zona.w/2 && Math.abs(posJ.z - zona.z) < zona.d/2) {
                alturaDoChaoReal = zona.pisos[0];
            }
        }
        else if (zona.tipo === 'casa_andares') { 
            let dx = posJ.x - zona.x, dz = posJ.z - zona.z;
            vetorColisaoAux.set(dx, 0, dz);
            vetorColisaoAux.applyAxisAngle(eixoY, -zona.rot);

            if (Math.abs(vetorColisaoAux.x) < zona.w/2 && Math.abs(vetorColisaoAux.z) < zona.d/2) {
                let pisoAlvo = zona.pisos[0];
                for(let p of zona.pisos) { if (posJ.y - ALTURA_JOGADOR + 1.0 > p) pisoAlvo = p; }
                alturaDoChaoReal = pisoAlvo;
            }
        }
    }

    let estaNaAgua = false;
    if (alturaDoChaoReal <= NIVEL_DA_AGUA && !noPisoDaPonte && (posJ.y - ALTURA_JOGADOR) <= NIVEL_DA_AGUA + 0.2) estaNaAgua = true;
    const redutorAgua = estaNaAgua ? 0.45 : 1.0, multV = correndo ? 1.7 : 1.0;
    
    if (moverFrente || moverTras) velocidade.z -= direcao.z * VELOCIDADE_BASE * multV * redutorAgua * delta;
    if (moverEsquerda || moverDireita) velocidade.x -= direcao.x * VELOCIDADE_BASE * multV * redutorAgua * delta;
    if (estaNaAgua) { velocidade.x *= 0.85; velocidade.z *= 0.85; }

    const posAntigaX = posJ.x, posAntigaZ = posJ.z;
    controles.moveRight(-velocidade.x * delta); controles.moveForward(-velocidade.z * delta);

    let alturaPisoAtual = alturaDoChaoReal + ALTURA_JOGADOR;
    
    // --- COLISÃO FÍSICA DINÂMICA (CASAS OCAS COM ROTAÇÃO 3D PERFEITA) ---
    for (let i = 0; i < objetosMundo.length; i++) {
        const obj = objetosMundo[i]; 
        let colidiu = false;
        
        if (obj.isCasaConstruida) {
            let dx = posJ.x - obj.x, dz = posJ.z - obj.z;
            vetorColisaoAux.set(dx, 0, dz);
            vetorColisaoAux.applyAxisAngle(eixoY, -obj.rot);
            let localX = vetorColisaoAux.x;
            let localZ = vetorColisaoAux.z;
            
            if (posJ.y - ALTURA_JOGADOR < obj.topoY - 0.2) {
                let margemExterna = 0.4;
                let espessuraParede = 0.8;
                let halfW = obj.w / 2, halfD = obj.d / 2;

                let tocandoCaixaExterna = Math.abs(localX) < (halfW + margemExterna) && Math.abs(localZ) < (halfD + margemExterna);
                let totalmenteDentro = Math.abs(localX) < (halfW - espessuraParede) && Math.abs(localZ) < (halfD - espessuraParede);

                if (tocandoCaixaExterna && !totalmenteDentro) {
                    let naPortaX = Math.abs(localX) < 1.2; 
                    let naParedeFrontal = localZ > (halfD - espessuraParede - 0.2); 

                    if (naPortaX && naParedeFrontal) {
                        colidiu = false; // Espaço da porta!
                    } else {
                        colidiu = true; // Bateu no muro!
                    }
                }
            }
        }
        else if (obj.isBox) { 
            if (posJ.x > obj.minX && posJ.x < obj.maxX && posJ.z > obj.minZ && posJ.z < obj.maxZ) colidiu = true; 
        } 
        else { 
            const dx = posJ.x - obj.x, dz = posJ.z - obj.z; 
            if (Math.sqrt(dx*dx + dz*dz) < obj.raio) colidiu = true; 
        }
        
        if (colidiu) {
            if (posJ.y - ALTURA_JOGADOR >= obj.topoY - 0.6) {
                alturaPisoAtual = obj.topoY + ALTURA_JOGADOR;
            } else { 
                posJ.x = posAntigaX; 
                posJ.z = posAntigaZ; 
                break; 
            } 
        }
    }

    posJ.y += (velocidade.y * delta); 
    if (posJ.y < alturaPisoAtual) { 
        velocidade.y = 0; 
        posJ.y = alturaPisoAtual; 
        podeSaltar = true; 
    }

    if ((moverFrente || moverTras || moverEsquerda || moverDireita) && podeSaltar) {
        temporizadorBobbing += delta * (correndo ? 14.5 : 9.5);
        camera.position.y = Math.sin(temporizadorBobbing) * (correndo ? 0.12 : 0.06); camera.position.x = Math.cos(temporizadorBobbing * 0.5) * (correndo ? 0.07 : 0.04);
        let somAlvo = estaNaAgua ? somPassoAgua : (correndo ? somPassoCorrer : somPassoNormal);
        if (audioAtualTocando && audioAtualTocando !== somAlvo) audioAtualTocando.stop();
        if (somAlvo.buffer && !somAlvo.isPlaying) somAlvo.play(); audioAtualTocando = somAlvo;
    } else { camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0, 8 * delta); camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 8 * delta); pararSonsDeMovimento(); }

    renderizador.render(cena, camera);
}
animar();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderizador.setSize(window.innerWidth, window.innerHeight); });