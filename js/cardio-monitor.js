// Módulo de Monitorização Cardíaca Inteligente - SENTINELA ONE
window.CardioMonitor = {
    isMonitoring: false,
    baselineBpm: 75,
    userSpeed: 0, // em m/s via Geolocation
    
    // Iniciar escuta do acelerómetro / velocidade GPS
    initSensors() {
        if ('geolocation' in navigator) {
            navigator.geolocation.watchPosition(pos => {
                this.userSpeed = pos.coords.speed || 0;
            }, null, { enableHighAccuracy: true });
        }
    },

    // Analisar pulsação recebida do sensor / smartwatch
    analyzeHeartRate(currentBpm) {
        const bpmJump = currentBpm - this.baselineBpm;
        const isPhysicallyActive = this.userSpeed > 1.8; // Velocidade acima de ~6.5 km/h (corrida/exercício)

        console.log(`BPM Atual: ${currentBpm} | Velocidade: ${this.userSpeed}m/s | Atividade: ${isPhysicallyActive}`);

        // Algoritmo de Decisão: BPM alto sem movimento equivalente = Suspeita de Perigo
        if (currentBpm > 120 && bpmJump >= 40 && !isPhysicallyActive) {
            this.triggerSilentAlert(currentBpm);
        } else {
            console.log("Batimentos normais para a atividade atual.");
        }
    },

    // Disparo de Alerta Silencioso de Perigo
    triggerSilentAlert(bpm) {
        if (navigator.vibrate) navigator.vibrate([100, 100, 100]); // Alerta tátil discreto no pulso/bolso
        console.warn(`[SENTINELA ONE] Anomalia Biométrica Detetada (${bpm} BPM sem movimento)! A iniciar protocolo SOS...`);
        
        // Executa o gravador silencioso e protocolo de emergência
        if (window.startEmergencyRecorder) window.startEmergencyRecorder();
    }
};

window.CardioMonitor.initSensors();
