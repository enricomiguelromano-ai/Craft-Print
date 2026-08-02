// --- 🎵 CONFIGURAÇÃO DOS SEUS ARQUIVOS MP3 e IMAGENS 🎵 ---
const ARQUIVOS_DE_AUDIO = {
    musicaFundo: 'sounds/craftprintMusic.mp3', passoNormal: 'sounds/walk.mp3',
    passoCorrer: 'sounds/run.mp3', passoAgua: 'sounds/walk_water.mp3',
    lanterna: 'sounds/click_lantern.mp3', portaAbrir: 'sounds/open_door.mp3',
    portaFechar: 'sounds/close_door.mp3', pulo: 'sounds/jump.mp3',
    // Coloque seus arquivos .mp3 com esses nomes exatos dentro da pasta "sounds/"
    // (ou edite os caminhos abaixo se preferir outro nome/local):
    machado: 'sounds/machado.mp3',      // toca em loop enquanto corta madeira
    picareta: 'sounds/picareta.mp3', // toca em loop enquanto minera pedra
    carroMotor: 'sounds/car_engine.mp3',  // toca em loop enquanto dirige o carro
    andarAnimal: 'sounds/walk_animal.mp3' // toca (perto do jogador) enquanto um animal está andando
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
    planta_carro: 0,
    planta_tv: 0,
    ferro: 0,
    cobre: 0,
    ouro: 0
};

// --- SISTEMA DE ECONOMIA (VENDA DE RECURSOS NO COMPUTADOR) ---
// Preço por unidade de cada recurso extraído. Usado pela escrivaninha/PC da cabana.
const PRECOS_RECURSOS = {
    madeira: 300,
    pedra: 350,
    ferro: 1100,
    cobre: 800,
    ouro: 2000
};
const NOMES_RECURSOS = {
    madeira: 'Madeira',
    pedra: 'Pedra',
    ferro: 'Ferro',
    cobre: 'Cobre',
    ouro: 'Ouro'
};

// --- SISTEMA DE COMPRA DE PRODUTOS (COMPUTADOR, ABA "COMPRAR") ---
// Cada produto vira 1 unidade de "planta_<tipo>" no inventário quando comprado,
// e é posicionado no mundo pelo mesmo sistema de holograma usado pelas plantas
// de construção (ver DIMENSOES_CONSTRUCAO / executarConstrucaoReal).
const PRODUTOS_LOJA = {
    carro: { nome: 'Carro', preco: 20000 },
    tv: { nome: 'Televisão', preco: 2000 }
};

// ------------------------------------------------------------------
// MINIGAMES DA TV — 5 jogos leves, 100% autocontidos (sem precisar de
// nenhum arquivo externo). "iniciar" recebe o elemento container onde o
// jogo deve desenhar sua interface, e DEVE retornar uma função "parar"
// que cancela intervalos/listeners quando o jogador fecha a TV (as
// implementações de cada "iniciar" ficam mais abaixo, perto de
// abrirMenuTV). Pra adicionar um jogo novo, basta seguir esse mesmo
// formato aqui e escrever a função correspondente.
// ------------------------------------------------------------------
const MINIGAMES = [
    { titulo: 'Cobrinha', emoji: '🐍', descricao: 'Setas ou WASD', iniciar: (c) => iniciarJogoCobrinha(c) },
    { titulo: 'Jogo da Velha', emoji: '❌⭕', descricao: '2 jogadores', iniciar: (c) => iniciarJogoVelha(c) },
    { titulo: 'Jogo da Memória', emoji: '🧠', descricao: 'Ache os pares', iniciar: (c) => iniciarJogoMemoria(c) },
    { titulo: 'Pong', emoji: '🏓', descricao: 'Mouse ou W/S', iniciar: (c) => iniciarJogoPong(c) },
    { titulo: 'Reflexo', emoji: '⚡', descricao: 'Clique rápido, 30s', iniciar: (c) => iniciarJogoReflexo(c) }
];

// Dinheiro acumulado pelo jogador (mostrado no HUD do canto inferior esquerdo).
let dinheiroJogador = 0;

// "Carrinho" de venda: recursos que o jogador já reservou pra vender, mas que
// só somam ao dinheiro de verdade quando ele clica em "Fechar Venda". Se o
// jogador sair do computador sem fechar a venda, tudo volta pra mochila.
let carrinhoVenda = { madeira: 0, pedra: 0, ferro: 0, cobre: 0, ouro: 0 };

// --- SISTEMA DE HOTBAR DINÂMICA (10 espaços: teclas 1 a 9, depois 0) ---
// Cada item ganha seu número automaticamente na primeira vez que o jogador o
// possui (machado/picareta entram primeiro, pois já vêm no inventário inicial).
// O número fica reservado ENQUANTO a quantidade for maior que 0. Assim que a
// quantidade desse item cai pra 0 (usou tudo, vendeu, etc.), o espaço é
// liberado (ver liberarSlotsVazios() em atualizarUIAktiv) e pode ser ocupado
// por QUALQUER outro tipo de item — mesmo um que o jogador nunca teve antes.
// Ou seja, "cheio" agora significa 10 tipos diferentes em posse AGORA, não 10
// tipos diferentes conquistados na vida do save.
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
    planta_lareira: { icone: { tipo: 'canvas', valor: desenharIconeLareira } },
    planta_carro: { icone: { tipo: 'emoji', valor: '🚗' }, rotulo: 'Carro' },
    planta_tv: { icone: { tipo: 'emoji', valor: '📺' }, rotulo: 'TV' }
};

// Tenta reservar um número/posição na hotbar pro item (se ele ainda não tiver).
// Devolve true se o item já tinha (ou conseguiu) um número; false se a hotbar
// está cheia (10 itens diferentes) e esse item ainda não fazia parte dela.
//
// CORREÇÃO (mensagem de "Inventário cheio" repetindo sem parar): antes essa
// função avisava toda vez que era chamada e falhava — e ela era chamada de
// dentro de atualizarUIAktiv() para TODOS os itens do inventário, toda vez
// que a UI atualizava (a cada craft, construção, demolição etc.), mesmo pra
// itens que já tinham falhado antes. Resultado: a mensagem reaparecia sem
// parar, mesmo em ações que não tinham nada a ver com pegar um item novo.
// Agora o aviso só é mostrado quando quem chamou pede explicitamente
// (avisarSeCheio = true) — e isso só acontece no exato momento em que o
// jogador tenta conseguir um tipo de item novo (ver craftarConstrucao).
function registrarItemNaHotbar(itemChave, avisarSeCheio = false) {
    if (hotbar.includes(itemChave)) return true;
    const indiceLivre = hotbar.indexOf(null);
    if (indiceLivre === -1) {
        if (avisarSeCheio) {
            mostrarNotificacao('Inventário cheio! Máximo de 10 itens diferentes.', '#ef4444');
        }
        return false;
    }
    hotbar[indiceLivre] = itemChave;
    return true;
}

// Libera da hotbar qualquer item cuja quantidade tenha chegado a 0, deixando
// o espaço livre para QUALQUER tipo (já teve antes ou não). Chamada sempre
// junto com registrarItemNaHotbar em atualizarUIAktiv(), antes de tentar
// reservar espaço pra itens novos — assim um espaço que acabou de esvaziar já
// pode ser reaproveitado na mesma atualização.
function liberarSlotsVazios() {
    for (let i = 0; i < hotbar.length; i++) {
        const chave = hotbar[i];
        if (chave && (!inventario[chave] || inventario[chave] <= 0)) {
            hotbar[i] = null;
        }
    }
}

let itemAtivo = 'machado';

let tempoSegurandoClique = 0, estaMinando = false, arvoreSendoCortada = null, rochaSendoMinerada = null;
let modoConstrucaoAtivo = false, tipoCasaParaConstruir = null, hologramaVisual = null;
let anguloRotacaoHolograma = 0;

// --- AJUSTE DE DISTÂNCIA DE COLOCAÇÃO (roda do mouse / botões no celular) ---
// Por padrão, a construção "gruda" na superfície mais próxima que o crosshair
// está mirando (comportamento de sempre). Girar a roda do mouse soma/subtrai
// dessa distância, dando mais liberdade pra colocar em terrenos abertos mais
// longe, sem precisar que o crosshair esteja bem em cima do ponto exato.
let distanciaExtraColocacao = 0;
const DISTANCIA_BASE_COLOCACAO = 6;      // usada se o crosshair não estiver mirando em nada válido
const DISTANCIA_MAX_EXTRA_COLOCACAO = 24; // quanto, no máximo, dá pra "empurrar" a construção com a roda
const PASSO_DISTANCIA_COLOCACAO = 1.2;    // unidades por "clique" da roda do mouse / toque no botão

// --- SISTEMA DE DEMOLIÇÃO DE CONSTRUÇÕES ---
// Cada construção colocada no mundo vira um "registro" aqui, guardando tudo
// que foi criado junto com ela (meshes, colisores, escadas, portas, etc.) para
// poder ser removido de uma vez só quando o jogador demolir.
let construcoesColocadas = [];
let construcaoOlhada = null, construcaoSendoDemolida = null;

// Qual ferramenta demole qual tipo de construção (baseado no material que
// predomina no custo de cada planta — ver botões de craft no index.html).
const MATERIAL_POR_CONSTRUCAO = {
    p: 'madeira', m: 'madeira', g: 'madeira',
    cerca: 'madeira', mesa: 'madeira', cadeira: 'madeira',
    cama: 'madeira', tocha: 'madeira', bau: 'madeira',
    muro: 'pedra', piso: 'pedra', fogueira: 'pedra', lareira: 'pedra',
    // 'indestrutivel' nunca bate com os materiais que machado/picareta demolem
    // (madeira/pedra) — protege o carro (item caro, comprado com dinheiro) de
    // ser destruído sem querer minerando perto dele.
    carro: 'indestrutivel',
    tv: 'indestrutivel'
};

// --- SISTEMA DE ESCADAS DA CASA ---
let listaEscadas = [];
let listaFogueirasDinamicas = [];

// --- FAUNA (ursos, lobos, coelhos, cervos vagando pelo mapa) ---
// Cada bicho vira um "dadosAnimal" aqui: { tipo, grupo (THREE.Group visual,
// com pernas/cabeça/orelhas em subgrupos pra dar pra animar), colisor (entrada
// em objetosMundo, atualizada a cada frame — bloqueia o jogador de atravessar
// o bicho, do mesmo jeito que árvore/pedra), estado ('parado'|'andando') e um
// "alvo" pra onde ele tá andando no momento. Ver atualizarAnimais().
let animaisNoMundo = [];

// --- SISTEMA DE CARROS DIRIGÍVEIS ---
// Cada carro colocado no mundo vira um "dadosCarro" aqui: { grupo (THREE.Group
// visual), colisor (entrada em objetosMundo que é atualizada em tempo real
// enquanto o carro anda), velocidade (escalar, unidades/seg) e direcaoY
// (ângulo de rotação atual do carro). "dirigindoCarro"/"carroAtual" controlam
// qual carro (se algum) está sendo pilotado agora.
let carrosNoMundo = [];
let dirigindoCarro = false;
let carroAtual = null;
const posicaoAntesDeDirigir = new THREE.Vector3();
// CORREÇÃO (erro ao entrar no carro): esse vetor é reaproveitado a cada frame
// em atualizarDirecaoCarro() pra calcular onde a câmera fica dentro do carro
// (banco do motorista), mas tinha ficado faltando aqui — sem ele, o jogo
// quebrava com "offsetCameraCarro is not defined" assim que o jogador entrava.
const offsetCameraCarro = new THREE.Vector3();
// Cor escolhida na paleta da loja (aba "Comprar Produtos") antes de comprar.
let corCarroSelecionada = '#dc2626';
// Fila FIFO com a cor de cada carro comprado ainda não posicionado no mundo —
// necessário porque o inventário só guarda uma contagem (planta_carro), sem
// metadados por unidade, então guardamos as cores compradas nessa fila e
// consumimos uma a cada vez que o jogador efetivamente planta um carro.
let filaCoresCarro = [];

// --- CONFIGURAÇÃO INICIAL DO ESPAÇO 3D ---
const container = document.getElementById('canvas-container');

const inventarioHudEl = document.getElementById('inventario-hud');
const promptInteracao = document.getElementById('prompt-interacao');
const btnFullscreen = document.getElementById('btn-fullscreen');
const controlesMobileDiv = document.getElementById('controles-mobile');
const menuCrafting = document.getElementById('menu-crafting');
const menuLoja = document.getElementById('menu-loja');
const menuTV = document.getElementById('menu-tv');
const menuTVVideo = document.getElementById('menu-tv-jogo');
const dinheiroHudEl = document.getElementById('dinheiro-hud');
const barraProgressoContainer = document.getElementById('barra-coleta-container');
const barraProgressoPreenchimento = document.getElementById('barra-coleta-progresso');
const btnGirarPlantaMobile = document.getElementById('btn-girar-planta');
const btnPlantaMaisPerto = document.getElementById('btn-planta-mais-perto');
const btnPlantaMaisLonge = document.getElementById('btn-planta-mais-longe');

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
// PERFORMANCE: as sombras (do sol + da lanterna) são recalculadas manualmente a
// cada 2 frames em vez de em todo frame (ver "contadorFrameSombra" no loop
// animar()). O sol e a lanterna se movem devagar em relação à taxa de quadros,
// então esse atraso de 1 frame é imperceptível, mas corta bastante o custo de
// renderizar o shadow map — sem mudar nada visualmente.
renderizador.shadowMap.autoUpdate = false;
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
const somMachado = new THREE.Audio(ouvinteAudio), somPicareta = new THREE.Audio(ouvinteAudio), somCarroMotor = new THREE.Audio(ouvinteAudio);

// Som de passos dos animais: diferente dos outros sons (que são "globais",
// tocando direto no ouvido da câmera), este é POSICIONAL — cada animal tem
// sua própria instância de THREE.PositionalAudio presa ao próprio grupo 3D
// dele, então o volume sobe/desce sozinho conforme a distância até o
// jogador (ver setRefDistance/setRolloffFactor abaixo). Como os animais já
// nascem no mundo antes do jogador clicar em "Jogar" (e o áudio só pode
// carregar depois desse clique, por causa da política dos navegadores), o
// buffer carregado é guardado aqui e aplicado tanto nos animais que já
// existem (fila) quanto, dali em diante, em qualquer animal novo.
let bufferPassoAnimal = null;
const filaPositionalAnimais = [];

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
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.machado, b => { somMachado.setBuffer(b); somMachado.setLoop(true); somMachado.setVolume(0.55); }, undefined, () => { });
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.picareta, b => { somPicareta.setBuffer(b); somPicareta.setLoop(true); somPicareta.setVolume(0.55); }, undefined, () => { });
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.carroMotor, b => { somCarroMotor.setBuffer(b); somCarroMotor.setLoop(true); somCarroMotor.setVolume(0.4); }, undefined, () => { });
    carregadorAudio.load(ARQUIVOS_DE_AUDIO.andarAnimal, b => {
        bufferPassoAnimal = b;
        // Os animais que já nasceram (antes do áudio carregar) receberam um
        // THREE.PositionalAudio "vazio" e ficaram esperando nesta fila —
        // agora que o buffer chegou, aplica nele todo mundo de uma vez.
        filaPositionalAnimais.forEach(som => som.setBuffer(b));
        filaPositionalAnimais.length = 0;
    }, undefined, () => { });
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
const btnSalvarJogo = document.getElementById('btn-salvar-jogo');
const btnContinuarSalvo = document.getElementById('btn-continuar-salvo');
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

if (btnSalvarJogo) { btnSalvarJogo.addEventListener('click', () => { salvarJogo(); }); }

// Mostra o botão "Continuar Jogo Salvo" na tela inicial só se já existir um
// save no navegador (senão fica escondido, como já vem por padrão no HTML).
if (btnContinuarSalvo) {
    if (typeof existeJogoSalvo === 'function' && existeJogoSalvo()) {
        btnContinuarSalvo.style.display = 'block';
    }
    const iniciarComSave = (e) => {
        e.preventDefault();
        iniciarJogo();
        carregarJogo();
    };
    btnContinuarSalvo.addEventListener('mousedown', iniciarComSave);
    btnContinuarSalvo.addEventListener('touchstart', iniciarComSave, { passive: false });
}

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
            // Não abre menu pause se a mochila, crafting, o computador ou a TV estiverem abertos
            if (typeof mochilaAberta !== 'undefined' && mochilaAberta) return;
            if (typeof menuCraftingAberto !== 'undefined' && menuCraftingAberto) return;
            if (typeof menuLojaAberto !== 'undefined' && menuLojaAberto) return;
            if (typeof menuTVAberto !== 'undefined' && menuTVAberto) return;

            if (menuPause) menuPause.style.display = 'flex';
            jogoPausado = true;
            if (typeof pararSonsDeMovimento === 'function') pararSonsDeMovimento();

            // Pausar é um ótimo momento pra auto-salvar: o jogador já parou
            // pra ver o menu, então mostra o aviso normalmente.
            if (typeof salvarJogo === 'function') salvarJogo(true);
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
        if (typeof menuLojaAberto !== 'undefined' && menuLojaAberto) {
            fecharLoja();
            return;
        }
        if (typeof menuTVAberto !== 'undefined' && menuTVAberto) {
            fecharMenuTV();
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
let escrivaninhaMesh = null, menuLojaAberto = false;
let menuTVAberto = false;

function atualizarUIAktiv() {
    // Primeiro libera os espaços de itens que zeraram, depois garante que
    // todo item que o jogador possui agora tenha um número reservado (isso é
    // o que faz a numeração seguir a ordem de conquista, com espaço sempre
    // reaproveitável assim que um item acaba).
    liberarSlotsVazios();
    Object.keys(CONFIG_ITENS_HOTBAR).forEach(chave => {
        if (inventario[chave] > 0) registrarItemNaHotbar(chave);
    });

    if (itemAtivo.startsWith('planta_') && inventario[itemAtivo] <= 0) itemAtivo = 'machado';

    renderizarHotbar();

    if (itemAtivo.startsWith('planta_') && inventario[itemAtivo] > 0) {
        modoConstrucaoAtivo = true;
        tipoCasaParaConstruir = itemAtivo.replace('planta_', '');
        distanciaExtraColocacao = 0;
        ativarHolograma(tipoCasaParaConstruir);
        if (typeof btnGirarPlantaMobile !== 'undefined' && btnGirarPlantaMobile) btnGirarPlantaMobile.style.display = 'block';
        if (typeof btnPlantaMaisPerto !== 'undefined' && btnPlantaMaisPerto) btnPlantaMaisPerto.style.display = 'block';
        if (typeof btnPlantaMaisLonge !== 'undefined' && btnPlantaMaisLonge) btnPlantaMaisLonge.style.display = 'block';
    } else {
        modoConstrucaoAtivo = false; desativarHolograma();
        if (typeof btnGirarPlantaMobile !== 'undefined' && btnGirarPlantaMobile) btnGirarPlantaMobile.style.display = 'none';
        if (typeof btnPlantaMaisPerto !== 'undefined' && btnPlantaMaisPerto) btnPlantaMaisPerto.style.display = 'none';
        if (typeof btnPlantaMaisLonge !== 'undefined' && btnPlantaMaisLonge) btnPlantaMaisLonge.style.display = 'none';
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
        spanQtd.innerText = cfg.rotulo ? `${cfg.rotulo} ${qtdAtual}` : qtdAtual;
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
    if (menuCraftingAberto || menuLojaAberto || menuTVAberto || !jogoIniciado || dirigindoCarro) return;
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
    if (menuCraftingAberto || menuLojaAberto || menuTVAberto || !jogoIniciado || dirigindoCarro) return;
    const joystickZone = document.getElementById('zona-joystick');
    if (e.target.tagName === 'BUTTON' || (joystickZone && joystickZone.contains(e.target))) return;

    if (itemAtivo === 'machado' || itemAtivo === 'picareta') {
        estaMinando = true; tempoSegurandoClique = 0;
    }
}, { passive: true });

const noKeyDown = (evento) => {
    // Enquanto o jogador está digitando num campo (ex.: quantidade na loja),
    // deixa o teclado funcionar normalmente em vez de mover o personagem ou
    // fechar o menu sem querer ao digitar a letra "e".
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if ((menuCraftingAberto || menuLojaAberto || menuTVAberto) && evento.code !== 'KeyE') return;
    switch (evento.code) { case 'KeyW': moverFrente = true; break; case 'KeyS': moverTras = true; break; case 'KeyA': moverEsquerda = true; break; case 'KeyD': moverDireita = true; break; case 'ShiftLeft': correndo = true; break; case 'KeyF': if (dirigindoCarro) { alternarFaroisCarro(); } else { alternarLanterna(); } break; case 'KeyE': processarInteracaoGeral(); break; case 'Space': executarPulo(); break; }
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
    if (menuLojaAberto) {
        fecharLoja(); return;
    }
    if (menuTVAberto) {
        fecharMenuTV(); return;
    }
    // Se estiver dirigindo, a tecla E sempre sai do carro (nunca abre outro menu)
    if (dirigindoCarro) {
        sairDoCarro(); return;
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
            if (noPai.userData && noPai.userData.dadosCarro) {
                entrarNoCarro(noPai.userData.dadosCarro);
                interagiu = true; break;
            }
            if (noPai.userData && noPai.userData.dadosTV) {
                abrirMenuTV();
                interagiu = true; break;
            }
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
            if (noPai === escrivaninhaMesh || noPai.parent === escrivaninhaMesh) {
                menuLojaAberto = true; menuLoja.style.display = 'block'; pararSonsDeMovimento(); controles.unlock();
                atualizarUILoja();
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
        const chaveItem = 'planta_' + tipo;

        // CORREÇÃO: antes o item era criado (e a madeira/pedra gasta) mesmo
        // sem sobrar espaço na hotbar — o item ficava "preso" no inventário,
        // sem número, impossível de usar, e o jogador ainda perdia o
        // material. Agora a checagem acontece ANTES de cobrar qualquer
        // recurso: só nega (e avisa) quando esse item ainda não tem espaço
        // reservado E os 10 espaços já estão todos ocupados por outros tipos.
        if (!registrarItemNaHotbar(chaveItem, true)) {
            return;
        }

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

// Abas do computador (Vender Recursos / Comprar Produtos)
document.querySelectorAll('.aba-loja').forEach(aba => {
    aba.addEventListener('click', () => {
        document.querySelectorAll('.aba-loja').forEach(a => a.classList.remove('ativa'));
        aba.classList.add('ativa');
        const alvo = aba.dataset.abaLoja;
        document.querySelectorAll('.loja-painel').forEach(painel => {
            painel.style.display = (painel.dataset.lojaPainel === alvo) ? 'block' : 'none';
        });
    });
});

// Paleta de cores do carro (aba "Comprar Produtos")
document.querySelectorAll('#paleta-cores-carro .cor-opcao').forEach(botaoCor => {
    botaoCor.addEventListener('click', () => {
        document.querySelectorAll('#paleta-cores-carro .cor-opcao').forEach(b => b.classList.remove('ativa'));
        botaoCor.classList.add('ativa');
        corCarroSelecionada = botaoCor.dataset.cor;
    });
});

document.getElementById('btn-lanterna')?.addEventListener('touchstart', (e) => { e.preventDefault(); if (dirigindoCarro) { alternarFaroisCarro(); } else { alternarLanterna(); } });
document.getElementById('btn-pulo')?.addEventListener('touchstart', (e) => { e.preventDefault(); executarPulo(); });
document.getElementById('btn-interagir')?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    // Dirigindo, o botão sempre sai do carro (mesmo comportamento do 'E')
    if (dirigindoCarro) {
        processarInteracaoGeral();
        return;
    }
    // Se estiver com a planta na mão, o botão constrói a casa. Se não, ele interage normalmente com portas/escadas.
    if (modoConstrucaoAtivo) {
        executarConstrucaoReal();
    } else {
        processarInteracaoGeral();
    }
});
btnGirarPlantaMobile?.addEventListener('touchstart', (e) => { e.preventDefault(); if (modoConstrucaoAtivo) anguloRotacaoHolograma += Math.PI / 2; });
btnPlantaMaisPerto?.addEventListener('touchstart', (e) => { e.preventDefault(); ajustarDistanciaColocacao(-PASSO_DISTANCIA_COLOCACAO); });
btnPlantaMaisLonge?.addEventListener('touchstart', (e) => { e.preventDefault(); ajustarDistanciaColocacao(PASSO_DISTANCIA_COLOCACAO); });

const bCorrida = document.getElementById('btn-corrida');
if (bCorrida) {
    bCorrida.addEventListener('touchstart', (e) => { e.preventDefault(); correndo = !correndo; if (correndo) bCorrida.classList.add('btn-ativo'); else bCorrida.classList.remove('btn-ativo'); });
}

function pararSonsDeMovimento() { if (somPassoNormal.isPlaying) somPassoNormal.stop(); if (somPassoCorrer.isPlaying) somPassoCorrer.stop(); if (somPassoAgua.isPlaying) somPassoAgua.stop(); audioAtualTocando = null; }

const luzLanterna = new THREE.SpotLight(0xfffdd0, 4.0, 50, Math.PI / 5, 0.6, 1);
luzLanterna.castShadow = true; luzLanterna.shadow.mapSize.width = 1024; luzLanterna.shadow.mapSize.height = 1024; luzLanterna.visible = false; camera.add(luzLanterna); luzLanterna.position.set(0, 0, 0); luzLanterna.target = new THREE.Object3D(); camera.add(luzLanterna.target); luzLanterna.target.position.set(0, 0, -1);

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

// --- ESCRIVANINHA COM PC (permite vender os recursos coletados) ---
// Fica do lado oposto da mesa de trabalho, encostada na mesma parede dos
// fundos, então as duas "estações" ficam simétricas dentro da cabana.
const grupoEscrivaninha = new THREE.Group();
const matMadeiraEscrivaninha = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.75 });
const matMetalPC = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5, metalness: 0.4 });
const matTelaPC = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, emissive: 0x38bdf8, emissiveIntensity: 0.55 });

const ALTURA_TAMPO_ESCRIVANINHA = 1.05;

const tampoEscrivaninha = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.7), matMadeiraEscrivaninha);
tampoEscrivaninha.position.set(0, ALTURA_TAMPO_ESCRIVANINHA, 0); tampoEscrivaninha.castShadow = true; tampoEscrivaninha.receiveShadow = true;
grupoEscrivaninha.add(tampoEscrivaninha);

// Pernas (do chão da cabana, y=0.2, até a base do tampo)
const alturaPernaEscrivaninha = ALTURA_TAMPO_ESCRIVANINHA - 0.2 - 0.04;
[[-0.56, -0.28], [0.56, -0.28], [-0.56, 0.28], [0.56, 0.28]].forEach(([px, pz]) => {
    const pernaEscrivaninha = new THREE.Mesh(new THREE.BoxGeometry(0.07, alturaPernaEscrivaninha, 0.07), matMadeiraEscrivaninha);
    pernaEscrivaninha.position.set(px, 0.2 + alturaPernaEscrivaninha / 2, pz);
    pernaEscrivaninha.castShadow = true; grupoEscrivaninha.add(pernaEscrivaninha);
});

// Monitor (base + haste + tela + "vidro" brilhando), encostado ao fundo do tampo
const baseMonitorPC = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.03, 12), matMetalPC);
baseMonitorPC.position.set(0, 1.105, -0.15); grupoEscrivaninha.add(baseMonitorPC);
const hasteMonitorPC = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), matMetalPC);
hasteMonitorPC.position.set(0, 1.19, -0.15); grupoEscrivaninha.add(hasteMonitorPC);
const telaMonitorPC = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.03), matMetalPC);
telaMonitorPC.position.set(0, 1.41, -0.15); telaMonitorPC.castShadow = true; grupoEscrivaninha.add(telaMonitorPC);
const vidroMonitorPC = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.24), matTelaPC);
vidroMonitorPC.position.set(0, 1.41, -0.134); grupoEscrivaninha.add(vidroMonitorPC);

// Teclado e mouse, na borda da frente do tampo (lado do jogador)
const tecladoPC = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.15), matMetalPC);
tecladoPC.position.set(0, 1.1, 0.15); grupoEscrivaninha.add(tecladoPC);
const mousePC = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.09), matMetalPC);
mousePC.position.set(0.28, 1.105, 0.15); grupoEscrivaninha.add(mousePC);

// Gabinete (CPU) no chão, encostado na lateral direita da escrivaninha
const gabinetePC = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.45), matMetalPC);
gabinetePC.position.set(0.72, 0.45, -0.05); gabinetePC.castShadow = true; grupoEscrivaninha.add(gabinetePC);
const ledGabinetePC = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1 }));
ledGabinetePC.position.set(0.615, 0.45, -0.05); grupoEscrivaninha.add(ledGabinetePC);

grupoEscrivaninha.position.set(-1.8, 0, -1.5);
grupoCabana.add(grupoEscrivaninha);
escrivaninhaMesh = grupoEscrivaninha;

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

// ============================================================
// FAUNA: modelos 3D + IA de vagueio + animação (ursos, lobos, coelhos, cervos)
// ============================================================

// Cria um "membro" articulado (perna, orelha, etc): um grupo pivô na altura
// de encaixe (ombro/quadril/base da orelha) contendo a peça em si, deslocada
// pra baixo pela metade do comprimento — assim, girar pivot.rotation.x faz a
// peça balançar em torno do ponto de encaixe, como uma perna de verdade.
// Mesmo truque já usado nas rodas do carro (ver criarModeloCarro).
function criarMembroAnimal(comprimento, raioTopo, raioBase, material, matPata) {
    const pivot = new THREE.Group();
    const membro = new THREE.Mesh(new THREE.CylinderGeometry(raioTopo, raioBase, comprimento, 7), material);
    membro.position.y = -comprimento / 2;
    membro.castShadow = true;
    pivot.add(membro);
    // Pata em bloco na ponta da perna — quebra a silhueta "só cilindro/esfera"
    // e dá um contato mais firme (e mais "de jogo") com o chão.
    if (matPata) {
        const pata = new THREE.Mesh(new THREE.BoxGeometry(raioBase * 2.2, raioBase * 1.1, raioBase * 2.7), matPata);
        pata.position.y = -comprimento - raioBase * 0.25;
        pata.castShadow = true;
        pivot.add(pata);
    }
    return pivot;
}

// Par de olhos (com um pontinho de brilho) pra colar num grupo "cabeca".
// px/py/pz são as coordenadas locais do olho direito; o esquerdo é o espelho em X.
// Retorna { grupo, olhos } — "olhos" são os 2 meshes das esferas, guardados
// à parte pra dar pra animar o piscar (escala em Y) sem mexer no brilho.
function criarParOlhos(px, py, pz, raio, matIris) {
    const grupo = new THREE.Group();
    const olhos = [];
    const matBrilho = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    [-px, px].forEach(x => {
        const olho = new THREE.Mesh(new THREE.SphereGeometry(raio, 6, 6), matIris);
        olho.position.set(x, py, pz);
        grupo.add(olho);
        olhos.push(olho);
        const brilho = new THREE.Mesh(new THREE.SphereGeometry(raio * 0.35, 4, 4), matBrilho);
        brilho.position.set(x - raio * 0.35, py + raio * 0.35, pz - raio * 0.6);
        grupo.add(brilho);
    });
    return { grupo, olhos };
}

// Disco achatado e semitransparente colado nos pés do bicho — sombra de
// contato "falsa" (AO barato). Sem isso o modelo parece flutuar um pouco
// sobre o terreno mesmo com a sombra direcional ligada.
function criarSombraContato(raio) {
    const geo = new THREE.CircleGeometry(raio, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
    const disco = new THREE.Mesh(geo, mat);
    disco.rotation.x = -Math.PI / 2;
    disco.position.y = 0.03;
    disco.renderOrder = 1;
    return disco;
}

// --- 🐻 Urso Pardo ---
function criarModeloUrso() {
    const grupo = new THREE.Group();
    const tomBase = 0.06 + Math.random() * 0.02;
    const corPelo = new THREE.Color().setHSL(tomBase, 0.45, 0.24 + Math.random() * 0.07);
    const matPelo = new THREE.MeshStandardMaterial({ color: corPelo, roughness: 0.92, flatShading: true });
    const matPeloEscuro = new THREE.MeshStandardMaterial({ color: corPelo.clone().multiplyScalar(0.55), roughness: 0.92, flatShading: true });
    const matNariz = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.6 });

    const matOlho = new THREE.MeshStandardMaterial({ color: 0x201108, roughness: 0.35 });

    // Torso volumoso e alongado, com a "corcova" característica do urso pardo nos ombros
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), matPelo);
    torso.scale.set(0.95, 0.85, 1.45);
    torso.position.y = 1.05;
    torso.castShadow = true;
    grupo.add(torso);
    const corcova = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), matPelo);
    corcova.position.set(0, 1.55, 0.45);
    corcova.castShadow = true;
    grupo.add(corcova);
    // Peito em bloco: quebra a silhueta "só esferas" e dá presença mais robusta
    const peito = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.7, 0.5), matPelo);
    peito.position.set(0, 0.85, -1.0);
    peito.castShadow = true;
    grupo.add(peito);
    // Mancha de pelo claro no peito — quebra a cor sólida do corpo
    const matPeloClaro = new THREE.MeshStandardMaterial({ color: corPelo.clone().lerp(new THREE.Color(0xd8c7a8), 0.5), roughness: 0.92, flatShading: true });
    const manchaPeito = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.22), matPeloClaro);
    manchaPeito.position.set(0, 0.72, -1.2);
    grupo.add(manchaPeito);

    // Cabeça (grupo próprio: gira sozinha pra "olhar ao redor" na animação idle)
    const cabeca = new THREE.Group();
    cabeca.position.set(0, 1.15, -1.35);
    const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), matPelo);
    craneo.scale.set(0.9, 0.85, 0.95);
    craneo.castShadow = true;
    cabeca.add(craneo);
    // Focinho em bloco (mais quadrado/moderno em vez de só um cilindro liso)
    const focinho = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.55), matPelo);
    focinho.position.set(0, -0.12, -0.6);
    focinho.castShadow = true;
    cabeca.add(focinho);
    const narizTopo = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.18), matPeloEscuro);
    narizTopo.position.set(0, 0.1, -0.84);
    cabeca.add(narizTopo);
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), matNariz);
    nariz.position.set(0, -0.02, -0.9);
    cabeca.add(nariz);
    [-0.28, 0.28].forEach(px => {
        const orelha = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), matPeloEscuro);
        orelha.position.set(px, 0.42, 0.05);
        orelha.castShadow = true;
        cabeca.add(orelha);
    });
    const parOlhosUrso = criarParOlhos(0.17, 0.06, -0.4, 0.06, matOlho);
    cabeca.add(parOlhosUrso.grupo);
    grupo.add(cabeca);

    // Rabo (bem curto, típico de urso)
    const rabo = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), matPelo);
    rabo.position.set(0, 0.95, 1.45);
    grupo.add(rabo);

    grupo.add(criarSombraContato(0.95));

    // Pernas: 4, grossas e curtas, com patas em bloco
    const pernas = {};
    const posPernas = { dianteiraEsq: [-0.55, 1.0, -0.75], dianteiraDir: [0.55, 1.0, -0.75], traseiraEsq: [-0.6, 1.0, 0.85], traseiraDir: [0.6, 1.0, 0.85] };
    Object.keys(posPernas).forEach(nome => {
        const [px, py, pz] = posPernas[nome];
        const pivot = criarMembroAnimal(1.0, 0.26, 0.3, matPeloEscuro, matPeloEscuro);
        pivot.position.set(px, py, pz);
        grupo.add(pivot);
        pernas[nome] = pivot;
    });

    grupo.userData.cabeca = cabeca;
    grupo.userData.pernas = pernas;
    grupo.userData.torso = torso;
    grupo.userData.olhos = parOlhosUrso.olhos;
    return grupo;
}

// --- 🐺 Lobo ---
function criarModeloLobo() {
    const grupo = new THREE.Group();
    const tomBase = 0.09 + Math.random() * 0.05;
    const corPelo = new THREE.Color().setHSL(tomBase, 0.12, 0.32 + Math.random() * 0.1);
    const matPelo = new THREE.MeshStandardMaterial({ color: corPelo, roughness: 0.9, flatShading: true });
    const matPeloClaro = new THREE.MeshStandardMaterial({ color: corPelo.clone().multiplyScalar(1.35), roughness: 0.9, flatShading: true });
    const matPeloEscuro = new THREE.MeshStandardMaterial({ color: corPelo.clone().multiplyScalar(0.55), roughness: 0.9, flatShading: true });
    const matNariz = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const matOlho = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.35, emissive: 0x3a2400, emissiveIntensity: 0.35 });

    // Torso: caixa reta e fina (não esfera) — silhueta magra e comprida de lobo,
    // bem diferente do corpo "gordo" anterior.
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 1.5), matPelo);
    torso.position.set(0, 0.72, 0);
    torso.castShadow = true;
    grupo.add(torso);
    // Peito claro, um pouco mais largo que o torso, marca a caixa torácica
    const peito = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.46), matPeloClaro);
    peito.position.set(0, 0.68, -0.82);
    peito.castShadow = true;
    grupo.add(peito);
    // Quadril levemente mais estreito, reforça a linha reta e enxuta do corpo
    const quadril = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.48, 0.4), matPelo);
    quadril.position.set(0, 0.66, 0.75);
    quadril.castShadow = true;
    grupo.add(quadril);
    // Faixa de barriga clara — some visualmente com o peito já claro e
    // desenha uma "linha" mais clara embaixo do corpo todo
    const barriga = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 1.3), matPeloClaro);
    barriga.position.set(0, 0.48, 0.05);
    grupo.add(barriga);

    const cabeca = new THREE.Group();
    cabeca.position.set(0, 0.98, -1.2);
    const craneo = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.4), matPelo);
    craneo.castShadow = true;
    cabeca.add(craneo);
    // Focinho comprido e afunilado: bloco esticado + ponta mais escura e estreita
    const focinho = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5), matPelo);
    focinho.position.set(0, -0.05, -0.44);
    focinho.castShadow = true;
    cabeca.add(focinho);
    const pontaFocinho = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.15, 0.14), matPeloEscuro);
    pontaFocinho.position.set(0, -0.07, -0.68);
    cabeca.add(pontaFocinho);
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), matNariz);
    nariz.position.set(0, -0.06, -0.75);
    cabeca.add(nariz);
    // Orelhas triangulares, retas e eretas — mais características de lobo
    [-0.14, 0.14].forEach(px => {
        const orelha = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 4), matPelo);
        orelha.position.set(px, 0.29, 0.04);
        orelha.rotation.y = Math.PI / 4;
        orelha.castShadow = true;
        cabeca.add(orelha);
    });
    const parOlhosLobo = criarParOlhos(0.11, 0.03, -0.22, 0.045, matOlho);
    cabeca.add(parOlhosLobo.grupo);
    grupo.add(cabeca);

    grupo.add(criarSombraContato(0.55));

    // Rabo: uma barra só (cilindro), pendurada pra baixo e levemente pra
    // trás — sem cone na ponta.
    const rabo = new THREE.Group();
    rabo.position.set(0, 0.95, 0.95);
    rabo.rotation.x = Math.PI * 0.70;
    const raboBarra = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.85, 7), matPelo);
    raboBarra.position.y = -0.42;
    raboBarra.castShadow = true;
    rabo.add(raboBarra);
    grupo.add(rabo);

    // Pernas finas e retas, com patas em bloco na ponta
    const pernas = {};
    const posPernas = { dianteiraEsq: [-0.19, 0.68, -0.62], dianteiraDir: [0.19, 0.68, -0.62], traseiraEsq: [-0.2, 0.68, 0.65], traseiraDir: [0.2, 0.68, 0.65] };
    Object.keys(posPernas).forEach(nome => {
        const [px, py, pz] = posPernas[nome];
        const pivot = criarMembroAnimal(0.68, 0.06, 0.09, matPelo, matPeloEscuro);
        pivot.position.set(px, py, pz);
        grupo.add(pivot);
        pernas[nome] = pivot;
    });

    grupo.userData.cabeca = cabeca;
    grupo.userData.pernas = pernas;
    grupo.userData.torso = torso;
    grupo.userData.rabo = rabo;
    grupo.userData.olhos = parOlhosLobo.olhos;
    return grupo;
}

// --- 🐇 Coelho ---
function criarModeloCoelho() {
    const grupo = new THREE.Group();
    const tomBase = 0.08 + Math.random() * 0.05;
    const corPelo = new THREE.Color().setHSL(tomBase, 0.35, 0.5 + Math.random() * 0.18);
    const matPelo = new THREE.MeshStandardMaterial({ color: corPelo, roughness: 0.85, flatShading: true });
    const matPeloClaro = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.85, flatShading: true });
    const matNariz = new THREE.MeshStandardMaterial({ color: 0xd97a8a, roughness: 0.6 });
    const matOlho = new THREE.MeshStandardMaterial({ color: 0x1c1108, roughness: 0.3 });

    // Corpo em duas partes (quadril arredondado + tronco em bloco na frente)
    // em vez de uma única esfera — tira o aspecto "bolinha gorda" e dá silhueta
    // de coelho de verdade, mais fina na frente e cheia atrás.
    const quadril = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), matPelo);
    quadril.scale.set(0.36, 0.34, 0.4);
    quadril.position.set(0, 0.34, 0.16);
    quadril.castShadow = true;
    grupo.add(quadril);
    const tronco = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.46), matPelo);
    tronco.position.set(0, 0.31, -0.2);
    tronco.castShadow = true;
    grupo.add(tronco);
    const peitoClaro = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.18), matPeloClaro);
    peitoClaro.position.set(0, 0.23, -0.42);
    grupo.add(peitoClaro);

    const rabo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), matPeloClaro);
    rabo.position.set(0, 0.36, 0.5);
    grupo.add(rabo);

    const cabeca = new THREE.Group();
    cabeca.position.set(0, 0.52, -0.42);
    const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), matPelo);
    craneo.castShadow = true;
    cabeca.add(craneo);
    // Bochechas: quebram a cabeça-esfera única e deixam o rosto mais expressivo
    [-0.15, 0.15].forEach(px => {
        const bochecha = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), matPeloClaro);
        bochecha.position.set(px, -0.05, -0.1);
        cabeca.add(bochecha);
    });
    const focinho = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.12), matPeloClaro);
    focinho.position.set(0, -0.02, -0.24);
    cabeca.add(focinho);
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), matNariz);
    nariz.position.set(0, 0.0, -0.31);
    cabeca.add(nariz);
    const parOlhosCoelho = criarParOlhos(0.12, 0.05, -0.14, 0.045, matOlho);
    cabeca.add(parOlhosCoelho.grupo);

    grupo.add(criarSombraContato(0.32));

    const orelhas = [];
    [-0.09, 0.09].forEach(px => {
        const pivotOrelha = new THREE.Group();
        pivotOrelha.position.set(px, 0.2, 0.02);
        // Orelha em bloco achatado (não cilindro redondo) — silhueta mais
        // limpa e "de jogo", com a parte interna rosada aparecendo por cima.
        const orelha = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.045), matPelo);
        orelha.position.y = 0.21;
        orelha.castShadow = true;
        pivotOrelha.add(orelha);
        const orelhaInterna = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.3, 0.01), matPeloClaro);
        orelhaInterna.position.set(0, 0.2, -0.024);
        pivotOrelha.add(orelhaInterna);
        cabeca.add(pivotOrelha);
        orelhas.push(pivotOrelha);
    });
    grupo.add(cabeca);

    // Pernas traseiras bem maiores que as dianteiras (pro pulo característico
    // do coelho), agora com patinhas em bloco na ponta
    const pernas = {};
    const traseiraEsq = criarMembroAnimal(0.38, 0.08, 0.12, matPelo, matPelo);
    traseiraEsq.position.set(-0.15, 0.32, 0.3);
    grupo.add(traseiraEsq); pernas.traseiraEsq = traseiraEsq;
    const traseiraDir = criarMembroAnimal(0.38, 0.08, 0.12, matPelo, matPelo);
    traseiraDir.position.set(0.15, 0.32, 0.3);
    grupo.add(traseiraDir); pernas.traseiraDir = traseiraDir;
    const dianteiraEsq = criarMembroAnimal(0.2, 0.045, 0.065, matPelo, matPelo);
    dianteiraEsq.position.set(-0.11, 0.27, -0.32);
    grupo.add(dianteiraEsq); pernas.dianteiraEsq = dianteiraEsq;
    const dianteiraDir = criarMembroAnimal(0.2, 0.045, 0.065, matPelo, matPelo);
    dianteiraDir.position.set(0.11, 0.27, -0.32);
    grupo.add(dianteiraDir); pernas.dianteiraDir = dianteiraDir;

    grupo.userData.cabeca = cabeca;
    grupo.userData.orelhas = orelhas;
    grupo.userData.pernas = pernas;
    grupo.userData.torso = tronco;
    grupo.userData.olhos = parOlhosCoelho.olhos;
    return grupo;
}

// Gera, num <canvas> fora da tela, uma textura procedural de pelagem: base
// sólida + centenas de manchinhas claras/escuras espalhadas (tipo ruído
// orgânico), simulando variação real de pelo em vez de uma cor chapada.
// É a única fauna do jogo que usa um bitmap de verdade como "map" do
// material (as outras usam só cor sólida) — dá um acabamento bem mais rico
// de perto, sem custar quase nada (é gerado 1x por cervo e reutilizado).
function criarTexturaPeloCervo(corBase) {
    const tam = 128;
    const canvas = document.createElement('canvas');
    canvas.width = tam; canvas.height = tam;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#' + corBase.getHexString();
    ctx.fillRect(0, 0, tam, tam);

    // Manchas grandes e suaves (variação tonal em áreas, tipo "nuvens" de pelo)
    for (let i = 0; i < 14; i++) {
        const x = Math.random() * tam, y = Math.random() * tam, r = 14 + Math.random() * 22;
        const claro = Math.random() < 0.5;
        const cor = corBase.clone().multiplyScalar(claro ? 1.12 + Math.random() * 0.15 : 0.8 + Math.random() * 0.1);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, '#' + cor.getHexString());
        grad.addColorStop(1, '#' + cor.getHexString() + '00');
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // Pontinhos finos (grão do pelo) — mistura de claros e escuros
    ctx.globalAlpha = 1;
    for (let i = 0; i < 900; i++) {
        const x = Math.random() * tam, y = Math.random() * tam;
        const claro = Math.random() < 0.5;
        const cor = corBase.clone().multiplyScalar(claro ? 1.25 + Math.random() * 0.3 : 0.62 + Math.random() * 0.15);
        ctx.fillStyle = '#' + cor.getHexString();
        ctx.globalAlpha = 0.18 + Math.random() * 0.22;
        ctx.fillRect(x, y, 1.4, 1.4);
    }

    // Pintas claras espalhadas na garupa/lombo, como filhotes de cervo real
    // (bem sutis num adulto — só uma "textura" a mais, não um padrão óbvio)
    ctx.globalAlpha = 0.5;
    const corPinta = corBase.clone().lerp(new THREE.Color(0xf3ead9), 0.65);
    ctx.fillStyle = '#' + corPinta.getHexString();
    for (let i = 0; i < 26; i++) {
        const x = 20 + Math.random() * (tam - 40), y = 20 + Math.random() * (tam - 40);
        ctx.beginPath(); ctx.arc(x, y, 1.6 + Math.random() * 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping; textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(2.5, 2.5);
    textura.needsUpdate = true;
    return textura;
}

// Segmento cilíndrico de chifre: pivô posicionado na base (ponto de encaixe),
// com a peça deslocada pra cima da metade do seu próprio comprimento — o
// mesmo truque de criarMembroAnimal, mas aplicado em cadeia aqui embaixo:
// qualquer filho colocado em (0, comprimento, 0) cai exatamente em cima da
// ponta deste segmento, então nada fica solto no ar.
function criarSegmentoChifre(comprimento, raioTopo, raioBase, material) {
    const pivot = new THREE.Group();
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(raioTopo, raioBase, comprimento, 5), material);
    seg.position.y = comprimento / 2;
    seg.castShadow = true;
    pivot.add(seg);
    return pivot;
}

// Mesma lógica do segmento acima, mas com uma ponta cônica (afina em direção
// à extremidade) — usado nos galhos que brotam da haste principal.
function criarPontaChifre(comprimento, raioBase, material) {
    const pivot = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(raioBase, comprimento, 5), material);
    cone.position.y = comprimento / 2;
    cone.castShadow = true;
    pivot.add(cone);
    return pivot;
}

// Constrói um lado da galhada (chifre) do cervo como uma cadeia de peças
// hierárquicas — cada haste/ponta é FILHA da peça anterior e presa
// exatamente na extremidade dela (não posicionada solta por coordenadas
// absolutas) — bem mais elaborado que os outros apêndices da fauna
// (orelhas/rabo), como pedido: é o "detalhe avançado" que dá presença ao
// cervo à distância, e sem nenhum pedaço flutuando fora do lugar.
// mirror = true espelha tudo pro lado esquerdo.
function criarGalhada(matChifre, mirror) {
    const grupo = new THREE.Group();
    const s = mirror ? -1 : 1;

    // Haste principal: sai da cabeça, angulando pra fora e pra cima
    const haste1 = criarSegmentoChifre(0.32, 0.03, 0.04, matChifre);
    haste1.position.set(s * 0.01, 0, 0);
    haste1.rotation.z = -s * 0.48;
    haste1.rotation.x = -0.15;
    grupo.add(haste1);

    // Segunda haste: encaixada exatamente na ponta da primeira (filha dela),
    // curvando mais pra trás/cima — dá a curvatura típica da galhada
    const haste2 = criarSegmentoChifre(0.28, 0.02, 0.028, matChifre);
    haste2.position.set(0, 0.32, 0);
    haste2.rotation.z = -s * 0.4;
    haste2.rotation.x = -0.3;
    haste1.add(haste2);

    // Pontas (galhos): brotam de pontos ao longo da segunda haste, cada uma
    // filha dela — como nascem sobre o próprio eixo da haste, encaixam
    // certinho na superfície, sem folga nem sobreposição estranha.
    const ponta1 = criarPontaChifre(0.15, 0.02, matChifre);
    ponta1.position.set(0, 0.1, 0);
    ponta1.rotation.z = -s * 0.9;
    ponta1.rotation.x = -0.25;
    haste2.add(ponta1);

    const ponta2 = criarPontaChifre(0.16, 0.018, matChifre);
    ponta2.position.set(0, 0.2, 0);
    ponta2.rotation.z = -s * 0.75;
    ponta2.rotation.x = -0.15;
    haste2.add(ponta2);

    // Ponta final: continua a partir da própria extremidade da segunda
    // haste, como a "coroa" no topo da galhada
    const pontaTopo = criarPontaChifre(0.18, 0.018, matChifre);
    pontaTopo.position.set(0, 0.28, 0);
    pontaTopo.rotation.z = -s * 0.3;
    pontaTopo.rotation.x = -0.55;
    haste2.add(pontaTopo);

    return grupo;
}

// --- 🦌 Cervo ---
// Corpo esguio e pernas longas e finas (bem diferentes do urso/lobo — silhueta
// alta e delicada), pescoço comprido erguendo a cabeça, galhada ramificada nos
// machos, "espelho" branco na garupa/rabo (como um cervo-do-pantanal/veado real)
// e pelagem com textura procedural (manchas + grão), em vez de cor chapada.
function criarModeloCervo() {
    const grupo = new THREE.Group();
    const tomBase = 0.06 + Math.random() * 0.03;
    const corPelo = new THREE.Color().setHSL(tomBase, 0.42, 0.36 + Math.random() * 0.08);
    const texturaPelo = criarTexturaPeloCervo(corPelo);

    const matPelo = new THREE.MeshStandardMaterial({ map: texturaPelo, roughness: 0.85, flatShading: true });
    const matPeloEscuro = new THREE.MeshStandardMaterial({ color: corPelo.clone().multiplyScalar(0.42), roughness: 0.9, flatShading: true });
    const matPeloClaro = new THREE.MeshStandardMaterial({ color: 0xf3ead9, roughness: 0.85, flatShading: true });
    const matCasco = new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.5 });
    const matNariz = new THREE.MeshStandardMaterial({ color: 0x161009, roughness: 0.55 });
    const matOlho = new THREE.MeshStandardMaterial({ color: 0x150d06, roughness: 0.3 });
    const matChifre = new THREE.MeshStandardMaterial({ color: 0xcbb694, roughness: 0.65 });

    // Garupa (traseira, arredondada e um pouco mais alta/cheia — típica do cervo)
    const garupa = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), matPelo);
    garupa.scale.set(0.36, 0.4, 0.5);
    garupa.position.set(0, 1.32, 0.62);
    garupa.castShadow = true;
    grupo.add(garupa);
    // "Espelho" claro na garupa (mancha branca característica sob o rabo)
    const espelho = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), matPeloClaro);
    espelho.position.set(0, 1.2, 0.98);
    grupo.add(espelho);

    // Torso central, esguio e reto
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.85), matPelo);
    torso.position.set(0, 1.32, 0.05);
    torso.castShadow = true;
    grupo.add(torso);

    // Peito/ombros — um pouco mais estreito, marca a base do pescoço
    const peito = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.4), matPelo);
    peito.position.set(0, 1.28, -0.5);
    peito.castShadow = true;
    grupo.add(peito);

    // Barriga clara — faixa fina embaixo do torso todo
    const barriga = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 1.1), matPeloClaro);
    barriga.position.set(0, 1.1, 0.1);
    grupo.add(barriga);

    // Pescoço: comprido e anguloso, ligando o peito à cabeça erguida —
    // é o que dá a postura alerta e elegante do cervo (nenhum outro bicho
    // do jogo tem essa peça).
    const pescoco = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 0.65, 7), matPelo);
    pescoco.position.set(0, 1.72, -0.915);
    pescoco.rotation.x = -0.75;
    pescoco.castShadow = true;
    grupo.add(pescoco);
    // Garganta clara, acompanhando o pescoço
    const garganta = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.46, 6), matPeloClaro);
    garganta.position.set(0, 1.66, -0.84);
    garganta.rotation.x = -0.75;
    grupo.add(garganta);

    // Cabeça (grupo próprio — gira sozinha na animação idle, no topo do pescoço)
    const cabeca = new THREE.Group();
    cabeca.position.set(0, 2.08, -1.28);
    const craneo = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.3), matPelo);
    craneo.castShadow = true;
    cabeca.add(craneo);
    // Focinho comprido e afunilado — silhueta de cervo, bem diferente do
    // focinho curto/quadrado do urso/lobo
    const focinho = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.36), matPelo);
    focinho.position.set(0, -0.06, -0.32);
    focinho.castShadow = true;
    cabeca.add(focinho);
    const pontaFocinho = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.1), matPeloEscuro);
    pontaFocinho.position.set(0, -0.08, -0.5);
    cabeca.add(pontaFocinho);
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), matNariz);
    nariz.position.set(0, -0.07, -0.56);
    cabeca.add(nariz);

    // Orelhas grandes, ovaladas e tombadas pros lados opostos (característica
    // marcante do cervo — bem abertas, quase caídas, e sempre alerta ao redor)
    const orelhas = [];
    [-0.11, 0.11].forEach(px => {
        const pivotOrelha = new THREE.Group();
        pivotOrelha.position.set(px, 0.07, 0);
        pivotOrelha.rotation.z = -Math.sign(px) * 1.05;
        const orelha = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), matPelo);
        orelha.scale.set(0.55, 1, 0.35);
        orelha.position.y = 0.13;
        orelha.castShadow = true;
        pivotOrelha.add(orelha);
        const orelhaInterna = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), matPeloEscuro);
        orelhaInterna.scale.set(0.5, 1, 0.25);
        orelhaInterna.position.set(0, 0.13, -0.035);
        pivotOrelha.add(orelhaInterna);
        cabeca.add(pivotOrelha);
        orelhas.push(pivotOrelha);
    });

    // Galhada: um par de chifres ramificados no topo da cabeça — o grande
    // "detalhe avançado" do cervo, dá presença mesmo de longe/silhueta
    const galhadaDir = criarGalhada(matChifre, false);
    galhadaDir.position.set(0.07, 0.1, 0.02);
    cabeca.add(galhadaDir);
    const galhadaEsq = criarGalhada(matChifre, true);
    galhadaEsq.position.set(-0.07, 0.1, 0.02);
    cabeca.add(galhadaEsq);

    const parOlhosCervo = criarParOlhos(0.1, 0.02, -0.1, 0.04, matOlho);
    cabeca.add(parOlhosCervo.grupo);
    grupo.add(cabeca);

    grupo.add(criarSombraContato(0.62));

    // Rabo curto, erguido, branco por baixo (como o "alarme" visual do cervo
    // fugindo — fica bem visível quando ele corre)
    const rabo = new THREE.Group();
    rabo.position.set(0, 1.45, 1.05);
    rabo.rotation.x = -0.3;
    const raboBase = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), matPelo);
    raboBase.position.y = -0.1;
    raboBase.rotation.x = Math.PI;
    raboBase.castShadow = true;
    rabo.add(raboBase);
    grupo.add(rabo);

    // Pernas: 4, longas e bem finas — a marca registrada do cervo (bem mais
    // esguias que as do lobo, e enormemente mais que as do urso), com casco
    // escuro em bloco na ponta em vez da "pata" das outras espécies
    const pernas = {};
    const posPernas = { dianteiraEsq: [-0.15, 1.28, -0.55], dianteiraDir: [0.15, 1.28, -0.55], traseiraEsq: [-0.17, 1.32, 0.6], traseiraDir: [0.17, 1.32, 0.6] };
    Object.keys(posPernas).forEach(nome => {
        const [px, py, pz] = posPernas[nome];
        const pivot = criarMembroAnimal(1.28, 0.045, 0.075, matPeloEscuro, matCasco);
        pivot.position.set(px, py, pz);
        grupo.add(pivot);
        pernas[nome] = pivot;
    });

    grupo.userData.cabeca = cabeca;
    grupo.userData.orelhas = orelhas;
    grupo.userData.pernas = pernas;
    grupo.userData.torso = torso;
    grupo.userData.rabo = rabo;
    grupo.userData.olhos = parOlhosCervo.olhos;
    return grupo;
}

// Gira "atual" em direção a "alvo" (radianos) pelo caminho mais curto, sem
// nunca passar de alvo — usado pra suavizar a virada dos animais.
function girarSuaveAngulo(atual, alvo, velRad, delta) {
    let diff = alvo - atual;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const maxPasso = velRad * delta;
    if (Math.abs(diff) <= maxPasso) return alvo;
    return atual + Math.sign(diff) * maxPasso;
}

// Checa se um animal bateria em algo (árvore, rocha, casa) se se movesse pro
// ponto (x, z). Ignora água (isso é checado à parte, via altura do terreno) e
// ignora outros animais (senão a IA de vagueio simples trava tentando
// desviar uns dos outros sem parar).
function colideAnimal(x, z, raio, dadosAnimal) {
    for (let i = 0; i < objetosMundo.length; i++) {
        const obj = objetosMundo[i];
        if (obj.dadosAnimalRef === dadosAnimal || obj.eAnimal) continue;

        if (obj.isCasaConstruida) {
            const dx = x - obj.x, dz = z - obj.z;
            const raioAprox = Math.max(obj.w, obj.d) / 2 + raio;
            if (dx * dx + dz * dz < raioAprox * raioAprox) return true;
        } else if (obj.isBox) {
            if (x > obj.minX - raio && x < obj.maxX + raio && z > obj.minZ - raio && z < obj.maxZ + raio) return true;
        } else {
            const dx = x - obj.x, dz = z - obj.z;
            const raioTotal = (obj.raio || 0.6) + raio;
            if (dx * dx + dz * dz < raioTotal * raioTotal) return true;
        }
    }
    return false;
}

// Cria e registra um animal no mundo (modelo 3D + colisor + dados de IA/animação).
function criarAnimal(tipo, x, z) {
    let grupo, velocidadeBase, raioColisao;
    if (tipo === 'urso') { grupo = criarModeloUrso(); velocidadeBase = 1.7; raioColisao = 1.25; }
    else if (tipo === 'lobo') { grupo = criarModeloLobo(); velocidadeBase = 2.7; raioColisao = 0.7; }
    else if (tipo === 'cervo') { grupo = criarModeloCervo(); velocidadeBase = 3.4; raioColisao = 0.85; }
    else { grupo = criarModeloCoelho(); velocidadeBase = 3.0; raioColisao = 0.35; }

    const escala = 0.9 + Math.random() * 0.25;
    grupo.scale.setScalar(escala);

    const h = obterAlturaTerreno(x, z);
    grupo.position.set(x, h, z);
    grupo.rotation.y = Math.random() * Math.PI * 2;
    cena.add(grupo);

    const colisor = { x: x, z: z, raio: raioColisao * escala, topoY: h + 2.2 * escala, eAnimal: true };
    objetosMundo.push(colisor);

    // Som de passos, preso ao próprio grupo 3D do bicho — o THREE.PositionalAudio
    // cuida sozinho de baixar o volume conforme o jogador se afasta.
    const somPasso = new THREE.PositionalAudio(ouvinteAudio);
    somPasso.setLoop(true);
    somPasso.setVolume(0.9);
    somPasso.setRefDistance(4.5);
    somPasso.setRolloffFactor(1.6);
    somPasso.setDistanceModel('exponential');
    grupo.add(somPasso);
    if (bufferPassoAnimal) somPasso.setBuffer(bufferPassoAnimal);
    else filaPositionalAnimais.push(somPasso);

    const dadosAnimal = {
        tipo, grupo, colisor, somPasso,
        origemX: x, origemZ: z,
        raioVagueio: tipo === 'coelho' ? 9 : (tipo === 'lobo' ? 18 : (tipo === 'cervo' ? 20 : 13)),
        raioColisao: raioColisao * escala,
        velocidadeMax: velocidadeBase * escala,
        velocidadeAtual: 0,
        direcaoY: grupo.rotation.y,
        estado: 'parado',
        tempoEstado: Math.random() * 4,
        alvoX: x, alvoZ: z,
        faseAndar: Math.random() * 10,
        faseIdle: Math.random() * 10,
        proxPiscar: 2 + Math.random() * 4,
        piscando: 0,
        faseAndarAnterior: 0
    };
    colisor.dadosAnimalRef = dadosAnimal;
    animaisNoMundo.push(dadosAnimal);
    return dadosAnimal;
}

// Tenta achar um ponto válido pra nascer um animal (longe do spawn do
// jogador/cabana, fora d'água); desiste depois de algumas tentativas pra
// nunca travar o carregamento do jogo.
function tentarSpawnAnimal(tipo) {
    for (let tentativas = 0; tentativas < 25; tentativas++) {
        const x = (Math.random() - 0.5) * 320;
        const z = (Math.random() - 0.5) * 320;
        if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;
        if (Math.abs(x - cabanaX) < 12 && Math.abs(z - cabanaZ) < 12) continue;
        if (obterAlturaTerreno(x, z) <= NIVEL_DA_AGUA + 0.5) continue;
        criarAnimal(tipo, x, z);
        return;
    }
}
for (let i = 0; i < 5; i++) tentarSpawnAnimal('urso');
for (let i = 0; i < 8; i++) tentarSpawnAnimal('lobo');
for (let i = 0; i < 16; i++) tentarSpawnAnimal('coelho');
for (let i = 0; i < 10; i++) tentarSpawnAnimal('cervo');

// --- Poeira dos passos ---
// Pool simples de discos que nascem no pé, sobem/expandem um pouco e somem.
// Reaproveita as mesmas instâncias (poolPoeira) em vez de criar/descartar
// geometria toda hora, pra não pesar com dezenas de animais andando.
const poolPoeira = [];
const POEIRA_MAX = 40;
const matPoeira = new THREE.MeshBasicMaterial({ color: 0xcbb98a, transparent: true, opacity: 0, depthWrite: false });
for (let i = 0; i < POEIRA_MAX; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.14, 6), matPoeira.clone());
    p.rotation.x = -Math.PI / 2;
    p.visible = false;
    p.userData.vida = 0;
    cena.add(p);
    poolPoeira.push(p);
}
function spawnPoeira(x, y, z, escala) {
    const p = poolPoeira.find(p => p.userData.vida <= 0);
    if (!p) return;
    p.position.set(x + (Math.random() - 0.5) * 0.15, y + 0.02, z + (Math.random() - 0.5) * 0.15);
    p.scale.setScalar(0.5 * escala);
    p.userData.vida = 0.55;
    p.userData.vidaTotal = 0.55;
    p.userData.escalaBase = escala;
    p.visible = true;
}
function atualizarPoeira(delta) {
    poolPoeira.forEach(p => {
        if (p.userData.vida <= 0) { if (p.visible) p.visible = false; return; }
        p.userData.vida -= delta;
        const t = 1 - p.userData.vida / p.userData.vidaTotal;
        p.scale.setScalar((0.5 + t * 0.9) * (p.userData.escalaBase || 1));
        p.material.opacity = 0.4 * (1 - t);
        if (p.userData.vida <= 0) p.visible = false;
    });
}

// Atualiza IA de vagueio + animação de todos os animais — chamada uma vez
// por frame de dentro de animar(). Cada bicho alterna entre "parado" (com
// uma animação idle de olhar em volta) e "andando" até um ponto aleatório
// dentro do seu raio de vagueio (sempre a partir de onde ele nasceu, pra não
// ficar migrando o mapa inteiro com o tempo).
function atualizarAnimais(delta) {
    animaisNoMundo.forEach(a => {
        a.faseIdle += delta;
        a.tempoEstado -= delta;

        if (a.tempoEstado <= 0) {
            if (a.estado === 'parado') {
                const ang = Math.random() * Math.PI * 2;
                const dist = 3 + Math.random() * (a.raioVagueio - 3);
                a.alvoX = a.origemX + Math.cos(ang) * dist;
                a.alvoZ = a.origemZ + Math.sin(ang) * dist;
                a.estado = 'andando';
                a.tempoEstado = 5 + Math.random() * 6;
            } else {
                a.estado = 'parado';
                a.tempoEstado = 2 + Math.random() * 5;
            }
        }

        let alturaChao = obterAlturaTerreno(a.grupo.position.x, a.grupo.position.z);

        if (a.estado === 'andando') {
            const dx = a.alvoX - a.grupo.position.x, dz = a.alvoZ - a.grupo.position.z;
            const distAlvo = Math.sqrt(dx * dx + dz * dz);

            if (distAlvo < 0.6) {
                a.estado = 'parado';
                a.tempoEstado = 2 + Math.random() * 5;
            } else {
                const anguloAlvo = Math.atan2(-dx, -dz);
                a.direcaoY = girarSuaveAngulo(a.direcaoY, anguloAlvo, 3.0, delta);
                a.velocidadeAtual = THREE.MathUtils.lerp(a.velocidadeAtual, a.velocidadeMax, 3 * delta);

                const novoX = a.grupo.position.x - Math.sin(a.direcaoY) * a.velocidadeAtual * delta;
                const novoZ = a.grupo.position.z - Math.cos(a.direcaoY) * a.velocidadeAtual * delta;
                const alturaNova = obterAlturaTerreno(novoX, novoZ);

                if (alturaNova > NIVEL_DA_AGUA + 0.4 && !colideAnimal(novoX, novoZ, a.raioColisao, a)) {
                    a.grupo.position.x = novoX;
                    a.grupo.position.z = novoZ;
                    alturaChao = alturaNova;
                } else {
                    a.tempoEstado = 0; // bateu em água/obstáculo: escolhe outro alvo já no próximo frame
                }
            }
        } else {
            a.velocidadeAtual = THREE.MathUtils.lerp(a.velocidadeAtual, 0, 6 * delta);
        }

        a.grupo.rotation.y = a.direcaoY;
        a.colisor.x = a.grupo.position.x;
        a.colisor.z = a.grupo.position.z;

        // --- Animação ---
        const pernas = a.grupo.userData.pernas;
        if (a.tipo === 'coelho') {
            // Pulo: o corpo inteiro sobe e desce, pernas traseiras (maiores)
            // flexionam mais que as dianteiras — imita o jeito de pular do coelho.
            a.faseAndar += delta * (a.velocidadeAtual * 2.6 + 0.001);
            const ciclo = a.estado === 'andando' ? (Math.sin(a.faseAndar) + 1) / 2 : 0;
            const salto = Math.pow(ciclo, 0.6);
            a.grupo.position.y = alturaChao + salto * 0.3 * a.grupo.scale.y;
            // Dispara poeira no instante em que o coelho "aterrissa" (salto cruzando perto de 0, descendo)
            if (a.estado === 'andando' && salto < 0.08 && a.faseAndarAnterior >= 0.08) {
                spawnPoeira(a.grupo.position.x, alturaChao, a.grupo.position.z, a.grupo.scale.x * 0.6);
            }
            a.faseAndarAnterior = salto;
            if (pernas) {
                const flexTras = -salto * 1.0, flexDianteira = -salto * 0.5;
                pernas.traseiraEsq.rotation.x = THREE.MathUtils.lerp(pernas.traseiraEsq.rotation.x, flexTras, 20 * delta);
                pernas.traseiraDir.rotation.x = THREE.MathUtils.lerp(pernas.traseiraDir.rotation.x, flexTras, 20 * delta);
                pernas.dianteiraEsq.rotation.x = THREE.MathUtils.lerp(pernas.dianteiraEsq.rotation.x, flexDianteira, 20 * delta);
                pernas.dianteiraDir.rotation.x = THREE.MathUtils.lerp(pernas.dianteiraDir.rotation.x, flexDianteira, 20 * delta);
            }
            if (a.grupo.userData.orelhas) {
                a.grupo.userData.orelhas.forEach((orelha, i) => {
                    orelha.rotation.x = Math.sin(a.faseIdle * 3 + i * 2) * 0.1 - salto * 0.3;
                });
            }
        } else {
            // Urso/lobo: passo em "trote diagonal" (pata dianteira-esquerda
            // junto com a traseira-direita, e vice-versa) — o jeito natural
            // como a maioria dos quadrúpedes anda.
            a.grupo.position.y = alturaChao;
            a.faseAndar += delta * (a.velocidadeAtual * 2.2 + 0.001);
            if (pernas) {
                if (a.estado === 'andando') {
                    const balanco = Math.sin(a.faseAndar) * 0.5;
                    pernas.dianteiraEsq.rotation.x = balanco;
                    pernas.traseiraDir.rotation.x = balanco;
                    pernas.dianteiraDir.rotation.x = -balanco;
                    pernas.traseiraEsq.rotation.x = -balanco;
                    // Cada vez que uma dupla diagonal de patas toca o chão (balanco cruza 0), solta poeira
                    if (Math.sign(balanco) !== Math.sign(a.faseAndarAnterior) && Math.abs(balanco) < 0.5) {
                        const ladoX = Math.cos(a.direcaoY) * 0.3, ladoZ = Math.sin(a.direcaoY) * 0.3;
                        spawnPoeira(a.grupo.position.x + ladoX, alturaChao, a.grupo.position.z + ladoZ, a.grupo.scale.x * (a.tipo === 'urso' ? 1.3 : (a.tipo === 'cervo' ? 0.65 : 0.8)));
                    }
                    a.faseAndarAnterior = balanco;
                } else {
                    Object.values(pernas).forEach(p => { p.rotation.x = THREE.MathUtils.lerp(p.rotation.x, 0, 6 * delta); });
                }
            }
            // Orelhas sempre em leve alerta, girando devagar pra "escutar" ao
            // redor — só o cervo tem esse tique (reforça o ar arisco do bicho)
            if (a.tipo === 'cervo' && a.grupo.userData.orelhas) {
                a.grupo.userData.orelhas.forEach((orelha, i) => {
                    orelha.rotation.x = Math.sin(a.faseIdle * 1.6 + i * 2.4) * 0.22;
                });
            }
        }

        // Cabeça "olhando ao redor" sozinha — mais perceptível parado, sutil andando
        if (a.grupo.userData.cabeca) {
            const amplitude = a.estado === 'parado' ? 0.4 : 0.1;
            a.grupo.userData.cabeca.rotation.y = Math.sin(a.faseIdle * 0.6 + a.origemX) * amplitude;
        }

        // Respiração: leve pulso de escala no torso, mais visível parado que andando
        if (a.grupo.userData.torso) {
            const ampRespira = a.estado === 'parado' ? 0.02 : 0.008;
            a.grupo.userData.torso.scale.y = 1 + Math.sin(a.faseIdle * 2.2) * ampRespira;
        }

        // Piscar: escala os olhos quase a zero no eixo Y por uma fração de segundo,
        // em intervalos aleatórios — detalhe pequeno mas dá muita vida ao parado.
        if (a.grupo.userData.olhos) {
            if (a.piscando > 0) {
                a.piscando -= delta;
                const fecho = a.piscando > 0 ? Math.max(0.05, Math.abs(Math.sin((a.piscando / 0.12) * Math.PI))) : 1;
                a.grupo.userData.olhos.forEach(o => o.scale.y = fecho);
                if (a.piscando <= 0) a.grupo.userData.olhos.forEach(o => o.scale.y = 1);
            } else {
                a.proxPiscar -= delta;
                if (a.proxPiscar <= 0) {
                    a.piscando = 0.12;
                    a.proxPiscar = 2.5 + Math.random() * 4.5;
                }
            }
        }

        // Rabo balançando — mais rápido andando, suave e lento parado
        if (a.grupo.userData.rabo) {
            const velBalanco = a.estado === 'andando' ? 6 : 1.4;
            const ampBalanco = a.estado === 'andando' ? 0.22 : 0.1;
            a.grupo.userData.rabo.rotation.z = Math.sin(a.faseIdle * velBalanco) * ampBalanco;
        }

        // Som de passos: só toca enquanto o bicho está de fato andando E o
        // jogador está relativamente perto — evita tocar dezenas de sons ao
        // mesmo tempo pro mapa inteiro (o PositionalAudio já reduz o volume
        // sozinho com a distância, mas aqui a gente nem liga o som se não
        // precisar).
        if (a.somPasso && a.somPasso.buffer) {
            const posJogador = obterAncoraCamera();
            const dxJogador = posJogador.x - a.grupo.position.x, dzJogador = posJogador.z - a.grupo.position.z;
            const pertoDoJogador = (dxJogador * dxJogador + dzJogador * dzJogador) < 400; // ~20 metros
            const andandoDeVerdade = a.estado === 'andando' && a.velocidadeAtual > 0.15;
            if (andandoDeVerdade && pertoDoJogador) {
                if (!a.somPasso.isPlaying) a.somPasso.play();
            } else if (a.somPasso.isPlaying) {
                a.somPasso.stop();
            }
        }
    });
    atualizarPoeira(delta);
}

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
    lareira: { largura: 1.7, profundidade: 0.8, altura: 1.7 },
    // Produtos comprados no computador
    carro: { largura: 2.2, profundidade: 4.6, altura: 1.6 },
    tv: { largura: 1.1, profundidade: 0.5, altura: 1.3 }
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
    distanciaExtraColocacao = 0;
    hologramaVisual.visible = false;
    cena.add(hologramaVisual);
}

function desativarHolograma() { if (hologramaVisual) { cena.remove(hologramaVisual); hologramaVisual = null; } }

// Soma "delta" à distância extra de colocação (roda do mouse no PC, botões
// ➖/➕ no celular), sempre travada entre 0 e DISTANCIA_MAX_EXTRA_COLOCACAO.
function ajustarDistanciaColocacao(delta) {
    if (!modoConstrucaoAtivo) return;
    distanciaExtraColocacao = THREE.MathUtils.clamp(distanciaExtraColocacao + delta, 0, DISTANCIA_MAX_EXTRA_COLOCACAO);
}

// Roda do mouse (PC): girar "pra frente" (deltaY > 0) empurra a construção
// pra mais longe; girar "pra trás" traz de volta pra mais perto.
window.addEventListener('wheel', (e) => {
    if (!modoConstrucaoAtivo) return;
    e.preventDefault();
    ajustarDistanciaColocacao(e.deltaY > 0 ? PASSO_DISTANCIA_COLOCACAO : -PASSO_DISTANCIA_COLOCACAO);
}, { passive: false });

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
    // CORREÇÃO (travada/lag ao construir): PointLight com sombra é o tipo mais
    // caro de luz no Three.js (renderiza a cena 6x pra montar o cubemap de
    // sombra) e a primeira compilação do shader trava o frame. Fogueira e
    // lareira usam a mesma PointLight só que SEM sombra — a tocha agora segue
    // o mesmo padrão.
    const luzTocha = new THREE.PointLight(0xff9900, 1.5, 12);
    luzTocha.position.y = 1.5;
    grupoTocha.add(luzTocha);

    // Posiciona o conjunto inteiro no mapa
    grupoTocha.position.set(posX, posY, posZ);
    cena.add(grupoTocha);

    // CORREÇÃO (tocha não sumia ao demolir): antes só o "bastao" (filho do
    // grupo) era registrado aqui. demolirConstrucao() chama cena.remove()
    // nesse objeto, mas como o bastão não é filho direto da cena (é filho de
    // grupoTocha), o remove não fazia nada — a tocha inteira ficava presa no
    // mundo pra sempre, mesmo com o item voltando certinho pro inventário.
    // Agora registramos o GRUPO inteiro, igual às outras construções.
    objetosRaycast.push(grupoTocha);
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

// ============================================================
// MODELO 3D: CARRO (produto comprado no computador)
// ============================================================
// Convenção deste modelo: o "nariz" do carro (capô/faróis) fica no eixo -Z
// local, e o "porta-malas" (lanternas) no eixo +Z local — igual à convenção
// de "frente" que o resto do jogo já usa pra direção da câmera/jogador, o
// que facilita a matemática de movimento em atualizarDirecaoCarro().
// "corHex" (opcional, ex: "#dc2626") é a cor escolhida pelo jogador na
// paleta da loja ao comprar; se não vier nenhuma, sorteia uma cor aleatória.
function criarModeloCarro(corHex) {
    const grupo = new THREE.Group();

    const corCarroceria = corHex ? new THREE.Color(corHex) : new THREE.Color().setHSL(Math.random(), 0.55, 0.42);
    const matCarroceria = new THREE.MeshStandardMaterial({ color: corCarroceria, roughness: 0.35, metalness: 0.55 });
    const matVidro = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.75 });
    const matPneu = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const matAro = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.4, metalness: 0.7 });
    const matFarol = new THREE.MeshStandardMaterial({ color: 0xfff8dc, emissive: 0xfff8dc, emissiveIntensity: 0.6 });
    const matLanterna = new THREE.MeshStandardMaterial({ color: 0xb91c1c, emissive: 0x7f1d1d, emissiveIntensity: 0.5 });
    const matParachoque = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.3 });

    // Chassi/carroceria principal
    const chassi = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 4.2), matCarroceria);
    chassi.position.y = 0.62;
    grupo.add(chassi);

    // Cabine (parte de cima, mais estreita e puxada pro centro/traseira)
    const cabine = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), matCarroceria);
    cabine.position.set(0, 1.14, 0.15);
    grupo.add(cabine);

    // Para-brisa dianteiro (inclinado)
    const paraBrisa = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 0.08), matVidro);
    paraBrisa.position.set(0, 1.12, -0.88);
    paraBrisa.rotation.x = 0.35;
    grupo.add(paraBrisa);

    // Vidro traseiro
    const vidroTraseiro = paraBrisa.clone();
    vidroTraseiro.position.set(0, 1.12, 1.2);
    vidroTraseiro.rotation.x = -0.35;
    grupo.add(vidroTraseiro);

    // Vidros laterais
    [-0.86, 0.86].forEach(px => {
        const vidroLat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 1.7), matVidro);
        vidroLat.position.set(px, 1.14, 0.15);
        grupo.add(vidroLat);
    });

    // Capô frontal (nariz, -Z)
    const capo = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.1), matCarroceria);
    capo.position.set(0, 0.98, -1.55);
    grupo.add(capo);

    // Para-choques
    const paraChoqueFrente = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.28, 0.25), matParachoque);
    paraChoqueFrente.position.set(0, 0.5, -2.05);
    grupo.add(paraChoqueFrente);
    const paraChoqueTras = paraChoqueFrente.clone();
    paraChoqueTras.position.set(0, 0.5, 2.05);
    grupo.add(paraChoqueTras);

    // Faróis (frente, -Z) — a caixinha emissiva (visual) + uma luz de verdade
    // (SpotLight) que ilumina o caminho à frente, ligada/desligada com F.
    // Começa desligada (intensity 0); ver alternarFaroisCarro().
    const luzesFarol = [];
    [-0.7, 0.7].forEach(px => {
        const farol = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), matFarol);
        farol.position.set(px, 0.68, -2.08);
        grupo.add(farol);

        const luzFarol = new THREE.SpotLight(0xfff4d6, 0, 26, Math.PI / 6.5, 0.45, 1.3);
        luzFarol.position.set(px, 0.68, -2.08);
        luzFarol.castShadow = false;
        grupo.add(luzFarol);

        // Alvo do foco de luz: um ponto bem à frente do carro (eixo -Z local),
        // filho do grupo pra acompanhar posição/rotação do carro automaticamente.
        const alvoFarol = new THREE.Object3D();
        alvoFarol.position.set(px * 0.35, 0.1, -14);
        grupo.add(alvoFarol);
        luzFarol.target = alvoFarol;

        luzesFarol.push(luzFarol);
    });
    grupo.userData.luzesFarol = luzesFarol;
    grupo.userData.matFarol = matFarol;
    grupo.userData.farolLigado = false;

    // Lanternas traseiras (+Z)
    [-0.7, 0.7].forEach(px => {
        const lanterna = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), matLanterna);
        lanterna.position.set(px, 0.68, 2.08);
        grupo.add(lanterna);
    });

    // Rodas: cada uma é um grupo (permite "esterçar" as da frente) contendo o
    // pneu (girado 90° UMA vez com rotateZ, pra deitar o cilindro de lado) e o
    // aro como filho do pneu (herda a orientação, gira junto automaticamente).
    const rodasGirando = [];
    const rodasDianteiras = [];
    [[-1.02, -1.35], [1.02, -1.35], [-1.02, 1.35], [1.02, 1.35]].forEach(([px, pz]) => {
        const grupoRoda = new THREE.Group();

        const pneu = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 16), matPneu);
        pneu.rotateZ(Math.PI / 2);
        grupoRoda.add(pneu);

        const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 12), matAro);
        pneu.add(aro); // filho do pneu: gira junto quando o pneu rola

        grupoRoda.position.set(px, 0.44, pz);
        grupo.add(grupoRoda);

        rodasGirando.push(pneu);
        if (pz < 0) rodasDianteiras.push(grupoRoda); // rodas da frente esterçam ao virar
    });

    grupo.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });

    grupo.userData.rodasGirando = rodasGirando;
    grupo.userData.rodasDianteiras = rodasDianteiras;

    return grupo;
}

// ============================================================
// MODELO 3D: TELEVISÃO (produto comprado no computador)
// ============================================================
// Um rack baixo de madeira + a TV em pé sobre ele, com a "tela" de frente
// pro eixo -Z local (mesma convenção do carro: nariz/frente em -Z), pra
// combinar com a rotação escolhida no holograma na hora de posicionar.
function criarModeloTV() {
    const grupo = new THREE.Group();

    const matRack = new THREE.MeshStandardMaterial({ color: 0x4b2f1d, roughness: 0.7, metalness: 0.1 });
    const matCorpoTV = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4, metalness: 0.5 });
    const matTela = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.25, metalness: 0.1, emissive: 0x1e293b, emissiveIntensity: 0.25 });
    const matPe = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.4 });

    // Rack/mesa baixa
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.42), matRack);
    rack.position.y = 0.25;
    grupo.add(rack);
    [[-0.42, -0.15], [0.42, -0.15], [-0.42, 0.15], [0.42, 0.15]].forEach(([px, pz]) => {
        const perna = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), matRack);
        perna.position.set(px, -0.25, pz);
        rack.add(perna);
    });

    // Pé/suporte da TV
    const pe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.14), matPe);
    pe.position.set(0, 0.54, -0.05);
    grupo.add(pe);
    const haste = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), matPe);
    haste.position.set(0, 0.62, -0.05);
    grupo.add(haste);

    // Corpo da TV (moldura) + tela
    const corpoTV = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.06), matCorpoTV);
    corpoTV.position.set(0, 0.98, -0.08);
    grupo.add(corpoTV);
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.52), matTela);
    tela.position.set(0, 0.98, -0.111);
    grupo.add(tela);

    grupo.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
    grupo.userData.matTela = matTela; // pra dar aquele "brilho" na tela quando algum filme está tocando

    return grupo;
}

// Abre o menu de minigames da TV (tecla E perto dela). Mostra a grade de
// cards montada a partir do array MINIGAMES lá em cima.
function abrirMenuTV() {
    if (menuTVAberto || menuCraftingAberto || menuLojaAberto || dirigindoCarro) return;

    menuTVAberto = true;
    renderizarGradeJogos();
    if (menuTV) menuTV.style.display = 'block';
    pararSonsDeMovimento();
    if (!ehTouch && controles) controles.unlock();
}

// Fecha tudo relacionado à TV (grade de jogos + minigame ativo, se estiver aberto).
function fecharMenuTV() {
    fecharJogo();
    if (menuTV) menuTV.style.display = 'none';
    menuTVAberto = false;
    if (!ehTouch && controles) controles.lock();
}

// Monta os cards de minigame dinamicamente a partir do array MINIGAMES.
function renderizarGradeJogos() {
    const grade = document.getElementById('tv-grid');
    if (!grade) return;
    grade.innerHTML = '';

    MINIGAMES.forEach((jogo, indice) => {
        const card = document.createElement('div');
        card.className = 'tv-card';
        card.innerHTML =
            '<div class="tv-card-capa">' + jogo.emoji + '</div>' +
            '<div class="tv-card-titulo">' + jogo.titulo + '</div>' +
            '<div class="tv-card-descricao">' + jogo.descricao + '</div>';
        card.addEventListener('click', () => abrirJogo(indice));
        grade.appendChild(card);
    });
}

// Função de limpeza do minigame atualmente aberto (cancela intervalos/
// listeners próprios dele). Fica null quando nenhum jogo está rodando.
let pararJogoAtual = null;

// Abre o minigame escolhido (sobrepõe a grade de jogos).
function abrirJogo(indice) {
    const jogo = MINIGAMES[indice];
    const area = document.getElementById('tv-jogo-area');
    if (!jogo || !area) return;

    fecharJogo(); // por garantia, encerra qualquer jogo anterior antes de abrir outro

    const tituloEl = document.getElementById('tv-jogo-titulo');
    if (tituloEl) tituloEl.innerText = jogo.titulo;

    area.innerHTML = '';
    pararJogoAtual = jogo.iniciar(area) || null;

    if (menuTVVideo) menuTVVideo.style.display = 'block';
}

// Fecha só o minigame ativo (cancelando seus intervalos/listeners) e volta
// pra grade de jogos — usado tanto pelo botão "Voltar" quanto ao fechar a
// TV inteira.
function fecharJogo() {
    if (typeof pararJogoAtual === 'function') pararJogoAtual();
    pararJogoAtual = null;

    const area = document.getElementById('tv-jogo-area');
    if (area) area.innerHTML = '';
    if (menuTVVideo) menuTVVideo.style.display = 'none';
}

// ============================================================
// MINIGAMES DA TV — implementações
// ============================================================
// Cada função recebe o <div> container (já vazio) onde deve montar sua UI,
// e retorna uma função "parar" que cancela qualquer setInterval/
// requestAnimationFrame e remove os listeners que essa função criou. Isso é
// chamado automaticamente por fecharJogo()/abrirJogo() pra nenhum jogo
// continuar rodando (ou vazando memória) depois que o jogador sai da TV.

// --- 🐍 Cobrinha ---
function iniciarJogoCobrinha(container) {
    container.innerHTML =
        '<div class="jogo-status" id="cobrinha-status">Pontos: 0</div>' +
        '<canvas id="cobrinha-canvas" width="342" height="342" class="mini-jogo-canvas"></canvas>' +
        '<div class="jogo-dica">Use as setas ou WASD pra mover • clique no jogo pra reiniciar depois de perder</div>';

    const canvas = container.querySelector('#cobrinha-canvas');
    const ctx = canvas.getContext('2d');
    const statusEl = container.querySelector('#cobrinha-status');
    const tam = 18;
    const colunas = Math.floor(canvas.width / tam);

    let cobra, direcao, proxDirecao, comida, pontos, vivo, intervaloId;

    function posicionarComida() {
        do {
            comida = { x: Math.floor(Math.random() * colunas), y: Math.floor(Math.random() * colunas) };
        } while (cobra.some(s => s.x === comida.x && s.y === comida.y));
    }
    function atualizarStatus() {
        statusEl.innerText = vivo ? ('Pontos: ' + pontos) : ('Fim de jogo! Pontos: ' + pontos + ' — clique pra reiniciar');
    }
    function desenhar() {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(comida.x * tam, comida.y * tam, tam - 2, tam - 2);
        cobra.forEach((s, i) => {
            ctx.fillStyle = i === 0 ? '#4ade80' : '#22c55e';
            ctx.fillRect(s.x * tam, s.y * tam, tam - 2, tam - 2);
        });
    }
    function reiniciar() {
        cobra = [{ x: 8, y: 8 }];
        direcao = { x: 1, y: 0 };
        proxDirecao = { x: 1, y: 0 };
        pontos = 0;
        vivo = true;
        posicionarComida();
        atualizarStatus();
        desenhar();
    }
    function passo() {
        if (!vivo) return;
        direcao = proxDirecao;
        const cabeca = { x: cobra[0].x + direcao.x, y: cobra[0].y + direcao.y };
        const bateu = cabeca.x < 0 || cabeca.x >= colunas || cabeca.y < 0 || cabeca.y >= colunas ||
            cobra.some(s => s.x === cabeca.x && s.y === cabeca.y);
        if (bateu) { vivo = false; atualizarStatus(); return; }

        cobra.unshift(cabeca);
        if (cabeca.x === comida.x && cabeca.y === comida.y) {
            pontos++; posicionarComida(); atualizarStatus();
        } else {
            cobra.pop();
        }
        desenhar();
    }
    function aoTeclar(e) {
        const mapa = {
            ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
            KeyW: { x: 0, y: -1 }, KeyS: { x: 0, y: 1 }, KeyA: { x: -1, y: 0 }, KeyD: { x: 1, y: 0 }
        };
        const nova = mapa[e.code];
        if (!nova) return;
        e.preventDefault();
        if (nova.x === -direcao.x && nova.y === -direcao.y) return; // não deixa virar 180° de uma vez
        proxDirecao = nova;
    }
    function aoClicar() { if (!vivo) reiniciar(); }

    document.addEventListener('keydown', aoTeclar);
    canvas.addEventListener('click', aoClicar);

    reiniciar();
    intervaloId = setInterval(passo, 130);

    return function parar() {
        clearInterval(intervaloId);
        document.removeEventListener('keydown', aoTeclar);
        canvas.removeEventListener('click', aoClicar);
    };
}

// --- ❌⭕ Jogo da Velha (2 jogadores, mesmo dispositivo) ---
function iniciarJogoVelha(container) {
    container.innerHTML =
        '<div class="jogo-status" id="velha-status">Vez de: ❌</div>' +
        '<div class="velha-grid" id="velha-grid"></div>' +
        '<button class="jogo-btn-reiniciar" id="velha-reiniciar">🔄 Reiniciar</button>';

    const grid = container.querySelector('#velha-grid');
    const statusEl = container.querySelector('#velha-status');
    const LINHAS_VITORIA = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

    let tabuleiro, vez, fimDeJogo;

    function checarVitoria() {
        for (const [a, b, c] of LINHAS_VITORIA) {
            if (tabuleiro[a] && tabuleiro[a] === tabuleiro[b] && tabuleiro[a] === tabuleiro[c]) return tabuleiro[a];
        }
        return tabuleiro.every(v => v) ? 'empate' : null;
    }
    function desenhar() {
        grid.innerHTML = '';
        tabuleiro.forEach((valor, indice) => {
            const cel = document.createElement('div');
            cel.className = 'velha-celula';
            cel.innerText = valor === 'X' ? '❌' : valor === 'O' ? '⭕' : '';
            cel.addEventListener('click', () => jogar(indice));
            grid.appendChild(cel);
        });
    }
    function jogar(indice) {
        if (fimDeJogo || tabuleiro[indice]) return;
        tabuleiro[indice] = vez;
        const resultado = checarVitoria();
        desenhar();
        if (resultado === 'empate') {
            fimDeJogo = true; statusEl.innerText = 'Empate! Clique em Reiniciar';
        } else if (resultado) {
            fimDeJogo = true; statusEl.innerText = (resultado === 'X' ? '❌' : '⭕') + ' venceu! Clique em Reiniciar';
        } else {
            vez = vez === 'X' ? 'O' : 'X';
            statusEl.innerText = 'Vez de: ' + (vez === 'X' ? '❌' : '⭕');
        }
    }
    function reiniciar() {
        tabuleiro = Array(9).fill(null);
        vez = 'X';
        fimDeJogo = false;
        statusEl.innerText = 'Vez de: ❌';
        desenhar();
    }

    container.querySelector('#velha-reiniciar').addEventListener('click', reiniciar);
    reiniciar();

    return function parar() { /* sem timers/listeners globais pra limpar aqui */ };
}

// --- 🧠 Jogo da Memória (achar os pares) ---
function iniciarJogoMemoria(container) {
    container.innerHTML =
        '<div class="jogo-status" id="memoria-status">Jogadas: 0</div>' +
        '<div class="memoria-grid" id="memoria-grid"></div>' +
        '<button class="jogo-btn-reiniciar" id="memoria-reiniciar">🔄 Reiniciar</button>';

    const grid = container.querySelector('#memoria-grid');
    const statusEl = container.querySelector('#memoria-status');
    const EMOJIS = ['🍎', '🍌', '🍇', '🍉', '🍕', '🎈', '⚽', '🚀'];

    let cartas, viradas, combinadas, jogadas, travado, timeoutId;

    function embaralhar(lista) {
        for (let i = lista.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lista[i], lista[j]] = [lista[j], lista[i]];
        }
        return lista;
    }
    function desenhar() {
        grid.innerHTML = '';
        cartas.forEach((emoji, indice) => {
            const virada = viradas.includes(indice) || combinadas.includes(indice);
            const carta = document.createElement('div');
            carta.className = 'memoria-carta' + (virada ? ' virada' : '');
            carta.innerText = virada ? emoji : '❓';
            carta.addEventListener('click', () => virar(indice));
            grid.appendChild(carta);
        });
    }
    function virar(indice) {
        if (travado || viradas.includes(indice) || combinadas.includes(indice)) return;
        viradas.push(indice);
        desenhar();
        if (viradas.length < 2) return;

        jogadas++;
        statusEl.innerText = 'Jogadas: ' + jogadas;
        travado = true;
        const [i1, i2] = viradas;
        if (cartas[i1] === cartas[i2]) {
            combinadas.push(i1, i2);
            viradas = [];
            travado = false;
            desenhar();
            if (combinadas.length === cartas.length) {
                statusEl.innerText = '🎉 Você venceu em ' + jogadas + ' jogadas!';
            }
        } else {
            timeoutId = setTimeout(() => {
                viradas = [];
                travado = false;
                desenhar();
            }, 800);
        }
    }
    function reiniciar() {
        cartas = embaralhar([...EMOJIS, ...EMOJIS]);
        viradas = []; combinadas = []; jogadas = 0; travado = false;
        if (timeoutId) clearTimeout(timeoutId);
        statusEl.innerText = 'Jogadas: 0';
        desenhar();
    }

    container.querySelector('#memoria-reiniciar').addEventListener('click', reiniciar);
    reiniciar();

    return function parar() { if (timeoutId) clearTimeout(timeoutId); };
}

// --- 🏓 Pong (contra uma IA simples) ---
function iniciarJogoPong(container) {
    container.innerHTML =
        '<div class="jogo-status" id="pong-status">Você: 0  x  CPU: 0</div>' +
        '<canvas id="pong-canvas" width="460" height="280" class="mini-jogo-canvas"></canvas>' +
        '<div class="jogo-dica">Mova o mouse sobre o jogo ou use W/S pra controlar sua raquete</div>';

    const canvas = container.querySelector('#pong-canvas');
    const ctx = canvas.getContext('2d');
    const statusEl = container.querySelector('#pong-status');
    const alturaRaquete = 58, larguraRaquete = 10;

    let raqueteJogador = canvas.height / 2 - alturaRaquete / 2;
    let raqueteCPU = canvas.height / 2 - alturaRaquete / 2;
    let bola = { x: canvas.width / 2, y: canvas.height / 2, vx: 4, vy: 3 };
    let placarJogador = 0, placarCPU = 0;
    let teclas = { cima: false, baixo: false };
    let rodando = true;

    function reiniciarBola() {
        bola.x = canvas.width / 2; bola.y = canvas.height / 2;
        bola.vx = (Math.random() > 0.5 ? 4 : -4);
        bola.vy = (Math.random() * 4 - 2);
    }
    function desenhar() {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(6, raqueteJogador, larguraRaquete, alturaRaquete);
        ctx.fillRect(canvas.width - larguraRaquete - 6, raqueteCPU, larguraRaquete, alturaRaquete);
        ctx.beginPath(); ctx.arc(bola.x, bola.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    function passo() {
        if (!rodando) return;

        if (teclas.cima) raqueteJogador = Math.max(raqueteJogador - 6, 0);
        if (teclas.baixo) raqueteJogador = Math.min(raqueteJogador + 6, canvas.height - alturaRaquete);

        const centroCPU = raqueteCPU + alturaRaquete / 2;
        if (centroCPU < bola.y - 10) raqueteCPU += 3.4;
        else if (centroCPU > bola.y + 10) raqueteCPU -= 3.4;
        raqueteCPU = Math.min(Math.max(raqueteCPU, 0), canvas.height - alturaRaquete);

        bola.x += bola.vx; bola.y += bola.vy;
        if (bola.y <= 0 || bola.y >= canvas.height) bola.vy *= -1;

        if (bola.x <= larguraRaquete + 6 && bola.x > 0 && bola.y >= raqueteJogador && bola.y <= raqueteJogador + alturaRaquete) {
            bola.vx = Math.abs(bola.vx) * 1.04;
            bola.vy += (Math.random() * 2 - 1);
        }
        if (bola.x >= canvas.width - larguraRaquete - 6 && bola.x < canvas.width && bola.y >= raqueteCPU && bola.y <= raqueteCPU + alturaRaquete) {
            bola.vx = -Math.abs(bola.vx) * 1.04;
            bola.vy += (Math.random() * 2 - 1);
        }

        if (bola.x < 0) { placarCPU++; atualizarStatus(); reiniciarBola(); }
        if (bola.x > canvas.width) { placarJogador++; atualizarStatus(); reiniciarBola(); }

        desenhar();
        requestAnimationFrame(passo);
    }
    function atualizarStatus() { statusEl.innerText = 'Você: ' + placarJogador + '  x  CPU: ' + placarCPU; }
    function aoMoverMouse(e) {
        const retangulo = canvas.getBoundingClientRect();
        const y = e.clientY - retangulo.top;
        raqueteJogador = Math.min(Math.max(y - alturaRaquete / 2, 0), canvas.height - alturaRaquete);
    }
    function aoTeclar(e) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') { teclas.cima = true; e.preventDefault(); }
        if (e.code === 'KeyS' || e.code === 'ArrowDown') { teclas.baixo = true; e.preventDefault(); }
    }
    function aoSoltarTecla(e) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') teclas.cima = false;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') teclas.baixo = false;
    }

    canvas.addEventListener('mousemove', aoMoverMouse);
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('keyup', aoSoltarTecla);

    atualizarStatus();
    desenhar();
    requestAnimationFrame(passo);

    return function parar() {
        rodando = false;
        canvas.removeEventListener('mousemove', aoMoverMouse);
        document.removeEventListener('keydown', aoTeclar);
        document.removeEventListener('keyup', aoSoltarTecla);
    };
}

// --- ⚡ Reflexo (clique rápido, 30 segundos) ---
function iniciarJogoReflexo(container) {
    container.innerHTML =
        '<div class="jogo-status" id="reflexo-status">Clique em "Começar" pra jogar!</div>' +
        '<div class="reflexo-grid" id="reflexo-grid"></div>' +
        '<button class="jogo-btn-reiniciar" id="reflexo-comecar">▶ Começar (30s)</button>';

    const grid = container.querySelector('#reflexo-grid');
    const statusEl = container.querySelector('#reflexo-status');
    const TOTAL_CELULAS = 9;

    let pontos, celulaAtiva = -1, intervaloAlvo, intervaloRelogio, tempoRestante, jogando;

    function desenharGrid() {
        grid.innerHTML = '';
        for (let i = 0; i < TOTAL_CELULAS; i++) {
            const cel = document.createElement('div');
            cel.className = 'reflexo-celula' + (i === celulaAtiva ? ' ativa' : '');
            cel.innerText = i === celulaAtiva ? '🎯' : '';
            cel.addEventListener('click', () => acertar(i));
            grid.appendChild(cel);
        }
    }
    function novoAlvo() {
        celulaAtiva = Math.floor(Math.random() * TOTAL_CELULAS);
        desenharGrid();
    }
    function acertar(indice) {
        if (!jogando || indice !== celulaAtiva) return;
        pontos++;
        statusEl.innerText = 'Pontos: ' + pontos + '  |  Tempo: ' + tempoRestante + 's';
        novoAlvo();
    }
    function terminar() {
        jogando = false;
        clearInterval(intervaloAlvo);
        clearInterval(intervaloRelogio);
        celulaAtiva = -1;
        desenharGrid();
        statusEl.innerText = '⏱️ Tempo esgotado! Pontuação final: ' + pontos;
    }
    function comecar() {
        pontos = 0; tempoRestante = 30; jogando = true;
        statusEl.innerText = 'Pontos: 0  |  Tempo: 30s';
        novoAlvo();
        intervaloAlvo = setInterval(novoAlvo, 900);
        intervaloRelogio = setInterval(() => {
            tempoRestante--;
            if (tempoRestante <= 0) { terminar(); return; }
            statusEl.innerText = 'Pontos: ' + pontos + '  |  Tempo: ' + tempoRestante + 's';
        }, 1000);
    }

    desenharGrid();
    container.querySelector('#reflexo-comecar').addEventListener('click', comecar);

    return function parar() {
        clearInterval(intervaloAlvo);
        clearInterval(intervaloRelogio);
    };
}

// Retorna o objeto cuja ".position" representa a posição real do jogador no
// mundo — muda dependendo se é celular (cameraContainer) ou PC (a própria
// câmera, via PointerLockControls.getObject()). Ver comentários lá em cima
// sobre a diferença entre os dois sistemas de câmera.
function obterAncoraCamera() {
    return ehTouch ? cameraContainer.position : controles.getObject().position;
}

// Entra no carro: o jogador passa a "ser" o carro (WASD dirige, câmera fica
// dentro dele) até apertar E de novo. A posição de antes de entrar é guardada
// só por segurança/depuração (não usada pra restaurar — ao sair, o jogador
// aparece do lado do carro, ver sairDoCarro).
function entrarNoCarro(dadosCarro) {
    if (dirigindoCarro || menuCraftingAberto || menuLojaAberto || menuTVAberto) return;

    dirigindoCarro = true;
    carroAtual = dadosCarro;
    posicaoAntesDeDirigir.copy(obterAncoraCamera());

    velocidade.set(0, 0, 0);
    pararSonsDeMovimento();
    if (somCarroMotor.buffer && !somCarroMotor.isPlaying) somCarroMotor.play();

    mostrarNotificacao('🚗 Você entrou no carro! W/A/S/D para dirigir — pressione E para sair.', '#38bdf8');
}

// Sai do carro: posiciona o jogador de pé, do lado do carro (não no meio dele),
// já na altura certa do terreno naquele ponto.
function sairDoCarro() {
    if (!dirigindoCarro || !carroAtual) return;

    const grupo = carroAtual.grupo;
    const ladoOffset = new THREE.Vector3(2.6, 0, 0);
    ladoOffset.applyAxisAngle(eixoY, carroAtual.direcaoY);

    const destinoX = grupo.position.x + ladoOffset.x;
    const destinoZ = grupo.position.z + ladoOffset.z;
    const destinoY = obterAlturaTerreno(destinoX, destinoZ) + ALTURA_JOGADOR;

    const ancora = obterAncoraCamera();
    ancora.set(destinoX, destinoY, destinoZ);
    camera.position.set(0, 0, 0); // zera qualquer offset de bobbing acumulado

    dirigindoCarro = false;
    carroAtual = null;
    podeSaltar = true;
    if (somCarroMotor.isPlaying) somCarroMotor.stop();

    mostrarNotificacao('Você saiu do carro.', '#9ca3af');
}

// Liga/desliga os faróis do carro que está sendo dirigido no momento — tecla
// F, só funciona enquanto dirigindoCarro é true (fora do carro, F continua
// controlando a lanterna do jogador, ver o switch de KeyF). Acende tanto a
// luz de verdade (SpotLight, ilumina o caminho) quanto o brilho visual da
// caixinha do farol (emissiveIntensity).
function alternarFaroisCarro() {
    if (!dirigindoCarro || !carroAtual) return;

    const grupo = carroAtual.grupo;
    const luzes = grupo.userData.luzesFarol;
    if (!luzes || luzes.length === 0) return;

    grupo.userData.farolLigado = !grupo.userData.farolLigado;
    const ligado = grupo.userData.farolLigado;

    luzes.forEach(luz => { luz.intensity = ligado ? 2.6 : 0; });
    if (grupo.userData.matFarol) {
        grupo.userData.matFarol.emissiveIntensity = ligado ? 2.2 : 0.6;
    }

    if (somLanterna && somLanterna.buffer) somLanterna.play();
    mostrarNotificacao(ligado ? '🚗 Faróis ligados' : '🚗 Faróis desligados', '#38bdf8');
}

// Física + câmera do carro, chamada todo frame (dentro de animar()) enquanto
// dirigindoCarro é true, no lugar da física normal de andar do jogador.
// Reaproveita as mesmas variáveis de input do jogador (moverFrente, moverTras,
// moverEsquerda, moverDireita) — tanto teclado quanto joystick do celular já
// alimentam essas variáveis, então dirigir funciona nos dois.
const VELOCIDADE_MAX_CARRO = 34.0;      // bem mais rápido que a corrida do jogador (~15.3)
const VELOCIDADE_MAX_CARRO_RE = 14.0;
const ACELERACAO_CARRO = 22.0;
const FREIO_CARRO = 34.0;
const ATRITO_CARRO = 9.0;
const VELOCIDADE_VIRAR_CARRO = 1.9;     // rad/s, escalado pela velocidade atual
const DIST_CAMERA_TRAS_CARRO = 7.0;     // quão longe a câmera fica atrás do carro
const ALTURA_CAMERA_CARRO = 3.0;        // quão alto a câmera fica acima do carro

function atualizarDirecaoCarro(delta) {
    const grupo = carroAtual.grupo;

    // Acelerar / Frear / Ré
    if (moverFrente) {
        carroAtual.velocidade = Math.min(carroAtual.velocidade + ACELERACAO_CARRO * delta, VELOCIDADE_MAX_CARRO);
    } else if (moverTras) {
        const freando = carroAtual.velocidade > 0;
        const taxa = freando ? FREIO_CARRO : ACELERACAO_CARRO;
        carroAtual.velocidade = Math.max(carroAtual.velocidade - taxa * delta, -VELOCIDADE_MAX_CARRO_RE);
    } else {
        // Atrito natural (solta os dois pedais)
        if (carroAtual.velocidade > 0) carroAtual.velocidade = Math.max(0, carroAtual.velocidade - ATRITO_CARRO * delta);
        else if (carroAtual.velocidade < 0) carroAtual.velocidade = Math.min(0, carroAtual.velocidade + ATRITO_CARRO * delta);
    }

    // Virar: só gira de verdade se o carro estiver em movimento (como um carro real)
    const fatorVirada = THREE.MathUtils.clamp(Math.abs(carroAtual.velocidade) / 6.0, 0, 1);
    let inputVirar = 0;
    if (moverEsquerda) inputVirar += 1;
    if (moverDireita) inputVirar -= 1;
    const sentido = carroAtual.velocidade < 0 ? -1 : 1; // em ré, vira ao contrário
    carroAtual.direcaoY += inputVirar * VELOCIDADE_VIRAR_CARRO * fatorVirada * sentido * delta;

    // Move na direção que o carro está olhando
    const deslocX = -Math.sin(carroAtual.direcaoY) * carroAtual.velocidade * delta;
    const deslocZ = -Math.cos(carroAtual.direcaoY) * carroAtual.velocidade * delta;
    const novoX = grupo.position.x + deslocX;
    const novoZ = grupo.position.z + deslocZ;

    if (!colideCarro(novoX, novoZ, 2.5)) {
        grupo.position.x = novoX;
        grupo.position.z = novoZ;
    } else {
        carroAtual.velocidade *= -0.25; // bate e ricocheteia levemente
    }

    // Segue o relevo do terreno (flutua suavemente na água, como um barco improvisado)
    const alturaChaoCarro = obterAlturaTerreno(grupo.position.x, grupo.position.z);
    const naAguaCarro = alturaChaoCarro <= NIVEL_DA_AGUA;
    const alturaAlvoCarro = alturaChaoCarro + (naAguaCarro ? 0.15 : 0.35);
    grupo.position.y = THREE.MathUtils.lerp(grupo.position.y, alturaAlvoCarro, Math.min(1, 10 * delta));
    if (naAguaCarro) carroAtual.velocidade *= 0.97; // desacelera bastante na água

    grupo.rotation.y = carroAtual.direcaoY;

    // Som do motor: acelera o "giro"/volume conforme a velocidade, pra dar
    // uma sensação de aceleração real em vez de um loop sempre igual.
    if (somCarroMotor.isPlaying) {
        const fatorVelocidade = THREE.MathUtils.clamp(Math.abs(carroAtual.velocidade) / VELOCIDADE_MAX_CARRO, 0, 1);
        somCarroMotor.setVolume(0.28 + fatorVelocidade * 0.32);
        if (typeof somCarroMotor.setPlaybackRate === 'function') somCarroMotor.setPlaybackRate(0.85 + fatorVelocidade * 0.65);
    }

    // Mantém o colisor do carro (em objetosMundo) grudado na posição visual dele
    carroAtual.colisor.x = grupo.position.x;
    carroAtual.colisor.z = grupo.position.z;
    carroAtual.colisor.topoY = grupo.position.y + 1.6;

    // Rodas girando (rolagem) + rodas da frente esterçando visualmente
    if (grupo.userData.rodasGirando) {
        // CORREÇÃO: o pneu foi deitado com rotateZ(90°) na criação (ver
        // criarModeloCarro), o que faz o eixo/cubo da roda apontar pro seu
        // próprio eixo Y local. Girar em rotateX fazia a roda "tombar" de
        // lado; o giro correto (rolar pra frente) é em torno desse Y local.
        grupo.userData.rodasGirando.forEach(pneu => pneu.rotateY(-carroAtual.velocidade * delta * 1.6));
    }
    if (grupo.userData.rodasDianteiras) {
        grupo.userData.rodasDianteiras.forEach(g => { g.rotation.y = inputVirar * 0.5; });
    }

    // Câmera: terceira pessoa, atrás do carro (vendo a traseira dele), com uma
    // suavização leve pra não "tremer" em freadas/curvas bruscas. Como agora
    // fixamos a rotação da câmera pra sempre olhar na direção do carro,
    // o mouse fica travado enquanto dirige (volta ao normal ao sair).
    const alvoX = grupo.position.x + Math.sin(carroAtual.direcaoY) * DIST_CAMERA_TRAS_CARRO;
    const alvoZ = grupo.position.z + Math.cos(carroAtual.direcaoY) * DIST_CAMERA_TRAS_CARRO;
    const alvoY = grupo.position.y + ALTURA_CAMERA_CARRO;

    const ancora = obterAncoraCamera();
    const fatorSuavizacaoCam = 1 - Math.exp(-8 * delta);
    ancora.x = THREE.MathUtils.lerp(ancora.x, alvoX, fatorSuavizacaoCam);
    ancora.y = THREE.MathUtils.lerp(ancora.y, alvoY, fatorSuavizacaoCam);
    ancora.z = THREE.MathUtils.lerp(ancora.z, alvoZ, fatorSuavizacaoCam);

    camera.rotation.set(-0.16, carroAtual.direcaoY, 0, 'YXZ');
}

// Checa se o carro bateria em algo (árvore, rocha, casa, cerca, outro carro
// etc.) se se movesse pro ponto (x, z). Reaproveita a mesma lista de
// colisores usada para o jogador a pé (objetosMundo), ignorando o colisor do
// próprio carro que está sendo dirigido.
function colideCarro(x, z, raioCarro) {
    for (let i = 0; i < objetosMundo.length; i++) {
        const obj = objetosMundo[i];
        if (obj.dadosCarroRef === carroAtual) continue;

        if (obj.isCasaConstruida) {
            const dx = x - obj.x, dz = z - obj.z;
            const raioAprox = Math.max(obj.w, obj.d) / 2 + raioCarro;
            if (dx * dx + dz * dz < raioAprox * raioAprox) return true;
        } else if (obj.isBox) {
            if (x > obj.minX - raioCarro && x < obj.maxX + raioCarro && z > obj.minZ - raioCarro && z < obj.maxZ + raioCarro) return true;
        } else {
            const dx = x - obj.x, dz = z - obj.z;
            const raioTotal = (obj.raio || 0.6) + raioCarro;
            if (dx * dx + dz * dz < raioTotal * raioTotal) return true;
        }
    }
    return false;
}

// Compra um produto do computador (aba "Comprar Produtos"): cobra o preço em
// dinheiro e entrega 1 unidade como "planta_<tipo>" no inventário, pronta pra
// ser equipada e posicionada no mundo pelo mesmo sistema de holograma das
// construções.
window.comprarProduto = function (tipo) {
    const produto = PRODUTOS_LOJA[tipo];
    if (!produto) return;

    if (dinheiroJogador < produto.preco) {
        mostrarNotificacao('Dinheiro insuficiente! Você precisa de ' + formatarDinheiro(produto.preco) + '.', '#ef4444');
        return;
    }

    const chaveItem = 'planta_' + tipo;
    if (!registrarItemNaHotbar(chaveItem, true)) return;

    dinheiroJogador -= produto.preco;
    inventario[chaveItem] = (inventario[chaveItem] || 0) + 1;

    if (tipo === 'carro') {
        filaCoresCarro.push(corCarroSelecionada);
    }

    atualizarDinheiroUI();
    atualizarUIAktiv();
    atualizarUILoja();
    mostrarNotificacao('🚗 ' + produto.nome + ' comprado! Equipe-o no inventário e posicione no mundo.', '#22c55e');
};

// Atualiza a aba "Comprar Produtos": quantidade que o jogador já possui de
// cada produto e se o botão de compra deve ficar desabilitado (sem dinheiro).
function atualizarUICompras() {
    Object.keys(PRODUTOS_LOJA).forEach(tipo => {
        const produto = PRODUTOS_LOJA[tipo];
        const elPossui = document.getElementById('loja-possui-' + tipo);
        if (elPossui) elPossui.innerText = inventario['planta_' + tipo] || 0;

        const semDinheiro = dinheiroJogador < produto.preco;
        const elItem = document.getElementById('loja-produto-' + tipo);
        if (elItem) elItem.classList.toggle('indisponivel', semDinheiro);

        const btn = document.getElementById('loja-btn-comprar-' + tipo);
        if (btn) btn.disabled = semDinheiro;
    });
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

    criarConstrucaoNoMundo(tipoCasaParaConstruir, posAlvo.x, posAlvo.y, posAlvo.z, anguloRotacaoHolograma);

    // Remove 1 planta do inventário
    inventario['planta_' + tipoCasaParaConstruir]--;

    if (inventario['planta_' + tipoCasaParaConstruir] <= 0) {
        inventario['planta_' + tipoCasaParaConstruir] = 0;
        itemAtivo = 'machado';
    }

    atualizarUIAktiv();

    // Auto-save silencioso: qualquer construção nova já fica salva sozinha,
    // sem precisar que o jogador lembre de abrir o menu e clicar em salvar.
    if (typeof salvarJogo === 'function') salvarJogo(false);
}

// Constrói de fato os meshes/colisores de uma construção no mundo, numa
// posição e ângulo dados, e devolve o registro criado (guardando x/y/z/rotY
// nele). Extraída de executarConstrucaoReal pra poder ser chamada de dois
// lugares: quando o jogador constrói de verdade (gastando planta do
// inventário) e quando um jogo salvo é carregado (recriando tudo que já
// existia, sem mexer no inventário).
// OBS: os parâmetros têm os mesmos nomes das variáveis globais que o bloco
// de ifs abaixo usa (tipoCasaParaConstruir, anguloRotacaoHolograma) de
// propósito — isso "sombreia" as globais dentro desta função, então todo o
// código interno (copiado de quando ele vivia direto em
// executarConstrucaoReal) funciona sem precisar reescrever cada referência.
function criarConstrucaoNoMundo(tipoCasaParaConstruir, x, y, z, anguloRotacaoHolograma) {
    const posAlvo = { x, y, z };

    // Marca o "tamanho" de cada lista auxiliar ANTES de criar a construção, pra
    // depois conseguir descobrir exatamente o que foi adicionado por ela (e
    // então remover tudo de uma vez se o jogador demolir essa construção, ou
    // se um jogo salvo for recarregado).
    const snapshot = {
        raycast: objetosRaycast.length,
        mundo: objetosMundo.length,
        escadas: listaEscadas.length,
        fogueiras: listaFogueirasDinamicas.length,
        portas: todasAsPortas.length
    };

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
    } else if (tipoCasaParaConstruir === 'carro') {
        // Usa a cor escolhida na hora da compra (fila FIFO); se por algum
        // motivo não tiver nenhuma guardada, cai pra cor aleatória de sempre.
        const corDoCarro = filaCoresCarro.length > 0 ? filaCoresCarro.shift() : null;
        const carroReal = criarModeloCarro(corDoCarro);
        carroReal.position.set(posAlvo.x, posAlvo.y, posAlvo.z);
        carroReal.rotation.y = anguloRotacaoHolograma;
        cena.add(carroReal);
        objetosRaycast.push(carroReal);

        const infoColisaoCarro = { x: posAlvo.x, z: posAlvo.z, raio: 2.5, topoY: posAlvo.y + 1.6 };
        objetosMundo.push(infoColisaoCarro);

        const dadosCarro = {
            grupo: carroReal,
            colisor: infoColisaoCarro,
            velocidade: 0,
            direcaoY: anguloRotacaoHolograma
        };
        infoColisaoCarro.dadosCarroRef = dadosCarro;
        carroReal.traverse(obj => { obj.userData.dadosCarro = dadosCarro; });
        carrosNoMundo.push(dadosCarro);
    } else if (tipoCasaParaConstruir === 'tv') {
        const tvReal = criarModeloTV();
        tvReal.position.set(posAlvo.x, posAlvo.y, posAlvo.z);
        tvReal.rotation.y = anguloRotacaoHolograma;
        cena.add(tvReal);
        objetosRaycast.push(tvReal);

        objetosMundo.push({ x: posAlvo.x, z: posAlvo.z, raio: 0.65, topoY: posAlvo.y + 1.3 });

        // Marca todos os meshes da TV com essa flag pra processarInteracaoGeral
        // reconhecer que "olhar + apertar E" aqui deve abrir o menu de filmes.
        tvReal.traverse(obj => { obj.userData.dadosTV = true; });
    } else {
        // Se não for nenhum dos anteriores, constrói uma casa (p, m ou g)
        construirCasaDetalhada(tipoCasaParaConstruir, posAlvo.x, posAlvo.y, posAlvo.z, anguloRotacaoHolograma);
    }

    // Junta tudo que foi criado nesta construção (comparando com o snapshot de
    // antes) e guarda como um único registro demolível.
    const registro = {
        tipo: tipoCasaParaConstruir,
        material: MATERIAL_POR_CONSTRUCAO[tipoCasaParaConstruir] || 'madeira',
        raycastObjs: objetosRaycast.slice(snapshot.raycast),
        mundoObjs: objetosMundo.slice(snapshot.mundo),
        escadasObjs: listaEscadas.slice(snapshot.escadas),
        fogueirasObjs: listaFogueirasDinamicas.slice(snapshot.fogueiras),
        portasObjs: todasAsPortas.slice(snapshot.portas),
        // Guarda também a posição/ângulo originais — é o que permite salvar o
        // jogo (ver salvarJogo/carregarJogo) e recriar tudo depois sem
        // precisar "adivinhar" onde cada coisa estava.
        x: posAlvo.x, y: posAlvo.y, z: posAlvo.z, rotY: anguloRotacaoHolograma
    };
    registro.raycastObjs.forEach(obj => { if (obj && obj.userData) obj.userData.construcaoInfo = registro; });
    construcoesColocadas.push(registro);
    return registro;
}

// Remove uma construção do mundo (meshes, colisores, listas auxiliares) sem
// devolver material ao inventário nem mostrar notificação — a parte "física"
// que tanto demolirConstrucao (jogador demolindo de verdade) quanto
// carregarJogo (limpando o mundo antes de recriar um save) precisam.
function removerConstrucaoDoMundo(registro) {
    registro.raycastObjs.forEach(obj => {
        if (!obj) return;
        cena.remove(obj);
        const iRay = objetosRaycast.indexOf(obj);
        if (iRay > -1) objetosRaycast.splice(iRay, 1);

        // CORREÇÃO (vazamento de memória): cena.remove() só tira o objeto da
        // cena, mas a geometria e o material continuam ocupando memória da
        // GPU até serem descartados manualmente. Cada construção cria seus
        // próprios materiais (não são compartilhados entre construções),
        // então é seguro liberar aqui sempre que uma construção é removida.
        obj.traverse(filho => {
            if (filho.isMesh) {
                if (filho.geometry) filho.geometry.dispose();
                if (filho.material) {
                    if (Array.isArray(filho.material)) filho.material.forEach(m => m.dispose());
                    else filho.material.dispose();
                }
            }
        });
    });
    registro.mundoObjs.forEach(colisor => {
        const iMundo = objetosMundo.indexOf(colisor);
        if (iMundo > -1) objetosMundo.splice(iMundo, 1);
    });
    registro.escadasObjs.forEach(escada => {
        const iEsc = listaEscadas.indexOf(escada);
        if (iEsc > -1) listaEscadas.splice(iEsc, 1);
    });
    registro.fogueirasObjs.forEach(fogueira => {
        const iFog = listaFogueirasDinamicas.indexOf(fogueira);
        if (iFog > -1) listaFogueirasDinamicas.splice(iFog, 1);

        // CORREÇÃO (quadradinhos parados no ar ao demolir fogueira/lareira):
        // a luz (PointLight) e o sistema de partículas do fogo eram criados
        // com cena.add() direto (ver construirFogueiraFisica/construirLareiraFisica),
        // mas nunca ficavam registrados em raycastObjs nem em nenhuma outra
        // lista limpa aqui. Tirar a fogueira só da listaFogueirasDinamicas
        // parava a ANIMAÇÃO das partículas (elas somem do loop em animar()),
        // mas os pontos e a luz continuavam presos na cena pra sempre,
        // "congelados" no ar. Agora removemos os dois da cena e liberamos a
        // geometria/material das partículas (evita vazamento de memória).
        if (fogueira.sistemaParticulas) {
            cena.remove(fogueira.sistemaParticulas);
            fogueira.sistemaParticulas.geometry.dispose();
            fogueira.sistemaParticulas.material.dispose();
        }
        if (fogueira.luz) {
            cena.remove(fogueira.luz);
        }
    });
    registro.portasObjs.forEach(porta => {
        const iPorta = todasAsPortas.indexOf(porta);
        if (iPorta > -1) todasAsPortas.splice(iPorta, 1);
    });

    const iRegistro = construcoesColocadas.indexOf(registro);
    if (iRegistro > -1) construcoesColocadas.splice(iRegistro, 1);
}

// Demole uma construção (registrada em executarConstrucaoReal): tira tudo o
// que ela criou do mundo/listas auxiliares e devolve 1 planta pro inventário
// — o inverso exato do que foi gasto para colocá-la.
function demolirConstrucao(registro) {
    removerConstrucaoDoMundo(registro);

    inventario['planta_' + registro.tipo] = (inventario['planta_' + registro.tipo] || 0) + 1;
    atualizarUIAktiv();

    // O item devolvido é sempre de um tipo que já tinha espaço reservado na
    // hotbar (ele só existe porque já foi craftado antes), então nunca causa
    // estouro do limite de 10. Ainda assim, se os 10 espaços já estiverem
    // todos ocupados por outros tipos, avisa o jogador que o inventário
    // continua cheio (ele não vai conseguer craftar nenhum tipo novo).
    if (hotbar.indexOf(null) === -1) {
        mostrarNotificacao('Construção demolida! Item devolvido ao inventário. Atenção: inventário cheio (10/10 tipos).', '#f59e0b');
    } else {
        mostrarNotificacao('Construção demolida! Item devolvido ao inventário.', '#22c55e');
    }

    // Auto-save silencioso, mesma lógica de quando se constrói algo.
    if (typeof salvarJogo === 'function') salvarJogo(false);
}

// ============================================================
// 💾 SALVAR / CARREGAR JOGO (localStorage)
// ============================================================
// Guarda tudo num único JSON dentro do localStorage do navegador: posição e
// direção do olhar do jogador, dinheiro, inventário, hotbar, item ativo, se
// a lanterna estava ligada, e a lista de construções colocadas (cada uma só
// com tipo/posição/ângulo — os meshes de verdade são recriados do zero ao
// carregar, via criarConstrucaoNoMundo). Não tenta salvar árvores/pedras já
// cortadas, animais ou carros dirigíveis — o save cobre o progresso que
// importa (o que você construiu e o que tem no inventário).
const CHAVE_JOGO_SALVO = 'craftprint_save_v1';

// Verdadeiro se existe algum jogo salvo no navegador (usado pra decidir se
// mostra o botão "Continuar Jogo Salvo" na tela inicial).
function existeJogoSalvo() {
    try { return !!localStorage.getItem(CHAVE_JOGO_SALVO); } catch (erro) { return false; }
}

// Monta o objeto simples (só dados, sem referências a meshes) que vai pro
// localStorage.
function coletarEstadoParaSalvar() {
    const posJ = obterAncoraCamera();
    return {
        versao: 1,
        salvoEm: Date.now(),
        jogador: {
            x: posJ.x, y: posJ.y, z: posJ.z,
            rotY: camera.rotation.y,
            rotX: camera.rotation.x
        },
        dinheiro: dinheiroJogador,
        inventario: { ...inventario },
        hotbar: hotbar.slice(),
        itemAtivo: itemAtivo,
        lanternaLigada: lanternaLigada,
        // Só os tipos que guardam posição própria (todas, desde o refactor de
        // criarConstrucaoNoMundo) — filtro aqui é só uma proteção extra.
        construcoes: construcoesColocadas
            .filter(r => typeof r.x === 'number')
            .map(r => ({ tipo: r.tipo, x: r.x, y: r.y, z: r.z, rotY: r.rotY || 0 }))
    };
}

// Chamada pelo botão "💾 Salvar Jogo" do menu de pausa, e também pelo
// sistema de auto-save (silencioso = true) em vários momentos do jogo — ver
// mais abaixo os pontos onde salvarJogo(true/false) é chamada automaticamente.
function salvarJogo(mostrarNotif = true) {
    try {
        const estado = coletarEstadoParaSalvar();
        localStorage.setItem(CHAVE_JOGO_SALVO, JSON.stringify(estado));
        if (mostrarNotif) mostrarNotificacao('💾 Jogo salvo com sucesso!', '#22c55e');
    } catch (erro) {
        console.error('Erro ao salvar o jogo:', erro);
        if (mostrarNotif) mostrarNotificacao('Não foi possível salvar o jogo (armazenamento cheio ou bloqueado).', '#ef4444');
    }
}

// Lê o localStorage e reconstrói o estado salvo no mundo já carregado.
// mostrarAviso=false é usado no arranque automático (silencioso) se um dia
// quisermos carregar sem notificação; por padrão sempre avisa o jogador.
function carregarJogo(mostrarAviso = true) {
    let estado;
    try {
        const bruto = localStorage.getItem(CHAVE_JOGO_SALVO);
        if (!bruto) {
            if (mostrarAviso) mostrarNotificacao('Nenhum jogo salvo encontrado.', '#f59e0b');
            return false;
        }
        estado = JSON.parse(bruto);
    } catch (erro) {
        console.error('Erro ao ler o jogo salvo:', erro);
        if (mostrarAviso) mostrarNotificacao('O jogo salvo está corrompido.', '#ef4444');
        return false;
    }

    // Tira do mundo tudo que o jogador já tinha construído nesta sessão
    // (sem devolver material — o inventário salvo vai substituir o atual
    // daqui a pouco de qualquer forma) antes de recriar exatamente o que
    // estava salvo.
    construcoesColocadas.slice().forEach(registro => removerConstrucaoDoMundo(registro));

    // Recria cada construção salva na posição/ângulo originais
    (estado.construcoes || []).forEach(c => {
        try { criarConstrucaoNoMundo(c.tipo, c.x, c.y, c.z, c.rotY || 0); }
        catch (erro) { console.warn('Falha ao recriar construção salva:', c, erro); }
    });

    // Restaura inventário (mantém qualquer chave nova que não exista no save
    // antigo), dinheiro, hotbar e item ativo
    if (estado.inventario) inventario = { ...inventario, ...estado.inventario };
    if (typeof estado.dinheiro === 'number') dinheiroJogador = estado.dinheiro;
    if (Array.isArray(estado.hotbar)) {
        hotbar = estado.hotbar.slice(0, LIMITE_HOTBAR);
        while (hotbar.length < LIMITE_HOTBAR) hotbar.push(null);
    }
    if (estado.itemAtivo) itemAtivo = estado.itemAtivo;

    // Restaura posição e direção do olhar do jogador
    if (estado.jogador) {
        obterAncoraCamera().set(estado.jogador.x, estado.jogador.y, estado.jogador.z);
        camera.rotation.y = estado.jogador.rotY || 0;
        camera.rotation.x = estado.jogador.rotX || 0;
        cameraYawAlvo = camera.rotation.y;
        cameraPitchAlvo = camera.rotation.x;
    }

    // Lanterna
    if (typeof estado.lanternaLigada === 'boolean' && estado.lanternaLigada !== lanternaLigada) {
        lanternaLigada = estado.lanternaLigada;
        if (typeof luzLanterna !== 'undefined') luzLanterna.visible = lanternaLigada;
    }

    atualizarUIAktiv();
    if (typeof atualizarDinheiroUI === 'function') atualizarDinheiroUI();
    if (typeof sincronizarQuantidadesMochila === 'function') sincronizarQuantidadesMochila();

    if (mostrarAviso) mostrarNotificacao('📂 Jogo carregado!', '#22c55e');
    return true;
}

// Auto-save periódico: a cada 60s, se o jogo já começou, salva sozinho e
// silenciosamente (sem popup) — assim o jogador nunca perde muito progresso
// mesmo que esqueça de pausar ou feche o jogo sem querer.
const INTERVALO_AUTO_SAVE_MS = 60000;
setInterval(() => {
    if (typeof jogoIniciado !== 'undefined' && jogoIniciado && typeof salvarJogo === 'function') {
        salvarJogo(false);
    }
}, INTERVALO_AUTO_SAVE_MS);

// Salva também sempre que a aba/app perde o foco (troca de aba, minimiza,
// bloqueia o celular) — mais confiável que "beforeunload" em navegadores
// mobile, onde fechar o app às vezes não dispara esse evento.
document.addEventListener('visibilitychange', () => {
    if (document.hidden && typeof jogoIniciado !== 'undefined' && jogoIniciado && typeof salvarJogo === 'function') {
        salvarJogo(false);
    }
});

// Última tentativa de salvar ao fechar/recarregar a página (best-effort —
// nem todo navegador garante que código assíncrono rode aqui, mas
// localStorage.setItem é síncrono, então costuma funcionar).
window.addEventListener('beforeunload', () => {
    if (typeof jogoIniciado !== 'undefined' && jogoIniciado && typeof salvarJogo === 'function') {
        salvarJogo(false);
    }
});

const relogio = new THREE.Clock(); let tempoCiclo = 0.5;

// PERFORMANCE: contadores usados para não repetir, todo frame, duas operações
// caras (raycast de interação e recálculo de sombras) — ver função animar().
let contadorFrameInteracao = 0;
let interseccoesCache = [];
let contadorFrameSombra = 0;

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

    // PERFORMANCE: o raycast (que detecta árvore/rocha/construção/porta mirada)
    // é uma operação relativamente cara — sobretudo contra o terreno, que tem
    // muitos triângulos — e não precisa ser recalculado 60x/s pra parecer
    // instantâneo. Recalcula a cada 2 frames e reaproveita o resultado no frame
    // do meio; a diferença é imperceptível pro jogador.
    contadorFrameInteracao++;
    if (contadorFrameInteracao % 2 === 0) {
        raycaster.setFromCamera(vetorCentroTela, camera);
        interseccoesCache = raycaster.intersectObjects(objetosRaycast, true);
    }
    const interseccoes = interseccoesCache;

    let achouObjetoPerto = false, promptTexto = "Pressione E para Interagir", arvoreOlhada = null, rochaOlhada = null;
    construcaoOlhada = null;

    if (interseccoes.length > 0 && interseccoes[0].distance < 4.0) {
        let objOcular = interseccoes[0].object;
        if (objOcular === mesaTrabalhoMesh || objOcular.parent === mesaTrabalhoMesh) { achouObjetoPerto = true; promptTexto = "Pressione E para usar a Mesa de Trabalho"; }
        else if (objOcular === escrivaninhaMesh || objOcular.parent === escrivaninhaMesh) { achouObjetoPerto = true; promptTexto = "Pressione E para usar o Computador"; }
        else {
            let cur = objOcular;
            while (cur && cur.type !== 'Scene') {
                if (cur.userData && cur.userData.dadosCarro) { achouObjetoPerto = true; promptTexto = "Pressione E para Entrar no Carro"; break; }
                if (cur.userData && cur.userData.dadosTV) { achouObjetoPerto = true; promptTexto = "Pressione E para Ligar a TV"; break; }
                if (cur.userData && cur.userData.ePorta) { achouObjetoPerto = true; promptTexto = "Pressione E para abrir/fechar a Porta"; break; }
                if (cur.userData && cur.userData.dadosArvore) { arvoreOlhada = cur.userData.dadosArvore; break; }
                if (cur.userData && cur.userData.dadosRocha) { rochaOlhada = cur.userData.dadosRocha; break; }
                if (cur.userData && cur.userData.construcaoInfo) { construcaoOlhada = cur.userData.construcaoInfo; break; }
                cur = cur.parent;
            }
        }
    }

    // Sons de machado/picareta: tocam em loop só enquanto o jogador está de
    // fato golpeando a árvore/rocha certa com a ferramenta certa, e param
    // assim que ele solta o clique, muda de alvo ou troca de ferramenta.
    const cortandoArvoreAgora = !!(arvoreOlhada && estaMinando && itemAtivo === 'machado');
    if (cortandoArvoreAgora) { if (!somMachado.isPlaying && somMachado.buffer) somMachado.play(); }
    else if (somMachado.isPlaying) { somMachado.stop(); }

    const minerandoRochaAgora = !!(rochaOlhada && estaMinando && itemAtivo === 'picareta');
    if (minerandoRochaAgora) { if (!somPicareta.isPlaying && somPicareta.buffer) somPicareta.play(); }
    else if (somPicareta.isPlaying) { somPicareta.stop(); }

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
    // Demolição de construções: machado derruba as de madeira, picareta as de pedra.
    else if (construcaoOlhada && estaMinando &&
        ((construcaoOlhada.material === 'madeira' && itemAtivo === 'machado') ||
            (construcaoOlhada.material === 'pedra' && itemAtivo === 'picareta'))) {
        if (construcaoSendoDemolida !== construcaoOlhada) { construcaoSendoDemolida = construcaoOlhada; tempoSegurandoClique = 0; }
        tempoSegurandoClique += delta;
        const TEMPO_DEMOLICAO = 2.5;
        if (barraProgressoContainer && barraProgressoContainer.style.display !== 'block') barraProgressoContainer.style.display = 'block';
        if (barraProgressoPreenchimento) barraProgressoPreenchimento.style.width = Math.min(100, (tempoSegurandoClique / TEMPO_DEMOLICAO * 100)) + '%';

        if (tempoSegurandoClique >= TEMPO_DEMOLICAO) {
            demolirConstrucao(construcaoSendoDemolida);
            estaMinando = false; tempoSegurandoClique = 0; construcaoSendoDemolida = null; if (barraProgressoContainer) barraProgressoContainer.style.display = 'none';
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

    // Enquanto dirige, o prompt sempre mostra a opção de sair (a câmera fica
    // travada olhando pro carro em terceira pessoa, então não faz sentido
    // basear isso no raycast central da tela).
    if (dirigindoCarro && promptInteracao) {
        promptInteracao.style.display = 'block';
        promptInteracao.innerText = 'Pressione E para Sair do Carro';
    }

    if (modoConstrucaoAtivo && hologramaVisual) {
        // Procura a primeira superfície que aponta para cima (chão da casa, segundo andar, terreno ou água)
        let chaoValido = interseccoes.find(i =>
            (i.face && i.face.normal.y > 0.5) ||
            (i.object === terreno || i.object === agua)
        );

        // Se o jogador girou a roda do mouse (ou tocou ➕/➖ no celular) pra
        // empurrar a construção mais longe/perto, isso tem prioridade sobre o
        // ponto encontrado automaticamente — dá liberdade pra colocar em
        // qualquer lugar do terreno aberto, não só exatamente onde o
        // crosshair está mirando. Sem ajuste manual (distanciaExtraColocacao
        // === 0), o comportamento continua idêntico ao de sempre.
        let xAlvo, zAlvo, alturaAlvo, hologramaValido;

        if (distanciaExtraColocacao > 0) {
            const distanciaBase = chaoValido ? chaoValido.distance : DISTANCIA_BASE_COLOCACAO;
            const distanciaFinal = distanciaBase + distanciaExtraColocacao;

            const direcaoCam = new THREE.Vector3();
            camera.getWorldDirection(direcaoCam);
            const pontoAlvo = camera.position.clone().addScaledVector(direcaoCam, distanciaFinal);

            xAlvo = pontoAlvo.x;
            zAlvo = pontoAlvo.z;
            alturaAlvo = obterAlturaTerreno(xAlvo, zAlvo);
            hologramaValido = true;
        } else if (chaoValido) {
            xAlvo = chaoValido.point.x;
            zAlvo = chaoValido.point.z;
            alturaAlvo = chaoValido.point.y; // altura EXATA de onde o raio bateu (resolve afundar ou não subir pro 2º andar)
            hologramaValido = true;
        } else {
            hologramaValido = false;
        }

        if (hologramaValido) {
            hologramaVisual.visible = true;

            // Grade de posicionamento: por padrão, quase tudo agora tem
            // posicionamento LIVRE (segue o crosshair exatamente, sem pular de
            // bloco em bloco) — igual à tocha, pra dar liberdade de encostar
            // qualquer construção num canto, parede ou vão apertado. Só pisos e
            // camas continuam alinhados numa grade de 2 (senão ficam com
            // buracos/desencontrados entre um e outro). Segurando SHIFT, o
            // comportamento INVERTE: pisos/camas ficam livres também (pra ajuste
            // fino), e os itens livres passam a alinhar numa grade de 1 (útil
            // pra alinhar cercas/muros rapidinho em linha reta).
            const gridPadrao = (tipoCasaParaConstruir === 'piso' || tipoCasaParaConstruir === 'cama') ? 2 : null;
            const grid = correndo ? (gridPadrao ? null : 1) : gridPadrao;
            if (grid) {
                xAlvo = Math.round(xAlvo / grid) * grid;
                zAlvo = Math.round(zAlvo / grid) * grid;
            }

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

    atualizarAnimais(delta);

  // --- COMECE A SUBSTITUIR A PARTIR DAQUI ---
  if (dirigindoCarro && carroAtual) {
    // Enquanto estiver dirigindo, a física normal do jogador (andar, gravidade,
    // colisão a pé, bobbing) fica toda pausada — quem se move é o carro.
    atualizarDirecaoCarro(delta);
  } else {
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
  } // fecha o "else" de "if (dirigindoCarro && carroAtual)" lá de cima


    // PERFORMANCE: dispara o recálculo do shadow map manualmente a cada 2
    // frames (autoUpdate está desligado lá na criação do renderizador).
    contadorFrameSombra++;
    if (contadorFrameSombra % 2 === 0) renderizador.shadowMap.needsUpdate = true;

    renderizador.render(cena, camera);
}
animar();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderizador.setSize(window.innerWidth, window.innerHeight); });

// --- LÓGICA DE ABRIR/FECHAR A MOCHILA ---
let mochilaAberta = false;
const mochilaContainer = document.getElementById('mochila-container');

function alternarMochila() {
    if (menuCraftingAberto || menuLojaAberto || menuTVAberto) return; // Não abre se estiver na mesa de trabalho, no computador ou na TV

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

// ============================================================
// SISTEMA DE VENDA DE RECURSOS (ESCRIVANINHA / COMPUTADOR)
// ============================================================
function formatarDinheiro(valor) {
    return '$' + valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function atualizarDinheiroUI() {
    if (dinheiroHudEl) dinheiroHudEl.innerText = formatarDinheiro(dinheiroJogador);
}

// Mantém os números da mochila (🪵🪨 + ferro/cobre/ouro) sincronizados com o
// inventário depois de qualquer operação de venda.
function sincronizarQuantidadesMochila() {
    Object.keys(PRECOS_RECURSOS).forEach(recurso => {
        const elMochila = document.getElementById('txt-qtd-' + recurso);
        if (elMochila) elMochila.innerText = inventario[recurso] || 0;
    });
}

function calcularTotalCarrinho() {
    return Object.keys(carrinhoVenda).reduce((total, recurso) => total + (carrinhoVenda[recurso] * PRECOS_RECURSOS[recurso]), 0);
}

// Redesenha a listinha de itens já adicionados à venda + o total.
function renderizarCarrinhoVenda() {
    const lista = document.getElementById('loja-carrinho-lista');
    const totalEl = document.getElementById('loja-total-valor');
    const btnFecharVenda = document.getElementById('btn-fechar-venda');
    if (!lista) return;

    lista.innerHTML = '';
    let temItens = false;

    Object.keys(carrinhoVenda).forEach(recurso => {
        const qtd = carrinhoVenda[recurso];
        if (qtd <= 0) return;
        temItens = true;

        const subtotal = qtd * PRECOS_RECURSOS[recurso];
        const linha = document.createElement('div');
        linha.className = 'carrinho-linha';
        linha.innerHTML = '<span class="carrinho-nome">' + NOMES_RECURSOS[recurso] + ' x ' + qtd + '</span>' +
            '<span class="carrinho-subtotal">' + formatarDinheiro(subtotal) + '</span>' +
            '<button class="btn-carrinho-remover" onclick="removerRecursoDoCarrinho(\'' + recurso + '\')" aria-label="Remover">✕</button>';
        lista.appendChild(linha);
    });

    if (!temItens) {
        lista.innerHTML = '<div class="carrinho-vazio">Nenhum item adicionado ainda.</div>';
    }

    if (totalEl) totalEl.innerText = formatarDinheiro(calcularTotalCarrinho());
    if (btnFecharVenda) btnFecharVenda.disabled = !temItens;
}

// Atualiza tudo que a tela do computador mostra: quantidade disponível de
// cada recurso na mochila, os inputs, e o carrinho de venda.
function atualizarUILoja() {
    Object.keys(PRECOS_RECURSOS).forEach(recurso => {
        const elDisp = document.getElementById('loja-disp-' + recurso);
        if (elDisp) elDisp.innerText = inventario[recurso] || 0;

        const elInput = document.getElementById('loja-input-' + recurso);
        if (elInput) {
            const maxDisponivel = inventario[recurso] || 0;
            elInput.max = maxDisponivel;
            if (parseInt(elInput.value || '0', 10) > maxDisponivel) elInput.value = maxDisponivel || '';
        }

        const elItem = document.getElementById('loja-item-' + recurso);
        if (elItem) elItem.classList.toggle('indisponivel', (inventario[recurso] || 0) <= 0);
    });

    renderizarCarrinhoVenda();
    atualizarUICompras();
}

// Move a quantidade digitada no campo do recurso, da mochila pro carrinho de venda.
window.adicionarRecursoAVenda = function (recurso) {
    const elInput = document.getElementById('loja-input-' + recurso);
    if (!elInput) return;

    const qtd = parseInt(elInput.value, 10);
    if (!Number.isFinite(qtd) || qtd <= 0) {
        mostrarNotificacao('Digite uma quantidade válida.', '#ef4444');
        return;
    }
    if (qtd > (inventario[recurso] || 0)) {
        mostrarNotificacao('Você não tem essa quantidade de ' + NOMES_RECURSOS[recurso] + '.', '#ef4444');
        return;
    }

    inventario[recurso] -= qtd;
    carrinhoVenda[recurso] += qtd;
    elInput.value = '';

    sincronizarQuantidadesMochila();
    atualizarEstadoCraftingUI();
    atualizarUILoja();
    mostrarNotificacao(qtd + 'x ' + NOMES_RECURSOS[recurso] + ' adicionado à venda.', '#22c55e');
};

// Desiste de vender aquele recurso: devolve tudo que estava reservado no
// carrinho de volta pra mochila.
window.removerRecursoDoCarrinho = function (recurso) {
    const qtd = carrinhoVenda[recurso];
    if (!qtd) return;

    inventario[recurso] = (inventario[recurso] || 0) + qtd;
    carrinhoVenda[recurso] = 0;

    sincronizarQuantidadesMochila();
    atualizarEstadoCraftingUI();
    atualizarUILoja();
};

// Fecha a venda de verdade: soma o valor total do carrinho ao dinheiro do
// jogador (aparece na hora no HUD) e esvazia o carrinho.
window.finalizarVenda = function () {
    const total = calcularTotalCarrinho();
    if (total <= 0) {
        mostrarNotificacao('Adicione recursos à venda antes de fechar.', '#ef4444');
        return;
    }

    dinheiroJogador += total;
    Object.keys(carrinhoVenda).forEach(recurso => { carrinhoVenda[recurso] = 0; });

    atualizarDinheiroUI();
    atualizarUILoja();
    mostrarNotificacao('Venda concluída! Você recebeu ' + formatarDinheiro(total) + '.', '#22c55e');
};

// Sai da tela do computador. Qualquer recurso ainda reservado no carrinho
// (não vendido) volta automaticamente pra mochila, pra ninguém perder item.
function fecharLoja() {
    let devolveuAlgo = false;
    Object.keys(carrinhoVenda).forEach(recurso => {
        if (carrinhoVenda[recurso] > 0) {
            inventario[recurso] = (inventario[recurso] || 0) + carrinhoVenda[recurso];
            carrinhoVenda[recurso] = 0;
            devolveuAlgo = true;
        }
    });
    if (devolveuAlgo) sincronizarQuantidadesMochila();

    menuLoja.style.display = 'none';
    menuLojaAberto = false;
    if (!ehTouch && controles) controles.lock();
}

document.getElementById('btn-fechar-venda')?.addEventListener('click', finalizarVenda);
document.getElementById('btn-fechar-loja')?.addEventListener('click', fecharLoja);
document.getElementById('btn-fechar-tv')?.addEventListener('click', fecharMenuTV);
document.getElementById('btn-fechar-tv-jogo')?.addEventListener('click', fecharMenuTV);
document.getElementById('btn-voltar-tv-jogo')?.addEventListener('click', fecharJogo);

atualizarDinheiroUI();

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
    return !!alvo.closest('#zona-joystick, #botoes-acao-mobile, .btn-touch, button, input, #menu-crafting, #menu-loja, #menu-tv, #menu-tv-jogo, #mochila-container, .overlay-tela');
}

window.addEventListener('touchstart', (e) => {
    if (!jogoIniciado || jogoPausado || !ehTouch) return;
    if (mochilaAberta || menuCraftingAberto || menuLojaAberto || menuTVAberto) return;

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