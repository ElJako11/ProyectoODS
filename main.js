// Configuración del Juego
const CONFIGURACION = {
  velocidadInicial: 2, // píxeles por frame (reducida de 4)
  tasaAparicion: 4000, // ms
  aumentoVelocidad: 0.1, // velocidad añadida por minuto (reducida de 0.2)
  gravedad: 10, // velocidad al caer
};

// Estado
let estado = {
  estaJugando: false,
  puntuacion: 0,
  puntuacionMaxima: parseInt(localStorage.getItem("ods_highscore")) || 0,
  vidas: 3,
  velocidad: CONFIGURACION.velocidadInicial,
  ultimaAparicion: 0,
  elementosBasura: [], // Array de elementos DOM
  tiempoInicio: 0,
};

// Tipos de Basura
const TIPOS_BASURA = [
  { tipo: "organic", iconos: ["🍎", "🍌", "🥬", "🦴", "🥪"] },
  { tipo: "paper", iconos: ["📰", "📦", "📄", "🥡", "✉️"] },
  { tipo: "plastic", iconos: ["🧴", "🥤", "🥣", "🖊️", "🧸"] },
  { tipo: "general", iconos: ["💿", "🍽️", "🎮", "👟", "😷"] },
];

// Elementos DOM
const areaJuego = document.getElementById("game-area");
const elementoPuntuacion = document.getElementById("score");
const elementoPuntuacionMaxima = document.getElementById("high-score");
const elementoVidas = document.getElementById("lives");
const elementoPuntuacionFinal = document.getElementById("final-score");
const pantallaInicio = document.getElementById("start-screen");
const pantallaFinJuego = document.getElementById("game-over-screen");
const contenedores = document.querySelectorAll(".bin");
const botonInicio = document.getElementById("start-btn");
const botonReiniciar = document.getElementById("restart-btn");
const botonInfo = document.getElementById("info-btn");
const botonCerrarOds = document.getElementById("close-ods-btn");
const modalOds = document.getElementById("ods-modal");

function inicializar() {
  botonInicio.addEventListener("click", iniciarJuego);
  botonReiniciar.addEventListener("click", iniciarJuego);

  botonInfo.addEventListener("click", () => {
    estado.estaJugando = false;
    modalOds.classList.add("active");
  });

  botonCerrarOds.addEventListener("click", () => {
    modalOds.classList.remove("active");
    if (
      estado.vidas > 0 &&
      !document.getElementById("start-screen").classList.contains("active")
    ) {
      estado.estaJugando = true;
      estado.ultimaAparicion = Date.now();
    }
  });
}

function iniciarJuego() {
  estado.estaJugando = true;
  estado.puntuacion = 0;
  estado.vidas = 3;
  estado.velocidad = CONFIGURACION.velocidadInicial;
  estado.elementosBasura.forEach((item) => item.remove());
  estado.elementosBasura = [];
  estado.tiempoInicio = Date.now();
  estado.ultimaAparicion = Date.now();
  estado.puntuacionMaxima =
    parseInt(localStorage.getItem("ods_highscore")) || 0;

  actualizarInterfaz();

  pantallaInicio.classList.remove("active");
  pantallaFinJuego.classList.remove("active");

  requestAnimationFrame(bucleJuego);
}

function juegoTerminado() {
  estado.estaJugando = false;

  const esNuevoRecord = estado.puntuacion > estado.puntuacionMaxima;
  let mensaje = `Puntuación Final: ${estado.puntuacion}`;
  let titulo = "¡Juego Terminado!";

  if (esNuevoRecord && estado.puntuacion > 0) {
    localStorage.setItem("ods_highscore", estado.puntuacion);
    titulo = "¡NUEVO RÉCORD! 🏆";
    mensaje = `¡Felicidades! Superaste el récord anterior.<br>Nueva Puntuación Máxima: ${estado.puntuacion}`;
  }

  pantallaFinJuego.querySelector("h1").textContent = titulo;
  const parrafo = pantallaFinJuego.querySelector("p");
  parrafo.innerHTML = mensaje;

  pantallaFinJuego.classList.add("active");
}

function actualizarInterfaz() {
  elementoPuntuacion.textContent = estado.puntuacion;
  elementoPuntuacionMaxima.textContent = estado.puntuacionMaxima;
  elementoVidas.textContent = estado.vidas;
}

// Generador
function generarBasura() {
  const objetoTipo =
    TIPOS_BASURA[Math.floor(Math.random() * TIPOS_BASURA.length)];
  const icono =
    objetoTipo.iconos[Math.floor(Math.random() * objetoTipo.iconos.length)];

  const elemento = document.createElement("div");
  elemento.classList.add("trash-item");
  elemento.dataset.type = objetoTipo.tipo;
  elemento.innerHTML = `<span class="trash-content">${icono}</span>`;

  elemento.style.left = "-60px";
  elemento.style.top = "10%";

  elemento.x = -60;
  elemento.y = areaJuego.offsetHeight * 0.12;
  elemento.estaArrastrando = false;
  elemento.estaCayendo = false;

  configurarEntrada(elemento);

  areaJuego.appendChild(elemento);
  estado.elementosBasura.push(elemento);
}

function configurarEntrada(elemento) {
  elemento.addEventListener("pointerdown", (evento) => {
    if (!estado.estaJugando) return;
    elemento.estaArrastrando = true;
    elemento.setPointerCapture(evento.pointerId);
    elemento.style.transition = "none";
    elemento.style.zIndex = 100;
  });

  elemento.addEventListener("pointermove", (evento) => {
    if (!elemento.estaArrastrando) return;

    const rectangulo = areaJuego.getBoundingClientRect();
    elemento.x = evento.clientX - rectangulo.left - elemento.offsetWidth / 2;
    elemento.y = evento.clientY - rectangulo.top - elemento.offsetHeight / 2;

    elemento.style.left = `${elemento.x}px`;
    elemento.style.top = `${elemento.y}px`;
  });

  elemento.addEventListener("pointerup", (evento) => {
    if (!elemento.estaArrastrando) return;
    elemento.estaArrastrando = false;
    elemento.releasePointerCapture(evento.pointerId);
    elemento.style.zIndex = 50;

    verificarSoltado(elemento);
  });
}

function verificarSoltado(elemento) {
  const rectanguloElemento = elemento.getBoundingClientRect();
  let soltadoEnContenedor = false;

  contenedores.forEach((contenedor) => {
    const rectanguloContenedor = contenedor.getBoundingClientRect();
    if (
      rectanguloElemento.left < rectanguloContenedor.right &&
      rectanguloElemento.right > rectanguloContenedor.left &&
      rectanguloElemento.top < rectanguloContenedor.bottom &&
      rectanguloElemento.bottom > rectanguloContenedor.top
    ) {
      soltadoEnContenedor = true;
      const tipoContenedor = contenedor.dataset.type;
      const tipoBasura = elemento.dataset.type;

      if (tipoContenedor === tipoBasura) {
        estado.puntuacion += 10;
        contenedor.classList.add("highlight");
        setTimeout(() => contenedor.classList.remove("highlight"), 200);
      } else {
        estado.vidas--;
      }

      eliminarBasura(elemento);
      actualizarInterfaz();

      if (estado.vidas <= 0) juegoTerminado();
    }
  });

  if (!soltadoEnContenedor) {
    elemento.estaCayendo = true;
  }
}

function eliminarBasura(elemento) {
  elemento.remove();
  estado.elementosBasura = estado.elementosBasura.filter(
    (item) => item !== elemento
  );
}

function bucleJuego() {
  if (!estado.estaJugando) return;

  const ahora = Date.now();
  const minutosTranscurridos = (ahora - estado.tiempoInicio) / 60000;
  const velocidadActual =
    estado.velocidad + minutosTranscurridos * CONFIGURACION.aumentoVelocidad;

  if (
    ahora - estado.ultimaAparicion >
    CONFIGURACION.tasaAparicion / (1 + minutosTranscurridos * 0.5)
  ) {
    generarBasura();
    estado.ultimaAparicion = ahora;
  }

  estado.elementosBasura.forEach((elemento) => {
    if (elemento.estaArrastrando) return; // No mover si está siendo arrastrado

    if (elemento.estaCayendo) {
      elemento.y += 15;
      if (elemento.y > areaJuego.offsetHeight) {
        estado.vidas--;
        eliminarBasura(elemento);
        actualizarInterfaz();
        if (estado.vidas <= 0) juegoTerminado();
      }
    } else {
      elemento.x += velocidadActual;
      if (elemento.x > areaJuego.offsetWidth) {
        estado.vidas--;
        eliminarBasura(elemento);
        actualizarInterfaz();
        if (estado.vidas <= 0) juegoTerminado();
      }
    }
    elemento.style.left = `${elemento.x}px`;
    elemento.style.top = `${elemento.y}px`;
  });

  requestAnimationFrame(bucleJuego);
}

inicializar();
