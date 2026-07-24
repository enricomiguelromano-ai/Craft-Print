// --- 🎵 CONFIGURAÇÃO DOS SEUS ARQUIVOS MP3 e IMAGENS 🎵 ---
const ARQUIVOS_DE_AUDIO = {
    musicaFundo: 'sounds/craftprintMusic.mp3', passoNormal: 'sounds/walk.mp3',
    passoCorrer: 'sounds/run.mp3', passoAgua: 'sounds/walk_water.mp3',
    lanterna: 'sounds/click_lantern.mp3', portaAbrir: 'sounds/open_door.mp3',
    portaFechar: 'sounds/close_door.mp3', pulo: 'sounds/jump.mp3'
};
const CAMINHO_QUADRO_IMAGEM = 'img/tumoritus.jpeg';

// --- SISTEMA INVENTÁRIO E ESTADO ---

let inventario = {
    madeira: 0,
    machado: 1,
    planta_p: 0,
    planta_m: 0,
    planta_g: 0,
    planta_fogueira: 0,
    picareta: 1,
    pedra: 0,
    planta_piso: 0,
    planta_tocha: 0,
    planta_cama: 0, // <-- ADICIONADO AQUI
    planta_cerca: 0,
    planta_muro: 0,
    planta_mesa: 0,
    planta_cadeira: 0,
    planta_bau: 0,
    planta_lareira: 0,
    ferro: 0,
    cobre: 0,
    ouro: 0
};

// --- SISTEMA DE HOTBAR DINÂMICA (10 espaços: teclas 1 a 9, depois 0) ---
// Cada item ganha seu número automaticamente na primeira vez que o jogador o
// possui (machado/picareta entram primeiro, pois já vêm no inventário inicial).
// Uma vez atribuído, o número fica reservado para aquele item para sempre —
// mesmo que a quantidade dele chegue a 0 e o slot suma da hotbar por um tempo,
// ele volta a aparecer no MESMO número quando o jogador conseguir mais.
// Só entram nessa lista os itens "equipáveis" (ferramentas e plantas de
// construção); madeira/pedra/ferro/cobre/ouro continuam só na mochila.
const LIMITE_HOTBAR = 10;
let hotbar = new Array(LIMITE_HOTBAR).fill(null);

const CONFIG_ITENS_HOTBAR = {
    machado: { icone: { tipo: 'emoji', valor: '🪓' } },
    picareta: { icone: { tipo: 'emoji', valor: '⛏️' } },
    planta_p: { icone: { tipo: 'emoji', valor: '📜🏡' }, rotulo: 'P' },
    planta_m: { icone: { tipo: 'emoji', valor: '📜🏛️' }, rotulo: 'M' },
    planta_g: { icone: { tipo: 'emoji', valor: '📜🏰' }, rotulo: 'G' },
    planta_fogueira: { icone: { tipo: 'img', valor: 'img/fogueira.png' }, rotulo: 'F' },
    planta_piso: { icone: { tipo: 'img', valor: 'img/piso.png' } },
    planta_tocha: { icone: { tipo: 'emoji', valor: '🕯️' } },
    planta_cama: { icone: { tipo: 'emoji', valor: '🛏️' } },
    planta_cerca: { icone: { tipo: 'canvas', valor: desenharIconeCerca } },
    planta_muro: { icone: { tipo: 'canvas', valor: desenharIconeMuro } },
    planta_mesa: { icone: { tipo: 'canvas', valor: desenharIconeMesa } },
    planta_cadeira: { icone: { tipo: 'canvas', valor: desenharIconeCadeira } },
    planta_bau: { icone: { tipo: 'canvas', valor: desenharIconeBau } },
    planta_lareira: { icone: { tipo: 'canvas', valor: desenharIconeLareira } }
};

// Tenta reservar um número/posição na hotbar pro item (se ele ainda não tiver).
// Devolve true se o item já tinha (ou conseguiu) um número; false se a hotbar
// está cheia (10 itens diferentes) e esse item ainda não fazia parte dela.
function registrarItemNaHotbar(itemChave) {
    if (hotbar.includes(itemChave)) return true;
    const indiceLivre = hotbar.indexOf(null);
    if (indiceLivre === -1) {
        mostrarNotificacao('Inventário cheio! Máximo de 10 itens diferentes.', '#ef4444');
        return false;
    }
    hotbar[indiceLivre] = itemChave;
    return true;
}

let itemAtivo = 'machado';

let tempoSegurandoClique = 0, estaMinando = false, arvoreSendoCortada = null, rochaSendoMinerada = null;
let modoConstrucaoAtivo = false, tipoCasaParaConstruir = null, hologramaVisual = null;
let anguloRotacaoHolograma = 0;

// --- SISTEMA DE ESCADAS DA CASA ---
let listaEscadas = [];
let listaFogueirasDinamicas = [];

// --- CONFIGURAÇÃO INICIAL DO ESPAÇO 3D ---
const container = document.getElementById('canvas-container');

const inventarioHudEl = document.getElementById('inventario-hud');
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

// CORREÇÃO: a variável 'controles' (PointerLockControls) era usada em várias partes do
// código mas nunca era criada, o que quebrava o script inteiro com ReferenceError.
let controles = new THREE.PointerLockControls(camera, document.body);

const renderizador = new THREE.WebGLRenderer({ antialias: true });
renderizador.setSize(window.innerWidth, window.innerHeight);
renderizador.shadowMap.enabled = true; renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderizador.domElement);

let ehTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
let moverFrente = false, moverTras = false, moverEsquerda = false, moverDireita = false, podeSaltar = false, correndo = false, lanternaLigada = false;
// Quanto o joystick foi empurrado (0 a 1). No teclado fica sempre em 1 (sem efeito).
let multiplicadorJoystick = 1;

// --- SUAVIZAÇÃO DA CÂMERA POR TOQUE (CELULAR) ---
// Precisa ficar declarado AQUI EM CIMA (antes de animar() rodar pela primeira
// vez lá embaixo), porque o loop principal lê essas variáveis todo frame.
// "cameraYawAlvo/cameraPitchAlvo" = pra onde a câmera está tentando chegar;
// o loop animar() persegue esse alvo suavemente a cada frame.
let cameraYawAlvo = null;
let cameraPitchAlvo = null;
// Quão rápido a câmera "alcança" o alvo a cada frame. Maior = mais em cima do
// dedo (mais direto, menos fluido). Menor = mais suave/fluido, mas com mais
// atraso entre o dedo e a câmera. 18 é um meio-termo; tente entre 10 (bem
// fluido) e 30 (quase instantâneo) pra achar o gosto.
const VELOCIDADE_SUAVIZACAO_CAMERA_TOUCH = 18;

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
        const angle = data.angle.degree;
        // CORREÇÃO (jogabilidade estranha no celular): antes cada direção ocupava uma
        // fatia de 90° sem sobreposição, então só dava pra andar reto pra frente, trás,
        // esquerda ou direita — nunca na diagonal (diferente do teclado, onde W+D juntos
        // andam na diagonal). Agora cada direção cobre 135°, com 45° de sobreposição
        // entre direções vizinhas, então empurrar o joystick "entre" duas direções
        // ativa as duas ao mesmo tempo e anda na diagonal, igual no PC.
        moverDireita = (angle <= 67.5 || angle >= 292.5);
        moverFrente = (angle >= 22.5 && angle <= 157.5);
        moverEsquerda = (angle >= 112.5 && angle <= 247.5);
        moverTras = (angle >= 202.5 && angle <= 337.5);

        // Empurrar o joystick só um pouquinho agora anda mais devagar (em vez de sempre
        // andar na velocidade máxima assim que encosta o dedo), o que deixa mais fácil
        // se posicionar com precisão perto de árvores/pedras/construções.
        multiplicadorJoystick = Math.min(data.force, 1);
    });
    manager.on('end', () => {
        moverFrente = moverTras = moverEsquerda = moverDireita = false;
        multiplicadorJoystick = 1;
    });
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
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.musicaFundo, b => { somMusicaFundo.setBuffer(b); somMusicaFundo.setLoop(true); somMusicaFundo.setVolume(0.3); somMusicaFundo.play(); }, undefined, () => { });
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.passoNormal, b => { somPassoNormal.setBuffer(b); somPassoNormal.setLoop(true); somPassoNormal.setVolume(0.5); });
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.passoCorrer, b => { somPassoCorrer.setBuffer(b); somPassoCorrer.setLoop(true); somPassoCorrer.setVolume(0.6); });
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.passoAgua, b => { somPassoAgua.setBuffer(b); somPassoAgua.setLoop(true); somPassoAgua.setVolume(0.6); });
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.lanterna, b => { somLanterna.setBuffer(b); somLanterna.setVolume(0.4); });
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.portaAbrir, b => { somPortaAbrir.setBuffer(b); somPortaAbrir.setVolume(0.6); });
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.portaFechar, b => { somPortaFechar.setBuffer(b); somPortaFechar.setVolume(0.6); });
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.pulo, b => { somPulo.setBuffer(b); somPulo.setVolume(0.5); });
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

// --- VERIFICAÇÃO DE DISPOSITIVO TOUCH / MOBILE ---
// (Removido a declaração duplicada da variável ehTouch que causava o erro no PC)

// --- ELEMENTOS DA UI ---
// --- ELEMENTOS DA UI ---
const telaStart = document.getElementById('tela-start');
const menuPause = document.getElementById('menu-pause');
const modalControles = document.getElementById('modal-controles');

const btnIniciarJogo = document.getElementById('btn-iniciar-jogo');
const btnRetomar = document.getElementById('btn-retomar');
const btnReiniciar = document.getElementById('btn-reiniciar');
// CORREÇÃO: 'controlesMobileDiv' já tinha sido declarado lá em cima (linha ~44).
// Essa segunda declaração 'const' duplicada travava o carregamento do script inteiro.

let jogoIniciado = false;
let jogoPausado = false;

// --- FUNÇÃO DE TELA CHEIA (FULLSCREEN) ---
function solicitarFullscreen() {
    const elem = document.documentElement;
    try {
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => { });
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        }
    } catch (e) {
        console.warn("Fullscreen não suportado ou bloqueado:", e);
    }
}

// --- ABRIR/FECHAR MODAL CONTROLES ---
document.getElementById('btn-abrir-controles-start')?.addEventListener('click', () => { if (modalControles) modalControles.style.display = 'flex'; });
document.getElementById('btn-controles-pause')?.addEventListener('click', () => { if (modalControles) modalControles.style.display = 'flex'; });
document.getElementById('btn-fechar-controles')?.addEventListener('click', () => { if (modalControles) modalControles.style.display = 'none'; });

// --- FUNÇÃO PARA INICIAR O JOGO ---
function iniciarJogo() {
    if (telaStart) telaStart.style.display = 'none';
    if (menuPause) menuPause.style.display = 'none';
    if (modalControles) modalControles.style.display = 'none';

    jogoIniciado = true;
    jogoPausado = false;

    try { if (typeof carregarTodosOsAudios === 'function') carregarTodosOsAudios(); } catch (err) { }

    if (ehTouch) {
        if (controlesMobileDiv) controlesMobileDiv.style.display = 'block';
        solicitarFullscreen();
    } else if (typeof controles !== 'undefined' && controles) {
        controles.lock();
    }
}

if (btnIniciarJogo) {
    // Usamos mousedown e touchstart para evitar o erro de bloqueio de fullscreen
    btnIniciarJogo.addEventListener('mousedown', (e) => { e.preventDefault(); iniciarJogo(); });
    btnIniciarJogo.addEventListener('touchstart', (e) => { e.preventDefault(); iniciarJogo(); }, { passive: false });
}

if (btnRetomar) {
    btnRetomar.addEventListener('click', () => {
        if (ehTouch) {
            jogoPausado = false;
            if (menuPause) menuPause.style.display = 'none';
        } else if (typeof controles !== 'undefined' && controles) {
            controles.lock();
        }
    });
}

if (btnReiniciar) { btnReiniciar.addEventListener('click', () => { window.location.reload(); }); }

// --- CONTROLE DE POINTER LOCK E ESC (PC) ---
if (typeof controles !== 'undefined' && controles) {
    controles.addEventListener('lock', () => {
        if (menuPause) menuPause.style.display = 'none';
        if (telaStart) telaStart.style.display = 'none';
        if (modalControles) modalControles.style.display = 'none';
        jogoPausado = false;
    });

    controles.addEventListener('unlock', () => {
        if (jogoIniciado && (!telaStart || telaStart.style.display === 'none')) {
            // Não abre menu pause se a mochila ou crafting estiverem abertos
            if (typeof mochilaAberta !== 'undefined' && mochilaAberta) return;
            if (typeof menuCraftingAberto !== 'undefined' && menuCraftingAberto) return;

            if (menuPause) menuPause.style.display = 'flex';
            jogoPausado = true;
            if (typeof pararSonsDeMovimento === 'function') pararSonsDeMovimento();
        }
    });
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.code === 'Escape') {
        if (!jogoIniciado) return;

        if (typeof mochilaAberta !== 'undefined' && mochilaAberta) {
            alternarMochila();
            return;
        }
        if (typeof menuCraftingAberto !== 'undefined' && menuCraftingAberto) {
            menuCrafting.style.display = 'none';
            menuCraftingAberto = false;
            if (!ehTouch && controles) controles.lock();
            return;
        }

        if (!ehTouch && typeof controles !== 'undefined' && controles) {
            // Se o menu estiver aberto, travar o mouse de volta retoma o jogo!
            if (!controles.isLocked) {
                controles.lock();
            }
        }
    }
});

// CORREÇÃO: removida a linha "cena.add(controles.getObject())". A câmera já é
// filha de cameraContainer (que já está na cena) — adicioná-la de novo direto na
// cena a tirava do cameraContainer e quebrava o giro/posicionamento no mobile.
//
// CORREÇÃO (sensibilidade estranha no celular): existia um SEGUNDO sistema de
// câmera por toque aqui, rodando ao mesmo tempo que o sistema lá perto da linha
// ~1500 (touchOlharId). Os dois escutavam 'touchstart/touchmove/touchend' na
// window e giravam a câmera ao mesmo tempo — só que um girava
// "cameraContainer.rotation.y" (não usado pelo cálculo de movimento, que só
// olha a matriz local da própria câmera) e o outro girava "camera.rotation.y"
// diretamente. Resultado: girar a câmera ficava dessincronizado do "pra onde
// o WASD/joystick anda", travado e "duplicado". Removido daqui; o único
// sistema de câmera por toque agora é o de baixo (mais completo: por
// identifier de toque, só no lado direito da tela, ignorando botões).

const velocidade = new THREE.Vector3(), direcao = new THREE.Vector3();
const ALTURA_JOGADOR = 2.0, FORCA_SALTO = 14.0, GRAVIDADE = 38.0; let VELOCIDADE_BASE = 90.0;
let temporizadorBobbing = 0, audioAtualTocando = null;
let bobAtualY = 0, bobAtualX = 0; // guarda o deslocamento de bobbing já aplicado no frame anterior

let mesaTrabalhoMesh = null, menuCraftingAberto = false;

function atualizarUIAktiv() {
    // Garante que todo item que o jogador já possui tenha um número reservado
    // na hotbar (isso é o que faz a numeração seguir a ordem de conquista).
    Object.keys(CONFIG_ITENS_HOTBAR).forEach(chave => {
        if (inventario[chave] > 0) registrarItemNaHotbar(chave);
    });

    if (itemAtivo.startsWith('planta_') && inventario[itemAtivo] <= 0) itemAtivo = 'machado';

    renderizarHotbar();

    if (itemAtivo.startsWith('planta_') && inventario[itemAtivo] > 0) {
        modoConstrucaoAtivo = true;
        tipoCasaParaConstruir = itemAtivo.replace('planta_', '');
        ativarHolograma(tipoCasaParaConstruir);
        if (typeof btnGirarPlantaMobile !== 'undefined' && btnGirarPlantaMobile) btnGirarPlantaMobile.style.display = 'block';
    } else {
        modoConstrucaoAtivo = false; desativarHolograma();
        if (typeof btnGirarPlantaMobile !== 'undefined' && btnGirarPlantaMobile) btnGirarPlantaMobile.style.display = 'none';
    }
}

// Redesenha a hotbar do zero a partir do array `hotbar`. Só aparecem slots de
// itens que já têm número reservado E quantidade > 0 no momento (um item sem
// estoque simplesmente some da barra, mas mantém seu número reservado).
function renderizarHotbar() {
    if (!inventarioHudEl) return;
    inventarioHudEl.innerHTML = '';

    hotbar.forEach((itemChave, indice) => {
        if (!itemChave) return;
        const cfg = CONFIG_ITENS_HOTBAR[itemChave];
        if (!cfg) return;
        const qtdAtual = inventario[itemChave] || 0;
        if (qtdAtual <= 0) return;

        const numeroTecla = indice === 9 ? '0' : String(indice + 1);

        const slot = document.createElement('div');
        slot.className = 'slot-item' + (itemAtivo === itemChave ? ' ativo' : '');
        slot.dataset.item = itemChave;

        const spanNumero = document.createElement('span');
        spanNumero.className = 'numero-atalho';
        spanNumero.innerText = numeroTecla;
        slot.appendChild(spanNumero);

        if (cfg.icone.tipo === 'emoji') {
            const spanIcone = document.createElement('span');
            spanIcone.innerText = cfg.icone.valor;
            slot.appendChild(spanIcone);
        } else if (cfg.icone.tipo === 'img') {
            const img = document.createElement('img');
            img.src = cfg.icone.valor;
            img.className = 'icone-img';
            slot.appendChild(img);
        } else if (cfg.icone.tipo === 'canvas') {
            const canvas = document.createElement('canvas');
            canvas.width = 32; canvas.height = 32;
            canvas.className = 'icone-canvas';
            slot.appendChild(canvas);
            cfg.icone.valor(canvas);
        }

        const spanQtd = document.createElement('span');
        spanQtd.className = 'qtd';
        spanQtd.innerText = cfg.rotulo || qtdAtual;
        slot.appendChild(spanQtd);

        inventarioHudEl.appendChild(slot);
    });
}

// Um único listener "delegado" no container cuida do clique/toque em
// qualquer slot, mesmo que os slots sejam recriados a cada renderização.
function tratarCliqueHotbar(e) {
    const slot = e.target.closest('.slot-item');
    if (!slot) return;
    e.stopPropagation();

    const novoItem = slot.dataset.item;
    if (novoItem.startsWith('planta_') && inventario[novoItem] <= 0) return;

    itemAtivo = novoItem;
    atualizarUIAktiv();
}

function atualizarHolograma() {
    if (!modoConstrucaoAtivo || !hologramaVisual) return;

    const vetorDirecao = new THREE.Vector3();
    camera.getWorldDirection(vetorDirecao);

    // Cria o raio a partir da posição da câmera com alcance de até 15 unidades
    const raioConstrucao = new THREE.Raycaster(camera.position, vetorDirecao, 0, 15);

    // O raio checa colisões com o chão E com as casas/pisos que já foram construídos
    const interseccoes = raioConstrucao.intersectObjects(objetosRaycast, true);

    let pontoColisao = null;

    // ✨ A MÁGICA ACONTECE AQUI:
    // Vasculha o que o raio bateu para achar uma superfície plana virada para CIMA
    for (let i = 0; i < interseccoes.length; i++) {
        let face = interseccoes[i].face;

        // A 'normal.y' indica a direção da face geométrica. 
        // y > 0.5 significa que a superfície aponta para cima (chão ou teto da casa visto de cima).
        // Isso impede que os objetos grudem tortos nas paredes ou fiquem de cabeça para baixo no teto.
        if (face && face.normal.y > 0.5) {
            pontoColisao = interseccoes[i].point;
            break;
        } else if (!face && interseccoes[i].object.name === 'chao') {
            // Garantia de segurança caso o chão original não devolva face matemática
            pontoColisao = interseccoes[i].point;
            break;
        }
    }

    if (pontoColisao) {
        // Mantém pisos, tochas, camas, cercas e muros alinhados perfeitamente em uma grade (grid de 2 em 2)
        let grid = TIPOS_GRID_DUPLO.includes(tipoCasaParaConstruir) ? 2 : 1;

        let xAlvo = Math.round(pontoColisao.x / grid) * grid;
        let zAlvo = Math.round(pontoColisao.z / grid) * grid;
        let yAlvo = pontoColisao.y; // Pega a altura exata do piso ou da laje

        hologramaVisual.position.set(xAlvo, yAlvo, zAlvo);
        hologramaVisual.rotation.y = anguloRotacaoHolograma;
        hologramaVisual.visible = true;
    } else {
        // Se não estiver mirando num chão/laje, esconde o holograma
        hologramaVisual.visible = false;
    }
}
// --- ADIÇÃO: CLIQUE/TOQUE NOS ITENS DA HOTBAR ---
// Um único listener no container (em vez de um por slot) porque os slots são
// recriados a cada renderização — ele "escuta" cliques em qualquer filho .slot-item.
if (inventarioHudEl) {
    inventarioHudEl.addEventListener('mousedown', tratarCliqueHotbar);
    inventarioHudEl.addEventListener('touchstart', tratarCliqueHotbar, { passive: false });
}

// Renderização inicial: registra machado/picareta (que já vêm no inventário)
// nos números 1 e 2 e desenha a hotbar pela primeira vez.
atualizarUIAktiv();

window.addEventListener('keydown', (e) => {
    // Abrir/Fechar Mochila
    if (e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault(); // Evita que o Tab mude o foco do navegador
        alternarMochila();
        return;
    }

    // Teclas 1-9 e 0 selecionam a POSIÇÃO na hotbar (não mais um item fixo).
    // Ex.: tecla "3" sempre seleciona o item que está no 3º espaço da hotbar,
    // seja qual for — o que muda de acordo com a ordem em que foi conquistado.
    const MAPA_TECLA_PARA_INDICE = {
        Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4,
        Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8, Digit0: 9
    };
    if (e.code in MAPA_TECLA_PARA_INDICE) {
        const itemDoSlot = hotbar[MAPA_TECLA_PARA_INDICE[e.code]];
        if (itemDoSlot && inventario[itemDoSlot] > 0) {
            itemAtivo = itemDoSlot;
            atualizarUIAktiv();
        }
    }

    if (modoConstrucaoAtivo && hologramaVisual) {
        if (e.code === 'KeyR') { anguloRotacaoHolograma += Math.PI / 2; }
        if (e.code === 'KeyT') { anguloRotacaoHolograma -= Math.PI / 2; }
    }
});

window.addEventListener('mousedown', (e) => {
    // 1. Trocamos o 'instrucoes' por '!jogoIniciado'
    if (menuCraftingAberto || !jogoIniciado) return;
    if (modoConstrucaoAtivo) { executarConstrucaoReal(); }
    // 2. Adicionamos parênteses em volta das ferramentas para evitar conflito de lógica
    else if ((itemAtivo === 'machado' || itemAtivo === 'picareta') && e.button === 0) {
        estaMinando = true; tempoSegurandoClique = 0;
    }
});
window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        estaMinando = false; tempoSegurandoClique = 0;
        if (barraProgressoContainer) barraProgressoContainer.style.display = 'none';
    }
});

window.addEventListener('touchstart', (e) => {
    // 3. Trocamos o 'instrucoes' por '!jogoIniciado' no mobile também
    if (menuCraftingAberto || !jogoIniciado) return;
    const joystickZone = document.getElementById('zona-joystick');
    if (e.target.tagName === 'BUTTON' || (joystickZone && joystickZone.contains(e.target))) return;

    if (itemAtivo === 'machado' || itemAtivo === 'picareta') {
        estaMinando = true; tempoSegurandoClique = 0;
    }
}, { passive: true });

const noKeyDown = (evento) => {
    if (menuCraftingAberto && evento.code !== 'KeyE') return;
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
        while (noPai && noPai !== cena) {
            if (noPai.userData && noPai.userData.ePorta) {
                noPai.userData.aberta = !noPai.userData.aberta;
                if (noPai.userData.aberta && somPortaAbrir.buffer) somPortaAbrir.play();
                else if (!noPai.userData.aberta && somPortaFechar.buffer) somPortaFechar.play();
                interagiu = true; break;
            }
            if (noPai === mesaTrabalhoMesh || noPai.parent === mesaTrabalhoMesh) {
                menuCraftingAberto = true; menuCrafting.style.display = 'block'; pararSonsDeMovimento(); controles.unlock();
                atualizarEstadoCraftingUI();
                return;
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
window.craftarConstrucao = function (tipo, custoMadeira, custoPedra = 0) {
    if (inventario.madeira >= custoMadeira && inventario.pedra >= custoPedra) {
        inventario.madeira -= custoMadeira;
        inventario.pedra -= custoPedra;

        const txtMadeira = document.getElementById('txt-qtd-madeira');
        if (txtMadeira) txtMadeira.innerText = inventario.madeira;

        const txtPedra = document.getElementById('txt-qtd-pedra');
        if (txtPedra) txtPedra.innerText = inventario.pedra;

        if (tipo === 'p') inventario.planta_p++;
        if (tipo === 'm') inventario.planta_m++;
        if (tipo === 'g') inventario.planta_g++;
        if (tipo === 'fogueira') inventario.planta_fogueira++;
        if (tipo === 'piso') inventario.planta_piso += 10;
        if (tipo === 'tocha') inventario.planta_tocha++;
        if (tipo === 'cama') inventario.planta_cama++; // ✨ CORREÇÃO: Faltava esta linha para você receber a cama!
        if (tipo === 'cerca') inventario.planta_cerca += 5;   // Vem em pacote de 5, igual ao piso
        if (tipo === 'muro') inventario.planta_muro += 5;     // Vem em pacote de 5, igual ao piso
        if (tipo === 'mesa') inventario.planta_mesa++;
        if (tipo === 'cadeira') inventario.planta_cadeira++;
        if (tipo === 'bau') inventario.planta_bau++;
        if (tipo === 'lareira') inventario.planta_lareira++;

        atualizarUIAktiv();
        atualizarEstadoCraftingUI();
        mostrarNotificacao("Planta criada! Equipe no inventário.", "#22c55e");
        processarInteracaoGeral();
    } else {
        mostrarNotificacao("Recursos insuficientes!", "#ef4444");
    }
};

// ============================================================
// UI DINÂMICA DA MESA DE CRAFTING (saldo + cards indisponíveis)
// ============================================================
// Atualiza o saldo mostrado no topo do menu e marca com opacidade reduzida
// (+ botão desabilitado) qualquer card cujo custo o jogador não pode pagar
// no momento. É chamado toda vez que a mesa é aberta e após cada crafting.
function atualizarEstadoCraftingUI() {
    const elSaldoMadeira = document.getElementById('craft-saldo-madeira');
    const elSaldoPedra = document.getElementById('craft-saldo-pedra');
    if (elSaldoMadeira) elSaldoMadeira.innerText = inventario.madeira;
    if (elSaldoPedra) elSaldoPedra.innerText = inventario.pedra;

    document.querySelectorAll('.card-craft').forEach(card => {
        const custoMadeira = parseInt(card.dataset.custoMadeira || '0', 10);
        const custoPedra = parseInt(card.dataset.custoPedra || '0', 10);
        const faltaMadeira = inventario.madeira < custoMadeira;
        const faltaPedra = inventario.pedra < custoPedra;
        const podeFazer = !faltaMadeira && !faltaPedra;

        card.classList.toggle('indisponivel', !podeFazer);

        const botao = card.querySelector('button');
        if (botao) botao.disabled = !podeFazer;

        card.querySelectorAll('.custo-chip').forEach(chip => {
            const recurso = chip.dataset.recurso;
            const faltaEsse = recurso === 'madeira' ? faltaMadeira : faltaPedra;
            chip.classList.toggle('falta', faltaEsse);
        });
    });
}

// Abas da mesa de trabalho (Construções / Utilidades)
document.querySelectorAll('.aba-craft').forEach(aba => {
    aba.addEventListener('click', () => {
        document.querySelectorAll('.aba-craft').forEach(a => a.classList.remove('ativa'));
        aba.classList.add('ativa');
        const alvo = aba.dataset.aba;
        document.querySelectorAll('.crafting-grid').forEach(grid => {
            grid.style.display = (grid.dataset.painel === alvo) ? 'grid' : 'none';
        });
    });
});
document.getElementById('btn-fechar-crafting')?.addEventListener('click', () => processarInteracaoGeral());

document.getElementById('btn-lanterna')?.addEventListener('touchstart', (e) => { e.preventDefault(); alternarLanterna(); });
document.getElementById('btn-pulo')?.addEventListener('touchstart', (e) => { e.preventDefault(); executarPulo(); });
document.getElementById('btn-interagir')?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    // Se estiver com a planta na mão, o botão constrói a casa. Se não, ele interage normalmente com portas/escadas.
    if (modoConstrucaoAtivo) {
        executarConstrucaoReal();
    } else {
        processarInteracaoGeral();
    }
});
btnGirarPlantaMobile?.addEventListener('touchstart', (e) => { e.preventDefault(); if (modoConstrucaoAtivo) anguloRotacaoHolograma += Math.PI / 2; });

const bCorrida = document.getElementById('btn-corrida');
if (bCorrida) {
    bCorrida.addEventListener('touchstart', (e) => { e.preventDefault(); correndo = !correndo; if (correndo) bCorrida.classList.add('btn-ativo'); else bCorrida.classList.remove('btn-ativo'); });
}

function pararSonsDeMovimento() { if (somPassoNormal.isPlaying) somPassoNormal.stop(); if (somPassoCorrer.isPlaying) somPassoCorrer.stop(); if (somPassoAgua.isPlaying) somPassoAgua.stop(); audioAtualTocando = null; }

const luzLanterna = new THREE.SpotLight(0xfffdd0, 4.0, 50, Math.PI / 5, 0.6, 1);
luzLanterna.castShadow = true; luzLanterna.shadow.mapSize.width = 1024; luzLanterna.shadow.mapSize.height = 1024; luzLanterna.visible = false; camera.add(luzLanterna); luzLanterna.position.set(0.3, -0.4, -0.2); luzLanterna.target = new THREE.Object3D(); camera.add(luzLanterna.target); luzLanterna.target.position.set(0, 0, -1);

function gerarTexturaGrama() { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#1e3f20'; ctx.fillRect(0, 0, 512, 512); for (let i = 0; i < 20000; i++) { ctx.fillStyle = Math.random() > 0.5 ? '#152e16' : '#254a27'; ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3); } const textura = new THREE.CanvasTexture(canvas); textura.wrapS = THREE.RepeatWrapping; textura.wrapT = THREE.RepeatWrapping; textura.repeat.set(60, 60); return textura; }
function gerarTexturaTronco() { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#5c321a'; ctx.fillRect(0, 0, 512, 512); for (let i = 0; i < 900; i++) { ctx.fillStyle = Math.random() > 0.4 ? '#3b1f10' : '#472613'; ctx.fillRect(Math.random() * 512, 0, Math.random() * 5 + 2, 512); } return new THREE.CanvasTexture(canvas); }
function gerarTexturaAgua() { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#1d4ed8'; ctx.fillRect(0, 0, 256, 256); for (let i = 0; i < 40; i++) { ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = Math.random() * 2 + 1; ctx.beginPath(); let yFixo = Math.random() * 256; ctx.moveTo(0, yFixo); ctx.lineTo(256, yFixo); ctx.stroke(); } const textura = new THREE.CanvasTexture(canvas); textura.wrapS = THREE.RepeatWrapping; textura.wrapT = THREE.RepeatWrapping; textura.repeat.set(8, 8); return textura; }
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
    if (Math.sqrt(x * x + y * y) > 70 && distRio > 32) altura += Math.abs(Math.sin(x * 0.015) * Math.cos(y * 0.015)) * 22 * ((Math.sqrt(x * x + y * y) - 70) / 130);
    if (Math.abs(x - ponteX) < 4) { const distN = Math.sqrt(Math.pow(x - ponteX, 2) + Math.pow(y - (ponteZ - comprimentoPonte / 2), 2)); if (distN < 10) altura = altura * (1 - Math.cos((distN / 10) * Math.PI / 2)) + ((alturaPonteY - 1.5) * Math.cos((distN / 10) * Math.PI / 2)); const distS = Math.sqrt(Math.pow(x - ponteX, 2) + Math.pow(y - (ponteZ + comprimentoPonte / 2), 2)); if (distS < 10) altura = altura * (1 - Math.cos((distS / 10) * Math.PI / 2)) + ((alturaPonteY - 1.5) * Math.cos((distS / 10) * Math.PI / 2)); } posicoes.setZ(i, altura);
}
gTerreno.computeVertexNormals(); const terreno = new THREE.Mesh(gTerreno, new THREE.MeshStandardMaterial({ map: texturaGrama, roughness: 0.85 })); terreno.rotation.x = -Math.PI / 2; terreno.receiveShadow = true; cena.add(terreno); objetosRaycast.push(terreno);
const agua = new THREE.Mesh(new THREE.PlaneGeometry(tamanhoMapa, tamanhoMapa), new THREE.MeshStandardMaterial({ map: texturaAgua, color: 0x2563eb, roughness: 0.05, transparent: true, opacity: 0.8 })); agua.rotation.x = -Math.PI / 2; agua.position.y = NIVEL_DA_AGUA; cena.add(agua); objetosRaycast.push(agua);

function obterAlturaTerreno(x, z) {
    // CORREÇÃO: antes pegava só o vértice mais próximo (efeito "degrau" de até 4
    // unidades), o que fazia o jogador afundar no chão perto da margem do rio,
    // onde o relevo muda bruscamente. Agora interpola entre os 4 vértices vizinhos,
    // batendo com a altura que é realmente desenhada na malha visual.
    const gridX = (x + tamanhoMapa / 2) / tamanhoMapa * segmentos;
    const gridZ = (z + tamanhoMapa / 2) / tamanhoMapa * segmentos;

    const col = Math.floor(gridX), lin = Math.floor(gridZ);
    if (col < 0 || col >= segmentos || lin < 0 || lin >= segmentos) return 0;

    const fracX = gridX - col, fracZ = gridZ - lin;
    const largura = segmentos + 1;
    const pos = gTerreno.attributes.position;

    const h00 = pos.getZ(lin * largura + col);
    const h10 = pos.getZ(lin * largura + col + 1);
    const h01 = pos.getZ((lin + 1) * largura + col);
    const h11 = pos.getZ((lin + 1) * largura + col + 1);

    const hTopo = h00 + (h10 - h00) * fracX;
    const hBase = h01 + (h11 - h01) * fracX;
    const h = hTopo + (hBase - hTopo) * fracZ;

    return h < NIVEL_DA_AGUA ? NIVEL_DA_AGUA : h;
}

// Ponte
const ponteGrupo = new THREE.Group(); const pisoPonte = new THREE.Mesh(new THREE.BoxGeometry(larguraPonte, 0.3, comprimentoPonte), matTroncoGlobal); pisoPonte.castShadow = true; pisoPonte.receiveShadow = true; ponteGrupo.add(pisoPonte);
const corrimaoEsq = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, comprimentoPonte), matTroncoGlobal); corrimaoEsq.position.set(-larguraPonte / 2 + 0.1, 1.0, 0); ponteGrupo.add(corrimaoEsq); const corrimaoDir = corrimaoEsq.clone(); corrimaoDir.position.x = larguraPonte / 2 - 0.1; ponteGrupo.add(corrimaoDir);
for (let zOffset = -comprimentoPonte / 2; zOffset <= comprimentoPonte / 2; zOffset += 4) { const pEsq = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), matTroncoGlobal); pEsq.position.set(-larguraPonte / 2 + 0.1, 0.5, zOffset); pEsq.castShadow = true; ponteGrupo.add(pEsq); const pDir = pEsq.clone(); pDir.position.x = larguraPonte / 2 - 0.1; ponteGrupo.add(pDir); }
const numDegraus = 5, profDeg = 0.8, totEscada = numDegraus * profDeg;
for (let i = 1; i <= numDegraus; i++) { const gDeg = new THREE.BoxGeometry(larguraPonte, 0.4, profDeg); const altY = -(i * 0.35), distZ = (i * profDeg) - (profDeg / 2); const dN = new THREE.Mesh(gDeg, matTroncoGlobal); dN.position.set(0, altY, -comprimentoPonte / 2 - distZ); dN.castShadow = true; ponteGrupo.add(dN); const dS = new THREE.Mesh(gDeg, matTroncoGlobal); dS.position.set(0, altY, comprimentoPonte / 2 + distZ); dS.castShadow = true; ponteGrupo.add(dS); }
ponteGrupo.position.set(ponteX, alturaPonteY, ponteZ); cena.add(ponteGrupo); objetosRaycast.push(ponteGrupo);

zonasInteriores.push({
    tipo: 'ponte',
    minX: ponteX - larguraPonte / 2,
    maxX: ponteX + larguraPonte / 2,
    corpoMinZ: ponteZ - comprimentoPonte / 2,
    corpoMaxZ: ponteZ + comprimentoPonte / 2,
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

const portaCabana = gerarPorta(-0.75, 0.2, 2.5, grupoCabana);
grupoCabana.position.set(cabanaX, hCabana, cabanaZ); cena.add(grupoCabana); objetosRaycast.push(grupoCabana);
zonasInteriores.push({ tipo: 'casa', x: cabanaX, z: cabanaZ, w: 5.6, d: 4.6, pisos: [hCabana + 0.5], pisoMax: 1 });

// Colisões precisas da Cabana inicial
objetosMundo.push({ isBox: true, minX: cabanaX - 3.15, maxX: cabanaX - 2.85, minZ: cabanaZ - 2.5, maxZ: cabanaZ + 2.5, topoY: hCabana + 4 });
objetosMundo.push({ isBox: true, minX: cabanaX + 2.85, maxX: cabanaX + 3.15, minZ: cabanaZ - 2.5, maxZ: cabanaZ + 2.5, topoY: hCabana + 4 });
objetosMundo.push({ isBox: true, minX: cabanaX - 3, maxX: cabanaX + 3, minZ: cabanaZ - 2.65, maxZ: cabanaZ - 2.35, topoY: hCabana + 4 });
objetosMundo.push({ isBox: true, minX: cabanaX - 3, maxX: cabanaX - 0.75, minZ: cabanaZ + 2.35, maxZ: cabanaZ + 2.65, topoY: hCabana + 4 });
objetosMundo.push({ isBox: true, minX: cabanaX + 0.75, maxX: cabanaX + 3, minZ: cabanaZ + 2.35, maxZ: cabanaZ + 2.65, topoY: hCabana + 4 });
// NOVO: colisão do vão da porta em si — só bloqueia quando a porta está fechada (ver campo "porta" abaixo)
objetosMundo.push({ isBox: true, minX: cabanaX - 0.75, maxX: cabanaX + 0.75, minZ: cabanaZ + 2.35, maxZ: cabanaZ + 2.65, topoY: hCabana + 4, porta: portaCabana });

// Fogueira e Nuvens
const fogueiraX = -15, fogueiraZ = -13; const alturaChaoFogo = obterAlturaTerreno(fogueiraX, fogueiraZ);
for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) { const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), new THREE.MeshStandardMaterial({ color: 0x555555 })); p.position.set(fogueiraX + Math.cos(a) * 0.6, alturaChaoFogo + 0.1, fogueiraZ + Math.sin(a) * 0.6); cena.add(p); }
const countPart = 35; const geoPart = new THREE.BufferGeometry(); const posPart = new Float32Array(countPart * 3); const dadosPart = [];
for (let i = 0; i < countPart; i++) { posPart[i * 3] = fogueiraX + (Math.random() - 0.5) * 0.3; posPart[i * 3 + 1] = alturaChaoFogo + Math.random() * 2; posPart[i * 3 + 2] = fogueiraZ + (Math.random() - 0.5) * 0.3; dadosPart.push({ vY: Math.random() * 1.5 + 1, vX: (Math.random() - 0.5) * 0.2, vZ: (Math.random() - 0.5) * 0.2 }); }
geoPart.setAttribute('position', new THREE.BufferAttribute(posPart, 3)); const sistemaFumaça = new THREE.Points(geoPart, new THREE.PointsMaterial({ color: 0xff4500, size: 0.25, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })); cena.add(sistemaFumaça);
const luzFogo = new THREE.PointLight(0xff7700, 2.0, 10); luzFogo.position.set(fogueiraX, alturaChaoFogo + 0.5, fogueiraZ); cena.add(luzFogo);

const grupoNuvens = new THREE.Group(); const matNuven = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
for (let n = 0; n < 12; n++) { const nuvem = new THREE.Group(); const pedacos = Math.floor(Math.random() * 3 + 3); for (let p = 0; p < pedacos; p++) { const b = new THREE.Mesh(new THREE.BoxGeometry(6 + p * 2, 3, 5), matNuven); b.position.set(p * 2.5 - pedacos, Math.random() * 0.5, (Math.random() - 0.5) * 2); nuvem.add(b); } nuvem.position.set((Math.random() - 0.5) * 300, 45 + Math.random() * 15, (Math.random() - 0.5) * 300); grupoNuvens.add(nuvem); } cena.add(grupoNuvens);

function criarArvoreDiferenciada(x, z) {
    if (Math.abs(x - ponteX) < 8 && Math.abs(z - ponteZ) < 56) return; if (Math.abs(x - cabanaX) < 8 && Math.abs(z - cabanaZ) < 8) return;
    const h = obterAlturaTerreno(x, z); if (h <= NIVEL_DA_AGUA) return;
    const grupoA = new THREE.Group(); const tipo = Math.floor(Math.random() * 3); let madeiraDrop = 3;
    const mod = 0.65 + Math.random() * 1.0, altT = (tipo === 2 ? 5.5 : 4.5) * mod, rT = (tipo === 1 ? 0.6 : 0.4) * mod;
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(rT * 0.7, rT, altT, 12), matTroncoGlobal); tronco.position.y = altT / 2; tronco.castShadow = true; tronco.receiveShadow = true; grupoA.add(tronco);
    const cFolha = (tipo === 0) ? new THREE.Color().setHSL(0.32 + Math.random() * 0.03, 0.7, 0.22) : (tipo === 1 ? new THREE.Color().setHSL(0.28 + Math.random() * 0.04, 0.65, 0.26) : new THREE.Color().setHSL(0.35 + Math.random() * 0.02, 0.55, 0.3));
    const mFolhas = new THREE.MeshStandardMaterial({ color: cFolha, roughness: 0.8, flatShading: true });
    if (tipo === 0) { for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry((2.5 - (i * 0.45)) * mod, 2.5 * mod, 10), mFolhas); f.position.y = (altT * 0.7) + (i * 1.2 * mod); f.castShadow = true; grupoA.add(f); } }
    else if (tipo === 1) { for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.DodecahedronGeometry((2.0 + Math.random() * 0.6) * mod, 1), mFolhas); f.position.set((Math.random() - 0.5) * 1.2 * mod, altT + (i * 0.8 * mod), (Math.random() - 0.5) * 1.2 * mod); f.castShadow = true; grupoA.add(f); } }
    else { const f = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * mod, 1.6 * mod, 3.5 * mod, 8), mFolhas); f.position.y = altT + (1.75 * mod); f.castShadow = true; grupoA.add(f); }
    grupoA.position.set(x, h, z); cena.add(grupoA);
    const objDados = { x: x, z: z, raio: 1.3 * mod, topoY: h + altT + (3.0 * mod), meshRaiz: grupoA, eArvore: true, madeirasDisponiveis: madeiraDrop };
    grupoA.userData = { dadosArvore: objDados }; objetosMundo.push(objDados); objetosRaycast.push(grupoA);
}
function criarRocha(x, z) {
    if (Math.abs(x - ponteX) < 6 && Math.abs(z - ponteZ) < 52) return; if (Math.abs(x - cabanaX) < 7 && Math.abs(z - cabanaZ) < 7) return;
    const s = Math.random() * 2 + 1.5, r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.9 }));
    const h = obterAlturaTerreno(x, z); r.position.set(x, h + (s * 0.3), z); r.castShadow = true; cena.add(r);

    const objDados = { x: x, z: z, raio: s * 1.2, topoY: h + (s * 1.1), meshRaiz: r, eRocha: true, pedrasDisponiveis: 2 };
    r.userData = { dadosRocha: objDados };
    objetosMundo.push(objDados); objetosRaycast.push(r);
}
for (let i = 0; i < 140; i++) { let x = (Math.random() - 0.5) * 340, z = (Math.random() - 0.5) * 340; if (Math.abs(x) > 12 || Math.abs(z) > 12) { if (Math.random() > 0.35) criarArvoreDiferenciada(x, z); else criarRocha(x, z); } }

if (!ehTouch) {
    controles.getObject().position.set(0, obterAlturaTerreno(0, 0) + ALTURA_JOGADOR, 15);
} else {
    cameraContainer.position.set(0, obterAlturaTerreno(0, 0) + ALTURA_JOGADOR, 15);
}

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

// ============================================================
// TABELA CENTRAL DE DIMENSÕES DAS CONSTRUÇÕES
// ============================================================
// Antes cada tamanho vivia espalhado em vários ternários encadeados
// (em ativarHolograma e executarConstrucaoReal). Agora é uma tabela só,
// então adicionar um novo tipo de construção é só adicionar uma linha aqui.
const DIMENSOES_CONSTRUCAO = {
    p: { largura: 7, profundidade: 6, altura: 4 },
    m: { largura: 7, profundidade: 6, altura: 8 },
    g: { largura: 14, profundidade: 6, altura: 8 },
    fogueira: { largura: 2, profundidade: 2, altura: 1 },
    piso: { largura: 2, profundidade: 2, altura: 0.1 },
    tocha: { largura: 0.4, profundidade: 0.4, altura: 1.5 },
    cama: { largura: 1.4, profundidade: 2.2, altura: 0.6 },
    // Delimitação
    cerca: { largura: 2, profundidade: 0.3, altura: 1.3 },
    muro: { largura: 2, profundidade: 0.4, altura: 1.8 },
    // Móveis internos
    mesa: { largura: 1.3, profundidade: 0.8, altura: 0.75 },
    cadeira: { largura: 0.55, profundidade: 0.55, altura: 0.9 },
    bau: { largura: 1.0, profundidade: 0.6, altura: 0.7 },
    lareira: { largura: 1.7, profundidade: 0.8, altura: 1.7 }
};
function obterDimensoes(tipo) { return DIMENSOES_CONSTRUCAO[tipo] || DIMENSOES_CONSTRUCAO.p; }

// Tipos que ganham o indicador amarelo de porta no holograma (só as casas)
const TIPOS_COM_PORTA = ['p', 'm', 'g'];
// Tipos que encaixam numa grade de 2 em 2 (fáceis de alinhar em fileira/lado a lado)
const TIPOS_GRID_DUPLO = ['piso', 'tocha', 'cama', 'cerca', 'muro'];

function ativarHolograma(tipo) {
    if (hologramaVisual) cena.remove(hologramaVisual);
    hologramaVisual = new THREE.Group();

    // Medidas vêm da tabela central (facilita adicionar novos tipos de construção)
    const { largura, profundidade, altura } = obterDimensoes(tipo);

    let malhaPrevia = new THREE.Mesh(
        new THREE.BoxGeometry(largura, altura, profundidade),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.4 })
    );
    malhaPrevia.position.y = altura / 2;
    hologramaVisual.add(malhaPrevia);

    // Só as casas (p/m/g) ganham o indicador amarelo de porta
    if (TIPOS_COM_PORTA.includes(tipo)) {
        let indicadorPorta = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 2.8, 0.4),
            new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 })
        );
        indicadorPorta.position.set(0, 1.4, profundidade / 2);
        hologramaVisual.add(indicadorPorta);
    }

    anguloRotacaoHolograma = 0;
    hologramaVisual.visible = false;
    cena.add(hologramaVisual);
}

function desativarHolograma() { if (hologramaVisual) { cena.remove(hologramaVisual); hologramaVisual = null; } }

function construirCasaDetalhada(tipo, posX, posY, posZ, rotacaoY) {
    const casa = new THREE.Group();
    const eGrossa = 0.3, w = (tipo === 'g') ? 14 : 7, d = 6, andares = (tipo === 'p') ? 1 : 2;
    let andaresLista = [posY + 0.5];
    if (andares === 2) andaresLista.push(posY + 4.5);

    function adicionarParedeComJanela(larguraTotal, alturaTotal, prof, px, py, pz, rotY, jLarg, jAlt) {
        const grp = new THREE.Group();
        const altBaixo = (alturaTotal - jAlt) / 2, largLado = (larguraTotal - jLarg) / 2;

        const pBx = new THREE.Mesh(new THREE.BoxGeometry(larguraTotal, altBaixo, prof), matTroncoGlobal);
        pBx.position.set(0, -alturaTotal / 2 + altBaixo / 2, 0); pBx.castShadow = true; grp.add(pBx);
        const pCm = new THREE.Mesh(new THREE.BoxGeometry(larguraTotal, altBaixo, prof), matTroncoGlobal);
        pCm.position.set(0, alturaTotal / 2 - altBaixo / 2, 0); pCm.castShadow = true; grp.add(pCm);
        const pEq = new THREE.Mesh(new THREE.BoxGeometry(largLado, jAlt, prof), matTroncoGlobal);
        pEq.position.set(-larguraTotal / 2 + largLado / 2, 0, 0); pEq.castShadow = true; grp.add(pEq);
        const pDr = new THREE.Mesh(new THREE.BoxGeometry(largLado, jAlt, prof), matTroncoGlobal);
        pDr.position.set(larguraTotal / 2 - largLado / 2, 0, 0); pDr.castShadow = true; grp.add(pDr);

        const vetro = new THREE.Mesh(new THREE.BoxGeometry(jLarg, jAlt, prof * 0.4), matVidroGlobal);
        grp.add(vetro);
        grp.position.set(px, py, pz); grp.rotation.y = rotY;
        casa.add(grp);
    }

    let portaCriada = null; // NOVO: guarda a porta desta casa para ligar à colisão do vão

    if (tipo === 'g') {
        const piso1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), matPisoGlobal);
        piso1.position.y = 0.2; piso1.receiveShadow = true; casa.add(piso1);
        objetosRaycast.push(piso1); // ✨ CORREÇÃO: Registra o chão de baixo da casa grande

        const piso2Completo = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), matPisoGlobal);
        piso2Completo.position.y = 4.2; piso2Completo.receiveShadow = true; casa.add(piso2Completo);
        objetosRaycast.push(piso2Completo); // ✨ CORREÇÃO: Registra o andar de cima da casa grande

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
        portaCriada = gerarPorta(-0.75, 0.2, 2.85, casa);

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
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) > 0) {
                let px = pos.getX(i);
                if (px > 0) pos.setX(i, px - 3.5);
                if (px < 0) pos.setX(i, px + 3.5);
                if (pos.getZ(i) !== undefined) pos.setZ(i, 0);
            }
        }
        geoTelhado.computeVertexNormals();
        const telhado = new THREE.Mesh(geoTelhado, matTelhadoCabana);
        telhado.position.set(0, 9.5, 0); telhado.castShadow = true; casa.add(telhado);

    } else {
        const hTotalMuros = 4 * andares;
        for (let a = 0; a < andares; a++) {
            const piso = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), matPisoGlobal);
            piso.position.y = (a * 4) + 0.2; piso.receiveShadow = true; casa.add(piso);
            objetosRaycast.push(piso); // ✨ CORREÇÃO: Registra automaticamente os pisos de baixo/cima das casas P e M
        }
        for (let a = 0; a < andares; a++) {
            let yCentroMuro = (a * 4) + 2;
            adicionarParedeComJanela(d, 4, eGrossa, -w / 2 + eGrossa / 2, yCentroMuro, 0, Math.PI / 2, 2.2, 1.8);
            adicionarParedeComJanela(d, 4, eGrossa, w / 2 - eGrossa / 2, yCentroMuro, 0, Math.PI / 2, 2.2, 1.8);
            adicionarParedeComJanela(w, 4, eGrossa, 0, yCentroMuro, -d / 2 + eGrossa / 2, 0, 2.5, 1.8);
        }

        const pFE = new THREE.Mesh(new THREE.BoxGeometry((w / 2) - 0.75, hTotalMuros, eGrossa), matTroncoGlobal);
        pFE.position.set(-w / 4 - 0.75 / 2, hTotalMuros / 2, d / 2 - eGrossa / 2); pFE.castShadow = true; casa.add(pFE);
        const pFD = new THREE.Mesh(new THREE.BoxGeometry((w / 2) - 0.75, hTotalMuros, eGrossa), matTroncoGlobal);
        pFD.position.set(w / 4 + 0.75 / 2, hTotalMuros / 2, d / 2 - eGrossa / 2); pFD.castShadow = true; casa.add(pFD);
        const vPorta = new THREE.Mesh(new THREE.BoxGeometry(1.5, hTotalMuros - 2.8, eGrossa), matTroncoGlobal);
        vPorta.position.set(0, 2.8 + (hTotalMuros - 2.8) / 2, d / 2 - eGrossa / 2); casa.add(vPorta);

        portaCriada = gerarPorta(-0.75, 0.2, d / 2 - eGrossa / 2, casa);

        if (tipo === 'm') {
            let offsetZ = -d / 2 + 1.0;
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
        isCasaConstruida: true, x: posX, y: posY, z: posZ, w: w, d: d, rot: rotacaoY, topoY: posY + (andares * 4),
        porta: portaCriada // NOVO: usado na colisão pra saber se a porta está aberta ou fechada
    };
    objetosMundo.push(infoCasa);

    zonasInteriores.push({
        tipo: 'casa_andares', x: posX, z: posZ, w: w, d: d, rot: rotacaoY,
        pisos: andaresLista, pisoMax: andares
    });
}

function construirFogueiraFisica(posX, posY, posZ) {
    const fogueiraGrupo = new THREE.Group();

    // Pedras em círculo (Visual da fogueira)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const p = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.25, 0),
            new THREE.MeshStandardMaterial({ color: 0x555555 })
        );
        p.position.set(Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6);
        p.castShadow = true;
        fogueiraGrupo.add(p);
    }

    // O CONE LARANJA FOI REMOVIDO DAQUI ❌
    // Agora o fogo será feito puramente pelas partículas de luz subindo!

    fogueiraGrupo.position.set(posX, posY, posZ);
    cena.add(fogueiraGrupo);
    objetosRaycast.push(fogueiraGrupo);

    // --- SISTEMA DE LUZ DINÂMICA NO CHÃO ---
    const luzFogo = new THREE.PointLight(0xff7700, 2.0, 10);
    luzFogo.position.set(posX, posY + 0.5, posZ);
    cena.add(luzFogo);

    // --- SISTEMA DE PARTÍCULAS (O FOGO QUE SOBE IGUAL À CABANA) ---
    const countPart = 30;
    const geoPart = new THREE.BufferGeometry();
    const posPart = new Float32Array(countPart * 3);
    const dadosPart = [];

    for (let i = 0; i < countPart; i++) {
        // Começa bem no centro das pedras
        posPart[i * 3] = posX + (Math.random() - 0.5) * 0.2;
        posPart[i * 3 + 1] = posY + 0.1 + Math.random() * 2;
        posPart[i * 3 + 2] = posZ + (Math.random() - 0.5) * 0.2;

        dadosPart.push({
            vY: Math.random() * 1.5 + 1.0, // Velocidade de subida
            vX: (Math.random() - 0.5) * 0.2,
            vZ: (Math.random() - 0.5) * 0.2
        });
    }

    geoPart.setAttribute('position', new THREE.BufferAttribute(posPart, 3));

    // Material idêntico ao da cabana (laranja brilhante que sobe se misturando)
    const sistemaFumaca = new THREE.Points(geoPart, new THREE.PointsMaterial({
        color: 0xff4500,               // Cor do fogo vivo
        size: 0.25,                    // Tamanho ideal das faíscas
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending // Faz os pontos brilharem intensamente ao se sobreporem
    }));
    cena.add(sistemaFumaca);

    // Salva na lista global para rodar a física na função animar()
    listaFogueirasDinamicas.push({
        luz: luzFogo,
        sistemaParticulas: sistemaFumaca,
        dadosParticulas: dadosPart,
        xOriginal: posX,
        yOriginal: posY,
        zOriginal: posZ
    });
}

function construirPisoPedra(posX, posY, posZ, rotacaoY) {
    // Usamos uma cor e textura simples simulando paralelepípedos
    const matPisoPedra = new THREE.MeshStandardMaterial({
        color: 0x7a7a7a,
        roughness: 1.0
    });

    // Uma caixa achatada (0.05 de altura) para dar o efeito de tinta / caminho plano
    const piso = new THREE.Mesh(new THREE.BoxGeometry(2, 0.05, 2), matPisoPedra);

    piso.rotation.y = rotacaoY;
    // O pulo do gato: +0.05 na posição Y evita que ele "pisque" e brigue com a textura da grama (Z-fighting)
    piso.position.set(posX, posY + 0.05, posZ);
    piso.receiveShadow = true;

    cena.add(piso);
    // Adicionar no array de raycast garante que possamos interagir (ou impedir construir por cima)
    objetosRaycast.push(piso);
}

function construirTochaFisica(posX, posY, posZ) {
    const grupoTocha = new THREE.Group();

    // 1. O Bastão de Madeira (Fino e vertical)
    const matMadeira = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
    const bastao = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), matMadeira);
    bastao.position.y = 0.6;
    grupoTocha.add(bastao);

    // 2. O Suporte de Pedra (No topo do bastão)
    const matPedra = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.8 });
    const suporte = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), matPedra);
    suporte.position.y = 1.2;
    grupoTocha.add(suporte);

    // 3. O Carvão/Fogo (Cubo laranja brilhante no topo)
    const matFogo = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const fogo = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.18), matFogo);
    fogo.position.y = 1.35;
    grupoTocha.add(fogo);

    // 4. A Luz Real da Tocha (Luz amarelada que ilumina o mundo)
    const luzTocha = new THREE.PointLight(0xff9900, 1.5, 12);
    luzTocha.position.y = 1.5;
    luzTocha.castShadow = true;
    luzTocha.shadow.bias = -0.002;
    grupoTocha.add(luzTocha);

    // Posiciona o conjunto inteiro no mapa
    grupoTocha.position.set(posX, posY, posZ);
    cena.add(grupoTocha);

    // Adiciona o bastão na lista de colisões para que o jogador não atravesse
    objetosRaycast.push(bastao);
}

function criarModeloCama() {
    const grupoCama = new THREE.Group();

    // 1. Base/Estrado de Madeira Escura
    const geoBase = new THREE.BoxGeometry(1.4, 0.3, 2.2);
    const matBase = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
    const meshBase = new THREE.Mesh(geoBase, matBase);
    meshBase.position.y = 0.15;
    grupoCama.add(meshBase);

    // 2. Colchão Branco
    const geoColchao = new THREE.BoxGeometry(1.3, 0.25, 2.0);
    const matColchao = new THREE.MeshLambertMaterial({ color: 0xfafafa });
    const meshColchao = new THREE.Mesh(geoColchao, matColchao);
    meshColchao.position.set(0, 0.425, -0.05);
    grupoCama.add(meshColchao);

    // 3. Travesseiro Macio (na cabeceira da cama)
    const geoTravesseiro = new THREE.BoxGeometry(1.1, 0.1, 0.4);
    const matTravesseiro = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    const meshTravesseiro = new THREE.Mesh(geoTravesseiro, matTravesseiro);
    meshTravesseiro.position.set(0, 0.6, -0.8);
    grupoCama.add(meshTravesseiro);

    return grupoCama;
}

// ============================================================
// MODELOS 3D: DELIMITAÇÃO (CERCA E MURO)
// ============================================================
function construirCercaFisica(posX, posY, posZ, rotacaoY) {
    const grupo = new THREE.Group();
    const matMadeira = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });

    // Dois postes verticais nas pontas do segmento
    [-0.9, 0.9].forEach(px => {
        const poste = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), matMadeira);
        poste.position.set(px, 0.65, 0);
        poste.castShadow = true;
        grupo.add(poste);
    });

    // Duas ripas horizontais ligando os postes
    [0.45, 1.0].forEach(py => {
        const ripa = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.06), matMadeira);
        ripa.position.set(0, py, 0);
        ripa.castShadow = true;
        grupo.add(ripa);
    });

    grupo.position.set(posX, posY, posZ);
    grupo.rotation.y = rotacaoY;
    cena.add(grupo);
    objetosRaycast.push(grupo);
    return grupo;
}

function construirMuroFisica(posX, posY, posZ, rotacaoY) {
    const matPedra = new THREE.MeshStandardMaterial({ color: 0x7d7d7d, roughness: 1.0 });
    const muro = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 0.35), matPedra);
    muro.position.set(posX, posY + 0.9, posZ);
    muro.rotation.y = rotacaoY;
    muro.castShadow = true;
    muro.receiveShadow = true;
    cena.add(muro);
    objetosRaycast.push(muro);
    return muro;
}

// ============================================================
// MODELOS 3D: MÓVEIS INTERNOS (MESA, CADEIRA, BAÚ, LAREIRA)
// ============================================================
function criarModeloMesa() {
    const grupo = new THREE.Group();
    const matMadeira = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });

    const tampo = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.8), matMadeira);
    tampo.position.y = 0.72;
    tampo.castShadow = true; tampo.receiveShadow = true;
    grupo.add(tampo);

    [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]].forEach(([px, pz]) => {
        const perna = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), matMadeira);
        perna.position.set(px, 0.35, pz);
        perna.castShadow = true;
        grupo.add(perna);
    });

    return grupo;
}

function criarModeloCadeira() {
    const grupo = new THREE.Group();
    const matMadeira = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });

    const assento = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.5), matMadeira);
    assento.position.y = 0.45;
    assento.castShadow = true;
    grupo.add(assento);

    const encosto = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.07), matMadeira);
    encosto.position.set(0, 0.7, -0.22);
    encosto.castShadow = true;
    grupo.add(encosto);

    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([px, pz]) => {
        const perna = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), matMadeira);
        perna.position.set(px, 0.22, pz);
        perna.castShadow = true;
        grupo.add(perna);
    });

    return grupo;
}

function criarModeloBau() {
    const grupo = new THREE.Group();
    const matMadeira = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.8 });
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x3f3f3f, metalness: 0.4, roughness: 0.5 });

    const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.6), matMadeira);
    corpo.position.y = 0.25;
    corpo.castShadow = true;
    grupo.add(corpo);

    const tampa = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.14, 0.62), matMadeira);
    tampa.position.y = 0.57;
    tampa.castShadow = true;
    grupo.add(tampa);

    const faixaFrente = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.62), matMetal);
    faixaFrente.position.set(0, 0.25, 0);
    grupo.add(faixaFrente);

    const fechadura = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), matMetal);
    fechadura.position.set(0, 0.35, 0.32);
    grupo.add(fechadura);

    return grupo;
}

function construirLareiraFisica(posX, posY, posZ, rotacaoY) {
    const grupo = new THREE.Group();
    const matPedra = new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.9 });

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 0.7), matPedra);
    base.position.y = 0.15;
    base.castShadow = true; base.receiveShadow = true;
    grupo.add(base);

    // Parede de trás e laterais, formando um "U" que contém o fogo
    const paredeTras = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 0.15), matPedra);
    paredeTras.position.set(0, 0.95, -0.28);
    paredeTras.castShadow = true;
    grupo.add(paredeTras);

    [-0.72, 0.72].forEach(px => {
        const lateral = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.3, 0.7), matPedra);
        lateral.position.set(px, 0.95, 0);
        lateral.castShadow = true;
        grupo.add(lateral);
    });

    // Viga/moldura no topo (estilo mantel de lareira)
    const moldura = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.15, 0.8), matPedra);
    moldura.position.y = 1.65;
    moldura.castShadow = true;
    grupo.add(moldura);

    grupo.position.set(posX, posY, posZ);
    grupo.rotation.y = rotacaoY;
    cena.add(grupo);
    objetosRaycast.push(grupo);

    // Fogo contido dentro da lareira: mesma lógica de luz + partículas da fogueira,
    // mas em coordenadas de mundo (não do grupo) porque o loop de animação em
    // listaFogueirasDinamicas espera posições absolutas.
    const luzFogo = new THREE.PointLight(0xff7700, 1.8, 8);
    luzFogo.position.set(posX, posY + 0.5, posZ);
    cena.add(luzFogo);

    const countPart = 20;
    const geoPart = new THREE.BufferGeometry();
    const posPart = new Float32Array(countPart * 3);
    const dadosPart = [];
    for (let i = 0; i < countPart; i++) {
        posPart[i * 3] = posX + (Math.random() - 0.5) * 0.4;
        posPart[i * 3 + 1] = posY + 0.3 + Math.random() * 0.8;
        posPart[i * 3 + 2] = posZ + (Math.random() - 0.5) * 0.3;
        dadosPart.push({ vY: Math.random() * 1.2 + 0.8, vX: (Math.random() - 0.5) * 0.15, vZ: (Math.random() - 0.5) * 0.15 });
    }
    geoPart.setAttribute('position', new THREE.BufferAttribute(posPart, 3));
    const sistemaFogo = new THREE.Points(geoPart, new THREE.PointsMaterial({
        color: 0xff4500, size: 0.2, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending
    }));
    cena.add(sistemaFogo);

    listaFogueirasDinamicas.push({
        luz: luzFogo,
        sistemaParticulas: sistemaFogo,
        dadosParticulas: dadosPart,
        xOriginal: posX,
        yOriginal: posY,
        zOriginal: posZ
    });

    return grupo;
}

function executarConstrucaoReal() {
    if (!hologramaVisual || !hologramaVisual.visible) return;
    const posAlvo = hologramaVisual.position.clone();
    if (posAlvo.y <= NIVEL_DA_AGUA + 0.1) { mostrarNotificacao("Impossível construir na água!", "#ef4444"); return; }

    const posJ = controles.getObject().position;

    // Espaço livre necessário vem da mesma tabela central usada no holograma
    const { largura: larguraEspaco, profundidade: profEspaco } = obterDimensoes(tipoCasaParaConstruir);

    if (Math.abs(posJ.y - posAlvo.y) < 2) {
        if (Math.abs(posJ.x - posAlvo.x) < larguraEspaco / 2 + 0.5 && Math.abs(posJ.z - posAlvo.z) < profEspaco / 2 + 0.5) {
            mostrarNotificacao("Saia do meio para construir!", "#ef4444");
            return;
        }
    }

    // Identifica o que construir e executa a função correta
    if (tipoCasaParaConstruir === 'fogueira') {
        construirFogueiraFisica(posAlvo.x, posAlvo.y, posAlvo.z);
    } else if (tipoCasaParaConstruir === 'piso') {
        construirPisoPedra(posAlvo.x, posAlvo.y, posAlvo.z, anguloRotacaoHolograma);
    } else if (tipoCasaParaConstruir === 'tocha') {
        construirTochaFisica(posAlvo.x, posAlvo.y, posAlvo.z);
    } else if (tipoCasaParaConstruir === 'cama') {
        // ✨ ADICIONADO: Criação física da cama no mundo
        const camaReal = criarModeloCama();
        camaReal.position.set(posAlvo.x, posAlvo.y, posAlvo.z);
        camaReal.rotation.y = anguloRotacaoHolograma;

        cena.add(camaReal);
        objetosRaycast.push(camaReal); // Permite detetar a cama com o olhar se necessário

        // Regista a colisão sólida no mundo para o jogador não a atravessar a andar
        const infoColisaoCama = {
            x: posAlvo.x,
            z: posAlvo.z,
            raio: 0.9, // Raio ideal de colisão para a área da cama
            topoY: posAlvo.y + 0.6 // Altura de colisão
        };
        objetosMundo.push(infoColisaoCama);
    } else if (tipoCasaParaConstruir === 'cerca') {
        construirCercaFisica(posAlvo.x, posAlvo.y, posAlvo.z, anguloRotacaoHolograma);
        objetosMundo.push({ x: posAlvo.x, z: posAlvo.z, raio: 1.0, topoY: posAlvo.y + 1.3 });
    } else if (tipoCasaParaConstruir === 'muro') {
        construirMuroFisica(posAlvo.x, posAlvo.y, posAlvo.z, anguloRotacaoHolograma);
        objetosMundo.push({ x: posAlvo.x, z: posAlvo.z, raio: 1.05, topoY: posAlvo.y + 1.8 });
    } else if (tipoCasaParaConstruir === 'mesa') {
        const mesaReal = criarModeloMesa();
        mesaReal.position.set(posAlvo.x, posAlvo.y, posAlvo.z);
        mesaReal.rotation.y = anguloRotacaoHolograma;
        cena.add(mesaReal); objetosRaycast.push(mesaReal);
        objetosMundo.push({ x: posAlvo.x, z: posAlvo.z, raio: 0.7, topoY: posAlvo.y + 0.75 });
    } else if (tipoCasaParaConstruir === 'cadeira') {
        const cadeiraReal = criarModeloCadeira();
        cadeiraReal.position.set(posAlvo.x, posAlvo.y, posAlvo.z);
        cadeiraReal.rotation.y = anguloRotacaoHolograma;
        cena.add(cadeiraReal); objetosRaycast.push(cadeiraReal);
        objetosMundo.push({ x: posAlvo.x, z: posAlvo.z, raio: 0.35, topoY: posAlvo.y + 0.9 });
    } else if (tipoCasaParaConstruir === 'bau') {
        const bauReal = criarModeloBau();
        bauReal.position.set(posAlvo.x, posAlvo.y, posAlvo.z);
        bauReal.rotation.y = anguloRotacaoHolograma;
        cena.add(bauReal); objetosRaycast.push(bauReal);
        objetosMundo.push({ x: posAlvo.x, z: posAlvo.z, raio: 0.55, topoY: posAlvo.y + 0.7 });
    } else if (tipoCasaParaConstruir === 'lareira') {
        construirLareiraFisica(posAlvo.x, posAlvo.y, posAlvo.z, anguloRotacaoHolograma);
        objetosMundo.push({ x: posAlvo.x, z: posAlvo.z, raio: 0.9, topoY: posAlvo.y + 1.7 });
    } else {
        // Se não for nenhum dos anteriores, constrói uma casa (p, m ou g)
        construirCasaDetalhada(tipoCasaParaConstruir, posAlvo.x, posAlvo.y, posAlvo.z, anguloRotacaoHolograma);
    }

    // Remove 1 planta do inventário
    inventario['planta_' + tipoCasaParaConstruir]--;

    if (inventario['planta_' + tipoCasaParaConstruir] <= 0) {
        inventario['planta_' + tipoCasaParaConstruir] = 0;
        itemAtivo = 'machado';
    }

    atualizarUIAktiv();
}
// --- LOOP DE ANIMAÇÃO PRINCIPAL ---
const relogio = new THREE.Clock(); let tempoCiclo = 0.5;

function animar() {
    requestAnimationFrame(animar); const delta = Math.min(relogio.getDelta(), 0.1);

    // Suaviza a câmera do celular em direção ao alvo (em vez de saltar direto pra
    // posição do dedo). Fórmula independente de FPS: funciona igual em 30 e 120fps.
    if (cameraYawAlvo !== null) {
        const fatorSuavizacao = 1 - Math.exp(-VELOCIDADE_SUAVIZACAO_CAMERA_TOUCH * delta);
        camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, cameraYawAlvo, fatorSuavizacao);
        camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, cameraPitchAlvo, fatorSuavizacao);
        camera.rotation.order = "YXZ";
    }



    if (texturaAgua) { texturaAgua.offset.x -= 0.6 * delta; texturaAgua.offset.y += 0.05 * delta; }

    todasAsPortas.forEach(porta => {
        let alvo = porta.userData.aberta ? -Math.PI / 1.8 : 0;
        porta.rotation.y = THREE.MathUtils.lerp(porta.rotation.y, alvo, 10 * delta);
    });

    raycaster.setFromCamera(vetorCentroTela, camera);
    const interseccoes = raycaster.intersectObjects(objetosRaycast, true);

    let achouObjetoPerto = false, promptTexto = "Pressione E para Interagir", arvoreOlhada = null, rochaOlhada = null;

    if (interseccoes.length > 0 && interseccoes[0].distance < 4.0) {
        let objOcular = interseccoes[0].object;
        if (objOcular === mesaTrabalhoMesh || objOcular.parent === mesaTrabalhoMesh) { achouObjetoPerto = true; promptTexto = "Pressione E para usar a Mesa de Trabalho"; }
        else {
            let cur = objOcular;
            while (cur && cur.type !== 'Scene') {
                if (cur.userData && cur.userData.ePorta) { achouObjetoPerto = true; promptTexto = "Pressione E para abrir/fechar a Porta"; break; }
                if (cur.userData && cur.userData.dadosArvore) { arvoreOlhada = cur.userData.dadosArvore; break; }
                if (cur.userData && cur.userData.dadosRocha) { rochaOlhada = cur.userData.dadosRocha; break; }
                cur = cur.parent;
            }
        }
    }

    // Mineração de Árvores
    if (arvoreOlhada && estaMinando && itemAtivo === 'machado') {
        if (arvoreSendoCortada !== arvoreOlhada) { arvoreSendoCortada = arvoreOlhada; tempoSegurandoClique = 0; }
        tempoSegurandoClique += delta;
        if (barraProgressoContainer && barraProgressoContainer.style.display !== 'block') barraProgressoContainer.style.display = 'block';
        if (barraProgressoPreenchimento) barraProgressoPreenchimento.style.width = Math.min(100, (tempoSegurandoClique / 3.0 * 100)) + '%';

        if (tempoSegurandoClique >= 3.0) {
            inventario.madeira += arvoreSendoCortada.madeirasDisponiveis;
            const txtMadeira = document.getElementById('txt-qtd-madeira');
            if (txtMadeira) txtMadeira.innerText = inventario.madeira;
            cena.remove(arvoreSendoCortada.meshRaiz);
            let iMundo = objetosMundo.indexOf(arvoreSendoCortada); if (iMundo > -1) objetosMundo.splice(iMundo, 1);
            let iRay = objetosRaycast.indexOf(arvoreSendoCortada.meshRaiz); if (iRay > -1) objetosRaycast.splice(iRay, 1);
            estaMinando = false; tempoSegurandoClique = 0; arvoreSendoCortada = null; if (barraProgressoContainer) barraProgressoContainer.style.display = 'none';
        }
    }
    // Mineração de Rochas (4 Segundos) - COM SISTEMA DE DROP ALEATÓRIO
    // Mineração de Rochas (4 Segundos)
    else if (rochaOlhada && estaMinando && itemAtivo === 'picareta') {
        if (rochaSendoMinerada !== rochaOlhada) { rochaSendoMinerada = rochaOlhada; tempoSegurandoClique = 0; }
        tempoSegurandoClique += delta;
        if (barraProgressoContainer && barraProgressoContainer.style.display !== 'block') barraProgressoContainer.style.display = 'block';
        if (barraProgressoPreenchimento) barraProgressoPreenchimento.style.width = Math.min(100, (tempoSegurandoClique / 4.0 * 100)) + '%';

        if (tempoSegurandoClique >= 4.0) {
            // 1. Sempre adiciona as pedras padrão da rocha
            inventario.pedra += rochaSendoMinerada.pedrasDisponiveis;
            const txtPedra = document.getElementById('txt-qtd-pedra');
            if (txtPedra) txtPedra.innerText = inventario.pedra;

            // 2. Lógica de chances
            let chance = Math.random();

            if (chance < 0.30) {
                // 30% de chance: Apenas as pedras
                mostrarNotificacao(`+${rochaSendoMinerada.pedrasDisponiveis} Pedras`);
            }
            else if (chance < 0.60) {
                // +30% de chance: Ganha 1 Ferro
                inventario.ferro = (inventario.ferro || 0) + 1;
                const txtFerro = document.getElementById('txt-qtd-ferro');
                if (txtFerro) txtFerro.innerText = inventario.ferro;
                mostrarNotificacao(`+${rochaSendoMinerada.pedrasDisponiveis} Pedras e +1 Fragm. de Ferro!`);
            }
            else if (chance < 0.85) {
                // +25% de chance: Ganha 1 Cobre
                inventario.cobre = (inventario.cobre || 0) + 1;
                const txtCobre = document.getElementById('txt-qtd-cobre');
                if (txtCobre) txtCobre.innerText = inventario.cobre;
                mostrarNotificacao(`+${rochaSendoMinerada.pedrasDisponiveis} Pedras e +1 Fragm. de Cobre!`);
            }
            else {
                // 15% de chance restante: Ganha 1 Ouro
                inventario.ouro = (inventario.ouro || 0) + 1;
                const txtOuro = document.getElementById('txt-qtd-ouro');
                if (txtOuro) txtOuro.innerText = inventario.ouro;
                mostrarNotificacao(`+${rochaSendoMinerada.pedrasDisponiveis} Pedras e +1 Fragm. de Ouro! ✨`);
            }

            // 3. Remove a rocha do mundo
            cena.remove(rochaSendoMinerada.meshRaiz);
            let iMundo = objetosMundo.indexOf(rochaSendoMinerada); if (iMundo > -1) objetosMundo.splice(iMundo, 1);
            let iRay = objetosRaycast.indexOf(rochaSendoMinerada.meshRaiz); if (iRay > -1) objetosRaycast.splice(iRay, 1);
            estaMinando = false; tempoSegurandoClique = 0; rochaSendoMinerada = null; if (barraProgressoContainer) barraProgressoContainer.style.display = 'none';
        }
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
            if (promptInteracao) {
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
        // Procura a primeira superfície que aponta para cima (chão da casa, segundo andar, terreno ou água)
        let chaoValido = interseccoes.find(i =>
            (i.face && i.face.normal.y > 0.5) ||
            (i.object === terreno || i.object === agua)
        );

        if (chaoValido) {
            hologramaVisual.visible = true;

            // Pega a altura EXATA de onde o raio bateu (resolve o problema de afundar ou não subir pro 2º andar)
            let alturaAlvo = chaoValido.point.y;

            // Mantém a grade de posicionamento para ficar organizado
            let grid = (tipoCasaParaConstruir === 'piso' || tipoCasaParaConstruir === 'tocha' || tipoCasaParaConstruir === 'cama') ? 2 : 1;
            let xAlvo = Math.round(chaoValido.point.x / grid) * grid;
            let zAlvo = Math.round(chaoValido.point.z / grid) * grid;

            hologramaVisual.position.set(xAlvo, alturaAlvo, zAlvo);
            hologramaVisual.rotation.y = anguloRotacaoHolograma;

            let corIndicativa = (alturaAlvo <= NIVEL_DA_AGUA) ? 0xff0000 : 0x00ff00;
            hologramaVisual.children.forEach(c => { if (c.material) c.material.color.setHex(corIndicativa); });
        } else {
            hologramaVisual.visible = false;
        }
    }


    // Se o Sol estiver abaixo do horizonte (noite), o tempo passa 4 vezes mais rápido!
    if (luzSol.position.y < 0) {
        // Noite: dura 3 minutos reais (180 segundos)
        // Velocidade = (PI) / 180 segundos ≈ 0.01745 por segundo
        tempoCiclo += delta * 0.01745;
    } else {
        // Dia: dura 6 minutos reais (360 segundos)
        // Velocidade = (PI) / 360 segundos ≈ 0.00872 por segundo
        tempoCiclo += delta * 0.00872;
    }

    // Atualiza a posição do sol usando o novo tempoCiclo
    luzSol.position.x = Math.cos(tempoCiclo) * 100;
    luzSol.position.y = Math.sin(tempoCiclo) * 100;
    //tempoCiclo += delta * 0.015; if(tempoCiclo > Math.PI * 2) tempoCiclo = 0;//
    const sX = Math.cos(tempoCiclo) * 160, sY = Math.sin(tempoCiclo) * 160;
    luzSol.position.set(sX, sY, 50); meshSol.position.set(sX, sY, 50); meshLua.position.set(-sX, -sY, -50);
    const alturaSol = Math.sin(tempoCiclo), fNoite = Math.max(0, Math.min(1, (0.2 - alturaSol) * 5)), fOcaso = Math.max(0, Math.min(1, (0.4 - Math.abs(alturaSol)) * 4));
    let corCeuAtual = corDia.clone().lerp(corOcaso, fOcaso).lerp(corNoite, fNoite); cena.background = corCeuAtual; cena.fog.color = corCeuAtual;
    if (alturaSol > 0.2) { luzSol.intensity = alturaSol * 0.9; luzAmbiente.intensity = 0.5; } else if (alturaSol <= 0.2 && alturaSol > -0.1) { luzSol.intensity = Math.max(0.1, (alturaSol + 0.1) * 2); luzAmbiente.intensity = 0.25; } else { luzSol.intensity = 0.04; luzAmbiente.intensity = 0.08; }
    if (sistemaEstrelas) sistemaEstrelas.material.opacity = fNoite;
    grupoNuvens.children.forEach(n => { n.position.x += 2.0 * delta; if (n.position.x > 200) n.position.x = -200; });
    const posFP = sistemaFumaça.geometry.attributes.position.array;
    for (let i = 0; i < countPart; i++) { posFP[i * 3 + 1] += dadosPart[i].vY * delta; posFP[i * 3] += dadosPart[i].vX * delta; posFP[i * 3 + 2] += dadosPart[i].vZ * delta; if (posFP[i * 3 + 1] > alturaChaoFogo + 4.5) { posFP[i * 3 + 1] = alturaChaoFogo + 0.2; posFP[i * 3] = fogueiraX + (Math.random() - 0.5) * 0.3; posFP[i * 3 + 2] = fogueiraZ + (Math.random() - 0.5) * 0.3; } }
    sistemaFumaça.geometry.attributes.position.needsUpdate = true; luzFogo.intensity = 1.5 + Math.sin(Date.now() * 0.02) * 0.4;

    listaFogueirasDinamicas.forEach(fogueira => {
        // Faz a luz da fogueira construída oscilar
        fogueira.luz.intensity = 1.5 + Math.sin(Date.now() * 0.02) * 0.4;

        // Atualiza as partículas de fumaça dela
        const posFP_Dinamica = fogueira.sistemaParticulas.geometry.attributes.position.array;
        const countPart_Dinamica = posFP_Dinamica.length / 3;

        for (let i = 0; i < countPart_Dinamica; i++) {
            posFP_Dinamica[i * 3 + 1] += fogueira.dadosParticulas[i].vY * delta;
            posFP_Dinamica[i * 3] += fogueira.dadosParticulas[i].vX * delta;
            posFP_Dinamica[i * 3 + 2] += fogueira.dadosParticulas[i].vZ * delta;

            if (posFP_Dinamica[i * 3 + 1] > fogueira.yOriginal + 4.5) {
                posFP_Dinamica[i * 3 + 1] = fogueira.yOriginal + 0.2;
                posFP_Dinamica[i * 3] = fogueira.xOriginal + (Math.random() - 0.5) * 0.3;
                posFP_Dinamica[i * 3 + 2] = fogueira.zOriginal + (Math.random() - 0.5) * 0.3;
            }
        }
        fogueira.sistemaParticulas.geometry.attributes.position.needsUpdate = true;
    });

  // --- COMECE A SUBSTITUIR A PARTIR DAQUI ---
    velocidade.x -= velocidade.x * 10.0 * delta; 
    velocidade.z -= velocidade.z * 10.0 * delta; 
    velocidade.y -= GRAVIDADE * delta; 
    
    direcao.z = Number(moverFrente) - Number(moverTras); 
    direcao.x = Number(moverDireita) - Number(moverEsquerda); 
    direcao.normalize();

    const posJ = controles.getObject().position;

    // 1. Pega a altura provisória SÓ para aplicar a lentidão da água antes de mover
    let alturaChaoProvisoria = obterAlturaTerreno(posJ.x, posJ.z);
    let estaNaAgua = false;
    if (alturaChaoProvisoria <= NIVEL_DA_AGUA && (posJ.y - ALTURA_JOGADOR) <= NIVEL_DA_AGUA + 0.2) estaNaAgua = true;
    
    const redutorAgua = estaNaAgua ? 0.45 : 1.0, multV = correndo ? 1.7 : 1.0;
    
    if (moverFrente || moverTras) velocidade.z -= direcao.z * VELOCIDADE_BASE * multV * multiplicadorJoystick * redutorAgua * delta;
    if (moverEsquerda || moverDireita) velocidade.x -= direcao.x * VELOCIDADE_BASE * multV * multiplicadorJoystick * redutorAgua * delta;
    if (estaNaAgua) { velocidade.x *= 0.85; velocidade.z *= 0.85; }

    // 2. MOVA O JOGADOR NA HORIZONTAL PRIMEIRO (A Mágica acontece aqui)
    const posAntigaX = posJ.x, posAntigaZ = posJ.z;
    controles.moveRight(-velocidade.x * delta); 
    controles.moveForward(-velocidade.z * delta);

    // 3. AGORA SIM, CALCULA A ALTURA DO CHÃO NA POSIÇÃO NOVA
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
                        // NOVO: só atravessa livremente se a casa tiver porta E ela estiver aberta.
                        // Porta fechada (ou casa sem porta associada) bloqueia a passagem, como uma parede.
                        colidiu = !(obj.porta && obj.porta.userData.aberta);
                    } else {
                        colidiu = true; 
                    }
                }
            }
        }
        else if (obj.isBox) { 
            if (posJ.x > obj.minX && posJ.x < obj.maxX && posJ.z > obj.minZ && posJ.z < obj.maxZ) {
                // NOVO: se essa caixa representa o vão de uma porta, só bloqueia quando ela está fechada
                colidiu = obj.porta ? !obj.porta.userData.aberta : true;
            }
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
                // CRÍTICO: Recalcula a altura se bater de cara na parede para não levitar!
                alturaPisoAtual = obterAlturaTerreno(posJ.x, posJ.z) + ALTURA_JOGADOR; 
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
    // --- TERMINE DE SUBSTITUIR AQUI (As animações de head bobbing ficam logo abaixo) ---

    // CORREÇÃO CRÍTICA: como controles.getObject() é a própria câmera (não um objeto
    // "corpo" separado), "camera.position.y/x" É a posição real do jogador usada pela
    // física. O código antigo fazia "camera.position.y = ..." (atribuição direta), o
    // que APAGAVA a altura certa calculada pela colisão/terreno e a substituía por um
    // valor pertinho de zero a cada frame andando — causando o afundamento perto da
    // água (e travando o movimento lateral em X). Agora aplicamos só a DIFERENÇA
    // (delta) do balanço em relação ao frame anterior, preservando a posição real.
    if ((moverFrente || moverTras || moverEsquerda || moverDireita) && podeSaltar) {
        temporizadorBobbing += delta * (correndo ? 14.5 : 9.5);
        const novoBobY = Math.sin(temporizadorBobbing) * (correndo ? 0.12 : 0.06);
        const novoBobX = Math.cos(temporizadorBobbing * 0.5) * (correndo ? 0.07 : 0.04);
        camera.position.y += (novoBobY - bobAtualY);
        camera.position.x += (novoBobX - bobAtualX);
        bobAtualY = novoBobY; bobAtualX = novoBobX;
        let somAlvo = estaNaAgua ? somPassoAgua : (correndo ? somPassoCorrer : somPassoNormal);
        if (audioAtualTocando && audioAtualTocando !== somAlvo) audioAtualTocando.stop();
        if (somAlvo.buffer && !somAlvo.isPlaying) somAlvo.play(); audioAtualTocando = somAlvo;
    } else {
        const alvoBobY = THREE.MathUtils.lerp(bobAtualY, 0, 8 * delta);
        const alvoBobX = THREE.MathUtils.lerp(bobAtualX, 0, 8 * delta);
        camera.position.y += (alvoBobY - bobAtualY);
        camera.position.x += (alvoBobX - bobAtualX);
        bobAtualY = alvoBobY; bobAtualX = alvoBobX;
        pararSonsDeMovimento();
    }


    renderizador.render(cena, camera);
}
animar();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderizador.setSize(window.innerWidth, window.innerHeight); });

// --- LÓGICA DE ABRIR/FECHAR A MOCHILA ---
let mochilaAberta = false;
const mochilaContainer = document.getElementById('mochila-container');

function alternarMochila() {
    if (menuCraftingAberto) return; // Não abre se estiver na mesa de trabalho

    mochilaAberta = !mochilaAberta;
    if (mochilaAberta) {
        mochilaContainer.style.display = 'block';
        pararSonsDeMovimento();
        if (!ehTouch) controles.unlock(); // Libera o mouse no PC para o cara fechar se quiser
    } else {
        mochilaContainer.style.display = 'none';
        if (!ehTouch) controles.lock(); // Trava o mouse de volta no jogo
    }
}

// Eventos de clique para fechar e botão mobile
document.getElementById('btn-fechar-mochila')?.addEventListener('click', alternarMochila);
document.getElementById('btn-mochila-mobile')?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    alternarMochila();
});

// --- CONTROLE DE CÂMERA POR TOQUE (CELULAR) ---
// Toque no lado direito da tela = olhar ao redor (o esquerdo fica livre pro
// joystick). Um único dedo é rastreado pelo "identifier" dele, então tocar em
// botões, no joystick ou em menus com o outro dedo não atrapalha mais.

// Ajuste este número pra deixar a câmera mais rápida (maior) ou mais lenta
// (menor) de girar no celular. Ele é dividido pela largura da tela, então o
// "sentimento" (quanto a câmera gira por polegada arrastada) fica parecido em
// celulares com telas de tamanhos/resoluções diferentes.
const SENSIBILIDADE_CAMERA_TOUCH = 1.3;

let touchOlharId = null;
let touchOlharAnteriorX = 0;
let touchOlharAnteriorY = 0;

// Evita começar a "olhar ao redor" quando o dedo toca em botões mobile,
// no joystick ou em algum menu/overlay aberto (mochila, crafting, pause etc).
function toqueEmAreaDeUI(alvo) {
    if (!alvo || typeof alvo.closest !== 'function') return false;
    return !!alvo.closest('#zona-joystick, #botoes-acao-mobile, .btn-touch, button, #menu-crafting, #mochila-container, .overlay-tela');
}

window.addEventListener('touchstart', (e) => {
    if (!jogoIniciado || jogoPausado || !ehTouch) return;
    if (mochilaAberta || menuCraftingAberto) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        // Toque no lado direito da tela, fora de botões/menus, para girar a câmera
        if (touch.clientX > window.innerWidth / 2 && touchOlharId === null && !toqueEmAreaDeUI(touch.target)) {
            touchOlharId = touch.identifier;
            touchOlharAnteriorX = touch.clientX;
            touchOlharAnteriorY = touch.clientY;
            // Sincroniza o alvo com a rotação real, senão a câmera "puxaria" de
            // onde parou o último drag pra posição atual assim que suavizar.
            if (cameraYawAlvo === null) { cameraYawAlvo = camera.rotation.y; cameraPitchAlvo = camera.rotation.x; }
        }
    }
});

window.addEventListener('touchmove', (e) => {
    if (!jogoIniciado || jogoPausado || touchOlharId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchOlharId) {
            const deltaX = touch.clientX - touchOlharAnteriorX;
            const deltaY = touch.clientY - touchOlharAnteriorY;

            // Normalizado pela largura da tela (ver comentário no topo do bloco).
            // Só move o ALVO aqui — quem realmente gira a câmera, suavemente,
            // é o trecho no início da função animar().
            const sensibilidade = SENSIBILIDADE_CAMERA_TOUCH / window.innerWidth;
            cameraYawAlvo -= deltaX * sensibilidade;
            cameraPitchAlvo -= deltaY * sensibilidade;

            // Limita olhar muito para cima ou muito para baixo
            cameraPitchAlvo = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraPitchAlvo));

            touchOlharAnteriorX = touch.clientX;
            touchOlharAnteriorY = touch.clientY;
        }
    }
});

const resetTouchOlhar = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchOlharId) {
            touchOlharId = null;
        }
    }
};
window.addEventListener('touchend', resetTouchOlhar);
window.addEventListener('touchcancel', resetTouchOlhar);
// ============================================================
// ÍCONES DAS CASAS (CANVAS) NA MESA DE CRAFTING
// ============================================================
// Desenha um ícone de casinha 2D dentro de um <canvas>, com diferenças
// visuais reais entre pequena, média e grande (tamanho, nº de janelas,
// andares e chaminé) — em vez de usar o emoji 🏡 genérico para as três.
function desenharIconeCasa(canvas, tipo) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const configs = {
        p: { escala: 0.80, janelas: 1, andares: 1, chamine: false, corTelhado: '#f87171' },
        m: { escala: 1.00, janelas: 2, andares: 1, chamine: true, corTelhado: '#ef4444' },
        g: { escala: 1.18, janelas: 3, andares: 2, chamine: true, corTelhado: '#dc2626' }
    };
    const cfg = configs[tipo] || configs.p;

    const baseY = H - 5;
    const larguraParede = 20 * cfg.escala;
    const alturaParede = (cfg.andares === 2 ? 19 : 12) * cfg.escala;
    const alturaTelhado = 11 * cfg.escala;
    const centroX = W / 2;

    const paredeEsq = centroX - larguraParede / 2;
    const paredeDir = centroX + larguraParede / 2;
    const paredeTopoY = baseY - alturaParede;

    ctx.beginPath();
    ctx.ellipse(centroX, baseY + 1.5, larguraParede * 0.6, 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    ctx.fillStyle = cfg.andares === 2 ? '#e7c39a' : '#d9a66c';
    ctx.strokeStyle = '#5c3a21';
    ctx.lineWidth = 1.2;
    ctx.fillRect(paredeEsq, paredeTopoY, larguraParede, alturaParede);
    ctx.strokeRect(paredeEsq, paredeTopoY, larguraParede, alturaParede);

    if (cfg.andares === 2) {
        const meioY = paredeTopoY + alturaParede * 0.48;
        ctx.beginPath();
        ctx.moveTo(paredeEsq, meioY);
        ctx.lineTo(paredeDir, meioY);
        ctx.strokeStyle = 'rgba(92,58,33,0.55)';
        ctx.stroke();
        ctx.strokeStyle = '#5c3a21';
    }

    const beiral = 3 * cfg.escala;
    ctx.beginPath();
    ctx.moveTo(paredeEsq - beiral, paredeTopoY);
    ctx.lineTo(centroX, paredeTopoY - alturaTelhado);
    ctx.lineTo(paredeDir + beiral, paredeTopoY);
    ctx.closePath();
    ctx.fillStyle = cfg.corTelhado;
    ctx.fill();
    ctx.strokeStyle = '#5c3a21';
    ctx.stroke();

    if (cfg.chamine) {
        const chamineLargura = 3.2 * cfg.escala;
        const chamineX = centroX + larguraParede * 0.20;
        const chamineAltura = alturaTelhado * 0.6;
        const chamineTopoY = paredeTopoY - chamineAltura * 0.65;
        ctx.fillStyle = '#7c5843';
        ctx.fillRect(chamineX, chamineTopoY, chamineLargura, chamineAltura);
        ctx.strokeRect(chamineX, chamineTopoY, chamineLargura, chamineAltura);

        if (tipo === 'g') {
            ctx.fillStyle = 'rgba(220,220,220,0.65)';
            ctx.beginPath(); ctx.arc(chamineX + chamineLargura / 2, chamineTopoY - 3, 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(chamineX + chamineLargura / 2 + 2.2, chamineTopoY - 6.5, 2.3, 0, Math.PI * 2); ctx.fill();
        }
    }

    const portaLargura = 4.5 * cfg.escala;
    const portaAltura = alturaParede * 0.5;
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(centroX - portaLargura / 2, baseY - portaAltura, portaLargura, portaAltura);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(centroX + portaLargura / 2 - 1, baseY - portaAltura / 2, 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#bde0fe';
    ctx.strokeStyle = '#5c3a21';
    ctx.lineWidth = 1;
    const janelaTam = 3.6 * cfg.escala;
    const janelaYBase = paredeTopoY + alturaParede * 0.20;

    function desenharJanela(fracaoX, offsetY) {
        const jx = paredeEsq + larguraParede * fracaoX - janelaTam / 2;
        const jy = janelaYBase + offsetY;
        ctx.fillRect(jx, jy, janelaTam, janelaTam);
        ctx.strokeRect(jx, jy, janelaTam, janelaTam);
        ctx.beginPath();
        ctx.moveTo(jx + janelaTam / 2, jy);
        ctx.lineTo(jx + janelaTam / 2, jy + janelaTam);
        ctx.moveTo(jx, jy + janelaTam / 2);
        ctx.lineTo(jx + janelaTam, jy + janelaTam / 2);
        ctx.stroke();
    }

    if (cfg.janelas === 1) {
        desenharJanela(0.68, 0);
    } else if (cfg.janelas === 2) {
        desenharJanela(0.24, 0);
        desenharJanela(0.76, 0);
    } else {
        desenharJanela(0.22, alturaParede * 0.40);
        desenharJanela(0.78, alturaParede * 0.40);
        desenharJanela(0.5, -alturaParede * 0.04);
    }
}

// ============================================================
// ÍCONES DOS NOVOS GRUPOS: DELIMITAÇÃO E MÓVEIS INTERNOS
// ============================================================
// Mesmo espírito das casas: desenho vetorial simples em canvas, escalado por
// frações de W/H (funciona tanto no ícone grande da mesa de trabalho de 44x44
// quanto no ícone pequeno da hotbar de 32x32).
function desenharIconeCerca(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const corMadeira = '#b98a54', corContorno = '#5c3a21';
    ctx.strokeStyle = corContorno; ctx.lineWidth = Math.max(1, W * 0.045);

    // Ripas horizontais
    ctx.fillStyle = corMadeira;
    [H * 0.42, H * 0.66].forEach(ry => {
        ctx.fillRect(W * 0.10, ry, W * 0.80, H * 0.08);
        ctx.strokeRect(W * 0.10, ry, W * 0.80, H * 0.08);
    });

    // Estacas verticais com ponta triangular
    const baseY = H * 0.90, topoY = H * 0.18, largEstaca = W * 0.13;
    [W * 0.22, W * 0.5, W * 0.78].forEach(px => {
        ctx.beginPath();
        ctx.moveTo(px - largEstaca / 2, baseY);
        ctx.lineTo(px - largEstaca / 2, topoY + H * 0.10);
        ctx.lineTo(px, topoY);
        ctx.lineTo(px + largEstaca / 2, topoY + H * 0.10);
        ctx.lineTo(px + largEstaca / 2, baseY);
        ctx.closePath();
        ctx.fillStyle = corMadeira;
        ctx.fill();
        ctx.stroke();
    });
}

function desenharIconeMuro(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const margemX = W * 0.08, margemY = H * 0.15;
    const larguraTotal = W - margemX * 2, alturaTotal = H - margemY * 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(margemX, margemY, larguraTotal, alturaTotal);
    ctx.clip();
    const linhas = 3, alturaLinha = alturaTotal / linhas, numBlocos = 3, largBloco = larguraTotal / numBlocos;
    ctx.strokeStyle = '#374151'; ctx.lineWidth = Math.max(1, W * 0.03);
    for (let l = 0; l < linhas; l++) {
        const y = margemY + l * alturaLinha;
        const offset = (l % 2 === 0) ? 0 : -largBloco / 2;
        for (let b = -1; b <= numBlocos; b++) {
            const x = margemX + offset + b * largBloco;
            ctx.fillStyle = (b + l) % 2 === 0 ? '#9ca3af' : '#818996';
            ctx.fillRect(x, y, largBloco, alturaLinha);
            ctx.strokeRect(x, y, largBloco, alturaLinha);
        }
    }
    ctx.restore();
    ctx.strokeStyle = '#374151'; ctx.lineWidth = Math.max(1, W * 0.04);
    ctx.strokeRect(margemX, margemY, larguraTotal, alturaTotal);
}

function desenharIconeMesa(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const corMadeira = '#b98a54', corContorno = '#5c3a21';
    ctx.fillStyle = corMadeira; ctx.strokeStyle = corContorno; ctx.lineWidth = Math.max(1, W * 0.04);

    const tampoX = W * 0.12, tampoY = H * 0.32, tampoW = W * 0.76, tampoH = H * 0.12;
    ctx.fillRect(tampoX, tampoY, tampoW, tampoH);
    ctx.strokeRect(tampoX, tampoY, tampoW, tampoH);

    [tampoX + tampoW * 0.06, tampoX + tampoW * 0.82].forEach(px => {
        ctx.fillRect(px, tampoY + tampoH, tampoW * 0.12, H * 0.42);
        ctx.strokeRect(px, tampoY + tampoH, tampoW * 0.12, H * 0.42);
    });
}

function desenharIconeCadeira(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const corMadeira = '#8b5e34', corContorno = '#5c3a21';
    ctx.fillStyle = corMadeira; ctx.strokeStyle = corContorno; ctx.lineWidth = Math.max(1, W * 0.04);

    ctx.fillRect(W * 0.28, H * 0.14, W * 0.10, H * 0.40);
    ctx.strokeRect(W * 0.28, H * 0.14, W * 0.10, H * 0.40);

    ctx.fillRect(W * 0.24, H * 0.48, W * 0.50, H * 0.10);
    ctx.strokeRect(W * 0.24, H * 0.48, W * 0.50, H * 0.10);

    [W * 0.28, W * 0.66].forEach(px => {
        ctx.fillRect(px, H * 0.58, W * 0.06, H * 0.32);
        ctx.strokeRect(px, H * 0.58, W * 0.06, H * 0.32);
    });
}

function desenharIconeBau(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const corMadeira = '#8b5e34', corContorno = '#5c3a21', corMetal = '#9ca3af';
    ctx.strokeStyle = corContorno; ctx.lineWidth = Math.max(1, W * 0.04);

    ctx.fillStyle = corMadeira;
    ctx.fillRect(W * 0.16, H * 0.46, W * 0.68, H * 0.36);
    ctx.strokeRect(W * 0.16, H * 0.46, W * 0.68, H * 0.36);

    ctx.beginPath();
    ctx.moveTo(W * 0.16, H * 0.46);
    ctx.quadraticCurveTo(W * 0.5, H * 0.16, W * 0.84, H * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = corMetal;
    ctx.fillRect(W * 0.47, H * 0.20, W * 0.06, H * 0.62);
    ctx.fillRect(W * 0.44, H * 0.5, W * 0.12, H * 0.1);
    ctx.strokeRect(W * 0.44, H * 0.5, W * 0.12, H * 0.1);
}

function desenharIconeLareira(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const corPedra = '#8a8f98', corContorno = '#374151';
    ctx.strokeStyle = corContorno; ctx.lineWidth = Math.max(1, W * 0.04);

    ctx.fillStyle = corPedra;
    ctx.fillRect(W * 0.10, H * 0.20, W * 0.80, H * 0.66);
    ctx.strokeRect(W * 0.10, H * 0.20, W * 0.80, H * 0.66);

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(W * 0.24, H * 0.40, W * 0.52, H * 0.42);

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.42);
    ctx.quadraticCurveTo(W * 0.62, H * 0.58, W * 0.5, H * 0.80);
    ctx.quadraticCurveTo(W * 0.38, H * 0.58, W * 0.5, H * 0.42);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.52);
    ctx.quadraticCurveTo(W * 0.56, H * 0.62, W * 0.5, H * 0.74);
    ctx.quadraticCurveTo(W * 0.44, H * 0.62, W * 0.5, H * 0.52);
    ctx.closePath();
    ctx.fill();
}

function inicializarIconesDeCrafting() {
    desenharIconeCasa(document.getElementById('canvas-casa-p'), 'p');
    desenharIconeCasa(document.getElementById('canvas-casa-m'), 'm');
    desenharIconeCasa(document.getElementById('canvas-casa-g'), 'g');

    // Cada item novo desenha tanto no card grande da mesa de trabalho
    // quanto no ícone pequeno da hotbar (mesmo desenho, escala diferente).
    [
        ['canvas-cerca', desenharIconeCerca],
        ['canvas-muro', desenharIconeMuro],
        ['canvas-mesa', desenharIconeMesa],
        ['canvas-cadeira', desenharIconeCadeira],
        ['canvas-bau', desenharIconeBau],
        ['canvas-lareira', desenharIconeLareira]
    ].forEach(([id, funcaoDesenho]) => {
        const el = document.getElementById(id);
        if (el) funcaoDesenho(el);
    });
}
// O script está no final do <body>, então o HTML já existe — pode chamar direto.
inicializarIconesDeCrafting();