// 1. Geofencing & Desvio de Rota
window.checkGeofence = (lat, lng, targetLat, targetLng) => {
    const distance = Math.hypot(lat - targetLat, lng - targetLng);
    if (distance > 0.01) { // Limite de desvio aproximado
        console.warn("Alerta: Desvio de rota detetado!");
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    }
};

// 2. Gravação de Áudio Silenciosa em Segundo Plano (MediaRecorder)
window.startEmergencyRecorder = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(blob);
            localStorage.setItem('last_sos_audio', audioUrl);
            console.log("Áudio de emergência gravado e armazenado com sucesso.");
        };
        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), 10000); // Grava 10 segundos de áudio crítico
    } catch (e) {
        console.error("Erro ao aceder ao microfone para emergência:", e);
    }
};

// 3. Suporte Offline Avançado / SMS Fallback
window.triggerOfflineSOS = (phone, lat, lng) => {
    window.startEmergencyRecorder();
    const smsText = encodeURIComponent(`EMERGÊNCIA! Preciso de ajuda imediata. Minha localização: https://maps.google.com/?q=${lat},${lng}`);
    window.location.href = `sms:${phone}?body=${smsText}`;
};
