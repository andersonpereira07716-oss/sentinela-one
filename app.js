document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000/api' 
        : 'https://televisions-junior-surge-those.trycloudflare.com/api';

    // ABAS DE NAVEGAÇÃO
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetPane = document.getElementById(btn.dataset.target);
            targetPane.classList.add('active');

            if (btn.dataset.target === 'tab-home' && map) {
                setTimeout(() => map.invalidateSize(), 200);
            }
        });
    });

    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    function updateStatus(state, text) {
        statusDot.className = 'dot ' + state;
        statusText.textContent = text;
    }

    // MAPA LEAFLET
    let map = null;
    let marker = null;

    function initDefaultMap(lat = -7.02413, lon = -37.26168, zoom = 14) {
        if (!map) {
            map = L.map('map').setView([lat, lon], zoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);
        }
    }

    initDefaultMap();

    // GEOLOCALIZAÇÃO GPS
    const geoStatus = document.getElementById('geo-status');
    const geoCoords = document.getElementById('geo-coords');
    const btnGetLocation = document.getElementById('btn-get-location');
    let lastCoords = null;

    btnGetLocation.addEventListener('click', () => {
        if (!navigator.geolocation) {
            geoStatus.textContent = "Geolocalização não suportada.";
            return;
        }
        geoStatus.textContent = "Obtendo GPS...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(5);
                const lon = position.coords.longitude.toFixed(5);
                lastCoords = { lat, lon };
                geoCoords.textContent = `Lat: ${lat} | Long: ${lon}`;
                geoStatus.textContent = "Localização obtida com sucesso!";

                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                
                map.setView([userLat, userLon], 16);
                if (marker) {
                    marker.setLatLng([userLat, userLon]);
                } else {
                    marker = L.marker([userLat, userLon]).addTo(map)
                        .bindPopup('<b>Você está aqui</b>').openPopup();
                }
                map.invalidateSize();

                addHistory("Localização e mapa atualizados.");
                updateSOSMessage();
            },
            (error) => {
                geoStatus.textContent = "Erro GPS: " + error.message;
                addHistory("Falha na obtenção de localização.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });

    // JORNADA PROTEGIDA
    const btnStartJourneyTab = document.getElementById('btn-start-journey');
    const btnBeginJourney = document.getElementById('btn-begin-journey');
    const journeyActiveCard = document.getElementById('journey-active-card');
    const currentDest = document.getElementById('current-dest');
    const timerCountdown = document.getElementById('timer-countdown');
    const btnArrive = document.getElementById('btn-arrive');
    const btnCancelJourney = document.getElementById('btn-cancel-journey');
    const btnSafe = document.getElementById('btn-safe');
    
    let journeyTimer = null;
    let timeLeft = 0;

    btnStartJourneyTab.addEventListener('click', () => {
        document.querySelector('[data-target="tab-journey"]').click();
    });

    btnSafe.addEventListener('click', () => {
        if (journeyTimer) {
            clearInterval(journeyTimer);
            journeyActiveCard.classList.add('hidden-card');
        }
        updateStatus('paused', 'Proteção pausada');
        addHistory("Confirmação manual de segurança emitida.");
        alert("Sinal de segurança emitido. Estado atualizado.");
    });

    btnBeginJourney.addEventListener('click', async () => {
        const destination = document.getElementById('input-destination').value.trim() || "Destino não informado";
        const durationMinutes = parseInt(document.getElementById('input-duration').value) || 30;
        
        currentDest.textContent = destination;
        timeLeft = durationMinutes * 60;
        
        journeyActiveCard.classList.remove('hidden-card');
        updateStatus('active', 'Em deslocamento');
        addHistory(`Jornada iniciada para: ${destination} (${durationMinutes} min)`);
        startTimer();

        try {
            await fetch(`${API_URL}/jornada`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destino, duracaoMinutos, usuario: "Anderson" })
            });
        } catch (err) {
            console.log("Aviso: API offline, jornada registrada localmente.");
        }
    });

    function startTimer() {
        clearInterval(journeyTimer);
        journeyTimer = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
                const secs = (timeLeft % 60).toString().padStart(2, '0');
                timerCountdown.textContent = `${mins}:${secs}`;
            } else {
                clearInterval(journeyTimer);
                updateStatus('pending', 'Confirmação pendente');
                timerCountdown.textContent = "00:00";
                addHistory("Prazo da jornada expirado! Confirmação pendente.");
                alert("Atenção! O tempo estimado da jornada expirou. Por favor, confirme sua segurança.");
            }
        }, 1000);
    }

    btnArrive.addEventListener('click', () => {
        clearInterval(journeyTimer);
        journeyActiveCard.classList.add('hidden-card');
        updateStatus('paused', 'Proteção pausada');
        addHistory("Jornada concluída com segurança.");
        alert("Que ótimo! Jornada encerrada com segurança.");
    });

    btnCancelJourney.addEventListener('click', () => {
        clearInterval(journeyTimer);
        journeyActiveCard.classList.add('hidden-card');
        updateStatus('paused', 'Proteção pausada');
        addHistory("Jornada cancelada pelo usuário.");
    });

    // CONTATOS DE CONFIANÇA & DISPARO WHATSAPP
    const contactForm = document.getElementById('contact-form');
    const contactsList = document.getElementById('contacts-list');
    let contacts = JSON.parse(localStorage.getItem('sentinela_contacts')) || [];

    function formatPhoneForWhatsApp(phone) {
        let clean = phone.replace(/\D/g, '');
        if (clean.length === 10 || clean.length === 11) {
            clean = '55' + clean;
        }
        return clean;
    }

    function renderContacts() {
        if (contacts.length === 0) {
            contactsList.innerHTML = '<p class="text-muted">Nenhum contato cadastrado.</p>';
            return;
        }
        contactsList.innerHTML = '';
        contacts.forEach((c, index) => {
            const rawPhone = c.phone || c.telefone || '';
            const cleanPhone = formatPhoneForWhatsApp(rawPhone);
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'flex-start';
            div.style.gap = '8px';

            div.innerHTML = `
                <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${c.name || c.nome}</strong> (${c.relation || c.relacao})<br>
                        <span class="text-muted">${rawPhone}</span>
                    </div>
                    <button class="btn btn-outline-danger" style="width: auto; padding: 4px 8px; font-size: 11px;" onclick="removeContact(${index})">Excluir</button>
                </div>
                <button class="btn btn-primary" style="padding: 8px; font-size: 12px; background-color: #25D366; color: white; border: none;" onclick="sendWhatsAppAlert('${cleanPhone}', '${c.name || c.nome}')">
                    📱 Enviar Alerta via WhatsApp
                </button>
            `;
            contactsList.appendChild(div);
        });
    }

    window.sendWhatsAppAlert = function(cleanPhone, contactName) {
        let msg = `🚨 ALERTA SENTINELA ONE 🚨\nOlá ${contactName}, estou precisando de ajuda urgente!`;
        if (lastCoords) {
            msg += `\n\nMinha localização em tempo real:\nhttps://maps.google.com/?q=${lastCoords.lat},${lastCoords.lon}`;
        } else {
            msg += `\n\nPor favor, entre em contato comigo assim que possível.`;
        }

        const encodedMsg = encodeURIComponent(msg);
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

        addHistory(`Alerta enviado via WhatsApp para: ${contactName}`);
        window.open(whatsappUrl, '_blank');
    };

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('contact-name').value.trim();
        const phone = document.getElementById('contact-phone').value.trim();
        const relation = document.getElementById('contact-relation').value.trim();

        if (name && phone && relation) {
            const novoContato = { name, phone, relation };
            contacts.push(novoContato);
            localStorage.setItem('sentinela_contacts', JSON.stringify(contacts));
            contactForm.reset();
            renderContacts();
            addHistory(`Contato adicionado: ${name}`);

            try {
                await fetch(`${API_URL}/contatos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome: name, telefone: phone, relacao: relation })
                });
            } catch (err) {
                console.log("Aviso: API offline, contato salvo apenas localmente.");
            }
        }
    });

    window.removeContact = function(index) {
        const removed = contacts.splice(index, 1);
        localStorage.setItem('sentinela_contacts', JSON.stringify(contacts));
        renderContacts();
        addHistory(`Contato removido: ${removed[0].name || removed[0].nome}`);
    };

    renderContacts();

    // AJUDA E SOS
    const btnEmergencySos = document.getElementById('btn-emergency-sos');
    const sosMessageBox = document.getElementById('sos-message-box');
    const btnCopySos = document.getElementById('btn-copy-sos');

    btnEmergencySos.addEventListener('click', () => {
        document.querySelector('[data-target="tab-help"]').click();
        updateStatus('danger', 'Alerta de ajuda');
        addHistory("Botão de ajuda acionado pelo usuário.");
    });

    function updateSOSMessage() {
        let msg = "ESTOU EM SITUAÇÃO DE RISCO! Preciso de ajuda urgente.";
        if (lastCoords) {
            msg += ` Minha última localização: https://maps.google.com/?q=${lastCoords.lat},${lastCoords.lon}`;
        }
        sosMessageBox.value = msg;
    }

    btnCopySos.addEventListener('click', () => {
        sosMessageBox.select();
        navigator.clipboard.writeText(sosMessageBox.value)
            .then(() => alert("Mensagem de socorro copiada para a área de transferência!"))
            .catch(() => alert("Erro ao copiar mensagem."));
    });

    updateSOSMessage();

    // HISTÓRICO
    const historyList = document.getElementById('history-list');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const btnWipeData = document.getElementById('btn-wipe-data');
    let historyLogs = JSON.parse(localStorage.getItem('sentinela_history')) || [];

    function addHistory(action) {
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const date = new Date().toLocaleDateString('pt-BR');
        historyLogs.unshift({ text: action, time: `${date} ${time}` });
        if (historyLogs.length > 50) historyLogs.pop();
        localStorage.setItem('sentinela_history', JSON.stringify(historyLogs));
        renderHistory();
    }

    function renderHistory() {
        if (historyLogs.length === 0) {
            historyList.innerHTML = '<p class="text-muted">Nenhum evento registrado.</p>';
            return;
        }
        historyList.innerHTML = '';
        historyLogs.forEach(h => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `<span>${h.text || h.texto}</span><span class="text-muted">${h.time || new Date(h.data).toLocaleTimeString('pt-BR')}</span>`;
            historyList.appendChild(div);
        });
    }

    btnClearHistory.addEventListener('click', () => {
        if (confirm("Deseja limpar todo o histórico?")) {
            historyLogs = [];
            localStorage.removeItem('sentinela_history');
            renderHistory();
        }
    });

    btnWipeData.addEventListener('click', () => {
        if (confirm("ATENÇÃO: Isso apagará todos os dados locais. Deseja prosseguir?")) {
            localStorage.clear();
            contacts = [];
            historyLogs = [];
            renderContacts();
            renderHistory();
            alert("Dados locais excluídos com sucesso.");
        }
    });

    renderHistory();
});
