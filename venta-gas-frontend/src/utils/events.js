    // src/utils/events.js

    // Creamos una instancia de EventTarget para usarla como un emisor de eventos global.
    // Esto es una API nativa del navegador y Node.js, muy ligera.
    export const Emitter = new EventTarget();

    // Definimos un tipo de evento para cuando los datos de la caja necesiten refrescarse.
    export const CASH_DATA_REFRESH_EVENT = 'cashDataRefresh';

    // Puedes añadir otras constantes de eventos aquí si las necesitas en el futuro.
    